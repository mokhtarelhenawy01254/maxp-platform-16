/**
 * Wave 0 backfill: copy CRM lead fields from Customer.metadata JSON
 * into the new real columns (leadStage / leadPriority / leadSource / nextFollowUpDate).
 *
 * One-time, additive, non-destructive — metadata is NOT modified.
 * Runs locally (node scripts/backfill-lead-fields.cjs --dry-run from apps/backend)
 * or on the server via the backfill-lead-fields.yml workflow (env DRY_RUN=true/false).
 */
const path = require('path');
const fs = require('fs');

try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  // dotenv optional — env may already carry DATABASE_URL
}

function loadPrismaClient() {
  const candidates = [
    path.join(process.cwd(), 'prisma', 'generated', 'postgresql_v2'),
    path.join(__dirname, '..', 'apps', 'backend', 'prisma', 'generated', 'postgresql_v2'),
    path.join(__dirname, '..', '..', 'prisma', 'generated', 'postgresql_v2'),
    path.join(__dirname, '..', 'prisma', 'generated', 'postgresql_v2')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const { PrismaClient } = require(candidate);
      return new PrismaClient();
    }
  }
  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient();
}

const prisma = loadPrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
const batchArg = args.find((a) => a.startsWith('--batch='));
const BATCH = batchArg ? parseInt(batchArg.split('=')[1], 10) || 500 : 500;

const STAGES = ['NEW_LEAD', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'NOT_INTERESTED', 'LOST'];
const PRIORITIES = ['HOT', 'WARM', 'COLD'];
const SOURCES = ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'CALL', 'WEBSITE', 'REFERRAL', 'WALK_IN', 'OTHER'];

function pickEnum(value, allowed) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : null;
}

async function main() {
  console.log(`[backfill] start dryRun=${dryRun} batch=${BATCH}`);
  let cursor = null;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const customers = await prisma.customer.findMany({
      where: { metadata: { not: null } },
      select: { id: true, metadata: true },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    });
    if (customers.length === 0) break;
    cursor = customers[customers.length - 1].id;

    for (const customer of customers) {
      scanned += 1;
      let meta;
      try {
        meta = typeof customer.metadata === 'string' ? JSON.parse(customer.metadata) : customer.metadata;
      } catch (e) {
        continue;
      }
      if (!meta || typeof meta !== 'object') continue;

      const data = {};
      const stage = pickEnum(meta.leadStage, STAGES);
      const priority = pickEnum(meta.leadPriority, PRIORITIES);
      const source = pickEnum(meta.leadSource, SOURCES);
      if (stage) data.leadStage = stage;
      if (priority) data.leadPriority = priority;
      if (source) data.leadSource = source;
      if (meta.nextFollowUpDate) {
        const date = new Date(meta.nextFollowUpDate);
        if (!Number.isNaN(date.getTime())) data.nextFollowUpDate = date;
      }

      if (Object.keys(data).length === 0) continue;
      updated += 1;
      console.log(`[backfill] ${customer.id} -> ${JSON.stringify(data)}`);
      if (!dryRun) {
        await prisma.customer.update({ where: { id: customer.id }, data });
      }
    }
  }

  console.log(`\n[backfill] done scanned=${scanned} updated=${updated} dryRun=${dryRun}`);
}

main()
  .catch((e) => {
    console.error('[backfill] failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
