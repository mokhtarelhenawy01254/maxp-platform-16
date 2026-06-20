import { chromium } from 'H:/maxp-platform/apps/frontend/node_modules/playwright/index.mjs';

const TARGET = 'http://localhost:3001/admin/agent-profiles?agent=agent_ea7978_f0ebbcd7-16af-4e76-bc47-b0405bd2a3bf';
const OUT = 'H:/maxp-platform/.codex/temp';

const agents = [
  { id: 'agent_ceo_001', name: 'المدير التنفيذي', role: 'CEO', icon: '👔', tools: ['delegate_task','review_plan'], skills: ['ceo_soul'] },
  { id: 'agent_ea7978_f0ebbcd7-16af-4e76-bc47-b0405bd2a3bf', name: 'مندوب المبيعات', role: 'Sales', icon: '🛒', tools: ['search_products','create_order','reply_customer'], skills: ['sales_skill'] },
  { id: 'agent_sup_003', name: 'الدعم الفني', role: 'Support', icon: '🎧', tools: ['read_ticket','reply_customer'], skills: ['support_skill'] },
  { id: 'agent_mkt_004', name: 'المسوق', role: 'Marketing', icon: '📢', tools: ['create_ad','schedule_post'], skills: ['marketing_skill'] },
];

const selectedAgent = agents[1];

const profile = {
  success: true,
  agent: {
    id: selectedAgent.id,
    name: selectedAgent.name,
    role: selectedAgent.role,
    icon: selectedAgent.icon,
    description: 'وكيل مبيعات يتعامل مع العملاء ويساعدهم في اختيار المنتجات وتنفيذ الطلبات بسرعة وود.',
    model: 'gemini-2.5-pro',
    status: 'ACTIVE',
    templateSlug: 'sales-v1',
    toolAutonomy: { search_products: 'auto', create_order: 'approval', reply_customer: 'auto' },
    config: { soul_persona: 'ودود ومحترف', language: 'ar' },
  },
  files: {
    'SOUL.md': `# ${selectedAgent.name}\n\n## الشخصية\n- ودي، سريع، يعرف المنتجات.\n- يتحدث بالعربية الفصحى والمصرية.\n\n## الهدف\nزيادة المبيعات وتقليل وقت الرد.`,
    'AGENTS.md': '# تعريف الوكلاء\n\nCEO -> Sales -> Support -> Marketing',
    'TOOLS.md': '# الأدوات المتاحة\n\n- search_products\n- create_order\n- reply_customer',
    'PERSONA.md': '# شخصية المبيعات\n\nمحترف، ودود، لا يبالغ في الإقناع.',
  },
  allowedTools: ['search_products','create_order','reply_customer','check_inventory'],
  skills: [
    { id: 'sales_skill', displayName: 'مهارات المبيعات', description: 'إتقان خطوات البيع والترقية.', instructions: 'استخدم اسئلة فتحية.', allowedTools: ['search_products','create_order'], enabled: true },
    { id: 'product_knowledge', displayName: 'معرفة المنتجات', description: 'يعرف تفاصيل المخزون والأسعار.', instructions: 'تحقق من المخزون قبل الطلب.', allowedTools: ['check_inventory'], enabled: true },
  ],
  skillIds: ['sales_skill','product_knowledge'],
  modelPolicy: { default: 'gemini-2.5-pro', fallback: 'gemini-2.5-flash' },
};

const tools = [
  { name: 'search_products', description: 'بحث عن منتجات حسب الاسم أو الفئة', sideEffects: 'read' },
  { name: 'create_order', description: 'إنشاء طلب جديد للعميل', sideEffects: 'write' },
  { name: 'reply_customer', description: 'رد آلي على رسائل العملاء', sideEffects: 'write' },
  { name: 'check_inventory', description: 'التحقق من توفر المنتج في المخزون', sideEffects: 'read' },
  { name: 'delegate_task', description: 'تفويض مهمة لوكيل آخر', sideEffects: 'write' },
  { name: 'review_plan', description: 'مراجعة خطة العمل', sideEffects: 'read' },
  { name: 'create_ad', description: 'إنشاء إعلان', sideEffects: 'write' },
  { name: 'schedule_post', description: 'جدولة منشور', sideEffects: 'write' },
];

const skills = [
  { id: 'sales_skill', displayName: 'مهارات المبيعات' },
  { id: 'product_knowledge', displayName: 'معرفة المنتجات' },
  { id: 'support_skill', displayName: 'مهارات الدعم' },
  { id: 'marketing_skill', displayName: 'مهارات التسويق' },
];

const models = [
  { id: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'gemini-2.5-flash', modelName: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'llama-3.3-70b', modelName: 'Llama 3.3 70B', provider: 'groq' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar-EG', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Seed a dummy token so the SPA doesn't redirect to login.
  await page.goto('about:blank');
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'dummy');
    localStorage.setItem('token', 'dummy');
    sessionStorage.setItem('accessToken', 'dummy');
    sessionStorage.setItem('token', 'dummy');
  });

  await page.route('**/api/v1/ai-sandbox/agents', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, agents }) });
  });
  await page.route('**/api/v1/ai-sandbox/agents/*/profile', async (route) => {
    const url = route.request().url();
    const id = url.split('/').slice(-2)[0];
    const agent = agents.find(a => a.id === id) || selectedAgent;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...profile, agent: { ...profile.agent, id: agent.id, name: agent.name, role: agent.role, icon: agent.icon } }) });
  });
  await page.route('**/api/v1/agent/available-models', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, models }) });
  });
  await page.route('**/api/v1/agent/tools', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, tools }) });
  });
  await page.route('**/api/v1/agent/skills', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, skills }) });
  });
  await page.route('**/api/v1/agent-manager/profiles', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, profiles: [] }) });
  });
  await page.route('**/api/v1/agent/agents/*/status', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, agent: { status: 'ACTIVE' } }) }));

  await page.goto(TARGET, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: `${OUT}/agent-profiles-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/agent-profiles-mobile.png`, fullPage: true });

  await browser.close();
  console.log('Screenshots saved to', OUT);
})();
