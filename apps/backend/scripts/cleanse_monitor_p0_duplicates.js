/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🛡️ Script: cleanse_monitor_p0_duplicates.js
 * 
 * Idempotent Data Cleansing for Monitor Module P0 Defects:
 * 1. Deduplicates monitor_activity_logs (group by companyId, employeeId, intervalStart)
 * 2. Clamps impossible totalActiveSeconds and totalIdleSeconds in monitor_daily_summaries (max 86,400s)
 * 3. Clamps totalActiveSeconds <= totalClockSeconds + 300 for clocked-out sessions
 * 4. Eliminates duplicate daily summaries created under non-canonical candidate IDs
 * 5. Logs before/after counts with full telemetry
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function run() {
  const prisma = getSharedPrismaClient();
  console.log('🚀 [P0-CLEANSE] Starting idempotent monitor data cleansing...');

  try {
    // -------------------------------------------------------------
    // 1. BEFORE AUDIT COUNTS
    // -------------------------------------------------------------
    console.log('\n📊 [AUDIT - BEFORE]');

    // A. Duplicate activity logs
    const dupActivityGroups = await prisma.$queryRaw`
      SELECT "companyId", "employeeId", "intervalStart", COUNT(*)::int as cnt
      FROM "public"."monitor_activity_logs"
      GROUP BY "companyId", "employeeId", "intervalStart"
      HAVING COUNT(*) > 1;
    `;
    const totalDuplicateActivityRows = dupActivityGroups.reduce((acc, g) => acc + (g.cnt - 1), 0);
    console.log(`- Duplicate activity log intervals: ${dupActivityGroups.length} groups (${totalDuplicateActivityRows} excess rows)`);

    // B. Impossible active/idle seconds (> 86400)
    const inflatedActiveRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries"
      WHERE "totalActiveSeconds" > 86400;
    `;
    const inflatedIdleRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries"
      WHERE "totalIdleSeconds" > 86400;
    `;
    console.log(`- Summaries with totalActiveSeconds > 86,400: ${inflatedActiveRows[0]?.cnt || 0}`);
    console.log(`- Summaries with totalIdleSeconds > 86,400: ${inflatedIdleRows[0]?.cnt || 0}`);

    // C. Active seconds exceeding clock time (+ 300s grace)
    const activeExceedingClockRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries"
      WHERE "clockOutTime" IS NOT NULL
        AND "totalClockSeconds" > 0
        AND "totalActiveSeconds" > ("totalClockSeconds" + 300);
    `;
    console.log(`- Summaries with active > clock + 300s (clocked out): ${activeExceedingClockRows[0]?.cnt || 0}`);

    // D. Duplicate daily summaries across employee.id and employee.userId
    const duplicateSummaries = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries" m
      INNER JOIN "public"."hr_employees" e
        ON m."companyId" = e."companyId" AND m."employeeId" = e."userId"
      WHERE EXISTS (
        SELECT 1 FROM "public"."monitor_daily_summaries" c
        WHERE c."companyId" = m."companyId"
          AND c."employeeId" = e.id
          AND c.date = m.date
      );
    `;
    console.log(`- Non-canonical duplicate daily summaries: ${duplicateSummaries[0]?.cnt || 0}`);

    // -------------------------------------------------------------
    // 2. IDEMPOTENT CLEANSING
    // -------------------------------------------------------------
    console.log('\n🧹 [EXECUTING CLEANSING]');

    // Step A: Deduplicate activity logs
    const deletedActivityLogs = await prisma.$executeRaw`
      DELETE FROM "public"."monitor_activity_logs" a
      USING (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "companyId", "employeeId", "intervalStart"
                 ORDER BY "activeSeconds" DESC, "createdAt" DESC, id ASC
               ) as rnum
        FROM "public"."monitor_activity_logs"
      ) ranked
      WHERE a.id = ranked.id AND ranked.rnum > 1;
    `;
    console.log(`✅ Deduplicated activity logs: removed ${deletedActivityLogs} excess rows`);

    // Step B: Clamp totalActiveSeconds and totalIdleSeconds to 86,400
    const clampedMaxDaily = await prisma.$executeRaw`
      UPDATE "public"."monitor_daily_summaries"
      SET "totalActiveSeconds" = LEAST("totalActiveSeconds", 86400),
          "totalIdleSeconds" = LEAST("totalIdleSeconds", 86400)
      WHERE "totalActiveSeconds" > 86400 OR "totalIdleSeconds" > 86400;
    `;
    console.log(`✅ Clamped impossible active/idle daily summaries: ${clampedMaxDaily} rows updated`);

    // Step C: Clamp clocked-out summaries to totalClockSeconds + 300
    const clampedClockedOut = await prisma.$executeRaw`
      UPDATE "public"."monitor_daily_summaries"
      SET "totalActiveSeconds" = LEAST("totalActiveSeconds", "totalClockSeconds" + 300)
      WHERE "clockOutTime" IS NOT NULL
        AND "totalClockSeconds" > 0
        AND "totalActiveSeconds" > ("totalClockSeconds" + 300);
    `;
    console.log(`✅ Clamped clocked-out active summaries: ${clampedClockedOut} rows updated`);

    // Step D: Remove non-canonical duplicate summaries
    const deletedDuplicateSummaries = await prisma.$executeRaw`
      DELETE FROM "public"."monitor_daily_summaries" m
      USING "public"."hr_employees" e
      WHERE m."companyId" = e."companyId"
        AND m."employeeId" = e."userId"
        AND EXISTS (
          SELECT 1 FROM "public"."monitor_daily_summaries" c
          WHERE c."companyId" = m."companyId"
            AND c."employeeId" = e.id
            AND c.date = m.date
        );
    `;
    console.log(`✅ Removed non-canonical duplicate daily summaries: ${deletedDuplicateSummaries} rows deleted`);

    // -------------------------------------------------------------
    // 3. AFTER AUDIT VERIFICATION
    // -------------------------------------------------------------
    console.log('\n📊 [AUDIT - AFTER (ACCEPTANCE VERIFICATION)]');

    const afterDupGroups = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM (
        SELECT "companyId", "employeeId", "intervalStart"
        FROM "public"."monitor_activity_logs"
        GROUP BY "companyId", "employeeId", "intervalStart"
        HAVING COUNT(*) > 1
      ) t;
    `;
    const afterInflatedActive = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries"
      WHERE "totalActiveSeconds" > 86400;
    `;
    const afterInflatedIdle = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries"
      WHERE "totalIdleSeconds" > 86400;
    `;
    const afterActiveExceedingClock = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries"
      WHERE "clockOutTime" IS NOT NULL
        AND "totalClockSeconds" > 0
        AND "totalActiveSeconds" > ("totalClockSeconds" + 300);
    `;
    const afterDuplicateSummaries = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM "public"."monitor_daily_summaries" m
      INNER JOIN "public"."hr_employees" e
        ON m."companyId" = e."companyId" AND m."employeeId" = e."userId"
      WHERE EXISTS (
        SELECT 1 FROM "public"."monitor_daily_summaries" c
        WHERE c."companyId" = m."companyId"
          AND c."employeeId" = e.id
          AND c.date = m.date
      );
    `;

    console.log(`- Duplicate activity log groups remaining: ${afterDupGroups[0]?.cnt || 0} (Acceptance Target: 0)`);
    console.log(`- Summaries with totalActiveSeconds > 86,400: ${afterInflatedActive[0]?.cnt || 0} (Acceptance Target: 0)`);
    console.log(`- Summaries with totalIdleSeconds > 86,400: ${afterInflatedIdle[0]?.cnt || 0} (Acceptance Target: 0)`);
    console.log(`- Summaries with active > clock + 300s: ${afterActiveExceedingClock[0]?.cnt || 0} (Acceptance Target: 0)`);
    console.log(`- Non-canonical duplicate daily summaries: ${afterDuplicateSummaries[0]?.cnt || 0} (Acceptance Target: 0)`);

    const isAllClear = 
      (afterDupGroups[0]?.cnt === 0) &&
      (afterInflatedActive[0]?.cnt === 0) &&
      (afterInflatedIdle[0]?.cnt === 0) &&
      (afterActiveExceedingClock[0]?.cnt === 0) &&
      (afterDuplicateSummaries[0]?.cnt === 0);

    if (isAllClear) {
      console.log('\n🎉 [SUCCESS] All Phase 1 (P0) acceptance criteria verified cleanly!');
    } else {
      console.warn('\n⚠️ [WARNING] Some criteria did not reach zero. Review logs above.');
    }

  } catch (error) {
    console.error('❌ [ERROR] Cleansing script encountered an error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

if (require.main === module) {
  run().then(() => process.exit(0));
}

module.exports = { run };
