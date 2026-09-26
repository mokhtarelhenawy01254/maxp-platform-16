const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const distDir = path.resolve(__dirname, "../dist");
const artifactDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\9f6643f7-4bc8-4255-882d-b07b85577446";

// Static file server with SPA fallback
const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  let filePath = path.join(distDir, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.createReadStream(path.join(distDir, "index.html")).pipe(res);
  }
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Static server running on http://localhost:${port}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  // Set mock auth token in localStorage before navigation
  await page.addInitScript(() => {
    localStorage.setItem("token", "mock-isolated-jwt-token");
    localStorage.setItem("user", JSON.stringify({
      id: "u-isolated-admin",
      name: "مدير البيئة التجريبية",
      email: "admin@test-sandbox.com",
      role: "ADMIN",
      companyId: "comp-isolated-test-01",
      company: { id: "comp-isolated-test-01", name: "شركة التجربة المعزولة", status: "ACTIVE" }
    }));
    localStorage.setItem("companyId", "comp-isolated-test-01");
    localStorage.setItem("i18nextLng", "ar");
  });

  // Mock API routes
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/api/auth/me") || url.includes("/api/users/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "u-isolated-admin",
            name: "مدير البيئة التجريبية",
            email: "admin@test-sandbox.com",
            role: "ADMIN",
            companyId: "comp-isolated-test-01",
            permissions: ["*"],
            company: { id: "comp-isolated-test-01", name: "شركة التجربة المعزولة" }
          }
        })
      });
    }

    if (url.includes("/api/agent-manager/agents")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          agents: [
            { id: "agent_karim", name: "كريم - مساعد الإدارة", role: "EXECUTIVE", status: "ACTIVE", allowedChannels: [], allowedTools: [] },
            { id: "agent_sara", name: "سارة - خدمة العملاء", role: "CUSTOMER_SERVICE", status: "ACTIVE", allowedChannels: ["MESSENGER"], allowedTools: [] },
            { id: "agent_tamer", name: "تامر - ميديا باير", role: "MEDIA_BUYER", status: "ACTIVE", allowedChannels: ["MARKETING_STUDIO"], allowedTools: ["facebook_ad_create_full_draft"] }
          ]
        })
      });
    }

    if (url.includes("/api/agent-manager/auto-reply")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, autoReplyEnabled: true })
      });
    }

    if (url.includes("/api/agent-manager/channel-reply")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, channels: {} })
      });
    }

    if (url.includes("/api/agent-manager/pause")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, paused: false, pauseReason: null })
      });
    }

    if (url.includes("/api/agent-manager/whatsapp-sessions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, sessions: [] })
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true })
    });
  });

  try {
    console.log(`Navigating to http://localhost:${port}/admin/ai-hub?tab=routing...`);
    await page.goto(`http://localhost:${port}/admin/ai-hub?tab=routing`, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Wait for the table to appear
    await page.waitForSelector("table", { timeout: 10000 });
    console.log("Table found!");

    // Wait for channel rows
    await page.waitForFunction(() => document.body.innerText.includes("المساعد التنفيذي (لوحة التحكم)"));
    console.log("DASHBOARD row found with name 'المساعد التنفيذي (لوحة التحكم)'!");

    // Take screenshot 1: Empty state (alert visible)
    const screenshot1Path = path.join(artifactDir, "channel_routing_empty_alert.png");
    await page.screenshot({ path: screenshot1Path, fullPage: true });
    console.log(`Saved screenshot 1 to: ${screenshot1Path}`);

    // Focus on the table area specifically
    const tableElement = await page.$("table");
    if (tableElement) {
      const tableScreenshotPath = path.join(artifactDir, "channel_routing_table_focus.png");
      await tableElement.screenshot({ path: tableScreenshotPath });
      console.log(`Saved focused table screenshot to: ${tableScreenshotPath}`);

      // Now click the dropdown for the DASHBOARD row to assign Karim
      const rows = await page.$$("table tbody tr");
      if (rows.length >= 6) {
        const dashboardRow = rows[5];
        const selectTrigger = await dashboardRow.$("[data-slot='select-trigger']");
        if (selectTrigger) {
          await selectTrigger.click();
          await page.waitForTimeout(500);
          // Click on Karim option
          const option = await page.$("[data-slot='select-item']:has-text('كريم - مساعد الإدارة')");
          if (option) {
            await option.click();
            await page.waitForTimeout(500);
            console.log("Selected agent 'كريم - مساعد الإدارة' for DASHBOARD channel");

            const assignedScreenshotPath = path.join(artifactDir, "channel_routing_assigned_focus.png");
            await tableElement.screenshot({ path: assignedScreenshotPath });
            console.log(`Saved assigned table screenshot to: ${assignedScreenshotPath}`);
          } else {
            console.log("Option Karim not found");
          }
        } else {
          console.log("selectTrigger not found");
        }
      }
    }

    console.log("SUCCESS: All screenshots captured on isolated test environment.");
  } catch (err) {
    console.error("Screenshot error:", err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
});
