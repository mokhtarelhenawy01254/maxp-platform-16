const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { payrollService } = require('../services/hr');

async function main() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmldvhqkx0000juj6sdbx2jw0'; // H2M company

  console.log('🚀 [RECONCILIATION] Starting comprehensive HR September 2026 reconciliation...');

  // 1. Deactivate demo account (Swan Company: swan@h2m.com, cmleybpg2002bjuo2m44y4kip)
  console.log('\n--- 1. Locking Demo Account ---');
  const demoUser = await prisma.user.findUnique({
    where: { id: 'cmleybpg2002bjuo2m44y4kip' }
  });
  if (demoUser) {
    await prisma.user.update({
      where: { id: 'cmleybpg2002bjuo2m44y4kip' },
      data: { isActive: false }
    });
    console.log('✅ Demo user cmleybpg2002bjuo2m44y4kip (swan@h2m.com) deactivated (isActive = false)');
  }

  // 2. Deduplicate Shrouk Magdi records
  console.log('\n--- 2. Employee Records Deduplication ---');
  const oldShroukId = 'cmlqr2h5j00rejulzwkiz24b1'; // EMP00005, TERMINATED
  const activeShroukId = 'cmm1zmbq806bwjuaahdgyqgjq'; // AUTO-115865-48, ACTIVE, userId: cmlrssie9019kjuivk3odrzli

  const remappedAtt = await prisma.attendance.updateMany({
    where: { employeeRelId: oldShroukId },
    data: { employeeRelId: activeShroukId }
  });
  console.log(`✅ Reassigned ${remappedAtt.count} attendance rows from old Shrouk to active Shrouk record`);

  await prisma.employee.update({
    where: { id: oldShroukId },
    data: {
      status: 'TERMINATED',
      notes: '[Merged into cmm1zmbq806bwjuaahdgyqgjq on 2026-10-01] Historical record preserved'
    }
  });
  console.log('✅ Updated old Shrouk record notes without deleting historical data');

  // 3. Fix Menna Ayman 17/9 record
  console.log('\n--- 3. Fixing Menna 17/9 Attendance Record ---');
  const mennaAtt = await prisma.attendance.findFirst({
    where: {
      userId: 'cmlrswe4701a4juivgtz25ovf',
      date: {
        gte: new Date('2026-09-17T00:00:00.000Z'),
        lte: new Date('2026-09-17T23:59:59.999Z')
      }
    }
  });
  if (mennaAtt) {
    await prisma.attendance.update({
      where: { id: mennaAtt.id },
      data: {
        companyId: companyId,
        checkIn: new Date('2026-09-17T08:00:00.000Z'), // 10:00 Cairo
        checkOut: new Date('2026-09-17T16:00:00.000Z'), // 18:00 Cairo
        workHours: 8.0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        status: 'PRESENT',
        notes: 'Healed 17/9: normal full day attendance 10:00-18:00 (8.0h, 0 late, 0 earlyLeave)'
      }
    });
    console.log(`✅ Healed Menna 17/9 record ${mennaAtt.id} with companyId=${companyId}, 8.0h, 0 earlyLeave`);
  }

  // 4. Cancel all PENDING AUTO_DEDUCTION rows in H2M to prevent double deductions
  console.log('\n--- 4. Cancelling Ghost / Pending AUTO_DEDUCTION Rows ---');
  const pendingAutoDeds = await prisma.manualDeduction.findMany({
    where: {
      companyId,
      category: 'AUTO_DEDUCTION',
      status: 'PENDING'
    }
  });
  console.log(`Found ${pendingAutoDeds.length} pending AUTO_DEDUCTION rows in H2M`);
  let cancelledCount = 0;
  for (const d of pendingAutoDeds) {
    await prisma.manualDeduction.update({
      where: { id: d.id },
      data: {
        status: 'CANCELLED',
        rejectedBy: 'HR_RECONCILER',
        rejectedAt: new Date(),
        rejectionReason: 'Auto-cancelled to eliminate double deduction with lateness engine',
        notes: `${d.notes || ''}\n[RECONCILER 2026-10-01] Status set to CANCELLED`
      }
    });
    cancelledCount++;
  }
  console.log(`✅ Set status = CANCELLED for ${cancelledCount} rows in hr_manual_deductions`);

  // 5. Unify HR Settings for H2M
  console.log('\n--- 5. Unifying HR Settings Single Source of Truth ---');
  await prisma.hRSettings.update({
    where: { companyId },
    data: {
      lateThresholdMinutes: 10,
      lateGracePeriod: 10,
      gracePeriodMinutes: 60
    }
  });
  await prisma.latenessRules.upsert({
    where: { companyId },
    create: {
      companyId,
      workStartTime: '10:00',
      latestAllowedTime: '10:10',
      monthlyAllowanceMinutes: 60,
      allowanceResetDay: 5
    },
    update: {
      workStartTime: '10:00',
      latestAllowedTime: '10:10',
      monthlyAllowanceMinutes: 60
    }
  });
  console.log('✅ Unified H2M HRSettings & LatenessRules: lateThresholdMinutes=10, lateGracePeriod=10, latestAllowedTime=10:10');

  // 6. Regenerate September 2026 Payroll Drafts
  console.log('\n--- 6. Regenerating September 2026 Payroll Drafts ---');
  const genResult = await payrollService.generateMonthlyPayroll(companyId, 9, 2026, true);
  console.log('✅ generateMonthlyPayroll completed:', {
    success: genResult.success.length,
    regenerated: genResult.regenerated.length,
    failed: genResult.failed
  });

  const targetEmployees = [
    { name: 'Ali Waziry', id: 'cmldwfc750017juj6gbg6m8t7', expectedNet: 2376.61 },
    { name: 'Shrouk Magdi', id: 'cmlrssie9019kjuivk3odrzli', expectedNet: 5896.71 },
    { name: 'Menna Ayman', id: 'cmlrswe4701a4juivgtz25ovf', expectedNet: 3495.23 },
    { name: 'Shady Bahaa', id: 'cmtv72ghb2alqjux6wh02yak6', expectedNet: 2637.18 },
    { name: 'Habiba Sobhy', id: 'cmldw8ivl000jjuj6jhtjuxn2', expectedNet: 3230.77 }
  ];

  for (const emp of targetEmployees) {
    const p = await prisma.payroll.findFirst({
      where: { userId: emp.id, month: 9, year: 2026 }
    });
    if (p) {
      console.log(`\n📊 Verified Payroll for ${emp.name}:`, {
        baseSalary: Number(p.baseSalary),
        workingDays: p.workingDays,
        actualWorkDays: p.actualWorkDays,
        absentDays: p.absentDays,
        overtimeHours: Number(p.overtimeHours),
        overtimeAmount: Number(p.overtimeAmount),
        attendanceDeduction: Number(p.attendanceDeduction),
        latePenalty: Number(p.latePenalty),
        totalDeductions: Number(p.totalDeductions),
        netSalary: Number(p.netSalary),
        expectedNet: emp.expectedNet,
        diff: Math.abs(Number(p.netSalary) - emp.expectedNet).toFixed(2),
        deductionsField: p.deductions
      });
    } else {
      console.log(`❌ Payroll not found for ${emp.name}`);
    }
  }

  console.log('\n🎉 [RECONCILIATION] Completed successfully!');
}

main().catch(console.error).finally(() => process.exit(0));
