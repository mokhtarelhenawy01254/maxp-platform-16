const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.TASK_UI_BASE_URL || "https://maxp.online";
const AUTH_TOKEN = process.env.TASK_UI_AUTH_TOKEN;
const TEST_USER_ID =
  process.env.TASK_UI_USER_ID || "cmleybpg2002bjuo2m44y4kip";
const TEST_USER_NAME = process.env.TASK_UI_USER_NAME || "Swan Company";
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const OUT_DIR =
  process.env.TASK_UI_OUT_DIR ||
  path.join(ROOT_DIR, "artifacts", "task-ui-write-flow-2026-05-03");
const JSON_REPORT =
  process.env.TASK_UI_JSON_REPORT ||
  path.join(ROOT_DIR, "artifacts", "task-ui-write-flow-2026-05-03.json");
const MD_REPORT =
  process.env.TASK_UI_MD_REPORT ||
  path.join(ROOT_DIR, "artifacts", "task-ui-write-flow-2026-05-03.md");

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const qaTitle = `QA UI Write Flow ${runId}`;
const qaDescription =
  "Created by Playwright from the production Tasks UI, then deleted by the smoke runner.";

const result = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  title: qaTitle,
  createdTaskId: null,
  cleanup: {
    apiDeleteAttempted: false,
    apiDeleteOk: false,
  },
  observations: [],
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
let reportWritten = false;

const addCheck = (name, status, detail = "") => {
  result.checks.push({ name, status, detail });
  if (status === "PASS") result.summary.pass += 1;
  if (status === "FAIL") result.summary.fail += 1;
  if (status === "WARN") result.summary.warn += 1;
};

const truncate = (value, max = 400) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

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

const extractTask = (payload) =>
  payload?.data?.task ||
  payload?.data?.item ||
  payload?.data ||
  payload?.task ||
  null;

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
      text: truncate(text, 600),
      location: message.location(),
    });
  });

  page.on("pageerror", (error) => {
    result.consoleErrors.push({
      type: "pageerror",
      text: truncate(error?.stack || error?.message || error, 800),
    });
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (!url.includes("maxp.online/api/") || status < 400) return;
    result.failedResponses.push({
      status,
      method: response.request().method(),
      url: sanitizeUrl(url),
      route: page.url(),
    });
  });
};

const setupContext = async (browser) => {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(
    ({ token, userId, userName }) => {
      window.localStorage.setItem("accessToken", token);
      window.localStorage.setItem("token", token);
      window.sessionStorage.setItem("accessToken", token);
      window.sessionStorage.setItem("token", token);
      window.localStorage.setItem("userId", userId);
      window.localStorage.setItem("userName", userName);
      window.localStorage.setItem("language", "ar");
    },
    { token: AUTH_TOKEN, userId: TEST_USER_ID, userName: TEST_USER_NAME },
  );

  await context.route("**/api/v1/whatsapp-notifications/send", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        skippedBySmoke: true,
        message: "Suppressed by Tasks UI write-flow smoke test.",
      }),
    });
  });

  return context;
};

const apiFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { response, data };
};

const writeReports = () => {
  if (reportWritten) return;
  reportWritten = true;
  result.finishedAt = new Date().toISOString();

  if (result.consoleErrors.length > 0) {
    addCheck(
      "No uncaught browser console errors",
      "WARN",
      `${result.consoleErrors.length} error(s) captured`,
    );
  } else {
    addCheck("No uncaught browser console errors", "PASS");
  }

  const relevantFailures = result.failedResponses.filter((item) => {
    if (
      result.createdTaskId &&
      item.method === "GET" &&
      item.status === 404 &&
      item.url.includes(`/tasks/${result.createdTaskId}`)
    ) {
      return false;
    }
    return true;
  });

  if (relevantFailures.length > 0) {
    addCheck(
      "No failing MaxP API responses during write flow",
      "WARN",
      `${relevantFailures.length} failing API response(s)`,
    );
  } else {
    addCheck("No failing MaxP API responses during write flow", "PASS");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, JSON.stringify(result, null, 2), "utf8");

  const checkRows = result.checks
    .map((check) => `- ${check.status}: ${check.name}${check.detail ? ` - ${check.detail}` : ""}`)
    .join("\n");
  const failedResponseRows =
    relevantFailures.length === 0
      ? "- None"
      : relevantFailures
          .map((item) => `- ${item.status} ${item.method} ${item.url}`)
          .join("\n");
  const consoleRows =
    result.consoleErrors.length === 0
      ? "- None"
      : result.consoleErrors
          .map((item) => `- ${item.type}: ${item.text}`)
          .join("\n");
  const screenshots =
    result.screenshots.length === 0
      ? "- None"
      : result.screenshots.map((item) => `- ${item}`).join("\n");
  const observations =
    result.observations.length === 0
      ? "- None"
      : result.observations
          .map((item) => `- ${item.type}: ${item.message}`)
          .join("\n");

  const markdown = `# Task UI Write Flow - 2026-05-03

- Base URL: ${BASE_URL}
- Started: ${result.startedAt}
- Finished: ${result.finishedAt}
- Created task id: ${result.createdTaskId || "not-created"}
- QA title: ${qaTitle}
- Summary: ${result.summary.pass} pass / ${result.summary.fail} fail / ${result.summary.warn} warn
- Safety: WhatsApp send endpoint was suppressed by the runner to avoid external notifications.

## Checks

${checkRows}

## Cleanup

- API delete attempted: ${result.cleanup.apiDeleteAttempted}
- API delete ok: ${result.cleanup.apiDeleteOk}

## Observations

${observations}

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
  let context;
  let page;

  try {
    context = await setupContext(browser);
    page = await context.newPage();
    recordBrowserEvents(page);

    await page.goto("/tasks", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.getByTestId("tasks-open-create-modal").waitFor({
      state: "visible",
      timeout: 15000,
    });
    addCheck("Tasks page loads with create action", "PASS");
    await captureScreenshot(page, "01-before-create");

    await page.getByTestId("tasks-open-create-modal").click();
    await page.getByTestId("task-title-input").fill(qaTitle);
    await page.getByTestId("task-description-input").fill(qaDescription);
    await captureScreenshot(page, "02-modal-filled");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/tasks") &&
        response.request().method() === "POST",
      { timeout: 30000 },
    );
    await page.getByTestId("tasks-create-submit").click();
    const createResponse = await createResponsePromise;
    const createPayload = await createResponse.json().catch(() => null);
    const createdTask = extractTask(createPayload);
    result.createdTaskId = createdTask?.id || null;

    addCheck(
      "UI task create POST succeeds",
      createResponse.ok() && createPayload?.success && result.createdTaskId
        ? "PASS"
        : "FAIL",
      `status=${createResponse.status()}, id=${result.createdTaskId || "none"}`,
    );

    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const visibleCreatedMatches = await page.waitForFunction(
      (title) =>
        Array.from(document.querySelectorAll("a, td, article, div, span")).filter(
          (element) => {
            const text = element.textContent?.trim();
            if (text !== title) return false;
            const style = window.getComputedStyle(element);
            const hasBox =
              element.getClientRects().length > 0 &&
              element.getBoundingClientRect().width > 0 &&
              element.getBoundingClientRect().height > 0;
            return (
              hasBox &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              Number(style.opacity) !== 0
            );
          },
        ).length,
      qaTitle,
      { timeout: 15000 },
    );
    addCheck("Created task appears in the UI list", "PASS", qaTitle);
    await captureScreenshot(page, "03-created-in-list");

    const bodyAfterCreate = await page.locator("body").innerText({
      timeout: 5000,
    });
    const whatsappNotice = bodyAfterCreate.includes("لا توجد جلسة واتساب متصلة");
    if (whatsappNotice) {
      result.observations.push({
        type: "UX",
        message:
          "Task creation succeeded, but the UI also showed a WhatsApp-session warning.",
      });
      addCheck(
        "Task creation does not show unrelated WhatsApp warning",
        "WARN",
        "Creation succeeded, but a no-connected-WhatsApp-session toast appeared.",
      );
    } else {
      addCheck(
        "Task creation does not show unrelated WhatsApp warning",
        "PASS",
      );
    }

    if (result.createdTaskId) {
      const verify = await apiFetch(`tasks/${result.createdTaskId}`, {
        method: "GET",
      });
      const verifyTask = extractTask(verify.data);
      addCheck(
        "Created task is readable through internal API",
        verify.response.ok && verifyTask?.id === result.createdTaskId
          ? "PASS"
          : "FAIL",
        `status=${verify.response.status}`,
      );
      addCheck(
        "Created task has expected title and pending status",
        verifyTask?.title === qaTitle &&
          String(verifyTask?.status || "").toUpperCase() === "PENDING"
          ? "PASS"
          : "FAIL",
        `title=${verifyTask?.title || "none"}, status=${verifyTask?.status || "none"}`,
      );

      result.cleanup.apiDeleteAttempted = true;
      const deletion = await apiFetch(`tasks/${result.createdTaskId}`, {
        method: "DELETE",
      });
      result.cleanup.apiDeleteOk =
        deletion.response.ok && deletion.data?.success !== false;
      addCheck(
        "Created QA task is deleted through Tasks API",
        result.cleanup.apiDeleteOk ? "PASS" : "FAIL",
        `status=${deletion.response.status}`,
      );

      await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      const stillVisible = await page.evaluate((title) => {
        return Array.from(document.querySelectorAll("a, td, article, div, span")).filter(
          (element) => {
            const text = element.textContent?.trim();
            if (text !== title) return false;
            const style = window.getComputedStyle(element);
            const hasBox =
              element.getClientRects().length > 0 &&
              element.getBoundingClientRect().width > 0 &&
              element.getBoundingClientRect().height > 0;
            return (
              hasBox &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              Number(style.opacity) !== 0
            );
          },
        ).length;
      }, qaTitle);
      addCheck(
        "Deleted QA task is no longer visible after refresh",
        stillVisible === 0 ? "PASS" : "FAIL",
        `visible matches=${stillVisible}`,
      );
      await captureScreenshot(page, "04-after-delete-refresh");
    }
  } finally {
    if (result.createdTaskId && !result.cleanup.apiDeleteAttempted) {
      result.cleanup.apiDeleteAttempted = true;
      try {
        const deletion = await apiFetch(`tasks/${result.createdTaskId}`, {
          method: "DELETE",
        });
        result.cleanup.apiDeleteOk =
          deletion.response.ok && deletion.data?.success !== false;
        addCheck(
          "Created QA task cleanup ran after interrupted flow",
          result.cleanup.apiDeleteOk ? "PASS" : "FAIL",
          `status=${deletion.response.status}`,
        );
      } catch (error) {
        addCheck(
          "Created QA task cleanup ran after interrupted flow",
          "FAIL",
          error?.message || String(error),
        );
      }
    }
    if (context) await context.close();
    await browser.close();
    writeReports();
  }

  console.log(
    JSON.stringify(
      {
        summary: result.summary,
        createdTaskId: result.createdTaskId,
        cleanup: result.cleanup,
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
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
