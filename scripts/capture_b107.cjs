const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_tickets_turbo',
    path: '/settings/turbo',
    action: async (page) => {
      await page.waitForTimeout(1200);
    }
  },
  {
    name: 'adm_tickets_logs_modal',
    path: '/settings/turbo/ticket/101',
    action: async (page) => {
      await page.waitForTimeout(1200);
    }
  },
  {
    name: 'adm_dashboard_export_menu',
    path: '/dashboard',
    action: async (page) => {
      await page.waitForTimeout(1500);
      try {
        const btn = page.locator('button:has-text("تصدير"), button:has-text("Export")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(800);
        }
      } catch (e) {
        console.error('Trigger export menu failed', e.message);
      }
    }
  },
  {
    name: 'adm_dashboard_insights',
    path: '/dashboard',
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
  {
    name: 'adm_dashboard_onboarding',
    path: '/dashboard',
    action: async (page) => {
      await page.waitForTimeout(1500);
    }
  },
];

const mockDashboardData = {
  success: true,
  data: {
    company: { id: 'comp-1', name: 'متجر سوان', slug: 'swan' },
    dateRange: { start: '2026-10-01', end: '2026-10-15' },
    counts: { products: 12, customers: 148, conversations: 55, orders: 84 },
    financials: { totalRevenue: 125000, grossProfit: 45000, aov: 620 },
    metrics: { items: 210, visits: 3400, conversionRate: 3.8 },
    orderHealth: { trackedOrders: 84, confirmedRate: 92.5, cancellationRate: 4.2, returnRate: 3.3, piecesPerOrder: 2.5 },
    inventory: { lowStockCount: 2, outOfStockCount: 0 },
    recentActivity: { newCustomers: 12, newConversations: 8 },
    previousPeriod: { revenue: 38000 }
  }
};

(async () => {
  console.log(`Starting Batch 107 capture in mode: ${mode}...`);
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
              company: { id: 'comp-1', name: 'متجر سوان', slug: 'swan', activeApps: ['orders', 'turbo', 'store', 'unified-inbox'], installedApps: ['orders', 'turbo', 'store', 'unified-inbox'] }
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

      if (url.includes('/dashboard')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData)
        });
      }

      if (url.includes('/turbo/tickets/101/log') || url.includes('/turbo/tickets/') && url.includes('/log')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              logs: [
                { id: 1, description: 'تم إنشاء التذكرة وإرسالها لتربو', user: { name: 'فريق العمليات' }, created_at: '2026-10-15T12:00:00Z' },
                { id: 2, description: 'جاري مراجعة المندوب وتعديل العنوان', user: { name: 'دعم تربو' }, created_at: '2026-10-15T13:30:00Z' }
              ]
            }
          })
        });
      }

      if (url.includes('/turbo/tickets/101')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 101,
              order_id: 'ORD-9912',
              status: 'OPEN',
              title: 'تأخر في تسليم الشحنة',
              notes: 'العميل يطلب الاستلام بعد الساعة 5'
            }
          })
        });
      }

      if (url.includes('/turbo/tickets')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 101, order_id: 'ORD-9912', status: 'OPEN', title: 'تأخر في تسليم الشحنة' }
            ]
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
        currentCompany: { id: 'comp-1', name: 'متجر سوان', slug: 'swan', activeApps: ['orders', 'turbo', 'store', 'unified-inbox'], installedApps: ['orders', 'turbo', 'store', 'unified-inbox'] },
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
  console.log(`Finished Batch 107 capture in mode ${mode}. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
})();
