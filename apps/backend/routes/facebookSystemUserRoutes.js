/**
 * facebookSystemUserRoutes.js
 * واجهات إدارة توكن System User الدائم (بديل توكنات OAuth منتهية الصلاحية).
 *
 * المصادقة: verifyToken.authenticateToken على كل المسارات (نفس نمط facebookOAuthRoutes)
 * النطاق المركزي (CENTRAL): يمر إجباريًا عبر requireSuperAdmin — بوابة المنصة القياسية.
 *
 * ⚠️ كتابة TENANT مقيدة بـ req.user.companyId دائمًا (لا يُقبل companyId من الجسم — منع كتابة عابرة للشركات).
 */

const express = require("express");
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const { requireSuperAdmin } = require("../middleware/superAdminMiddleware");
const {
  saveSystemUserToken,
  clearSystemUserToken,
  getSystemUserTokenStatus,
  resolveEffectiveSystemUserToken,
  listPagesForSystemUserToken,
  validateSystemUserTokenWithGraph,
} = require("../services/facebookSystemUserTokenService");

const normalizeScope = (value) =>
  String(value || "").trim().toUpperCase() === "CENTRAL" ? "CENTRAL" : "TENANT";

// بوابة شرطية: النطاق المركزي فقط يمر عبر requireSuperAdmin
const conditionalSuperAdmin = (req, res, next) => {
  const scope = normalizeScope(req.body?.scope || req.query?.scope);
  if (scope === "CENTRAL") {
    return requireSuperAdmin(req, res, next);
  }
  next();
};

// حالة الإعداد: التوكن النشط للشركة + المركزي + أيهما الفعّال (بدون كشف التوكن)
router.get("/status", verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId || null;
    const status = await getSystemUserTokenStatus(companyId);
    return res.json({ success: true, ...status });
  } catch (error) {
    console.error("❌ [FB-SYSTEM-USER] status error:", error.message);
    return res.status(500).json({ success: false, error: "FAILED_TO_LOAD_STATUS" });
  }
});

// حفظ توكن: TENANT للشركة الحالية، أو CENTRAL للسوبر أدمن (عبر conditionalSuperAdmin)
router.post(
  "/token",
  verifyToken.authenticateToken,
  conditionalSuperAdmin,
  async (req, res) => {
    try {
      const scope = normalizeScope(req.body?.scope);
      const companyId = scope === "CENTRAL" ? null : req.user?.companyId;

      if (scope === "TENANT" && !companyId) {
        return res.status(400).json({ success: false, error: "COMPANY_ID_REQUIRED" });
      }

      const saved = await saveSystemUserToken({
        companyId,
        scope,
        token: req.body?.token,
        mode: req.body?.mode,
        label: req.body?.label || null,
        businessId: req.body?.businessId || null,
        appId: req.body?.appId || null,
        appKey: req.body?.appKey || null,
        createdBy: req.user?.id || req.user?.sub || null,
        validate: true,
      });

      const status = await getSystemUserTokenStatus(companyId);
      return res.json({ success: true, saved, ...status });
    } catch (error) {
      const knownFailures = new Set([
        "INVALID_TOKEN_FORMAT",
        "INVALID_TOKEN",
        "GRAPH_VALIDATION_FAILED",
        "TENANT_SCOPE_REQUIRES_COMPANY",
        "CENTRAL_SCOPE_MUST_BE_PLATFORM_WIDE",
      ]);
      if (knownFailures.has(error.message)) {
        return res.status(400).json({
          success: false,
          error: error.message,
          detail: error.detail || undefined,
        });
      }
      console.error("❌ [FB-SYSTEM-USER] save error:", error.message);
      return res.status(500).json({ success: false, error: "FAILED_TO_SAVE_TOKEN" });
    }
  },
);

// إلغاء التوكن النشط: TENANT للشركة، أو CENTRAL للسوبر أدمن
router.delete(
  "/token",
  verifyToken.authenticateToken,
  conditionalSuperAdmin,
  async (req, res) => {
    try {
      const scope = normalizeScope(req.query?.scope);
      const companyId = scope === "CENTRAL" ? null : req.user?.companyId;

      if (scope === "TENANT" && !companyId) {
        return res.status(400).json({ success: false, error: "COMPANY_ID_REQUIRED" });
      }

      const result = await clearSystemUserToken({ companyId, scope });
      const status = await getSystemUserTokenStatus(companyId);
      return res.json({ success: true, ...result, ...status });
    } catch (error) {
      console.error("❌ [FB-SYSTEM-USER] clear error:", error.message);
      return res.status(500).json({ success: false, error: "FAILED_TO_CLEAR_TOKEN" });
    }
  },
);

// اختبار: توكن مُرسل للتجربة أو التوكن الفعّال للشركة — هوية السيستم يوزر + صلاحياته
router.post("/test", verifyToken.authenticateToken, async (req, res) => {
  try {
    const providedToken = typeof req.body?.token === "string" ? req.body.token.trim() : null;

    if (providedToken) {
      const validation = await validateSystemUserTokenWithGraph(providedToken);
      return res.json({ success: validation.valid, source: "PROVIDED", ...validation });
    }

    const effective = await resolveEffectiveSystemUserToken(req.user?.companyId);
    if (!effective) {
      return res.json({
        success: false,
        source: "EFFECTIVE",
        valid: false,
        reason: "NO_ACTIVE_SYSTEM_USER_TOKEN",
      });
    }

    const validation = await validateSystemUserTokenWithGraph(effective.token);
    return res.json({
      success: validation.valid,
      source: effective.scope,
      mode: effective.mode,
      ...validation,
    });
  } catch (error) {
    console.error("❌ [FB-SYSTEM-USER] test error:", error.message);
    return res.status(500).json({ success: false, error: "TEST_FAILED" });
  }
});

// الصفحات المتاحة للتوكن الفعّال (الصفحات المخصصة للسيستم يوزر في BM)
router.get("/pages", verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId || null;
    const result = await listPagesForSystemUserToken(companyId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("❌ [FB-SYSTEM-USER] pages error:", error.message);
    return res.status(500).json({ success: false, error: "FAILED_TO_LIST_PAGES" });
  }
});

module.exports = router;
