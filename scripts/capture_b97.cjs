const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_accounting_ledger',
    path: '/accounting/ledger',
  },
  {
    name: 'adm_accounting_trial_balance',
    path: '/accounting/trial-balance',
  },
  {
    name: 'adm_accounting_periods',
    path: '/accounting/periods',
  },
  {
    name: 'adm_accounting_vat_report',
    path: '/accounting/vat-report',
  },
  {
    name: 'adm_accounting_settings',
    path: '/accounting/settings',
  },
];

async function run() {
  console.log(`Starting Batch 97 capture in mode: ${mode}...`);
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
        id: "u-mock-admin-97",
        name: "مدير المتجر العام",
        email: "admin@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-97",
        companies: [{ id: "c-mock-97", name: "شركة الأفق الرقمي", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-97", 
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
      localStorage.setItem("activeCompanyId", "c-mock-97");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Intercept accounting API calls gracefully
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/accounting/chart-of-accounts')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'acc-111', code: '111', name: 'النقدية بالصندوق', nameEn: 'Cash on Hand', type: 'ASSET', isGroup: false, isPostable: true, balance: 45000 },
          { id: 'acc-112', code: '112', name: 'البنك التجاري الدولي', nameEn: 'CIB Bank', type: 'ASSET', isGroup: false, isPostable: true, balance: 75000 },
          { id: 'acc-211', code: '211', name: 'الموردين', nameEn: 'Vendors', type: 'LIABILITY', isGroup: false, isPostable: true, balance: 35000 },
          { id: 'acc-411', code: '411', name: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'REVENUE', isGroup: false, isPostable: true, balance: 95000 },
        ])
      });
    }
    if (url.includes('/accounting/general-ledger')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account: { id: 'acc-111', code: '111', name: 'النقدية بالصندوق', type: 'ASSET' },
          openingBalance: 20000,
          closingBalance: 45000,
          totalDebit: 35000,
          totalCredit: 10000,
          entries: [
            {
              id: 'le-1',
              date: '2026-10-01',
              entryNumber: 'JE-2026-0001',
              narration: 'مبيعات نقدية يومية',
              debit: 25000,
              credit: 0,
              runningBalance: 45000
            },
            {
              id: 'le-2',
              date: '2026-10-05',
              entryNumber: 'JE-2026-0004',
              narration: 'سداد مصروفات تشغيلية ونثرية',
              debit: 0,
              credit: 10000,
              runningBalance: 35000
            },
            {
              id: 'le-3',
              date: '2026-10-10',
              entryNumber: 'JE-2026-0008',
              narration: 'تحصيل نقدي من مناديب التوصيل',
              debit: 10000,
              credit: 0,
              runningBalance: 45000
            }
          ]
        })
      });
    }
    if (url.includes('/accounting/trial-balance')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          startDate: '2026-01-01',
          endDate: '2026-10-15',
          accounts: [
            { id: 'acc-111', code: '111', name: 'النقدية بالصندوق', type: 'ASSET', openingDebit: 10000, openingCredit: 0, periodDebit: 35000, periodCredit: 0, endingDebit: 45000, endingCredit: 0 },
            { id: 'acc-112', code: '112', name: 'البنك التجاري الدولي', type: 'ASSET', openingDebit: 50000, openingCredit: 0, periodDebit: 25000, periodCredit: 0, endingDebit: 75000, endingCredit: 0 },
            { id: 'acc-211', code: '211', name: 'الموردين', type: 'LIABILITY', openingDebit: 0, openingCredit: 20000, periodDebit: 0, periodCredit: 15000, endingDebit: 0, endingCredit: 35000 },
            { id: 'acc-311', code: '311', name: 'رأس المال', type: 'EQUITY', openingDebit: 0, openingCredit: 40000, periodDebit: 0, periodCredit: 45000, endingDebit: 0, endingCredit: 85000 },
          ],
          summary: {
            totalOpeningDebit: 60000,
            totalOpeningCredit: 60000,
            totalPeriodDebit: 60000,
            totalPeriodCredit: 60000,
            totalEndingDebit: 120000,
            totalEndingCredit: 120000,
            isBalanced: true
          }
        })
      });
    }
    if (url.includes('/accounting/periods')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'p-1', year: 2026, month: 1, status: 'CLOSED', closedAt: '2026-02-01' },
          { id: 'p-2', year: 2026, month: 2, status: 'CLOSED', closedAt: '2026-03-01' },
          { id: 'p-3', year: 2026, month: 3, status: 'CLOSED', closedAt: '2026-04-01' },
          { id: 'p-4', year: 2026, month: 4, status: 'CLOSED', closedAt: '2026-05-01' },
          { id: 'p-5', year: 2026, month: 5, status: 'CLOSED', closedAt: '2026-06-01' },
          { id: 'p-6', year: 2026, month: 6, status: 'CLOSED', closedAt: '2026-07-01' },
          { id: 'p-7', year: 2026, month: 7, status: 'CLOSED', closedAt: '2026-08-01' },
          { id: 'p-8', year: 2026, month: 8, status: 'CLOSED', closedAt: '2026-09-01' },
          { id: 'p-9', year: 2026, month: 9, status: 'CLOSED', closedAt: '2026-10-01' },
          { id: 'p-10', year: 2026, month: 10, status: 'OPEN' },
          { id: 'p-11', year: 2026, month: 11, status: 'OPEN' },
          { id: 'p-12', year: 2026, month: 12, status: 'OPEN' },
        ])
      });
    }
    if (url.includes('/accounting/vat-report')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          startDate: '2026-07-01',
          endDate: '2026-09-30',
          taxRate: 14,
          sales: {
            taxableAmount: 200000,
            vatAmount: 28000
          },
          purchases: {
            taxableAmount: 120000,
            vatAmount: 16800
          },
          summary: {
            outputVat: 28000,
            inputVat: 16800,
            netVatPayable: 11200,
            status: 'PAYABLE'
          }
        })
      });
    }
    if (url.includes('/accounting/settings')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          autoPostSales: true,
          autoPostPurchases: true,
          autoPostPayroll: true,
          defaultCashAccountId: 'acc-111',
          defaultBankAccountId: 'acc-112',
          defaultSalesAccountId: 'acc-411',
          defaultCogsAccountId: 'acc-511',
          vatTaxRate: 14
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
  console.log(`Batch 97 ${mode} complete. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
}

run();
