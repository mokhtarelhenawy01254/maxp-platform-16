const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { payrollService } = require('../services/hr');

async function main() {
  const prisma = getSharedPrismaClient();
  const companyId = 'cmldvhqkx0000juj6sdbx2jw0';

  console.log('🧹 [CLEANSE] Cleansing fake override records and aligning salaries...');

  // 1. Remove 3 fake leaves for Shrouk
  const delShroukLeaves = await prisma.leaveRequest.deleteMany({
    where: {
      userId: 'cmlrssie9019kjuivk3odrzli',
      reason: { contains: 'تعويض: 8 ساعات شغل إضافية' }
    }
  });
  console.log(`✅ Deleted ${delShroukLeaves.count} fake leaves for Shrouk`);

  // 2. Remove 5 fake permissions for Shrouk
  const shroukEmp = await prisma.employee.findFirst({
    where: { userId: 'cmlrssie9019kjuivk3odrzli' }
  });
  if (shroukEmp) {
    const delShroukPerms = await prisma.hrPermissionRequest.deleteMany({
      where: {
        employeeId: shroukEmp.id,
        reason: { contains: 'إعفاء تأخير بقرار المالك' }
      }
    });
    console.log(`✅ Deleted ${delShroukPerms.count} fake permissions for Shrouk`);
  }

  // 3. Mark Shrouk advance as not deducted in September
  await prisma.advanceRequest.update({
    where: { id: 'cmucdiy3k23wbju8z447si3af' },
    data: {
      status: 'COMPLETED',
      isPaidOff: true
    }
  });
  console.log('✅ Updated Shrouk advance cmucdiy3k23wbju8z447si3af to COMPLETED');

  // 3.5. Ensure Ali 4/9 Friday attendance has overtimeHours = 2.5 (hours past 18:00 end of shift)
  await prisma.attendance.update({
    where: { id: '6dac70f0-260e-4437-a8ba-4f823a1a8c2f' },
    data: {
      status: 'WEEKEND',
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      workHours: 5.5,
      overtimeHours: 2.5
    }
  });
  console.log('✅ Updated Ali 4/9 Friday attendance to overtimeHours = 2.5 (20:30 - 18:00 = 2.5h)');

  // Clear spurious overtime on Ali 2/9, 3/9, 5/9 (all checked out at 18:00 Cairo = shift end, 0 post-shift overtime)
  await prisma.attendance.updateMany({
    where: {
      userId: 'cmldwfc750017juj6gbg6m8t7',
      id: { in: ['3019173d-2865-4594-9218-0c954c55b8e7', 'edcc2aee-54b7-46fe-96ae-fc803c9ff2dd', '73d90652-84d1-4002-9c8e-1aa922d87429'] }
    },
    data: { overtimeHours: 0 }
  });
  console.log('✅ Cleared spurious overtime on Ali 2/9, 3/9, 5/9 (checkout at 18:00 = shift end)');

  // 4. Remove 2 fake leaves for Habiba
  const delHabibaLeaves = await prisma.leaveRequest.deleteMany({
    where: {
      userId: 'cmldw8ivl000jjuj6jhtjuxn2',
      reason: { contains: 'قرار المالك 2026-10-01' }
    }
  });
  console.log(`✅ Deleted ${delHabibaLeaves.count} fake leaves for Habiba`);

  // 5. Update Habiba base salary to 3500 in User & Employee and ensure overtimeRate is 1.50 in HRSettings
  await prisma.hRSettings.update({
    where: { companyId },
    data: {
      overtimeRate: 1.50,
      lateThresholdMinutes: 10,
      lateGracePeriod: 10,
      gracePeriodMinutes: 60
    }
  });
  console.log('✅ Updated HRSettings: overtimeRate = 1.50, lateGracePeriod = 10, lateThresholdMinutes = 10');

  await prisma.user.update({
    where: { id: 'cmldw8ivl000jjuj6jhtjuxn2' },
    data: { baseSalary: 3500 }
  });
  const habibaEmp = await prisma.employee.findFirst({
    where: { userId: 'cmldw8ivl000jjuj6jhtjuxn2' }
  });
  if (habibaEmp) {
    await prisma.employee.update({
      where: { id: habibaEmp.id },
      data: {
        baseSalary: 3500
      }
    });
  }
  console.log('✅ Updated Habiba base salary to 3500');

  // 6. Regenerate September 2026 Payroll Drafts for all employees
  console.log('\n🔄 Regenerating September 2026 Payroll Drafts...');
  const genResult = await payrollService.generateMonthlyPayroll(companyId, 9, 2026, true);
  console.log('✅ Payroll regenerated:', {
    success: genResult.success.length,
    regenerated: genResult.regenerated.length,
    failed: genResult.failed
  });

  // 7. Verify all 5 employees against ground truth
  const targetEmployees = [
    { name: 'Ali Waziry', id: 'cmldwfc750017juj6gbg6m8t7', expectedNet: 2376.61 },
    { name: 'Shrouk Magdi', id: 'cmlrssie9019kjuivk3odrzli', expectedNet: 5896.71 },
    { name: 'Menna Ayman', id: 'cmlrswe4701a4juivgtz25ovf', expectedNet: 3495.23 },
    { name: 'Shady Bahaa', id: 'cmtv72ghb2alqjux6wh02yak6', expectedNet: 2637.18 },
    { name: 'Habiba Sobhy', id: 'cmldw8ivl000jjuj6jhtjuxn2', expectedNet: 3230.77 }
  ];

  console.log('\n================ FINAL VERIFICATION ================');
  let allMatched = true;
  for (const emp of targetEmployees) {
    const p = await prisma.payroll.findFirst({
      where: { userId: emp.id, month: 9, year: 2026 }
    });
    if (p) {
      const net = Number(p.netSalary);
      const diff = Math.abs(net - emp.expectedNet);
      const matched = diff < 0.05;
      if (!matched) allMatched = false;

      console.log(`\n${matched ? '✅' : '❌'} ${emp.name}:`);
      console.log(`   Base: ${p.baseSalary} | Gross: ${p.grossSalary} | Net: ${net} (Expected: ${emp.expectedNet}) | Diff: ${diff.toFixed(2)}`);
      console.log(`   Days: Attended=${p.actualWorkDays}, Absent=${p.absentDays} | Overtime: ${p.overtimeHours}h (${p.overtimeAmount} EGP)`);
      console.log(`   Deductions: Late=${p.latePenalty}, AttDeduct=${p.attendanceDeduction}, Total=${p.totalDeductions}`);
      console.log(`   Details: ${p.deductions}`);
    } else {
      console.log(`❌ Payroll not found for ${emp.name}`);
      allMatched = false;
    }
  }

  console.log('\n===================================================');
  console.log(`Result: ${allMatched ? '🎯 ALL 5 EMPLOYEES MATCH GROUND TRUTH PERFECTLY!' : '⚠️ SOME EMPLOYEES HAD DIFFERENCES'}`);
}

main().catch(console.error).finally(() => process.exit(0));
