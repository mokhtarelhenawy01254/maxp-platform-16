const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  console.log('=== 1. ENUM VALUES ===');
  const enumVals = await prisma.$queryRawUnsafe(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE typname = 'hr_manual_deductions_status'
  `);
  console.log('hr_manual_deductions_status:', enumVals);

  console.log('\n=== 2. AUTO_DEDUCTION ROWS IN HR_MANUAL_DEDUCTIONS ===');
  const autoDeds = await prisma.manualDeduction.findMany({
    where: { category: 'AUTO_DEDUCTION' },
    select: { id: true, companyId: true, employeeId: true, amount: true, status: true, effectiveMonth: true, effectiveYear: true, reason: true, createdAt: true }
  });
  console.log(`Total AUTO_DEDUCTION rows: ${autoDeds.length}`);
  const byStatus = {};
  autoDeds.forEach(d => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  });
  console.log('By status:', byStatus);
  const pendingAutoDeds = autoDeds.filter(d => d.status === 'PENDING');
  console.log(`Pending AUTO_DEDUCTION count: ${pendingAutoDeds.length}`);
  console.log('Sample pending:', pendingAutoDeds.slice(0, 10));

  console.log('\n=== 3. DEMO ACCOUNT (SWAN COMPANY) ===');
  const demoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { id: 'cmleybpf70028juo2wwpmp8rt' },
        { email: { contains: 'swan' } },
        { firstName: { contains: 'Swan' } }
      ]
    },
    select: { id: true, firstName: true, lastName: true, companyId: true, email: true, isActive: true }
  });
  console.log('Demo users:', demoUsers);

  for (const du of demoUsers) {
    const duAtts = await prisma.attendance.findMany({
      where: { userId: du.id },
      orderBy: { date: 'asc' }
    });
    console.log(`Attendance rows for user ${du.id} (${du.firstName} ${du.lastName}): total=${duAtts.length}`);
    const byMonth = {};
    duAtts.forEach(a => {
      const ym = a.date.toISOString().slice(0, 7);
      byMonth[ym] = (byMonth[ym] || 0) + 1;
    });
    console.log('Attendance by month:', byMonth);
    console.log('Sample rows:', duAtts.slice(0, 5).map(a => ({ id: a.id, date: a.date.toISOString().slice(0, 10), in: a.checkIn, out: a.checkOut, status: a.status })));
  }

  console.log('\n=== 4. DUPLICATE EMPLOYEES ===');
  const allEmps = await prisma.employee.findMany({
    select: { id: true, userId: true, companyId: true, firstName: true, lastName: true, employeeNumber: true, status: true, hireDate: true }
  });
  console.log(`Total employees in DB: ${allEmps.length}`);

  // Find by name in same company
  const byCompAndName = {};
  allEmps.forEach(e => {
    const key = `${e.companyId}_${(e.firstName || '').trim().toLowerCase()}_${(e.lastName || '').trim().toLowerCase()}`;
    if (!byCompAndName[key]) byCompAndName[key] = [];
    byCompAndName[key].push(e);
  });
  const duplicatesByName = Object.entries(byCompAndName).filter(([k, list]) => list.length > 1);
  console.log(`Duplicate employee records by name in same company (${duplicatesByName.length}):`);
  duplicatesByName.forEach(([k, list]) => {
    console.log(`  Key: ${k}`);
    list.forEach(e => console.log(`    id:${e.id} userId:${e.userId} empNum:${e.employeeNumber} status:${e.status}`));
  });

  // Find EMP00001
  const emp001 = allEmps.filter(e => e.employeeNumber === 'EMP00001');
  console.log(`EMP00001 occurrences: ${emp001.length}`);

  console.log('\n=== 5. BULK UPDATED ROWS (OCT 1) ===');
  const oct1Updates = await prisma.attendance.findMany({
    where: {
      updatedAt: {
        gte: new Date('2026-10-01T12:40:00.000Z'),
        lte: new Date('2026-10-01T12:55:00.000Z')
      }
    },
    select: { id: true, userId: true, date: true, checkIn: true, checkOut: true, status: true, lateMinutes: true, earlyLeaveMinutes: true, workHours: true, overtimeHours: true, notes: true, updatedAt: true }
  });
  console.log(`Total rows updated around 12:46:57 UTC on Oct 1: ${oct1Updates.length}`);
  if (oct1Updates.length > 0) {
    console.log('Sample updated rows:', oct1Updates.slice(0, 5));
    // Check for inconsistent rows
    const inconsistent = oct1Updates.filter(r => {
      if (r.checkIn && r.checkOut && new Date(r.checkIn) > new Date(r.checkOut)) return true;
      if (r.workHours && Number(r.workHours) < 0) return true;
      return false;
    });
    console.log(`Inconsistent rows found: ${inconsistent.length}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
