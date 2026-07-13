const { chromium } = require('H:/maxp-platform/apps/frontend/node_modules/playwright-core');
const CHROME_EXE = 'C:/Users/mokhtar/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

const TARGET = 'http://localhost:3001/admin/agent-profiles?agent=agent_ea7978_f0ebbcd7-16af-4e76-bc47-b0405bd2a3bf';

const agents = [{ id: 'agent_ea7978_f0ebbcd7-16af-4e76-bc47-b0405bd2a3bf', name: 'مندوب المبيعات', role: 'Sales', icon: '🛒', tools: [], skills: [] }];
const profile = { success: true, agent: { id: agents[0].id, name: agents[0].name, role: agents[0].role, icon: agents[0].icon, description: '', model: 'gemini-2.5-pro', status: 'ACTIVE', templateSlug: 'sales-v1', toolAutonomy: {}, config: {} }, files: { 'SOUL.md': '', 'AGENTS.md': '', 'TOOLS.md': '', 'PERSONA.md': '' }, allowedTools: [], skills: [], skillIds: [], modelPolicy: null };
const tools = [];
const skills = [];
const models = [];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_EXE });
  const context = await browser.newContext({ locale: 'ar-EG', viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { localStorage.setItem('accessToken', 'dummy'); localStorage.setItem('token', 'dummy'); });
  const page = await context.newPage();
  await page.route('**/api/v1/ai-sandbox/agents', r => r.fulfill({ status: 200, body: JSON.stringify({ success: true, agents }) }));
  await page.route('**/api/v1/ai-sandbox/agents/*/profile', r => r.fulfill({ status: 200, body: JSON.stringify(profile) }));
  await page.route('**/api/v1/agent/available-models', r => r.fulfill({ status: 200, body: JSON.stringify({ success: true, models }) }));
  await page.route('**/api/v1/agent/tools', r => r.fulfill({ status: 200, body: JSON.stringify({ success: true, tools }) }));
  await page.route('**/api/v1/agent/skills', r => r.fulfill({ status: 200, body: JSON.stringify({ success: true, skills }) }));

  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const title = await page.title();
  console.log('title:', title);

  const info = await page.evaluate(() => {
    return {
      title: document.title,
      h1: document.querySelector('h1')?.innerText,
    };
  });
  console.log('eval:', info);

  await browser.close();
})();
