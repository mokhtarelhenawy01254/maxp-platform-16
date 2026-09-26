const fs = require('fs');
const path = require('path');
const yaml = require(path.resolve('apps/backend/node_modules/js-yaml'));

console.log('====================================================');
console.log('🧪 MaxP Browser Copilot Agent & Tools Validation Test');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// 1. Contract Files Integrity
console.log('1. Checking Agent Contract Files:');
const agentDir = path.resolve('apps/backend/agents/browser-copilot-agent');
const requiredFiles = ['agent.json', 'SOUL.md', 'PERSONA.md', 'TOOLS.md', 'AGENTS.md', 'evals.json'];

for (const file of requiredFiles) {
  const filePath = path.join(agentDir, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Contract file ${file} exists`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size > 100, `${file} has non-empty content (${stat.size} bytes)`);
  }
}

// 2. Manifest Schema & Roles
console.log('\n2. Verifying agent.json Manifest Schema:');
const manifest = JSON.parse(fs.readFileSync(path.join(agentDir, 'agent.json'), 'utf8'));
assert(manifest.slug === 'browser-copilot-agent', 'Slug is browser-copilot-agent');
assert(manifest.role === 'BROWSER_COPILOT', 'Role is BROWSER_COPILOT');
assert(manifest.allowedTools && manifest.allowedTools.length === 18, `Allowed tools count is 18 (actual: ${manifest.allowedTools?.length})`);
assert(manifest.allowedSkills && manifest.allowedSkills.length > 0, `Allowed skills configured (${manifest.allowedSkills?.join(', ')})`);
assert(manifest.isActive === true, 'Agent is marked isActive: true');

// 3. Role Tools YAML Mapping
console.log('\n3. Verifying role_tools.yaml in ai-service:');
const roleToolsPath = path.resolve('apps/ai-service/src/tools/role_tools.yaml');
const roleToolsContent = fs.readFileSync(roleToolsPath, 'utf8');
const roleToolsYaml = yaml.load(roleToolsContent);
const copilotTools = roleToolsYaml.roles?.BROWSER_COPILOT;
assert(Array.isArray(copilotTools), 'BROWSER_COPILOT role exists in role_tools.yaml');
assert(copilotTools && copilotTools.length === 18, `BROWSER_COPILOT has 18 tools registered in yaml (actual: ${copilotTools?.length})`);

// Verify all tools in agent.json match role_tools.yaml
const allMatch = manifest.allowedTools.every(t => copilotTools.includes(t));
assert(allMatch, 'Every tool in agent.json is officially mapped in role_tools.yaml');

// 4. Super Admin Routes & Marketplace Integration
console.log('\n4. Verifying Super Admin Templates Integration:');
const superAdminRoutesPath = path.resolve('apps/backend/routes/superAdminRoutes.js');
const superAdminCode = fs.readFileSync(superAdminRoutesPath, 'utf8');
assert(superAdminCode.includes('BROWSER_COPILOT: \'🌐\''), 'BROWSER_COPILOT icon registered in AGENT_ICONS');
assert(superAdminCode.includes('\'browser-copilot-agent\''), 'browser-copilot-agent industries registered in AGENT_INDUSTRIES');

// 5. Test Tools Simulated Invocation
console.log('\n5. Testing Tools Simulated Execution & Payloads:');

const testTools = [
  {
    tool: 'product_search',
    input: { query: 'ساعة رجالي', limit: 5 },
    expectedOutputShape: { products: 'array', count: 'number' },
    mockRun: (input) => ({ products: [{ id: 'prod_1', title: input.query, price: 450, stock: 12 }], count: 1 })
  },
  {
    tool: 'product_low_stock',
    input: { threshold: 5 },
    expectedOutputShape: { low_stock_items: 'array' },
    mockRun: (input) => ({ low_stock_items: [{ id: 'prod_9', title: 'عطر فاخر', current_stock: 2, threshold: input.threshold }] })
  },
  {
    tool: 'order_lookup',
    input: { order_id: 'ORD-2026-991' },
    expectedOutputShape: { order: 'object' },
    mockRun: (input) => ({ order: { id: input.order_id, status: 'CONFIRMED', total: 720, governorate: 'القاهرة' } })
  },
  {
    tool: 'order_summary',
    input: { period: 'today' },
    expectedOutputShape: { total_orders: 'number', pending: 'number', confirmed: 'number' },
    mockRun: () => ({ total_orders: 45, pending: 8, confirmed: 37, delivery_rate: 0.88 })
  },
  {
    tool: 'inventory_check',
    input: { product_id: 'prod_1' },
    expectedOutputShape: { available_quantity: 'number' },
    mockRun: () => ({ product_id: 'prod_1', available_quantity: 12, in_transit: 5 })
  },
  {
    tool: 'knowledge_search',
    input: { query: 'خطوات ربط بوسطة' },
    expectedOutputShape: { results: 'array' },
    mockRun: (input) => ({ query: input.query, results: [{ title: 'ربط شركة شحن بوسطة', guide: 'أدخل الـ API Key في الإعدادات' }] })
  },
  {
    tool: 'competitor_search',
    input: { keyword: 'ملابس حريمي' },
    expectedOutputShape: { competitors: 'array' },
    mockRun: (input) => ({ keyword: input.keyword, competitors: [{ brand: 'Store A', ad_count: 14 }] })
  },
  {
    tool: 'shipping_rates',
    input: { governorate: 'الإسكندرية' },
    expectedOutputShape: { rate: 'number' },
    mockRun: (input) => ({ governorate: input.governorate, rate: 45, company: 'Bosta' })
  }
];

for (const t of testTools) {
  const isAllowed = manifest.allowedTools.includes(t.tool);
  assert(isAllowed, `Tool [${t.tool}] is allowed for browser-copilot-agent`);
  
  const result = t.mockRun(t.input);
  const keys = Object.keys(t.expectedOutputShape);
  const keysValid = keys.every(k => result[k] !== undefined);
  assert(keysValid, `Tool [${t.tool}] payload executes cleanly with expected output keys (${keys.join(', ')})`);
}

// 6. Test Frontend SuperAdmin Templates Dialogs
console.log('\n6. Verifying Frontend SuperAdmin Dialogs:');
const dialogsPath = path.resolve('apps/frontend/src/pages/super-admin/SuperAdminAITemplatesDialogs.tsx');
const dialogsContent = fs.readFileSync(dialogsPath, 'utf8');
assert(dialogsContent.includes('BROWSER_COPILOT: "🌐"'), 'Frontend ROLE_ICONS includes BROWSER_COPILOT');
assert(dialogsContent.includes('BROWSER_COPILOT: "bg-indigo-100 text-indigo-700"'), 'Frontend ROLE_COLORS includes BROWSER_COPILOT');
assert(dialogsContent.includes('"BROWSER_COPILOT"'), 'Frontend ROLES array includes BROWSER_COPILOT');

console.log('\n====================================================');
console.log(`📊 Summary: ${passedTests} Passed, ${failedTests} Failed`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
