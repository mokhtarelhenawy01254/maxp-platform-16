/**
 * 🔍 Dry-run script for lateness calculation timezone & allowance fix.
 * STRICTLY READ-ONLY — NO UPDATES OR WRITES TO DATABASE.
 *
 * Scopes: September - October 2026 attendances.
 */

const path = require('path');
const backendRoot = path.resolve(__dirname, '..');
const prismaPath = path.join(backendRoot, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();
const { getEffectiveShiftForDate } = require(path.join(backendRoot, 'services', 'hr', 'shiftAssignmentResolver'));
const { combineDateAndTime } = require(path.join(backendRoot, 'utils', 'dateUtils'));

async function runDryRun() {
  console.log('🚀 Starting dry-run analysis for September - October 2026...');

  const startDate = new Date('2026-09-01T00:00:00.000Z');
  const endDate = new Date('2026-10-31T23:59:59.999Z');

  const attendances = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      },
      checkIn: { not: null }
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log(`📊 Total attendance records found (Sept-Oct 2026): ${attendances.length}`);

  // Cache company settings and lateness rules
  const companyCache = {};
  async function getCompanyData(companyId) {
    if (!companyCache[companyId]) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, timezone: true }
      });
      const settings = await prisma.hRSettings.findUnique({
        where: { companyId }
      });
      const latenessRules = await prisma.latenessRules.findUnique({
        where: { companyId }
      });
      companyCache[companyId] = {
        timezone: company?.timezone || 'Africa/Cairo',
        settings,
        latenessRules
      };
    }
    return companyCache[companyId];
  }

  function isRestDay(date, settings, timezone = 'Africa/Cairo') {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short'
    }).formatToParts(new Date(date));
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value?.toLowerCase();
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const dow = dayMap[weekdayStr] ?? new Date(date).getDay();

    let workDays = [0, 1, 2, 3, 4, 6]; // Sat-Thu
    let restDays = [5]; // Fri
    if (settings?.workDays) {
      try {
        const parsed = typeof settings.workDays === 'string' ? JSON.parse(settings.workDays) : settings.workDays;
        if (Array.isArray(parsed) && parsed.length > 0) {
          workDays = parsed;
          restDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !workDays.includes(d));
        }
      } catch (e) {}
    }
    return restDays.includes(dow);
  }

  const affectedRows = [];

  for (const record of attendances) {
    const { timezone, settings, latenessRules } = await getCompanyData(record.companyId);
    const shift = await getEffectiveShiftForDate(
      prisma,
      record.companyId,
      record.userId,
      record.date,
      timezone
    );

    // 1. Resolve work start time
    const workStartTime =
      shift?.startTime ||
      latenessRules?.workStartTime ||
      settings?.workStartTime ||
      '10:00';

    // 2. Resolve allowance minutes
    let allowanceMinutes = 10;
    if (latenessRules?.latestAllowedTime && latenessRules?.workStartTime) {
      const [latH, latM] = latenessRules.latestAllowedTime.split(':').map(Number);
      const [wH, wM] = latenessRules.workStartTime.split(':').map(Number);
      const diff = (latH * 60 + latM) - (wH * 60 + wM);
      if (!isNaN(diff) && diff >= 0) {
        allowanceMinutes = diff;
      }
    } else if (settings?.lateGracePeriod !== undefined || settings?.lateThresholdMinutes !== undefined) {
      const parsed = Number(settings.lateGracePeriod ?? settings.lateThresholdMinutes);
      if (!isNaN(parsed) && parsed >= 0) allowanceMinutes = parsed;
    }

    // 3. Check if rest day
    const rest = isRestDay(record.date, settings, timezone);

    // 4. Calculate workStart and graceTime
    const workStart = combineDateAndTime(record.date, workStartTime, timezone);
    const graceTime = new Date(workStart.getTime() + allowanceMinutes * 60000);

    const checkInTime = new Date(record.checkIn);

    let newLateMinutes = 0;
    let newStatus = 'PRESENT';

    if (rest) {
      newStatus = 'OVERTIME';
      newLateMinutes = 0;
    } else {
      if (checkInTime > graceTime) {
        newLateMinutes = Math.floor((checkInTime.getTime() - graceTime.getTime()) / 60000);
        newStatus = 'LATE';
      } else {
        newLateMinutes = 0;
        newStatus = 'PRESENT';
      }
    }

    const currentLateMinutes = record.lateMinutes || 0;
    const diff = Math.abs(currentLateMinutes - newLateMinutes);

    if (currentLateMinutes !== newLateMinutes || record.status !== newStatus) {
      affectedRows.push({
        id: record.id,
        user: `${record.user?.firstName || ''} ${record.user?.lastName || ''}`.trim() || record.user?.email,
        date: record.date.toISOString().split('T')[0],
        checkInUtc: record.checkIn.toISOString(),
        checkInLocal: record.checkIn.toLocaleString('en-US', { timeZone: timezone }),
        shiftStart: workStartTime,
        latestAllowedTime: `${allowanceMinutes}m grace (cutoff: ${new Date(graceTime).toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })})`,
        before: {
          lateMinutes: currentLateMinutes,
          status: record.status
        },
        after: {
          lateMinutes: newLateMinutes,
          status: newStatus
        },
        deltaMinutes: newLateMinutes - currentLateMinutes,
        absDiff: diff
      });
    }
  }

  // Sort by absDiff desc (biggest discrepancy first)
  affectedRows.sort((a, b) => b.absDiff - a.absDiff);

  console.log('\n======================================================');
  console.log(`📈 DRY-RUN RESULTS SUMMARY (NO WRITES PERFORMED)`);
  console.log('======================================================');
  console.log(`Total attendance rows analyzed: ${attendances.length}`);
  console.log(`Total affected rows:            ${affectedRows.length}`);
  console.log(`Percentage affected:            ${((affectedRows.length / attendances.length) * 100).toFixed(1)}%`);
  console.log('======================================================\n');

  console.log('📋 TOP 20 AFFECTED ROWS (BEFORE vs AFTER):');
  console.log('------------------------------------------------------');
  const top20 = affectedRows.slice(0, 20);
  top20.forEach((r, idx) => {
    console.log(
      `#${idx + 1} [${r.date}] ${r.user} | In: ${r.checkInLocal} | Shift: ${r.shiftStart} | ` +
      `Before: ${r.before.lateMinutes}m (${r.before.status}) -> After: ${r.after.lateMinutes}m (${r.after.status}) | Diff: ${r.deltaMinutes}m`
    );
  });
  console.log('------------------------------------------------------');

  return {
    totalRecords: attendances.length,
    affectedCount: affectedRows.length,
    top20
  };
}

runDryRun()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Dry-run failed:', e);
    return prisma.$disconnect();
  });
