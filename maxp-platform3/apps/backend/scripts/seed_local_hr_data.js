const path = require('path');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
  errorFormat: 'minimal',
});

const CID = process.argv[2] || 'cmqm7l1fi0000vbrossbnn4qw';
const pick = a => a[Math.floor(Math.random() * a.length)];
const pickN = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, Math.min(n, a.length));
const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rbool = () => Math.random() > 0.5;
const rdate = daysAgo => new Date(Date.now() - rint(0, daysAgo) * 86400000);
const rpast = () => new Date(Date.now() - rint(30, 365) * 86400000);

async function main() {
  const employees = await prisma.employee.findMany({ where: { companyId: CID } });
  const depts = await prisma.department.findMany({ where: { companyId: CID } });
  const owner = await prisma.user.findFirst({ where: { companyId: CID, role: 'OWNER' } });
  if (!employees.length) throw new Error('No employees found');
  console.log('Found', employees.length, 'employees,', depts.length, 'departments');

  const result = {};

  // 1. RewardTypes
  const rts = [];
  for (const d of [
    { name: 'مكافأة أداء', nameAr: 'مكافأة أداء', category: 'FINANCIAL', calc: 'PERCENTAGE', val: 10, max: 5000, trig: 'MANUAL', freq: 'MONTHLY' },
    { name: 'مكافأة حضور', nameAr: 'مكافأة حضور', category: 'FINANCIAL', calc: 'FIXED', val: 500, trig: 'AUTOMATIC', freq: 'MONTHLY' },
    { name: 'مكافأة سنوية', nameAr: 'مكافأة سنوية', category: 'FINANCIAL', calc: 'PERCENTAGE', val: 50, max: 20000, trig: 'MANUAL', freq: 'YEARLY' },
    { name: 'شهادة شكر', nameAr: 'شهادة شكر', category: 'NON_FINANCIAL', calc: 'FIXED', val: 0, trig: 'MANUAL', freq: 'ONCE' },
  ]) {
    rts.push(await prisma.rewardType.create({ data: { companyId: CID, name: d.name, nameAr: d.nameAr, category: d.category, calculationMethod: d.calc, value: d.val, maxCap: d.max || null, triggerType: d.trig, frequency: d.freq, isActive: true, priority: 1, createdBy: owner.id, effectiveFrom: new Date('2025-01-01') } }));
  }
  result.rewardTypes = rts.length;

  // 2. Benefits
  const benefits = [];
  for (const b of [
    { name: 'تأمين صحي', type: 'HEALTH', cost: 5000 },
    { name: 'بدل مواصلات', type: 'TRANSPORT', cost: 1000 },
    { name: 'وجبات', type: 'MEAL', cost: 1500 },
    { name: 'اشتراك نادي رياضي', type: 'GYM', cost: 800 },
  ]) {
    benefits.push(await prisma.benefit.create({ data: { companyId: CID, name: b.name, type: b.type, cost: b.cost, isActive: true } }));
  }
  result.benefits = benefits.length;

  // 3. Positions
  const positions = [];
  for (const p of [
    { title: 'مدير عام', level: 5, min: 25000, max: 50000, d: 'إدارة' },
    { title: 'مدير مبيعات', level: 4, min: 15000, max: 30000, d: 'مبيعات' },
    { title: 'محاسب أول', level: 3, min: 10000, max: 20000, d: 'محاسبة' },
    { title: 'محاسب', level: 2, min: 6000, max: 12000, d: 'محاسبة' },
    { title: 'مشرف دعم', level: 3, min: 8000, max: 15000, d: 'دعم العملاء' },
    { title: 'وكيل دعم', level: 2, min: 5000, max: 10000, d: 'دعم العملاء' },
    { title: 'أخصائي تسويق', level: 3, min: 8000, max: 18000, d: 'تسويق' },
    { title: 'أمين مخازن', level: 2, min: 5000, max: 10000, d: 'مخازن' },
    { title: 'موظف شؤون موظفين', level: 2, min: 6000, max: 12000, d: 'شؤون موظفين' },
    { title: 'مطور', level: 3, min: 12000, max: 25000, d: 'تطوير' },
  ]) {
    const dept = depts.find(x => x.name === p.d);
    positions.push(await prisma.position.create({ data: { companyId: CID, title: p.title, level: p.level, minSalary: p.min, maxSalary: p.max, departmentId: dept ? dept.id : null, isActive: true } }));
  }
  result.positions = positions.length;

  // 4. Shifts
  const shifts = [];
  for (const s of [{ n: 'فترة صباحية', s: '08:00', e: '16:00' }, { n: 'فترة مسائية', s: '14:00', e: '22:00' }, { n: 'فترة ليلية', s: '22:00', e: '06:00' }]) {
    shifts.push(await prisma.shift.create({ data: { companyId: CID, name: s.n, startTime: s.s, endTime: s.e, breakDuration: 60, isActive: true } }));
  }
  result.shifts = shifts.length;

  // 5. Leave Requests
  let lc = 0;
  const leaveTypes = ['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID', 'EMERGENCY'];
  for (const emp of employees) {
    for (let j = 0; j < rint(1, 3); j++) {
      const lt = pick(leaveTypes);
      const start = rdate(60);
      const status = pick(['APPROVED', 'APPROVED', 'REJECTED', 'PENDING']);
      const approver = pick(employees.filter(e => e.id !== emp.id));
      try {
        await prisma.leaveRequest.create({
          data: { companyId: CID, userId: emp.userId, type: lt, startDate: start, endDate: new Date(start.getTime() + rint(1, 5) * 86400000), totalDays: rint(1, 5), reason: 'إجازة', status, approvedBy: status === 'APPROVED' ? approver.userId : null, approvedAt: status === 'APPROVED' ? new Date() : null, employeeEmployeeLeavesId: emp.id }
        });
        lc++;
      } catch (_) {}
    }
  }
  result.leaveRequests = lc;

  // 6. Attendance (30 days)
  let ac = 0;
  for (let d = 30; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000);
    if (date.getDay() === 5 || date.getDay() === 6) continue;
    for (const emp of employees) {
      const st = pick(['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT']);
      try {
        if (st === 'ABSENT') {
          await prisma.attendance.create({ data: { companyId: CID, userId: emp.userId, date, status: st, employeeRelId: emp.id } });
        } else {
          const lateM = st === 'LATE' ? rint(5, 45) : 0;
          await prisma.attendance.create({ data: { companyId: CID, userId: emp.userId, date, checkIn: new Date(date.getFullYear(), date.getMonth(), date.getDate(), rint(8, 9), rint(0, 59)), checkOut: new Date(date.getFullYear(), date.getMonth(), date.getDate(), rint(16, 18), rint(0, 59)), status: st, lateMinutes: lateM, employeeRelId: emp.id } });
        }
        ac++;
      } catch (_) {}
    }
  }
  result.attendance = ac;

  // 7. Payrolls (last 3 months)
  let payc = 0;
  for (const emp of employees) {
    for (let m = 0; m < 3; m++) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - m);
      const month = dt.getMonth() + 1;
      const year = dt.getFullYear();
      const baseSal = Number(emp.baseSalary) || 10000;
      const gross = baseSal + 1800;
      const net = gross - Math.round(baseSal * 0.165);
      try {
        await prisma.payroll.create({
          data: { companyId: CID, userId: emp.userId, month, year, periodStart: new Date(year, month - 1, 1), periodEnd: new Date(year, month, 0), baseSalary: baseSal, workingDays: 22, actualWorkDays: rint(20, 22), allowances: '{"transport":1000,"meal":500,"phone":300}', totalAllowances: 1800, deductions: '{"insurance":' + Math.round(baseSal * 0.14) + '}', totalDeductions: Math.round(baseSal * 0.165), overtimeHours: rbool() ? rint(2, 10) : 0, overtimeRate: 1.5, overtimeAmount: rbool() ? rint(200, 2000) : 0, bonuses: rbool() ? rint(200, 2000) : 0, socialInsurance: Math.round(baseSal * 0.14), taxAmount: Math.round(baseSal * 0.025), grossSalary: gross, netSalary: net, status: pick(['PAID', 'PAID', 'PROCESSED']), paidAt: new Date(year, month, 25), employeeRelId: emp.id }
        });
        payc++;
      } catch (_) {}
    }
  }
  result.payrolls = payc;

  // 8. Salary History (10 employees)
  let shc = 0;
  for (const emp of pickN(employees, 10)) {
    const oldSal = Number(emp.baseSalary) - rint(1000, 5000);
    try {
      await prisma.salaryHistory.create({ data: { companyId: CID, userId: emp.userId, previousSalary: Math.max(3000, oldSal), newSalary: Number(emp.baseSalary) + rint(0, 2000), changeType: pick(['RAISE', 'PROMOTION', 'ADJUSTMENT']), changePercentage: rint(5, 25), effectiveDate: rdate(90), reason: 'زيادة', approvedBy: owner.id, employeeRelId: emp.id } });
      shc++;
    } catch (_) {}
  }
  result.salaryHistory = shc;

  // 9. Manual Deductions
  let mdc = 0;
  for (let i = 0; i < 15; i++) {
    const emp = pick(employees);
    try {
      await prisma.manualDeduction.create({ data: { companyId: CID, employeeId: emp.id, type: pick(['PENALTY', 'VIOLATION', 'DAMAGE', 'ABSENCE']), amount: rint(100, 2000), reason: 'خصم', date: rdate(30), effectiveMonth: rint(1, 6), effectiveYear: 2026, status: pick(['APPROVED', 'APPROVED', 'PENDING']), approvedBy: owner.id, approvedAt: new Date(), appliedToPayroll: rbool(), createdBy: owner.id } });
      mdc++;
    } catch (_) {}
  }
  result.manualDeductions = mdc;

  // 10. Advance Requests
  let arc = 0;
  for (let i = 0; i < 15; i++) {
    const emp = pick(employees);
    const amt = rint(1000, 10000);
    try {
      await prisma.advanceRequest.create({ data: { companyId: CID, userId: emp.userId, amount: amt, reason: 'مصاريف', repaymentType: 'INSTALLMENT', installmentsCount: rint(3, 6), monthlyAmount: Math.round(amt / 3), employeeSalary: Number(emp.baseSalary) || 10000, maxAllowedAmount: (Number(emp.baseSalary) || 10000) * 0.5, remainingBalance: amt, status: pick(['PENDING', 'APPROVED', 'PAID']), approvedBy: owner.id, employeeRelId: emp.id } });
      arc++;
    } catch (_) {}
  }
  result.advanceRequests = arc;

  // 11. Performance Reviews
  let perfc = 0;
  for (const emp of employees) {
    const reviewer = pick(employees.filter(e => e.id !== emp.id));
    try {
      await prisma.performanceReview.create({ data: { companyId: CID, reviewerId: reviewer.id, userId: emp.userId, reviewPeriod: 'Q1-2026', periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-03-31'), overallRating: rint(2, 5), ratings: JSON.stringify({ p: rint(3, 5), q: rint(3, 5), t: rint(3, 5) }), strengths: pick(['متميز', 'مجتهد', 'منظم']), improvements: pick(['تطوير المهارات', 'إدارة الوقت']), reviewerComments: pick(['أداء جيد', 'ممتاز', 'بحاجة تحسين']), status: pick(['COMPLETED', 'SUBMITTED']), submittedAt: new Date(), employeeEmployeeReviewsId: emp.id, employeeReviewerReviewsId: reviewer.id } });
      perfc++;
    } catch (_) {}
  }
  result.performanceReviews = perfc;

  // 12. Employee Documents (10 employees)
  let dc = 0;
  for (const emp of pickN(employees, 10)) {
    try {
      await prisma.employeeDocument.create({ data: { companyId: CID, userId: emp.userId, name: 'عقد عمل', type: 'CONTRACT', fileUrl: '/docs/contract.pdf', isVerified: rbool(), employeeRelId: emp.id } });
      await prisma.employeeDocument.create({ data: { companyId: CID, userId: emp.userId, name: 'بطاقة شخصية', type: 'ID', fileUrl: '/docs/id.pdf', isVerified: rbool(), employeeRelId: emp.id } });
      dc += 2;
    } catch (_) {}
  }
  result.employeeDocuments = dc;

  // 13. Employee Trainings
  let tc = 0;
  for (let i = 0; i < 20; i++) {
    const emp = pick(employees);
    try {
      await prisma.employeeTraining.create({ data: { companyId: CID, userId: emp.userId, trainingName: pick(['مهارات البيع', 'إدارة الوقت', 'التواصل', 'القيادة', 'تحليل البيانات']), provider: 'أكاديمية ماكس', type: pick(['INTERNAL', 'ONLINE']), description: 'برنامج تدريبي', startDate: rpast(), endDate: new Date(), duration: rint(8, 40), cost: rint(500, 5000), status: pick(['COMPLETED', 'ONGOING', 'PLANNED']), score: rint(70, 100), employeeRelId: emp.id } });
      tc++;
    } catch (_) {}
  }
  result.employeeTrainings = tc;

  // 14. Employee Warnings
  let wc = 0;
  for (let i = 0; i < 8; i++) {
    const emp = pick(employees);
    try {
      await prisma.employeeWarning.create({ data: { companyId: CID, userId: emp.userId, type: pick(['VERBAL', 'WRITTEN']), severity: pick(['minor', 'major']), title: 'تأخير', description: 'تأخير عن العمل', incidentDate: rdate(30), actionTaken: 'تم التنبيه', issuedBy: owner.id, employeeRelId: emp.id } });
      wc++;
    } catch (_) {}
  }
  result.employeeWarnings = wc;

  // 15. Late Warnings
  let lwc = 0;
  for (let i = 0; i < 10; i++) {
    const emp = pick(employees);
    try {
      await prisma.lateWarning.create({ data: { companyId: CID, userId: emp.userId, month: rint(1, 6), year: 2026, lateCount: rint(1, 5), totalMinutes: rint(10, 120), warningLevel: rint(1, 3), employeeRelId: emp.id } });
      lwc++;
    } catch (_) {}
  }
  result.lateWarnings = lwc;

  // 16. Lateness Records
  let lrc = 0;
  for (let i = 0; i < 20; i++) {
    const emp = pick(employees);
    const date = rdate(30);
    try {
      await prisma.latenessRecord.create({ data: { companyId: CID, userId: emp.userId, date, checkInTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), rint(8, 11), rint(0, 59)), expectedStartTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0), latestAllowedTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 15), latenessMinutes: rint(5, 60), latenessCategory: 'LATE', isViolation: true, employeeRelId: emp.id } });
      lrc++;
    } catch (_) {}
  }
  result.latenessRecords = lrc;

  // 17. Lateness Deductions
  let ldc = 0;
  for (let i = 0; i < 10; i++) {
    const emp = pick(employees);
    try {
      await prisma.latenessDeduction.create({ data: { companyId: CID, userId: emp.userId, deductionType: 'FINANCIAL', deductionReason: 'تأخير', violationDate: rdate(30), latenessMinutes: rint(10, 60), financialAmount: rint(50, 500), warningLevel: rint(1, 2), isAppliedToPayroll: rbool(), approvedBy: owner.id, approvedAt: new Date(), employeeRelId: emp.id } });
      ldc++;
    } catch (_) {}
  }
  result.latenessDeductions = ldc;

  // 18. Lateness Balances
  let lbc = 0;
  for (const emp of employees) {
    for (const m of [4, 5, 6]) {
      try {
        await prisma.latenessBalance.create({ data: { companyId: CID, employeeId: emp.id, month: m, year: 2026, totalLateMinutes: rint(0, 120), graceMinutesUsed: rint(0, 30), deductedMinutes: rint(0, 60), totalDeductionAmount: rint(0, 500), lateCount: rint(0, 5) } });
        lbc++;
      } catch (_) {}
    }
  }
  result.latenessBalances = lbc;

  // 19. Resignations
  let resc = 0;
  for (let i = 0; i < 3; i++) {
    const emp = pick(employees);
    try {
      await prisma.resignation.create({ data: { companyId: CID, userId: emp.userId, resignationDate: rdate(30), lastWorkingDay: new Date(Date.now() + rint(0, 30) * 86400000), reason: 'فرصة أفضل', status: pick(['PENDING', 'APPROVED']), approvedBy: rbool() ? owner.id : null, approvedAt: rbool() ? new Date() : null, noticePeriodDays: 30, employeeRelId: emp.id } });
      resc++;
    } catch (_) {}
  }
  result.resignations = resc;

  // 20. Promotions
  let promc = 0;
  for (let i = 0; i < 5; i++) {
    const emp = pick(employees);
    const fromPos = pick(positions);
    const toPos = pick(positions.filter(p => p.level > fromPos.level || p.id !== fromPos.id));
    if (!toPos) continue;
    try {
      await prisma.promotion.create({ data: { companyId: CID, userId: emp.userId, fromPositionId: fromPos.id, toPositionId: toPos.id, fromPositionName: fromPos.title, toPositionName: toPos.title, fromSalary: Number(emp.baseSalary), toSalary: Number(emp.baseSalary) + rint(2000, 5000), promotionDate: rdate(60), effectiveDate: rdate(30), reason: 'تميز', status: pick(['APPROVED', 'PENDING']), approvedBy: owner.id, approvedAt: new Date() } });
      promc++;
    } catch (_) {}
  }
  result.promotions = promc;

  // 21. Benefit Enrollments
  let bec = 0;
  for (const emp of pickN(employees, 15)) {
    for (const b of benefits) {
      try {
        await prisma.benefitEnrollment.create({ data: { companyId: CID, benefitId: b.id, userId: emp.userId, startDate: rpast(), status: pick(['ACTIVE', 'INACTIVE']), employeeRelId: emp.id } });
        bec++;
      } catch (_) {}
    }
  }
  result.benefitEnrollments = bec;

  // 22. Goals
  let gc = 0;
  for (let i = 0; i < 20; i++) {
    const emp = pick(employees);
    const dept = depts.find(d => d.id === emp.departmentId);
    try {
      await prisma.goal.create({ data: { companyId: CID, departmentId: dept ? dept.id : depts[0].id, title: 'زيادة المبيعات', description: 'هدف القسم', goalType: pick(['EMPLOYEE', 'DEPARTMENT']), priority: pick(['LOW', 'MEDIUM', 'HIGH']), targetValue: rint(100, 1000) * 100, currentValue: rint(0, 1000) * 100, unit: 'EGP', startDate: rdate(60), endDate: new Date(Date.now() + rint(30, 90) * 86400000), status: pick(['PENDING', 'IN_PROGRESS', 'COMPLETED']), progress: rint(0, 100), userId: emp.userId, employeeRelId: emp.id } });
      gc++;
    } catch (_) {}
  }
  result.goals = gc;

  // 23. Feedback
  let fc = 0;
  for (let i = 0; i < 20; i++) {
    const from = pick(employees);
    const to = pick(employees.filter(e => e.id !== from.id));
    try {
      await prisma.feedback.create({ data: { companyId: CID, type: pick(['PEER', 'MANAGER']), content: pick(['عمل رائع', 'شكراً لمساعدتك', 'ممتاز', 'دقيق ومنظم']), rating: rint(3, 5), isAnonymous: rbool(), status: 'ACTIVE', fromUserId: from.userId, toUserId: to.userId, employeeFeedbackFromId: from.id, employeeFeedbackToId: to.id } });
      fc++;
    } catch (_) {}
  }
  result.feedback = fc;

  // 24. Kudos
  let kc = 0;
  for (let i = 0; i < 20; i++) {
    const from = pick(employees);
    const to = pick(employees.filter(e => e.id !== from.id));
    try {
      await prisma.kudos.create({ data: { companyId: CID, fromUserId: from.userId, toUserId: to.userId, reason: pick(['ساعد في إنجاز المهمة', 'دائم المساعدة', 'أداء متميز', 'روح الفريق']), points: rint(1, 5) } });
      kc++;
    } catch (_) {}
  }
  result.kudos = kc;

  // 25. Reward Records
  let rrc = 0;
  for (const emp of pickN(employees, 10)) {
    try {
      await prisma.rewardRecord.create({ data: { companyId: CID, userId: emp.userId, rewardTypeId: pick(rts).id, rewardName: 'مكافأة أداء', rewardCategory: pick(['PERFORMANCE', 'ATTENDANCE']), calculatedValue: rint(500, 5000), periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-03-31'), appliedMonth: rint(1, 6), appliedYear: 2026, reason: 'أداء متميز', status: pick(['APPROVED', 'GIVEN', 'PENDING']), approvedBy: owner.id, approvedAt: new Date(), isIncludedInPayroll: rbool() } });
      rrc++;
    } catch (_) {}
  }
  result.rewardRecords = rrc;

  // 26. HR Audit Logs
  let alc = 0;
  for (let i = 0; i < 30; i++) {
    const emp = pick(employees);
    try {
      await prisma.hRAuditLog.create({ data: { companyId: CID, userId: emp.userId, action: pick(['CREATE', 'UPDATE', 'APPROVE']), entityType: pick(['LEAVE', 'ADVANCE', 'ATTENDANCE', 'PAYROLL']), entityId: 'ref-' + i, description: pick(['تم إنشاء طلب', 'تمت الموافقة', 'تم التحديث']), createdAt: rdate(30) } });
      alc++;
    } catch (_) {}
  }
  result.hrAuditLogs = alc;

  // 27. Permission Requests
  let prc = 0;
  for (let i = 0; i < 20; i++) {
    const emp = pick(employees);
    const approver = pick(employees.filter(e => e.id !== emp.id));
    try {
      await prisma.hrPermissionRequest.create({ data: { companyId: CID, employeeId: emp.id, type: pick(['DEDUCTIBLE', 'NON_DEDUCTIBLE']), date: rdate(30), startTime: '10:00', endTime: '13:00', totalHours: 3, reason: 'طبيب', status: pick(['APPROVED', 'PENDING', 'REJECTED']), approvedById: approver ? approver.id : null, approvedAt: new Date(), isUrgent: rbool() } });
      prc++;
    } catch (_) {}
  }
  result.permissionRequests = prc;

  console.log(JSON.stringify({ success: true, companyId: CID, hrData: result }, null, 2));
}

main().catch(e => { console.error('HR seed failed:', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect().catch(() => {}));
