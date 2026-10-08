const { getSharedPrismaClient } = require('../services/sharedDatabase');
const customerBlocklistService = require('../services/customerBlocklistService');
const orderRiskScoringService = require('../services/orderRiskScoringService');

function getCompanyId(req) {
  return req.user?.effectiveCompanyId || req.user?.companyId;
}

function getActor(req) {
  const name = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim();
  return {
    id: req.user?.id || null,
    email: req.user?.email || null,
    name: name || req.user?.email || null,
  };
}

function requireCompany(req, res) {
  const companyId = getCompanyId(req);
  if (!companyId) {
    res.status(403).json({
      success: false,
      message: 'معرف الشركة مطلوب',
      code: 'COMPANY_ID_REQUIRED',
    });
    return null;
  }
  return companyId;
}

async function getSettings(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const settings = await customerBlocklistService.getSettings(
      getSharedPrismaClient(),
      companyId,
    );
    const riskScoring = await orderRiskScoringService.getSettings(
      getSharedPrismaClient(),
      companyId,
    );

    res.json({
      success: true,
      data: settings,
      riskScoring,
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] getSettings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الحظر',
      error: error.message,
    });
  }
}

async function updateSettings(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const settings = await customerBlocklistService.upsertSettings(
      getSharedPrismaClient(),
      companyId,
      req.body || {},
    );

    let riskScoring = null;
    if (req.body && typeof req.body.riskScoring === 'object' && req.body.riskScoring !== null) {
      riskScoring = await orderRiskScoringService.saveSettings(
        getSharedPrismaClient(),
        companyId,
        req.body.riskScoring,
      );
    }

    res.json({
      success: true,
      data: settings,
      riskScoring: riskScoring || (await orderRiskScoringService.getSettings(getSharedPrismaClient(), companyId)),
      message: 'تم حفظ إعدادات الحظر بنجاح',
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] updateSettings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات الحظر',
      error: error.message,
    });
  }
}

/**
 * تقرير «سكور الطلبات الوهمية» — أعداد حسب المستوى + قيمة الطلبات عالية الخطورة
 * من جدول order_risk_scores (بيانات فعلية محسوبة عند الإنشاء).
 */
async function getRiskReport(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const summary = await orderRiskScoringService.riskReport(
      getSharedPrismaClient(),
      companyId,
      days,
    );

    res.json({
      success: true,
      data: { days, ...summary },
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] getRiskReport:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تقرير سكور الطلبات',
      error: error.message,
    });
  }
}

async function listRules(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const result = await customerBlocklistService.listRules(
      getSharedPrismaClient(),
      companyId,
      req.query || {},
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] listRules:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب قائمة الحظر',
      error: error.message,
    });
  }
}

async function createRule(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const result = await customerBlocklistService.createRule(
      getSharedPrismaClient(),
      companyId,
      req.body || {},
      getActor(req),
    );

    res.status(result.created ? 201 : 200).json({
      success: true,
      ...result,
      message: result.created ? 'تم حظر العميل بنجاح' : 'تم تحديث حظر العميل بنجاح',
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] createRule:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في حظر العميل',
    });
  }
}

async function liftRule(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const rule = await customerBlocklistService.liftRule(
      getSharedPrismaClient(),
      companyId,
      req.params.ruleId,
      req.body || {},
      getActor(req),
    );

    res.json({
      success: true,
      data: rule,
      message: 'تم فك الحظر بنجاح',
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] liftRule:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في فك الحظر',
    });
  }
}

async function checkRule(req, res) {
  try {
    const companyId = requireCompany(req, res);
    if (!companyId) return;

    const evaluation = await customerBlocklistService.evaluateCustomerBlock(
      getSharedPrismaClient(),
      {
        companyId,
        customerId: req.body?.customerId || req.query?.customerId,
        phone: req.body?.phone || req.query?.phone,
        email: req.body?.email || req.query?.email,
        facebookId: req.body?.facebookId || req.query?.facebookId,
        whatsappId: req.body?.whatsappId || req.query?.whatsappId,
        source: req.body?.source || req.query?.source || 'manual',
        userRole: req.user?.role,
        paymentMethod: req.body?.paymentMethod || req.query?.paymentMethod,
        allowOverride: req.body?.allowOverride === true || req.query?.allowOverride === 'true',
      },
    );

    res.json({
      success: true,
      data: evaluation.payload || {
        blocked: false,
      },
    });
  } catch (error) {
    console.error('❌ [CUSTOMER-BLOCKLIST] checkRule:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في التحقق من حالة الحظر',
      error: error.message,
    });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  listRules,
  createRule,
  liftRule,
  checkRule,
  getRiskReport,
};
