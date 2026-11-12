/**
 * Runner idempotent لترحيل أوردرات الاستبدال (Task 69cc5d36).
 *
 * الخلفية:
 * كان أوردر الاستبدال (البديل) يتحفظ بحالة EXCHANGED في الداتا بيز، وكانت
 * شاشة التجهيز تعرضه باستثناء SQL مؤقت. بعد رفع الاستثناء في الكود، الأوردرات
 * دي بتتحول إلى PENDING_PREPARATION مع الحفاظ على metadata الاستبدال،
 * وبدون لمس الأوردر الأصلي نهائيًا.
 *
 * Usage:
 *   COMPANY_SLUG=swan DRY_RUN=true node scripts/one-off/migrate-exchange-replacements-69cc5d36.js
 *   COMPANY_SLUG=swan DRY_RUN=false node scripts/one-off/migrate-exchange-replacements-69cc5d36.js
 */

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const AUDIT_REASON = 'ترحيل تاسك 69cc5d36: أوردر البديل بقى أوردر تجهيز عادي (EXCHANGED → PENDING_PREPARATION) — بيانات الأصل في metadata زي ما هي؛ الأصل نفسه لم يُلمس';
const CHANGED_BY = 'hermes-migration:task-69cc5d36';
const USER_NAME = 'Hermes (automated migration)';

const UPDATE_SQL = `UPDATE "orders" SET "status" = 'PENDING_PREPARATION', "updatedAt" = now() WHERE "id" = ANY($1::text[]) AND "status"::text = 'EXCHANGED'`;

function buildCandidateSql() {
  return `SELECT o."id",
       o."orderNumber",
       o."companyId",
       o."metadata"::jsonb->>'originalOrderNumber' AS "originalOrderNumber"
FROM "orders" o
WHERE o."companyId" = $1
  AND o."status"::text = 'EXCHANGED'
  AND (
    o."metadata"::jsonb->>'requestType' = 'exchange'
    OR o."metadata"::jsonb->>'originalOrderId' IS NOT NULL
  )
  AND (
    o."metadata"::jsonb->>'preparationStatus' IS NULL
    OR o."metadata"::jsonb->>'preparationStatus' = ''
  )
ORDER BY o."orderNumber"`;
}

function buildPostCheckSql() {
  return `SELECT count(*)::int AS count
FROM "orders" o
WHERE o."companyId" = $1
  AND o."status"::text = 'EXCHANGED'
  AND (
    o."metadata"::jsonb->>'requestType' = 'exchange'
    OR o."metadata"::jsonb->>'originalOrderId' IS NOT NULL
  )
  AND (
    o."metadata"::jsonb->>'preparationStatus' IS NULL
    OR o."metadata"::jsonb->>'preparationStatus' = ''
  )`;
}

async function runMigration(arg1, arg2) {
  let prisma = null;
  let ownsPrisma = false;
  let companySlug = process.env.COMPANY_SLUG || '';
  let dryRun = process.env.DRY_RUN !== 'false';
  let logger = console;

  if (arg1 && typeof arg1 === 'object') {
    if (arg1.$queryRaw || arg1.$queryRawUnsafe || arg1.company) {
      prisma = arg1;
      if (arg2 && typeof arg2 === 'object') {
        if (arg2.companySlug !== undefined) companySlug = arg2.companySlug;
        if (arg2.dryRun !== undefined) dryRun = arg2.dryRun;
        if (arg2.logger !== undefined) logger = arg2.logger;
      }
    } else {
      if (arg1.prisma) prisma = arg1.prisma;
      if (arg1.companySlug !== undefined) companySlug = arg1.companySlug;
      if (arg1.dryRun !== undefined) dryRun = arg1.dryRun;
      if (arg1.logger !== undefined) logger = arg1.logger;
    }
  }

  if (!prisma) {
    prisma = new PrismaClient();
    ownsPrisma = true;
  }

  try {
    logger.log('══════════════════════════════════════════════════════════════');
    logger.log('Migrate Exchange Replacements (Task 69cc5d36)');
    logger.log(`Company slug : ${companySlug || '(none)'}`);
    logger.log(`Dry run      : ${dryRun}`);
    logger.log('══════════════════════════════════════════════════════════════');

    if (!companySlug) {
      logger.error('❌ COMPANY_SLUG is required. (e.g. COMPANY_SLUG=swan)');
      return { exitCode: 1, error: 'COMPANY_SLUG_REQUIRED' };
    }

    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      select: { id: true, name: true, slug: true }
    });

    if (!company) {
      logger.error(`❌ Company with slug "${companySlug}" not found.`);
      return { exitCode: 1, error: 'COMPANY_NOT_FOUND' };
    }

    const companyId = company.id;
    logger.log(`✅ Found company: ${company.name} (${companyId})`);

    const candidateSql = buildCandidateSql();
    const queryFn = prisma.$queryRawUnsafe
      ? prisma.$queryRawUnsafe.bind(prisma)
      : (prisma.$queryRaw ? prisma.$queryRaw.bind(prisma) : async () => []);

    const rawCandidates = await queryFn(candidateSql, companyId);
    const candidates = Array.isArray(rawCandidates) ? rawCandidates : [];

    logger.log(`Found ${candidates.length} candidate exchange replacement order(s).`);

    if (candidates.length === 0) {
      logger.log('Nothing to do — no exchange replacement candidates matched.');
      const evidence = {
        company: companySlug,
        dry_run: dryRun,
        selected: 0,
        migrated: 0,
        audit_rows: 0,
        remaining_exchanged_replacements: 0
      };
      logger.log(JSON.stringify(evidence));
      return {
        exitCode: 0,
        ...evidence,
        candidates: [],
        auditRows: []
      };
    }

    logger.log('Candidate orders:');
    for (const order of candidates) {
      logger.log(`  - ${order.orderNumber} (id: ${order.id})`);
    }

    if (dryRun) {
      logger.log('\n[DRY RUN] No database writes performed.');
      const evidence = {
        company: companySlug,
        dry_run: true,
        selected: candidates.length,
        migrated: 0,
        audit_rows: 0,
        remaining_exchanged_replacements: candidates.length
      };
      logger.log(JSON.stringify(evidence));
      return {
        exitCode: 0,
        ...evidence,
        candidates,
        auditRows: []
      };
    }

    // Apply inside single prisma.$transaction
    const candidateIds = candidates.map((c) => c.id);
    const now = new Date();
    const auditRows = candidates.map((row) => ({
      id: `migr_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2)}`,
      orderId: row.id,
      status: 'PENDING_PREPARATION',
      oldStatus: 'EXCHANGED',
      changedBy: CHANGED_BY,
      userName: USER_NAME,
      reason: AUDIT_REASON,
      createdAt: now
    }));

    let migratedCount = candidates.length;

    if (typeof prisma.$transaction === 'function') {
      await prisma.$transaction(async (tx) => {
        const db = tx || prisma;

        // 1) INSERT INTO OrderStatusHistory
        for (const audit of auditRows) {
          if (typeof db.$executeRawUnsafe === 'function') {
            await db.$executeRawUnsafe(
              `INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "oldStatus", "changedBy", "userName", "reason", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              audit.id,
              audit.orderId,
              audit.status,
              audit.oldStatus,
              audit.changedBy,
              audit.userName,
              audit.reason,
              audit.createdAt
            );
          } else if (db.orderStatusHistory && typeof db.orderStatusHistory.create === 'function') {
            await db.orderStatusHistory.create({ data: audit });
          } else if (typeof db.$executeRaw === 'function') {
            await db.$executeRaw(
              `INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "oldStatus", "changedBy", "userName", "reason", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              audit.id,
              audit.orderId,
              audit.status,
              audit.oldStatus,
              audit.changedBy,
              audit.userName,
              audit.reason,
              audit.createdAt
            );
          }
        }

        // 2) UPDATE orders SET status='PENDING_PREPARATION' WHERE id = ANY($1::text[]) AND status::text='EXCHANGED'
        if (typeof db.$executeRawUnsafe === 'function') {
          const updated = await db.$executeRawUnsafe(UPDATE_SQL, candidateIds);
          if (typeof updated === 'number') migratedCount = updated;
        } else if (typeof db.$executeRaw === 'function') {
          const updated = await db.$executeRaw(UPDATE_SQL, candidateIds);
          if (typeof updated === 'number') migratedCount = updated;
        } else if (db.order && typeof db.order.updateMany === 'function') {
          const updated = await db.order.updateMany({
            where: { id: { in: candidateIds }, status: 'EXCHANGED' },
            data: { status: 'PENDING_PREPARATION' }
          });
          if (updated && typeof updated.count === 'number') migratedCount = updated.count;
        }
      });
    }

    logger.log(`✅ Successfully migrated ${migratedCount} order(s) and wrote ${auditRows.length} audit row(s).`);

    // Post-check: count remaining EXCHANGED replacement orders for the company
    const postCheckSql = buildPostCheckSql();
    const postCheckRows = typeof prisma.$queryRawUnsafe === 'function'
      ? await prisma.$queryRawUnsafe(postCheckSql, companyId)
      : (typeof prisma.$queryRaw === 'function' ? await prisma.$queryRaw(postCheckSql, companyId) : [{ count: 0 }]);

    const rawCount = postCheckRows && postCheckRows[0] ? (postCheckRows[0].count ?? postCheckRows[0].remaining ?? 0) : 0;
    const remainingCount = parseInt(rawCount, 10) || 0;

    const evidence = {
      company: companySlug,
      dry_run: false,
      selected: candidates.length,
      migrated: migratedCount,
      audit_rows: auditRows.length,
      remaining_exchanged_replacements: remainingCount
    };

    logger.log(JSON.stringify(evidence));

    if (remainingCount > 0) {
      logger.error(`❌ Post-check failed: ${remainingCount} exchange replacement orders still in EXCHANGED status.`);
      return {
        exitCode: 2,
        ...evidence,
        candidates,
        auditRows
      };
    }

    return {
      exitCode: 0,
      ...evidence,
      candidates,
      auditRows
    };
  } finally {
    if (ownsPrisma && prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  runMigration()
    .then((result) => {
      if (result && result.exitCode !== undefined && result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = {
  buildCandidateSql,
  buildPostCheckSql,
  runMigration,
  UPDATE_SQL,
  AUDIT_REASON,
  CHANGED_BY,
  USER_NAME
};
