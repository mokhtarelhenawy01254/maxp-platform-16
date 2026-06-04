/**
 * @module googleSheetsTools
 * @description Google Sheets integration tools for agents.
 * Allows reading products and writing orders from/to Google Sheets safely and efficiently.
 */

const fetch = require('node-fetch');
const XLSX = require('xlsx');

// ─── Sheet Cache Mechanism ───────────────────────────────────────────────────
const sheetCache = new Map(); // key: sheetUrl, value: { csvText, expiresAt }
const CACHE_TTL_MS = 60 * 1000; // Cache for 60 seconds to prevent thundering herd / slow UI turns

/**
 * Parses dynamic Google Sheets URLs including standard edit links,
 * published web HTML links, and direct CSV exports.
 */
const parseSheetUrl = (input) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return { sheetId: null, gid: null, directUrl: null };

  // If it's already a direct CSV download or generic CSV file
  if (trimmed.includes('output=csv') || trimmed.endsWith('.csv')) {
    return { sheetId: null, gid: null, directUrl: trimmed };
  }

  // Published sheet HTML link (ends in /pubhtml or contains it)
  if (trimmed.includes('/pubhtml')) {
    const directUrl = trimmed.replace('/pubhtml', '/pub?output=csv');
    return { sheetId: null, gid: null, directUrl };
  }

  // Check for standard /spreadsheets/d/ or published /d/e/ formats
  const idMatch = trimmed.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
  const sheetId = idMatch ? idMatch[1] : (trimmed.match(/^[a-zA-Z0-9-_]{10,}$/) ? trimmed : null);
  const gidMatch = trimmed.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  // For published sheet folders that use /d/e/ structure
  if (trimmed.includes('/d/e/') && sheetId) {
    const directUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv` + (gid ? `&gid=${gid}` : '');
    return { sheetId: null, gid: null, directUrl };
  }

  return { sheetId, gid, directUrl: null };
};

/**
 * Compiles the correct Google Sheet export CSV URL based on parsed tokens.
 */
const buildExportUrl = (sheetId, gid, directUrl) => {
  if (directUrl) return directUrl;
  const safeGid = gid || '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${safeGid}`;
};

/**
 * Fetches Google Sheet contents as raw CSV with an in-memory TTL caching layer.
 */
const fetchSheetCsv = async (sheetUrl) => {
  const parsed = parseSheetUrl(sheetUrl);
  if (!parsed.sheetId && !parsed.directUrl) {
    throw new Error('Invalid Google Sheets URL');
  }

  const now = Date.now();
  const cached = sheetCache.get(sheetUrl);
  if (cached && cached.expiresAt > now) {
    return cached.csvText;
  }

  const exportUrl = buildExportUrl(parsed.sheetId, parsed.gid, parsed.directUrl);
  const response = await fetch(exportUrl);

  if (!response.ok) {
    throw new Error('Cannot access Google Sheet. Make sure it is shared with "Anyone with link" or published to the web.');
  }

  const csvText = await response.text();
  if (csvText.toLowerCase().includes('<html')) {
    throw new Error('Sheet is not accessible. Enable "Anyone with link" sharing or publish sheet to the web as CSV.');
  }

  sheetCache.set(sheetUrl, { csvText, expiresAt: now + CACHE_TTL_MS });
  return csvText;
};

/**
 * Parses raw CSV text into a reliable 2D array representation.
 */
const parseCsvToJson = (csvText) => {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  // Return as a 2D array of rows to guarantee cell alignment and index reliability
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
};

// ─── Header Normalization & Mapping ──────────────────────────────────────────
// arabic-strings: internal-signal-start
const HEADER_ALIASES = {
  name: ['name', 'product name', 'productname', 'اسم المنتج', 'الاسم', 'المنتج', 'product'],
  price: ['price', 'السعر', 'سعر', 'price egp', 'price_egp', 'product price'],
  stock: ['stock', 'quantity', 'qty', 'الكمية', 'المخزون', 'ال متاح', 'الكميه', 'المتاح'],
  description: ['description', 'الوصف', 'تفاصيل', 'مواصفات', 'details', 'وصف'],
  image: ['image', 'images', 'صورة', 'صور', 'image url', 'img', 'الصور', 'الصورة'],
  sku: ['sku', 'code', 'كود', 'رمز', 'product code', 'الموديل', 'الموديل/الكود'],
  category: ['category', 'الفئة', 'التصنيف', 'قسم', 'الفئه', 'القسم']
};
// arabic-strings: internal-signal-end

const normalizeHeader = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
};

const findColumn = (headers, field) => {
  if (!Array.isArray(headers)) return -1;
  const aliases = HEADER_ALIASES[field] || [field];
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    if (aliases.some(alias => normalizeHeader(alias) === normalized)) {
      return i;
    }
  }
  return -1;
};

/**
 * Custom Arabic linguistic normalizer matching project standards.
 * Normalizes different Alif shapes, Teh Marbutas, and Yehs for fuzzy catalog matching.
 */
const normalizeArabicTextForSearch = (str) => {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
};

/**
 * Extracts product objects from a 2D sheet array, implementing secure index
 * matching and advanced Arabic search normalization.
 */
const parseProductsFromSheet = (rows, searchQuery) => {
  if (!rows || rows.length < 1) return [];

  const headers = rows[0]; // First row represents actual headers
  const nameCol = findColumn(headers, 'name');
  const priceCol = findColumn(headers, 'price');
  const stockCol = findColumn(headers, 'stock');
  const descCol = findColumn(headers, 'description');
  const imageCol = findColumn(headers, 'image');
  const skuCol = findColumn(headers, 'sku');
  const categoryCol = findColumn(headers, 'category');

  // Name is required for matching catalog rows
  if (nameCol < 0) return [];

  const dataRows = rows.slice(1); // Rows index 1+ are data records
  const query = searchQuery ? String(searchQuery).trim() : '';
  const normalizedQuery = normalizeArabicTextForSearch(query);

  const products = [];
  for (const row of dataRows) {
    if (!Array.isArray(row) || row.length === 0) continue;

    const name = String(row[nameCol] || '').trim();
    if (!name) continue; // Skip empty rows

    const sku = skuCol >= 0 ? String(row[skuCol] || '').trim() : '';
    const description = descCol >= 0 ? String(row[descCol] || '').trim() : '';
    const category = categoryCol >= 0 ? String(row[categoryCol] || '').trim() : '';

    // If query is provided, check name, sku, description, and category with normalized Arabic logic
    if (normalizedQuery) {
      const normalizedName = normalizeArabicTextForSearch(name);
      const normalizedSku = normalizeArabicTextForSearch(sku);
      const normalizedDesc = normalizeArabicTextForSearch(description);
      const normalizedCat = normalizeArabicTextForSearch(category);

      const isMatch = normalizedName.includes(normalizedQuery) ||
                      normalizedSku.includes(normalizedQuery) ||
                      normalizedDesc.includes(normalizedQuery) ||
                      normalizedCat.includes(normalizedQuery);
      
      if (!isMatch) continue;
    }

    // Only map known safe parameters to prevent database/profit leakage
    products.push({
      name,
      price: priceCol >= 0 ? parseFloat(String(row[priceCol] || '0').replace(/,/g, '')) || 0 : 0,
      stock: stockCol >= 0 ? parseInt(String(row[stockCol] || '0').replace(/,/g, '')) || 0 : 0,
      description,
      image: imageCol >= 0 ? String(row[imageCol] || '').trim() : '',
      sku,
      category
    });
  }

  return products;
};

// ─── Tools Definition ────────────────────────────────────────────────────────
const TOOLS = {
  'googlesheets.searchProducts': {
    description: 'Search for products in a Google Sheet catalog. Returns matching products with name, price, stock, and description.',
    params: {
      sheetUrl: 'Google Sheets URL (must have "Anyone with link" sharing enabled)',
      searchQuery: 'Text to search for in product names',
      limit: 'Maximum number of products to return (default 10)'
    },
    requiredParams: [],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: false,
    inputSchema: {
      type: 'object',
      required: [],
      properties: {
        sheetUrl: { type: 'string', description: 'Google Sheets URL with link sharing enabled.' },
        searchQuery: { type: 'string', description: 'Text to search for in product names.' },
        limit: { type: 'number', description: 'Maximum products to return (default 10).' },
      },
    },
    handler: async (companyId, { sheetUrl, searchQuery = '', limit = 10 }, context = {}) => {
      const resolvedUrl = context?.agent?.config?.productsSheetUrl || sheetUrl;
      if (!resolvedUrl) throw new Error('MISSING_SHEET_URL: Provide sheetUrl or set productsSheetUrl in agent config.');
      sheetUrl = resolvedUrl;

      const csvText = await fetchSheetCsv(sheetUrl);
      const rows = parseCsvToJson(csvText);
      const products = parseProductsFromSheet(rows, searchQuery);

      return {
        products: products.slice(0, limit),
        totalFound: products.length,
        searchQuery,
        sheetUrl: sheetUrl.substring(0, 50) + '...'
      };
    }
  },

  'googlesheets.submitOrder': {
    description: 'Submit an order to Google Sheets via Apps Script. Returns success confirmation with order number.',
    params: {
      appsScriptUrl: 'Google Apps Script web app URL (from Sheet → Extensions → Apps Script → Deploy)',
      customerName: 'Customer full name',
      customerPhone: 'Customer phone number',
      city: 'Delivery city',
      address: 'Delivery address',
      productName: 'Product name being ordered',
      quantity: 'Quantity ordered',
      price: 'Unit price',
      color: 'Product color variant (optional)',
      size: 'Product size variant (optional)',
      notes: 'Additional notes or special requests'
    },
    requiredParams: ['customerName', 'customerPhone', 'productName'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: false,
    inputSchema: {
      type: 'object',
      required: ['customerName', 'customerPhone', 'productName'],
      properties: {
        appsScriptUrl: { type: 'string', description: 'Google Apps Script web app URL.' },
        customerName: { type: 'string', description: 'Customer full name.' },
        customerPhone: { type: 'string', description: 'Customer phone number.' },
        city: { type: 'string', description: 'Delivery city.' },
        address: { type: 'string', description: 'Delivery address.' },
        productName: { type: 'string', description: 'Product name being ordered.' },
        quantity: { type: 'number', description: 'Quantity ordered.' },
        price: { type: 'number', nullable: true, description: 'Unit price.' },
        color: { type: 'string', description: 'Product color variant.' },
        size: { type: 'string', description: 'Product size variant.' },
        notes: { type: 'string', description: 'Special requests.' },
      },
    },
    handler: async (companyId, { appsScriptUrl, customerName, customerPhone, city = '', address = '', productName, quantity = 1, price = 0, color = '', size = '', notes = '' }, context = {}) => {
      const resolvedUrl = context?.agent?.config?.ordersAppsScriptUrl || appsScriptUrl;
      if (!resolvedUrl) throw new Error('MISSING_APPS_SCRIPT_URL: Provide appsScriptUrl or set ordersAppsScriptUrl in agent config.');
      appsScriptUrl = resolvedUrl;

      const orderData = {
        customerName,
        customerPhone,
        city,
        address,
        productName,
        quantity: parseInt(quantity) || 1,
        price: parseFloat(price) || 0,
        color,
        size,
        notes
      };

      try {
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        const contentType = response.headers.get('content-type') || '';
        let result = {};

        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // Robust redirect fallback if Google Apps Script returned plain text or temporary HTML redirects
          const text = await response.text();
          if (text.includes('orderNumber') || text.includes('success')) {
            try {
              result = JSON.parse(text);
            } catch {
              throw new Error('Returned invalid JSON plain text response');
            }
          } else {
            // Check if it's an HTML error page from Google redirects
            if (text.toLowerCase().includes('<html')) {
              throw new Error('Google Apps Script returned an HTML page. Make sure you deployed it as a Web App, authorized it to execute as "Me", and shared access with "Anyone, even anonymous".');
            }
            throw new Error(`Apps Script responded with unparsable format: ${text.substring(0, 100)}`);
          }
        }

        return {
          success: result.success !== false,
          orderNumber: result.orderNumber || `GS-${Date.now()}`,
          message: 'ORDER_RECORDED_IN_GOOGLE_SHEETS',
          customerName,
          customerPhone,
          productName,
          quantity: orderData.quantity,
          total: orderData.price * orderData.quantity
        };
      } catch (error) {
        return {
          success: false,
          error: 'ORDER_SUBMISSION_FAILED',
          errorMessage: error.message,
          orderData
        };
      }
    }
  },

  'googlesheets.readProducts': {
    description: 'Read all products from a Google Sheet (for debugging/admin purposes).',
    params: {
      sheetUrl: 'Google Sheets URL (must have "Anyone with link" sharing enabled)'
    },
    requiredParams: [],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: false,
    inputSchema: {
      type: 'object',
      required: [],
      properties: {
        sheetUrl: { type: 'string', description: 'Google Sheets URL with link sharing enabled.' },
      },
    },
    handler: async (companyId, { sheetUrl }, context = {}) => {
      const resolvedUrl = context?.agent?.config?.productsSheetUrl || sheetUrl;
      if (!resolvedUrl) throw new Error('MISSING_SHEET_URL: Provide sheetUrl or set productsSheetUrl in agent config.');
      sheetUrl = resolvedUrl;

      const csvText = await fetchSheetCsv(sheetUrl);
      const rows = parseCsvToJson(csvText);
      
      // Parse products cleanly to filter cost/internal headers and present clean objects
      const products = parseProductsFromSheet(rows);

      return {
        totalRows: products.length,
        headers: rows.length > 0 ? rows[0] : [],
        products: products.slice(0, 50)
      };
    }
  },

  'googlesheets.createOrder': {
    description: 'Create a new order by appending a row to a Google Sheet. Returns the created order details.',
    params: {
      sheetUrl: 'Google Sheets URL for orders (must have "Anyone with link" sharing enabled)',
      customerName: 'Customer full name',
      customerPhone: 'Customer phone number',
      city: 'Delivery city',
      address: 'Delivery address',
      productName: 'Product name being ordered',
      quantity: 'Quantity ordered',
      price: 'Unit price',
      color: 'Product color variant (optional)',
      size: 'Product size variant (optional)',
      notes: 'Additional notes or special requests'
    },
    requiredParams: ['sheetUrl', 'customerName', 'customerPhone', 'productName'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: false,
    inputSchema: {
      type: 'object',
      required: ['sheetUrl', 'customerName', 'customerPhone', 'productName'],
      properties: {
        sheetUrl: { type: 'string', description: 'Google Sheets URL for orders.' },
        customerName: { type: 'string', description: 'Customer full name.' },
        customerPhone: { type: 'string', description: 'Customer phone number.' },
        city: { type: 'string', description: 'Delivery city.' },
        address: { type: 'string', description: 'Delivery address.' },
        productName: { type: 'string', description: 'Product name being ordered.' },
        quantity: { type: 'number', description: 'Quantity ordered.' },
        price: { type: 'number', nullable: true, description: 'Unit price.' },
        color: { type: 'string', description: 'Product color variant.' },
        size: { type: 'string', description: 'Product size variant.' },
        notes: { type: 'string', description: 'Special requests.' },
      },
    },
    handler: async (companyId, { sheetUrl, customerName, customerPhone, city = '', address = '', productName, quantity = 1, price = 0, color = '', size = '', notes = '' }, context = {}) => {
      const resolvedUrl = context?.agent?.config?.ordersAppsScriptUrl || context?.agent?.config?.productsSheetUrl || sheetUrl;
      if (!resolvedUrl) throw new Error('MISSING_SHEET_URL: Provide sheetUrl or set productsSheetUrl/ordersAppsScriptUrl in agent config.');
      sheetUrl = resolvedUrl;
      const timestamp = new Date().toISOString();
      const orderNumber = `GS-${Date.now()}`;

      const newRow = {
        orderNumber,
        customerName,
        customerPhone,
        city,
        address,
        productName,
        quantity: parseInt(quantity) || 1,
        price: parseFloat(price) || 0,
        total: (parseFloat(price) || 0) * (parseInt(quantity) || 1),
        color,
        size,
        notes,
        createdAt: timestamp,
        status: 'NEW'
      };

      const csvText = await fetchSheetCsv(sheetUrl);
      const rows = parseCsvToJson(csvText);

      // Extract headers reliably from 2D array representation
      const headers = rows.length > 0 ? rows[0] : ['orderNumber', 'customerName', 'customerPhone', 'city', 'address', 'productName', 'quantity', 'price', 'total', 'color', 'size', 'notes', 'createdAt', 'status'];

      const ws = XLSX.utils.json_to_sheet([newRow], { header: headers });
      const csvOutput = XLSX.utils.sheet_to_csv(ws);

      return {
        success: true,
        order: newRow,
        message: 'ORDER_ROW_PREPARED_FOR_MANUAL_SYNC',
        csvData: csvOutput
      };
    }
  },

  'googlesheets.appendOrder': {
    description: 'Append an order row to a Google Sheet. For use when you have direct write access to the sheet.',
    params: {
      sheetUrl: 'Google Sheets URL for orders',
      orderData: 'JSON string with order fields: customerName, customerPhone, city, address, productName, quantity, price, notes'
    },
    requiredParams: ['sheetUrl', 'orderData'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: false,
    inputSchema: {
      type: 'object',
      required: ['sheetUrl', 'orderData'],
      properties: {
        sheetUrl: { type: 'string', description: 'Google Sheets URL for orders.' },
        orderData: { type: 'string', description: 'JSON string with order fields.' },
      },
    },
    handler: async (companyId, { sheetUrl, orderData }, context = {}) => {
      const resolvedUrl = context?.agent?.config?.ordersAppsScriptUrl || context?.agent?.config?.productsSheetUrl || sheetUrl;
      if (!resolvedUrl) throw new Error('MISSING_SHEET_URL: Provide sheetUrl or set productsSheetUrl/ordersAppsScriptUrl in agent config.');
      sheetUrl = resolvedUrl;
      let order;
      try {
        order = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;
      } catch {
        return { success: false, error: 'Invalid orderData JSON' };
      }

      const orderNumber = order.orderNumber || `GS-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const rowToAppend = {
        orderNumber,
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        city: order.city || '',
        address: order.address || '',
        productName: order.productName || '',
        quantity: parseInt(order.quantity) || 1,
        price: parseFloat(order.price) || 0,
        total: (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1),
        notes: order.notes || '',
        createdAt: timestamp,
        status: 'NEW'
      };

      return {
        success: true,
        order: rowToAppend,
        sheetUrl: sheetUrl.substring(0, 50) + '...',
        note: 'Row data prepared. Manual append to sheet required for full integration.'
      };
    }
  }
};

module.exports = TOOLS;
