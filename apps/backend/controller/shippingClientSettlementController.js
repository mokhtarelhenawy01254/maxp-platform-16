/**
 * Shipping Client Settlements Controller (SHIP-W5)
 * Self-service statements and COD settlements for shipping clients (merchants).
 * STRICT LAW: Zero internal cost fields in response (isClient: true).
 */

const settlementService = require('../services/shipping/settlementService');

async function listSettlements(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const { status, from, to, page, limit } = req.query;

    const result = await settlementService.list({
      companyId,
      merchantId, // strictly scoped to client's merchantId
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    // Strip any internal company fields from settlements list
    const sanitizedSettlements = (result.settlements || []).map((s) => ({
      id: s.id,
      settlementNumber: s.settlementNumber,
      status: s.status,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      totalShipments: s.totalShipments,
      deliveredCount: s.deliveredCount,
      returnedCount: s.returnedCount,
      grossCOD: Number(s.grossCOD),
      shippingFeesTotal: Number(s.shippingFeesTotal),
      codFeesTotal: Number(s.codFeesTotal),
      returnFeesTotal: Number(s.returnFeesTotal),
      netPayout: Number(s.netPayout),
      paymentMethod: s.paymentMethod,
      paymentReference: s.paymentReference,
      paidAt: s.paidAt,
      createdAt: s.createdAt,
    }));

    return res.json({
      success: true,
      settlements: sanitizedSettlements,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[ShippingClientSettlement] list error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب قائمة التسويات',
    });
  }
}

async function getSettlementById(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const { id } = req.params;

    // getById throws 404 if merchantId does not match (Strict Tenant Isolation)
    const settlement = await settlementService.getById(id, {
      companyId,
      merchantId,
      isClient: true, // Forces zero internal cost lines
    });

    // Client-safe sanitized payload
    const sanitized = {
      id: settlement.id,
      settlementNumber: settlement.settlementNumber,
      status: settlement.status,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      totalShipments: settlement.totalShipments,
      deliveredCount: settlement.deliveredCount,
      returnedCount: settlement.returnedCount,
      grossCOD: Number(settlement.grossCOD),
      shippingFeesTotal: Number(settlement.shippingFeesTotal),
      codFeesTotal: Number(settlement.codFeesTotal),
      returnFeesTotal: Number(settlement.returnFeesTotal),
      netPayout: Number(settlement.netPayout),
      paymentMethod: settlement.paymentMethod,
      paymentReference: settlement.paymentReference,
      paidAt: settlement.paidAt,
      createdAt: settlement.createdAt,
      lines: settlement.lines,
    };

    return res.json({ success: true, data: sanitized });
  } catch (error) {
    console.error('[ShippingClientSettlement] getById error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب تفاصيل الكشف',
    });
  }
}

async function exportSettlementCsv(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const { id } = req.params;

    const { filename, csv } = await settlementService.exportCsv(id, {
      companyId,
      merchantId,
      isClient: true,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('[ShippingClientSettlement] export error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تصدير كشف التسوية',
    });
  }
}

module.exports = {
  listSettlements,
  getSettlementById,
  exportSettlementCsv,
};
