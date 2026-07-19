const fs = require('node:fs');
const path = require('node:path');

const themeContract = require(path.resolve(
  __dirname,
  '../../../../shared/theme-system/storefrontThemeContract.json',
));

const CANONICAL_THEMES_DIR = path.resolve(
  __dirname,
  '../../../frontend/src/config/themes',
);

const REQUIRED_CORE_PAGES = ['homepage', 'shop', 'pdp', 'cart', 'checkout'];
const KNOWN_SECTION_TYPES = new Set(
  Array.isArray(themeContract.knownSectionTypes)
    ? themeContract.knownSectionTypes
    : [],
);

const safeReadJson = (filePath) => {
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (error) {
    return { ok: false, error };
  }
};

const isCriticalTemplateWarning = (warning) =>
  /missing page|must be an array|required|invalid/i.test(String(warning || ''));

const collectSectionIssues = (sections, pathPrefix) => {
  const issues = [];
  const warnings = [];

  if (!Array.isArray(sections)) {
    issues.push(`${pathPrefix} must be an array`);
    return { issues, warnings };
  }

  sections.forEach((section, index) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      issues.push(`${pathPrefix}[${index}] must be an object`);
      return;
    }

    if (typeof section.id !== 'string' || !section.id.trim()) {
      issues.push(`${pathPrefix}[${index}].id is required`);
    }

    if (typeof section.type !== 'string' || !section.type.trim()) {
      issues.push(`${pathPrefix}[${index}].type is required`);
      return;
    }

    if (!KNOWN_SECTION_TYPES.has(section.type)) {
      warnings.push(`Unknown section type "${section.type}" in ${pathPrefix}[${index}]`);
    }
  });

  return { issues, warnings };
};

const validateSingleTemplate = (themeDirName) => {
  const templateDir = path.join(CANONICAL_THEMES_DIR, themeDirName);
  const manifestPath = path.join(templateDir, 'theme-manifest.json');
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing theme-manifest.json');
    return { template: themeDirName, errors, warnings };
  }

  const manifestResult = safeReadJson(manifestPath);
  if (!manifestResult.ok) {
    errors.push(`Invalid theme-manifest.json: ${manifestResult.error.message}`);
    return { template: themeDirName, errors, warnings };
  }

  const manifest = manifestResult.data;

  if (manifest.id !== themeDirName) {
    errors.push(`ID mismatch: expected "${themeDirName}", found "${manifest.id}"`);
  }

  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    errors.push('Missing name');
  }

  if (!manifest.pages || typeof manifest.pages !== 'object' || Array.isArray(manifest.pages)) {
    errors.push('Missing pages');
    return { template: themeDirName, errors, warnings };
  }

  REQUIRED_CORE_PAGES.forEach((pageKey) => {
    const page = manifest.pages[pageKey];
    if (!page) {
      errors.push(`Missing page: "${pageKey}"`);
      return;
    }

    const { issues, warnings: pageWarnings } = collectSectionIssues(
      page.sections,
      `pages.${pageKey}.sections`,
    );
    errors.push(...issues);
    warnings.push(...pageWarnings);
  });

  if (manifest.identity && typeof manifest.identity !== 'object') {
    errors.push('identity must be an object when provided');
  }

  if (manifest.quality && typeof manifest.quality !== 'object') {
    errors.push('quality must be an object when provided');
  }

  if (manifest.release && typeof manifest.release !== 'object') {
    errors.push('release must be an object when provided');
  }

  return { template: themeDirName, errors, warnings };
};

const run = () => {
  const failOnCriticalWarnings = process.argv.includes('--fail-on-critical-warnings');
  const includeTestThemes = process.argv.includes('--include-tests');

  if (!fs.existsSync(CANONICAL_THEMES_DIR)) {
    console.log(`Themes directory not found, skipping validation: ${CANONICAL_THEMES_DIR}`);
    process.exit(0);
  }

  const templateDirs = fs
    .readdirSync(CANONICAL_THEMES_DIR)
    .filter((dirName) => {
      const fullPath = path.join(CANONICAL_THEMES_DIR, dirName);
      return (
        fs.statSync(fullPath).isDirectory() &&
        fs.existsSync(path.join(fullPath, 'theme-manifest.json'))
      );
    })
    .filter((dirName) => includeTestThemes || !dirName.toLowerCase().includes('test'));

  if (templateDirs.length === 0) {
    console.log('No canonical theme directories found. Skipping validation.');
    process.exit(0);
  }

  console.log(`Validating ${templateDirs.length} canonical theme(s)...`);
  console.log('');

  let failedCount = 0;
  let warningCount = 0;
  let criticalWarningCount = 0;

  templateDirs.forEach((templateDirName) => {
    const result = validateSingleTemplate(templateDirName);
    const hasErrors = result.errors.length > 0;
    const criticalWarnings = result.warnings.filter(isCriticalTemplateWarning);

    if (hasErrors) {
      failedCount += 1;
      console.log(`FAIL ${result.template}`);
      result.errors.forEach((errorMessage) => console.log(`  - ${errorMessage}`));
    } else {
      console.log(`OK   ${result.template}`);
    }

    if (result.warnings.length > 0) {
      warningCount += result.warnings.length;
      criticalWarningCount += criticalWarnings.length;
      result.warnings.forEach((warning) => {
        const label = isCriticalTemplateWarning(warning) ? 'critical' : 'warning';
        console.log(`  ! [${label}] ${warning}`);
      });
    }

    console.log('');
  });

  console.log('Validation Summary');
  console.log('------------------');
  console.log(`Templates checked : ${templateDirs.length}`);
  console.log(`Failed templates  : ${failedCount}`);
  console.log(`Warnings          : ${warningCount}`);
  console.log(`Critical warnings : ${criticalWarningCount}`);

  if (failedCount > 0 || (failOnCriticalWarnings && criticalWarningCount > 0)) {
    process.exit(1);
  }
};

run();
