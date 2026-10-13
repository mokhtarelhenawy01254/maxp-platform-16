const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const {
  buildInvoiceData,
  getInvoiceSettingsMap,
  getOrCreateInvoiceSettings
} = require('./orderInvoiceDocumentUtils');

// Helper لاستخراج الكود من العنصر أو الـ metadata
function extractSkuFromOrderItem(item) {
  if (!item) return null;
  if (item.productSku && String(item.productSku).trim()) return String(item.productSku).trim();
  if (item.sku && String(item.sku).trim()) return String(item.sku).trim();
  if (item.code && String(item.code).trim()) return String(item.code).trim();
  if (item.barcode && String(item.barcode).trim()) return String(item.barcode).trim();
  if (item.variantSku && String(item.variantSku).trim()) return String(item.variantSku).trim();
  if (item.productVariant?.sku && String(item.productVariant.sku).trim()) return String(item.productVariant.sku).trim();
  if (item.product?.sku && String(item.product.sku).trim()) return String(item.product.sku).trim();
  if (item.product?.barcode && String(item.product.barcode).trim()) return String(item.product.barcode).trim();

  if (item.metadata) {
    let m = item.metadata;
    if (typeof m === 'string' && m.trim()) {
      try { m = JSON.parse(m); } catch (e) { m = null; }
    }
    if (m && typeof m === 'object') {
      if (m.sku && String(m.sku).trim()) return String(m.sku).trim();
      if (m.variantSku && String(m.variantSku).trim()) return String(m.variantSku).trim();
      if (m.productSku && String(m.productSku).trim()) return String(m.productSku).trim();
      if (m.code && String(m.code).trim()) return String(m.code).trim();
      if (m.barcode && String(m.barcode).trim()) return String(m.barcode).trim();
    }
  }
  return null;
}

// دمج وإثراء عناصر الطلبات بالأكواد الناقصة من variants و products
async function enrichOrdersWithSku(orders, prisma) {
  if (!Array.isArray(orders) || orders.length === 0) return orders;

  const missingVariantIds = new Set();
  const missingProductIds = new Set();

  orders.forEach(order => {
    (order.orderItems || []).forEach(item => {
      const directSku = extractSkuFromOrderItem(item);
      if (directSku) {
        item.productSku = directSku;
      } else {
        let m = item.metadata;
        if (typeof m === 'string' && m.trim()) {
          try { m = JSON.parse(m); } catch (e) { m = null; }
        }
        const vId = item.variantId || (m && (m.variantId || m.variant_id));
        const pId = item.productId || (m && (m.originalProductId || m.productId || m.product_id));
        if (vId) missingVariantIds.add(vId);
        if (pId) missingProductIds.add(pId);
      }
    });
  });

  const variantMap = new Map();
  const productMap = new Map();

  if (missingVariantIds.size > 0) {
    try {
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: Array.from(missingVariantIds) } },
        select: { id: true, sku: true, productId: true }
      });
      variants.forEach(v => {
        if (v.sku) variantMap.set(v.id, v.sku);
        if (v.productId) missingProductIds.add(v.productId);
      });
    } catch (e) {
      console.warn('⚠️ [INVOICE-BATCH] Error fetching variants for enrichment:', e.message);
    }
  }

  if (missingProductIds.size > 0) {
    try {
      const prods = await prisma.product.findMany({
        where: { id: { in: Array.from(missingProductIds) } },
        select: { id: true, sku: true, barcode: true }
      });
      prods.forEach(p => {
        const code = p.sku || p.barcode || null;
        if (code) productMap.set(p.id, code);
      });
    } catch (e) {
      console.warn('⚠️ [INVOICE-BATCH] Error fetching products for enrichment:', e.message);
    }
  }

  orders.forEach(order => {
    (order.orderItems || []).forEach(item => {
      if (!item.productSku) {
        let m = item.metadata;
        if (typeof m === 'string' && m.trim()) {
          try { m = JSON.parse(m); } catch (e) { m = null; }
        }
        const vId = item.variantId || (m && (m.variantId || m.variant_id));
        const pId = item.productId || (m && (m.originalProductId || m.productId || m.product_id));
        const resolved =
          (vId ? variantMap.get(vId) : null) ||
          (pId ? productMap.get(pId) : null) ||
          null;
        if (resolved) {
          item.productSku = resolved;
        }
      }
      if (!item.productSku) {
        item.productSku = item.code || item.barcode || null;
      }
    });
  });

  return orders;
}

// Batch: جلب جميع الطلبات مرة واحدة
async function fetchOrdersBatch(orderIds) {
  const prisma = getSharedPrismaClient();
  
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: { in: orderIds } },
        { orderNumber: { in: orderIds } }
      ]
    },
    include: {
      customer: true,
      company: true,
      orderItems: {
        include: {
          product: true,
          productVariant: true
        }
      }
    }
  });

  // إثراء عناصر الطلبات بالأكواد الناقصة
  await enrichOrdersWithSku(orders, prisma);

  return orders;
}

// Batch: جلب طلبات الضيف للمعرفات غير الموجودة في الطلبات العادية مع استخراج أكواد المنتجات
async function fetchGuestOrdersBatch(orderIds) {
  const prisma = getSharedPrismaClient();
  
  const guestOrders = await prisma.guestOrder.findMany({
    where: {
      OR: [
        { id: { in: orderIds } },
        { orderNumber: { in: orderIds } }
      ]
    }
  });

  // جمع المعرفات للمتغيرات والمنتجات التي ينقصها كود SKU
  const variantIds = new Set();
  const productIds = new Set();

  guestOrders.forEach(go => {
    let items = [];
    if (typeof go.items === 'string') {
      try { items = JSON.parse(go.items); } catch (e) { items = []; }
    } else if (Array.isArray(go.items)) {
      items = go.items;
    }
    items.forEach(item => {
      const hasSku = Boolean(item.sku || item.productSku || item.code || item.barcode || item.variant?.sku);
      if (!hasSku) {
        const vId = item.variantId || item.variant?.id;
        if (vId) variantIds.add(vId);
        const pId = item.productId || item.id;
        if (pId) productIds.add(pId);
      }
    });
  });

  const variantMap = new Map();
  const productMap = new Map();

  if (variantIds.size > 0) {
    try {
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: Array.from(variantIds) } },
        select: { id: true, sku: true, productId: true }
      });
      variants.forEach(v => {
        if (v.sku) variantMap.set(v.id, v.sku);
        if (v.productId) productIds.add(v.productId);
      });
    } catch (e) {
      console.warn('⚠️ [INVOICE-BATCH] Error querying variant SKUs:', e.message);
    }
  }

  if (productIds.size > 0) {
    try {
      const products = await prisma.product.findMany({
        where: { id: { in: Array.from(productIds) } },
        select: { id: true, sku: true, barcode: true }
      });
      products.forEach(p => {
        const code = p.sku || p.barcode || null;
        if (code) productMap.set(p.id, code);
      });
    } catch (e) {
      console.warn('⚠️ [INVOICE-BATCH] Error querying product SKUs:', e.message);
    }
  }

  // ربط الأكواد بعناصر طلبات الضيف
  guestOrders.forEach(go => {
    let items = [];
    if (typeof go.items === 'string') {
      try { items = JSON.parse(go.items); } catch (e) { items = []; }
    } else if (Array.isArray(go.items)) {
      items = go.items;
    }
    const enriched = items.map(item => {
      const vId = item.variantId || item.variant?.id;
      const pId = item.productId || item.id;
      const resolvedSku =
        item.sku ||
        item.productSku ||
        item.code ||
        item.barcode ||
        item.variant?.sku ||
        (vId ? variantMap.get(vId) : null) ||
        (pId ? productMap.get(pId) : null) ||
        null;
      return {
        ...item,
        sku: resolvedSku,
        productSku: resolvedSku
      };
    });
    go.items = enriched;
  });

  return guestOrders;
}

// تحويل طلب ضيف إلى الشكل المطلوب للطباعة المباشرة من الواجهة
function mapGuestOrderForPrint(guestOrder) {
  let items = [];
  if (typeof guestOrder.items === 'string') {
    try { items = JSON.parse(guestOrder.items); } catch (e) { items = []; }
  } else if (Array.isArray(guestOrder.items)) {
    items = guestOrder.items;
  }

  let addressText = '';
  let city = '';
  let governorate = '';
  if (typeof guestOrder.shippingAddress === 'string' && guestOrder.shippingAddress.trim()) {
    try {
      const parsed = JSON.parse(guestOrder.shippingAddress);
      if (parsed && typeof parsed === 'object') {
        addressText = parsed.address || parsed.addressLine1 || parsed.street || '';
        city = parsed.city || '';
        governorate = parsed.governorate || '';
      } else {
        addressText = String(parsed);
      }
    } catch (e) {
      addressText = guestOrder.shippingAddress;
    }
  } else if (guestOrder.shippingAddress && typeof guestOrder.shippingAddress === 'object') {
    addressText = guestOrder.shippingAddress.address || guestOrder.shippingAddress.addressLine1 || '';
    city = guestOrder.shippingAddress.city || '';
    governorate = guestOrder.shippingAddress.governorate || '';
  }

  let metadata = { source: 'storefront', isGuestOrder: true };
  if (typeof guestOrder.metadata === 'string' && guestOrder.metadata.trim()) {
    try {
      const parsed = JSON.parse(guestOrder.metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = { ...metadata, ...parsed };
      }
    } catch (e) { /* تجاهل */ }
  } else if (guestOrder.metadata && typeof guestOrder.metadata === 'object' && !Array.isArray(guestOrder.metadata)) {
    metadata = { ...metadata, ...guestOrder.metadata };
  }

  return {
    id: guestOrder.id,
    orderNumber: guestOrder.orderNumber,
    customerName: guestOrder.guestName || 'عميل غير محدد',
    customerPhone: guestOrder.guestPhone || null,
    customerEmail: guestOrder.guestEmail || null,
    customerAddress: addressText || null,
    shippingAddress: guestOrder.shippingAddress || null,
    city: city || null,
    governorate: governorate || null,
    status: guestOrder.status || 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: guestOrder.paymentMethod || 'cod',
    items: (Array.isArray(items) ? items : []).map((item) => ({
      id: item.productId || item.id || '',
      productId: item.productId || null,
      productName: item.productName || item.name || 'منتج',
      productColor: item.productColor || item.color || null,
      productSize: item.productSize || item.size || null,
      productSku: item.sku || item.productSku || item.code || item.barcode || item.variant?.sku || null,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      total: Number(item.total != null ? item.total : (Number(item.price || 0) * Number(item.quantity || 1))),
      attributes: item.attributes || item.customAttributes || item.customFields || null,
      customAttributes: item.customAttributes || null,
      customFields: item.customFields || null,
      metadata: item.metadata || null,
      carModel: item.carModel || item.car_model || null,
    })),
    subtotal: Number(guestOrder.total || 0),
    tax: 0,
    shipping: Number(guestOrder.shippingCost || 0),
    discount: Number(guestOrder.discountAmount || 0),
    total: Number(guestOrder.finalTotal || guestOrder.total || 0),
    currency: 'EGP',
    notes: guestOrder.notes || null,
    metadata,
    turboTrackingNumber: guestOrder.turboTrackingNumber || null,
    invoiceNumber: guestOrder.orderNumber,
    isGuestOrder: true,
    createdAt: guestOrder.createdAt,
    updatedAt: guestOrder.updatedAt,
  };
}

// Batch: جلب الفواتير الموجودة مرة واحدة
async function fetchExistingInvoicesBatch(orderIds) {
  const prisma = getSharedPrismaClient();
  
  const existingInvoices = await prisma.orderInvoice.findMany({
    where: {
      orderId: { in: orderIds }
    }
  });

  // تحويل إلى Map للبحث السريع
  const invoiceMap = new Map();
  existingInvoices.forEach(inv => {
    invoiceMap.set(inv.orderId, inv);
  });

  return invoiceMap;
}

// توليد فواتير متعددة بكفاءة عالية
async function bulkGenerateInvoicesOptimized(orderIds, userId = null) {
  const prisma = getSharedPrismaClient();
  const results = {
    success: [],
    existing: [],
    failed: [],
    guestOrders: []
  };

  try {
    console.log(`🚀 [INVOICE-BATCH] Fetching ${orderIds.length} orders...`);
    
    // 1. جلب جميع الطلبات مرة واحدة (Batch Query)
    const orders = await fetchOrdersBatch(orderIds);
    
    // إنشاء Map للبحث السريع
    const orderMap = new Map();
    orders.forEach(order => {
      orderMap.set(order.id, order);
      orderMap.set(order.orderNumber, order);
      if (order.externalOrderId) {
        orderMap.set(order.externalOrderId, order);
      }
    });

    console.log(`📦 [INVOICE-BATCH] Found ${orders.length}/${orderIds.length} orders`);

    // 1b. جلب طلبات الضيف غير الموجودة في الطلبات العادية
    const missingOrderIds = orderIds.filter(id => !orderMap.has(id));
    let guestOrderMap = new Map();
    if (missingOrderIds.length > 0) {
      const guestOrders = await fetchGuestOrdersBatch(missingOrderIds);
      guestOrders.forEach(guestOrder => {
        guestOrderMap.set(guestOrder.id, guestOrder);
        guestOrderMap.set(guestOrder.orderNumber, guestOrder);
      });
      console.log(`🛍️ [INVOICE-BATCH] Found ${guestOrders.length} guest orders for missing identifiers`);
    }

    // 2. جلب إعدادات الفواتير للشركات الموجودة
    const invoiceSettingsMap = await getInvoiceSettingsMap(
      prisma,
      orders.map((order) => order.companyId)
    );

    // 3. جلب الفواتير الموجودة مرة واحدة
    const orderIdsFound = orders.map(o => o.id);
    const existingInvoicesMap = await fetchExistingInvoicesBatch(orderIdsFound);
    
    console.log(`📋 [INVOICE-BATCH] Found ${existingInvoicesMap.size} existing invoices`);

    // 4. تحضير بيانات الفواتير الجديدة
    const invoicesToCreate = [];
    
    for (const orderIdOrNumber of orderIds) {
      const order = orderMap.get(orderIdOrNumber);
      
      if (!order) {
        const guestOrder = guestOrderMap.get(orderIdOrNumber);
        if (guestOrder) {
          results.guestOrders.push({
            orderId: orderIdOrNumber,
            order: mapGuestOrderForPrint(guestOrder)
          });
          continue;
        }

        results.failed.push({
          orderId: orderIdOrNumber,
          error: 'الطلب غير موجود'
        });
        continue;
      }

      // التحقق من وجود فاتورة
      const existingInvoice = existingInvoicesMap.get(order.id);
      
      if (existingInvoice) {
        // تحديث إجماليات وبيانات الفاتورة لتطابق الطلب الحالي
        const orderTotalNum = Number(order.total || 0);
        const invTotalNum = Number(existingInvoice.totalAmount || 0);
        const orderSubtotalNum = Number(order.subtotal || 0);
        const invSubtotalNum = Number(existingInvoice.subtotal || 0);

        if (Math.abs(orderTotalNum - invTotalNum) > 0.01 || Math.abs(orderSubtotalNum - invSubtotalNum) > 0.01) {
          existingInvoice.subtotal = order.subtotal;
          existingInvoice.shipping = order.shipping;
          existingInvoice.discount = order.discount;
          existingInvoice.tax = order.tax;
          existingInvoice.totalAmount = order.total;

          prisma.orderInvoice.update({
            where: { id: existingInvoice.id },
            data: {
              subtotal: order.subtotal,
              shipping: order.shipping,
              discount: order.discount,
              tax: order.tax,
              totalAmount: order.total,
              customerName: order.customerName || existingInvoice.customerName,
              customerPhone: order.customerPhone || existingInvoice.customerPhone,
              customerAddress: order.customerAddress || existingInvoice.customerAddress,
              city: order.city || existingInvoice.city,
              governorate: order.governorate || existingInvoice.governorate,
              notes: order.notes || existingInvoice.notes,
              updatedAt: new Date()
            }
          }).catch(err => console.warn('⚠️ [INVOICE-BATCH-SYNC] Update failed:', err.message));
        }

        // إضافة بيانات الطلب للفاتورة الموجودة مع التأكد من وجود كود المنتج والبيانات المخصصة
        const orderNotes = typeof order.notes === 'string' ? order.notes : '';
        const invNotes = typeof existingInvoice.notes === 'string' ? existingInvoice.notes : '';
        const mergedNotes = Array.from(new Set([orderNotes, invNotes].filter(n => Boolean(n && n.trim())))).join('\n').trim() || null;

        existingInvoice.notes = mergedNotes;
        existingInvoice.governorate = existingInvoice.governorate || order.governorate || null;
        existingInvoice.order = {
          orderNumber: order.orderNumber,
          total: order.total,
          subtotal: order.subtotal,
          shipping: order.shipping,
          discount: order.discount,
          tax: order.tax,
          notes: order.notes || mergedNotes,
          metadata: order.metadata || null,
          shippingAddress: order.shippingAddress || null,
          city: order.city || null,
          governorate: order.governorate || null,
          customerAddress: order.customerAddress || null,
          orderItems: (order.orderItems || []).map(item => ({
            ...item,
            productSku: item.productSku || extractSkuFromOrderItem(item) || null,
            attributes: item.attributes || item.customAttributes || item.customFields || null,
            customAttributes: item.customAttributes || null,
            customFields: item.customFields || null,
            metadata: item.metadata || null,
            carModel: item.carModel || item.car_model || null
          }))
        };
        
        results.existing.push({
          orderId: orderIdOrNumber,
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          invoice: existingInvoice
        });
      } else {
        invoicesToCreate.push({
          order,
          orderIdOrNumber,
          data: buildInvoiceData(
            order,
            invoiceSettingsMap.get(order.companyId),
            userId
          )
        });
      }
    }

    console.log(`✨ [INVOICE-BATCH] Creating ${invoicesToCreate.length} new invoices...`);

    // 5. إنشاء جميع الفواتير دفعة واحدة (Batch Insert)
    if (invoicesToCreate.length > 0) {
      const createdInvoices = await prisma.orderInvoice.createMany({
        data: invoicesToCreate.map(item => item.data),
        skipDuplicates: true
      });

      console.log(`✅ [INVOICE-BATCH] Created ${createdInvoices.count} invoices`);

      // جلب الفواتير المُنشأة مع بيانات الطلب الكاملة والأكواد
      const newInvoices = await prisma.orderInvoice.findMany({
        where: {
          orderId: { in: invoicesToCreate.map(item => item.order.id) }
        },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true,
                  productVariant: true
                }
              }
            }
          }
        }
      });

      // ربط النتائج
      const newInvoiceMap = new Map();
      newInvoices.forEach(inv => {
        if (inv.order?.orderItems) {
          inv.order.orderItems = inv.order.orderItems.map(item => ({
            ...item,
            productSku: item.productSku || extractSkuFromOrderItem(item) || null,
            attributes: item.attributes || item.customAttributes || item.customFields || null,
            customAttributes: item.customAttributes || null,
            customFields: item.customFields || null,
            metadata: item.metadata || null,
            carModel: item.carModel || item.car_model || null
          }));
        }
        newInvoiceMap.set(inv.orderId, inv);
      });

      invoicesToCreate.forEach(item => {
        const invoice = newInvoiceMap.get(item.order.id);
        if (invoice) {
          results.success.push({
            orderId: item.orderIdOrNumber,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            invoice: invoice // إضافة الفاتورة الكاملة
          });
        }
      });
    }

    return results;

  } catch (error) {
    console.error('❌ [INVOICE-BATCH] Error:', error);
    throw error;
  }
}

// الدالة القديمة (للتوافق)
async function generateInvoiceForOrder(orderIdOrNumber, userId = null) {
  try {
    const prisma = getSharedPrismaClient();

    // البحث عن الطلب
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber },
          { orderNumber: { contains: orderIdOrNumber } }
        ]
      },
      include: {
        customer: true,
        company: true,
        orderItems: {
          include: {
            product: true,
            productVariant: true
          }
        }
      }
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { externalOrderId: orderIdOrNumber },
        include: {
          customer: true,
          company: true,
          orderItems: {
            include: {
              product: true,
              productVariant: true
            }
          }
        }
      });
    }

    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    await enrichOrdersWithSku([order], prisma);

    const invoiceSettings = await getOrCreateInvoiceSettings(prisma, order.companyId);

    // التحقق من وجود فاتورة سابقة
    const existingInvoice = await prisma.orderInvoice.findUnique({
      where: { orderId: order.id }
    });

    if (existingInvoice) {
      existingInvoice.order = {
        orderNumber: order.orderNumber,
        orderItems: (order.orderItems || []).map(item => ({
          ...item,
          productSku: item.productSku || extractSkuFromOrderItem(item) || null
        }))
      };
      return {
        success: true,
        invoice: existingInvoice,
        message: 'الفاتورة موجودة بالفعل'
      };
    }

    const invoiceData = buildInvoiceData(order, invoiceSettings, userId);

    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.create({
        data: invoiceData,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true,
                  productVariant: true
                }
              }
            }
          }
        }
      });
    });

    if (invoice?.order?.orderItems) {
      invoice.order.orderItems = invoice.order.orderItems.map(item => ({
        ...item,
        productSku: item.productSku || extractSkuFromOrderItem(item) || null
      }));
    }

    return {
      success: true,
      invoice,
      message: 'تم إنشاء الفاتورة بنجاح'
    };

  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

module.exports = {
  generateInvoiceForOrder,
  bulkGenerateInvoicesOptimized
};
