/**
 * @file backfill-radiology-numbers.js
 * @description One-off backfill for the unified order numbering:
 *
 *  1. Assign a sequential per-company bookingNo to appointments that are missing it
 *     (old bookings created before the numbering feature). Oldest first, per company.
 *  2. Backfill the unified order number (accessionNumber) on studies that came from a
 *     booking and have no accession yet ΓÇö ORD-YYYYMMDD-<bookingNo padded>.
 *
 * SAFETY: read-only pass + targeted updates only (no deletes, no schema changes).
 * Re-runnable. Use DRY_RUN=true to preview counts without writing.
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { generateOrderStudyNumber } = require('../../utils/orderNumbering');
const { nextCompanyNumber } = require('../../utils/radiologyNumbering');

async function main() {
  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  const prisma = getSharedPrismaClient();

  // 1) Assign bookingNo to appointments missing it (per company, oldest first)
  const companies = await prisma.radiologyAppointment.findMany({
    where: { bookingNo: null, companyId: { not: null } },
    select: { companyId: true },
    distinct: ['companyId'],
  });

  let bookingAssigned = 0;
  for (const { companyId } of companies) {
    if (!companyId) continue;
    const missing = await prisma.radiologyAppointment.findMany({
      where: { companyId, bookingNo: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    for (const appt of missing) {
      const next = await nextCompanyNumber(prisma, 'radiologyAppointment', 'bookingNo', companyId);
      if (!dryRun) {
        await prisma.radiologyAppointment.update({ where: { id: appt.id }, data: { bookingNo: next } });
      }
      bookingAssigned += 1;
    }
  }

  // 2) Backfill accessionNumber on studies whose booking now has a bookingNo
  const studies = await prisma.radiologyStudy.findMany({
    where: { appointmentId: { not: null }, accessionNumber: null },
    select: { id: true, appointmentId: true, createdAt: true },
  });
  const apptIds = [...new Set(studies.map((s) => s.appointmentId).filter(Boolean))];
  const appointments = apptIds.length
    ? await prisma.radiologyAppointment.findMany({
        where: { id: { in: apptIds } },
        select: { id: true, bookingNo: true, appointmentDate: true, createdAt: true },
      })
    : [];
  const apptById = new Map(appointments.map((a) => [a.id, a]));

  let accessionUpdated = 0;
  let accessionSkipped = 0;
  for (const study of studies) {
    const a = apptById.get(study.appointmentId);
    if (!a || a.bookingNo === null || a.bookingNo === undefined) {
      accessionSkipped += 1;
      continue;
    }
    const accessionNumber = generateOrderStudyNumber({
      bookingNo: a.bookingNo,
      date: a.appointmentDate || a.createdAt || study.createdAt,
    });
    if (!dryRun) {
      await prisma.radiologyStudy.update({ where: { id: study.id }, data: { accessionNumber } });
    }
    accessionUpdated += 1;
  }

  console.log(
    `Backfill done. dryRun=${dryRun} companies=${companies.length} bookingAssigned=${bookingAssigned} ` +
      `accessionUpdated=${accessionUpdated} accessionSkipped=${accessionSkipped}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
