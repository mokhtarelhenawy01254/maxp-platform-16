/**
 * Backfill: link existing appointments (without patientId) to Patient records.
 * Creates a Patient from customerName + customerPhone (+gender/email), deduped by phone.
 * Usage: node scripts/backfill_patients.js [--dry-run] [--companyId=<id>]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { findOrCreatePatient } = require('../services/bookingPatientService');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const companyFilter = args.find(a => a.startsWith('--companyId='))?.split('=')[1] || null;

(async () => {
  const prisma = getSharedPrismaClient();
  const where = { patientId: null };
  if (companyFilter) where.companyId = companyFilter;

  try {
    const appointments = await prisma.appointment.findMany({
      where,
      select: { id: true, companyId: true, customerName: true, customerPhone: true, customerGender: true, customerEmail: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Appointments without patientId: ${appointments.length}${DRY_RUN ? ' (DRY RUN)' : ''}`);
    if (appointments.length === 0) return;

    let created = 0;
    let reused = 0;
    let failed = 0;

    for (const apt of appointments) {
      try {
        const { id: patientId, created: isNew } = await findOrCreatePatient({
          companyId: apt.companyId,
          customerName: apt.customerName,
          customerPhone: apt.customerPhone,
          customerGender: apt.customerGender,
          customerEmail: apt.customerEmail,
        });
        if (isNew) created++; else reused++;

        if (!DRY_RUN) {
          await prisma.appointment.update({ where: { id: apt.id }, data: { patientId } });
        }
      } catch (e) {
        failed++;
        console.error(`  Γ£ù appointment ${apt.id}: ${e.message}`);
      }
    }

    console.log(`Done. patients created: ${created}, reused: ${reused}, failed: ${failed}${DRY_RUN ? ' (nothing written)' : ''}`);
  } catch (e) {
    console.error('Backfill failed:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
