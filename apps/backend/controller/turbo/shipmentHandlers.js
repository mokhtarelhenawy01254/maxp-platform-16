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
    if (!order) order = await safeQuery(async () => prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, orderItems: { include: { product: true, productVariant: true } }, company: { select: { id: true, turboApiKey: true, turboEnabled: true, turboAutoCreate: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    let turboApiKey = order.company?.turboApiKey;
    let turboEnabled = order.company?.turboEnabled;
    if (!turboEnabled || !turboApiKey) {
      const turboCarrier = await prisma.shippingCompany.findFirst({
        where: { companyId, providerKey: 'TURBO', isActive: true },
      });
      if (turboCarrier && turboCarrier.apiKey) {
        turboApiKey = turboCarrier.apiKey;
        turboEnabled = true;
        await prisma.company.update({
          where: { id: companyId },
          data: { turboApiKey, turboEnabled: true },
        }).catch(() => {});
      }
    }

    if (!turboEnabled || !turboApiKey) return res.status(400).json({ success: false, error: 'Turbo is not enabled or API key is not configured' });

    // 🛡️ منع شحن الطلبات المكررة، الملغاة، أو المرتجعة
    const invalidStatuses = ['DUPLICATE_ORDER', 'CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'];
    if (invalidStatuses.includes(String(order.status || '').toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ORDER_STATUS_FOR_SHIPPING',
        error: `لا يمكن شحن هذا الطلب لتربو لأن حالته هي: ${order.status}`,
        orderStatus: order.status
      });
    }

    // 🛡️ منع شحن الطلب إذا كان بانتظار اعتماد الخصم
    const orderMetadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata || '{}') : (order.metadata || {});
    if (orderMetadata.discountApprovalStatus === 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        code: 'DISCOUNT_APPROVAL_PENDING',
        error: 'لا يمكن شحن هذا الطلب لتربو قبل اعتماد الخصم من قِبل الإدارة أو إلغائه'
      });
    }

    // 🛡️ التحقق من وجود شحنة نشطة سابقة لنفس العميل خلال آخر 48 ساعة
    const forceDuplicate = req.body?.forceDuplicateShipping === true || req.body?.forceDuplicateShipping === 'true';
    if (!forceDuplicate) {
      const activeExisting = await orderService.checkDuplicateActiveTurboShipment(companyId, order);
      if (activeExisting) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_ACTIVE_SHIPMENT',
          error: `تنبيه: العميل لديه بالفعل شحنة نشطة لتربو (بوليصة #${activeExisting.turboShipmentId} - أوردر #${activeExisting.orderNumber}) تم إنشاؤها بتاريخ ${new Date(activeExisting.createdAt).toLocaleDateString('ar-EG')}. لتأكيد الشحن على أي حال أرسل forceDuplicateShipping.`,
          existingShipment: activeExisting
        });
      }
    }

    const existingTurboShipment = Boolean(order.turboShipmentId || order.turboTrackingNumber || order.turboShipmentStatus || order.turboLabelUrl);
    const normalizedTurboStatus = String(order.turboShipmentStatus || '').toLowerCase();
    const isDeliveredTurboShipment = ['delivered', 'completed', '7', '8'].includes(normalizedTurboStatus);
    if (existingTurboShipment && !replaceExisting) return res.status(400).json({ success: false, error: 'Shipment already exists for this order', shipmentId: order.turboShipmentId, trackingNumber: order.turboTrackingNumber });
    if (existingTurboShipment && replaceExisting && isDeliveredTurboShipment) return res.status(400).json({ success: false, error: 'Cannot recreate Turbo shipment after delivery or completion', shipmentId: order.turboShipmentId, trackingNumber: order.turboTrackingNumber, status: order.turboShipmentStatus });
    const previousTurboShipment = existingTurboShipment && replaceExisting ? { shipmentId: order.turboShipmentId || null, trackingNumber: order.turboTrackingNumber || null, status: order.turboShipmentStatus || null, labelUrl: order.turboLabelUrl || null, metadata: parseTurboMetadata(order.turboMetadata), replacedAt: new Date().toISOString() } : null;
    const turboService = new TurboService(turboApiKey, companyId);
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items);
    const validation = validateOrderForTurbo(order, orderData);
    if (!validation.isValid) return res.status(400).json({ success: false, validationError: true, error: validation.message, missingFields: validation.missingFields, suggestions: validation.suggestions, message: validation.message });
    const result = await turboService.createShipment(orderData);
    const baseTurboMetadata = result.data && typeof result.data === 'object' ? { ...result.data } : (result.data ? { result: result.data } : {});
    if (previousTurboShipment) { baseTurboMetadata.previousTurboShipment = previousTurboShipment; baseTurboMetadata.replacedExistingTurboShipment = true; }
    const updateData = { turboShipmentId: String(result.shipmentId || ''), turboTrackingNumber: String(result.trackingNumber || ''), turboShipmentStatus: result.status, turboLabelUrl: result.labelUrl, turboMetadata: Object.keys(baseTurboMetadata).length > 0 ? serializeTurboMetadata(order.turboMetadata, baseTurboMetadata) : serializeTurboMetadata(order.turboMetadata, {}) };
    if (order.tableType === 'GuestOrder') {
      await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3);
      if (order.orderNumber) {
        await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3).catch(() => {});
      }
    }
    else if (order.orderNumber) {
      await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3);
      await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3).catch(() => {});
    }
    else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: updateData }), 3); }

    // Sync to prisma.shipment for unified shipments logs
    try {
      const turboCarrier = await prisma.shippingCompany.findFirst({
        where: { companyId, providerKey: 'TURBO' },
        select: { id: true },
      });
      const targetOrderId = order.id || null;
      if (targetOrderId) {
        const existingShipment = await prisma.shipment.findFirst({ where: { orderId: targetOrderId, companyId } });
        if (existingShipment) {
          await prisma.shipment.update({
            where: { id: existingShipment.id },
            data: {
              shippingCompanyId: turboCarrier?.id || existingShipment.shippingCompanyId,
              carrierType: 'TURBO',
              trackingNumber: String(result.trackingNumber || ''),
              externalShipmentId: String(result.shipmentId || ''),
              status: result.status || 'CREATED',
              labelUrl: result.labelUrl || null,
            },
          });
        } else {
          await prisma.shipment.create({
            data: {
              companyId,
              orderId: targetOrderId,
              shippingCompanyId: turboCarrier?.id || null,
              carrierType: 'TURBO',
              trackingNumber: String(result.trackingNumber || ''),
              externalShipmentId: String(result.shipmentId || ''),
              status: result.status || 'CREATED',
              labelUrl: result.labelUrl || null,
              destinationGovernorate: order.governorate || null,
              destinationCity: order.city || null,
              destinationAddress: order.customerAddress || order.shippingAddress || null,
              cost: order.shipping !== null && order.shipping !== undefined ? Number(order.shipping) : null,
              currency: order.currency || 'EGP',
              metadata: JSON.stringify(baseTurboMetadata),
            },
          });
        }
      }
    } catch (syncErr) {
      console.warn('⚠️ [TURBO] Error syncing shipment to prisma.shipment:', syncErr.message);
    }
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { settings: true } });
      if (company?.settings) { const cs = JSON.parse(company.settings); if (cs.turboAutomationEnabled && cs.turboAutomationStatus && cs.turboAutomationStatus !== order.status) { await orderService.updateOrderStatus(order.orderNumber, companyId, cs.turboAutomationStatus, 'تغيير تلقائي للحالة بعد إنشاء شحنة تربو بنجاح', 'SYSTEM', 'System Automation', null, true); } }
    } catch (autoErr) { console.error('⚠️ [TURBO-AUTOMATION] Error running turbo automation:', autoErr.message); }
    res.json({ success: true, data: { shipmentId: result.shipmentId, trackingNumber: result.trackingNumber, status: result.status, labelUrl: result.labelUrl, estimatedDelivery: result.estimatedDelivery } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error creating shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create shipment' });
  }
};

const bulkCreateShipments = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) return res.status(400).json({ success: false, error: 'يرجى تحديد طلب واحد على الأقل لإرساله لتربو' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true, settings: true } }), 3);
    let turboApiKey = company?.turboApiKey;
    let turboEnabled = company?.turboEnabled;
    if (!turboEnabled || !turboApiKey) {
      const turboCarrier = await prisma.shippingCompany.findFirst({
        where: { companyId, providerKey: 'TURBO', isActive: true },
      });
      if (turboCarrier && turboCarrier.apiKey) {
        turboApiKey = turboCarrier.apiKey;
        turboEnabled = true;
        await safeQuery(() => prisma.company.update({
          where: { id: companyId },
          data: { turboApiKey, turboEnabled: true },
        }), 3).catch(() => {});
      }
    }
    if (!turboEnabled || !turboApiKey) return res.status(400).json({ success: false, error: 'خدمة شحن تربو غير مفعلة في إعدادات الشركة أو لم يتم إدخال مفتاح API' });

    let automationStatus = null;
    if (company?.settings) {
      try {
        const cs = typeof company.settings === 'string' ? JSON.parse(company.settings) : company.settings;
        if (cs?.turboAutomationEnabled && cs?.turboAutomationStatus) {
          automationStatus = cs.turboAutomationStatus;
        }
      } catch (_) {}
    }

    const invalidShippingStatuses = ['DUPLICATE_ORDER', 'CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'];

    const regularOrders = await safeQuery(() => prisma.order.findMany({
      where: {
        OR: [{ orderNumber: { in: orderIds } }, { id: { in: orderIds } }],
        companyId,
        turboShipmentId: null,
        status: { notIn: invalidShippingStatuses }
      },
      include: {
        customer: true,
        orderItems: { include: { product: true, productVariant: true } },
        company: { select: { id: true, turboApiKey: true, turboEnabled: true } }
      },
      take: 100
    }), 3);

    const regularMatchedIds = new Set(regularOrders.flatMap(o => [o.id, o.orderNumber]));
    const remainingIds = orderIds.filter(id => !regularMatchedIds.has(id));

    let guestOrders = [];
    if (remainingIds.length > 0) {
      guestOrders = await safeQuery(() => prisma.guestOrder.findMany({
        where: {
          OR: [{ orderNumber: { in: remainingIds } }, { id: { in: remainingIds } }],
          companyId,
          turboShipmentId: null,
          status: { notIn: invalidShippingStatuses }
        },
        take: 100
      }), 3);
    }

    const totalCandidateOrders = regularOrders.length + guestOrders.length;
    if (totalCandidateOrders === 0) return res.status(404).json({ success: false, error: 'لم يتم العثور على أي طلبات مؤهلة للشحن غير مشحونة بحاجة للإرسال لتربو' });

    const turboService = new TurboService(turboApiKey, companyId);
    const { normalizeGuestShippingAddress } = require('../../utils/turbo/addressParser');
    const results = { success: [], failed: [], skipped: [] };
    const processedPhonesInBatch = new Set();

    // 1. Process regular orders
    for (const order of regularOrders) {
      try {
        if (order.turboShipmentId) {
          results.skipped.push({ orderNumber: order.orderNumber, reason: 'يوجد شحنة تربو مسجلة بالفعل' });
          continue;
        }

        if (invalidShippingStatuses.includes(String(order.status || '').toUpperCase())) {
          results.skipped.push({ orderNumber: order.orderNumber, reason: `حالة الطلب غير مؤهلة للشحن (${order.status})` });
          continue;
        }

        const batchOrderMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata || '{}') : (order.metadata || {});
        if (batchOrderMeta.discountApprovalStatus === 'PENDING_APPROVAL') {
          results.skipped.push({ orderNumber: order.orderNumber, reason: 'الطلب بانتظار اعتماد الخصم من قِبل الإدارة' });
          continue;
        }

        const rawPhone = order.customerPhone || order.customer?.phone || '';
        const cleanPhone = String(rawPhone)
          .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
          .replace(/\D/g, '')
          .slice(-10);

        if (cleanPhone && cleanPhone.length >= 8) {
          if (processedPhonesInBatch.has(cleanPhone)) {
            results.skipped.push({
              orderNumber: order.orderNumber,
              reason: 'طلب مكرر لنفس العميل داخل نفس دفعة الشحن'
            });
            continue;
          }

          const activeExisting = await orderService.checkDuplicateActiveTurboShipment(companyId, order);
          if (activeExisting) {
            results.skipped.push({
              orderNumber: order.orderNumber,
              reason: `يوجد شحنة نشطة سابقة للعميل (بوليصة #${activeExisting.turboShipmentId})`
            });
            continue;
          }

          processedPhonesInBatch.add(cleanPhone);
        }

        const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);
        const result = await turboService.createShipment(orderData);
        const updateData = {
          turboShipmentId: String(result.shipmentId || ''),
          turboTrackingNumber: String(result.trackingNumber || ''),
          turboShipmentStatus: result.status,
          turboLabelUrl: result.labelUrl,
          turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data)
        };

        if (order.orderNumber) {
          await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3);
          await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: updateData }), 3).catch(() => {});
        } else if (order.id) {
          await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: updateData }), 3);
        }

        // Sync to prisma.shipment
        try {
          if (turboCarrier && order.id) {
            const existingShipment = await prisma.shipment.findFirst({ where: { orderId: order.id, companyId } });
            if (existingShipment) {
              await prisma.shipment.update({
                where: { id: existingShipment.id },
                data: {
                  shippingCompanyId: turboCarrier.id,
                  carrierType: 'TURBO',
                  trackingNumber: String(result.trackingNumber || ''),
                  externalShipmentId: String(result.shipmentId || ''),
                  status: result.status || 'CREATED',
                  labelUrl: result.labelUrl || null,
                },
              });
            } else {
              await prisma.shipment.create({
                data: {
                  companyId,
                  orderId: order.id,
                  shippingCompanyId: turboCarrier.id,
                  carrierType: 'TURBO',
                  trackingNumber: String(result.trackingNumber || ''),
                  externalShipmentId: String(result.shipmentId || ''),
                  status: result.status || 'CREATED',
                  labelUrl: result.labelUrl || null,
                  destinationGovernorate: order.governorate || null,
                  destinationCity: order.city || null,
                  destinationAddress: order.customerAddress || order.shippingAddress || null,
                  cost: order.shipping !== null && order.shipping !== undefined ? Number(order.shipping) : null,
                  currency: order.currency || 'EGP',
                  metadata: JSON.stringify(result.data || {}),
                },
              });
            }
          }
        } catch (_) {}

        if (automationStatus && automationStatus !== order.status) {
          try {
            await orderService.updateOrderStatus(order.orderNumber, companyId, automationStatus, 'تغيير تلقائي للحالة بعد إنشاء شحنة تربو بنجاح (إرسال جماعي)', 'SYSTEM', 'System Automation', null, true);
          } catch (autoErr) {
            console.warn(`⚠️ [TURBO-AUTOMATION] Error updating order status for ${order.orderNumber}:`, autoErr.message);
          }
        }

        results.success.push({ orderNumber: order.orderNumber, shipmentId: result.shipmentId, trackingNumber: result.trackingNumber });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        results.failed.push({ orderNumber: order.orderNumber, error: turboService.translateTurboErrorToArabic(error.message) });
      }
    }

    // 2. Process guest orders
    for (const guest of guestOrders) {
      try {
        if (guest.turboShipmentId) {
          results.skipped.push({ orderNumber: guest.orderNumber, reason: 'يوجد شحنة تربو مسجلة بالفعل' });
          continue;
        }

        if (invalidShippingStatuses.includes(String(guest.status || '').toUpperCase())) {
          results.skipped.push({ orderNumber: guest.orderNumber, reason: `حالة الطلب غير مؤهلة للشحن (${guest.status})`, isGuest: true });
          continue;
        }

        const batchGuestMeta = typeof guest.metadata === 'string' ? JSON.parse(guest.metadata || '{}') : (guest.metadata || {});
        if (batchGuestMeta.discountApprovalStatus === 'PENDING_APPROVAL') {
          results.skipped.push({ orderNumber: guest.orderNumber, reason: 'الطلب بانتظار اعتماد الخصم من قِبل الإدارة', isGuest: true });
          continue;
        }

        const rawGuestPhone = guest.guestPhone || '';
        const cleanGuestPhone = String(rawGuestPhone)
          .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
          .replace(/\D/g, '')
          .slice(-10);

        if (cleanGuestPhone && cleanGuestPhone.length >= 8) {
          if (processedPhonesInBatch.has(cleanGuestPhone)) {
            results.skipped.push({
              orderNumber: guest.orderNumber,
              reason: 'طلب مكرر لنفس العميل داخل نفس دفعة الشحن',
              isGuest: true
            });
            continue;
          }

          const activeExisting = await orderService.checkDuplicateActiveTurboShipment(companyId, {
            id: guest.id,
            customerPhone: guest.guestPhone
          });
          if (activeExisting) {
            results.skipped.push({
              orderNumber: guest.orderNumber,
              reason: `يوجد شحنة نشطة سابقة للعميل (بوليصة #${activeExisting.turboShipmentId})`,
              isGuest: true
            });
            continue;
          }

          processedPhonesInBatch.add(cleanGuestPhone);
        }

        let items = guest.items || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        const shippingAddressDetails = normalizeGuestShippingAddress(guest.shippingAddress);
        const guestOrderData = turboService.formatOrderForTurbo({
          id: guest.id,
          orderNumber: guest.orderNumber,
          customerName: guest.guestName || '',
          customerPhone: guest.guestPhone || '',
          customerEmail: guest.guestEmail || '',
          customerAddress: shippingAddressDetails.customerAddress,
          shippingAddress: shippingAddressDetails.rawShippingAddress,
          city: shippingAddressDetails.city,
          paymentMethod: guest.paymentMethod || 'CASH',
          paymentStatus: guest.paymentStatus || null,
          total: guest.finalTotal || guest.total || 0,
          shipping: guest.shippingCost || 0,
          notes: guest.notes || '',
          orderItems: items.map(item => ({
            productName: item.name || item.productName || 'منتج',
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: item.total || ((item.price || 0) * (item.quantity || 1)),
            color: item.color || null,
            size: item.size || null,
            variantName: item.variantName || null,
          }))
        }, {
          firstName: guest.guestName?.split(' ')[0] || '',
          lastName: guest.guestName?.split(' ').slice(1).join(' ') || '',
          phone: guest.guestPhone || '',
          email: guest.guestEmail || ''
        }, items);

        const result = await turboService.createShipment(guestOrderData);
        const updateData = {
          turboShipmentId: String(result.shipmentId || ''),
          turboTrackingNumber: String(result.trackingNumber || ''),
          turboShipmentStatus: result.status,
          turboLabelUrl: result.labelUrl,
          turboMetadata: serializeTurboMetadata(guest.turboMetadata, result.data)
        };

        await safeQuery(() => prisma.guestOrder.updateMany({
          where: guest.orderNumber ? { orderNumber: guest.orderNumber, companyId } : { id: guest.id, companyId },
          data: updateData
        }), 3);

        if (guest.orderNumber) {
          await safeQuery(() => prisma.order.updateMany({
            where: { orderNumber: guest.orderNumber, companyId },
            data: updateData
          }), 3).catch(() => {});
        }

        if (automationStatus && automationStatus !== guest.status) {
          try {
            await orderService.updateGuestOrderStatus(guest.orderNumber, companyId, automationStatus, 'تغيير تلقائي للحالة بعد إنشاء شحنة تربو بنجاح (إرسال جماعي)', 'SYSTEM', 'System Automation', null, { skipCallAttemptGuard: true, skipTransitionValidation: true });
          } catch (autoErr) {
            console.warn(`⚠️ [TURBO-AUTOMATION] Error updating guest order status for ${guest.orderNumber}:`, autoErr.message);
          }
        }

        results.success.push({ orderNumber: guest.orderNumber, shipmentId: result.shipmentId, trackingNumber: result.trackingNumber, isGuest: true });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        results.failed.push({ orderNumber: guest.orderNumber, error: turboService.translateTurboErrorToArabic(error.message), isGuest: true });
      }
    }

    res.json({
      success: true,
      data: {
        total: totalCandidateOrders,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        results
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error in bulk create shipments:', error);
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
    if (order.tableType === 'GuestOrder') {
      await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3);
      if (order.orderNumber) {
        await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3).catch(() => {});
      }
    }
    else if (order.orderNumber) {
      await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3);
      await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3).catch(() => {});
    }
    else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: { turboShipmentStatus: 'cancelled', turboMetadata: serializeTurboMetadata(order.turboMetadata, result.data) } }), 3); }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error cancelling shipment:', error);
    let statusCode = 500, errorMessage = error.message || 'Failed to cancel shipment', arabicMessage = 'فشل في إلغاء الشحنة';
    if (error.message) {
      if (error.message.includes('Invalid authentication key')) { arabicMessage = 'مفتاح API الخاص بـ Turbo غير صحيح أو منتهي الصلاحية'; statusCode = 401; }
      else if (error.message.includes('لا يمكن التبلغ على الالغاء')) { arabicMessage = 'لا يمكن إلغاء هذه الشحنة - قد تكون في حالة متقدمة'; statusCode = 400; }
      else if (error.message.includes('government not found')) { arabicMessage = 'المحافظة غير موجودة في Turbo API'; statusCode = 400; }
      else if (/shipments?\s+not\s+found/i.test(error.message)) { arabicMessage = 'تعذر العثور على الشحنة داخل Turbo'; statusCode = 404; }
      else if (error.message.includes('Turbo API error')) { statusCode = 400; const m = error.message.match(/Turbo API error: (.+)/); if (m?.[1]) arabicMessage = m[1]; }
      else if (error.message.includes('Turbo API key is not configured')) { arabicMessage = 'مفتاح API الخاص بـ Turbo غير موجود'; statusCode = 400; }
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
    if (!hasTurboLink(order)) return res.status(400).json({ success: false, error: 'No Turbo shipment link found for this order', message: 'لا يوجد ربط Turbo محفوظ لهذا الطلب' });
    if (order.tableType === 'GuestOrder') {
      await safeQuery(() => prisma.guestOrder.updateMany({ where: order.orderNumber ? { orderNumber: order.orderNumber, companyId } : { id: order.id, companyId }, data: buildTurboUnlinkUpdateData(false) }), 3);
      if (order.orderNumber) {
        await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: buildTurboUnlinkUpdateData(true) }), 3).catch(() => {});
      }
    }
    else if (order.orderNumber) {
      await safeQuery(() => prisma.order.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: buildTurboUnlinkUpdateData(true) }), 3);
      await safeQuery(() => prisma.guestOrder.updateMany({ where: { orderNumber: order.orderNumber, companyId }, data: buildTurboUnlinkUpdateData(false) }), 3).catch(() => {});
    }
    else if (order.id) { await safeQuery(() => prisma.order.update({ where: { id: order.id }, data: buildTurboUnlinkUpdateData(true) }), 3); }
    res.json({ success: true, message: 'تم إلغاء ربط Turbo من الطلب بنجاح', data: { orderId: order.id, orderNumber: order.orderNumber, turboShipmentId: null, turboTrackingNumber: null, turboShipmentStatus: null, turboLabelUrl: null, turboMetadata: null, turboBranchId: null } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error unlinking shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to unlink Turbo shipment', message: 'فشل في إلغاء ربط Turbo من الطلب' });
  }
};

const updateShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    let order = await findOrderByNumber(orderId, companyId);
    if (!order) order = await safeQuery(() => prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, orderItems: { include: { product: true, productVariant: true } }, company: { select: { id: true, turboApiKey: true, turboEnabled: true } } } }), 3);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found', searchedValue: orderId });
    if (order.companyId !== companyId) return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
    const shipmentCode = order.turboShipmentId || order.turboTrackingNumber;
    if (!shipmentCode) return res.status(400).json({ success: false, error: 'لم يتم إيجاد كود شحنة تربو لهذا الطلب' });
    const turboService = new TurboService(order.company.turboApiKey, companyId);
    const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems || order.items);
    const result = await turboService.updateShipment(shipmentCode, orderData);
    res.json({ success: true, data: result, message: 'تم تحديث بيانات الشحنة في تربو بنجاح' });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error updating shipment:', error);
    let arabicError = error.message || 'فشل تحديث بيانات الشحنة في تربو';
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
    console.error('❌ [TURBO-CONTROLLER] Error updating shipment:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update shipment' });
  }
};

module.exports = { createShipment, bulkCreateShipments, cancelShipment, unlinkShipment, updateShipment, updateShipmentLegacy };
