const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_settings_webhooks_card',
    path: '/settings/orders?tab=webhooks',
    action: async (page) => {
      await page.waitForTimeout(1200);
    }
  },
  {
    name: 'adm_settings_webhooks_docs',
    path: '/settings/orders?tab=webhooks',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("دليل التحقق")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger webhook docs modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_settings_webhooks_form',
    path: '/settings/orders?tab=webhooks',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("إضافة ويب هوك")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger webhook form modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_settings_webhooks_logs',
    path: '/settings/orders?tab=webhooks',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("السجلات")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger webhook logs modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_settings_checkout_address',
    path: '/settings/store?tab=checkout',
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
];

const mockWebhooks = [
  {
    id: 'wh-1',
    name: 'مزامنة شيت المحاسبة وجوجل',
    url: 'https://api.accounting.example.com/webhooks/orders',
    secret: 'whsec_9876543210abcdef1234567890abcdef',
    isActive: true,
    events: 'order.created,order.status_updated',
    lastTriggeredAt: '2026-10-15T14:20:00Z',
    lastStatusCode: 200,
    lastError: null,
    successCount: 142,
    failureCount: 1,
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'wh-2',
    name: 'تكامل المخازن والشحن ERP',
    url: 'https://erp.warehouse.example.com/v1/orders/feed',
    secret: 'whsec_abcdef1234567890abcdef9876543210',
    isActive: false,
    events: 'order.created',
    lastTriggeredAt: '2026-10-14T09:15:00Z',
    lastStatusCode: 500,
    lastError: 'Internal server error 500 on endpoint',
    successCount: 38,
    failureCount: 4,
    createdAt: '2026-09-10T12:00:00Z'
  }
];

const mockLogs = [
  {
    id: 'log-1',
    event: 'order.created',
    orderNumber: 'ORD-10025',
    responseStatus: 200,
    durationMs: 142,
    isSuccess: true,
    error: null,
    createdAt: '2026-10-15T14:20:00Z'
  },
  {
    id: 'log-2',
    event: 'order.status_updated',
    orderNumber: 'ORD-10022',
    responseStatus: 200,
    durationMs: 98,
    isSuccess: true,
    error: null,
    createdAt: '2026-10-15T14:15:00Z'
  },
  {
    id: 'log-3',
    event: 'order.status_updated',
    orderNumber: 'ORD-10019',
    responseStatus: 504,
    durationMs: 5000,
    isSuccess: false,
    error: 'Gateway Timeout 504: target server did not respond within 5 seconds',
    createdAt: '2026-10-15T13:00:00Z'
  }
];

(async () => {
  console.log(`Starting Batch 106 capture in mode: ${mode}...`);
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
              company: { id: 'comp-1', name: 'متجر سوان', slug: 'swan', activeApps: ['orders', 'order-workflow', 'store'], installedApps: ['orders', 'order-workflow', 'store'] }
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

      if (url.includes('/order-webhooks/generate-secret')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { secret: 'whsec_gen_1234567890abcdef' } })
        });
      }

      if (url.includes('/order-webhooks') && url.includes('/logs')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockLogs })
        });
      }

      if (url.includes('/order-webhooks')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockWebhooks })
        });
      }

      if (url.includes('/storefront-settings') || url.includes('/store-settings')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              checkoutAddressSettings: {
                mode: 'hybrid',
                aiEnabled: true,
                model: 'gemini-2.5-flash',
                confidenceThreshold: 0.7,
                showConfirmationToCustomer: true,
                cacheResults: true,
                logRawAddress: true,
                merchantCombobox: true
              }
            }
          })
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.addInitScript(() => {
      const mockUser = {
        id: 'u-admin',
        name: 'مدير النظام',
        role: 'SUPER_ADMIN',
        email: 'admin@maxp.online',
        companyId: 'comp-1',
        company: { id: 'comp-1', name: 'متجر سوان', slug: 'swan' },
        companies: [{ id: 'comp-1', name: 'متجر سوان', role: 'SUPER_ADMIN' }],
        currentCompany: { id: 'comp-1', name: 'متجر سوان', slug: 'swan', activeApps: ['orders', 'order-workflow', 'store'], installedApps: ['orders', 'order-workflow', 'store'] },
        permissions: ['*'],
      };
      localStorage.setItem('token', 'mock-token-xyz');
      localStorage.setItem('accessToken', 'mock-token-xyz');
      localStorage.setItem('refreshToken', 'mock-token-xyz');
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('activeCompanyId', 'comp-1');
      localStorage.setItem('companyId', 'comp-1');
      sessionStorage.setItem('token', 'mock-token-xyz');
      sessionStorage.setItem('accessToken', 'mock-token-xyz');
      sessionStorage.setItem('user', JSON.stringify(mockUser));
      sessionStorage.setItem('activeCompanyId', 'comp-1');
    });

    try {
      console.log(`Navigating to http://127.0.0.1:5173${pageInfo.path}...`);
      await page.goto(`http://127.0.0.1:5173${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1500);

      if (pageInfo.action) {
        await pageInfo.action(page);
      }

      const screenshotFile = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: screenshotFile, fullPage: false });
      console.log(`Saved screenshot: ${screenshotFile}`);
    } catch (err) {
      console.error(`Failed to capture ${pageInfo.name}:`, err.message);
      fatalErrors++;
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log(`Finished Batch 106 capture in mode ${mode}. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
})();
