/**
 * Shipping Reports Controller (SHIP-W7 / SHIP-W9)
 * Scoped to companyId. Roles: OWNER / COMPANY_ADMIN / OPERATIONS.
 */

const shippingReportsService = require('../services/shippingReportsService');
const profitService = require('../services/shipping/profitService');

function getCompanyId(req) {
  return req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];
}

async function getSummary(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to } = req.query;
    const report = await shippingReportsService.getSummaryReport(companyId, { from, to });
    return res.json({ success: true, ...report });
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getSummary:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب ملخص تقارير الشحن',
    });
  }
}

async function getByGovernorate(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to } = req.query;
    const report = await shippingReportsService.getByGovernorateReport(companyId, { from, to });
    return res.json({ success: true, ...report });
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getByGovernorate:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب تقرير المحافظات',
    });
  }
}

async function getByClient(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to } = req.query;
    const report = await shippingReportsService.getByClientReport(companyId, { from, to });
    return res.json({ success: true, ...report });
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getByClient:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب تقرير العملاء',
    });
  }
}

async function getByCourier(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to } = req.query;
    const report = await shippingReportsService.getByCourierReport(companyId, { from, to });
    return res.json({ success: true, ...report });
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getByCourier:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب تقرير المناديب',
    });
  }
}

async function getProfitReport(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to, groupBy } = req.query;
    const report = await profitService.getProfitReport({ companyId, from, to, groupBy });
    return res.json(report);
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getProfitReport:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب تقرير أرباح الشحن',
    });
  }
}

async function getUncoveredProfit(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to } = req.query;
    const result = await profitService.getUncoveredProfit({ companyId, from, to });
    return res.json(result);
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getUncoveredProfit:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب الشحنات غير المغطاة بالتكلفة',
    });
  }
}

async function recalcProfit(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to, forceAll } = req.body || {};
    const result = await profitService.recalcForPeriod({
      companyId,
      from,
      to,
      forceAll: Boolean(forceAll)
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in recalcProfit:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر إعادة احتساب تكاليف وهوامش الشحنات',
    });
  }
}


async function getCoverageReport(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to, governorate } = req.query;
    const report = await shippingReportsService.getCoverageReport(companyId, { from, to, governorate });
    return res.json({ success: true, ...report });
  } catch (error) {
    console.error('❌ [SHIPPING-REPORTS] Error in getCoverageReport:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب تقرير تغطية المناديب',
    });
  }
}

module.exports = {
  getSummary,
  getCoverageReport,
  getByGovernorate,
  getByClient,
  getByCourier,
  getProfitReport,
  getUncoveredProfit,
  recalcProfit,
};
