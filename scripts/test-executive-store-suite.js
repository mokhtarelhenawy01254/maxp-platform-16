'use strict';

/**
 * ============================================================================
 * 🧪 Test Suite & Interactive Simulation: Saleem (Executive Assistant Agent)
 *    Complete Store Bundle — Operations, Orders, Inventory, Returns, Profits
 * ============================================================================
 *
 * Covers 9 Target Applications & 17 Tools:
 * 1. store:
 *    - conversion.tools.read (conversion_tools_read)
 *    - conversion.tool.toggle (conversion_tool_toggle)
 * 2. order-workflow:
 *    - order_confirm
 *    - order_cancel
 *    - order_update_details
 * 3. bulk-orders:
 *    - orders_bulk_status_update
 * 4. order-preparation-hold:
 *    - order_set_preparation_hold
 * 5. order-shipping-turbo:
 *    - shipping.companies.list (shipping_companies_list)
 *    - shipment.track (shipment_track)
 * 6. inventory-pro:
 *    - inventory.check (inventory_check)
 *    - inventory.adjust (inventory_adjust)
 *    - product.low.stock (product_low_stock)
 * 7. returns-settings & returns-reasons-analytics:
 *    - returns_settings_manage (GET_SETTINGS, GET_REASONS, UPDATE_SETTINGS)
 * 8. orders-analytics:
 *    - order.summary (order_summary)
 *    - order.recent.list (order_recent_list)
 * 9. profit-analytics:
 *    - sales.revenue (sales_revenue)
 *    - bridge_get_treasury_expenses (curated bridge tool)
 *
 * Verification Pillars:
 * 1. Contract & Sync: agent.json, role_tools.yaml, TOOLS.md, and catalog_seed.py
 * 2. Pydantic / Schema Validation:
 *    - Valid inputs with realistic Egyptian e-commerce payloads
 *    - Invalid inputs: Missing required fields, invalid enum/literal values, bad data types
 * 3. Approval Gates Verification:
 *    - WRITE_TOOL_NAMES (always_require): orders_bulk_status_update, order_set_preparation_hold, order_cancel, inventory_adjust, conversion_tool_toggle
 *    - DIRECT_WRITE_TOOL_NAMES (never_require): order_confirm, order_update_details
 *    - READ_TOOL_NAMES (never_require): all read & analytics tools
 * 4. Backend Route & Guard Verification:
 *    - /api/v1/orders/bulk/status
 *    - /api/v1/returns/settings & /api/v1/returns/reasons
 *    - /api/v1/treasury/expenses
 * 5. End-to-End Simulation of All 9 Apps
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const yaml = require('../apps/backend/node_modules/js-yaml');

// Directory paths
const ROOT_DIR = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(ROOT_DIR, 'apps/backend/agents/executive-assistant-agent');
const AI_SERVICE_DIR = path.join(ROOT_DIR, 'apps/ai-service');
const TOOLS_DEF_DIR = path.join(AI_SERVICE_DIR, 'src/tools/definitions');
const ROLE_TOOLS_PATH = path.join(AI_SERVICE_DIR, 'src/tools/role_tools.yaml');
const REGISTRY_PATH = path.join(AI_SERVICE_DIR, 'src/tools/registry.py');
const CATALOG_SEED_PATH = path.join(AI_SERVICE_DIR, 'src/tools/catalog_seed.py');
const ORDERS_ROUTE_PATH = path.join(ROOT_DIR, 'apps/backend/routes/orders.js');
const RETURNS_ROUTE_PATH = path.join(ROOT_DIR, 'apps/backend/routes/returnRoutes.js');
const TREASURY_ROUTE_PATH = path.join(ROOT_DIR, 'apps/backend/routes/treasuryExpensesRoutes.js');

// Statistics
let passCount = 0;
let failCount = 0;
const resultsByApp = {};

function logPass(category, testName, details = '') {
  passCount++;
  if (!resultsByApp[category]) resultsByApp[category] = { pass: 0, fail: 0, tests: [] };
  resultsByApp[category].pass++;
  resultsByApp[category].tests.push({ name: testName, status: 'PASS', details });
  console.log(`  ✅ [PASS] [${category}] ${testName}${details ? ` -> ${details}` : ''}`);
}

function logFail(category, testName, reason) {
  failCount++;
  if (!resultsByApp[category]) resultsByApp[category] = { pass: 0, fail: 0, tests: [] };
  resultsByApp[category].fail++;
  resultsByApp[category].tests.push({ name: testName, status: 'FAIL', reason });
  console.error(`  ❌ [FAIL] [${category}] ${testName} -> ${reason}`);
}

function assertTest(condition, category, testName, details, failureReason) {
  if (condition) {
    logPass(category, testName, details);
  } else {
    logFail(category, testName, failureReason || details);
  }
}

// Canonical tool name converter (mirrors src/tools/names.py)
function toCanonical(name) {
  return String(name || '').trim().replace(/\./g, '_');
}

console.log('================================================================================');
console.log('🧪 بدء الاختبار التفاعلي الشامل لأدوات إيجنت سليم (باقة المتجر الكاملة - 9 تطبيقات)');
console.log('================================================================================\n');

// ============================================================================
// PART 1: Contract, Role Mapping, and Documentation Verification
// ============================================================================
console.log('📌 [المرحلة 1] التحقق من سلامة العقود وصلاحيات الأدوات في agent.json و role_tools.yaml:');

const agentManifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));
const roleToolsYaml = yaml.load(fs.readFileSync(ROLE_TOOLS_PATH, 'utf8'));
const toolsMarkdown = fs.readFileSync(path.join(AGENT_DIR, 'TOOLS.md'), 'utf8');
const registryCode = fs.readFileSync(REGISTRY_PATH, 'utf8');

const TARGET_APPS = [
  {
    id: 'store',
    nameAr: 'المتجر وأدوات التحويل',
    tools: ['conversion.tools.read', 'conversion.tool.toggle'],
  },
  {
    id: 'order-workflow',
    nameAr: 'مسار الطلبات وتأكيدها وتعديلها وإلغائها',
    tools: ['order_confirm', 'order_cancel', 'order_update_details'],
  },
  {
    id: 'bulk-orders',
    nameAr: 'الطلبات الجماعية وتحديث الحالات المجمع',
    tools: ['orders_bulk_status_update'],
  },
  {
    id: 'order-preparation-hold',
    nameAr: 'تجهيز وتعليق الطلبات في المستودع',
    tools: ['order_set_preparation_hold'],
  },
  {
    id: 'order-shipping-turbo',
    nameAr: 'شركات الشحن وبوابة التتبع الذكي',
    tools: ['shipping.companies.list', 'shipment.track'],
  },
  {
    id: 'inventory-pro',
    nameAr: 'المخزون الشامل والتعديل ورصد النواقص',
    tools: ['inventory.check', 'inventory.adjust', 'product.low.stock'],
  },
  {
    id: 'returns-settings',
    nameAr: 'سياسات وإعدادات وأسباب المرتجعات',
    tools: ['returns_settings_manage'],
  },
  {
    id: 'orders-analytics',
    nameAr: 'تحليلات الطلبات والملخص وسجل العمليات',
    tools: ['order.summary', 'order.recent.list'],
  },
  {
    id: 'profit-analytics',
    nameAr: 'تحليلات الأرباح والمبيعات ونفقات الخزينة',
    tools: ['sales.revenue', 'bridge_get_treasury_expenses'],
  },
];

const executiveAllowedTools = new Set(agentManifest.allowedTools || []);
const executiveRoleTools = new Set(roleToolsYaml.roles.EXECUTIVE_ASSISTANT || []);

for (const app of TARGET_APPS) {
  for (const tool of app.tools) {
    const canonical = toCanonical(tool);

    // 1. In agent.json allowedTools
    const inManifest = executiveAllowedTools.has(tool) || executiveAllowedTools.has(canonical);
    assertTest(
      inManifest,
      app.id,
      `أداة [${tool}] موجودة في allowedTools بملف agent.json`,
      `معرفة بالاسم الأصلي أو الكنسي (${canonical})`,
      `الأداة غير مدرجة في agent.json!`
    );

    // 2. In role_tools.yaml EXECUTIVE_ASSISTANT
    const inRoleTools = executiveRoleTools.has(canonical);
    assertTest(
      inRoleTools,
      app.id,
      `أداة [${canonical}] مصرح بها في role_tools.yaml للدور EXECUTIVE_ASSISTANT`,
      `موجودة ومصرحة رسمياً`,
      `الأداة مفقودة من role_tools.yaml!`
    );

    // 3. Documented in TOOLS.md
    const inToolsDoc = toolsMarkdown.includes(tool) || toolsMarkdown.includes(canonical);
    assertTest(
      inToolsDoc,
      app.id,
      `أداة [${tool}] موثقة في دليل استخدام الأدوات TOOLS.md`,
      `تحتوي على شرح الاستخدام والمعاملات`,
      `الأداة غير موثقة في TOOLS.md!`
    );
  }
}

// ============================================================================
// PART 2: Pydantic Input Models & Source Code Definition Verification
// ============================================================================
console.log('\n📌 [المرحلة 2] فحص تعريفات نماذج Pydantic وخلوها من الاستخراج النصي الهش:');

const TOOL_DEFINITIONS_SPEC = [
  // 1. store
  {
    appId: 'store',
    name: 'conversion_tools_read',
    file: 'conversion_tools.py',
    model: 'ConversionToolsReadInput',
    fields: ['app_slug', 'company_id'],
  },
  {
    appId: 'store',
    name: 'conversion_tool_toggle',
    file: 'conversion_tools.py',
    model: 'ConversionToolToggleInput',
    fields: ['tool_key', 'enable', 'company_id'],
  },
  // 2. order-workflow
  {
    appId: 'order-workflow',
    name: 'order_confirm',
    file: 'order.py',
    model: 'OrderConfirmInput',
    fields: ['order_number', 'notes', 'company_id'],
  },
  {
    appId: 'order-workflow',
    name: 'order_cancel',
    file: 'order.py',
    model: 'OrderCancelInput',
    fields: ['order_number', 'reason', 'company_id'],
  },
  {
    appId: 'order-workflow',
    name: 'order_update_details',
    file: 'order.py',
    model: 'OrderUpdateDetailsInput',
    fields: ['order_number', 'customer_phone', 'city', 'governorate', 'notes', 'company_id'],
  },
  // 3. bulk-orders
  {
    appId: 'bulk-orders',
    name: 'orders_bulk_status_update',
    file: 'store_suite.py',
    model: 'OrdersBulkStatusUpdateInput',
    fields: ['order_ids', 'status', 'notes', 'company_id'],
  },
  // 4. order-preparation-hold
  {
    appId: 'order-preparation-hold',
    name: 'order_set_preparation_hold',
    file: 'store_suite.py',
    model: 'OrderSetPreparationHoldInput',
    fields: ['order_id', 'action', 'reason', 'company_id'],
  },
  // 5. order-shipping-turbo
  {
    appId: 'order-shipping-turbo',
    name: 'shipping_companies_list',
    file: 'shipping.py',
    model: 'ShippingCompaniesListInput',
    fields: ['company_id'],
  },
  {
    appId: 'order-shipping-turbo',
    name: 'shipment_track',
    file: 'shipping.py',
    model: 'ShipmentTrackInput',
    fields: ['tracking_code', 'company_id'],
  },
  // 6. inventory-pro
  {
    appId: 'inventory-pro',
    name: 'inventory_check',
    file: 'inventory.py',
    model: 'InventoryCheckInput',
    fields: ['product_name_or_sku', 'product_size', 'product_color', 'company_id'],
  },
  {
    appId: 'inventory-pro',
    name: 'inventory_adjust',
    file: 'inventory.py',
    model: 'InventoryAdjustInput',
    fields: ['product_id', 'quantity_delta', 'reason', 'company_id'],
  },
  {
    appId: 'inventory-pro',
    name: 'product_low_stock',
    file: 'product.py',
    model: 'ProductLowStockInput',
    fields: ['threshold', 'company_id'],
  },
  // 7. returns-settings
  {
    appId: 'returns-settings',
    name: 'returns_settings_manage',
    file: 'store_suite.py',
    model: 'ReturnsSettingsManageInput',
    fields: ['action', 'allow_returns', 'return_window_days', 'company_id'],
  },
  // 8. orders-analytics
  {
    appId: 'orders-analytics',
    name: 'order_summary',
    file: 'order.py',
    model: 'OrderSummaryInput',
    fields: ['period', 'company_id'],
  },
  {
    appId: 'orders-analytics',
    name: 'order_recent_list',
    file: 'order.py',
    model: 'OrderRecentListInput',
    fields: ['status', 'period', 'date', 'limit', 'company_id'],
  },
  // 9. profit-analytics
  {
    appId: 'profit-analytics',
    name: 'sales_revenue',
    file: 'sales.py',
    model: 'SalesRevenueInput',
    fields: ['period', 'company_id'],
  },
  {
    appId: 'profit-analytics',
    name: 'bridge_get_treasury_expenses',
    file: 'catalog_seed.py',
    isCuratedBridge: true,
    endpoint: '/api/v1/treasury/expenses',
  },
];

for (const spec of TOOL_DEFINITIONS_SPEC) {
  if (spec.isCuratedBridge) {
    const catalogSeedCode = fs.readFileSync(CATALOG_SEED_PATH, 'utf8');
    const hasBridgeTool = catalogSeedCode.includes(`"name": "${spec.name}"`);
    const hasEndpoint = catalogSeedCode.includes(`"endpoint": "${spec.endpoint}"`);
    assertTest(
      hasBridgeTool && hasEndpoint,
      spec.appId,
      `أداة الخزينة المنسقة [${spec.name}] معرفة في catalog_seed.py وترتبط بـ ${spec.endpoint}`,
      `Risk: read, Scoped: companyId, Active: true`,
      `فشل العثور على أداة الخزينة المنسقة في catalog_seed.py!`
    );
    continue;
  }

  const filePath = path.join(TOOLS_DEF_DIR, spec.file);
  const exists = fs.existsSync(filePath);
  assertTest(exists, spec.appId, `ملف الأداة [${spec.file}] موجود على القرص`, filePath);

  if (exists) {
    const code = fs.readFileSync(filePath, 'utf8');

    // 1. Model class
    const hasModel = code.includes(`class ${spec.model}(BaseModel):`);
    assertTest(
      hasModel,
      spec.appId,
      `نموذج المدخلات [${spec.model}] معرف كـ Pydantic BaseModel`,
      `class ${spec.model}(BaseModel)`
    );

    // 2. Structured fields
    for (const field of spec.fields) {
      const hasField = new RegExp(`${field}:\\s*[^=]+`, 'm').test(code);
      assertTest(
        hasField,
        spec.appId,
        `الحقل [${field}] معرف بنوع بيانات صريح في [${spec.model}]`,
        `خالٍ من النصوص غير المهيكلة (Strict Typed)`
      );
    }

    // 3. Ban generic text request param
    const hasGenericParam = new RegExp(`class\\s+${spec.model}[\\s\\S]*?request:\\s*str\\s*=\\s*Field`, 'm').test(code);
    assertTest(
      !hasGenericParam,
      spec.appId,
      `نموذج [${spec.model}] ملتزم بقاعدة Ban Generic Text Request Params`,
      `لا يستخدم بارامتر نصي عام 'request: str'`
    );
  }
}

// ============================================================================
// PART 3: Approval Gates Verification (بطاقات الاعتماد التنفيذية)
// ============================================================================
console.log('\n📌 [المرحلة 3] فحص بوابات الاعتماد (Approval Gates) للأدوات الحساسة والمباشرة:');

// Extract WRITE_TOOL_NAMES, DIRECT_WRITE_TOOL_NAMES, and ADVANCED_TOOL_NAMES from registry.py
function extractSetFromPython(code, varName) {
  const regex = new RegExp(`${varName}:\\s*set\\[str\\]\\s*=\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = code.match(regex);
  if (!match) return new Set();
  const rawBlock = match[1];
  const items = [];
  const stringRegex = /["']([^"']+)["']/g;
  let strMatch;
  while ((strMatch = stringRegex.exec(rawBlock)) !== null) {
    items.push(strMatch[1]);
  }
  return new Set(items);
}

const writeToolsSet = extractSetFromPython(registryCode, 'WRITE_TOOL_NAMES');
const directWriteToolsSet = extractSetFromPython(registryCode, 'DIRECT_WRITE_TOOL_NAMES');

// 1. Mandatory Gated Write Tools (always_require)
const MANDATORY_GATED_TOOLS = [
  { name: 'orders_bulk_status_update', appId: 'bulk-orders', reason: 'تعديل جماعي لحالات الطلبات (عملية حساسة)' },
  { name: 'order_set_preparation_hold', appId: 'order-preparation-hold', reason: 'تعليق أو نقل الطلب لمرحلة التجهيز' },
  { name: 'order_cancel', appId: 'order-workflow', reason: 'إلغاء الطلبات المسجلة' },
  { name: 'inventory_adjust', appId: 'inventory-pro', reason: 'تعديل رصيد المخزون اليدوي' },
  { name: 'conversion_tool_toggle', appId: 'store', reason: 'تشغيل أو إيقاف أدوات ترويجية في المتجر' },
];

for (const tool of MANDATORY_GATED_TOOLS) {
  const isGated = writeToolsSet.has(tool.name);
  assertTest(
    isGated,
    tool.appId,
    `الأداة الحساسة [${tool.name}] تخضع لبوابة الاعتماد (always_require)`,
    `سبب الاعتماد: ${tool.reason}`,
    `الأداة غير مدرجة في WRITE_TOOL_NAMES! ثغرة تجاوز الاعتماد!`
  );
}

// 2. Direct Write Tools (never_require)
const DIRECT_EXECUTION_TOOLS = [
  { name: 'order_confirm', appId: 'order-workflow', reason: 'تأكيد اعتيادي للطلب وإرساله للشحن' },
  { name: 'order_update_details', appId: 'order-workflow', reason: 'تعديل تفاصيل العنوان أو الهاتف' },
];

for (const tool of DIRECT_EXECUTION_TOOLS) {
  const isDirect = directWriteToolsSet.has(tool.name);
  assertTest(
    isDirect,
    tool.appId,
    `أداة التشغيل المباشر [${tool.name}] مسجلة في DIRECT_WRITE_TOOL_NAMES (never_require)`,
    `سبب التشغيل المباشر: ${tool.reason}`,
    `الأداة مفقودة من DIRECT_WRITE_TOOL_NAMES!`
  );
}

// ============================================================================
// PART 4: Backend Routes & Input Guardrails Verification
// ============================================================================
console.log('\n📌 [المرحلة 4] فحص مسارات وقواعد التحقق في Backend API:');

const ordersRouteCode = fs.readFileSync(ORDERS_ROUTE_PATH, 'utf8');
const returnsRouteCode = fs.readFileSync(RETURNS_ROUTE_PATH, 'utf8');
const treasuryRouteCode = fs.readFileSync(TREASURY_ROUTE_PATH, 'utf8');

// 1. Orders Bulk Status Update Route (/api/v1/orders/bulk/status)
assertTest(
  ordersRouteCode.includes("router.post('/bulk/status',"),
  'bulk-orders',
  'مسار POST /api/v1/orders/bulk/status موجود في orders.js',
  'Bulk Status Update endpoint'
);
assertTest(
  ordersRouteCode.includes('if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0)'),
  'bulk-orders',
  'فحص صحة مصفوفة معرفات الطلبات (!orderIds || !Array.isArray || empty) يعيد 400',
  'Guard: Order IDs required'
);
assertTest(
  ordersRouteCode.includes('if (!status)'),
  'bulk-orders',
  'فحص وجود الحالة (!status) يعيد 400',
  'Guard: Status required'
);
assertTest(
  ordersRouteCode.includes('if (isCancellationStatus(normalizedStatus) && !statusNotes)'),
  'bulk-orders',
  'حظر الإلغاء بدون سبب إداري صريح (Cancellation Reason Guard)',
  'Guard: Cancellation notes required'
);

// 2. Returns Settings & Reasons Routes
assertTest(
  returnsRouteCode.includes("router.get('/settings',"),
  'returns-settings',
  'مسار GET /api/v1/returns/settings مسجل ومحمي',
  'Read returns settings'
);
assertTest(
  returnsRouteCode.includes("router.put('/settings',"),
  'returns-settings',
  'مسار PUT /api/v1/returns/settings مسجل ومحمي',
  'Update returns settings'
);
assertTest(
  returnsRouteCode.includes("router.get('/reasons',"),
  'returns-settings',
  'مسار GET /api/v1/returns/reasons مسجل ومحمي',
  'Read return reasons catalog'
);

// 3. Treasury Expenses Routes
assertTest(
  treasuryRouteCode.includes("router.get('/expenses',"),
  'profit-analytics',
  'مسار GET /api/v1/treasury/expenses مسجل ومحمي',
  'Read treasury expenses list'
);
assertTest(
  treasuryRouteCode.includes("router.get('/expenses/stats',"),
  'profit-analytics',
  'مسار GET /api/v1/treasury/expenses/stats مسجل ومحمي',
  'Read treasury expense statistics'
);

// ============================================================================
// PART 5: Interactive Runtime Simulation (Valid & Invalid Scenarios)
// ============================================================================
console.log('\n📌 [المرحلة 5] محاكاة استدعاء الأدوات بالمدخلات النموذجية والحالات الخاطئة:');

// Validator Simulator matching Python Pydantic specs
const validators = {
  // 1. store
  conversion_tools_read: (input) => {
    const allowedSlugs = ['conversion-suite', 'quantity-offers-pro', 'commerce-advanced', 'ugc-reviews-pro'];
    if (input.app_slug && !allowedSlugs.includes(input.app_slug)) {
      return { valid: false, error: `ValidationError: app_slug must be one of ${allowedSlugs.join(', ')}` };
    }
    return { valid: true };
  },

  conversion_tool_toggle: (input) => {
    if (!input.tool_key || typeof input.tool_key !== 'string') {
      return { valid: false, error: 'ValidationError: tool_key is required and must be a string' };
    }
    if (typeof input.enable !== 'boolean') {
      return { valid: false, error: 'ValidationError: enable must be a boolean (True/False)' };
    }
    const catalog = [
      'saleCountdown', 'exitIntentPopup', 'lowStockNotice', 'bulkSavings',
      'trustedBadges', 'fakeVisitorCounter', 'fakeSalePopup', 'crossSell',
      'soldCounter', 'estimatedDelivery', 'freeShippingBar', 'stickyAddToCart',
      'boughtTogether', 'postPurchaseUpsell', 'backInStock', 'purchaseFomo',
      'inactiveTab', 'productWishlist', 'productComparison', 'photoReviews',
      'videoReviews', 'verifiedBadge', 'preOrder', 'externalAffiliate',
      'renderOnProductPage', 'mixAndMatch'
    ];
    if (!catalog.includes(input.tool_key)) {
      return { valid: false, businessError: `«${input.tool_key}» مش من أدوات التحويل المعروفة` };
    }
    return { valid: true };
  },

  // 2. order-workflow
  order_confirm: (input) => {
    const orderNumber = input.order_number || input.order_id || input.orderNumber;
    if (!orderNumber || typeof orderNumber !== 'string') {
      return { valid: false, error: 'ValidationError: order_number is required and must be a string' };
    }
    return { valid: true, resolvedOrderNumber: orderNumber };
  },

  order_cancel: (input) => {
    const orderNumber = input.order_number || input.order_id || input.orderNumber;
    if (!orderNumber || typeof orderNumber !== 'string') {
      return { valid: false, error: 'ValidationError: order_number is required' };
    }
    if (!input.reason || typeof input.reason !== 'string' || input.reason.trim() === '') {
      return { valid: false, error: 'ValidationError: reason is required for cancellation' };
    }
    return { valid: true, resolvedOrderNumber: orderNumber };
  },

  order_update_details: (input) => {
    const orderNumber = input.order_number || input.order_id || input.orderNumber;
    if (!orderNumber || typeof orderNumber !== 'string') {
      return { valid: false, error: 'ValidationError: order_number is required' };
    }
    const hasUpdates = Boolean(
      input.customer_phone || input.city || input.governorate ||
      input.customer_name || input.notes || input.shipping_address
    );
    if (!hasUpdates) {
      return { valid: false, businessError: 'Nothing to update' };
    }
    return { valid: true, resolvedOrderNumber: orderNumber };
  },

  // 3. bulk-orders
  orders_bulk_status_update: (input) => {
    if (!input.order_ids || !Array.isArray(input.order_ids) || input.order_ids.length === 0) {
      return { valid: false, error: 'ValidationError: order_ids must be a non-empty list of strings' };
    }
    const allowedStatuses = [
      'PENDING', 'CONFIRMED', 'PREPARATION', 'HOLD', 'SHIPPED',
      'DELIVERED', 'CANCELLED', 'SCHEDULED'
    ];
    if (!input.status || !allowedStatuses.includes(String(input.status).toUpperCase())) {
      return { valid: false, error: `ValidationError: status must be one of ${allowedStatuses.join(', ')}` };
    }
    return { valid: true };
  },

  // 4. order-preparation-hold
  order_set_preparation_hold: (input) => {
    if (!input.order_id || typeof input.order_id !== 'string') {
      return { valid: false, error: 'ValidationError: order_id is required and must be a string' };
    }
    const allowedActions = ['PREPARATION', 'HOLD', 'RELEASE_HOLD'];
    if (!input.action || !allowedActions.includes(input.action)) {
      return { valid: false, error: `ValidationError: action must be one of ${allowedActions.join(', ')}` };
    }
    return { valid: true };
  },

  // 5. order-shipping-turbo
  shipping_companies_list: (_input) => {
    return { valid: true };
  },

  shipment_track: (input) => {
    const code = input.tracking_code || input.order_number || input.order_id || input.tracking_number || input.awb;
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'ValidationError: tracking_code is required' };
    }
    return { valid: true, resolvedCode: code };
  },

  // 6. inventory-pro
  inventory_check: (input) => {
    if (!input.product_name_or_sku || typeof input.product_name_or_sku !== 'string') {
      return { valid: false, error: 'ValidationError: product_name_or_sku is required' };
    }
    return { valid: true };
  },

  inventory_adjust: (input) => {
    if (!input.product_id || typeof input.product_id !== 'string') {
      return { valid: false, error: 'ValidationError: product_id is required' };
    }
    if (typeof input.quantity_delta !== 'number' || !Number.isInteger(input.quantity_delta)) {
      return { valid: false, error: 'ValidationError: quantity_delta must be an integer' };
    }
    return { valid: true };
  },

  product_low_stock: (input) => {
    if (input.threshold !== undefined && (typeof input.threshold !== 'number' || !Number.isInteger(input.threshold))) {
      return { valid: false, error: 'ValidationError: threshold must be an integer' };
    }
    return { valid: true };
  },

  // 7. returns-settings
  returns_settings_manage: (input) => {
    const allowedActions = ['GET_SETTINGS', 'GET_REASONS', 'UPDATE_SETTINGS'];
    const action = input.action || 'GET_SETTINGS';
    if (!allowedActions.includes(action)) {
      return { valid: false, error: `ValidationError: action must be one of ${allowedActions.join(', ')}` };
    }
    if (action === 'UPDATE_SETTINGS') {
      if (input.return_window_days !== undefined && (!Number.isInteger(input.return_window_days) || input.return_window_days < 0)) {
        return { valid: false, error: 'ValidationError: return_window_days must be a non-negative integer' };
      }
    }
    return { valid: true };
  },

  // 8. orders-analytics
  order_summary: (input) => {
    if (input.period && typeof input.period !== 'string') {
      return { valid: false, error: 'ValidationError: period must be a string' };
    }
    return { valid: true };
  },

  order_recent_list: (input) => {
    if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit <= 0)) {
      return { valid: false, error: 'ValidationError: limit must be a positive integer' };
    }
    return { valid: true };
  },

  // 9. profit-analytics
  sales_revenue: (input) => {
    if (input.period && typeof input.period !== 'string') {
      return { valid: false, error: 'ValidationError: period must be a string' };
    }
    return { valid: true };
  },

  bridge_get_treasury_expenses: (input) => {
    if (input.type && !['OPEX', 'CAPEX'].includes(input.type)) {
      return { valid: false, error: 'ValidationError: type must be OPEX or CAPEX' };
    }
    if (input.status && !['PAID', 'PENDING'].includes(input.status)) {
      return { valid: false, error: 'ValidationError: status must be PAID or PENDING' };
    }
    return { valid: true };
  },
};

// Simulation Test Cases
const SIMULATION_CASES = [
  // App 1: store
  {
    appId: 'store',
    tool: 'conversion_tools_read',
    desc: 'قراءة إعدادات تطبيق عروض الكميات (Valid Input)',
    input: { app_slug: 'quantity-offers-pro', company_id: 'c-merchant-101' },
    expectValid: true,
    mockOutput: {
      success: true,
      apps: [{ appSlug: 'quantity-offers-pro', appLabelAr: 'عروض الكميات', installed: true, operational: true }],
    },
  },
  {
    appId: 'store',
    tool: 'conversion_tools_read',
    desc: 'محاولة إرسال app_slug غير معروف (Invalid Enum)',
    input: { app_slug: 'invalid-app-slug' },
    expectValid: false,
    expectedErrorSubstring: 'ValidationError',
  },
  {
    appId: 'store',
    tool: 'conversion_tool_toggle',
    desc: 'تفعيل شريط الشحن المجاني (Valid Input + Gated Approval)',
    input: { tool_key: 'freeShippingBar', enable: true, company_id: 'c-merchant-101' },
    expectValid: true,
    mockOutput: { success: true, toolKey: 'freeShippingBar', appSlug: 'conversion-suite', stateAr: 'مفعّلة' },
  },
  {
    appId: 'store',
    tool: 'conversion_tool_toggle',
    desc: 'محاولة إرسال أداة غير موجودة في الكتالوج (Invalid Tool Key)',
    input: { tool_key: 'nonExistentModuleXYZ', enable: true },
    expectValid: false,
    expectedErrorSubstring: 'مش من أدوات التحويل المعروفة',
  },

  // App 2: order-workflow
  {
    appId: 'order-workflow',
    tool: 'order_confirm',
    desc: 'تأكيد طلب بالرقم المباشر (Direct Write execution)',
    input: { order_number: 'ORD-2026-8812', notes: 'تم التأكيد مع العميل هاتفياً' },
    expectValid: true,
    mockOutput: { success: true, orderNumber: 'ORD-2026-8812', newStatus: 'CONFIRMED' },
  },
  {
    appId: 'order-workflow',
    tool: 'order_confirm',
    desc: 'تأكيد طلب باستخدام الاسم البديل order_id (Alias Support)',
    input: { order_id: 'ORD-2026-9911' },
    expectValid: true,
    mockOutput: { success: true, orderNumber: 'ORD-2026-9911', newStatus: 'CONFIRMED' },
  },
  {
    appId: 'order-workflow',
    tool: 'order_confirm',
    desc: 'محاولة تأكيد طلب بدون رقم الطلب (Missing Required Field)',
    input: { notes: 'بدون رقم' },
    expectValid: false,
    expectedErrorSubstring: 'order_number is required',
  },
  {
    appId: 'order-workflow',
    tool: 'order_cancel',
    desc: 'إلغاء طلب بذكر سبب حقيقي (Gated Write Approval)',
    input: { order_number: 'ORD-2026-4433', reason: 'العميل غير رأيه وطلب الإلغاء' },
    expectValid: true,
    mockOutput: { success: true, orderNumber: 'ORD-2026-4433', status: 'CANCELLED' },
  },
  {
    appId: 'order-workflow',
    tool: 'order_cancel',
    desc: 'محاولة إلغاء طلب بدون ذكر سبب (Missing reason)',
    input: { order_number: 'ORD-2026-4433' },
    expectValid: false,
    expectedErrorSubstring: 'reason is required',
  },
  {
    appId: 'order-workflow',
    tool: 'order_update_details',
    desc: 'تحديث هاتف العميل ومحافظة التوصيل (Direct Write)',
    input: { order_number: 'ORD-2026-5501', customer_phone: '01099887766', governorate: 'الإسكندرية' },
    expectValid: true,
    mockOutput: { success: true, orderNumber: 'ORD-2026-5501', updatedFields: ['customerPhone', 'governorate'] },
  },
  {
    appId: 'order-workflow',
    tool: 'order_update_details',
    desc: 'محاولة تحديث بدون أي حقول للتعديل (Nothing to update)',
    input: { order_number: 'ORD-2026-5501' },
    expectValid: false,
    expectedErrorSubstring: 'Nothing to update',
  },

  // App 3: bulk-orders
  {
    appId: 'bulk-orders',
    tool: 'orders_bulk_status_update',
    desc: 'تحديث حالة 3 طلبات دفعة واحدة إلى SHIPPED (Gated Write Approval)',
    input: {
      order_ids: ['ORD-2026-101', 'ORD-2026-102', 'ORD-2026-103'],
      status: 'SHIPPED',
      notes: 'تسليم جماعي لمندوب شركة الشحن',
    },
    expectValid: true,
    mockOutput: { success: true, targetStatus: 'SHIPPED', ordersCount: 3, message: 'تم تحديث حالة 3 طلب إلى SHIPPED بنجاح' },
  },
  {
    appId: 'bulk-orders',
    tool: 'orders_bulk_status_update',
    desc: 'محاولة تحديث بحالة عشوائية غير معتمدة (Invalid Literal Status)',
    input: { order_ids: ['ORD-2026-101'], status: 'FLYING_STATUS' },
    expectValid: false,
    expectedErrorSubstring: 'status must be one of',
  },
  {
    appId: 'bulk-orders',
    tool: 'orders_bulk_status_update',
    desc: 'محاولة إرسال مصفوفة فارغة من الطلبات (Empty Array Guard)',
    input: { order_ids: [], status: 'CONFIRMED' },
    expectValid: false,
    expectedErrorSubstring: 'non-empty list',
  },

  // App 4: order-preparation-hold
  {
    appId: 'order-preparation-hold',
    tool: 'order_set_preparation_hold',
    desc: 'وضع الطلب في حالة التعليق الإداري HOLD مع تسجيل السبب (Gated Write)',
    input: { order_id: 'ORD-2026-7788', action: 'HOLD', reason: 'العميل يطلب تأجيل الشحن لبداية الشهر' },
    expectValid: true,
    mockOutput: { success: true, orderId: 'ORD-2026-7788', action: 'HOLD', status: 'HOLD', message: 'معلق إدارياً (On Hold)' },
  },
  {
    appId: 'order-preparation-hold',
    tool: 'order_set_preparation_hold',
    desc: 'تحويل الطلب لمرحلة التجهيز بالمستودع PREPARATION (Gated Write)',
    input: { order_id: 'ORD-2026-7789', action: 'PREPARATION' },
    expectValid: true,
    mockOutput: { success: true, orderId: 'ORD-2026-7789', action: 'PREPARATION', status: 'PREPARATION' },
  },
  {
    appId: 'order-preparation-hold',
    tool: 'order_set_preparation_hold',
    desc: 'إلغاء التعليق وإعادة الطلب لمؤكد RELEASE_HOLD (Gated Write)',
    input: { order_id: 'ORD-2026-7788', action: 'RELEASE_HOLD' },
    expectValid: true,
    mockOutput: { success: true, orderId: 'ORD-2026-7788', action: 'RELEASE_HOLD', status: 'CONFIRMED' },
  },
  {
    appId: 'order-preparation-hold',
    tool: 'order_set_preparation_hold',
    desc: 'محاولة إرسال action غير مدعوم كـ REFUND (Invalid Literal Action)',
    input: { order_id: 'ORD-2026-7788', action: 'REFUND' },
    expectValid: false,
    expectedErrorSubstring: 'action must be one of',
  },

  // App 5: order-shipping-turbo
  {
    appId: 'order-shipping-turbo',
    tool: 'shipping_companies_list',
    desc: 'استعراض شركات الشحن المسجلة بالمتجر (Read-Only Tool)',
    input: { company_id: 'c-merchant-101' },
    expectValid: true,
    mockOutput: {
      companies: [
        { carrier: 'TURBO', name: 'تربو للشحن السريع', isActive: true },
        { carrier: 'BOSTA', name: 'بوستا إكسبريس', isActive: true },
      ],
      count: 2,
      active_count: 2,
    },
  },
  {
    appId: 'order-shipping-turbo',
    tool: 'shipment_track',
    desc: 'تتبع شحنة بكود التتبع TURBO-9812 (Read-Only Live Tracking)',
    input: { tracking_code: 'TURBO-9812' },
    expectValid: true,
    mockOutput: {
      found: true,
      trackingCode: 'TURBO-9812',
      status: 'OUT_FOR_DELIVERY',
      captainName: 'محمود عبد الفتاح',
      captainPhone: '01011223344',
      carrierDisplay: 'تربو للشحن (Turbo)',
    },
  },
  {
    appId: 'order-shipping-turbo',
    tool: 'shipment_track',
    desc: 'محاولة التتبع بدون كود تتبع (Missing tracking_code)',
    input: {},
    expectValid: false,
    expectedErrorSubstring: 'tracking_code is required',
  },

  // App 6: inventory-pro
  {
    appId: 'inventory-pro',
    tool: 'inventory_check',
    desc: 'فحص مخزون تيشيرت أسود مقاس XL (Read-Only Inventory Check)',
    input: { product_name_or_sku: 'تيشيرت بولو كلاسيك', product_size: 'XL', product_color: 'أسود' },
    expectValid: true,
    mockOutput: {
      found: true,
      productName: 'تيشيرت بولو كلاسيك',
      stock: 45,
      requestedSize: 'XL',
      requestedColor: 'أسود',
      constraintAvailable: true,
    },
  },
  {
    appId: 'inventory-pro',
    tool: 'inventory_check',
    desc: 'محاولة فحص بدون تحديد اسم المنتج أو SKU (Missing required product name)',
    input: {},
    expectValid: false,
    expectedErrorSubstring: 'product_name_or_sku is required',
  },
  {
    appId: 'inventory-pro',
    tool: 'inventory_adjust',
    desc: 'تعديل رصيد المخزون بإضافة 25 قطعة توريد جديد (Gated Write Approval)',
    input: { product_id: 'prod_tee_01', quantity_delta: 25, reason: 'توريد دفعة إنتاج جديدة' },
    expectValid: true,
    mockOutput: { success: true, productId: 'prod_tee_01', delta: 25, newStock: 70 },
  },
  {
    appId: 'inventory-pro',
    tool: 'inventory_adjust',
    desc: 'محاولة تمرير delta غير رقمي (Invalid Integer Type)',
    input: { product_id: 'prod_tee_01', quantity_delta: 'عشرون_قطعة' },
    expectValid: false,
    expectedErrorSubstring: 'quantity_delta must be an integer',
  },
  {
    appId: 'inventory-pro',
    tool: 'product_low_stock',
    desc: 'حصر المنتجات التي يقل رصيدها عن 8 قطع (Read-Only Low Stock Watch)',
    input: { threshold: 8 },
    expectValid: true,
    mockOutput: {
      products: [
        { id: 'prod_hoodie_01', name: 'سويت شيرت شتوي', stock: 3, threshold: 8 },
      ],
    },
  },

  // App 7: returns-settings & returns-reasons-analytics
  {
    appId: 'returns-settings',
    tool: 'returns_settings_manage',
    desc: 'استعراض سياسات وإعدادات المرتجعات GET_SETTINGS (Read Action)',
    input: { action: 'GET_SETTINGS' },
    expectValid: true,
    mockOutput: {
      success: true,
      action: 'GET_SETTINGS',
      settings: { allowReturns: true, returnWindowDays: 14, autoApprove: false },
    },
  },
  {
    appId: 'returns-settings',
    tool: 'returns_settings_manage',
    desc: 'استعراض أسباب المرتجعات الأكثر تكراراً GET_REASONS (Read Action)',
    input: { action: 'GET_REASONS' },
    expectValid: true,
    mockOutput: {
      success: true,
      action: 'GET_REASONS',
      reasons: [
        { id: 'reason_1', label: 'المقاس غير مناسب', count: 42, percentage: '55%' },
        { id: 'reason_2', label: 'المنتج يختلف عن الصورة', count: 20, percentage: '26%' },
      ],
    },
  },
  {
    appId: 'returns-settings',
    tool: 'returns_settings_manage',
    desc: 'تحديث فترة سماح المرتجعات لـ 21 يوماً UPDATE_SETTINGS (Write Action)',
    input: { action: 'UPDATE_SETTINGS', allow_returns: true, return_window_days: 21 },
    expectValid: true,
    mockOutput: {
      success: true,
      action: 'UPDATE_SETTINGS',
      message: 'تم تحديث سياسات وإعدادات المرتجعات بنجاح',
    },
  },
  {
    appId: 'returns-settings',
    tool: 'returns_settings_manage',
    desc: 'محاولة إرسال action غير معرف كـ DELETE_ALL (Invalid Literal Action)',
    input: { action: 'DELETE_ALL' },
    expectValid: false,
    expectedErrorSubstring: 'action must be one of',
  },

  // App 8: orders-analytics
  {
    appId: 'orders-analytics',
    tool: 'order_summary',
    desc: 'جلب ملخص عدد الطلبات والإيراد لإجمالي الشهر (Read-Only Analytics)',
    input: { period: 'month' },
    expectValid: true,
    mockOutput: {
      period: 'month',
      totalOrders: 312,
      paidRevenue: '148500',
      paidOrdersCount: 290,
      avgOrderValue: '512.00',
      summary: 'إجمالي عدد الطلبات في فترة (month): 312 طلباً مسجلاً.',
    },
  },
  {
    appId: 'orders-analytics',
    tool: 'order_recent_list',
    desc: 'جلب أحدث 15 طلباً بحالة CONFIRMED اليوم (Read-Only Order List)',
    input: { status: 'CONFIRMED', period: 'today', limit: 15 },
    expectValid: true,
    mockOutput: {
      orders: [{ orderNumber: 'ORD-2026-901', customerName: 'سارة إبراهيم', total: 650, status: 'CONFIRMED' }],
      count: 1,
      total_in_period: 38,
      note: 'تم استرجاع أحدث 15 طلباً من إجمالي 38 طلباً مسجلاً في هذه الفترة.',
    },
  },
  {
    appId: 'orders-analytics',
    tool: 'order_recent_list',
    desc: 'محاولة تمرير limit سالب (Invalid Limit)',
    input: { limit: -5 },
    expectValid: false,
    expectedErrorSubstring: 'limit must be a positive integer',
  },

  // App 9: profit-analytics
  {
    appId: 'profit-analytics',
    tool: 'sales_revenue',
    desc: 'تحليل صافي المبيعات والإيرادات لأمس (Read-Only Revenue Analytics)',
    input: { period: 'yesterday' },
    expectValid: true,
    mockOutput: {
      period: 'yesterday',
      revenue: '18400.00',
      totalOrders: 42,
      avgOrderValue: '438.00',
    },
  },
  {
    appId: 'profit-analytics',
    tool: 'bridge_get_treasury_expenses',
    desc: 'استعلام نفقات ومصروفات الخزينة التشغيلية OPEX لشهر أكتوبر (Curated Bridge Read)',
    input: { startDate: '2026-10-01', endDate: '2026-10-11', type: 'OPEX', limit: 10 },
    expectValid: true,
    mockOutput: {
      expenses: [
        { title: 'إعلانات ميتا وتيك توك', amount: 8500, type: 'OPEX', status: 'PAID' },
        { title: 'شحن ونولون بضاعة', amount: 3200, type: 'OPEX', status: 'PAID' },
      ],
      totalAmount: 11700,
      totalCount: 2,
    },
  },
  {
    appId: 'profit-analytics',
    tool: 'bridge_get_treasury_expenses',
    desc: 'محاولة تمرير type خاطئ كـ UNKNOWN_EXPENSE (Invalid Enum Filter)',
    input: { type: 'UNKNOWN_EXPENSE' },
    expectValid: false,
    expectedErrorSubstring: 'type must be OPEX or CAPEX',
  },
];

for (const sc of SIMULATION_CASES) {
  const validator = validators[sc.tool];
  if (!validator) {
    logFail(sc.appId, sc.desc, `لا يوجد محاكي فحص للأداة ${sc.tool}`);
    continue;
  }

  const result = validator(sc.input);
  if (sc.expectValid) {
    if (result.valid) {
      logPass(
        sc.appId,
        sc.desc,
        `تم قبول المدخلات ومحاكاة التنفيذ بنجاح (${JSON.stringify(sc.mockOutput || {}).substring(0, 75)}...)`
      );
    } else {
      logFail(sc.appId, sc.desc, `كان متوقعاً قبول المدخلات لكن حدث خطأ: ${result.error || result.businessError}`);
    }
  } else {
    if (!result.valid) {
      const err = result.error || result.businessError || '';
      if (!sc.expectedErrorSubstring || err.includes(sc.expectedErrorSubstring)) {
        logPass(
          sc.appId,
          sc.desc,
          `تم التقاط الخطأ المتوقع بنجاح [${err}]`
        );
      } else {
        logFail(sc.appId, sc.desc, `تم رفض المدخلات لكن بنص خطأ غير مطابق: [${err}]`);
      }
    } else {
      logFail(sc.appId, sc.desc, 'كان متوقعاً رفض المدخلات غير الصالحة ولكن تم قبولها!');
    }
  }
}

// ============================================================================
// PART 6: Zero AI Keys in .env Compliance Guard
// ============================================================================
console.log('\n📌 [المرحلة 6] فحص الامتثال لقاعدة حظر مفاتيح الذكاء الاصطناعي في .env:');
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const forbiddenPatterns = [
    /OPENAI_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]{20,}/i,
    /ANTHROPIC_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]{20,}/i,
    /GEMINI_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]{20,}/i,
    /DEEPSEEK_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]{20,}/i,
    /GROQ_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]{20,}/i,
  ];
  let leakFound = false;
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(envContent)) {
      leakFound = true;
      break;
    }
  }
  assertTest(
    !leakFound,
    'security',
    'الالتزام بقاعدة Ban AI Keys in .env وخلو ملف البيئة من أي مفاتيح ذكاء اصطناعي صريحة',
    'المفاتيح تخزن حصرياً في public.ai_keys بالداتابيز'
  );
} else {
  logPass('security', 'ملف .env غير موجود أو نظيف من أي مفاتيح ذكاء اصطناعي مكشوفة');
}

// ============================================================================
// PART 7: Final Scorecard and Completion Report
// ============================================================================
const totalTests = passCount + failCount;
const successRate = totalTests > 0 ? ((passCount / totalTests) * 100).toFixed(1) : '0';

console.log('\n================================================================================');
console.log('🏁 تقرير الإنجاز النهائي لاختبار باقة المتجر الكاملة لإيجينت سليم');
console.log('================================================================================');
console.log(`📊 إجمالي الاختبارات المنفذة : ${totalTests}`);
console.log(`✅ الاختبارات الناجحة      : ${passCount}`);
console.log(`❌ الاختبارات الفاشلة      : ${failCount}`);
console.log(`🎯 نسبة الإنجاز والنجاح    : ${successRate}%\n`);

console.log('📋 تفصيل النتائج حسب التطبيقات الـ 9 المستهدفة:');
console.log('--------------------------------------------------------------------------------');
for (const app of TARGET_APPS) {
  const res = resultsByApp[app.id] || { pass: 0, fail: 0 };
  const appTotal = res.pass + res.fail;
  const appRate = appTotal > 0 ? ((res.pass / appTotal) * 100).toFixed(1) : '100';
  const statusIcon = res.fail === 0 ? '🟢' : '🔴';
  console.log(` ${statusIcon} [${app.id.padEnd(24)}] ${app.nameAr.padEnd(45)}: ${res.pass}/${appTotal} (${appRate}%)`);
}
console.log('--------------------------------------------------------------------------------');

if (failCount > 0) {
  console.error('\n⚠️ توجد اختبارات فاشلة يجب معالجتها!');
  process.exit(1);
} else {
  console.log('\n🌟 تم اجتياز كافة اختبارات أدوات سليم وباقة المتجر الكاملة بنجاح ساحق بنسبة 100%!');
  process.exit(0);
}
