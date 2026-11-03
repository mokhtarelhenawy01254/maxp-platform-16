/**
 * Shipping Portal Settlements Controller (SHIP-W5)
 * Handles operations/admin endpoints for COD settlements and merchant statements
 */

const settlementService = require('../services/shipping/settlementService');

async function listSettlements(req, res) {
  try {
    const { companyId } = req.user;
    const { merchantId, status, from, to, page, limit } = req.query;

    const result = await settlementService.list({
      companyId,
      merchantId: merchantId || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ShippingSettlementPortal] list error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب قائمة التسويات',
    });
  }
}

async function previewSettlement(req, res) {
  try {
    const { companyId } = req.user;
    const { merchantId, from, to } = req.body;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل (merchantId) مطلوب لاحتساب المعاينة',
      });
    }

    const previewData = await settlementService.preview({
      companyId,
      merchantId,
      from,
      to,
    });

    return res.json({ success: true, data: previewData });
  } catch (error) {
    console.error('[ShippingSettlementPortal] preview error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء احتساب معاينة التسوية',
    });
  }
}

async function createSettlement(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { merchantId, from, to, periodStart, periodEnd, shipmentIds, notes } = req.body;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل (merchantId) مطلوب لإنشاء الكشف',
      });
    }

    const created = await settlementService.issue({
      companyId,
      merchantId,
      from,
      to,
      periodStart,
      periodEnd,
      shipmentIds,
      userId,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء كشف التسوية بنجاح',
      data: created,
    });
  } catch (error) {
    console.error('[ShippingSettlementPortal] create error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء كشف التسوية',
    });
  }
}

async function getSettlementById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const settlement = await settlementService.getById(id, {
      companyId,
      isClient: false,
    });

    return res.json({ success: true, data: settlement });
  } catch (error) {
    console.error('[ShippingSettlementPortal] getById error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب تفاصيل الكشف',
    });
  }
}

async function approveSettlement(req, res) {
  try {
    const { companyId, firstName, lastName } = req.user;
    const { id } = req.params;
    const approvedBy = req.body?.approvedBy || `${firstName || ''} ${lastName || ''}`.trim() || 'ADMIN';

    const approved = await settlementService.approve(id, {
      companyId,
      approvedBy,
    });

    return res.json({
      success: true,
      message: 'تم اعتماد كشف التسوية بنجاح',
      data: approved,
    });
  } catch (error) {
    console.error('[ShippingSettlementPortal] approve error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء اعتماد كشف التسوية',
    });
  }
}

async function paySettlement(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const { method, reference, treasuryAccountId } = req.body || {};

    const paid = await settlementService.pay(id, {
      companyId,
      method,
      reference,
      treasuryAccountId,
      userId,
    });

    return res.json({
      success: true,
      message: 'تم تسجيل توريد وصرف كشف التسوية بنجاح',
      data: paid,
    });
  } catch (error) {
    console.error('[ShippingSettlementPortal] pay error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء صرف وتسجيل توريد الكشف',
    });
  }
}

async function rejectSettlement(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const rejected = await settlementService.reject(id, {
      companyId,
      reason,
      userId,
    });

    return res.json({
      success: true,
      message: 'تم رفض كشف التسوية',
      data: rejected,
    });
  } catch (error) {
    console.error('[ShippingSettlementPortal] reject error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء رفض كشف التسوية',
    });
  }
}

async function exportSettlementCsv(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const { filename, csv } = await settlementService.exportCsv(id, {
      companyId,
      isClient: false,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('[ShippingSettlementPortal] export error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تصدير كشف التسوية',
    });
  }
}

module.exports = {
  listSettlements,
  previewSettlement,
  createSettlement,
  getSettlementById,
  approveSettlement,
  paySettlement,
  rejectSettlement,
  exportSettlementCsv,
};
