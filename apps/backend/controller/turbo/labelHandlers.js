const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const { findOrderByNumber } = require('./helpers');
const { normalizeGuestShippingAddress } = require('../../utils/turbo/addressParser');
const { generateWaybillHTML } = require('./waybillTemplate');

const printLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    if (!order.turboShipmentId) return res.status(400).json({ success: false, error: 'No shipment found for this order' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const result = await turboService.printLabel(order.turboShipmentId);
    if (result.labelUrl) {
      if (order.orderNumber) await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboLabelUrl: result.labelUrl } }), 3);
      else if (order.id) await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: { turboLabelUrl: result.labelUrl } }), 3);
    }
    if (result.labelPdf) { res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="label-${order.orderNumber}.pdf"`); res.send(Buffer.from(result.labelPdf, 'base64')); }
    else if (result.labelUrl) res.json({ success: true, data: { labelUrl: result.labelUrl } });
    else res.status(500).json({ success: false, error: 'Failed to generate label' });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error printing label:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to print label' });
  }
};

const printWaybill = async (req, res) => {
  try {
    const { orderId } = req.params;
    const prisma = getSharedPrismaClient();
    let order = null;
    if (String(orderId).startsWith('ORD-')) {
      order = await safeQuery(() => prisma.order.findFirst({ where: { orderNumber: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } }, customer: true, orderItems: { include: { product: true } } } }), 3);
      if (!order) {
        const guestOrder = await safeQuery(() => prisma.guestOrder.findFirst({ where: { orderNumber: orderId } }), 3);
        if (guestOrder) {
          let items = guestOrder.items || [];
          if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = []; } }
          const sad = normalizeGuestShippingAddress(guestOrder.shippingAddress);
          const company = await safeQuery(() => prisma.company.findUnique({ where: { id: guestOrder.companyId }, select: { id: true, turboApiKey: true, turboEnabled: true } }), 2);
          order = { id: guestOrder.id, orderNumber: guestOrder.orderNumber, companyId: guestOrder.companyId, customerName: guestOrder.guestName || '', customerPhone: guestOrder.guestPhone || '', customerEmail: guestOrder.guestEmail || '', customerAddress: sad.customerAddress, shippingAddress: sad.rawShippingAddress, city: sad.city, total: parseFloat(guestOrder.total || 0), subtotal: parseFloat(guestOrder.subtotal || 0), shipping: parseFloat(guestOrder.shipping || 0), turboShipmentId: guestOrder.turboShipmentId, turboTrackingNumber: guestOrder.turboTrackingNumber, turboShipmentStatus: guestOrder.turboShipmentStatus, notes: guestOrder.notes || '', orderItems: items.map(i => ({ productName: i.name || i.productName || '', quantity: i.quantity || 1, price: parseFloat(i.price || 0), total: parseFloat(i.total || 0) })), items, customer: { firstName: guestOrder.guestName?.split(' ')[0] || '', phone: guestOrder.guestPhone || '' }, company };
        }
      }
    } else {
      order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } }, customer: true, orderItems: { include: { product: true } } } }), 3);
    }
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    const turboService = new TurboService(order.company?.turboApiKey || null, order.companyId);
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items || []);
    const shipmentId = order.turboShipmentId || order.turboTrackingNumber || order.orderNumber;
    const result = await turboService.printWaybill(shipmentId, orderData);
    if (result.waybillPdf) { const buf = Buffer.from(result.waybillPdf, 'base64'); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="waybill-${order.orderNumber || orderId}.pdf"`); res.setHeader('Content-Length', buf.length); return res.send(buf); }
    const waybillData = result.waybillData || result;
    if (req.headers.accept?.includes('application/pdf')) return res.status(404).json({ success: false, error: 'البوليصة غير متوفرة بصيغة PDF' });
    if (req.query.format === 'html' || req.headers.accept?.includes('text/html')) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.send(generateWaybillHTML(waybillData)); }
    res.json({ success: true, message: 'تم جلب بيانات البوليصة', data: { waybillData, fromApi: result.fromApi || false } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error printing waybill:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to print waybill' });
  }
};

module.exports = { printLabel, printWaybill };
