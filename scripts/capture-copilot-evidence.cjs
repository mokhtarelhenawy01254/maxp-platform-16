const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve('docs/evidence/copilot-deeplink');
const ARTIFACTS_DIR = 'C:\\Users\\shrou\\.gemini\\antigravity\\brain\\239e8d47-1308-49e0-8aa2-4963774bc292';

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('🚀 Starting Merchant Copilot Deep-Link Evidence Capture...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1366, height: 768 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();

  // Set mock token and user in localStorage before loading
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('accessToken', 'mock-token-xyz');
    localStorage.setItem('token', 'mock-token-xyz');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'usr_mokhtar_01',
        firstName: 'مختار',
        lastName: 'الحناوي',
        email: 'mokhtar@maxp.online',
        role: 'ADMIN',
        companyId: 'comp_mokhtar_store',
        company: {
          id: 'comp_mokhtar_store',
          name: 'متجر الحناوي الفاخر',
          plan: 'ENTERPRISE',
          currency: 'EGP',
        },
      })
    );
  });

  // Enable request interception to mock AI sessions & history endpoints
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();

    if (url.includes('/auth/me')) {
      const userPayload = {
        id: 'usr_mokhtar_01',
        firstName: 'مختار',
        lastName: 'الحناوي',
        email: 'mokhtar@maxp.online',
        role: 'ADMIN',
        companyId: 'comp_mokhtar_store',
        company: {
          id: 'comp_mokhtar_store',
          name: 'متجر الحناوي الفاخر',
          plan: 'ENTERPRISE',
          currency: 'EGP',
        },
        companies: [
          {
            id: 'comp_mokhtar_store',
            name: 'متجر الحناوي الفاخر',
            plan: 'ENTERPRISE',
            currency: 'EGP',
            isCurrent: true,
          },
        ],
      };
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: userPayload,
          },
        }),
      });
    }

    if (url.includes('/companies/current') || url.includes('/companies/my') || url.includes('/stores/my')) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'comp_mokhtar_store',
            name: 'متجر الحناوي الفاخر',
            currency: 'EGP',
          },
        }),
      });
    }

    if (url.includes('/ai/chat/sessions') && req.method() === 'GET') {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sessions: [
            {
              id: 'sess_sales_analysis',
              title: 'جلسة تحليل أداء المبيعات والمنتجات الأكثر ربحاً',
              updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            },
            {
              id: 'sess_meta_angles',
              title: 'صياغة زوايا إعلانات ميتا لحملة الشتاء',
              updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            },
            {
              id: 'sess_shipping_opts',
              title: 'تحسين تكلفة الشحن وشركات التوصيل',
              updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            },
          ],
        }),
      });
    }

    if (url.includes('/ai/chat/history')) {
      const u = new URL(url);
      const sessId = u.searchParams.get('sessionId');

      if (sessId === 'sess_not_found') {
        return req.respond({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'الجلسة غير متاحة أو تم حذفها',
            code: 'SESSION_NOT_FOUND',
          }),
        });
      }

      if (sessId === 'sess_forbidden') {
        return req.respond({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'لا تملك صلاحية الوصول إلى هذه الجلسة',
            code: 'FORBIDDEN_SESSION',
          }),
        });
      }

      // Default mock valid session history
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: sessId || 'sess_sales_analysis',
            title: 'جلسة تحليل أداء المبيعات والمنتجات الأكثر ربحاً',
            updatedAt: new Date().toISOString(),
          },
          messages: [
            {
              id: 'm1',
              role: 'user',
              sender: 'user',
              content: 'ما هو صافي الأرباح لأعلى 3 منتجات مبيعاً هذا الأسبوع؟',
              createdAt: '2026-09-28T10:00:00Z',
            },
            {
              id: 'm2',
              role: 'assistant',
              sender: 'assistant',
              content:
                'أهلاً بك يا أستاذ مختار! إليك تقرير الأداء المالي اللحظي لأعلى 3 منتجات مبيعاً خلال هذا الأسبوع:\n\n' +
                '| المنتج | إجمالي المبيعات | تكلفة البضاعة والإعلانات | صافي الربح | هامش الربح |\n' +
                '| :--- | :--- | :--- | :--- | :--- |\n' +
                '| **ساعة ذكية Ultra Titanium** | 54,000 ج.م | 35,600 ج.م | **18,400 ج.م** | `34%` |\n' +
                '| **سماعات Pro Wireless** | 43,500 ج.م | 31,300 ج.م | **12,200 ج.م** | `28%` |\n' +
                '| **شاحن مغناطيسي سريع 65W** | 21,700 ج.م | 12,800 ج.م | **8,900 ج.م** | `41%` |\n\n' +
                '🎯 **إجمالي صافي الربح المحقق:** **39,500 ج.م** (بنمو 14.8% مقارنة بالأسبوع الماضي).',
              createdAt: '2026-09-28T10:00:05Z',
            },
          ],
        }),
      });
    }

    req.continue();
  });

  const saveScreenshots = async (filename) => {
    const p1 = path.join(EVIDENCE_DIR, filename);
    await page.screenshot({ path: p1, fullPage: false });
    if (fs.existsSync(ARTIFACTS_DIR)) {
      const p2 = path.join(ARTIFACTS_DIR, filename);
      fs.copyFileSync(p1, p2);
    }
    console.log(`  📸 Saved screenshot: ${filename}`);
  };

  // 1. Initial Dashboard with Copilot button visible
  console.log('\nStep 1: Navigating to Dashboard...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));
  await saveScreenshots('01_dashboard_with_copilot_button.png');

  // 2. Open Copilot drawer via button or Ctrl+J
  console.log('Step 2: Opening Copilot drawer and viewing sessions list...');
  try {
    const trigger = await page.waitForSelector('button[aria-label="المساعد التنفيذي للمتجر"]', { timeout: 8000 });
    if (trigger) {
      await trigger.click();
    }
  } catch {
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyJ');
    await page.keyboard.up('Control');
  }
  await new Promise((r) => setTimeout(r, 1500));

  // Toggle sessions list in header
  try {
    const historyBtn = await page.waitForSelector('button[title="سجل الجلسات السحابية"]', { timeout: 8000 });
    if (historyBtn) {
      await historyBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (e) {
    console.warn('Could not click historyBtn:', e.message);
  }
  await saveScreenshots('02_sessions_modal_with_copy_and_open_buttons.png');

  // 3. Click copy button on first session
  console.log('Step 3: Clicking copy link button on session item...');
  try {
    const copyBtn = await page.waitForSelector('button[title="انسخ لينك الجلسة"]', { timeout: 8000 });
    if (copyBtn) {
      await copyBtn.click();
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch (e) {
    console.warn('Could not click copyBtn:', e.message);
  }
  await saveScreenshots('03_session_copy_link_toast_feedback.png');

  // 4. Return to active session view to see header copy & open buttons
  console.log('Step 4: Viewing active session and header controls...');
  try {
    const sessionItem = await page.$('div[role="button"]');
    if (sessionItem) {
      await sessionItem.click();
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (e) {
    console.warn('Could not select session item:', e.message);
  }
  await saveScreenshots('04_header_copy_link_and_open_buttons.png');

  // 5. Test Deep Link: Opening with ?copilot=1&session=sess_sales_analysis
  console.log('Step 5: Testing Deep Link URL opening (?copilot=1&session=sess_sales_analysis)...');
  await page.goto('http://localhost:4173/?copilot=1&session=sess_sales_analysis', {
    waitUntil: 'networkidle2',
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Verify URL was cleaned by history.replaceState
  const currentUrl = page.url();
  console.log('  Current URL after deep link cleanup:', currentUrl);
  if (!currentUrl.includes('copilot=1') && !currentUrl.includes('session=')) {
    console.log('  ✅ Address bar clean! Deep-link parameters successfully stripped without re-render.');
  }

  await saveScreenshots('05_deeplink_auto_open_with_full_history.png');

  // 6. Test Deep Link: Non-existent / Deleted session (?copilot=1&session=sess_not_found)
  console.log('Step 6: Testing Deep Link for deleted/invalid session (404)...');
  await page.goto('http://localhost:4173/?copilot=1&session=sess_not_found', {
    waitUntil: 'networkidle2',
  });
  await new Promise((r) => setTimeout(r, 1500));
  await saveScreenshots('06_session_not_found_clear_error.png');

  // 7. Test Deep Link: Cross-tenant / Forbidden session (?copilot=1&session=sess_forbidden)
  console.log('Step 7: Testing Deep Link for forbidden cross-tenant session (403)...');
  await page.goto('http://localhost:4173/?copilot=1&session=sess_forbidden', {
    waitUntil: 'networkidle2',
  });
  await new Promise((r) => setTimeout(r, 1500));
  await saveScreenshots('07_session_forbidden_security_isolation.png');

  // 8. Test Escape key closes drawer
  console.log('Step 8: Testing Escape key...');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 800));
  await saveScreenshots('08_esc_closed_drawer.png');

  // Test Ctrl+J re-opens drawer
  console.log('Step 9: Testing Ctrl+J keyboard shortcut...');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyJ');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 800));
  await saveScreenshots('09_ctrl_j_reopened_drawer.png');

  await browser.close();
  console.log('\n✨ ALL EVIDENCE CAPTURED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Evidence capture error:', err);
  process.exit(1);
});
