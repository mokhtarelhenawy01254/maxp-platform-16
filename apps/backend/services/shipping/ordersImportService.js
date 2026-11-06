/**
 * Full Orders & Shipments Excel/CSV Import Service (SHIP-W17)
 * Ingests full orders (Customer, Order, OrderItems, Shipment) or standalone shipments with row-by-row validation.
 */

const XLSX = require('xlsx');
const crypto = require('crypto');
const { getSharedPrismaClient } = require('../sharedDatabase');
const { quotePrice } = require('./policyService');
const { recordShipmentEvent } = require('./shipmentEventService');

function generateTrackingNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRK-${timestamp}-${random}`;
}

function normalizePhone(val) {
  if (!val) return '';
  return String(val).trim().replace(/[^\d+]/g, '');
}

/**
 * Generate binary XLSX template for full order imports
 * @returns {Buffer}
 */
function generateOrdersImportTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Orders Data
  const sampleRows = [
    {
      orderNumber: 'ORD-2026-001',
      customerName: 'أحمد محمد علي',
      customerPhone: '01012345678',
      customerPhone2: '01198765432',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع عباس العقاد عمارة 12 الدور 3',
      items: 'قميص قطن أبيض x 1, بنطلون جينز x 1',
      total: 750,
      codAmount: 750,
      weightKg: 1.5,
      pieces: 2,
      notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
      clientReference: 'REF-1001',
      merchantName: 'متجر الأناقة الحديثة',
    },
    {
      orderNumber: 'ORD-2026-002',
      customerName: 'مروة حسن كمال',
      customerPhone: '01223344556',
      customerPhone2: '',
      governorate: 'الإسكندرية',
      city: 'سموحة',
      address: 'شارع فوزي معاذ أمام نادي سموحة',
      items: 'فستان صيفي مقاس M',
      total: 620,
      codAmount: 620,
      weightKg: 1.0,
      pieces: 1,
      notes: 'التسليم بعد الساعة 4 عصراً',
      clientReference: 'REF-1002',
      merchantName: 'متجر الأناقة الحديثة',
    },
    {
      orderNumber: 'ORD-2026-003',
      customerName: 'محمود سعيد إبراهيم',
      customerPhone: '01556677889',
      customerPhone2: '',
      governorate: 'الجيزة',
      city: 'الدقي',
      address: 'شارع مصدق عمارة 8',
      items: 'حذاء كاجوال جلد طبيعي مقاس 43',
      total: 890,
      codAmount: 890,
      weightKg: 2.0,
      pieces: 1,
      notes: 'مسموح المعاينة',
      clientReference: 'REF-1003',
      merchantName: 'متجر الأناقة الحديثة',
    },
  ];

  const wsOrders = XLSX.utils.json_to_sheet(sampleRows, {
    header: [
      'orderNumber',
      'customerName',
      'customerPhone',
      'customerPhone2',
      'governorate',
      'city',
      'address',
      'items',
      'total',
      'codAmount',
      'weightKg',
      'pieces',
      'notes',
      'clientReference',
      'merchantName',
    ],
  });

  // Set column widths
  wsOrders['!cols'] = [
    { wch: 16 }, // orderNumber
    { wch: 20 }, // customerName
    { wch: 15 }, // customerPhone
    { wch: 15 }, // customerPhone2
    { wch: 14 }, // governorate
    { wch: 16 }, // city
    { wch: 35 }, // address
    { wch: 35 }, // items
    { wch: 12 }, // total
    { wch: 12 }, // codAmount
    { wch: 10 }, // weightKg
    { wch: 8 },  // pieces
    { wch: 30 }, // notes
    { wch: 16 }, // clientReference
    { wch: 22 }, // merchantName
  ];

  XLSX.utils.book_append_sheet(wb, wsOrders, 'الأوردرات والطرود');

  // Sheet 2: Guidelines
  const guideRows = [
    { الحقل: 'orderNumber', الوصف: 'اختياري: رقم الطلب بالمتجر، في حال تركه فارغاً يتم توليده تلقائياً' },
    { الحقل: 'customerName', الوصف: 'إلزامي: اسم العميل المستلم' },
    { الحقل: 'customerPhone', الوصف: 'إلزامي: رقم هاتف العميل (يجب أن يبدأ بـ 01 أو كود دولي)' },
    { الحقل: 'customerPhone2', الوصف: 'اختياري: رقم هاتف بديل للعميل' },
    { الحقل: 'governorate', الوصف: 'إلزامي: المحافظة (مثل: القاهرة، الإسكندرية، الجيزة، الشرقية... إلخ)' },
    { الحقل: 'city', الوصف: 'اختياري: المدينة أو المركز أو الحي' },
    { الحقل: 'address', الوصف: 'إلزامي: تفاصيل العنوان واسم الشارع ورقم العمارة' },
    { الحقل: 'items', الوصف: 'اختياري: الأصناف والكميات (نص عادي أو JSON). وجوده ينشئ Order + Shipment' },
    { الحقل: 'total', الوصف: 'إجمالي قيمة الطلب بالأرقام. وجوده مع الأصناف ينشئ Order + Shipment' },
    { الحقل: 'codAmount', الوصف: 'المبلغ المطلوب تحصيله عند الاستلام (COD). إذا ترك فارغاً يؤخذ من total' },
    { الحقل: 'weightKg', الوصف: 'وزن الطرد بالكيلوجرام (الافتراضي: 1)' },
    { الحقل: 'pieces', الوصف: 'عدد القطع في الطرد (الافتراضي: 1)' },
    { الحقل: 'notes', الوصف: 'ملاحظات خاصة بمندوب الشحن أو مواعيد التسليم' },
    { الحقل: 'clientReference', الوصف: 'اختياري: كود مرجعي يمنع تكرار الشحنة' },
    { الحقل: 'merchantName', الوصف: 'اختياري: اسم المتجر/التاجر التابع له الأوردر' },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'تعليمات الاستيراد');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Parse raw rows from file buffer, csv, or json array
 */
function extractRows(req) {
  if (req.file && req.file.buffer) {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  if (Array.isArray(req.body?.rows)) return req.body.rows;
  if (Array.isArray(req.body)) return req.body;
  if (typeof req.body?.csv === 'string') {
    const wb = XLSX.read(req.body.csv, { type: 'string' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  return null;
}

/**
 * Helper to parse items string or JSON
 */
function parseItems(itemsInput) {
  if (!itemsInput) return [];
  if (Array.isArray(itemsInput)) return itemsInput;

  if (typeof itemsInput === 'string') {
    const trimmed = itemsInput.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }

    // Split by comma or semicolon
    const parts = trimmed.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    return parts.map((part) => {
      // Check pattern: "Item Name x 2" or "Item Name * 2"
      const match = part.match(/^(.*?)\s*[xX*×]\s*(\d+)$/);
      if (match) {
        return { productName: match[1].trim(), quantity: parseInt(match[2], 10) || 1 };
      }
      return { productName: part, quantity: 1 };
    });
  }

  return [];
}

/**
 * Process full orders & shipments bulk import
 */
async function importOrdersAndShipments({ companyId, userId, userRole, req }) {
  const prisma = getSharedPrismaClient();
  const rawRows = extractRows(req);

  if (!rawRows || !Array.isArray(rawRows)) {
    const err = new Error('يرجى إرسال ملف إكسيل صالح (file) أو مصفوفة بيانات (rows)');
    err.statusCode = 400;
    err.code = 'NO_DATA';
    throw err;
  }

  if (rawRows.length > 500) {
    const err = new Error('تجاوز الحد الأقصى المسموح به (500 صف)');
    err.statusCode = 400;
    err.code = 'MAX_ROWS_EXCEEDED';
    throw err;
  }

  const defaultMerchantId = req.body?.merchantId || req.shippingClientId || null;
  let successfulCount = 0;
  const failed = [];
  const results = [];
  const seenOrderNumbersInBatch = new Set();
  const seenRefsInBatch = new Set();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 1;
    const row = rawRows[i] || {};

    const rawOrderNumber = row.orderNumber || row['رقم الطلب'] || row['رقم الأوردر'] || '';
    const trimmedOrderNumber = rawOrderNumber ? String(rawOrderNumber).trim() : null;

    const customerName = String(
      row.customerName || row.recipientName || row['اسم العميل'] || row['اسم المستلم'] || row.name || ''
    ).trim();

    const rawPhone = row.customerPhone || row.recipientPhone || row['رقم الهاتف'] || row['الهاتف'] || row['هاتف العميل'] || row.phone || '';
    const cleanPhone = normalizePhone(rawPhone);

    const rawPhone2 = row.customerPhone2 || row.recipientPhone2 || row['هاتف إضافي'] || row['رقم بديل'] || '';
    const cleanPhone2 = normalizePhone(rawPhone2) || null;

    const rawGov = String(row.governorate || row.destinationGovernorate || row['المحافظة'] || '').trim();
    const city = String(row.city || row.destinationCity || row['المدينة'] || row['المركز'] || '').trim();
    const address = String(row.address || row.destinationAddress || row['العنوان'] || row['تفاصيل العنوان'] || '').trim();

    const rawItems = row.items !== undefined && row.items !== '' ? row.items : (row['الأصناف'] || row['المنتجات'] || null);
    const rawTotal = row.total !== undefined && row.total !== '' ? row.total : (row['الإجمالي'] || row['إجمالي الطلب'] || null);
    const rawCod = row.codAmount !== undefined && row.codAmount !== '' ? row.codAmount : (row.cod || row['مبلغ التحصيل'] || null);

    const rawWeight = row.weightKg !== undefined && row.weightKg !== '' ? row.weightKg : (row.weight || row['الوزن'] || 1);
    const rawPieces = row.pieces !== undefined && row.pieces !== '' ? row.pieces : (row['القطع'] || row['عدد القطع'] || 1);

    const rawRef = row.clientReference !== undefined && row.clientReference !== '' ? row.clientReference : (row.reference || row['مرجع العميل'] || null);
    const trimmedRef = rawRef ? String(rawRef).trim() : null;

    const notes = String(row.notes || row['ملاحظات'] || row['ملاحظات التسليم'] || '').trim();
    const merchantName = String(row.merchantName || row['اسم التاجر'] || row['التاجر'] || '').trim();
    const rowMerchantId = row.merchantId || defaultMerchantId;

    // 1. Phone validation (PHONE_REQUIRED)
    if (!cleanPhone) {
      failed.push({
        row: rowNum,
        reason: 'PHONE_REQUIRED',
        orderNumber: trimmedOrderNumber,
        clientReference: trimmedRef,
        message: 'رقم هاتف العميل مطلوب',
      });
      continue;
    }

    // 2. Total validation (INVALID_TOTAL)
    let totalNum = null;
    if (rawTotal !== null && rawTotal !== undefined && rawTotal !== '') {
      totalNum = Number(rawTotal);
      if (isNaN(totalNum) || totalNum < 0) {
        failed.push({
          row: rowNum,
          reason: 'INVALID_TOTAL',
          orderNumber: trimmedOrderNumber,
          clientReference: trimmedRef,
          message: 'إجمالي الطلب غير صحيح ويجب أن يكون رقماً غير سالب',
        });
        continue;
      }
    }

    // 3. Weight & Pieces validation
    const weightNum = rawWeight ? Number(rawWeight) : 1;
    if (isNaN(weightNum) || weightNum <= 0) {
      failed.push({
        row: rowNum,
        reason: 'INVALID_WEIGHT',
        orderNumber: trimmedOrderNumber,
        message: 'الوزن يجب أن يكون رقماً أكبر من صفر',
      });
      continue;
    }

    const piecesNum = rawPieces ? parseInt(rawPieces, 10) : 1;

    // 4. Duplicate checks (DUPLICATE)
    if (trimmedOrderNumber) {
      if (seenOrderNumbersInBatch.has(trimmedOrderNumber)) {
        failed.push({
          row: rowNum,
          reason: 'DUPLICATE',
          status: 409,
          orderNumber: trimmedOrderNumber,
          message: 'رقم الطلب مكرر في نفس الملف',
        });
        continue;
      }
      const existingOrder = await prisma.order.findFirst({
        where: { companyId, orderNumber: trimmedOrderNumber },
        select: { id: true, orderNumber: true },
      });
      if (existingOrder) {
        failed.push({
          row: rowNum,
          reason: 'DUPLICATE',
          status: 409,
          orderNumber: trimmedOrderNumber,
          message: 'رقم الطلب مكرر ومسجل مسبقاً',
        });
        continue;
      }
    }

    if (trimmedRef) {
      if (seenRefsInBatch.has(trimmedRef)) {
        failed.push({
          row: rowNum,
          reason: 'DUPLICATE',
          status: 409,
          clientReference: trimmedRef,
          message: 'مرجع العميل مكرر في نفس الملف',
        });
        continue;
      }
      const existingShipment = await prisma.shipment.findFirst({
        where: { companyId, clientReference: trimmedRef },
        select: { id: true, trackingNumber: true },
      });
      if (existingShipment) {
        failed.push({
          row: rowNum,
          reason: 'DUPLICATE',
          status: 409,
          clientReference: trimmedRef,
          trackingNumber: existingShipment.trackingNumber,
          message: 'مرجع العميل مكرر ومسجل مسبقاً',
        });
        continue;
      }
    }

    // 5. Governorate & Quoting verification (GOV_NOT_SERVED)
    if (!rawGov) {
      failed.push({
        row: rowNum,
        reason: 'GOV_NOT_SERVED',
        governorate: '',
        orderNumber: trimmedOrderNumber,
        message: 'المحافظة مطلوبة لاحتساب تسعير الشحن',
      });
      continue;
    }

    // Calculate COD amount
    const codNum = rawCod !== null && rawCod !== undefined && rawCod !== ''
      ? Number(rawCod)
      : (totalNum !== null ? totalNum : 0);

    let quote;
    try {
      quote = await quotePrice({
        companyId,
        merchantId: rowMerchantId || null,
        governorate: rawGov,
        city: city || null,
        weightKg: weightNum,
        codAmount: codNum > 0 ? codNum : 0,
        prisma,
      });
    } catch (quoteErr) {
      failed.push({
        row: rowNum,
        reason: 'GOV_NOT_SERVED',
        governorate: rawGov,
        orderNumber: trimmedOrderNumber,
        clientReference: trimmedRef,
        message: quoteErr.message || 'المحافظة غير مخدومة في بطاقة الأسعار',
      });
      continue;
    }

    // 6. Resolve Merchant if merchantName provided
    let finalMerchantId = rowMerchantId;
    if (merchantName && !finalMerchantId) {
      const foundMerchant = await prisma.merchant.findFirst({
        where: {
          companyId,
          name: { contains: merchantName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (foundMerchant) {
        finalMerchantId = foundMerchant.id;
      }
    }

    // Determine Mode: Full Order (Order + Shipment) OR Standalone Shipment
    const isFullOrder = Boolean(rawItems || (totalNum !== null && totalNum > 0));

    try {
      const trackingNumber = generateTrackingNumber();
      let createdOrderId = null;

      if (isFullOrder) {
        // Resolve or create Customer
        let customer = await prisma.customer.findFirst({
          where: { companyId, phone: cleanPhone },
          select: { id: true },
        });

        if (!customer) {
          const parts = (customerName || 'عميل').trim().split(/\s+/);
          const firstName = parts[0] || 'عميل';
          const lastName = parts.slice(1).join(' ') || '';
          customer = await prisma.customer.create({
            data: {
              companyId,
              firstName,
              lastName,
              phone: cleanPhone,
              phoneNormalized: cleanPhone.replace(/\D/g, ''),
              status: 'CUSTOMER',
            },
            select: { id: true },
          });
        }

        const effectiveOrderNumber = trimmedOrderNumber || `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const effectiveTotal = totalNum !== null ? totalNum : (codNum > 0 ? codNum : 0);
        const shippingFee = quote.price || 0;
        const subtotal = Math.max(0, effectiveTotal - (codNum > effectiveTotal ? 0 : shippingFee));

        const parsedItemsList = parseItems(rawItems);

        const createdOrder = await prisma.order.create({
          data: {
            companyId,
            orderNumber: effectiveOrderNumber,
            customerId: customer.id,
            customerName: customerName || 'عميل',
            customerPhone: cleanPhone,
            shippingAddress: address || quote.governorate,
            customerAddress: address || quote.governorate,
            city: city || null,
            governorate: quote.governorate,
            subtotal,
            shipping: shippingFee,
            total: effectiveTotal,
            currency: quote.currency || 'EGP',
            status: 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod: 'CASH',
            notes: notes || null,
            metadata: JSON.stringify({
              source: 'EXCEL_IMPORT',
              clientReference: trimmedRef || null,
              merchantName: merchantName || null,
            }),
          },
        });

        createdOrderId = createdOrder.id;

        // Create OrderItems if items were specified
        if (parsedItemsList.length > 0) {
          for (const it of parsedItemsList) {
            await prisma.orderItem.create({
              data: {
                orderId: createdOrder.id,
                productName: it.productName || 'صنف',
                quantity: it.quantity || 1,
                price: it.price !== undefined ? it.price : 0,
                total: (it.quantity || 1) * (it.price !== undefined ? it.price : 0),
              },
            });
          }
        }
      }

      // Create Shipment (linked to orderId if full order, or standalone)
      const createdShipment = await prisma.shipment.create({
        data: {
          companyId,
          orderId: createdOrderId,
          merchantId: finalMerchantId || null,
          recipientName: customerName || 'عميل',
          recipientPhone: cleanPhone,
          recipientPhone2: cleanPhone2,
          destinationGovernorate: quote.governorate,
          destinationCity: city || null,
          destinationAddress: address || quote.governorate,
          weight: quote.breakdown?.actualWeightKg ? Number(quote.breakdown.actualWeightKg) : weightNum,
          pieces: piecesNum,
          codAmount: codNum > 0 ? codNum : null,
          cost: quote.price,
          currency: quote.currency || 'EGP',
          clientRateCardId: quote.rateCardId || null,
          clientReference: trimmedRef,
          trackingNumber,
          barcode: trackingNumber.replace(/-/g, ''),
          status: 'PENDING',
          source: 'BULK_IMPORT',
          carrierType: 'MANUAL',
          contentDescription: typeof rawItems === 'string' ? rawItems : (rawItems ? JSON.stringify(rawItems) : null),
          metadata: JSON.stringify({
            orderNumber: trimmedOrderNumber || null,
            notes: notes || null,
            pricingSource: quote.source,
          }),
        },
      });

      // Record Event
      await recordShipmentEvent(prisma, {
        companyId,
        shipmentId: createdShipment.id,
        fromStatus: null,
        toStatus: 'PENDING',
        reasonCode: 'CREATED',
        notes: isFullOrder ? 'إنشاء أوردر وشحنة عبر استيراد إكسيل' : 'إنشاء شحنة مستقلة عبر استيراد إكسيل',
        actorType: userRole === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
        actorId: userId || null,
      });

      if (trimmedOrderNumber) seenOrderNumbersInBatch.add(trimmedOrderNumber);
      if (trimmedRef) seenRefsInBatch.add(trimmedRef);

      successfulCount++;
      results.push({
        row: rowNum,
        orderId: createdOrderId,
        orderNumber: trimmedOrderNumber || null,
        shipmentId: createdShipment.id,
        trackingNumber,
        isFullOrder,
      });
    } catch (insertErr) {
      failed.push({
        row: rowNum,
        reason: 'CREATE_FAILED',
        orderNumber: trimmedOrderNumber,
        clientReference: trimmedRef,
        message: insertErr.message || 'فشل حفظ السجل في قاعدة البيانات',
      });
    }
  }

  return {
    success: true,
    total: rawRows.length,
    successful: successfulCount,
    failed,
    results,
    errors: failed,
  };
}

module.exports = {
  importOrdersAndShipments,
  generateOrdersImportTemplate,
};
