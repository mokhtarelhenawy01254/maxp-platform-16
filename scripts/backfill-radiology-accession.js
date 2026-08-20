/**
 * @file backfill-radiology-accession.js
 * @description Backfill the unified order number on radiology studies that came from a booking.
 *
 * Every study with an appointmentId and a missing accessionNumber resolves its booking and
 * writes `ORD-YYYYMMDD-<bookingNo padded>` (the shared order number for the sibling studies).
 * Studies whose booking has no bookingNo are left untouched (skipped).
 *
 * SAFETY: read-only pass + targeted updates only (no deletes, no schema changes). Safe to re-run.
 */

const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');
const { generateOrderStudyNumber } = require('../apps/backend/utils/orderNumbering');

async function main() {
  const prisma = getSharedPrismaClient();

  const studies = await prisma.radiologyStudy.findMany({
    where: { appointmentId: { not: null }, accessionNumber: null },
    select: { id: true, appointmentId: true, createdAt: true },
  });

  const appointmentIds = [...new Set(studies.map((s) => s.appointmentId).filter(Boolean))];
  const appointments = appointmentIds.length
    ? await prisma.radiologyAppointment.findMany({
        where: { id: { in: appointmentIds } },
        select: { id: true, bookingNo: true, appointmentDate: true, createdAt: true },
      })
    : [];
  const appointmentById = new Map(appointments.map((a) => [a.id, a]));

  let updated = 0;
  let skipped = 0;

  for (const study of studies) {
    const appointment = appointmentById.get(study.appointmentId);
    if (!appointment || appointment.bookingNo === null || appointment.bookingNo === undefined) {
      skipped += 1;
      continue;
    }
    const accessionNumber = generateOrderStudyNumber({
      bookingNo: appointment.bookingNo,
      date: appointment.appointmentDate || appointment.createdAt || study.createdAt,
    });
    await prisma.radiologyStudy.update({
      where: { id: study.id },
      data: { accessionNumber },
    });
    updated += 1;
  }

  console.log(`Backfill done. total=${studies.length} updated=${updated} skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
