const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const { findOrderByNumber } = require('./helpers');

const calculateShippingCost = async (req, res) => {
  try {
    const { city, governorate, address, weight, length, width, height, orderId } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    if (!company?.turboEnabled || !company?.turboApiKey) return res.status(400).json({ success: false, error: 'Turbo is not enabled or API key is not configured' });
    const turboService = new TurboService(company.turboApiKey, companyId);
    const result = await turboService.calculateShippingCost({ city, governorate, address }, weight || 1, length && width && height ? { length, width, height } : null);
    let cost = result.success ? result.cost : null;
    if (!cost && orderId) { try { const o = await findOrderByNumber(orderId, companyId); if (o) cost = parseFloat(o.shippingCost || o.shipping || 70); } catch (_e) {} }
    if (!cost) cost = 70;
    if (orderId && cost) {
      try {
        const order = await findOrderByNumber(orderId, companyId);
        if (order) {
          let metadata = {};
          try { metadata = order.turboMetadata ? JSON.parse(order.turboMetadata) : {}; } catch (e) { metadata = {}; }
          metadata.actualShippingCost = cost;
          metadata.actualShippingCostCalculatedAt = new Date().toISOString();
          if (order.orderNumber) await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboMetadata: JSON.stringify(metadata) } }), 3);
          else if (order.id) await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: { turboMetadata: JSON.stringify(metadata) } }), 3);
        }
      } catch (saveError) { console.error('❌ [TURBO-CONTROLLER] Error saving actual shipping cost:', saveError); }
    }
    res.json({ success: true, data: { success: true, cost, price: cost, currency: 'EGP' } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error calculating shipping cost:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to calculate shipping cost' });
  }
};

const getShippingComparison = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    let actualCost = 0;
    try { if (order.turboMetadata) { const meta = JSON.parse(order.turboMetadata); actualCost = parseFloat(meta.actualShippingCost || 0); } } catch (e) {}
    const customerCost = parseFloat(order.shipping || 0);
    const difference = actualCost - customerCost;
    res.json({ success: true, data: { actualCost, customerCost, difference, orderId: order.id, orderNumber: order.orderNumber, currency: order.currency || 'EGP' } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting shipping comparison:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get shipping comparison' });
  }
};

module.exports = { calculateShippingCost, getShippingComparison };
