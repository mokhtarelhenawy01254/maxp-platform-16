const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_auth_accept_invitation',
    path: '/auth/accept-invitation?token=mock-token-95',
  },
  {
    name: 'adm_auth_reset_password',
    path: '/auth/reset-password?token=mock-token-95',
  },
  {
    name: 'adm_company_provider_detail',
    path: '/company-affiliates/provider/conn-95',
  },
  {
    name: 'adm_courier_settlement',
    path: '/shipping/courier-settlements',
  },
  {
    name: 'adm_create_ad',
    path: '/advertising/facebook-ads/adsets/adset-95/ads/create',
  },
];

async function run() {
  console.log(`Starting Batch 95 capture in mode: ${mode}...`);
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
        id: "u-mock-admin-95",
        name: "مدير المتجر العام",
        email: "admin@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-95",
        companies: [{ id: "c-mock-95", name: "شركة الأفق الرقمي", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-95", 
          name: "شركة الأفق الرقمي", 
          role: "SUPER_ADMIN", 
          logo: "/logo.png",
          activeApps: ['store', 'shipping', 'marketing', 'affiliates'],
          installedApps: ['store', 'shipping', 'marketing', 'affiliates']
        },
        permissions: ["*"]
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem("token", mockJwt);
      localStorage.setItem("accessToken", mockJwt);
      localStorage.setItem("user", JSON.stringify(mockUser));
      sessionStorage.setItem("token", mockJwt);
      sessionStorage.setItem("user", JSON.stringify(mockUser));
      localStorage.setItem("activeCompanyId", "c-mock-95");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Mock API endpoints for Batch 95
  await page.route('**/invitations/verify/**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          invitation: {
            id: "inv-95",
            email: "partner@example.com",
            firstName: "كريم",
            lastName: "عادل",
            role: "MANAGER",
            companyName: "شركة الأفق للتجارة",
            inviterName: "مختار أحمد",
            expiresAt: new Date(Date.now() + 86400000).toISOString()
          }
        }
      })
    });
  });

  await page.route('**/company-affiliates/connections/conn-95**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: "conn-95",
          consumerCompany: { name: "متجر الفخامة" },
          providerCompany: { name: "مورد النخبة" },
          status: "ACTIVE",
          commissionRate: 15,
          createdAt: new Date().toISOString()
        }
      })
    });
  });

  await page.route('**/company-affiliates/connections/conn-95/summary**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalCommissions: 48500,
          paidCommissions: 32000,
          pendingCommissions: 16500,
          totalOrders: 142
        }
      })
    });
  });

  await page.route('**/company-affiliates/connections/conn-95/orders**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: "ord-1", orderNumber: "ORD-9501", total: 1850, status: "CONFIRMED", createdAt: new Date().toISOString(), sourceType: "AFFILIATE" },
          { id: "ord-2", orderNumber: "ORD-9502", total: 2400, status: "PROCESSED", createdAt: new Date().toISOString(), sourceType: "AFFILIATE" }
        ],
        pagination: { total: 2, page: 1, pages: 1 }
      })
    });
  });

  await page.route('**/shipping/courier/runs**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: "run-95",
            runNumber: "RUN-2026-0095",
            status: "IN_TRANSIT",
            totalCODExpected: 14500,
            courier: { name: "أحمد حسني", phone: "+201012345678" }
          }
        ],
        pagination: { total: 1, page: 1, pages: 1 }
      })
    });
  });

  await page.route('**/shipping/courier/runs/run-95**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: "run-95",
          runNumber: "RUN-2026-0095",
          status: "IN_TRANSIT",
          totalCODExpected: 14500,
          courier: { name: "أحمد حسني", phone: "+201012345678" },
          shipments: [
            { id: "shp-1", orderNumber: "ORD-101", status: "DELIVERED", codAmount: 850 },
            { id: "shp-2", orderNumber: "ORD-102", status: "RETURNED", codAmount: 0 }
          ]
        }
      })
    });
  });

  await page.route('**/treasury/accounts**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: "acc-1", name: "الخزينة الرئيسية - كاش", type: "CASH", balance: 85000 },
          { id: "acc-2", name: "حساب بنك مصر CIB", type: "BANK", balance: 340000 }
        ]
      })
    });
  });

  await page.route('**/facebook-ads/pages**', async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        pages: [
          { id: "page-1", pageId: "page-1", name: "صفحة متجر الأفق الرسمية", category: "Retail", isSelectable: true }
        ]
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
  console.log(`Batch 95 ${mode} complete. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Fatal capture script error:", err);
  process.exit(1);
});
