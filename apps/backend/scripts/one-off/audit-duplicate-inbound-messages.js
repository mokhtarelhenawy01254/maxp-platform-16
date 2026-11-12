/**
 * @file audit-duplicate-inbound-messages.js
 * @description Read-only audit report for duplicate inbound messages across WhatsApp and Messenger.
 *
 * SAFETY:
 *   - Strictly READ-ONLY (SELECT queries only; zero INSERT / UPDATE / DELETE).
 *   - Safe to run both before and after the message_inbound_dedupe migration.
 *
 * Usage:
 *   node scripts/one-off/audit-duplicate-inbound-messages.js --days 30
 *   node scripts/one-off/audit-duplicate-inbound-messages.js --hours 24
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

function parseArgs(argv) {
  const args = { days: 30, hours: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--days' && argv[i + 1]) {
      args.days = Math.max(1, parseInt(argv[i + 1], 10) || 30);
      i += 1;
    } else if (token.startsWith('--days=')) {
      args.days = Math.max(1, parseInt(token.split('=')[1], 10) || 30);
    } else if (token === '--hours' && argv[i + 1]) {
      args.hours = Math.max(1, parseInt(argv[i + 1], 10) || 24);
      i += 1;
    } else if (token.startsWith('--hours=')) {
      args.hours = Math.max(1, parseInt(token.split('=')[1], 10) || 24);
    } else if (token === '--json') {
      args.json = true;
    }
  }
  return args;
}

async function hasExternalIdColumn(prisma) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT 1 AS present
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'externalMessageId'
    LIMIT 1
  `);
  return Array.isArray(rows) && rows.length > 0;
}

async function queryChannelDuplicates(prisma, { channel, metadataKey, windowHours, useExternalCol }) {
  const extExpr = useExternalCol
    ? `COALESCE(NULLIF(m."externalMessageId", ''), substring(m."metadata" from '"${metadataKey}"\\s*:\\s*"([^"]+)"'))`
    : `substring(m."metadata" from '"${metadataKey}"\\s*:\\s*"([^"]+)"')`;

  const channelFilter = useExternalCol
    ? `(m."channel" = '${channel}' OR m."metadata" LIKE '%"${metadataKey}"%')`
    : `m."metadata" LIKE '%"${metadataKey}"%'`;

  const sql = `
    WITH extracted AS (
      SELECT
        m."conversationId",
        ${extExpr} AS ext_id,
        m."createdAt"
      FROM "messages" m
      WHERE m."isFromCustomer" = true
        AND m."createdAt" >= NOW() - ($1::int * INTERVAL '1 hour')
        AND ${channelFilter}
    ),
    dupes AS (
      SELECT
        "conversationId",
        ext_id,
        COUNT(*)::int AS row_count,
        MIN("createdAt") AS first_at,
        MAX("createdAt") AS last_at
      FROM extracted
      WHERE ext_id IS NOT NULL AND ext_id <> ''
      GROUP BY "conversationId", ext_id
      HAVING COUNT(*) > 1
    )
    SELECT
      COUNT(*)::int AS duplicate_groups,
      COALESCE(SUM(row_count - 1), 0)::int AS extra_rows,
      COALESCE(SUM(row_count), 0)::int AS total_rows_in_groups
    FROM dupes;
  `;

  const rows = await prisma.$queryRawUnsafe(sql, windowHours);
  const summary = rows && rows[0] ? rows[0] : { duplicate_groups: 0, extra_rows: 0, total_rows_in_groups: 0 };
  return {
    channel,
    windowHours,
    duplicateGroups: Number(summary.duplicate_groups || 0),
    extraRows: Number(summary.extra_rows || 0),
    totalRowsInGroups: Number(summary.total_rows_in_groups || 0),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const windowHours = args.hours !== null ? args.hours : args.days * 24;
  const prisma = getSharedPrismaClient();

  try {
    const useExternalCol = await hasExternalIdColumn(prisma);
    const whatsapp = await queryChannelDuplicates(prisma, {
      channel: 'whatsapp',
      metadataKey: 'whatsAppMessageId',
      windowHours,
      useExternalCol,
    });
    const messenger = await queryChannelDuplicates(prisma, {
      channel: 'facebook',
      metadataKey: 'facebookMessageId',
      windowHours,
      useExternalCol,
    });

    const report = {
      readOnly: true,
      windowHours,
      windowLabel: args.hours !== null ? `${args.hours}h` : `${args.days}d`,
      schemaHasExternalIdColumn: useExternalCol,
      whatsapp,
      messenger,
      totalDuplicateGroups: whatsapp.duplicateGroups + messenger.duplicateGroups,
      totalExtraRows: whatsapp.extraRows + messenger.extraRows,
    };

    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`=== Inbound Duplicate Audit (Read-Only | Window: ${report.windowLabel}) ===`);
      console.log(`WhatsApp : groups=${whatsapp.duplicateGroups}, extraRows=${whatsapp.extraRows}`);
      console.log(`Messenger: groups=${messenger.duplicateGroups}, extraRows=${messenger.extraRows}`);
      console.log(`Total    : groups=${report.totalDuplicateGroups}, extraRows=${report.totalExtraRows}`);
    }
  } finally {
    if (typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ [AUDIT-DUPLICATE-INBOUND] Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, hasExternalIdColumn, queryChannelDuplicates };
