const facebookAdsBudgetAlertService = require("../services/facebookAdsBudgetAlertService");

function getCompanyId(req) {
  return req.user?.companyId;
}

function sendError(res, error, fallbackMessage = "حدث خطأ في تنبيهات الإعلانات") {
  console.error("❌ [ADS-BUDGET-ALERT]", error);
  res.status(400).json({
    success: false,
    error: error.message || fallbackMessage,
  });
}

async function listRules(req, res) {
  try {
    const companyId = getCompanyId(req);
    const rules = await facebookAdsBudgetAlertService.listRules(companyId);
    res.json({ success: true, data: rules });
  } catch (error) {
    sendError(res, error);
  }
}

async function createRule(req, res) {
  try {
    const companyId = getCompanyId(req);
    const rule = await facebookAdsBudgetAlertService.createRule(companyId, req.body);
    res.status(201).json({
      success: true,
      data: rule,
      message: "تم إنشاء تنبيه رصيد الإعلانات",
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateRule(req, res) {
  try {
    const companyId = getCompanyId(req);
    const rule = await facebookAdsBudgetAlertService.updateRule(
      companyId,
      req.params.id,
      req.body,
    );
    res.json({
      success: true,
      data: rule,
      message: "تم تحديث تنبيه رصيد الإعلانات",
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteRule(req, res) {
  try {
    const companyId = getCompanyId(req);
    await facebookAdsBudgetAlertService.deleteRule(companyId, req.params.id);
    res.json({
      success: true,
      message: "تم حذف تنبيه رصيد الإعلانات",
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function testRule(req, res) {
  try {
    const companyId = getCompanyId(req);
    const result = await facebookAdsBudgetAlertService.runRuleById(
      companyId,
      req.params.id,
      { force: true },
    );
    res.json({
      success: result.delivery?.success || result.delivered || false,
      data: result,
      message: result.delivery?.success
        ? "تم إرسال رسالة اختبار WhatsApp"
        : "تمت محاولة إرسال الاختبار، راجع تفاصيل النتيجة",
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function runRulesNow(req, res) {
  try {
    const companyId = getCompanyId(req);
    const result = await facebookAdsBudgetAlertService.runDueRules({
      companyId,
      limit: req.body?.limit || 50,
    });
    res.json({
      success: true,
      data: result,
      message: "تم فحص تنبيهات رصيد الإعلانات",
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function previewRule(req, res) {
  try {
    const companyId = getCompanyId(req);
    const preview = await facebookAdsBudgetAlertService.previewRule(
      companyId,
      req.body,
    );
    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function listLogs(req, res) {
  try {
    const companyId = getCompanyId(req);
    const logs = await facebookAdsBudgetAlertService.listLogs(
      companyId,
      req.query.limit,
    );
    res.json({ success: true, data: logs });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  testRule,
  runRulesNow,
  previewRule,
  listLogs,
};
