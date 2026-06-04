require('dotenv').config();
require('dotenv').config({ path: '.env.production', override: false });

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const VISUAL_TOKEN_KEYS = new Set([
  'colors',
  'typography',
  'shape',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'background',
  'foreground',
  'muted',
  'mutedForeground',
  'border',
  'card',
  'cardForeground',
  'ring',
  'surface',
  'text',
  'textMuted',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'textColor',
  'surfaceColor',
  'borderColor',
  'fontFamily',
  'headingFont',
  'bodyFont',
  'baseSize',
  'fontSizeBase',
  'borderRadius',
  'buttonRadius',
]);

const JSON_COLUMNS = ['content', 'publishedContent', 'draftContent', 'previousContent'];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    company: '',
    companyId: '',
    templateId: '',
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--company') {
      options.company = String(args[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--company-id') {
      options.companyId = String(args[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--template-id') {
      options.templateId = String(args[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
  }

  return options;
};

const printHelp = () => {
  console.log(`
Usage:
  node scripts/clean_storefront_template_visual_tokens.js --company swan
  node scripts/clean_storefront_template_visual_tokens.js --company-id <companyId>
  node scripts/clean_storefront_template_visual_tokens.js --template-id <templateId>
  node scripts/clean_storefront_template_visual_tokens.js --company swan --dry-run
`);
};

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const parseJsonValue = (value) => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stripVisualTokens = (designTokens) => {
  if (!isRecord(designTokens)) {
    return { changed: false, value: designTokens };
  }

  let changed = false;
  const next = {};

  Object.entries(designTokens).forEach(([key, value]) => {
    if (VISUAL_TOKEN_KEYS.has(key)) {
      changed = true;
      return;
    }

    next[key] = value;
  });

  return { changed, value: next };
};

const cleanTemplatePayload = (payload) => {
  const normalizedPayload = parseJsonValue(payload);

  if (!isRecord(normalizedPayload)) {
    return { changed: false, value: normalizedPayload, removedKeys: [] };
  }

  const next = cloneJson(normalizedPayload);
  const removedKeys = [];
  let changed = false;

  if (isRecord(next.settings) && isRecord(next.settings.designTokens)) {
    const beforeKeys = Object.keys(next.settings.designTokens);
    const cleaned = stripVisualTokens(next.settings.designTokens);
    if (cleaned.changed) {
      next.settings.designTokens = cleaned.value;
      changed = true;
      removedKeys.push(
        ...beforeKeys.filter((key) => VISUAL_TOKEN_KEYS.has(key)).map((key) => `settings.designTokens.${key}`),
      );
    }
  }

  if (isRecord(next.designTokens)) {
    const beforeKeys = Object.keys(next.designTokens);
    const cleaned = stripVisualTokens(next.designTokens);
    if (cleaned.changed) {
      next.designTokens = cleaned.value;
      changed = true;
      removedKeys.push(
        ...beforeKeys.filter((key) => VISUAL_TOKEN_KEYS.has(key)).map((key) => `designTokens.${key}`),
      );
    }
  }

  if (isRecord(next.tokens)) {
    const beforeKeys = Object.keys(next.tokens);
    const cleaned = stripVisualTokens(next.tokens);
    if (cleaned.changed) {
      next.tokens = cleaned.value;
      changed = true;
      removedKeys.push(
        ...beforeKeys.filter((key) => VISUAL_TOKEN_KEYS.has(key)).map((key) => `tokens.${key}`),
      );
    }
  }

  return { changed, value: next, removedKeys };
};

const ensureBackupDir = () => {
  const backupDir = path.join(__dirname, '..', 'tmp', 'storefront_template_cleanups');
  fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
};

const buildConnectionString = () =>
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  '';

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.company && !options.companyId && !options.templateId) {
    throw new Error('Provide --company, --company-id, or --template-id.');
  }

  const connectionString = buildConnectionString();
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL is required.');
  }

  const client = new Client({
    connectionString,
    ssl: false,
  });

  await client.connect();

  try {
    let query = `
      select
        h.id,
        h.slug,
        h.name,
        h."companyId",
        c.slug as company_slug,
        c.name as company_name,
        h.content,
        h."publishedContent",
        h."draftContent",
        h."previousContent"
      from homepage_templates h
      left join companies c on c.id = h."companyId"
      where 1 = 1
    `;
    const params = [];

    if (options.templateId) {
      params.push(options.templateId);
      query += ` and h.id = $${params.length}`;
    } else if (options.companyId) {
      params.push(options.companyId);
      query += ` and h."companyId" = $${params.length}`;
      query += ` and h."pageType" = 'HOMEPAGE' and h."isActive" = true`;
    } else {
      params.push(options.company);
      query += ` and (c.slug = $${params.length} or c.id = $${params.length})`;
      query += ` and h."pageType" = 'HOMEPAGE' and h."isActive" = true`;
    }

    query += ' order by h."updatedAt" desc';

    const result = await client.query(query, params);
    if (result.rows.length === 0) {
      console.log('No matching homepage templates found.');
      return;
    }

    const backupDir = ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const row of result.rows) {
      const updates = {};
      const columnSummaries = [];

      JSON_COLUMNS.forEach((columnName) => {
        const currentValue = row[columnName];
        const cleaned = cleanTemplatePayload(currentValue);
        if (cleaned.changed) {
          updates[columnName] = cleaned.value;
          columnSummaries.push({
            columnName,
            removedKeys: cleaned.removedKeys,
          });
        }
      });

      const backupPath = path.join(
        backupDir,
        `${timestamp}_${row.company_slug || row.companyId}_${row.id}.json`,
      );

      fs.writeFileSync(
        backupPath,
        JSON.stringify(
          {
            template: {
              id: row.id,
              slug: row.slug,
              name: row.name,
              companyId: row.companyId,
              companySlug: row.company_slug,
              companyName: row.company_name,
            },
            columns: JSON_COLUMNS.reduce((acc, columnName) => {
              acc[columnName] = row[columnName];
              return acc;
            }, {}),
          },
          null,
          2,
        ),
      );

      if (columnSummaries.length === 0) {
        console.log(
          JSON.stringify(
            {
              templateId: row.id,
              company: row.company_slug || row.companyId,
              changed: false,
              backupPath,
            },
            null,
            2,
          ),
        );
        continue;
      }

      if (!options.dryRun) {
        const sets = [];
        const updateParams = [];
        Object.entries(updates).forEach(([columnName, value]) => {
          updateParams.push(JSON.stringify(value));
          sets.push(`"${columnName}" = $${updateParams.length}::jsonb`);
        });
        updateParams.push(row.id);

        await client.query(
          `update homepage_templates set ${sets.join(', ')} where id = $${updateParams.length}`,
          updateParams,
        );
      }

      console.log(
        JSON.stringify(
          {
            templateId: row.id,
            company: row.company_slug || row.companyId,
            changed: true,
            dryRun: options.dryRun,
            columns: columnSummaries,
            backupPath,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
