const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_accounting_dashboard',
    path: '/accounting',
  },
  {
    name: 'adm_accounting_coa',
    path: '/accounting/coa',
  },
  {
    name: 'adm_accounting_entries',
    path: '/accounting/entries',
  },
  {
    name: 'adm_accounting_balance_sheet',
    path: '/accounting/balance-sheet',
  },
  {
    name: 'adm_accounting_profit_loss',
    path: '/accounting/income-statement',
  },
];

async function run() {
  console.log(`Starting Batch 96 capture in mode: ${mode}...`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });

  const page = await context.newPage();

  let fatalErrors = 0;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        text.includes("401") ||
        text.includes("Refresh token") ||
        text.includes("Authentication failed") ||
        text.includes("Failed to load resource") ||
        text.toLowerCase().includes("websocket") ||
        text.includes("[SOCKET]") ||
        text.includes("Error fetching company") ||
        text.includes("vite:preload") ||
        text.includes("ResilientLazy") ||
        text.includes("favicon") ||
        text.includes("404")
      ) {
        return;
      }
      console.error(`[Browser Console ERROR]: ${text}`);
      fatalErrors++;
    }
  });

  page.on('pageerror', err => {
    const text = err.message || '';
    if (text.includes("ResilientLazy") || text.includes("dynamically imported module")) {
      return;
    }
    console.error(`[Browser Page ERROR]: ${text}`);
    fatalErrors++;
  });

  await page.addInitScript(() => {
    try {
      const mockUser = {
        id: "u-mock-admin-96",
        name: "مدير المتجر العام",
        email: "admin@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-96",
        companies: [{ id: "c-mock-96", name: "شركة الأفق الرقمي", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-96", 
          name: "شركة الأفق الرقمي", 
          role: "SUPER_ADMIN", 
          logo: "/logo.png",
          activeApps: ['store', 'shipping', 'marketing', 'accounting'],
          installedApps: ['store', 'shipping', 'marketing', 'accounting']
        },
        permissions: ["*"]
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem("token", mockJwt);
      localStorage.setItem("accessToken", mockJwt);
      localStorage.setItem("user", JSON.stringify(mockUser));
      sessionStorage.setItem("token", mockJwt);
      sessionStorage.setItem("user", JSON.stringify(mockUser));
      localStorage.setItem("activeCompanyId", "c-mock-96");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Intercept common accounting API calls gracefully
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/accounting/chart-of-accounts')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'acc-1', code: '1', name: 'الأصول', nameEn: 'Assets', type: 'ASSET', isGroup: true, isPostable: false, balance: 150000 },
          { id: 'acc-11', code: '11', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'ASSET', parentId: 'acc-1', isGroup: true, isPostable: false, balance: 120000 },
          { id: 'acc-111', code: '111', name: 'النقدية بالصندوق', nameEn: 'Cash on Hand', type: 'ASSET', parentId: 'acc-11', isGroup: false, isPostable: true, balance: 45000 },
          { id: 'acc-112', code: '112', name: 'البنك التجاري الدولي', nameEn: 'CIB Bank', type: 'ASSET', parentId: 'acc-11', isGroup: false, isPostable: true, balance: 75000 },
          { id: 'acc-2', code: '2', name: 'الالتزامات', nameEn: 'Liabilities', type: 'LIABILITY', isGroup: true, isPostable: false, balance: 35000 },
          { id: 'acc-3', code: '3', name: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY', isGroup: true, isPostable: false, balance: 115000 },
          { id: 'acc-4', code: '4', name: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE', isGroup: true, isPostable: false, balance: 95000 },
          { id: 'acc-5', code: '5', name: 'المصروفات', nameEn: 'Expense', type: 'EXPENSE', isGroup: true, isPostable: false, balance: 32000 },
        ])
      });
    }
    if (url.includes('/accounting/balance-sheet')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          asOfDate: '2026-10-15',
          assets: [
            { id: 'acc-111', code: '111', name: 'النقدية بالصندوق', balance: 45000 },
            { id: 'acc-112', code: '112', name: 'البنك التجاري الدولي', balance: 75000 }
          ],
          liabilities: [
            { id: 'acc-211', code: '211', name: 'الموردين', balance: 35000 }
          ],
          equity: [
            { id: 'acc-311', code: '311', name: 'رأس المال المدفوع', balance: 100000 },
            { id: 'acc-312', code: '312', name: 'أرباح مرحلة', balance: 15000 }
          ],
          summary: {
            totalAssets: 150000,
            totalLiabilities: 35000,
            totalEquity: 115000,
            totalLiabilitiesAndEquity: 150000,
            difference: 0,
            isBalanced: true
          }
        })
      });
    }
    if (url.includes('/accounting/profit-loss')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          startDate: '2026-01-01',
          endDate: '2026-10-15',
          revenues: [
            { id: 'acc-411', code: '411', name: 'إيرادات مبيعات المتجر', balance: 95000 }
          ],
          cogs: [
            { id: 'acc-511', code: '511', name: 'تكلفة البضاعة المباعة', balance: 40000 }
          ],
          expenses: [
            { id: 'acc-521', code: '521', name: 'مصاريف تسويق وشحن', balance: 22000 }
          ],
          summary: {
            totalRevenue: 95000,
            totalCogs: 40000,
            grossProfit: 55000,
            totalExpenses: 22000,
            netIncome: 33000
          }
        })
      });
    }
    if (url.includes('/accounting/entries')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            {
              id: 'ent-1',
              entryNumber: 'JE-2026-0001',
              date: '2026-10-15',
              narration: 'إثبات مبيعات يومية المتجر الإلكتروني وتوريد النقدية',
              status: 'POSTED',
              totalDebit: 15000,
              totalCredit: 15000,
              lines: [
                { id: 'l-1', account: { code: '111', name: 'النقدية بالصندوق' }, debit: 15000, credit: 0, narration: 'إيداع نقدي' },
                { id: 'l-2', account: { code: '411', name: 'إيرادات المبيعات' }, debit: 0, credit: 15000, narration: 'مبيعات طلبات' }
              ]
            },
            {
              id: 'ent-2',
              entryNumber: 'JE-2026-0002',
              date: '2026-10-14',
              narration: 'سداد دفعة للمورد من الحساب البنكي',
              status: 'DRAFT',
              totalDebit: 8000,
              totalCredit: 8000,
              lines: [
                { id: 'l-3', account: { code: '211', name: 'الموردين' }, debit: 8000, credit: 0, narration: 'سداد فاتورة' },
                { id: 'l-4', account: { code: '112', name: 'البنك التجاري الدولي' }, debit: 0, credit: 8000, narration: 'تحويل بنكي' }
              ]
            }
          ],
          pagination: { total: 2, page: 1, totalPages: 1 }
        })
      });
    }
    if (url.includes('/accounting/unposted-queue')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    }
    return route.continue();
  });

  for (const pageInfo of pagesToTest) {
    const fullUrl = `http://127.0.0.1:5173${pageInfo.path}`;
    console.log(`Navigating to ${fullUrl}...`);
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      const screenshotPath = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Captured ${pageInfo.name}_${mode}.png successfully.`);
    } catch (e) {
      console.error(`Failed to capture ${pageInfo.name}:`, e.message);
    }
  }

  await browser.close();
  console.log(`Batch 96 ${mode} complete. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
}

run();
