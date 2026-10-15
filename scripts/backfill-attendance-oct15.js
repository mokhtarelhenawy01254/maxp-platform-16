/**
 * ⏰ Backfill Attendance for 15 October 2026
 * سكريبت تسجيل حضور يدوي لفريق العمل ليوم 15 أكتوبر 2026
 * تنفيذاً لقرار الإدارة لضمان عدم ضياع حقوق الفريق بسبب عطل جهاز البصمة / الداشبورد.
 *
 * الاستخدام على السيرفر:
 *   node scripts/backfill-attendance-oct15.js [--company=<companyId>] [--dry-run]
 */

const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyArg = args.find((a) => a.startsWith('--company='));
  const targetCompanyId = companyArg ? companyArg.split('=')[1] : null;

  console.log('====================================================');
  console.log('⏰ بدء سكريبت تسجيل حضور 15 أكتوبر 2026 (قرار الإدارة)');
  console.log(`وضع التجربة (Dry Run): ${dryRun ? 'نعم (لن يتم حفظ التعديلات)' : 'لا (سيتم الحفظ الفعلي)'}`);
  if (targetCompanyId) console.log(`الشركة المستهدفة: ${targetCompanyId}`);
  console.log('====================================================\n');

  const prisma = getSharedPrismaClient();

  const targetDateStart = new Date('2026-10-15T00:00:00.000Z');
  const targetDateEnd = new Date('2026-10-15T23:59:59.999Z');

  // Find target companies
  const companyWhere = targetCompanyId ? { id: targetCompanyId } : {};
  const companies = await prisma.company.findMany({
    where: companyWhere,
    select: { id: true, name: true }
  });

  console.log(`تم العثور على ${companies.length} شركة للفحص.`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const company of companies) {
    console.log(`\n🏢 فحص الشركة: ${company.name} (${company.id})`);

    // Fetch active employees
    const employees = await prisma.user.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        role: { in: ['EMPLOYEE', 'MANAGER', 'STAFF', 'DENTAL_TECHNICIAN', 'ADMIN', 'COMPANY_ADMIN'] }
      },
      select: { id: true, name: true, email: true, role: true }
    });

    console.log(`   عدد الموظفين النشطين: ${employees.length}`);

    // Fetch existing attendance for this date
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        companyId: company.id,
        date: { gte: targetDateStart, lte: targetDateEnd }
      },
      select: { userId: true, id: true, status: true, checkIn: true }
    });

    const attendedUserIds = new Set(existingAttendances.map((a) => a.userId));

    for (const emp of employees) {
      if (attendedUserIds.has(emp.id)) {
        console.log(`   ⏩ تخطي: ${emp.name} (${emp.email}) - مسجل بالفعل.`);
        totalSkipped++;
        continue;
      }

      console.log(`   ➕ تسجيل حضور يدوي: ${emp.name} (${emp.email}) [${emp.role}]`);

      if (!dryRun) {
        await prisma.attendance.create({
          data: {
            id: uuidv4(),
            userId: emp.id,
            companyId: company.id,
            date: targetDateStart,
            checkIn: new Date('2026-10-15T09:00:00.000Z'),
            checkOut: new Date('2026-10-15T17:00:00.000Z'),
            status: 'PRESENT',
            source: 'MANUAL',
            workHours: 8,
            changeReason: 'تسجيل حضور يدوي - عطل فني في جهاز البصمة 15 أكتوبر (قرار الإدارة)',
            isManual: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }

      totalCreated++;
    }
  }

  console.log('\n====================================================');
  console.log('✅ اكتمل تنفيذ سكريبت الحضور بنجاح:');
  console.log(`- تم تسجيل الحضور لـ: ${totalCreated} موظف`);
  console.log(`- تم تخطي (مسجلين مسبقاً): ${totalSkipped} موظف`);
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('❌ خطأ أثناء تنفيذ السكريبت:', err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');
      const prisma = getSharedPrismaClient();
      if (prisma?.$disconnect) await prisma.$disconnect();
    } catch {}
  });
