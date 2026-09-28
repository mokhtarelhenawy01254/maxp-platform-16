const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const EVIDENCE_DIR = path.resolve('docs/evidence/copilot-deeplink');
const ARTIFACTS_DIR = 'C:\\Users\\shrou\\.gemini\\antigravity\\brain\\239e8d47-1308-49e0-8aa2-4963774bc292';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('🎬 Generating Copilot Deep-Link Animated Demo...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1024, height: 600 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();

  // Set mock token and user
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
        companies: [
          {
            id: 'comp_mokhtar_store',
            name: 'متجر الحناوي الفاخر',
            plan: 'ENTERPRISE',
            currency: 'EGP',
            isCurrent: true,
          },
        ],
      })
    );
  });

  // Enable request interception
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();

    if (url.includes('/auth/me')) {
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'usr_mokhtar_01',
              firstName: 'مختار',
              lastName: 'الحناوي',
              role: 'ADMIN',
              companyId: 'comp_mokhtar_store',
              company: { id: 'comp_mokhtar_store', name: 'متجر الحناوي الفاخر' },
              companies: [{ id: 'comp_mokhtar_store', isCurrent: true, name: 'متجر الحناوي الفاخر' }],
            },
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
          ],
        }),
      });
    }

    if (url.includes('/ai/chat/history')) {
      const u = new URL(url);
      const sessId = u.searchParams.get('sessionId');

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
                '| المنتج | إجمالي المبيعات | صافي الربح | هامش الربح |\n' +
                '| :--- | :--- | :--- | :--- |\n' +
                '| **ساعة ذكية Ultra** | 54,000 ج.م | **18,400 ج.م** | `34%` |\n' +
                '| **سماعات Pro** | 43,500 ج.م | **12,200 ج.م** | `28%` |\n' +
                '| **شاحن سريع 65W** | 21,700 ج.م | **8,900 ج.م** | `41%` |\n\n' +
                '🎯 **إجمالي صافي الربح:** **39,500 ج.م** (+14.8%).',
              createdAt: '2026-09-28T10:00:05Z',
            },
          ],
        }),
      });
    }

    req.continue();
  });

  const rawFrames = [];

  const captureFrame = async (delayMs = 1200) => {
    const base64 = await page.screenshot({ encoding: 'base64', fullPage: false });
    rawFrames.push({ base64, delay: delayMs });
    console.log(`  Captured frame ${rawFrames.length} (delay: ${delayMs}ms)`);
  };

  // 1. Dashboard
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  await captureFrame(1000);

  // 2. Open Copilot drawer
  try {
    const trigger = await page.waitForSelector('button[aria-label="المساعد التنفيذي للمتجر"]', { timeout: 5000 });
    if (trigger) await trigger.click();
  } catch {
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyJ');
    await page.keyboard.up('Control');
  }
  await new Promise((r) => setTimeout(r, 1200));
  await captureFrame(1200);

  // 3. Open sessions modal
  try {
    const hist = await page.waitForSelector('button[title="سجل الجلسات السحابية"]', { timeout: 5000 });
    if (hist) await hist.click();
  } catch {}
  await new Promise((r) => setTimeout(r, 1200));
  await captureFrame(1500);

  // 4. Click copy link
  try {
    const copy = await page.waitForSelector('button[title="انسخ لينك الجلسة"]', { timeout: 5000 });
    if (copy) await copy.click();
  } catch {}
  await new Promise((r) => setTimeout(r, 800));
  await captureFrame(1500);

  // 5. Open Deep Link directly
  await page.goto('http://localhost:4173/?copilot=1&session=sess_sales_analysis', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  await captureFrame(2200);

  // Compile frames into GIF inside browser canvas
  console.log('\n🎞️ Compiling frames into animated GIF using browser canvas...');
  const gifData = await page.evaluate(async (frames) => {
    const width = 1024;
    const height = 600;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const framesData = [];
    for (const f of frames) {
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const imgData = ctx.getImageData(0, 0, width, height);
          framesData.push({
            data: Array.from(imgData.data),
            delay: f.delay,
          });
          resolve();
        };
        img.src = 'data:image/png;base64,' + f.base64;
      });
    }
    return framesData;
  }, rawFrames);

  await browser.close();

  const width = 1024;
  const height = 600;
  const gif = GIFEncoder();

  for (const f of gifData) {
    const u8 = new Uint8Array(f.data);
    const palette = quantize(u8, 256);
    const index = applyPalette(u8, palette);
    gif.writeFrame(index, width, height, { palette, delay: f.delay });
  }

  gif.finish();
  const gifBuffer = Buffer.from(gif.bytes());

  const outPath1 = path.join(EVIDENCE_DIR, 'copilot_session_deeplink_demo.gif');
  fs.writeFileSync(outPath1, gifBuffer);
  console.log(`✅ Saved animated GIF to: ${outPath1} (${gifBuffer.length} bytes)`);

  if (fs.existsSync(ARTIFACTS_DIR)) {
    const outPath2 = path.join(ARTIFACTS_DIR, 'copilot_session_deeplink_demo.gif');
    fs.writeFileSync(outPath2, gifBuffer);
    console.log(`✅ Copied animated GIF to artifacts: ${outPath2}`);
  }

  console.log('🎉 Animated demo generation complete!');
}

run().catch((err) => {
  console.error('❌ Failed generating demo video/gif:', err);
  process.exit(1);
});
