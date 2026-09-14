/**
 * QP Express Controller
 * معالجة طلبات الـ API الخاصة بربط وتتبع شحنات QP Express
 */

const QpExpressService = require('../services/qpExpressService');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { calculateCollectableCodAmount } = require('../utils/shippingFinancialUtils');
const { generateCode128Svg } = require('../utils/barcodeGenerator');

const getService = (req) => {
  const companyId = req.user?.companyId || null;
  return new QpExpressService({}, companyId);
};

/**
 * إنشاء شحنة جديدة لأوردر موجود في MaxP
 */
exports.createShipment = async (req, res) => {
  try {
    const service = getService(req);
    const prisma = getSharedPrismaClient();
    const { orderId } = req.params;
    const { notes: customNotes, weight } = req.body || {};

    // 1. Fetch Order from DB (Check order or guestOrder)
    let order = await safeQuery(() =>
      prisma.order.findFirst({
        where: {
          OR: [{ id: orderId }, { orderNumber: orderId }],
          ...(req.user?.companyId ? { companyId: req.user.companyId } : {}),
        },
        include: {
          customer: true,
          orderItems: { include: { product: true } },
        },
      })
    , 2);

    let isGuest = false;
    if (!order) {
      order = await safeQuery(() =>
        prisma.guestOrder.findFirst({
          where: {
            OR: [{ id: orderId }, { orderNumber: orderId }],
            ...(req.user?.companyId ? { companyId: req.user.companyId } : {}),
          },
        })
      , 2);
      isGuest = true;
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // 🛡️ منع شحن الطلبات المكررة، الملغاة، أو المرتجعة
    const invalidShippingStatuses = ['DUPLICATE_ORDER', 'CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'];
    if (invalidShippingStatuses.includes(String(order.status || '').toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ORDER_STATUS_FOR_SHIPPING',
        error: `لا يمكن شحن هذا الطلب لـ QP Express لأن حالته هي: ${order.status}`,
        orderStatus: order.status
      });
    }

    // 2. Prepare order payload for QP Express
    const customerName = order.customerName || order.customer?.name || order.customer?.fullName || 'عميل';
    const customerPhone = order.customerPhone || order.customer?.phone || order.phone || '';
    const shippingAddress = order.shippingAddress || '';
    const customerAddress = order.customerAddress || order.address || order.customer?.address || '';
    const city = order.city || order.governorate || order.shippingCity || '';
    const totalAmount = calculateCollectableCodAmount(order);

    let items = [];
    if (order.orderItems && Array.isArray(order.orderItems)) {
      items = order.orderItems;
    } else if (order.items) {
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch {
        items = [];
      }
    }

    const orderData = {
      orderId: order.id,
      orderNumber: order.orderNumber || order.invoiceNumber || String(order.id),
      customerName,
      customerPhone,
      shippingAddress,
      customerAddress,
      city,
      items,
      totalAmount,
      notes: customNotes || order.notes || order.customerNotes || '',
      weight: weight || order.weight || 1,
      metadata: order.metadata || null,
    };

    // 3. Create shipment via QP Express API
    const result = await service.createShipment(orderData);

    // 4. Update shipment/order in database
    if (result.success && result.trackingNumber) {
      try {
        if (!isGuest) {
          const existingShipment = await safeQuery(() =>
            prisma.shipment.findFirst({
              where: { orderId: order.id, companyId: req.user?.companyId || order.companyId },
            })
          , 2);

          if (existingShipment) {
            await safeQuery(() =>
              prisma.shipment.update({
                where: { id: existingShipment.id },
                data: {
                  carrierType: 'QP_EXPRESS',
                  trackingNumber: String(result.trackingNumber),
                  status: 'CREATED',
                  cost: result.totalFees ? Number(result.totalFees) : undefined,
                  metadata: JSON.stringify({
                    carrier: 'QP_EXPRESS',
                    orderSerial: result.orderSerial || result.serial || result.trackingNumber,
                    lastLiveSync: new Date().toISOString(),
                    liveStatus: result,
                  }),
                },
              })
            , 2);
          } else {
            await safeQuery(() =>
              prisma.shipment.create({
                data: {
                  orderId: order.id,
                  companyId: req.user?.companyId || order.companyId,
                  carrierType: 'QP_EXPRESS',
                  trackingNumber: String(result.trackingNumber),
                  status: 'CREATED',
                  cost: result.totalFees ? Number(result.totalFees) : undefined,
                  destinationGovernorate: order.governorate || null,
                  destinationCity: order.city || null,
                  destinationAddress: order.address || null,
                  metadata: JSON.stringify({
                    carrier: 'QP_EXPRESS',
                    orderSerial: result.orderSerial || result.serial || result.trackingNumber,
                    lastLiveSync: new Date().toISOString(),
                    liveStatus: result,
                  }),
                },
              })
            , 2);
          }

          let orderMeta = {};
          try {
            orderMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
          } catch (e) {}
          orderMeta.trackingNumber = String(result.trackingNumber);
          orderMeta.shippingCarrier = 'QP_EXPRESS';
          orderMeta.qpExpress = result;

          await safeQuery(() =>
            prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'SHIPPED',
                customStatusCode: null,
                metadata: JSON.stringify(orderMeta),
                statusHistory: {
                  create: {
                    status: 'SHIPPED',
                    oldStatus: order.status,
                    reason: `تم إنشاء بوليصة QP Express برقم ${result.trackingNumber}`,
                    changedBy: req.user?.id || 'SYSTEM',
                  },
                },
              },
            })
          , 2);
        } else {
          let guestMeta = {};
          try {
            guestMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
          } catch (e) {}
          guestMeta.trackingNumber = String(result.trackingNumber);
          guestMeta.shippingCarrier = 'QP_EXPRESS';
          guestMeta.qpExpress = result;

          await safeQuery(() =>
            prisma.guestOrder.update({
              where: { id: order.id },
              data: {
                status: 'SHIPPED',
                trackingNumber: String(result.trackingNumber),
                metadata: JSON.stringify(guestMeta),
              },
            })
          , 2);
        }
      } catch (dbErr) {
        console.warn('⚠️ [QP_EXPRESS] Order updated in QP Express but DB update had warning:', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'تم إنشاء بوليصة الشحن بنجاح لدى QP Express.',
      data: result,
    });
  } catch (error) {
    console.error('❌ [QP_EXPRESS] createShipment controller error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * تتبع الشحنة برقم البوليصة
 */
exports.trackShipment = async (req, res) => {
  try {
    const service = getService(req);
    const { trackingNumber } = req.params;
    const result = await service.trackShipment(trackingNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [QP_EXPRESS] trackShipment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * جلب قائمة المحافظات والمدن المدعومة
 */
exports.getCities = async (req, res) => {
  try {
    const service = getService(req);
    const cities = service.getCities();
    res.json({ success: true, data: cities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * جلب أسعار تعاقد الشركة لجميع المحافظات
 */
exports.getPricing = async (req, res) => {
  try {
    const service = getService(req);
    const pricing = await service.getPricingList();
    res.json({ success: true, data: pricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * جلب بيانات ومعلومات حساب التاجر المسجل لدى QP Express
 */
exports.getCustomerInfo = async (req, res) => {
  try {
    const service = getService(req);
    const info = await service.getCustomerInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * جلب أحدث شحنات وأوردرات الحساب
 */
exports.getRecentOrders = async (req, res) => {
  try {
    const service = getService(req);
    const limit = Number(req.query.limit) || 50;
    const orders = await service.getRecentOrders(limit);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * إنشاء شحنات متعددة دفعة واحدة (Bulk Create Shipments)
 */
exports.bulkCreateShipments = async (req, res) => {
  try {
    const service = getService(req);
    const prisma = getSharedPrismaClient();
    const { orderIds, notes: defaultNotes } = req.body || {};
    const companyId = req.user?.companyId;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد طلب واحد على الأقل للشحن' });
    }

    const invalidShippingStatuses = ['DUPLICATE_ORDER', 'CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'];

    const orders = await safeQuery(() =>
      prisma.order.findMany({
        where: {
          OR: [
            { id: { in: orderIds } },
            { orderNumber: { in: orderIds } },
          ],
          status: { notIn: invalidShippingStatuses },
          ...(companyId ? { companyId } : {}),
        },
        include: {
          customer: true,
          orderItems: { include: { product: true } },
          shipments: {
            where: { carrierType: 'QP_EXPRESS' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        take: 100,
      })
    , 2);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على أي طلبات مؤهلة للشحن من بين الطلبات المحددة' });
    }

    const results = { success: [], failed: [], skipped: [] };
    const processedPhonesInBatch = new Set();

    for (const order of orders) {
      try {
        if (invalidShippingStatuses.includes(String(order.status || '').toUpperCase())) {
          results.skipped.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: `حالة الطلب غير مؤهلة للشحن (${order.status})`,
          });
          continue;
        }

        const existingShipment = order.shipments?.[0];
        if (existingShipment?.trackingNumber && existingShipment.carrierType === 'QP_EXPRESS') {
          results.skipped.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: 'الطلب مسجل له شحنة بالفعل برقم ' + existingShipment.trackingNumber,
          });
          continue;
        }

        const customerPhone = order.customerPhone || order.customer?.phone || order.phone || '';
        const cleanPhone = String(customerPhone)
          .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
          .replace(/\D/g, '')
          .slice(-10);

        if (cleanPhone && cleanPhone.length >= 8) {
          if (processedPhonesInBatch.has(cleanPhone)) {
            results.skipped.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              reason: 'طلب مكرر لنفس العميل داخل نفس دفعة الشحن',
            });
            continue;
          }
          processedPhonesInBatch.add(cleanPhone);
        }

        const customerName = order.customerName || (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : null) || 'عميل';
        const shippingAddress = order.shippingAddress || '';
        const customerAddress = order.customerAddress || order.address || order.customer?.address || '';
        const city = order.city || order.governorate || order.shippingCity || '';
        const totalAmount = calculateCollectableCodAmount(order);

        let items = [];
        if (order.orderItems && Array.isArray(order.orderItems)) {
          items = order.orderItems;
        } else if (order.items) {
          try {
            items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          } catch {
            items = [];
          }
        }

        const orderData = {
          orderId: order.id,
          orderNumber: order.orderNumber || order.invoiceNumber || String(order.id),
          customerName,
          customerPhone,
          shippingAddress,
          customerAddress,
          city,
          items,
          totalAmount,
          notes: defaultNotes || order.notes || order.customerNotes || 'المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة',
          weight: order.weight || 1,
          metadata: order.metadata || null,
        };

        const result = await service.createShipment(orderData);

        if (result.success && result.trackingNumber) {
          if (existingShipment) {
            await safeQuery(() =>
              prisma.shipment.update({
                where: { id: existingShipment.id },
                data: {
                  carrierType: 'QP_EXPRESS',
                  trackingNumber: String(result.trackingNumber),
                  status: 'CREATED',
                  cost: result.totalFees ? Number(result.totalFees) : undefined,
                  metadata: JSON.stringify({
                    carrier: 'QP_EXPRESS',
                    orderSerial: result.orderSerial || result.serial || result.trackingNumber,
                    lastLiveSync: new Date().toISOString(),
                    liveStatus: result,
                  }),
                },
              })
            , 2);
          } else {
            await safeQuery(() =>
              prisma.shipment.create({
                data: {
                  orderId: order.id,
                  companyId: companyId || order.companyId,
                  carrierType: 'QP_EXPRESS',
                  trackingNumber: String(result.trackingNumber),
                  status: 'CREATED',
                  cost: result.totalFees ? Number(result.totalFees) : undefined,
                  destinationGovernorate: order.governorate || null,
                  destinationCity: order.city || null,
                  destinationAddress: order.address || null,
                  metadata: JSON.stringify({
                    carrier: 'QP_EXPRESS',
                    orderSerial: result.orderSerial || result.serial || result.trackingNumber,
                    lastLiveSync: new Date().toISOString(),
                    liveStatus: result,
                  }),
                },
              })
            , 2);
          }

          let orderMeta = {};
          try {
            orderMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
          } catch (e) {}
          orderMeta.trackingNumber = String(result.trackingNumber);
          orderMeta.shippingCarrier = 'QP_EXPRESS';
          orderMeta.qpExpress = result;

          await safeQuery(() =>
            prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'SHIPPED',
                customStatusCode: null,
                metadata: JSON.stringify(orderMeta),
                statusHistory: {
                  create: {
                    status: 'SHIPPED',
                    oldStatus: order.status,
                    reason: `تم إنشاء بوليصة QP Express برقم ${result.trackingNumber}`,
                    changedBy: req.user?.id || 'SYSTEM',
                  },
                },
              },
            })
          , 2);

          results.success.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            trackingNumber: result.trackingNumber,
          });
        } else {
          results.failed.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: result.error || 'تعذر إنشاء الشحنة',
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (itemErr) {
        results.failed.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: itemErr.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: orders.length,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        results,
      },
    });
  } catch (error) {
    console.error('❌ [QP_EXPRESS] bulkCreateShipments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * إلغاء شحنة أو مجموعة شحنات في كيو بي إكسبريس وحذفها
 */
exports.cancelShipment = async (req, res) => {
  try {
    const service = getService(req);
    const { serial, trackingNumber, serials } = req.body || {};
    const targetList = serials || [serial || trackingNumber].filter(Boolean);

    if (targetList.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد رقم بوليصة للإلغاء' });
    }

    const result = await service.cancelShipment(targetList);
    res.json({
      success: true,
      message: 'تم إلغاء وحذف الشحنة بنجاح من سيرفرات كيو بي إكسبريس',
      data: result,
    });
  } catch (error) {
    console.error('❌ [QP_EXPRESS] cancelShipment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * دالة مساعدة لتوليد كود بوليصة شحن حرارية قياس 80 مم × 50 مم
 */
function renderThermalStickerHtml(order) {
  const serial = order.serial || order.trackingNumber || '';
  const customerSerial = order.customer_serial || order.orderNumber || serial;
  const fullName = order.full_name || order.customerName || order.recipientName || 'عميل';
  const phone = order.phone || order.customerPhone || order.recipientPhone || '';
  const city = order.city || order.destinationCity || 'القاهرة';
  const address = order.address || order.shippingAddress || '';
  const contents = order.shipment_contents || order.items || 'منتجات المتجر';
  const totalAmount = order.total_amount !== undefined ? order.total_amount : (order.amount || 0);
  const companyName = order.company_name || order.companyName || order.customer || 'متجر معتمد';

  // Sanitize notes: If raw API returns question marks or empty, use clean standard Arabic instructions
  const rawNotes = typeof order.notes === 'string' ? order.notes.trim() : '';
  const isCorruptedNotes = rawNotes.includes('???') || rawNotes === '';
  const notes = !isCorruptedNotes ? rawNotes : 'المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة';

  const orderDate = order.order_date ? String(order.order_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const barcodeSvg = generateCode128Svg(String(serial), {
    height: 32,
    barWidth: 1.5,
    includeText: true,
    fontSize: 10,
    altText: serial ? `QP${serial}` : '',
  });

  return `
    <div class="sticker-container">
      <div class="header-row">
        <div>
          <span class="brand-title">كيو بي إكسبريس (QP Express)</span>
          <span class="merchant-name">${companyName}</span>
        </div>
        <div class="date-bill">
          <div>التاريخ: ${orderDate}</div>
          <div style="font-weight:700">بوليصة: #${serial}</div>
        </div>
      </div>

      <div class="barcode-section">
        ${barcodeSvg}
      </div>

      <div class="info-grid">
        <div class="info-row"><span class="info-label">العميل:</span> <span class="info-val">${fullName}</span></div>
        <div class="info-row"><span class="info-label">الهاتف:</span> <span class="info-val" dir="ltr">${phone}</span></div>
        <div class="info-row"><span class="info-label">المحافظة:</span> <span class="info-val">${city}</span></div>
        <div class="info-row"><span class="info-label">رقم الطلب:</span> <span class="info-val">${customerSerial}</span></div>
        <div class="address-line"><span class="info-label">العنوان:</span> ${address}</div>
        <div class="items-line"><span class="info-label">المحتويات:</span> ${contents}</div>
      </div>

      <div class="footer-row">
        <div class="notes-box">ملاحظات: ${notes}</div>
        <div class="cod-badge">المطلوب: ${totalAmount} ج.م</div>
      </div>
    </div>
  `;
}

/**
 * طباعة بوليصة شحن حرارية فردية (80mm × 50mm)
 */
exports.printWaybill = async (req, res) => {
  try {
    const service = getService(req);
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res.status(400).send('رقم البوليصة مطلوب');
    }

    // 1. Fetch tracking data from QP Express
    const tracking = await service.trackShipment(trackingNumber);

    // 2. Fetch local shipment and order to ensure clean Arabic data & items
    let localData = {};
    try {
      const localShipment = await safeQuery(() =>
        prisma.shipment.findFirst({
          where: { trackingNumber: String(trackingNumber), ...(req.user?.companyId ? { companyId: req.user.companyId } : {}) },
          include: {
            order: {
              include: {
                customer: true,
                orderItems: { include: { product: true } }
              }
            }
          }
        })
      , 2);

      if (localShipment?.order) {
        const o = localShipment.order;
        const c = o.customer;
        const fullName = (c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : null) || o.customerName;
        let contents = null;
        if (o.orderItems && o.orderItems.length > 0) {
          contents = o.orderItems.map(i => `${i.product?.title || i.productName || 'منتج'} × ${i.quantity || 1}`).join(' + ');
        }
        localData = {
          customer_serial: o.orderNumber,
          full_name: fullName,
          phone: c?.phone || o.customerPhone,
          city: o.city || o.governorate,
          address: o.address,
          notes: o.notes || o.customerNotes,
          shipment_contents: contents,
          total_amount: Number(o.total || 0),
        };
      }
    } catch (dbErr) {
      console.warn('⚠️ [QP_EXPRESS] Could not load local order data for waybill:', dbErr.message);
    }

    const raw = (tracking && tracking.raw) ? tracking.raw : {};
    const orderData = {
      serial: trackingNumber,
      customer_serial: localData.customer_serial || raw.customer_serial || trackingNumber,
      full_name: localData.full_name || raw.full_name || tracking?.recipientName || 'عميل',
      phone: localData.phone || raw.phone || tracking?.recipientPhone || '',
      city: localData.city || raw.city || tracking?.city || 'القاهرة',
      address: localData.address || raw.address || '',
      total_amount: localData.total_amount !== undefined ? localData.total_amount : (raw.total_amount !== undefined ? raw.total_amount : (tracking?.totalAmount || 0)),
      shipment_contents: localData.shipment_contents || raw.shipment_contents || 'شحنة كيو بي إكسبريس',
      notes: localData.notes || raw.notes,
      company_name: req.company?.name || raw.company_name || 'أميرال',
    };

    // 3. Mark as printed in QP Express portal
    try {
      await service.getClient().post('/addorders/bulkPrint', {
        isprint: 1,
        selectedOrders: [Number(trackingNumber)],
      });
    } catch (e) {
      console.warn('⚠️ [QP_EXPRESS] Could not mark order as printed on portal:', e.message);
    }

    // 4. Render printable 80x50 mm sticker page
    const stickerHtml = renderThermalStickerHtml(orderData);
    const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بوليصة QP Express - ${trackingNumber}</title>
  <style>
    @page { size: 80mm 50mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { width: 80mm; height: 50mm; margin: 0 auto; background: #fff; color: #000; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sticker-container { width: 80mm; height: 50mm; padding: 2.5mm 3.5mm; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
    .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #000; padding-bottom: 1mm; font-size: 8px; }
    .brand-title { font-size: 9.5px; font-weight: 800; display: block; }
    .merchant-name { font-size: 8px; color: #222; font-weight: 600; }
    .date-bill { text-align: left; font-size: 7.5px; }
    .barcode-section { text-align: center; margin: 1mm 0; }
    .barcode-img { max-width: 96%; height: 11mm; display: block; margin: 0 auto; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8mm; font-size: 8px; line-height: 1.2; }
    .info-row { display: flex; gap: 2px; }
    .info-label { font-weight: 700; white-space: nowrap; }
    .info-val { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .address-line { grid-column: span 2; font-size: 7.5px; line-height: 1.2; border-top: 0.5px solid #ddd; padding-top: 0.8mm; margin-top: 0.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .items-line { grid-column: span 2; font-size: 7.5px; color: #111; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .footer-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #000; padding-top: 0.8mm; margin-top: 0.5mm; }
    .cod-badge { font-size: 10px; font-weight: 900; border: 1.2px solid #000; padding: 0.5mm 2mm; border-radius: 2px; }
    .notes-box { font-size: 7px; font-weight: 700; color: #000; max-width: 48mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media print {
      body { width: 80mm; height: 50mm; }
      .no-print { display: none !important; }
      .sticker-container { page-break-after: always; }
    }
  </style>
</head>
<body onload="window.print()">
  ${stickerHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fullHtml);
  } catch (error) {
    console.error('❌ [QP_EXPRESS] printWaybill error:', error);
    res.status(500).send(`فشل تجهيز البوليصة للطباعة: ${error.message}`);
  }
};

/**
 * طباعة مجمعة لبوالص شحن حرارية (Bulk Print Waybills 80mm × 50mm)
 */
exports.bulkPrintWaybills = async (req, res) => {
  try {
    const service = getService(req);
    const trackingNumbers = req.body?.trackingNumbers || (req.query.serials ? req.query.serials.split(',') : []);

    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return res.status(400).send('يرجى تحديد أرقام بوالص للطباعة');
    }

    const cleanSerials = trackingNumbers.map(s => String(s).trim()).filter(Boolean);

    // 1. Mark orders as printed in QP Express portal
    try {
      const numericSerials = cleanSerials.map(Number).filter(n => !isNaN(n));
      if (numericSerials.length > 0) {
        await service.getClient().post('/addorders/bulkPrint', {
          isprint: 1,
          selectedOrders: numericSerials,
        });
      }
    } catch (e) {
      console.warn('⚠️ [QP_EXPRESS] bulkPrint notice:', e.message);
    }

    // 2. Fetch tracking details for each serial
    const stickersHtmlList = [];
    for (const serial of cleanSerials) {
      try {
        const tracking = await service.trackShipment(serial);
        const raw = (tracking && tracking.raw) ? tracking.raw : {};
        const orderData = {
          serial,
          customer_serial: raw.customer_serial || serial,
          full_name: raw.full_name || tracking?.recipientName || 'عميل',
          phone: raw.phone || tracking?.recipientPhone || '',
          city: raw.city || tracking?.city || 'القاهرة',
          total_amount: raw.total_amount !== undefined ? raw.total_amount : (tracking?.totalAmount || 0),
          shipment_contents: raw.shipment_contents || 'شحنة كيو بي إكسبريس',
          notes: raw.notes,
          address: raw.address || '',
          company_name: req.company?.name || raw.company_name || 'أميرال',
        };
        stickersHtmlList.push(renderThermalStickerHtml(orderData));
      } catch (err) {
        stickersHtmlList.push(renderThermalStickerHtml({ serial, shipment_contents: 'شحنة كيو بي إكسبريس' }));
      }
    }

    const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بوالص شحن QP Express المجمعة (${cleanSerials.length})</title>
  <style>
    @page { size: 80mm 50mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { width: 80mm; margin: 0 auto; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sticker-container { width: 80mm; height: 50mm; padding: 2.5mm 3.5mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; position: relative; }
    .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #000; padding-bottom: 1mm; font-size: 8px; }
    .brand-title { font-size: 9.5px; font-weight: 800; display: block; }
    .merchant-name { font-size: 8px; color: #222; font-weight: 600; }
    .date-bill { text-align: left; font-size: 7.5px; }
    .barcode-section { text-align: center; margin: 1mm 0; }
    .barcode-img { max-width: 96%; height: 11mm; display: block; margin: 0 auto; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8mm; font-size: 8px; line-height: 1.2; }
    .info-row { display: flex; gap: 2px; }
    .info-label { font-weight: 700; white-space: nowrap; }
    .info-val { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .address-line { grid-column: span 2; font-size: 7.5px; line-height: 1.2; border-top: 0.5px solid #ddd; padding-top: 0.8mm; margin-top: 0.5mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .items-line { grid-column: span 2; font-size: 7.5px; color: #111; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .footer-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #000; padding-top: 0.8mm; margin-top: 0.5mm; }
    .cod-badge { font-size: 10px; font-weight: 900; border: 1.2px solid #000; padding: 0.5mm 2mm; border-radius: 2px; }
    .notes-box { font-size: 7px; font-weight: 700; color: #000; max-width: 48mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media print {
      body { width: 80mm; }
      .no-print { display: none !important; }
      .sticker-container { page-break-after: always; height: 50mm; }
    }
  </style>
</head>
<body onload="window.print()">
  ${stickersHtmlList.join('')}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fullHtml);
  } catch (error) {
    console.error('❌ [QP_EXPRESS] bulkPrintWaybills error:', error);
    res.status(500).send(`فشل تجهيز البوالص للطباعة: ${error.message}`);
  }
};
