const fetch = require('node-fetch');

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');
const { resolveProductMediaState } = require('../utils/productMediaUtils');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const { validateStock } = require('../utils/stockValidation');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone } = require('../utils/customerIdentity');

const PRODUCT_HEADER_ALIASES = {
  name: ['name', 'product name', 'اسم المنتج', 'الاسم', 'المنتج'],
  price: ['price', 'السعر', 'سعر', 'price egp', 'price_egp'],
  comparePrice: ['compare price', 'compareprice', 'old price', 'سعر قبل الخصم', 'السعر قبل الخصم'],
  cost: ['cost', 'التكلفة', 'تكلفة'],
  sku: ['sku', 'code', 'كود', 'رمز', 'رمز المنتج'],
  barcode: ['barcode', 'باركود'],
  stock: ['stock', 'quantity', 'qty', 'الكمية', 'المخزون'],
  category: ['category', 'الفئة', 'التصنيف', 'قسم'],
  description: ['description', 'الوصف', 'تفاصيل', 'المواصفات'],
  images: ['images', 'image', 'image urls', 'روابط الصور', 'صور', 'الصور'],
  tags: ['tags', 'وسوم', 'علامات'],
  trackInventory: ['track inventory', 'trackinventory', 'تتبع المخزون'],
  isActive: ['active', 'is active', 'نشط', 'مفعل']
};

const ORDER_HEADER_ALIASES = {
  orderNumber: ['order number', 'order_number', 'order no', 'orderno', 'رقم الطلب', 'رقم الاوردر'],
  customerName: ['customer name', 'customer', 'name', 'اسم العميل', 'العميل', 'اسم'],
  customerPhone: ['phone', 'customer phone', 'mobile', 'رقم الهاتف', 'الهاتف', 'جوال'],
  customerEmail: ['email', 'customer email', 'البريد', 'الايميل'],
  city: ['city', 'المدينة', 'مدينة'],
  governorate: ['governorate', 'المحافظة', 'محافظة'],
  address: ['address', 'العنوان', 'عنوان'],
  items: ['items', 'order items', 'products', 'المنتجات', 'بنود'],
  productName: ['product name', 'product', 'اسم المنتج'],
  productPrice: ['product price', 'price', 'سعر المنتج', 'السعر'],
  quantity: ['quantity', 'qty', 'الكمية'],
  productId: ['product id', 'productid', 'معرف المنتج'],
  sku: ['sku', 'code', 'كود'],
  status: ['status', 'حالة', 'الحالة'],
  paymentStatus: ['payment status', 'حالة الدفع'],
  paymentMethod: ['payment method', 'طريقة الدفع'],
  shipping: ['shipping', 'shipping cost', 'تكلفة الشحن', 'الشحن'],
  discount: ['discount', 'خصم'],
  tax: ['tax', 'ضريبة'],
  subtotal: ['subtotal', 'المجموع الفرعي'],
  total: ['total', 'الإجمالي'],
  notes: ['notes', 'ملاحظات']
};

const normalizeHeader = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
};

const buildAliasMap = (aliases) => {
  const aliasMap = new Map();
  Object.entries(aliases).forEach(([field, aliasList]) => {
    aliasList.forEach((alias) => {
      aliasMap.set(normalizeHeader(alias), field);
    });
  });
  return aliasMap;
};

const productAliasMap = buildAliasMap(PRODUCT_HEADER_ALIASES);
const orderAliasMap = buildAliasMap(ORDER_HEADER_ALIASES);

const ORDER_STATUS_VALUES = new Set([
  'PENDING',
  'CONFIRMED',
  'SCHEDULED',
  'READY_FOR_PROCESSING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'DUPLICATE_ORDER',
  'REFUNDED',
  'RETURNED',
  'PARTIALLY_REFUNDED',
  'WOO_TAGHEZ',
  'DRAFT'
]);

const PAYMENT_STATUS_VALUES = new Set(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

const PAYMENT_METHOD_VALUES = new Set([
  'CASH',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'PAYPAL',
  'STRIPE',
  'WALLET',
  'INSTAPAY',
  'VISA',
  'MASTERCARD',
  'VODAFONE_CASH'
]);

const parseSheetUrl = (input) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return { sheetId: null, gid: null };

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = idMatch ? idMatch[1] : (trimmed.match(/^[a-zA-Z0-9-_]{10,}$/) ? trimmed : null);
  const gidMatch = trimmed.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { sheetId, gid };
};

const buildExportUrl = (sheetId, gid) => {
  const safeGid = gid || '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${safeGid}`;
};

const fetchSheetCsv = async (sheetUrl, gidOverride) => {
  const { sheetId, gid } = parseSheetUrl(sheetUrl);
  if (!sheetId) {
    throw new Error('رابط Google Sheets غير صالح');
  }

  const exportUrl = buildExportUrl(sheetId, gidOverride || gid);
  const response = await fetch(exportUrl);

  if (!response.ok) {
    throw new Error('تعذر الوصول لملف Google Sheets. تأكد أن المشاركة عامة (Anyone with link).');
  }

  const csvText = await response.text();
  if (csvText.toLowerCase().includes('<html')) {
    throw new Error('الملف غير متاح للقراءة. يرجى تفعيل المشاركة العامة (Anyone with link).');
  }

  return csvText;
};

const parseCsvRows = (csvText) => {
  const XLSX = require('xlsx');
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBoolean = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'نعم', 'مفعل', 'نشط'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'لا', 'غير مفعل', 'غير نشط'].includes(normalized)) return false;
  return null;
};

const normalizeEnum = (value, allowedValues, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  return allowedValues.has(normalized) ? normalized : fallback;
};

const parseCustomerName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: 'عميل', lastName: 'جديد' };
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'عميل', lastName: 'جديد' };
  }

  return {
    firstName: parts[0] || 'عميل',
    lastName: parts.slice(1).join(' ') || 'جديد'
  };
};

const splitList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,|\n;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const buildOrderItemsFromRow = (order) => {
  const parsedItems = parseOrderItems(order.items);
  if (parsedItems.length > 0) {
    return parsedItems.map((item) => ({
      productName: item.productName ? String(item.productName).trim() : '',
      price: toNumber(item.price),
      quantity: parseInt(toNumber(item.quantity) || 1, 10),
      sku: item.sku ? String(item.sku).trim() : '',
      productId: item.productId ? String(item.productId).trim() : ''
    }));
  }

  if (order.productName || order.productId || order.sku || order.productPrice !== null) {
    return [{
      productName: order.productName ? String(order.productName).trim() : '',
      price: toNumber(order.productPrice),
      quantity: parseInt(toNumber(order.quantity) || 1, 10),
      sku: order.sku ? String(order.sku).trim() : '',
      productId: order.productId ? String(order.productId).trim() : ''
    }];
  }

  return [];
};

const buildImportNotes = (order) => {
  const lines = ['طلب مستورد من Google Sheets'];
  if (order.notes) {
    lines.push(`ملاحظات: ${order.notes}`);
  }
  return lines.join('\n');
};

const buildShippingAddress = (order, customerPhone) => {
  const governorate = order.governorate || order.city || 'غير محدد';
  const city = order.city || order.governorate || 'غير محدد';

  return {
    governorate,
    city,
    area: '',
    address: order.address || '',
    phone: customerPhone || '',
    country: 'مصر'
  };
};

const mapRowToProduct = (row) => {
  const mapped = {};

  Object.entries(row).forEach(([key, value]) => {
    const field = productAliasMap.get(normalizeHeader(key));
    if (field && (mapped[field] === undefined || mapped[field] === '')) {
      mapped[field] = value;
    }
  });

  return {
    name: mapped.name ? String(mapped.name).trim() : '',
    description: mapped.description ? String(mapped.description).trim() : '',
    price: toNumber(mapped.price),
    comparePrice: toNumber(mapped.comparePrice),
    cost: toNumber(mapped.cost),
    sku: mapped.sku ? String(mapped.sku).trim() : null,
    barcode: mapped.barcode ? String(mapped.barcode).trim() : null,
    stock: mapped.stock !== undefined ? parseInt(toNumber(mapped.stock) || 0, 10) : 0,
    category: mapped.category ? String(mapped.category).trim() : null,
    images: splitList(mapped.images),
    tags: splitList(mapped.tags),
    trackInventory: toBoolean(mapped.trackInventory),
    isActive: toBoolean(mapped.isActive)
  };
};

const mapRowToOrder = (row) => {
  const mapped = {};

  Object.entries(row).forEach(([key, value]) => {
    const field = orderAliasMap.get(normalizeHeader(key));
    if (field && (mapped[field] === undefined || mapped[field] === '')) {
      mapped[field] = value;
    }
  });

  return {
    orderNumber: mapped.orderNumber ? String(mapped.orderNumber).trim() : '',
    customerName: mapped.customerName ? String(mapped.customerName).trim() : '',
    customerPhone: mapped.customerPhone ? String(mapped.customerPhone).trim() : '',
    customerEmail: mapped.customerEmail ? String(mapped.customerEmail).trim() : '',
    city: mapped.city ? String(mapped.city).trim() : '',
    governorate: mapped.governorate ? String(mapped.governorate).trim() : '',
    address: mapped.address ? String(mapped.address).trim() : '',
    notes: mapped.notes ? String(mapped.notes).trim() : '',
    status: mapped.status ? String(mapped.status).trim() : '',
    paymentStatus: mapped.paymentStatus ? String(mapped.paymentStatus).trim() : '',
    paymentMethod: mapped.paymentMethod ? String(mapped.paymentMethod).trim() : '',
    shipping: toNumber(mapped.shipping),
    discount: toNumber(mapped.discount),
    tax: toNumber(mapped.tax),
    subtotal: toNumber(mapped.subtotal),
    total: toNumber(mapped.total),
    items: mapped.items,
    productName: mapped.productName ? String(mapped.productName).trim() : '',
    productPrice: toNumber(mapped.productPrice),
    quantity: mapped.quantity ? parseInt(toNumber(mapped.quantity) || 1, 10) : 1,
    productId: mapped.productId ? String(mapped.productId).trim() : '',
    sku: mapped.sku ? String(mapped.sku).trim() : ''
  };
};

const parseOrderItems = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => ({
      productName: String(item.productName || item.name || '').trim(),
      price: toNumber(item.price),
      quantity: parseInt(toNumber(item.quantity) || 1, 10),
      sku: item.sku ? String(item.sku).trim() : undefined,
      productId: item.productId ? String(item.productId).trim() : undefined
    })).filter((item) => item.productName && item.price !== null);
  }

  const raw = String(value).trim();
  if (!raw) return [];

  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parseOrderItems(parsed);
      }
    } catch (e) {
      // fallback to delimited parsing
    }
  }

  return raw
    .split(/;|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const segments = part.split('|').map((segment) => segment.trim());
      const [name, price, qty, sku] = segments;
      return {
        productName: name,
        price: toNumber(price),
        quantity: parseInt(toNumber(qty) || 1, 10),
        sku: sku ? String(sku).trim() : undefined
      };
    })
    .filter((item) => item.productName && item.price !== null);
};

const loadSheetRows = async (sheetUrl, gidOverride) => {
  const csvText = await fetchSheetCsv(sheetUrl, gidOverride);
  const rows = parseCsvRows(csvText);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { rows, columns };
};

const previewSheet = async (req, res) => {
  try {
    const { sheetUrl, gid } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ success: false, message: 'رابط Google Sheets مطلوب' });
    }

    const { rows, columns } = await loadSheetRows(sheetUrl, gid);
    const sample = rows.slice(0, 20);

    res.json({
      success: true,
      data: {
        columns,
        sample,
        totalRows: rows.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل جلب بيانات Google Sheets',
      error: error.message
    });
  }
};

const importProductsFromSheet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { sheetUrl, gid } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ success: false, message: 'رابط Google Sheets مطلوب' });
    }

    const { rows } = await loadSheetRows(sheetUrl, gid);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للاستيراد' });
    }

    const mappedProducts = rows.map(mapRowToProduct);
    const results = { imported: 0, skipped: 0, failed: 0, details: { skipped: [], failed: [] } };

    const validProducts = [];
    mappedProducts.forEach((product, index) => {
      if (!product.name || product.price === null) {
        results.failed += 1;
        results.details.failed.push({ row: index + 2, reason: 'اسم المنتج والسعر مطلوبان' });
        return;
      }
      validProducts.push(product);
    });

    const skus = [...new Set(validProducts.map((p) => p.sku).filter(Boolean))];
    const names = [...new Set(validProducts.map((p) => p.name))];

    const prisma = getSharedPrismaClient();
    const [existingBySku, existingByName] = await Promise.all([
      skus.length
        ? prisma.product.findMany({
            where: { companyId, sku: { in: skus, mode: 'insensitive' }, deletedAt: null },
            select: { sku: true }
          })
        : [],
      names.length
        ? prisma.product.findMany({
            where: { companyId, name: { in: names, mode: 'insensitive' }, deletedAt: null },
            select: { name: true }
          })
        : []
    ]);

    // مطابقة غير حساسة لحالة الأحرف (Postgres collation case-sensitive) + كشف التكرار داخل نفس الملف
    const existingSkus = new Set(existingBySku.map((p) => p.sku.trim().toLowerCase()));
    const existingNames = new Set(existingByName.map((p) => p.name.toLowerCase()));
    const seenSkus = new Set();
    const seenNames = new Set();

    const categoryNames = [...new Set(validProducts.map((p) => p.category).filter(Boolean))];
    const existingCategories = categoryNames.length
      ? await prisma.category.findMany({ where: { companyId, name: { in: categoryNames } } })
      : [];

    const categoryMap = new Map(
      existingCategories.map((category) => [category.name.toLowerCase(), category.id])
    );

    for (const product of validProducts) {
      try {
        const normalizedSkuKey = product.sku ? product.sku.trim().toLowerCase() : null;
        const normalizedNameKey = product.name.toLowerCase();

        // مكرر داخل نفس الملف — تخطي حتى لا يتكرر الإنشاء
        if (normalizedSkuKey && seenSkus.has(normalizedSkuKey)) {
          results.skipped += 1;
          results.details.skipped.push({ name: product.name, reason: 'SKU مكرر داخل الملف نفسه' });
          continue;
        }
        if (!normalizedSkuKey && seenNames.has(normalizedNameKey)) {
          results.skipped += 1;
          results.details.skipped.push({ name: product.name, reason: 'منتج مكرر داخل الملف نفسه' });
          continue;
        }

        if (normalizedSkuKey && existingSkus.has(normalizedSkuKey)) {
          results.skipped += 1;
          results.details.skipped.push({ name: product.name, reason: 'SKU موجود بالفعل' });
          continue;
        }

        if (!normalizedSkuKey && existingNames.has(normalizedNameKey)) {
          results.skipped += 1;
          results.details.skipped.push({ name: product.name, reason: 'المنتج موجود بالفعل' });
          continue;
        }

        if (normalizedSkuKey) seenSkus.add(normalizedSkuKey);
        else seenNames.add(normalizedNameKey);

        let categoryId = null;
        if (product.category) {
          const normalizedCategory = product.category.toLowerCase();
          if (categoryMap.has(normalizedCategory)) {
            categoryId = categoryMap.get(normalizedCategory);
          } else {
            const newCategory = await prisma.category.create({
              data: {
                name: product.category,
                companyId
              }
            });
            categoryId = newCategory.id;
            categoryMap.set(normalizedCategory, newCategory.id);
          }
        }

        const resolvedMedia = resolveProductMediaState({
          currentImages: [],
          currentMainImage: null,
          nextImages: product.images,
        });

        const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
        if (!productLimitCheck.allowed) {
          results.failed += 1;
          results.details.failed.push({ name: product.name, reason: productLimitCheck.payload.message });
          continue;
        }

        await prisma.product.create({
          data: {
            name: product.name,
            description: product.description || '',
            price: product.price,
            comparePrice: product.comparePrice,
            cost: product.cost,
            sku: product.sku,
            barcode: product.barcode,
            stock: validateStock(product.stock).ok ? (product.stock || 0) : 0,
            trackInventory: product.trackInventory !== null ? product.trackInventory : true,
            isActive: product.isActive !== null ? product.isActive : true,
            categoryId,
            companyId,
            images: resolvedMedia.images.length ? JSON.stringify(resolvedMedia.images) : null,
            mainImage: resolvedMedia.mainImage,
            tags: product.tags.length ? JSON.stringify(product.tags) : null,
            source: 'google-sheets'
          }
        });

        results.imported += 1;
      } catch (error) {
        results.failed += 1;
        results.details.failed.push({ name: product.name, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: 'تم استيراد المنتجات من Google Sheets',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد المنتجات من Google Sheets',
      error: error.message
    });
  }
};

const importOrdersFromSheet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { sheetUrl, gid } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ success: false, message: 'رابط Google Sheets مطلوب' });
    }

    const { rows } = await loadSheetRows(sheetUrl, gid);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للاستيراد' });
    }

    const mappedOrders = rows.map(mapRowToOrder);
    const preparedOrders = mappedOrders.map((order, index) => ({
      order,
      items: buildOrderItemsFromRow(order),
      rowNumber: index + 2
    }));

    const prisma = getSharedPrismaClient();

    const orderNumbers = preparedOrders
      .map((entry) => entry.order.orderNumber)
      .filter((value) => value && String(value).trim());

    const existingOrders = orderNumbers.length
      ? await prisma.order.findMany({
        where: { companyId, orderNumber: { in: orderNumbers.map((value) => String(value).trim()) } },
        select: { orderNumber: true }
      })
      : [];

    const existingOrderNumbers = new Set(existingOrders.map((order) => order.orderNumber));
    const seenOrderNumbers = new Set();

    const skuSet = new Set();
    const productIdSet = new Set();
    preparedOrders.forEach(({ items }) => {
      items.forEach((item) => {
        if (item.sku) skuSet.add(item.sku);
        if (item.productId) productIdSet.add(item.productId);
      });
    });

    const [productsBySku, productsById] = await Promise.all([
      skuSet.size
        ? prisma.product.findMany({
          where: { companyId, sku: { in: Array.from(skuSet) } },
          select: { id: true, sku: true, name: true, price: true }
        })
        : [],
      productIdSet.size
        ? prisma.product.findMany({
          where: { companyId, id: { in: Array.from(productIdSet) } },
          select: { id: true, sku: true, name: true, price: true }
        })
        : []
    ]);

    const productBySku = new Map(productsBySku.map((product) => [product.sku, product]));
    const productById = new Map(productsById.map((product) => [product.id, product]));

    const results = { imported: 0, skipped: 0, failed: 0, details: { skipped: [], failed: [] } };

    for (const entry of preparedOrders) {
      const { order, items, rowNumber } = entry;

      const hasCustomerInfo = !!(order.customerName || order.customerPhone || order.customerEmail);
      if (!hasCustomerInfo) {
        results.failed += 1;
        results.details.failed.push({ row: rowNumber, reason: 'بيانات العميل مطلوبة (الاسم أو الهاتف أو البريد)' });
        continue;
      }

      if (!items.length) {
        results.failed += 1;
        results.details.failed.push({ row: rowNumber, reason: 'بنود الطلب مطلوبة' });
        continue;
      }

      if (order.orderNumber) {
        const normalizedOrderNumber = String(order.orderNumber).trim();
        if (normalizedOrderNumber) {
          if (seenOrderNumbers.has(normalizedOrderNumber)) {
            results.skipped += 1;
            results.details.skipped.push({ row: rowNumber, reason: 'رقم الطلب مكرر داخل الملف' });
            continue;
          }
          if (existingOrderNumbers.has(normalizedOrderNumber)) {
            results.skipped += 1;
            results.details.skipped.push({ row: rowNumber, reason: 'رقم الطلب موجود بالفعل' });
            continue;
          }
          order.orderNumber = normalizedOrderNumber;
          seenOrderNumbers.add(normalizedOrderNumber);
        } else {
          order.orderNumber = '';
        }
      }

      const enrichedItems = items.map((item) => {
        const normalizedItem = {
          productName: item.productName || '',
          price: item.price,
          quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
          sku: item.sku || '',
          productId: item.productId || ''
        };

        let matchedProduct = null;
        if (normalizedItem.productId && productById.has(normalizedItem.productId)) {
          matchedProduct = productById.get(normalizedItem.productId);
        } else if (normalizedItem.sku && productBySku.has(normalizedItem.sku)) {
          matchedProduct = productBySku.get(normalizedItem.sku);
        }

        if (matchedProduct) {
          if (!normalizedItem.productId) normalizedItem.productId = matchedProduct.id;
          if (!normalizedItem.productName) normalizedItem.productName = matchedProduct.name;
          if (normalizedItem.price === null) normalizedItem.price = toNumber(matchedProduct.price);
          if (!normalizedItem.sku && matchedProduct.sku) normalizedItem.sku = matchedProduct.sku;
        }

        return normalizedItem;
      });

      const invalidItem = enrichedItems.find((item) => {
        const hasIdentifier = item.productName || item.productId || item.sku;
        return item.price === null || !hasIdentifier;
      });

      if (invalidItem) {
        results.failed += 1;
        results.details.failed.push({ row: rowNumber, reason: 'كل بند يجب أن يحتوي على اسم/كود المنتج وسعر' });
        continue;
      }

      try {
        let customer = null;
        if (order.customerPhone) {
          customer = await findCustomerByPhone(prisma, order.customerPhone, companyId);
        }
        if (!customer && order.customerEmail) {
          customer = await prisma.customer.findFirst({
            where: { companyId, email: order.customerEmail }
          });
        }

        if (!customer) {
          const nameParts = parseCustomerName(order.customerName);
          customer = await prisma.customer.create({
            data: {
              firstName: nameParts.firstName,
              lastName: nameParts.lastName,
              phone: order.customerPhone || null,
              phoneNormalized: toCanonicalE164(order.customerPhone),
              email: order.customerEmail || null,
              status: 'ACTIVE',
              companyId,
              metadata: JSON.stringify({ source: 'google-sheets' })
            }
          });
        } else {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { status: 'ACTIVE', updatedAt: new Date() }
          }).catch(() => null);
        }

        const subtotalFromItems = enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotal = order.subtotal !== null ? order.subtotal : subtotalFromItems;
        const shipping = order.shipping !== null ? order.shipping : 0;
        const tax = order.tax !== null ? order.tax : 0;
        let discount = order.discount;

        if (discount === null || discount === undefined) {
          discount = 0;
          if (order.total !== null && order.total !== undefined) {
            const inferredDiscount = subtotal + shipping + tax - order.total;
            if (Number.isFinite(inferredDiscount) && inferredDiscount > 0) {
              discount = inferredDiscount;
            }
          }
        }

        const total = subtotal + shipping + tax - discount;

        const orderNumber = order.orderNumber || await orderService.generateOrderNumber(companyId);
        const status = normalizeEnum(order.status, ORDER_STATUS_VALUES, 'PENDING');
        const paymentStatus = normalizeEnum(order.paymentStatus, PAYMENT_STATUS_VALUES, 'PENDING');
        const paymentMethod = normalizeEnum(order.paymentMethod, PAYMENT_METHOD_VALUES, 'CASH');
        const customerName = order.customerName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عميل جديد';
        const customerPhone = order.customerPhone || customer.phone || null;
        const customerEmail = order.customerEmail || customer.email || null;
        const city = order.city || order.governorate || 'غير محدد';
        const governorate = order.governorate || order.city || 'غير محدد';
        const shippingAddress = buildShippingAddress(order, customerPhone);

        const orderItemsData = enrichedItems.map((item) => ({
          productId: item.productId || null,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          productName: item.productName || null,
          productSku: item.sku || null,
          extractionSource: 'import',
          confidence: 1,
          metadata: JSON.stringify({ source: 'google-sheets' })
        }));

        const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
        if (!orderLimitCheck.allowed) {
          results.failed += 1;
          results.details.failed.push({ row: rowNumber, reason: orderLimitCheck.payload.message });
          continue;
        }

        await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            companyId,
            status,
            paymentStatus,
            paymentMethod,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            currency: 'EGP',
            notes: buildImportNotes(order),
            shippingAddress: JSON.stringify(shippingAddress),
            billingAddress: JSON.stringify(shippingAddress),
            customerName,
            customerPhone,
            customerEmail,
            city,
            governorate,
            customerAddress: order.address || '',
            dataQuality: JSON.stringify({ source: 'google-sheets' }),
            extractionMethod: 'import',
            sourceType: 'import',
            extractionTimestamp: new Date(),
            validationStatus: 'pending',
            confidence: 1,
            orderSource: 'INTERNAL_IMPORT',
            metadata: JSON.stringify({ source: 'google-sheets', row: rowNumber }),
            orderItems: {
              create: orderItemsData
            }
          }
        });

        results.imported += 1;
      } catch (error) {
        results.failed += 1;
        results.details.failed.push({ row: rowNumber, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: 'تم استيراد الطلبات من Google Sheets',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد الطلبات من Google Sheets',
      error: error.message
    });
  }
};

const exportProductsToCsv = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const products = await prisma.product.findMany({
      where: { companyId },
      include: { category: true }
    });

    const rows = products.map((product) => ({
      name: product.name,
      price: Number(product.price || 0),
      stock: product.stock || 0,
      sku: product.sku || '',
      category: product.category?.name || '',
      description: product.description || '',
      images: (() => {
        try {
          const imgs = product.images ? JSON.parse(product.images) : [];
          return Array.isArray(imgs) ? imgs.join(',') : '';
        } catch (e) {
          return '';
        }
      })()
    }));

    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const csvWithBom = `\uFEFF${csv}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csvWithBom);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل تصدير المنتجات',
      error: error.message
    });
  }
};

const exportOrdersToCsv = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const orders = await prisma.order.findMany({
      where: { companyId },
      include: { customer: true, orderItems: true },
      orderBy: { createdAt: 'desc' }
    });

    const rows = orders.map((order) => {
      let parsedAddress = {};
      try {
        parsedAddress = order.shippingAddress ? JSON.parse(order.shippingAddress) : {};
      } catch (error) {
        parsedAddress = {};
      }

      const customerName = order.customerName || (order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.trim() : '');
      const customerPhone = order.customerPhone || order.customer?.phone || '';
      const customerEmail = order.customerEmail || order.customer?.email || '';
      const city = order.city || parsedAddress.city || '';
      const governorate = order.governorate || parsedAddress.governorate || '';
      const address = order.customerAddress || parsedAddress.address || '';

      const items = (order.orderItems || [])
        .map((item) => {
          const name = item.productName || '';
          const price = Number(item.price || 0);
          const qty = item.quantity || 1;
          const sku = item.productSku || '';
          return sku ? `${name}|${price}|${qty}|${sku}` : `${name}|${price}|${qty}`;
        })
        .join('; ');

      return {
        order_number: order.orderNumber,
        created_at: order.createdAt ? new Date(order.createdAt).toISOString() : '',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        city,
        governorate,
        address,
        items,
        status: order.status,
        payment_status: order.paymentStatus,
        payment_method: order.paymentMethod,
        shipping: Number(order.shipping || 0),
        discount: Number(order.discount || 0),
        tax: Number(order.tax || 0),
        subtotal: Number(order.subtotal || 0),
        total: Number(order.total || 0),
        notes: order.notes || ''
      };
    });

    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const csvWithBom = `\uFEFF${csv}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csvWithBom);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل تصدير الطلبات',
      error: error.message
    });
  }
};

const downloadProductsTemplate = async (_req, res) => {
  const headers = [{
    name: '',
    price: '',
    stock: '',
    sku: '',
    category: '',
    description: '',
    images: ''
  }];

  const XLSX = require('xlsx');
  const ws = XLSX.utils.json_to_sheet(headers);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const csvWithBom = `\uFEFF${csv}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
  res.send(csvWithBom);
};

const downloadOrdersTemplate = async (_req, res) => {
  const headers = [{
    order_number: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    city: '',
    governorate: '',
    address: '',
    items: '',
    status: '',
    payment_status: '',
    payment_method: '',
    shipping: '',
    discount: '',
    tax: '',
    subtotal: '',
    total: '',
    notes: ''
  }];

  const XLSX = require('xlsx');
  const ws = XLSX.utils.json_to_sheet(headers);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const csvWithBom = `\uFEFF${csv}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="orders-template.csv"');
  res.send(csvWithBom);
};

module.exports = {
  previewSheet,
  importProductsFromSheet,
  importOrdersFromSheet,
  exportProductsToCsv,
  exportOrdersToCsv,
  downloadProductsTemplate,
  downloadOrdersTemplate
};
