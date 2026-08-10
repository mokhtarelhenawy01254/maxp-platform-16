const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const { findOrderByNumber } = require('./helpers');

const trackShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    if (!order.turboTrackingNumber) return res.status(400).json({ success: false, error: 'No tracking number found for this order' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const statusResult = await turboService.fetchAllStatuses();
    if (!statusResult?.success || !statusResult.shipments.length) return res.status(400).json({ success: false, error: 'Tracking not available', message: 'لا توجد بيانات تتبع متاحة من Turbo في آخر 30 يوم' });
    const key = order.turboShipmentId || order.turboTrackingNumber;
    const matched = statusResult.shipments.find(s => s.code === key || s.barCode === key);
    if (!matched) return res.status(404).json({ success: false, error: 'Shipment not found in Turbo', message: 'لم يتم العثور على الشحنة في نظام Turbo خلال آخر 30 يوم' });
    if (matched.internalStatus !== order.turboShipmentStatus) {
      const upd = { turboShipmentStatus: matched.internalStatus, turboMetadata: JSON.stringify(matched.raw || matched), updatedAt: new Date() };
      let trackedStatus = null;
      if (matched.internalStatus === 'delivered') { upd.status = 'DELIVERED'; upd.paymentStatus = 'COMPLETED'; trackedStatus = 'DELIVERED'; }
      else if (matched.internalStatus === 'cancelled') { upd.status = 'CANCELLED'; trackedStatus = 'CANCELLED'; }
      else if (matched.internalStatus === 'returned') { upd.status = 'RETURNED'; trackedStatus = 'RETURNED'; }

      // 🚨 PRODUCTION-FIX (turbo-notification-gap): نفس مشكلة turboStatusSyncService —
      // trackShipment كان بيعدّل status مباشرة من غير إشعار. مرّر التغيير عبر
      // orderService.updateOrderStatus (history + إشعار + side-effects) قبل التحديث المباشر.
      if (trackedStatus && trackedStatus !== order.status && !order.tableType) {
        try {
          const orderService = require('../../services/orderService');
          await orderService.updateOrderStatus(
            order.orderNumber,
            companyId,
            trackedStatus,
            `تحديث تلقائي من تتبع تربو (${matched.internalStatus})`,
            'SYSTEM',
            'Turbo Tracking',
            null,
            true,
            { skipCallAttemptGuard: true, skipTransitionValidation: true }
          );
          console.log(`✅ [TURBO-TRACK] Order ${order.orderNumber} status -> ${trackedStatus} via orderService (notification + history).`);
        } catch (trackErr) {
          console.warn(`⚠️ [TURBO-TRACK] Status update via orderService failed for ${order.orderNumber}:`, trackErr.message);
        }
      }

      if (order.orderNumber) await prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: upd });
      else if (order.id) await prisma.order.update({ where: { id: order.id }, data: upd });
    }
    res.json({ success: true, data: matched });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error tracking shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to track shipment' });
  }
};

const syncShipmentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    const shipmentCode = order.turboShipmentId || order.turboTrackingNumber;
    if (!shipmentCode) return res.status(400).json({ success: false, error: 'لم يتم إيجاد كود شحنة تربو لهذا الطلب' });
    if (!order.company?.turboApiKey) return res.status(400).json({ success: false, error: 'مفتاح API الخاص بشركة تربو غير مضبوط للشركة' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    let matched = null;
    try {
      const searchResult = await turboService.trackShipment(shipmentCode);
      if (searchResult?.success && searchResult.data) {
        matched = { code: shipmentCode, status: searchResult.data.status || searchResult.data.status_text || 'created', statusCode: searchResult.data.status_code || null, internalStatus: searchResult.data.status || searchResult.data.status_text || 'created', raw: searchResult.data };
      }
    } catch (searchErr) { console.warn(`⚠️ [TURBO-SYNC] search-order failed for ${shipmentCode}:`, searchErr.message); }
    if (!matched) {
      const statusResult = await turboService.fetchAllStatuses();
      if (!statusResult?.success || !statusResult.shipments?.length) return res.status(400).json({ success: false, error: 'لم يتم العثور على بيانات تتبع من تربو في آخر 90 يوماً' });
      const targetKeys = new Set([shipmentCode, order.turboShipmentId, order.turboTrackingNumber, order.orderNumber, order.id].filter(Boolean).map(k => String(k).trim().toLowerCase()));
      matched = statusResult.shipments.find(s => { const sC = String(s.code || '').trim().toLowerCase(); const sB = String(s.barCode || s.bar_code || '').trim().toLowerCase(); const sI = String(s.invoice_number || s.invoiceNumber || '').trim().toLowerCase(); const sR = String(s.remote_order_id || s.remoteOrderId || '').trim().toLowerCase(); return targetKeys.has(sC) || targetKeys.has(sB) || targetKeys.has(sI) || targetKeys.has(sR); }) || null;
    }
    const finalStatus = matched ? (matched.internalStatus || matched.status) : (order.turboShipmentStatus || 'created');
    const finalRaw = matched ? (matched.raw || matched) : { code: shipmentCode, status: finalStatus };
    const turboStatusSyncService = require('../../services/turboStatusSyncService');
    const syncResult = await turboStatusSyncService.syncTurboStatusToOrder({ orderId: order.id, orderNumber: order.orderNumber, companyId, rawStatus: finalStatus, payload: finalRaw, isGuestOrder: order.tableType === 'GuestOrder' });
    res.json({ success: true, message: matched ? (matched.status || matched.internalStatus) : (order.turboShipmentStatus || 'غير مكتملة'), data: { status: finalStatus, turboShipmentStatus: finalStatus, orderStatus: syncResult?.order?.status || order.status, systemStatus: syncResult?.order?.status || order.status, currentLocation: matched ? (matched.currentLocation || matched.raw?.location) : 'في انتظاري التسليم لتربو', branch: matched ? (matched.raw?.expected_branch || matched.branch) : null, raw: finalRaw } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error syncing shipment status:', error);
    res.status(500).json({ success: false, error: error.message || 'فشل سحب ومزامنة حالة الشحنة من تربو' });
  }
};

module.exports = { trackShipment, syncShipmentStatus };
