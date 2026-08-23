const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { isValidOrderStatusEnum } = require("../utils/orderStatusEnum");

// 🛡️ PRODUCTION-FIX (cron-validation-2026-08-23):
// يطابق الـ switch في orderStatusAutoChangeCron.js:12-19 — أي قيمة تانية
// بتتـ default لـ Minutes (silent)، اللي كان يـ enable rule زي
// `fromStatus=DELIVERED toStatus=PENDING waitTime=0` بـ intent خفيث.
const ALLOWED_TIME_UNITS = Object.freeze(['Minutes', 'Hours', 'Days']);

// حد أعلى لوقت الانتظار (525600 = 365 يوم بالدقايق) — يحمي من abuse.
const MAX_WAIT_TIME = 525600;

exports.getRules = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) return res.status(401).json({ success: false, message: "غير مصرح بالوصول" });

    const rules = await getSharedPrismaClient().orderStatusAutoChangeRule.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    console.error("Error fetching status rules:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
};

exports.createRule = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) return res.status(401).json({ success: false, message: "غير مصرح بالوصول" });

    const { fromStatus, toStatus, waitTime, timeUnit } = req.body || {};

    // 1. Field presence
    if (
      fromStatus === undefined || fromStatus === null || fromStatus === "" ||
      toStatus === undefined || toStatus === null || toStatus === "" ||
      waitTime === undefined || waitTime === null ||
      timeUnit === undefined || timeUnit === null || timeUnit === ""
    ) {
      return res.status(400).json({ success: false, message: "كل الحقول مطلوبة" });
    }

    // 2. Normalize status codes
    const normalizedFrom = String(fromStatus).trim().toUpperCase();
    const normalizedTo = String(toStatus).trim().toUpperCase();

    // 3. Same-status check — القاعدة لازم تنقل لحالة مختلفة
    if (normalizedFrom === normalizedTo) {
      return res.status(400).json({
        success: false,
        message: "حالة المصدر وحالة الهدف يجب أن تكونا مختلفتين",
      });
    }

    // 4. timeUnit whitelist — بيمنع `fortnights`/`Seconds` silent fallback
    const normalizedTimeUnit = String(timeUnit).trim();
    if (!ALLOWED_TIME_UNITS.includes(normalizedTimeUnit)) {
      return res.status(400).json({
        success: false,
        message: `وحدة الوقت يجب أن تكون واحدة من: ${ALLOWED_TIME_UNITS.join("، ")}`,
      });
    }

    // 5. waitTime: integer موجب ضمن حدود معقولة
    // (parseInt("abc") = NaN → كان بيـ poison الـ cron بـ Invalid Date)
    const parsedWaitTime = Number(waitTime);
    if (
      !Number.isInteger(parsedWaitTime) ||
      parsedWaitTime < 1 ||
      parsedWaitTime > MAX_WAIT_TIME
    ) {
      return res.status(400).json({
        success: false,
        message: `وقت الانتظار يجب أن يكون رقماً صحيحاً بين 1 و ${MAX_WAIT_TIME}`,
      });
    }

    // 6. fromStatus لازم يكون enum value — الـ cron بيـ query
    // `order.status = rule.fromStatus` (orderStatusAutoChangeCron.js:61).
    // لو مفيش match، الـ rule هيتنفذ على 0 orders (silent no-op).
    if (!isValidOrderStatusEnum(normalizedFrom)) {
      return res.status(400).json({
        success: false,
        message: `حالة المصدر "${normalizedFrom}" غير صالحة. يجب أن تكون من الحالات المعروفة للنظام (مثل PENDING, CONFIRMED, DELIVERED).`,
      });
    }

    // 7. toStatus: إما enum value مباشرة، أو custom code من
    // orderStatusConfig عنده mapsToSystem صالح (بيروح لـ updateOrderStatus
    // اللي بيعمل resolve via resolveOrderStatusForStorage).
    if (!isValidOrderStatusEnum(normalizedTo)) {
      const prisma = getSharedPrismaClient();
      const toConfig = await prisma.orderStatusConfig.findFirst({
        where: {
          companyId,
          code: { equals: normalizedTo, mode: "insensitive" },
          isActive: true,
        },
        select: { mapsToSystem: true },
      });
      if (!toConfig?.mapsToSystem || !isValidOrderStatusEnum(String(toConfig.mapsToSystem).toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `حالة الهدف "${normalizedTo}" غير صالحة ولا يوجد لها ربط صحيح بحالات النظام في إعدادات الشركة.`,
        });
      }
    }

    const rule = await getSharedPrismaClient().orderStatusAutoChangeRule.create({
      data: {
        companyId,
        fromStatus: normalizedFrom,
        toStatus: normalizedTo,
        waitTime: parsedWaitTime,
        timeUnit: normalizedTimeUnit,
      },
    });

    // 🛡️ PRODUCTION-FIX: شيلنا الـ console.log اللي كان بيـ leak الـ rule
    // (companyId, fromStatus, toStatus) في production logs.
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error("Error creating status rule:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const { id } = req.params;

    if (!companyId) return res.status(401).json({ success: false, message: "غير مصرح بالوصول" });

    // 🛡️ PRODUCTION-FIX: استخدم deleteMany بـ compound where عشان:
    // 1. يتجنب TOCTOU بين الـ findUnique والـ delete.
    // 2. الـ response shape يبقى consistent مع باقي الـ APIs.
    const result = await getSharedPrismaClient().orderStatusAutoChangeRule.deleteMany({
      where: { id, companyId },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: "القاعدة غير موجودة" });
    }

    res.status(200).json({ success: true, message: "تم حذف القاعدة بنجاح" });
  } catch (error) {
    console.error("Error deleting status rule:", error);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
};
