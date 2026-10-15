const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa";
const BASE_URL = "http://127.0.0.1:5173";

const pagesToCapture = [
  { name: "an_fulfillment_velocity", path: "/analytics/orders/fulfillment-velocity" },
  { name: "an_order_movement", path: "/analytics/orders/status-movement" },
  { name: "rep_profit_loss", path: "/reports/profit-loss" },
  { name: "rep_product_delivery_returns", path: "/reports/product-delivery-returns" },
  { name: "rep_status_analysis", path: "/reports/status-analysis" },
];

const mode = process.argv[2] || "before";

(async () => {
  console.log(`Starting Batch 82 capture in mode: ${mode}...`);
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  let fatalErrors = 0;

  // Intercept API calls with high fidelity mocks
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    if (req.resourceType() === "document" || !url.includes("/api/")) {
      return route.continue();
    }

    if (url.includes("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "super-admin-id",
            role: "SUPER_ADMIN",
            firstName: "Super",
            lastName: "Admin",
            email: "admin@maxp.online",
            companyId: "default-company-id",
            company: { id: "default-company-id", name: "MaxP Store" },
          },
        }),
      });
    }

    if (url.includes("/companies/my-companies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{ id: "default-company-id", name: "MaxP Store", isCurrent: true, role: "SUPER_ADMIN" }],
        }),
      });
    }

    if (url.includes("/analytics/fulfillment-velocity")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            dateRange: {
              startDate: "2026-10-15",
              endDate: "2026-10-15",
              isSingleDay: true,
            },
            kpis: {
              milestone: "READY_TO_SHIP",
              totalShippedCount: 142,
              totalShippedRevenue: 154000,
              avgLeadTimeHours: 18.5,
              sameDayCount: 65,
              sameDayRate: 45.8,
              agedBacklogCount: 9,
              agedBacklogRate: 6.3,
              inflowCount: 150,
              outflowCount: 142,
              netBacklogDelta: 8,
            },
            vintageBuckets: [
              { key: "TODAY", label: "اليوم", shortLabel: "اليوم", color: "emerald", count: 65, revenue: 52000, percent: 45.8 },
              { key: "YESTERDAY", label: "أمس", shortLabel: "أمس", color: "blue", count: 48, revenue: 38400, percent: 33.8 },
              { key: "2_3_DAYS", label: "2-3 أيام", shortLabel: "2-3 أيام", color: "amber", count: 20, revenue: 16000, percent: 14.1 },
              { key: "4_PLUS_DAYS", label: "4+ أيام", shortLabel: "4+ أيام", color: "rose", count: 9, revenue: 7200, percent: 6.3 },
            ],
            cohorts: [
              { creationDate: "2026-10-15", diffDays: 0, ordersCount: 65, totalRevenue: 52000, percentOfBatch: 45.8, avgLeadTimeHours: 4.2 },
              { creationDate: "2026-10-14", diffDays: 1, ordersCount: 48, totalRevenue: 38400, percentOfBatch: 33.8, avgLeadTimeHours: 18.5 },
            ],
            teamBreakdown: [
              { name: "أحمد علي", totalShipped: 75, freshOrders: 40, agedOrders: 35 },
              { name: "محمد حسن", totalShipped: 67, freshOrders: 25, agedOrders: 42 },
            ],
          },
        }),
      });
    }

    if (url.includes("/movement") || url.includes("/matrix")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            totalTransitions: 120,
            forwardCount: 85,
            backwardCount: 15,
            skipCount: 10,
            invalidCount: 5,
            startCount: 5,
            sameCount: 0,
            totalOrders: 100,
            modes: { manual: 75, auto: 45 },
            statuses: ["PENDING", "CONFIRMED", "PREPARING", "READY_TO_SHIP", "CANCELLED"],
            rows: [
              { fromStatus: "PENDING", toStatus: "CONFIRMED", count: 50, manualCount: 30, autoCount: 20, revenue: 45000, kind: "forward" },
              { fromStatus: "CONFIRMED", toStatus: "PREPARING", count: 35, manualCount: 25, autoCount: 10, revenue: 32000, kind: "forward" },
              { fromStatus: "PREPARING", toStatus: "READY_TO_SHIP", count: 25, manualCount: 25, autoCount: 0, revenue: 24000, kind: "forward" },
              { fromStatus: "PENDING", toStatus: "CANCELLED", count: 10, manualCount: 8, autoCount: 2, revenue: 9000, kind: "backward" },
            ],
          },
        }),
      });
    }

    if (url.includes("/reports/profit-loss")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            revenue: 1250000,
            cogs: 680000,
            grossProfit: 570000,
            netMargin: "45.6%",
            orderCount: 1840,
          },
        }),
      });
    }

    if (url.includes("/product-delivery-returns")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            summary: {
              totalProductsCount: 85,
              totalShippedQuantity: 1450,
              totalDeliveredQuantity: 1230,
              totalReturnedQuantity: 140,
              totalInTransitQuantity: 80,
              overallDeliveryRate: 84.8,
              overallReturnRate: 9.7,
              overallCollectionRate: 92.5,
              totalExpectedRevenue: 850000,
              totalCollectedRevenue: 785000,
              totalLostRevenue: 65000,
              totalLostShipping: 18200,
              criticalCount: 4,
              warningCount: 8,
              healthyCount: 73,
            },
            products: [
              {
                productId: "p1",
                productName: "فستان سهرة كلاسيكي مطرز",
                productSku: "DRS-001",
                categoryName: "فساتين",
                shippedQuantity: 240,
                deliveredQuantity: 215,
                returnedQuantity: 15,
                inTransitQuantity: 10,
                deliveryRate: 89.6,
                returnRate: 6.3,
                collectionRate: 94.0,
                collectedRevenue: 185000,
                lostRevenue: 12500,
                lostShippingCost: 1800,
                healthStatus: "HEALTHY",
                primaryBottleneck: "CUSTOMER_SALES",
                operationalRecommendation: "استقرار ممتاز بالمبيعات والتسليم",
              },
              {
                productId: "p2",
                productName: "حذاء جلدي رسمي أسود",
                productSku: "SH-009",
                categoryName: "أحذية",
                shippedQuantity: 180,
                deliveredQuantity: 110,
                returnedQuantity: 55,
                inTransitQuantity: 15,
                deliveryRate: 61.1,
                returnRate: 30.6,
                collectionRate: 68.0,
                collectedRevenue: 72000,
                lostRevenue: 36000,
                lostShippingCost: 6600,
                healthStatus: "CRITICAL",
                primaryBottleneck: "QUALITY_CATALOG",
                operationalRecommendation: "مراجعة جدول المقاسات مع المورد فوراً",
              },
            ],
          },
        }),
      });
    }

    if (url.includes("/reports/status-analysis")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          summary: {
            totalOrders: 342,
            totalRevenue: 284000,
            averageOrderValue: 830,
            successRate: 88,
          },
          trend: [
            { date: "2026-10-01", orders: 40, revenue: 32000 },
            { date: "2026-10-05", orders: 65, revenue: 54000 },
            { date: "2026-10-10", orders: 85, revenue: 71000 },
            { date: "2026-10-15", orders: 110, revenue: 92000 },
          ],
          orders: [
            { id: "10982", customerName: "محمود عبد العزيز", date: "2026-10-14", total: 1250, paymentMethod: "COD", lastUpdated: "2026-10-15" },
            { id: "10983", customerName: "سارة إبراهيم", date: "2026-10-14", total: 890, paymentMethod: "CARD", lastUpdated: "2026-10-15" },
          ],
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Inject SuperAdmin auth and mock user in localStorage
  await page.addInitScript(() => {
    window.addEventListener(
      "auth:unauthorized",
      (e) => {
        e.stopImmediatePropagation();
      },
      true
    );

    const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
    localStorage.setItem("token", mockJwt);
    localStorage.setItem("accessToken", mockJwt);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "super-admin-id",
        name: "Super Admin",
        email: "admin@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "default-company-id",
      })
    );
    localStorage.setItem("companyId", "default-company-id");
    localStorage.setItem("activeCompanyId", "default-company-id");
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        text.includes("401") ||
        text.includes("Refresh token") ||
        text.includes("Authentication failed") ||
        text.includes("Failed to load resource") ||
        text.toLowerCase().includes("websocket") ||
        text.includes("[SOCKET]") ||
        text.includes("Error fetching company") ||
        text.includes("vite:preload")
      ) {
        return;
      }
      console.error(`[Browser Error]: ${text}`);
      fatalErrors++;
    }
  });

  page.on("pageerror", (err) => {
    console.error(`[Page Error]: ${err.message}`);
    fatalErrors++;
  });

  for (const item of pagesToCapture) {
    try {
      console.log(`[${mode}] Navigating to ${item.name} at ${item.path}...`);
      await page.goto(`${BASE_URL}${item.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForTimeout(2000);

      const screenshotPath = path.join(ARTIFACT_DIR, `${item.name}_${mode}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`[${mode}] Saved screenshot to: ${screenshotPath}`);
    } catch (err) {
      console.error(`[${mode}] Failed to capture ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log(`\n=== Fatal Errors Count: ${fatalErrors} ===`);
  if (fatalErrors > 0) {
    console.error("FAILED: Fatal errors detected during capture.");
    process.exit(1);
  } else {
    console.log("Capture completed cleanly with ZERO fatal errors.");
    process.exit(0);
  }
})();
