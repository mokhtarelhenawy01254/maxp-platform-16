const { getSharedPrismaClient } = require("./sharedDatabase");
const { getNowInTimezone, normalizeDateForDb, getDateStringInTimezone } = require("../utils/dateUtils");
const { roundToTwo } = require("./businessGoalUtils");

const DEFAULT_TIMEZONE = "Africa/Cairo";

/**
 * 🎯 METRIC DEFINITIONS CATALOG
 * الكتالوج المركزي الشامل لجميع المؤشرات التلقائية المربوطة بالمنصة
 */
const METRIC_CATALOG = {
  ORDER_CONFIRMED: {
    key: "ORDER_CONFIRMED",
    category: "SALES",
    label: "تأكيد طلبات (كول سنتر)",
    unit: "طلب مؤكد",
    defaultTarget: 50,
    icon: "PhoneCall",
    keywords: ["تأكيد", "تاكيد", "confirmed", "confirm"],
    description: "يزداد تلقائياً عندما يؤكد الموظف طلبية على المنصة",
  },
  ORDER_CREATED: {
    key: "ORDER_CREATED",
    category: "SALES",
    label: "إنشاء طلبات مبيعات جديدة",
    unit: "طلب",
    defaultTarget: 20,
    icon: "ShoppingCart",
    keywords: ["انشاء طلب", "إنشاء طلب", "طلب جديد", "طلبات جديدة", "new order"],
    description: "يزداد تلقائياً عند تسجيل طلب جديد في النظام",
  },
  ORDER_DELIVERED: {
    key: "ORDER_DELIVERED",
    category: "LOGISTICS",
    label: "تسليم شحنات وطلبات بنجاح",
    unit: "شحنة مسلمة",
    defaultTarget: 40,
    icon: "Truck",
    keywords: ["تسليم", "مسلم", "delivered", "شحنة"],
    description: "يزداد تلقائياً عند تحديث حالة الشحنة إلى تم التسليم",
  },
  REVENUE_COLLECTED: {
    key: "REVENUE_COLLECTED",
    category: "FINANCE",
    label: "تحصيل إيرادات وأموال (خزينة)",
    unit: "ج.م",
    defaultTarget: 10000,
    icon: "Banknote",
    keywords: ["تحصيل", "ايراد", "إيراد", "فلوس", "مبيعات نقدية", "revenue", "cash"],
    description: "يزداد تلقائياً بمقدار المبالغ المحصلة والمسددة",
  },
  TASK_COMPLETED: {
    key: "TASK_COMPLETED",
    category: "PRODUCTIVITY",
    label: "إنجاز مهام (إنتاجية)",
    unit: "مهمة",
    defaultTarget: 5,
    icon: "CheckCircle2",
    keywords: ["مهام", "مهمة", "انجاز مهام", "إنجاز مهام", "task"],
    description: "يزداد تلقائياً عند تحويل أي مهمة إلى مكتملة (Done)",
  },
  TASK_STOPWATCH_HOURS: {
    key: "TASK_STOPWATCH_HOURS",
    category: "PRODUCTIVITY",
    label: "ساعات عمل تركيز بالتايمر",
    unit: "ساعة",
    defaultTarget: 6,
    icon: "Clock",
    keywords: ["ساعات", "تايمر", "مؤقت", "ساعة عمل", "stopwatch", "hours"],
    description: "يزداد تلقائياً بعدد الساعات المسجلة عبر مؤقت الديسك توب",
  },
  TICKET_RESOLVED: {
    key: "TICKET_RESOLVED",
    category: "SUPPORT",
    label: "حل وإغلاق تذاكر دعم فني",
    unit: "تذكرة",
    defaultTarget: 15,
    icon: "Headphones",
    keywords: ["تذكرة", "تذاكر", "دعم", "شكوى", "ticket", "support"],
    description: "يزداد تلقائياً عند إغلاق تذكرة دعم أو خدمة عملاء",
  },
  DENTAL_CASE_COMPLETED: {
    key: "DENTAL_CASE_COMPLETED",
    category: "DENTAL_LAB",
    label: "إنتاج وتسليم حالات معمل الأسنان",
    unit: "حالة",
    defaultTarget: 10,
    icon: "Activity",
    keywords: ["حالة", "حالات", "تركيبات", "معمل", "اسنان", "أسنان", "dental"],
    description: "يزداد تلقائياً عند تسليم حالة أو إنهاء مرحلة فنية في المعمل",
  },
};

class GoalMetricEngine {
  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إرجاع كتالوج المؤشرات مع الفئات
   */
  getMetricCatalog() {
    return Object.values(METRIC_CATALOG);
  }

  /**
   * فحص هل الهدف مرتبط بمؤشر معين
   * يفحص التاج الصريح [METRIC:KEY] في الوصف، أو بالكلمات الدلالية في العنوان والوحدة
   */
  matchGoalWithMetric(goal, metricKey) {
    if (!goal) return false;
    const def = METRIC_CATALOG[metricKey];
    if (!def) return false;

    // 1. فحص التاج الصريح في الوصف
    const desc = String(goal.description || "");
    if (desc.includes(`[METRIC:${metricKey}]`) || desc.includes(`METRIC:${metricKey}`)) {
      return true;
    }

    // 2. فحص الكلمات المفتاحية التلقائية في العنوان أو وحدة القياس
    const textToScan = `${goal.title || ""} ${goal.unit || ""} ${desc}`.toLowerCase();
    return def.keywords.some((kw) => textToScan.includes(kw.toLowerCase()));
  }

  /**
   * استخراج كود المؤشر من الهدف إن وجد
   */
  detectMetricKey(goal) {
    if (!goal) return null;
    const desc = String(goal.description || "");
    const match = desc.match(/\[METRIC:([A-Z0-9_]+)\]/);
    if (match && METRIC_CATALOG[match[1]]) {
      return match[1];
    }

    for (const [key, def] of Object.entries(METRIC_CATALOG)) {
      if (this.matchGoalWithMetric(goal, key)) {
        return key;
      }
    }
    return null;
  }

  /**
   * الحصول على المنطقة الزمنية للشركة
   */
  async getCompanyTimezone(companyId) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true },
      });
      return company?.timezone || DEFAULT_TIMEZONE;
    } catch {
      return DEFAULT_TIMEZONE;
    }
  }

  /**
   * ⚡ تسجيل حدث تلقائي وتحديث الأهداف النشطة المرتبطة به
   * non-blocking, safe execution
   */
  async recordGoalMetricEvent({
    companyId,
    userId = null,
    departmentId = null,
    projectId = null,
    metricKey,
    incrementValue = 1,
    metadata = {},
  }) {
    if (!companyId || !metricKey) {
      return { success: false, reason: "Missing companyId or metricKey" };
    }

    const numericIncrement = Number(incrementValue);
    if (!Number.isFinite(numericIncrement) || numericIncrement <= 0) {
      return { success: false, reason: "Invalid incrementValue" };
    }

    try {
      const timezone = await this.getCompanyTimezone(companyId);
      const todayDateStr = getDateStringInTimezone(new Date(), timezone);
      const todayNormalized = normalizeDateForDb(new Date(), timezone);

      // البحث عن الأهداف النشطة للموظف أو القسم أو الشركة
      const candidateGoals = await this.prisma.goal.findMany({
        where: {
          companyId,
          status: { notIn: ["CANCELLED"] },
          OR: [
            // 1. أهداف الموظف المباشرة (يومية لليوم أو مداها الزمني يغطي اليوم)
            ...(userId
              ? [
                  {
                    userId,
                    OR: [
                      { goalDate: todayNormalized },
                      {
                        startDate: { lte: todayNormalized },
                        endDate: { gte: todayNormalized },
                      },
                    ],
                  },
                ]
              : []),
            // 2. أهداف القسم
            ...(departmentId
              ? [
                  {
                    departmentId,
                    goalType: "DEPARTMENT",
                    startDate: { lte: todayNormalized },
                    endDate: { gte: todayNormalized },
                  },
                ]
              : []),
            // 3. أهداف المشروع
            ...(projectId
              ? [
                  {
                    projectId,
                    goalType: "PROJECT",
                    startDate: { lte: todayNormalized },
                    endDate: { gte: todayNormalized },
                  },
                ]
              : []),
            // 4. أهداف الشركة العامة
            {
              goalType: "COMPANY",
              startDate: { lte: todayNormalized },
              endDate: { gte: todayNormalized },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          unit: true,
          goalType: true,
          goalDate: true,
          targetValue: true,
          currentValue: true,
          userId: true,
          parentGoalId: true,
        },
      });

      if (!candidateGoals.length) {
        return { success: true, updatedCount: 0, reason: "No active goals found" };
      }

      // تصفية الأهداف المطابقة لهذا المؤشر تحديداً
      const matchedGoals = candidateGoals.filter((goal) =>
        this.matchGoalWithMetric(goal, metricKey)
      );

      if (!matchedGoals.length) {
        return { success: true, updatedCount: 0, reason: "No goals matched metric" };
      }

      // استيراد businessGoalService بشكل ديناميكي لتفادي أي حلقات استدعاء
      const businessGoalService = require("./businessGoalService");
      const serviceInstance =
        typeof businessGoalService.updateGoalProgress === "function"
          ? businessGoalService
          : new businessGoalService();

      let updatedCount = 0;
      for (const goal of matchedGoals) {
        try {
          await serviceInstance.updateGoalProgress(companyId, goal.id, {
            incrementValue: numericIncrement,
          });
          updatedCount++;
          console.log(
            `🎯 [GOAL-METRIC-ENGINE] Auto-incremented goal "${goal.title}" (${metricKey}) +${numericIncrement} for user ${userId || "SYS"}`
          );
        } catch (updateErr) {
          console.warn(
            `⚠️ [GOAL-METRIC-ENGINE] Failed to increment goal ${goal.id}:`,
            updateErr.message
          );
        }
      }

      return {
        success: true,
        metricKey,
        incrementValue: numericIncrement,
        updatedCount,
      };
    } catch (error) {
      console.error("❌ [GOAL-METRIC-ENGINE] Error processing metric event:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GoalMetricEngine();
