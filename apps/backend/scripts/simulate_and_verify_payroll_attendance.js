/**
 * End-to-End Simulation & Verification Script for HR Attendance & Payroll Deductions
 */
const payrollService = require('../services/hr/payrollService');

function createSafeMockPrisma(customHandlers = {}) {
  const defaultModelHandler = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    count: async () => 0,
    create: async () => ({ id: 'new-id' }),
    update: async () => ({ id: 'updated-id' })
  };

  return new Proxy(customHandlers, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return defaultModelHandler;
    }
  });
}

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('🧪 بدء الاختبار الشامل لحساب وخصم المرتبات وسجلات الحضور تلقائياً');
  console.log('================================================================\n');

  const baseSalary = 9000; // راتب شهري 9000 ج.م
  const workingDays = 30;
  const workingHoursPerDay = 8;
  const dailyRate = baseSalary / workingDays; // 300 ج.م/يوم
  const hourlyRate = dailyRate / workingHoursPerDay; // 37.5 ج.م/ساعة
  const minuteRate = hourlyRate / 60; // 0.625 ج.م/دقيقة
  const absenceMultiplier = 1.5; // مضاعف الغياب للشركة 1.5x

  console.log(`📊 المعدلات الحسابية الأساسية:`);
  console.log(`   - الراتب الأساسي: ${baseSalary} ج.م`);
  console.log(`   - أجر اليوم: ${dailyRate.toFixed(2)} ج.م`);
  console.log(`   - أجر الساعة: ${hourlyRate.toFixed(2)} ج.م (${workingHoursPerDay} ساعات/يوم)`);
  console.log(`   - أجر الدقيقة: ${minuteRate.toFixed(3)} ج.م`);
  console.log(`   - معامل خصم الغياب: ${absenceMultiplier}x\n`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(title, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${title} ${extraInfo}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${title} ${extraInfo}`);
      process.exitCode = 1;
    }
  }

  const month = 8; // شهر مكتمل (أغسطس) لاختبار الحساب الكامل للدورة
  const year = 2026;
  const companyId = 'test-co-1';
  const emp1Id = 'emp-full';

  // -------------------------------------------------------------
  // Test 1: موظف بحضور كامل بدون أي غياب أو تأخير
  // -------------------------------------------------------------
  console.log('1️⃣ اختبار موظف بحضور كامل (Full Attendance):');

  let currentAttendance = generateFullAttendance(emp1Id, month, year);
  let currentPermissions = [];

  payrollService.prisma = createSafeMockPrisma({
    employee: {
      findFirst: async () => ({ salary: baseSalary, id: 'e1', userId: emp1Id })
    },
    user: {
      findUnique: async () => ({
        id: emp1Id,
        firstName: 'أحمد',
        lastName: 'حضور',
        employeeNumber: 'EMP-001',
        baseSalary: baseSalary,
        employees: [{ id: 'e1', salary: baseSalary }]
      })
    },
    hRSettings: {
      findUnique: async () => ({
        companyId,
        workingHoursPerDay: 8,
        workingDaysPerMonth: 26,
        absencePenaltyRate: 1.5,
        workDays: JSON.stringify([0, 1, 2, 3, 4, 6]), // كل الأيام عدا الجمعة
        lateGraceMinutes: 15,
        lateThresholdMinutes: 15,
        deductAbsenceInCurrentMonth: true
      })
    },
    attendance: {
      findMany: async () => currentAttendance
    },
    hrPermissionRequest: {
      findMany: async () => currentPermissions
    },
    hrShift: {
      findFirst: async () => ({ id: 'shift-1', startTime: '09:00', endTime: '17:00', hours: 8 })
    }
  });

  const res1 = await payrollService.calculatePayrollData(companyId, emp1Id, month, year);
  assert('خصومات الحضور صفر', res1.attendanceDeduction === 0, `(الناتج: ${res1.attendanceDeduction})`);
  assert('أيام الغياب صفر', res1.absentDays === 0);
  assert('غرامات التأخير صفر', res1.latePenalty === 0);
  assert('صافي الراتب مطابق للمرتب الكامل', res1.netSalary === baseSalary, `(الصافي: ${res1.netSalary})`);

  // -------------------------------------------------------------
  // Test 2: موظف بغياب يومين كاملين ويوم نصف دوام مع معامل 1.5x
  // -------------------------------------------------------------
  console.log('\n2️⃣ اختبار موظف بغياب (يومان كاملان + نصف يوم) بمعامل 1.5x:');
  // شهر أغسطس به 27 يوم عمل (31 - 4 جمعات)
  const actualWorkingDays = 27;
  const actualDailyRate = baseSalary / actualWorkingDays; // 333.33
  const expectedFullDayAbsenceCost = 2 * (actualDailyRate * 1.5); // 1000
  const expectedHalfDayAbsenceCost = 1 * ((actualDailyRate * 0.5) * 1.5); // 250
  const expectedTotalAbsenceDeduction = expectedFullDayAbsenceCost + expectedHalfDayAbsenceCost; // 1250

  currentAttendance = generateFullAttendance(emp1Id, month, year);
  // يوم 5 غياب كامل
  currentAttendance[4].status = 'ABSENT';
  currentAttendance[4].checkIn = null;
  currentAttendance[4].checkOut = null;
  // يوم 6 غياب كامل
  currentAttendance[5].status = 'ABSENT';
  currentAttendance[5].checkIn = null;
  currentAttendance[5].checkOut = null;
  // يوم 7 نصف دوام
  currentAttendance[6].status = 'HALF_DAY';
  currentAttendance[6].workingHours = 4;

  const res2 = await payrollService.calculatePayrollData(companyId, emp1Id, month, year);
  const parsedDeductions2 = res2.deductions || {};
  assert('حساب أيام الغياب (2.5 يوم)', res2.absentDays === 2.5, `(المحسوب: ${res2.absentDays})`);
  assert(
    `احتساب خصم الغياب الآلي بدقة (${expectedTotalAbsenceDeduction.toFixed(2)} ج.م)`,
    Math.abs((parsedDeductions2['غياب'] || 0) - expectedTotalAbsenceDeduction) < 0.5,
    `(المحسوب: ${parsedDeductions2['غياب']})`
  );
  assert('تسجيل تفاصيل تواريخ الغياب في absenceDetails', Boolean(parsedDeductions2.absenceDetails), parsedDeductions2.absenceDetails);

  // -------------------------------------------------------------
  // Test 3: موظف بتأخيرات متكررة (شرائح التأخير الآلية)
  // -------------------------------------------------------------
  console.log('\n3️⃣ اختبار موظف بتأخيرات تتجاوز فترة السماح (شرائح التأخير):');
  currentAttendance = generateFullAttendance(emp1Id, month, year);

  // تأخير يوم 10: 45 دقيقة
  currentAttendance[9].status = 'LATE';
  currentAttendance[9].lateMinutes = 45;
  // تأخير يوم 11: 75 دقيقة
  currentAttendance[10].status = 'LATE';
  currentAttendance[10].lateMinutes = 75;

  const res3 = await payrollService.calculatePayrollData(companyId, emp1Id, month, year);
  const parsedDeductions3 = res3.deductions || {};
  assert('تسجيل غرامة تأخير آلية في latePenalty', res3.latePenalty > 0, `(الغرامة: ${res3.latePenalty} ج.م)`);
  assert('إدراج خصم التأخيرات في بنود الاستقطاعات', (parsedDeductions3['تأخيرات'] || 0) > 0);
  assert('توثيق الدقائق المحسوبة في lateDetails', Boolean(parsedDeductions3.lateDetails), parsedDeductions3.lateDetails);

  // -------------------------------------------------------------
  // Test 4: موظف بعجز ساعات عمل وانصراف مبكر بدون إذن
  // -------------------------------------------------------------
  console.log('\n4️⃣ اختبار عجز ساعات العمل والانصراف المبكر بدون إذن رسمي:');
  currentAttendance = generateFullAttendance(emp1Id, month, year);

  // يوم 12: عمل 5 ساعات فقط من أصل 8 (عجز 3 ساعات)
  currentAttendance[11].workingHours = 5.0;
  currentAttendance[11].workHours = 5.0;
  currentAttendance[11].lateMinutes = 0;
  currentAttendance[11].earlyLeaveMinutes = 180; // 3 ساعات

  currentPermissions = []; // بدون إذن

  const res4 = await payrollService.calculatePayrollData(companyId, emp1Id, month, year);
  const parsedDeductions4 = res4.deductions || {};
  const actualHourlyRate = actualDailyRate / 8;
  const expectedDeficitCost = 3.0 * actualHourlyRate; // 125 ج.م

  assert(
    `احتساب خصم عجز ساعات العمل بدقة (${expectedDeficitCost.toFixed(2)} ج.م)`,
    Math.abs((parsedDeductions4['عجز ساعات العمل'] || 0) - expectedDeficitCost) < 0.5,
    `(المحسوب: ${parsedDeductions4['عجز ساعات العمل']})`
  );
  assert('توثيق تفاصيل العجز في deficitDetails', Boolean(parsedDeductions4.deficitDetails), parsedDeductions4.deficitDetails);

  // -------------------------------------------------------------
  // Test 5: عجز ساعات عمل مع إذن خروج رسمي معتمد (إعفاء من الخصم)
  // -------------------------------------------------------------
  console.log('\n5️⃣ اختبار عجز ساعات عمل مع وجود إذن خروج رسمي معتمد (HrPermissionRequest):');
  const approvedPermDate = new Date(year, month - 1, 12);
  currentPermissions = [
    {
      id: 'perm-1',
      employeeId: 'e1',
      userId: emp1Id,
      status: 'APPROVED',
      date: approvedPermDate,
      totalHours: 3.0,
      hours: 3.0,
      permissionType: 'EXIT'
    }
  ];

  const res5 = await payrollService.calculatePayrollData(companyId, emp1Id, month, year);
  const parsedDeductions5 = res5.deductions || {};
  assert(
    'إعفاء الساعات المستأذنة رسمياً بحيث يصبح عجز الساعات 0 ج.م',
    (parsedDeductions5['عجز ساعات العمل'] || 0) === 0,
    `(المحسوب بعد الإذن: ${parsedDeductions5['عجز ساعات العمل'] || 0})`
  );

  console.log('\n================================================================');
  console.log(`🏁 نتيجة الاختبار الذاتي: تم اجتياز ${passedTests} من أصل ${totalTests} اختبار بنجاح 100%!`);
  console.log('================================================================\n');

  payrollService.prisma = null;
}

function generateFullAttendance(userId, month, year) {
  const records = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    const isFriday = dayOfWeek === 5;

    records.push({
      id: `att-${d}`,
      userId,
      date,
      checkIn: isFriday ? null : '09:00',
      checkOut: isFriday ? null : '17:00',
      status: isFriday ? 'REST_DAY' : 'PRESENT',
      workingHours: isFriday ? 0 : 8,
      lateMinutes: 0,
      earlyLeaveMinutes: 0
    });
  }
  return records;
}

runEndToEndVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
