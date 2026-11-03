/**
 * Shipping Reports Controller (SHIP-W7)
 * Scoped to companyId. Roles: OWNER / COMPANY_ADMIN / OPERATIONS.
 */

const shippingReportsService = require('../services/shippingReportsService');

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

module.exports = {
  getSummary,
  getByGovernorate,
  getByClient,
  getByCourier,
};
