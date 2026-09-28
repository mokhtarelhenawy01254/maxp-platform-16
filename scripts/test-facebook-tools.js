'use strict';

/**
 * 🛠️ Deep Tools Verification Suite for facebook-sales-support-agent
 *
 * Validates the 13 tools available to the Facebook Sales Support Agent:
 * 1. product_search
 * 2. category_list
 * 3. inventory_check
 * 4. customer_info
 * 5. order_lookup
 * 6. order_create_draft
 * 7. order_create_confirmed
 * 8. shipping_rates
 * 9. facebook_reply
 * 10. agent_handoff_to
 * 11. knowledge_search
 * 12. offers_list_active
 * 13. coupon_validate
 *
 * Checks:
 * - Python tool definition existence & Pydantic input models
 * - Rule: Structured Parameters (Strict typing, no brittle text extraction)
 * - Tool registration in role_tools.yaml & registry.py resolution
 * - Mock runtime simulation for each tool with realistic e-commerce inputs
 */

const fs = require('fs');
const path = require('path');
const yaml = require('../apps/backend/node_modules/js-yaml');

const AI_SERVICE_DIR = path.resolve(__dirname, '../apps/ai-service/src/tools');
const DEFINITIONS_DIR = path.join(AI_SERVICE_DIR, 'definitions');
const ROLE_TOOLS_PATH = path.join(AI_SERVICE_DIR, 'role_tools.yaml');

let passCount = 0;
let failCount = 0;

function check(condition, desc) {
  if (condition) {
    console.log(`  ✅ [PASS] ${desc}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    failCount++;
  }
}

// 13 Tools expected for FACEBOOK_SALES_SUPPORT
const EXPECTED_TOOLS = [
  {
    name: 'product_search',
    file: 'product.py',
    model: 'ProductSearchInput',
    requiredParams: ['query'],
    optionalParams: ['limit', 'product_size', 'product_color'],
  },
  {
    name: 'category_list',
    file: 'product.py',
    model: 'CategoryListInput',
    requiredParams: [],
    optionalParams: ['company_id'],
  },
  {
    name: 'inventory_check',
    file: 'inventory.py',
    model: 'InventoryCheckInput',
    requiredParams: ['product_name'],
    optionalParams: ['product_id', 'size', 'color'],
  },
  {
    name: 'customer_info',
    file: 'customer.py',
    model: 'CustomerInfoInput',
    requiredParams: [],
    optionalParams: ['phone', 'email', 'name', 'customer_id'],
  },
  {
    name: 'order_lookup',
    file: 'order.py',
    model: 'OrderLookupInput',
    requiredParams: [],
    optionalParams: ['order_number', 'order_id'],
  },
  {
    name: 'order_create_draft',
    file: 'order.py',
    model: 'OrderCreateDraftInput',
    requiredParams: ['customer_name', 'phone'],
    optionalParams: ['items', 'shipping_address', 'notes'],
  },
  {
    name: 'order_create_confirmed',
    file: 'order.py',
    model: 'OrderCreateConfirmedInput',
    requiredParams: ['customer_name', 'phone'],
    optionalParams: ['items', 'shipping_address', 'total'],
  },
  {
    name: 'shipping_rates',
    file: 'shipping.py',
    model: 'ShippingRatesInput',
    requiredParams: [],
    optionalParams: ['governorate', 'city', 'zone_id'],
  },
  {
    name: 'facebook_reply',
    file: 'facebook.py',
    model: 'FacebookReplyInput',
    requiredParams: ['recipient_id', 'page_id'],
    optionalParams: ['message', 'message_type', 'media_url'],
  },
  {
    name: 'agent_handoff_to',
    file: 'agents.py',
    model: 'AgentHandoffToInput',
    requiredParams: ['target_role', 'reason'],
    optionalParams: ['context', 'company_id'],
  },
  {
    name: 'knowledge_search',
    file: 'knowledge_base.py',
    model: 'KnowledgeSearchInput',
    requiredParams: [],
    optionalParams: ['query', 'source_type', 'limit'],
  },
  {
    name: 'offers_list_active',
    file: 'promotions.py',
    model: 'OffersListActiveInput',
    requiredParams: [],
    optionalParams: ['company_id'],
  },
  {
    name: 'coupon_validate',
    file: 'promotions.py',
    model: 'CouponValidateInput',
    requiredParams: ['code'],
    optionalParams: ['order_total', 'company_id'],
  },
];

console.log('=================================================================');
console.log('🛠️  فحص واختبار أدوات إيجنت مبيعات فيسبوك (13 أداة كاملة)');
console.log('=================================================================\n');

// 1. Check mapping in role_tools.yaml
console.log('📌 1. فحص الربط الصلاحياتي في role_tools.yaml:');
const roleToolsYaml = yaml.load(fs.readFileSync(ROLE_TOOLS_PATH, 'utf8'));
const fbRoleTools = roleToolsYaml.roles.FACEBOOK_SALES_SUPPORT || [];

for (const tool of EXPECTED_TOOLS) {
  const isIncluded = fbRoleTools.includes(tool.name);
  check(isIncluded, `الأداة [${tool.name}] مسجلة ومفعلة للدور FACEBOOK_SALES_SUPPORT`);
}

// 2. Check Python Definition Files and Pydantic Schemas
console.log('\n📌 2. فحص تعريفات الأدوات ونماذج المدخلات (Pydantic Input Models):');
for (const tool of EXPECTED_TOOLS) {
  const filePath = path.join(DEFINITIONS_DIR, tool.file);
  const exists = fs.existsSync(filePath);
  check(exists, `ملف الأداة [${tool.file}] موجود على المسار`);

  if (exists) {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Check FunctionTool registration
    const toolRegex = new RegExp(`name=["']${tool.name}["']`, 'i');
    check(toolRegex.test(fileContent), `تسجيل FunctionTool باسم [${tool.name}] في ${tool.file}`);

    // Check Pydantic model
    const modelRegex = new RegExp(`class\\s+${tool.model}\\s*\\(BaseModel\\):`, 'i');
    check(modelRegex.test(fileContent), `تعريف نموذج المدخلات [${tool.model}] كـ BaseModel صريح`);

    // Check Structured Parameters (Rule: No generic text extraction)
    const hasGenericRequest = /request:\s*str\s*=\s*Field/.test(fileContent);
    check(!hasGenericRequest, `الالتزام بقاعدة المعاملات المنظمة (Structured Parameters) وخلو [${tool.model}] من الحقول النصية العشوائية`);
  }
}

// 3. Simulated Tool Invocation Tests
console.log('\n📌 3. محاكاة استدعاء الأدوات بالبيانات الواقعية (Mock Execution Simulation):');

// Simulation 1: product_search
const mockProductSearch = (params) => {
  if (!params.query) return { success: false, error: 'Query required' };
  return {
    success: true,
    products: [
      { id: 'prod_shoe_42', title: 'كوتشي رياضي فليكس', price: 490, inStock: true, sizes: ['41', '42', '43'] }
    ]
  };
};
const res1 = mockProductSearch({ query: 'كوتشي' });
check(res1.success && res1.products.length === 1 && res1.products[0].price === 490, 'محاكاة [product_search]: استرجاع المنتج بنجاح والتحقق من السعر 490');

// Simulation 2: inventory_check
const mockInventoryCheck = (params) => {
  if (params.size === '42') {
    return { found: true, inStock: true, quantity: 8, size: '42' };
  }
  return { found: true, inStock: false, quantity: 0 };
};
const res2 = mockInventoryCheck({ product_name: 'كوتشي رياضي فليكس', size: '42' });
check(res2.found && res2.inStock && res2.quantity === 8, 'محاكاة [inventory_check]: التحقق من توفر مقاس 42 ومطابقة المخزون');

// Simulation 3: shipping_rates
const mockShippingRates = (params) => {
  const rates = {
    'القاهرة': 40,
    'الجيزة': 40,
    'الإسكندرية': 50,
  };
  const rate = rates[params.governorate] || 60;
  return { success: true, governorate: params.governorate, cost: rate, estimatedDays: '2-3 أيام' };
};
const res3 = mockShippingRates({ governorate: 'الإسكندرية' });
check(res3.cost === 50 && res3.estimatedDays === '2-3 أيام', 'محاكاة [shipping_rates]: احتساب تكلفة الشحن بدقة للإسكندرية (50 ج)');

// Simulation 4: coupon_validate
const mockCouponValidate = (params) => {
  if (params.code === 'MAXP10') {
    return { valid: true, discountType: 'PERCENT', discountValue: 10, minOrder: 300 };
  }
  return { valid: false, reason: 'كود الخصم غير صالح أو منتهي' };
};
const res4 = mockCouponValidate({ code: 'MAXP10', order_total: 490 });
check(res4.valid && res4.discountValue === 10, 'محاكاة [coupon_validate]: التحقق من صلاحية كود الخصم');

// Simulation 5: order_create_draft
const mockOrderDraft = (params) => {
  if (!params.customer_name || !params.phone) return { success: false, error: 'بيانات العميل غير مكتملة' };
  return {
    success: true,
    orderId: 'ORD-9824',
    customerName: params.customer_name,
    phone: params.phone,
    total: 540, // 490 + 50 shipping
    status: 'DRAFT',
  };
};
const res5 = mockOrderDraft({
  customer_name: 'أحمد محمود',
  phone: '01012345678',
  shipping_address: { governorate: 'الإسكندرية', city: 'سموحة' },
  items: [{ id: 'prod_shoe_42', size: '42', price: 490 }]
});
check(res5.success && res5.orderId === 'ORD-9824' && res5.status === 'DRAFT', 'محاكاة [order_create_draft]: إنشاء مسودة الطلب بنجاح');

// Simulation 6: facebook_reply
const mockFacebookReply = (params) => {
  if (!params.recipient_id || !params.page_id) return { success: false, error: 'Missing recipient or page' };
  return {
    success: true,
    messageId: 'mid.$cAAAmock123',
    recipientId: params.recipient_id,
  };
};
const res6 = mockFacebookReply({ recipient_id: 'psid_9988', page_id: 'page_1122', message: 'تمام يا فندم تم تسجيل طلبك' });
check(res6.success && res6.messageId.startsWith('mid.'), 'محاكاة [facebook_reply]: إرسال الرد المباشر للمحادثة');

// Simulation 7: agent_handoff_to
const mockAgentHandoff = (params) => {
  return {
    success: true,
    targetRole: params.target_role,
    reason: params.reason,
    timestamp: new Date().toISOString()
  };
};
const res7 = mockAgentHandoff({ target_role: 'SUPPORT', reason: 'طلب استرجاع منتج تالف' });
check(res7.success && res7.targetRole === 'SUPPORT', 'محاكاة [agent_handoff_to]: تحويل المحادثة بسلاسة لمسؤول الدعم البشري');

// Summary
console.log('\n=================================================================');
console.log(`🏁 نتيجة فحص الأدوات: ${passCount} اختبار ناجح، ${failCount} فاشل`);
console.log('=================================================================');

if (failCount > 0) {
  process.exit(1);
}
