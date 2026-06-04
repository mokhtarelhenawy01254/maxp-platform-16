/**
 * 🧪 Integration Test: Lateness sync and payroll deduction calculation logic.
 * Verifies that attendance edits sync with auto-deductions, respect the 60-minute grace period,
 * and that only approved deductions affect the net salary.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const payrollService = require('../services/hr/payrollService');
const latenessCalculationService = require('../services/hr/latenessCalculationService');

async function runTest() {
  console.log('🧪 Starting Lateness & Payroll Deduction Integration Test...');
  const prisma = getSharedPrismaClient();

  try {
    // 1. Find or create a test company
    let company = await prisma.company.findFirst();
    if (!company) {
      console.log('Creating a dummy company...');
      company = await prisma.company.create({
        data: {
          name: 'Test Company',
          slug: 'test-company-' + Date.now(),
          timezone: 'Africa/Cairo'
        }
      });
    }
    const companyId = company.id;
    console.log(`🏢 Company ID: ${companyId}`);

    // 2. Find or create a test employee
    let employee = await prisma.user.findFirst({
      where: { companyId, role: 'EMPLOYEE' }
    });
    if (!employee) {
      console.log('Creating a dummy employee...');
      employee = await prisma.user.create({
        data: {
          id: require('crypto').randomUUID(),
          firstName: 'Test',
          lastName: 'Employee',
          email: `test.employee.${Date.now()}@example.com`,
          password: 'password123',
          role: 'EMPLOYEE',
          companyId,
          baseSalary: 3000,
          enableAutoDeduction: true,
          monthlyGraceMinutes: 60,
          isActive: true,
          employeeNumber: 'EMP-' + Date.now()
        }
      });
    } else {
      // Ensure the employee is updated to match our test parameters
      employee = await prisma.user.update({
        where: { id: employee.id },
        data: {
          baseSalary: 3000,
          enableAutoDeduction: true,
          monthlyGraceMinutes: 60
        }
      });
    }
    const employeeId = employee.id;
    console.log(`👤 Employee ID: ${employeeId} (${employee.firstName} ${employee.lastName})`);

    // 3. Upsert HR Settings
    await prisma.hRSettings.upsert({
      where: { companyId },
      create: {
        companyId,
        autoDeductionEnabled: true,
        gracePeriodMinutes: 60,
        requireDeductionReview: true,
        deductAbsenceInCurrentMonth: true,
        workingDaysPerMonth: 22,
        workingHoursPerDay: 8,
        delayPenaltyTiers: '[]'
      },
      update: {
        autoDeductionEnabled: true,
        gracePeriodMinutes: 60,
        requireDeductionReview: true,
        deductAbsenceInCurrentMonth: true,
        workingDaysPerMonth: 22,
        workingHoursPerDay: 8
      }
    });
    console.log('⚙️ HR Settings configured.');

    // Choose target month/year
    const month = 6; // June
    const year = 2026;
    console.log(`📅 Target Period: ${month}/${year}`);

    // 4. Clean up existing records for this month/employee
    await prisma.attendance.deleteMany({
      where: { userId: employeeId, date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0) } }
    });
    await prisma.manualDeduction.deleteMany({
      where: { employeeId, effectiveMonth: month, effectiveYear: year }
    });
    await prisma.latenessBalance.deleteMany({
      where: { employeeId, month, year }
    });
    await prisma.advanceRequest.deleteMany({
      where: { userId: employeeId }
    });
    console.log('🧹 Cleaned up old attendance, deductions, lateness balances, and advances.');

    // 5. Create a late attendance record
    // 80 minutes late. Grace period is 60 minutes.
    // Penalty should be on remaining 20 minutes.
    // baseSalary = 3000. workingDays = 22. dailySalary = 3000 / 22 = 136.36.
    // workingHours = 8. hourlyRate = 136.36 / 8 = 17.04.
    // minuteRate = 17.04 / 60 = 0.284.
    // Penalty amount should be 20 * 0.284 = 5.68.
    const attendanceDate = new Date(year, month - 1, 1, 11, 20); // 1st June, 2026
    const att = await prisma.attendance.create({
      data: {
        userId: employeeId,
        companyId,
        date: attendanceDate,
        status: 'LATE',
        lateMinutes: 80,
        checkIn: attendanceDate,
        checkOut: new Date(year, month - 1, 1, 17, 0)
      }
    });
    console.log(`📝 Created attendance: Date: ${att.date.toISOString()}, Late: ${att.lateMinutes} mins.`);

    // Create on-time attendances for June 2, 3, and 4 to avoid absence deductions in the test
    for (let day = 2; day <= 4; day++) {
      await prisma.attendance.create({
        data: {
          userId: employeeId,
          companyId,
          date: new Date(year, month - 1, day, 9, 0),
          status: 'PRESENT',
          lateMinutes: 0,
          checkIn: new Date(year, month - 1, day, 9, 0),
          checkOut: new Date(year, month - 1, day, 17, 0)
        }
      });
    }
    console.log('📝 Created on-time attendances for June 2, 3, and 4.');

    // 6. Run synchronization
    console.log('🔄 Running syncLatenessAndDeductionsForMonth...');
    await latenessCalculationService.syncLatenessAndDeductionsForMonth(companyId, employeeId, month, year);

    // 7. Verify sync results
    const balance = await prisma.latenessBalance.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } }
    });
    console.log('📊 Lateness Balance:', balance);
    if (!balance || balance.graceMinutesUsed !== 60 || balance.deductedMinutes !== 20) {
      throw new Error(`❌ Failure: Balance mismatch. Grace used: ${balance?.graceMinutesUsed}, Deducted mins: ${balance?.deductedMinutes}`);
    }
    console.log('✅ Success: Grace period and deducted minutes calculated correctly.');

    const deduction = await prisma.manualDeduction.findFirst({
      where: { employeeId, effectiveMonth: month, effectiveYear: year, category: 'AUTO_DEDUCTION', type: 'LATE' }
    });
    console.log('💵 Auto Deduction:', deduction);
    if (!deduction) {
      throw new Error('❌ Failure: No auto deduction record created.');
    }
    if (deduction.status !== 'PENDING') {
      throw new Error(`❌ Failure: Deduction status is ${deduction.status}, expected PENDING.`);
    }
    const expectedAmount = 20 * (3000 / 22 / (8 * 60));
    console.log(`Expected penalty: ${expectedAmount.toFixed(2)}, Actual: ${parseFloat(deduction.amount).toFixed(2)}`);
    if (Math.abs(parseFloat(deduction.amount) - expectedAmount) > 0.1) {
      throw new Error('❌ Failure: Deduction amount mismatch.');
    }
    console.log('✅ Success: Auto-deduction created as PENDING with correct amount.');

    // 8. Calculate Payroll and verify that the PENDING deduction is NOT applied to net salary
    console.log('🧮 Calculating payroll data (PENDING deduction)...');
    let payrollData = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    console.log(`- Gross Salary: ${payrollData.grossSalary}`);
    console.log(`- Total Deductions: ${payrollData.totalDeductions}`);
    console.log(`- Net Salary: ${payrollData.netSalary}`);
    console.log('- Deductions details:', payrollData.deductions);
    
    if (payrollData.totalDeductions > 0 || Math.abs(payrollData.netSalary - (payrollData.grossSalary - payrollData.socialInsurance - payrollData.taxAmount)) > 0.01) {
      throw new Error('❌ Failure: Net salary was reduced by a PENDING deduction.');
    }
    console.log('✅ Success: Net salary is unaffected by PENDING deductions.');

    // 9. Approve the deduction
    console.log('👍 Approving deduction...');
    await prisma.manualDeduction.update({
      where: { id: deduction.id },
      data: { status: 'APPROVED' }
    });

    // 10. Re-calculate Payroll and verify that the APPROVED deduction IS applied
    console.log('🧮 Re-calculating payroll data (APPROVED deduction)...');
    payrollData = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    console.log(`- Gross Salary: ${payrollData.grossSalary}`);
    console.log(`- Total Deductions: ${payrollData.totalDeductions}`);
    console.log(`- Net Salary: ${payrollData.netSalary}`);

    if (parseFloat(payrollData.totalDeductions) <= 0 || Math.abs(payrollData.netSalary - (payrollData.grossSalary - payrollData.totalDeductions - payrollData.socialInsurance - payrollData.taxAmount)) > 0.01) {
      throw new Error('❌ Failure: Approved deduction was NOT subtracted from net salary.');
    }
    console.log('✅ Success: Net salary correctly subtracted APPROVED deduction.');

    // 11. Modify attendance (change late minutes to 0)
    console.log('✏️ Updating attendance to be on-time (lateMinutes = 0)...');
    await prisma.attendance.update({
      where: { id: att.id },
      data: {
        lateMinutes: 0,
        status: 'PRESENT',
        checkIn: new Date(year, month - 1, 1, 9, 0) // On time
      }
    });

    // 12. Re-run synchronization
    console.log('🔄 Running syncLatenessAndDeductionsForMonth again...');
    await latenessCalculationService.syncLatenessAndDeductionsForMonth(companyId, employeeId, month, year);

    // 13. Verify auto-deduction is deleted and balance is updated
    const updatedBalance = await prisma.latenessBalance.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } }
    });
    console.log('📊 Updated Lateness Balance:', updatedBalance);
    if (updatedBalance.graceMinutesUsed !== 0 || updatedBalance.deductedMinutes !== 0) {
      throw new Error('❌ Failure: Lateness balance not reset after on-time update.');
    }

    const updatedDeduction = await prisma.manualDeduction.findFirst({
      where: { employeeId, effectiveMonth: month, effectiveYear: year, category: 'AUTO_DEDUCTION', type: 'LATE' }
    });
    if (updatedDeduction) {
      throw new Error('❌ Failure: Auto deduction was not deleted/cancelled after attendance was updated to on-time.');
    }
    console.log('✅ Success: Auto-deduction was deleted/cancelled automatically.');

    // 14. Re-calculate payroll
    console.log('🧮 Calculating payroll one final time...');
    payrollData = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    console.log(`- Final Gross: ${payrollData.grossSalary}`);
    console.log(`- Final Deductions: ${payrollData.totalDeductions}`);
    console.log(`- Final Net: ${payrollData.netSalary}`);
    
    if (payrollData.totalDeductions > 0 || Math.abs(payrollData.netSalary - (payrollData.grossSalary - payrollData.socialInsurance - payrollData.taxAmount)) > 0.01) {
      throw new Error('❌ Failure: Net salary is still reduced after cancellation.');
    }
    console.log('✅ Success: Final net salary is fully restored.');
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('❌ Integration Test Failed with Error:', error);
    process.exit(1);
  }
}

runTest();
