const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_company_dashboard',
    path: '/company-dashboard',
  },
  {
    name: 'adm_store_analytics',
    path: '/analytics/store',
  },
  {
    name: 'adm_create_ab_test',
    path: '/advertising/facebook-ads/tests/create',
  },
  {
    name: 'adm_cafe_recipes',
    path: '/cafe/recipes',
  },
  {
    name: 'adm_catalog_details',
    path: '/advertising/facebook-ads/catalogs/cat-101',
  },
];

async function run() {
  console.log(`Starting Batch 94 capture in mode: ${mode}...`);
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
        id: "u-mock-admin-94",
        name: "مدير المتجر العام",
        email: "admin@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-94",
        companies: [{ id: "c-mock-94", name: "شركة الأفق الرقمي", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-94", 
          name: "شركة الأفق الرقمي", 
          role: "SUPER_ADMIN", 
          logo: "/logo.png",
          activeApps: ['store', 'cafe-restaurant-pro', 'marketing', 'shipping'],
          installedApps: ['store', 'cafe-restaurant-pro', 'marketing', 'shipping']
        },
        permissions: ["*"]
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem("token", mockJwt);
      localStorage.setItem("accessToken", mockJwt);
      localStorage.setItem("user", JSON.stringify(mockUser));
      sessionStorage.setItem("token", mockJwt);
      sessionStorage.setItem("user", JSON.stringify(mockUser));
      localStorage.setItem("activeCompanyId", "c-mock-94");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Mock API endpoints for Batch 94
  await page.route('**/api/v1/dashboard**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          company: { name: "متجر الأفق الرقمي" },
          counts: { orders: 120, products: 45, customers: 310 },
          financials: { totalRevenue: 154000 },
          orderHealth: { openOrders: 14 },
          inventory: { lowStockCount: 3, outOfStockCount: 1 },
          recentActivity: { newConversations: 5 },
          installedApps: [
            { id: "store", appId: "store", slug: "store", name: "المتجر الإلكتروني", status: "ACTIVE" },
            { id: "cafe", appId: "cafe", slug: "cafe-restaurant-pro", name: "نظام المطاعم والكافيهات", status: "ACTIVE" }
          ]
        }
      })
    });
  });

  await page.route('**/api/v1/analytics/store**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalVisits: 14200,
          totalProductViews: 9800,
          addToCarts: 1420,
          checkouts: 890,
          purchases: 640,
          totalRevenue: 285000,
          conversionRate: 4.5,
          avgOrderValue: 445,
          activeVisitors: 18,
          recoveredPurchases: 65,
          recoveredRevenue: 28900,
          incompleteCarts: 120,
          organicConversionRate: 4.05,
          potentialConversionRate: 5.8,
          realizedConversionRate: 4.5,
          conversionLift: 0.45,
          recoveryRate: 35.1,
          prevPeriod: { revenue: 240000, visits: 12500, purchases: 540 }
        }
      })
    });
  });

  await page.route('**/api/v1/analytics/top-products**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: "p-1", name: "قهوة كولومبي فاخرة 250جم", sales: 180, revenue: 32400 },
          { id: "p-2", name: "سيروم العناية بالبشرة", sales: 120, revenue: 45600 }
        ]
      })
    });
  });

  await page.route('**/api/v1/analytics/daily**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { date: "2026-10-10", totalVisits: 450, totalPurchases: 22, totalRevenue: 9800 },
          { date: "2026-10-11", totalVisits: 520, totalPurchases: 28, totalRevenue: 12400 },
          { date: "2026-10-12", totalVisits: 490, totalPurchases: 25, totalRevenue: 11100 }
        ]
      })
    });
  });

  await page.route('**/api/v1/facebook-ads/campaigns**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: "cmp-1", name: "حملة الصيف الترويجية 2026", status: "ACTIVE" },
          { id: "cmp-2", name: "حملة إعادة الاستهداف", status: "PAUSED" }
        ]
      })
    });
  });

  await page.route('**/cafe/recipes**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          recipes: [
            {
              id: "rec-1",
              name: "كابتشينو مزدوج ساخن",
              prepTimeMinutes: 3,
              yieldQuantity: 1,
              estimatedCost: 18.5,
              product: { id: "p-1", name: "كابتشينو دبل", price: 65, sku: "CAP-002" },
              ingredients: [
                {
                  id: "ing-1",
                  quantity: 18,
                  unit: "G",
                  unitConversionRatio: 1,
                  yieldPercentage: 100,
                  rawProduct: { id: "raw-1", name: "بن إسبريسو كولومبي", cost: 0.6, stock: 5000 }
                },
                {
                  id: "ing-2",
                  quantity: 180,
                  unit: "ML",
                  unitConversionRatio: 1,
                  yieldPercentage: 100,
                  rawProduct: { id: "raw-2", name: "حليب طازج كامل الدسم", cost: 0.04, stock: 20000 }
                }
              ]
            }
          ]
        }
      })
    });
  });

  await page.route('**/api/v1/facebook-ads/catalogs/cat-101**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: "cat-101",
        name: "كتالوج المنتجات الرئيسية 2026",
        description: "مزامنة تلقائية مع إعلانات فيسبوك وديناميك كاتالوج",
        totalProducts: 48,
        syncedProducts: 45,
        lastSyncStatus: "SUCCESS",
        lastSyncAt: new Date().toISOString(),
        feedUrl: "https://maxp.online/api/feeds/facebook/cat-101.xml"
      })
    });
  });

  await page.route('**/api/v1/facebook-ads/catalogs/cat-101/products**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: "cp-1",
            name: "سيروم الهيالورونيك اسيد المركز",
            price: 450,
            currency: "EGP",
            availability: "in stock",
            condition: "new",
            brand: "MaxP Beauty",
            syncStatus: "SUCCESS"
          },
          {
            id: "cp-2",
            name: "كريم فيتامين سي للتفتيح",
            price: 320,
            currency: "EGP",
            availability: "in stock",
            condition: "new",
            brand: "MaxP Beauty",
            syncStatus: "SUCCESS"
          }
        ],
        total: 2,
        page: 1
      })
    });
  });

  for (const pageInfo of pagesToTest) {
    const url = `http://127.0.0.1:5173${pageInfo.path}`;
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);
      const screenshotPath = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Captured ${pageInfo.name}_${mode}.png successfully.`);
    } catch (err) {
      console.error(`Failed to capture ${pageInfo.name}: ${err.message}`);
      fatalErrors++;
    }
  }

  await browser.close();
  console.log(`Batch 94 ${mode} complete. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Fatal capture script error:", err);
  process.exit(1);
});
