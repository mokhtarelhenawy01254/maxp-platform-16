const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_woo_connection_status',
    path: '/orders/woocommerce-sync',
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
  {
    name: 'adm_woo_import_tab',
    path: '/orders/woocommerce-sync',
    action: async (page) => {
      await page.waitForTimeout(1000);
      const tab = page.locator('button:has-text("استيراد الطلبات")').first();
      if (await tab.isVisible({ timeout: 3000 })) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }
  },
  {
    name: 'adm_woo_products_tab',
    path: '/orders/woocommerce-sync',
    action: async (page) => {
      await page.waitForTimeout(1000);
      const tab = page.locator('button:has-text("المنتجات والمخزون")').first();
      if (await tab.isVisible({ timeout: 3000 })) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }
  },
  {
    name: 'adm_woo_export_tab',
    path: '/orders/woocommerce-sync',
    action: async (page) => {
      await page.waitForTimeout(1000);
      const tab = page.locator('button:has-text("تصدير الطلبات")').first();
      if (await tab.isVisible({ timeout: 3000 })) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }
  },
  {
    name: 'adm_woo_status_mapping',
    path: '/orders/woocommerce-sync',
    action: async (page) => {
      await page.waitForTimeout(1000);
      const tab = page.locator('button:has-text("خريطة الحالات")').first();
      if (await tab.isVisible({ timeout: 3000 })) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }
  },
];

const mockSettings = [
  {
    id: 'woo-store-1',
    storeUrl: 'https://swanstore.example.com',
    syncEnabled: true,
    syncDirection: 'both',
    syncInterval: 15,
    hasCredentials: true,
    webhookEnabled: true,
    statusMapping: {
      processing: 'PROCESSING',
      completed: 'DELIVERED',
      cancelled: 'CANCELLED'
    }
  }
];

const mockLocalOrders = [
  { id: 'lo-1', orderNumber: '1041', customerName: 'سارة إبراهيم', status: 'CONFIRMED', syncedToWoo: true, total: 680, createdAt: '2026-10-15T11:00:00Z' },
  { id: 'lo-2', orderNumber: '1042', customerName: 'محمد طارق', status: 'PENDING', syncedToWoo: false, total: 420, createdAt: '2026-10-15T12:30:00Z' },
];

const mockProducts = [
  {
    wooCommerceId: 201,
    name: 'قميص صيفي كاجوال قطن 100%',
    price: 350,
    sku: 'SH-COT-01',
    isVariable: true,
    images: [],
    variations: [
      { wooCommerceVariationId: 2011, attributes: [{ type: 'color', name: 'أبيض' }, { type: 'size', name: 'M' }] },
      { wooCommerceVariationId: 2012, attributes: [{ type: 'color', name: 'أسود' }, { type: 'size', name: 'L' }] }
    ]
  },
  {
    wooCommerceId: 202,
    name: 'حذاء كلاسيكي جلد طبيعي',
    price: 890,
    sku: 'SH-LTH-02',
    isVariable: false,
    images: []
  }
];

const mockStatuses = [
  { slug: 'pending', name: 'في الانتظار' },
  { slug: 'processing', name: 'قيد التنفيذ' },
  { slug: 'completed', name: 'مكتمل' },
  { slug: 'cancelled', name: 'ملغي' },
  { slug: 'refunded', name: 'مسترجع' }
];

(async () => {
  console.log(`Starting Batch 108 capture in mode: ${mode}...`);
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
              company: { id: 'comp-1', name: 'متجر سوان', slug: 'swan', activeApps: ['orders', 'woocommerce-pro', 'webhooks-pro'], installedApps: ['orders', 'woocommerce-pro', 'webhooks-pro'] }
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

      if (url.includes('/woocommerce/settings')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockSettings })
        });
      }

      if (url.includes('/woocommerce/sync-logs')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        });
      }

      if (url.includes('/woocommerce/active-jobs')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
        });
      }

      if (url.includes('/woocommerce/orders-count')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, count: 24 })
        });
      }

      if (url.includes('/woocommerce/local-orders')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockLocalOrders })
        });
      }

      if (url.includes('/woocommerce/products')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockProducts })
        });
      }

      if (url.includes('/woocommerce/statuses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockStatuses })
        });
      }

      if (url.includes('/orders/statuses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { key: 'PENDING', label: 'قيد الانتظار', type: 'order' },
              { key: 'CONFIRMED', label: 'مؤكد', type: 'order' },
              { key: 'PROCESSING', label: 'قيد التجهيز', type: 'preparation' },
              { key: 'DELIVERED', label: 'تم التسليم', type: 'shipping' },
              { key: 'CANCELLED', label: 'ملغي', type: 'order' },
            ]
          })
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    console.log(`Navigating to http://127.0.0.1:5173${pageInfo.path}...`);
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
  console.log(`Finished Batch 108 capture in mode ${mode}. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
})();
