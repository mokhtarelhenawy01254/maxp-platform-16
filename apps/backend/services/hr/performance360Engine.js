/**
 * 🎯 MaxP Enterprise 360° Performance Calculation Engine
 * محرك الاحتساب الموحد والشامل لتقييم الأداء التلقائي 360° للموظفين
 * 
 * يعالج الثغرات الرياضية:
 * 1. منع مكافأة الموظف الشبح أو الغائب (Ghost Employee Zero-Activity Fix)
 * 2. نسبة الجودة التناسبية بدلاً من الخصم المطلق (Proportional Quality Rate)
 * 3. احتساب الغياب الصريح وأيام العمل المتوقعة في محور الحضور
 * 4. استخدام updatedAt كبديل في حال عدم تسجيل completedDate للمهام المكتملة
 * 5. استبعاد المهام الملغاة وشمول المهام المنجزة خلال الفترة
 * 6. إعادة التوزيع الديناميكي للأوزان (Dynamic Weight Rebalancing) للموظفين الميدانيين
 * 7. دعم التقييم بالشهور الميلادية المحددة والفترات التاريخية
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

/**
 * تحديد الفترة الزمنية للتقييم (تاريخ البداية والنهاية والاسم)
 */
function resolveEvaluationPeriod(query = {}) {
  const { month, year } = query;
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && y >= 2020 && y <= 2100) {
      const periodStartDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const periodEndDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      return {
        periodStartDate,
        periodEndDate,
        periodLabel: `${monthNames[m - 1]} ${y}`,
        isMonthSpecific: true,
        month: m,
        year: y
      };
    }
  }

  // الافتراضي: آخر 30 يوماً متجددة
  const periodEndDate = new Date();
  const periodStartDate = new Date(Date.now() - 30 * 86400000);
  return {
    periodStartDate,
    periodEndDate,
    periodLabel: 'آخر 30 يوماً',
    isMonthSpecific: false
  };
}

/**
 * احتساب التقييم الموضوعي 360° لموظف محدد
 */
async function computeEmployee360Metrics(dbClient, options = {}) {
  const {
    companyId,
    userId,
    employeeId,
    periodStartDate,
    periodEndDate,
    preloadedEmployee = null
  } = options;

  let emp = preloadedEmployee;
  if (!emp && (employeeId || userId)) {
    emp = await dbClient.employee.findFirst({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: [
          ...(employeeId ? [{ id: employeeId }] : []),
          ...(userId ? [{ userId }] : [])
        ]
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        user: { select: { id: true, avatar: true, email: true, firstName: true, lastName: true } }
      }
    });
  }

  const effectiveUserId = userId || emp?.userId || emp?.user?.id || null;
  const effectiveEmployeeId = employeeId || emp?.id || null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. المحور الأول: سرعة ومعدل الإنجاز (Delivery & Throughput) - الأساس 25%
  // ─────────────────────────────────────────────────────────────────────────────
  let tasks = [];
  if (effectiveUserId) {
    tasks = await dbClient.task.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        assignedTo: effectiveUserId,
        status: { not: 'CANCELLED' }, // استبعاد المهام الملغاة
        OR: [
          { createdAt: { gte: periodStartDate, lte: periodEndDate } },
          { completedDate: { gte: periodStartDate, lte: periodEndDate } },
          { dueDate: { gte: periodStartDate, lte: periodEndDate } }
        ]
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        completedDate: true,
        updatedAt: true,
        returnCount: true,
        lastReturnReason: true,
        missingEvidence: true
      }
    });
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  
  // معالجة موعد الإنجاز بدقة: استخدام completedDate أو updatedAt كبديل
  const onTimeTasks = tasks.filter(t => {
    if (t.status !== 'COMPLETED') return false;
    if (!t.dueDate) return true; // إذا لم يُحدد موعد نهائي، تعتبر في الموعد
    const finishTime = t.completedDate 
      ? new Date(t.completedDate) 
      : (t.updatedAt ? new Date(t.updatedAt) : null);
    if (!finishTime) return true;
    return finishTime <= new Date(t.dueDate);
  }).length;

  const lateTasksList = tasks.filter(t => {
    if (!t.dueDate) return false;
    if (t.status === 'COMPLETED') {
      const finishTime = t.completedDate ? new Date(t.completedDate) : new Date(t.updatedAt);
      return finishTime > new Date(t.dueDate);
    }
    // مهمة غير مكتملة وانتهى موعد استحقاقها
    return new Date(t.dueDate) < periodEndDate;
  });

  let hasDeliveryData = totalTasks > 0;
  let deliveryScore = null;
  let deliveryDetails = 'لا توجد مهام مسندة في هذه الفترة';

  if (hasDeliveryData) {
    const completionRate = (completedTasks / totalTasks) * 100;
    const onTimeRate = completedTasks > 0 
      ? (onTimeTasks / completedTasks) * 100 
      : (lateTasksList.length > 0 ? 0 : 50);
    deliveryScore = Math.max(25, Math.min(100, Math.round(0.6 * completionRate + 0.4 * onTimeRate)));
    deliveryDetails = `${completedTasks}/${totalTasks} منجزة (${onTimeTasks} في الموعد)`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. المحور الثاني: جودة المخرجات والاعتماد من أول مرة (Quality & First-Time-Right) - الأساس 25%
  // ─────────────────────────────────────────────────────────────────────────────
  const totalReturns = tasks.reduce((sum, t) => sum + (t.returnCount || 0), 0);
  const missingEvidenceCount = tasks.filter(t => t.missingEvidence).length;
  const returnedTasksList = tasks.filter(t => (t.returnCount || 0) > 0);

  let hasQualityData = totalTasks > 0;
  let qualityScore = null;
  let qualityDetails = 'لا توجد مهام لمراجعة الجودة';

  if (hasQualityData) {
    if (completedTasks > 0) {
      // احتساب نسبي عادل: معدل الخطأ لكل مهمة مكتملة
      const returnRatio = totalReturns / completedTasks;
      const missingEvidenceRatio = missingEvidenceCount / completedTasks;
      const deduction = (returnRatio * 40) + (missingEvidenceRatio * 20);
      qualityScore = Math.max(30, Math.min(100, Math.round(100 - deduction)));
      qualityDetails = totalReturns === 0 && missingEvidenceCount === 0
        ? 'اعتماد 100% دون أي إرجاعات'
        : `${totalReturns} إرجاعات و${missingEvidenceCount} أدلة ناقصة`;
    } else {
      // مهام مسندة قيد التنفيذ لم تُعتمد بعد
      qualityScore = 75;
      qualityDetails = 'مهام قيد التنفيذ لم تُعتمد بعد';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. المحور الثالث: الانضباط والحضور (Punctuality & Shift Attendance) - الأساس 20%
  // ─────────────────────────────────────────────────────────────────────────────
  const attConditions = [];
  if (effectiveUserId) attConditions.push({ userId: effectiveUserId });
  if (effectiveEmployeeId) {
    attConditions.push({ employeeRelId: effectiveEmployeeId });
    attConditions.push({ userId: effectiveEmployeeId });
  }

  let attendances = [];
  if (attConditions.length > 0) {
    attendances = await dbClient.attendance.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: attConditions,
        date: { gte: periodStartDate, lte: periodEndDate }
      },
      select: {
        id: true,
        date: true,
        status: true,
        lateMinutes: true,
        checkIn: true,
        checkOut: true
      }
    });
  }

  // إزالة التكرار في حال تطابق userId و employeeRelId في نفس التاريخ
  const attendanceDayMap = new Map();
  attendances.forEach(a => {
    const dayKey = a.date ? new Date(a.date).toISOString().slice(0, 10) : a.id;
    if (!attendanceDayMap.has(dayKey)) attendanceDayMap.set(dayKey, a);
  });
  const uniqueAttendances = Array.from(attendanceDayMap.values());

  const presentDays = uniqueAttendances.filter(a => ['PRESENT', 'LATE', 'HALF_DAY', 'REMOTE'].includes(a.status)).length;
  const absentDays = uniqueAttendances.filter(a => a.status === 'ABSENT').length;
  // سماحية 10 دقائق تأخير قبل احتسابه كيوم تأخير فعلي
  const lateDays = uniqueAttendances.filter(a => a.status === 'LATE' || Number(a.lateMinutes) > 10).length;
  const workDaysScheduled = presentDays + absentDays;

  let hasAttendanceData = workDaysScheduled > 0;
  let attendanceScore = null;
  let attendanceDetails = 'لا توجد سجلات حضور مسجلة';

  if (hasAttendanceData) {
    const presenceRate = (presentDays / workDaysScheduled) * 100;
    const punctualityRate = presentDays > 0 
      ? ((presentDays - lateDays) / presentDays) * 100 
      : 0;
    // 60% لنسبة الحضور الفعلي + 40% للانضباط والمواعيد
    attendanceScore = Math.max(25, Math.min(100, Math.round(0.6 * presenceRate + 0.4 * punctualityRate)));
    attendanceDetails = `${presentDays} حضور (${lateDays} تأخير، ${absentDays} غياب) من ${workDaysScheduled} يوم عمل`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. المحور الرابع: التركيز والنشاط الرقمي (Desktop Focus & Productivity) - الأساس 20%
  // ─────────────────────────────────────────────────────────────────────────────
  const monitorIds = [effectiveEmployeeId, effectiveUserId].filter(Boolean);
  let monitorSummaries = [];
  if (monitorIds.length > 0) {
    monitorSummaries = await dbClient.monitorDailySummary.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        employeeId: { in: monitorIds },
        date: { gte: periodStartDate, lte: periodEndDate }
      },
      select: {
        id: true,
        date: true,
        productivityScore: true,
        avgActivityScore: true,
        totalActiveSeconds: true
      }
    });
  }

  let hasFocusData = monitorSummaries.length > 0;
  let focusScore = null;
  let focusDetails = 'غير خاضع للمراقبة الرقمية / معفى';

  if (hasFocusData) {
    const avgProd = monitorSummaries.reduce((sum, m) => sum + (m.productivityScore || m.avgActivityScore || 0), 0) / monitorSummaries.length;
    focusScore = Math.max(30, Math.min(100, Math.round(avgProd)));
    focusDetails = `${monitorSummaries.length} أيام مسجلة (معدل نشاط ${focusScore}%)`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. المحور الخامس: الأهداف ومؤشرات النتائج (OKRs & Goals) - الأساس 10%
  // ─────────────────────────────────────────────────────────────────────────────
  const goalConditions = [];
  if (effectiveUserId) goalConditions.push({ userId: effectiveUserId });
  if (effectiveEmployeeId) goalConditions.push({ employeeRelId: effectiveEmployeeId });

  let goals = [];
  if (goalConditions.length > 0) {
    goals = await dbClient.goal.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        OR: goalConditions
      },
      select: {
        id: true,
        title: true,
        progress: true,
        status: true,
        dueDate: true
      }
    });
  }

  let hasGoalsData = goals.length > 0;
  let goalsScore = null;
  let goalsDetails = 'لا توجد أهداف OKRs مسندة';

  if (hasGoalsData) {
    const avgProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length;
    goalsScore = Math.max(25, Math.min(100, Math.round(avgProgress)));
    goalsDetails = `${goals.length} أهداف متابعة (إنجاز ${goalsScore}%)`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. إعادة التوازن الديناميكي للأوزان (Dynamic Weight Rebalancing)
  // ─────────────────────────────────────────────────────────────────────────────
  const candidatePillars = [
    { key: 'delivery', baseWeight: 25, hasData: hasDeliveryData, score: deliveryScore, label: 'سرعة ومعدل الإنجاز', details: deliveryDetails },
    { key: 'quality', baseWeight: 25, hasData: hasQualityData, score: qualityScore, label: 'جودة المخرجات والاعتماد', details: qualityDetails },
    { key: 'punctuality', baseWeight: 20, hasData: hasAttendanceData, score: attendanceScore, label: 'الانضباط والحضور', details: attendanceDetails },
    { key: 'focus', baseWeight: 20, hasData: hasFocusData, score: focusScore, label: 'التركيز والنشاط الرقمي', details: focusDetails },
    { key: 'goals', baseWeight: 10, hasData: hasGoalsData, score: goalsScore, label: 'الأهداف ومؤشرات النتائج', details: goalsDetails },
  ];

  const activePillars = candidatePillars.filter(p => p.hasData && p.score !== null);

  let compositeScore = null;
  let tier = 'PENDING_EVALUATION';
  let tierLabel = 'قيد التقييم (بيانات غير كافية)';
  let isAtRisk = false;
  const riskFlags = [];

  if (activePillars.length === 0) {
    // حالة الموظف الجديد أو الذي لا يمتلك أي نشاط: لا يتم منحه 96% بل وضعه قيد التقييم
    candidatePillars.forEach(p => { p.effectiveWeight = p.baseWeight; });
  } else {
    // توزيع الأوزان ديناميكياً على المحاور المفعلة فقط
    const totalActiveBase = activePillars.reduce((sum, p) => sum + p.baseWeight, 0);
    let allocatedWeight = 0;

    activePillars.forEach((p, idx) => {
      if (idx === activePillars.length - 1) {
        p.effectiveWeight = 100 - allocatedWeight;
      } else {
        p.effectiveWeight = Math.round((p.baseWeight / totalActiveBase) * 100);
        allocatedWeight += p.effectiveWeight;
      }
    });

    // المحاور غير المفعلة وزنها الفعلي صفر في الدرجة الكلية
    candidatePillars.forEach(p => {
      if (!p.hasData || p.score === null) {
        p.effectiveWeight = 0;
      }
    });

    let totalWeightedScore = 0;
    activePillars.forEach(p => {
      totalWeightedScore += p.score * p.effectiveWeight;
    });

    compositeScore = Math.round(totalWeightedScore / 100);

    if (compositeScore >= 90) {
      tier = 'TIER_S';
      tierLabel = 'متميز (Tier S)';
    } else if (compositeScore >= 80) {
      tier = 'TIER_A';
      tierLabel = 'ممتاز (Tier A)';
    } else if (compositeScore >= 70) {
      tier = 'TIER_B';
      tierLabel = 'مطابق للتوقعات (Tier B)';
    } else if (compositeScore >= 60) {
      tier = 'TIER_C';
      tierLabel = 'يحتاج تحسين (Tier C)';
    } else {
      tier = 'TIER_D';
      tierLabel = 'حرج ومخاطرة أداء (Tier D)';
    }

    // تحديد علامات الخطر (Risk Flags)
    if (hasQualityData && qualityScore < 70) riskFlags.push('ارتفاع معدل إرجاع المهام');
    if (hasAttendanceData && attendanceScore < 70) riskFlags.push('تكرار الغياب أو التأخير الصباحي');
    if (hasDeliveryData && deliveryScore < 70) riskFlags.push('تأخر تسليم المهام عن موعدها');
    if (hasFocusData && focusScore < 65) riskFlags.push('انخفاض النشاط الرقمي المسجل');
    if (hasGoalsData && goalsScore < 60) riskFlags.push('تعثر في إنجاز الأهداف المسندة');

    isAtRisk = compositeScore < 70 || riskFlags.length >= 2;
  }

  // إعداد التوصيات الذكية
  const recommendations = [];
  if (activePillars.length === 0) {
    recommendations.push('لا توجد سجلات كافية لحساب التقييم في هذه الفترة. سيبدأ احتساب مؤشرات الأداء تلقائياً فور تسجيل الحضور أو إسناد المهام.');
  } else {
    if (hasQualityData && qualityScore < 80) {
      recommendations.push('احرص على مراجعة معايير القبول وإرفاق أدلة الإنجاز لتقليل دورات إرجاع المهام.');
    }
    if (hasAttendanceData && attendanceScore < 80) {
      recommendations.push('الالتزام بمواعيد بصمة الحضور وتقليل أيام التأخير والغياب يرفع نقاط الانضباط فوراً.');
    }
    if (hasDeliveryData && deliveryScore < 80) {
      recommendations.push('تسليم المهام قبل موعد الاستحقاق يعزز من مؤشر الإنجاز والسرعة.');
    }
    if (hasFocusData && focusScore < 75) {
      recommendations.push('زيادة فترات النشاط المركز على بيئة العمل وتقليل فترات الخمول يرفع مؤشر التركيز.');
    }
    if (hasGoalsData && goalsScore < 75) {
      recommendations.push('تحديث نسب إنجاز الأهداف المسندة إليك بانتظام يرفع مؤشر النتائج.');
    }
    if (recommendations.length === 0) {
      recommendations.push('أداؤك استثنائي ومتزن عبر كافة المحاور الفعالة، استمر على هذا المستوى المشرف!');
    }
  }

  // صياغة كائن المحاور للتوافق الكامل مع واجهات العرض
  const pillarsMap = {};
  candidatePillars.forEach(p => {
    pillarsMap[p.key] = {
      score: p.score !== null ? p.score : 0,
      weight: p.effectiveWeight,
      baseWeight: p.baseWeight,
      label: p.label,
      details: p.details,
      isApplicable: p.hasData && p.score !== null
    };
  });

  return {
    employeeId: effectiveEmployeeId,
    userId: effectiveUserId,
    compositeScore: compositeScore !== null ? compositeScore : 0,
    isEvaluated: compositeScore !== null,
    tier,
    tierLabel,
    isAtRisk,
    riskFlags,
    pillars: pillarsMap,
    recommendations,
    telemetryStats: {
      tasksCompleted: completedTasks,
      totalTasks,
      onTimeTasks,
      lateTasksCount: lateTasksList.length,
      returns: totalReturns,
      missingEvidenceCount,
      presentDays,
      lateDays,
      absentDays,
      workDaysScheduled,
      monitoredDays: monitorSummaries.length,
      activeGoals: goals.length
    },
    drilldownDetails: {
      lateTasks: lateTasksList.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, status: t.status })),
      returnedTasks: returnedTasksList.map(t => ({ id: t.id, title: t.title, returnCount: t.returnCount, lastReturnReason: t.lastReturnReason }))
    }
  };
}

module.exports = {
  resolveEvaluationPeriod,
  computeEmployee360Metrics
};
