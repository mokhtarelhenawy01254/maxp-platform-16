const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const orderService = require('../../services/orderService');
const { validateOrderForTurbo } = require('../../utils/turbo/shipmentValidator');
const { findOrderByNumber, parseTurboMetadata, buildTurboShipmentSearchKeys, buildTurboUnlinkUpdateData, hasTurboLink, findOrderForTurboLocalAction } = require('./helpers');
const { serializeTurboMetadata } = require('../../utils/turbo/turboMetadata');

const createShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    const replaceExisting = req.body?.replaceExisting === true || req.body?.replaceExisting === 'true';
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(async () => prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, orderItems: { include: { product: true } }, company: { select: { id: true, turboApiKey: true, turboEnabled: true, turboAutoCreate: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    if (!order.company.turboEnabled || !order.company.turboApiKey) return res.status(400).json({ success: false, error: 'Turbo is not enabled or API key is not configured' });
    const existingTurboShipment = Boolean(order.turboShipmentId || order.turboTrackingNumber || order.turboShipmentStatus || order.turboLabelUrl);
    const normalizedTurboStatus = String(order.turboShipmentStatus || '').toLowerCase();
    const isDeliveredTurboShipment = ['delivered', 'completed', '7', '8'].includes(normalizedTurboStatus);
    if (existingTurboShipment && !replaceExisting) return res.status(400).json({ success: false, error: 'Shipment already exists for this order', shipmentId: order.turboShipmentId, trackingNumber: order.turboTrackingNumber });
    if (existingTurboShipment && replaceExisting && isDeliveredTurboShipment) return res.status(400).json({ success: false, error: 'Cannot recreate Turbo shipment after delivery or completion', shipmentId: order.turboShipmentId, trackingNumber: order.turboTrackingNumber, status: order.turboShipmentStatus });
    const previousTurboShipment = existingTurboShipment && replaceExisting ? { shipmentId: order.turboShipmentId || null, trackingNumber: order.turboTrackingNumber || null, status: order.turboShipmentStatus || null, labelUrl: order.turboLabelUrl || null, metadata: parseTurboMetadata(order.turboMetadata), replacedAt: new Date().toISOString() } : null;
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items);
    const validation = validateOrderForTurbo(order, orderData);
    if (!validation.isValid) return res.status(400).json({ success: false, validationError: true, error: validation.message, missingFields: validation.missingFields, suggestions: validation.suggestions, message: validation.message });
    const result = await turboService.createShipment(orderData);
    const baseTurboMetadata = result.data && typeof result.data === 'object' ? { ...result.data } : (result.data ? { result: result.data } : {});
    if (previousTurboShipment) { baseTurboMetadata.previousTurboShipment = previousTurboShipment; baseTurboMetadata.replacedExistingTurboShipment = true; }
    const updateData = { turboShipmentId: String(result.shipmentId || ''), turboTrackingNumber: String(result.trackingNumber || ''), turboShipmentStatus: result.status, turboLabelUrl: result.labelUrl, turboMetadata: Object.keys(baseTurboMetadata).length > 0 ? serializeTurboMetadata(order.turboMetadata, baseTurboMetadata) : serializeTurboMetadata(order.turboMetadata, {}) };
    if (order.tableType === 'GuestOrder') { await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3); }
    else if (order.orderNumber) { await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3); }
    else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: updateData }), 3); }
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { settings: true } });
      if (company?.settings) { const cs = JSON.parse(company.settings); if (cs.turboAutomationEnabled && cs.turboAutomationStatus && cs.turboAutomationStatus !== order.status) { await orderService.updateOrderStatus(order.orderNumber, companyId, cs.turboAutomationStatus, '╪¬╪║┘è┘è╪▒ ╪¬┘ä┘é╪º╪ª┘è ┘ä┘ä╪¡╪º┘ä╪⌐ ╪¿╪╣╪» ╪Ñ┘å╪┤╪º╪í ╪┤╪¡┘å╪⌐ ╪¬╪▒╪¿┘ê ╪¿┘å╪¼╪º╪¡', 'SYSTEM', 'System Automation', null, true); } }
    } catch (autoErr) { console.error('ΓÜá∩╕Å [TURBO-AUTOMATION] Error running turbo automation:', autoErr.message); }
    res.json({ success: true, data: { shipmentId: result.shipmentId, trackingNumber: result.trackingNumber, status: result.status, labelUrl: result.labelUrl, estimatedDelivery: result.estimatedDelivery } });
  } catch (error) {
    console.error('Γ¥î [TURBO-CONTROLLER] Error creating shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create shipment' });
  }
};

const bulkCreateShipments = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à╪╖┘ä┘ê╪¿' });
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) return res.status(400).json({ success: false, error: '┘è╪▒╪¼┘ë ╪¬╪¡╪»┘è╪» ╪╖┘ä╪¿ ┘ê╪º╪¡╪» ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä ┘ä╪Ñ╪▒╪│╪º┘ä┘ç ┘ä╪¬╪▒╪¿┘ê' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    if (!company?.turboEnabled || !company?.turboApiKey) return res.status(400).json({ success: false, error: '╪«╪»┘à╪⌐ ╪┤╪¡┘å ╪¬╪▒╪¿┘ê ╪║┘è╪▒ ┘à┘ü╪╣┘ä╪⌐ ┘ü┘è ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪┤╪▒┘â╪⌐ ╪ú┘ê ┘ä┘à ┘è╪¬┘à ╪Ñ╪»╪«╪º┘ä ┘à┘ü╪¬╪º╪¡ API' });
    const orders = await safeQuery(() => prisma.order.findMany({ where: { OR: [{ orderNumber: { in: orderIds } }, { id: { in: orderIds } }], companyId, turboShipmentId: null }, include: { customer: true, orderItems: { include: { product: true } }, company: { select: { id: true, turboApiKey: true, turboEnabled: true } } }, take: 100 }), 3);
    if (orders.length === 0) return res.status(404).json({ success: false, error: '┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪ú┘è ╪╖┘ä╪¿╪º╪¬ ╪║┘è╪▒ ┘à╪┤╪¡┘ê┘å╪⌐ ╪¿╪¡╪º╪¼╪⌐ ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ┘ä╪¬╪▒╪¿┘ê' });
    const turboService = new TurboService(company.turboApiKey, companyId);
    const results = { success: [], failed: [], skipped: [] };
    for (const order of orders) {
      try {
        if (order.turboShipmentId) { results.skipped.push({ orderNumber: order.orderNumber, reason: '┘è┘ê╪¼╪» ╪┤╪¡┘å╪⌐ ╪¬╪▒╪¿┘ê ┘à╪│╪¼┘ä╪⌐ ╪¿╪º┘ä┘ü╪╣┘ä' }); continue; }
        const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);
        const result = await turboService.createShipment(orderData);
        if (order.orderNumber) { await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentId: String(result.shipmentId || ''), turboTrackingNumber: String(result.trackingNumber || ''), turboShipmentStatus: result.status, turboLabelUrl: result.labelUrl, turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3); }
        else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: { turboShipmentId: String(result.shipmentId || ''), turboTrackingNumber: String(result.trackingNumber || ''), turboShipmentStatus: result.status, turboLabelUrl: result.labelUrl, turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3); }
        results.success.push({ orderNumber: order.orderNumber, shipmentId: result.shipmentId, trackingNumber: result.trackingNumber });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.failed.push({ orderNumber: order.orderNumber, error: turboService.translateTurboErrorToArabic(error.message) });
      }
    }
    res.json({ success: true, data: { total: orders.length, success: results.success.length, failed: results.failed.length, skipped: results.skipped.length, results } });
  } catch (error) {
    console.error('Γ¥î [TURBO-CONTROLLER] Error in bulk create shipments:', error);
    const turboService = new TurboService('dummy');
    res.status(500).json({ success: false, error: turboService.translateTurboErrorToArabic(error.message) });
  }
};

const cancelShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    const shipmentSearchKeys = buildTurboShipmentSearchKeys(order);
    if (shipmentSearchKeys.length === 0) return res.status(400).json({ success: false, error: 'No shipment found for this order' });
    if (!order.company?.turboApiKey) return res.status(400).json({ success: false, error: 'Turbo API key is not configured for this company' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const result = await turboService.cancelShipment(shipmentSearchKeys, reason);
    if (order.tableType === 'GuestOrder') { await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3); }
    else if (order.orderNumber) { await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3); }
    else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3); }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Γ¥î [TURBO-CONTROLLER] Error cancelling shipment:', error);
    let statusCode = 500, errorMessage = error.message || 'Failed to cancel shipment', arabicMessage = '┘ü╪┤┘ä ┘ü┘è ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪┤╪¡┘å╪⌐';
    if (error.message) {
      if (error.message.includes('Invalid authentication key')) { arabicMessage = '┘à┘ü╪¬╪º╪¡ API ╪º┘ä╪«╪º╪╡ ╪¿┘Ç Turbo ╪║┘è╪▒ ╪╡╪¡┘è╪¡ ╪ú┘ê ┘à┘å╪¬┘ç┘è ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐'; statusCode = 401; }
      else if (error.message.includes('┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪¬╪¿┘ä╪║ ╪╣┘ä┘ë ╪º┘ä╪º┘ä╪║╪º╪í')) { arabicMessage = '┘ä╪º ┘è┘à┘â┘å ╪Ñ┘ä╪║╪º╪í ┘ç╪░┘ç ╪º┘ä╪┤╪¡┘å╪⌐ - ┘é╪» ╪¬┘â┘ê┘å ┘ü┘è ╪¡╪º┘ä╪⌐ ┘à╪¬┘é╪»┘à╪⌐'; statusCode = 400; }
      else if (error.message.includes('government not found')) { arabicMessage = '╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐ ┘ü┘è Turbo API'; statusCode = 400; }
      else if (/shipments?\s+not\s+found/i.test(error.message)) { arabicMessage = '╪¬╪╣╪░╪▒ ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪º┘ä╪┤╪¡┘å╪⌐ ╪»╪º╪«┘ä Turbo'; statusCode = 404; }
      else if (error.message.includes('Turbo API error')) { statusCode = 400; const m = error.message.match(/Turbo API error: (.+)/); if (m?.[1]) arabicMessage = m[1]; }
      else if (error.message.includes('Turbo API key is not configured')) { arabicMessage = '┘à┘ü╪¬╪º╪¡ API ╪º┘ä╪«╪º╪╡ ╪¿┘Ç Turbo ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»'; statusCode = 400; }
    }
    res.status(statusCode).json({ success: false, error: errorMessage, message: arabicMessage });
  }
};

const unlinkShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    const order = await findOrderForTurboLocalAction(orderId, companyId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    if (!hasTurboLink(order)) return res.status(400).json({ success: false, error: 'No Turbo shipment link found for this order', message: '┘ä╪º ┘è┘ê╪¼╪» ╪▒╪¿╪╖ Turbo ┘à╪¡┘ü┘ê╪╕ ┘ä┘ç╪░╪º ╪º┘ä╪╖┘ä╪¿' });
    if (order.tableType === 'GuestOrder') { await safeQuery(() => prisma.guestOrder.updateMany({ where: order.orderNumber ? { orderNumber: order.orderNumber, companyId } : { id: order.id, companyId }, data: buildTurboUnlinkUpdateData(false) }), 3); }
    else if (order.orderNumber) { await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: buildTurboUnlinkUpdateData(true) }), 3); }
    else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: buildTurboUnlinkUpdateData(true) }), 3); }
    res.json({ success: true, message: '╪¬┘à ╪Ñ┘ä╪║╪º╪í ╪▒╪¿╪╖ Turbo ┘à┘å ╪º┘ä╪╖┘ä╪¿ ╪¿┘å╪¼╪º╪¡', data: { orderId: order.id, orderNumber: order.orderNumber, turboShipmentId: null, turboTrackingNumber: null, turboShipmentStatus: null, turboLabelUrl: null, turboMetadata: null, turboBranchId: null } });
  } catch (error) {
    console.error('Γ¥î [TURBO-CONTROLLER] Error unlinking shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to unlink Turbo shipment', message: '┘ü╪┤┘ä ┘ü┘è ╪Ñ┘ä╪║╪º╪í ╪▒╪¿╪╖ Turbo ┘à┘å ╪º┘ä╪╖┘ä╪¿' });
  }
};

const updateShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, orderItems: { include: { product: true } }, company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    const shipmentCode = order.turboShipmentId || order.turboTrackingNumber;
    if (!shipmentCode) return res.status(400).json({ success: false, error: '┘ä┘à ┘è╪¬┘à ╪Ñ┘è╪¼╪º╪» ┘â┘ê╪» ╪┤╪¡┘å╪⌐ ╪¬╪▒╪¿┘ê ┘ä┘ç╪░╪º ╪º┘ä╪╖┘ä╪¿' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items);
    const result = await turboService.updateShipment(shipmentCode, orderData);
    res.json({ success: true, data: result, message: '╪¬┘à ╪¬╪¡╪»┘è╪½ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪┤╪¡┘å╪⌐ ┘ü┘è ╪¬╪▒╪¿┘ê ╪¿┘å╪¼╪º╪¡' });
  } catch (error) {
    console.error('Γ¥î [TURBO-CONTROLLER] Error updating shipment:', error);
    let arabicError = error.message || '┘ü╪┤┘ä ╪¬╪¡╪»┘è╪½ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪┤╪¡┘å╪⌐ ┘ü┘è ╪¬╪▒╪¿┘ê';
    try { const ts = new TurboService('', ''); arabicError = ts.translateTurboErrorToArabic(error.message); } catch (_) {}
    res.status(400).json({ success: false, error: arabicError, message: arabicError });
  }
};

const updateShipmentLegacy = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updateData = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    if (!order.turboShipmentId) return res.status(400).json({ success: false, error: 'No shipment found for this order' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const result = await turboService.updateShipment(order.turboShipmentId, updateData);
    const orderUpdateData = {};
    if (updateData.address) orderUpdateData.shippingAddress = updateData.address;
    if (updateData.city) orderUpdateData.city = updateData.city;
    if (updateData.phone) orderUpdateData.customerPhone = updateData.phone;
    if (updateData.name) orderUpdateData.customerName = updateData.name;
    if (Object.keys(orderUpdateData).length > 0) {
      if (order.orderNumber) await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: orderUpdateData }), 3);
      else if (order.id) await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: orderUpdateData }), 3);
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Γ¥î [TURBO-CONTROLLER] Error updating shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update shipment' });
  }
};

module.exports = { createShipment, bulkCreateShipments, cancelShipment, unlinkShipment, updateShipment, updateShipmentLegacy };
