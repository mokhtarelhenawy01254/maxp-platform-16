const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.TASK_UI_BASE_URL || "https://maxp.online";
const AUTH_TOKEN = process.env.TASK_UI_AUTH_TOKEN;
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const OUT_DIR =
  process.env.TASK_UI_OUT_DIR ||
  path.join(ROOT_DIR, "artifacts", "task-ui-smoke-2026-05-03");
const JSON_REPORT =
  process.env.TASK_UI_JSON_REPORT ||
  path.join(ROOT_DIR, "artifacts", "task-ui-smoke-2026-05-03.json");
const MD_REPORT =
  process.env.TASK_UI_MD_REPORT ||
  path.join(ROOT_DIR, "artifacts", "task-ui-smoke-2026-05-03.md");

const routes = [
  { key: "tasks", label: "Tasks", path: "/tasks" },
  { key: "projects", label: "Projects", path: "/tasks/projects" },
  { key: "categories", label: "Categories", path: "/tasks/categories" },
  { key: "settings", label: "Settings", path: "/tasks/settings" },
  { key: "integrations", label: "Integrations", path: "/tasks/integrations" },
];

const nowIso = () => new Date().toISOString();

const sanitizeUrl = (value) => {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("token");
    parsed.searchParams.delete("auth");
    return parsed.toString();
  } catch {
    return String(value || "");
  }
};

const truncate = (value, max = 320) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const unique = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const result = {
  startedAt: nowIso(),
  baseUrl: BASE_URL,
  viewportRuns: [],
  routes: [],
  checks: [],
  consoleErrors: [],
  failedResponses: [],
  screenshots: [],
  summary: {
    pass: 0,
    fail: 0,
    warn: 0,
  },
};

const addCheck = (name, status, detail = "") => {
  result.checks.push({ name, status, detail });
  if (status === "PASS") result.summary.pass += 1;
  if (status === "FAIL") result.summary.fail += 1;
  if (status === "WARN") result.summary.warn += 1;
};

const setupAuthenticatedContext = async (browser, viewport) => {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript((token) => {
    window.localStorage.setItem("accessToken", token);
    window.localStorage.setItem("token", token);
    window.sessionStorage.setItem("accessToken", token);
    window.sessionStorage.setItem("token", token);
    window.localStorage.setItem("language", "ar");
  }, AUTH_TOKEN);

  return context;
};

const waitForUsablePage = async (page, route) => {
  await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const currentPath = new URL(page.url()).pathname;
  const bodyText = await page.locator("body").innerText({ timeout: 10000 });
  const buttonCount = await page.locator("button").count();
  const tabButtonCount = await page.locator('button[aria-pressed]').count();

  return {
    key: route.key,
    label: route.label,
    expectedPath: route.path,
    currentPath,
    bodyChars: bodyText.trim().length,
    bodyPreview: truncate(bodyText),
    buttonCount,
    tabButtonCount,
  };
};

const captureScreenshot = async (page, name) => {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  result.screenshots.push(path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"));
};

const recordBrowserEvents = (page) => {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (
      text.includes("Failed to load resource") ||
      text.includes("net::ERR_ABORTED")
    ) {
      return;
    }
    result.consoleErrors.push({
      type: message.type(),
      text: truncate(text, 500),
      location: message.location(),
    });
  });

  page.on("pageerror", (error) => {
    result.consoleErrors.push({
      type: "pageerror",
      text: truncate(error?.stack || error?.message || error, 700),
    });
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    const isOwnApi = url.includes("maxp.online/api/");
    if (!isOwnApi || status < 400) return;
    result.failedResponses.push({
      status,
      method: response.request().method(),
      url: sanitizeUrl(url),
      route: page.url(),
    });
  });
};

const exerciseCreateTaskModal = async (page) => {
  const createButton = page.getByTestId("tasks-open-create-modal");
  await createButton.waitFor({ state: "visible", timeout: 12000 });
  await createButton.click();
  const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]').first();
  await dialog.waitFor({ state: "visible", timeout: 12000 });
  const dialogText = await dialog.innerText({ timeout: 5000 }).catch(() => "");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  return {
    opened: true,
    textPreview: truncate(dialogText),
  };
};

const runDesktop = async (browser) => {
  const context = await setupAuthenticatedContext(browser, {
    width: 1440,
    height: 1000,
  });
  const page = await context.newPage();
  recordBrowserEvents(page);

  for (const route of routes) {
    const routeResult = await waitForUsablePage(page, route);
    result.routes.push(routeResult);
    await captureScreenshot(page, `desktop-${route.key}`);

    addCheck(
      `${route.label} route is not redirected to auth`,
      !routeResult.currentPath.includes("login") &&
        !routeResult.currentPath.includes("auth")
        ? "PASS"
        : "FAIL",
      `Current path: ${routeResult.currentPath}`,
    );
    addCheck(
      `${route.label} route renders meaningful content`,
      routeResult.bodyChars > 120 ? "PASS" : "FAIL",
      `${routeResult.bodyChars} visible characters`,
    );
    addCheck(
      `${route.label} workspace tabs are present`,
      routeResult.tabButtonCount >= 4 ? "PASS" : "WARN",
      `${routeResult.tabButtonCount} tab-like buttons`,
    );

    if (route.key === "tasks") {
      try {
        const modalResult = await exerciseCreateTaskModal(page);
        result.routes[result.routes.length - 1].createTaskModal = modalResult;
        await captureScreenshot(page, "desktop-create-task-modal");
        addCheck(
          "Create task modal opens without submitting",
          modalResult.opened ? "PASS" : "FAIL",
          modalResult.textPreview,
        );
      } catch (error) {
        addCheck(
          "Create task modal opens without submitting",
          "FAIL",
          error?.message || String(error),
        );
      }
    }
  }

  await context.close();
};

const runMobile = async (browser) => {
  const context = await setupAuthenticatedContext(browser, {
    width: 390,
    height: 844,
  });
  const page = await context.newPage();
  recordBrowserEvents(page);

  const routeResult = await waitForUsablePage(page, routes[0]);
  const layout = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyHeight: document.body.scrollHeight,
  }));
  routeResult.mobileLayout = layout;
  result.routes.push({ ...routeResult, key: "tasks-mobile", label: "Tasks Mobile" });
  await captureScreenshot(page, "mobile-tasks");

  addCheck(
    "Mobile tasks route renders content",
    routeResult.bodyChars > 120 ? "PASS" : "FAIL",
    `${routeResult.bodyChars} visible characters`,
  );
  addCheck(
    "Mobile tasks route avoids large horizontal overflow",
    layout.bodyWidth <= layout.viewportWidth + 24 ? "PASS" : "WARN",
    `bodyWidth=${layout.bodyWidth}, viewportWidth=${layout.viewportWidth}`,
  );

  await context.close();
};

const writeReports = () => {
  result.finishedAt = nowIso();
  result.consoleErrors = unique(result.consoleErrors);
  result.failedResponses = unique(result.failedResponses);

  if (result.consoleErrors.length > 0) {
    addCheck(
      "No uncaught browser console errors",
      "WARN",
      `${result.consoleErrors.length} error(s) captured`,
    );
  } else {
    addCheck("No uncaught browser console errors", "PASS");
  }

  if (result.failedResponses.length > 0) {
    addCheck(
      "No failing MaxP API responses during UI smoke",
      "WARN",
      `${result.failedResponses.length} failing API response(s)`,
    );
  } else {
    addCheck("No failing MaxP API responses during UI smoke", "PASS");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, JSON.stringify(result, null, 2), "utf8");

  const routeRows = result.routes
    .map(
      (route) =>
        `| ${route.label} | ${route.expectedPath} | ${route.currentPath} | ${route.bodyChars} | ${route.tabButtonCount} |`,
    )
    .join("\n");
  const failedResponseRows =
    result.failedResponses.length === 0
      ? "- None"
      : result.failedResponses
          .map((item) => `- ${item.status} ${item.method} ${item.url}`)
          .join("\n");
  const consoleRows =
    result.consoleErrors.length === 0
      ? "- None"
      : result.consoleErrors
          .map((item) => `- ${item.type}: ${item.text}`)
          .join("\n");
  const checkRows = result.checks
    .map((check) => `- ${check.status}: ${check.name}${check.detail ? ` - ${check.detail}` : ""}`)
    .join("\n");
  const screenshots = result.screenshots
    .map((item) => `- ${item}`)
    .join("\n");

  const markdown = `# Task UI Smoke - 2026-05-03

- Base URL: ${BASE_URL}
- Started: ${result.startedAt}
- Finished: ${result.finishedAt}
- Summary: ${result.summary.pass} pass / ${result.summary.fail} fail / ${result.summary.warn} warn

## Checks

${checkRows}

## Routes

| Route | Expected | Actual | Visible chars | Tab buttons |
| --- | --- | --- | ---: | ---: |
${routeRows}

## Failed API Responses

${failedResponseRows}

## Browser Errors

${consoleRows}

## Screenshots

${screenshots}
`;

  fs.writeFileSync(MD_REPORT, markdown, "utf8");
};

(async () => {
  if (!AUTH_TOKEN) {
    throw new Error("TASK_UI_AUTH_TOKEN is required");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    result.viewportRuns.push({ name: "desktop", width: 1440, height: 1000 });
    await runDesktop(browser);
    result.viewportRuns.push({ name: "mobile", width: 390, height: 844 });
    await runMobile(browser);
  } finally {
    await browser.close();
    writeReports();
  }

  console.log(
    JSON.stringify(
      {
        summary: result.summary,
        report: path.relative(ROOT_DIR, MD_REPORT).replace(/\\/g, "/"),
        json: path.relative(ROOT_DIR, JSON_REPORT).replace(/\\/g, "/"),
        screenshots: result.screenshots.length,
      },
      null,
      2,
    ),
  );

  if (result.summary.fail > 0) {
    process.exitCode = 1;
  }
})().catch((error) => {
  writeReports();
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
