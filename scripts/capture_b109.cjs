const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_products_header',
    path: '/products',
    empty: false,
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
  {
    name: 'adm_products_bulk_bar',
    path: '/products',
    empty: false,
    action: async (page) => {
      await page.waitForTimeout(1500);
      try {
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 3000 })) {
          await checkbox.click();
          await page.waitForTimeout(800);
        }
      } catch (e) {
        console.error('Check checkbox failed', e.message);
      }
    }
  },
  {
    name: 'adm_products_pagination',
    path: '/products',
    empty: false,
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
  {
    name: 'adm_products_convert_modal',
    path: '/products',
    empty: false,
    action: async (page) => {
      await page.waitForTimeout(1500);
      try {
        const convertBtn = page.locator('button:has-text("عروض"), button:has-text("تحويل")').first();
        if (await convertBtn.isVisible({ timeout: 2000 })) {
          await convertBtn.click();
          await page.waitForTimeout(800);
        }
      } catch (e) {}
    }
  },
  {
    name: 'adm_products_empty_state',
    path: '/products',
    empty: true,
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
];

const mockProductsList = [
  {
    id: 'prod-1',
    name: 'طقم ملابس رجالي كاجوال عصري',
    sku: 'CAS-SET-01',
    price: 650,
    costPrice: 400,
    stockQuantity: 45,
    status: 'ACTIVE',
    workflowStatus: 'PUBLISHED',
    images: [],
    createdAt: '2026-10-10T10:00:00Z',
    categories: ['أزياء رجالية']
  },
  {
    id: 'prod-2',
    name: 'فستان صيفي حرير مطرز',
    sku: 'DR-SILK-02',
    price: 890,
    costPrice: 550,
    stockQuantity: 18,
    status: 'ACTIVE',
    workflowStatus: 'PUBLISHED',
    images: [],
    createdAt: '2026-10-12T14:30:00Z',
    categories: ['فساتين']
  },
  {
    id: 'prod-3',
    name: 'حقيبة يد جلدية فاخرة',
    sku: 'BAG-LTH-03',
    price: 1200,
    costPrice: 750,
    stockQuantity: 5,
    status: 'ACTIVE',
    workflowStatus: 'PUBLISHED',
    images: [],
    createdAt: '2026-10-14T09:15:00Z',
    categories: ['إكسسوارات']
  }
];

(async () => {
  console.log(`Starting Batch 109 capture in mode: ${mode}...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  let fatalErrors = 0;

  for (const pageInfo of pagesToTest) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'ar-EG',
      colorScheme: 'light'
    });

    const page = await context.newPage();

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (text.includes("socket") || text.includes("WebSocket") || text.includes("favicon") || text.includes("Failed to load resource")) {
        return;
      }
      if (type === 'error') {
        console.error(`[CONSOLE ERROR on ${pageInfo.name}]:`, text);
        fatalErrors++;
      }
    });

    page.on('pageerror', err => {
      const text = err.message || '';
      if (text.includes("ResilientLazy") || text.includes("dynamically imported module")) {
        return;
      }
      console.error(`[PAGE ERROR on ${pageInfo.name}]:`, text);
      fatalErrors++;
    });

    await page.route('**/api/**', async route => {
      const url = route.request().url();

      if (url.includes('/auth/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: { id: 'u-admin', name: 'مدير النظام', role: 'SUPER_ADMIN', email: 'admin@maxp.online', companyId: 'comp-1' },
              company: { id: 'comp-1', name: 'متجر سوان', slug: 'swan', activeApps: ['orders', 'products', 'store'], installedApps: ['orders', 'products', 'store'] }
            }
          })
        });
      }

      if (url.includes('companies/current')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'comp-1', name: 'متجر سوان', slug: 'swan' }
          })
        });
      }

      if (url.includes('/products')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: pageInfo.empty ? [] : mockProductsList,
            totalCount: pageInfo.empty ? 0 : mockProductsList.length
          })
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    console.log(`Navigating to http://127.0.0.1:5173${pageInfo.path} (${pageInfo.name})...`);
    try {
      await page.goto(`http://127.0.0.1:5173${pageInfo.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (pageInfo.action) {
        await pageInfo.action(page);
      }
      const screenshotPath = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot: ${screenshotPath}`);
    } catch (e) {
      console.error(`Error on ${pageInfo.name}:`, e.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log(`Finished Batch 109 capture in mode ${mode}. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
})();
