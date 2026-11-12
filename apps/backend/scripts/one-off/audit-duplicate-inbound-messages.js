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
        m."type"::text AS msg_type,
        COALESCE(m."content", '') AS msg_content,
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
    ),
    windowed AS (
      SELECT
        ext_id,
        LAG("createdAt") OVER (PARTITION BY "conversationId", msg_type, msg_content ORDER BY "createdAt") AS prev_at,
        LAG(ext_id) OVER (PARTITION BY "conversationId", msg_type, msg_content ORDER BY "createdAt") AS prev_ext_id,
        "createdAt"
      FROM extracted
    ),
    pairs_10s AS (
      SELECT
        COUNT(*)::int AS total_10s_extra_rows,
        COUNT(*) FILTER (WHERE ext_id IS NOT NULL AND ext_id = prev_ext_id)::int AS same_ext_id_10s,
        COUNT(*) FILTER (WHERE ext_id IS NULL OR prev_ext_id IS NULL OR ext_id = '' OR prev_ext_id = '')::int AS missing_ext_id_10s,
        COUNT(*) FILTER (WHERE ext_id IS NOT NULL AND prev_ext_id IS NOT NULL AND ext_id <> '' AND prev_ext_id <> '' AND ext_id <> prev_ext_id)::int AS diff_ext_id_10s
      FROM windowed
      WHERE prev_at IS NOT NULL AND "createdAt" - prev_at <= INTERVAL '10 seconds'
    )
    SELECT
      (SELECT COUNT(*)::int FROM dupes) AS duplicate_groups,
      (SELECT COALESCE(SUM(row_count - 1), 0)::int FROM dupes) AS extra_rows,
      (SELECT COALESCE(SUM(row_count), 0)::int FROM dupes) AS total_rows_in_groups,
      p.total_10s_extra_rows,
      p.same_ext_id_10s,
      p.missing_ext_id_10s,
      p.diff_ext_id_10s
    FROM pairs_10s p;
  `;

  const rows = await prisma.$queryRawUnsafe(sql, windowHours);
  const summary = rows && rows[0] ? rows[0] : {};
  return {
    channel,
    windowHours,
    duplicateGroups: Number(summary.duplicate_groups || 0),
    extraRows: Number(summary.extra_rows || 0),
    totalRowsInGroups: Number(summary.total_rows_in_groups || 0),
    within10sBreakdown: {
      totalExtraRows: Number(summary.total_10s_extra_rows || 0),
      sameExternalId: Number(summary.same_ext_id_10s || 0),
      missingExternalId: Number(summary.missing_ext_id_10s || 0),
      differentExternalId: Number(summary.diff_ext_id_10s || 0),
    },
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
      console.log(
        `WhatsApp : groups=${whatsapp.duplicateGroups}, extraRows=${whatsapp.extraRows} | 10s_pairs=${whatsapp.within10sBreakdown.totalExtraRows} (same_ext=${whatsapp.within10sBreakdown.sameExternalId}, missing_ext=${whatsapp.within10sBreakdown.missingExternalId}, diff_ext=${whatsapp.within10sBreakdown.differentExternalId})`
      );
      console.log(
        `Messenger: groups=${messenger.duplicateGroups}, extraRows=${messenger.extraRows} | 10s_pairs=${messenger.within10sBreakdown.totalExtraRows} (same_ext=${messenger.within10sBreakdown.sameExternalId}, missing_ext=${messenger.within10sBreakdown.missingExternalId}, diff_ext=${messenger.within10sBreakdown.differentExternalId})`
      );
      console.log(`Total    : groups=${report.totalDuplicateGroups}, extraRows=${report.totalExtraRows}`);
    }
  } finally {
    if (typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [AUDIT-DUPLICATE-INBOUND] Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { parseArgs, hasExternalIdColumn, queryChannelDuplicates };
