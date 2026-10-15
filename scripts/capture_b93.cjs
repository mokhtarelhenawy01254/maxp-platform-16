const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_cafe_modifiers',
    path: '/cafe/modifiers',
  },
  {
    name: 'adm_products_trash',
    path: '/products/trash',
  },
  {
    name: 'adm_cod_deposit_settings',
    path: '/settings/cod-deposit',
  },
  {
    name: 'adm_leads_list',
    path: '/leads',
  },
  {
    name: 'adm_shipping_settlement',
    path: '/shipping-settlement',
  },
];

async function run() {
  console.log(`Starting Batch 93 capture in mode: ${mode}...`);
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
        id: "u-mock-admin-93",
        name: "مدير المتجر العام",
        email: "admin@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-93",
        companies: [{ id: "c-mock-93", name: "شركة الأفق الرقمي", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-93", 
          name: "شركة الأفق الرقمي", 
          role: "SUPER_ADMIN", 
          logo: "/logo.png",
          installedApps: ['cafe-restaurant-pro', 'cod-deposit', 'shipping', 'turbo', 'bosta', 'crm']
        },
        permissions: ["*"]
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem("token", mockJwt);
      localStorage.setItem("accessToken", mockJwt);
      localStorage.setItem("user", JSON.stringify(mockUser));
      sessionStorage.setItem("token", mockJwt);
      sessionStorage.setItem("user", JSON.stringify(mockUser));
      localStorage.setItem("activeCompanyId", "c-mock-93");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Mock API endpoints to return robust mock data for all 5 pages
  await page.route('**/cafe/modifiers**', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "mod-1",
              name: "نوع الحليب (Milk Type)",
              selectionType: "SINGLE",
              isRequired: true,
              minSelection: 1,
              maxSelection: 1,
              options: [
                { id: "opt-1", name: "حليب بقري كامل الدسم", additionalPrice: 0, isDefault: true },
                { id: "opt-2", name: "حليب شوفان عضوي", additionalPrice: 20, isDefault: false },
                { id: "opt-3", name: "حليب لوز محلى", additionalPrice: 25, isDefault: false }
              ]
            },
            {
              id: "mod-2",
              name: "إضافات الإسبريسو (Extra Shots)",
              selectionType: "MULTIPLE",
              isRequired: false,
              minSelection: 0,
              maxSelection: 3,
              options: [
                { id: "opt-4", name: "شوت إضافي عادي", additionalPrice: 15, isDefault: false },
                { id: "opt-5", name: "شوت ديكاف (خالي من الكافيين)", additionalPrice: 18, isDefault: false },
                { id: "opt-6", name: "سيرب فانيليا فرنسية", additionalPrice: 12, isDefault: false }
              ]
            }
          ]
        })
      });
    }
    return route.continue();
  });

  await page.route('**/products?limit=200**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: "p-1", name: "لاتيه كلاسيك ساخن" },
          { id: "p-2", name: "كابتشينو مزدوج" }
        ]
      })
    });
  });

  await page.route('**/products/trash/all**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: "del-101",
            name: "سيروم الهيالورونيك اسيد المركز 50 مل",
            price: 450,
            sku: "SKU-SER-001",
            barcode: "6221234567890",
            stock: 14,
            images: [],
            category: { id: "cat-1", name: "العناية بالبشرة" },
            deletedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
          },
          {
            id: "del-102",
            name: "كريم فيتامين سي للتفتيح الليلي 75 مل",
            price: 320,
            sku: "SKU-CRM-002",
            barcode: "6221234567891",
            stock: 0,
            images: [],
            category: { id: "cat-1", name: "العناية بالبشرة" },
            deletedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
            createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString()
          }
        ]
      })
    });
  });

  await page.route('**/api/v1/payment/cod-deposit/settings**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          codDepositEnabled: true,
          codDepositType: 'PERCENTAGE',
          codDepositValue: 20,
          codDepositMinAmount: 50,
          codDepositMaxAmount: 300
        }
      })
    });
  });

  await page.route('**/api/v1/storefront/settings**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          codDepositEnabled: true,
          codDepositType: 'PERCENTAGE',
          codDepositValue: 20,
          codDepositMinAmount: 50,
          codDepositMaxAmount: 300
        }
      })
    });
  });

  await page.route('**/api/v1/orders-v2**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: "ord-1", orderNumber: "ORD-9301", total: 1200, createdAt: new Date().toISOString() },
          { id: "ord-2", orderNumber: "ORD-9302", total: 850, createdAt: new Date().toISOString() }
        ]
      })
    });
  });

  await page.route('**/api/v1/payment/cod-deposit/status/**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: "ord-1",
          orderNumber: "ORD-9301",
          total: 1200,
          depositAmount: 240,
          remainingAmount: 960,
          isPaid: true,
          paidAt: new Date().toISOString(),
          method: "kashier_card",
          paymentStatus: "PAID",
          orderStatus: "CONFIRMED"
        }
      })
    });
  });

  await page.route('**/customers**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: "lead-1",
            firstName: "سارة",
            lastName: "أحمد",
            phone: "+201012345678",
            email: "sara.ahmed@example.com",
            status: "LEAD",
            rating: "EXCELLENT",
            totalOrders: 0,
            totalSpent: 0,
            city: "القاهرة",
            source: "Facebook Ads",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "lead-2",
            firstName: "محمود",
            lastName: "إبراهيم",
            phone: "+201123456789",
            email: "mahmoud.ibrahim@example.com",
            status: "LEAD",
            rating: "GOOD",
            totalOrders: 0,
            totalSpent: 0,
            city: "الإسكندرية",
            source: "Instagram DM",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      })
    });
  });

  await page.route('**/shipping/settlement/summary**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            company: { id: "bosta-1", name: "بوسطة للشحن (Bosta)" },
            deliveredShipments: 148,
            pendingAmount: 85200,
            settledAmount: 142000
          },
          {
            company: { id: "TURBO", name: "Turbo Express" },
            deliveredShipments: 62,
            pendingAmount: 31400,
            settledAmount: 98000
          }
        ]
      })
    });
  });

  await page.route('**/shipping/settlement/orders**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: "shp-1",
            orderNumber: "ORD-8812",
            customerName: "علي حسن",
            customerPhone: "+201099887766",
            shippingCompany: "Bosta",
            trackingNumber: "BST-99210",
            delivered: true,
            settlementStatus: "PENDING",
            codAmount: 1450,
            shippingFee: 65,
            netAmount: 1385,
            deliveredAt: new Date().toISOString(),
            sourceType: "BOSTA"
          },
          {
            id: "shp-2",
            orderNumber: "ORD-8815",
            customerName: "منى زكي",
            customerPhone: "+201288776655",
            shippingCompany: "Turbo Express",
            trackingNumber: "TRB-4410",
            delivered: true,
            settlementStatus: "SETTLED",
            codAmount: 820,
            shippingFee: 50,
            netAmount: 770,
            deliveredAt: new Date().toISOString(),
            sourceType: "TURBO"
          }
        ],
        pagination: {
          page: 1,
          pages: 1,
          total: 2
        }
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
  console.log(`Batch 93 ${mode} complete. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Fatal capture script error:", err);
  process.exit(1);
});
