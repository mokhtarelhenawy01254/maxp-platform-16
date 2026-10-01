const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmldvhqkx0000juj6sdbx2jw0';
  const employees = [
    { name: 'Ali', id: 'cmldwfc750017juj6gbg6m8t7' },
    { name: 'Shrouk', id: 'cmlrssie9019kjuivk3odrzli' },
    { name: 'Menna', id: 'cmlrswe4701a4juivgtz25ovf' },
    { name: 'Shady', id: 'cmtv72ghb2alqjux6wh02yak6' },
    { name: 'Habiba', id: 'cmldw8ivl000jjuj6jhtjuxn2' }
  ];

  console.log('--- SUMMARY & PAYROLL DRAFT ---');
  for (const emp of employees) {
    const atts = await prisma.attendance.findMany({
      where: {
        userId: emp.id,
        date: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T23:59:59.999Z')
        }
      }
    });

    const attendedDays = atts.filter(a => ['PRESENT', 'LATE', 'REMOTE', 'OVERTIME'].includes(a.status));
    const lateDays = atts.filter(a => (a.lateMinutes > 0 || a.status === 'LATE') && a.status !== 'OVERTIME');
    const totalLateMins = lateDays.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

    const payroll = await prisma.payroll.findFirst({
      where: {
        userId: emp.id,
        month: 9,
        year: 2026
      }
    });

    const deds = await prisma.manualDeduction.findMany({
      where: {
        employeeId: emp.id,
        effectiveMonth: 9,
        effectiveYear: 2026
      }
    });
    const pendingDeds = deds.filter(d => d.status === 'PENDING');
    const approvedDeds = deds.filter(d => d.status === 'APPROVED');
    const rejectedDeds = deds.filter(d => d.status === 'REJECTED');

    console.log(`\n*** ${emp.name} ***`);
    console.log(`  Attendance: total=${atts.length}, attended=${attendedDays.length}, lateDays=${lateDays.length}, lateMinutes=${totalLateMins}`);
    console.log(`  Deductions: pending=${pendingDeds.length}, approved=${approvedDeds.length}, rejected=${rejectedDeds.length}`);
    if (pendingDeds.length > 0) {
      console.log(`    PENDING details:`, pendingDeds.map(d => ({ id: d.id, cat: d.category, type: d.type, amt: d.amount, reason: d.reason })));
    }
    if (payroll) {
      console.log(`  Payroll Draft: base=${payroll.baseSalary}, workDays=${payroll.workingDays}, actualDays=${payroll.actualWorkDays}, absentDays=${payroll.absentDays}, latePenalty=${payroll.latePenalty}, attDeduct=${payroll.attendanceDeduction}, totalDeduct=${payroll.totalDeductions}, gross=${payroll.grossSalary}, net=${payroll.netSalary}`);
      console.log(`  Deductions field:`, payroll.deductions);
    } else {
      console.log(`  Payroll Draft: NONE`);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
