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
  path.join(ROOT_DIR, "artifacts", "task-ui-lifecycle-2026-05-03");
const JSON_REPORT =
  process.env.TASK_UI_JSON_REPORT ||
  path.join(ROOT_DIR, "artifacts", "task-ui-lifecycle-2026-05-03.json");
const MD_REPORT =
  process.env.TASK_UI_MD_REPORT ||
  path.join(ROOT_DIR, "artifacts", "task-ui-lifecycle-2026-05-03.md");

const STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};
const START_LABELS = [
  "\u0628\u062f\u0621",
  "\u0628\u062f\u0621 \u0627\u0644\u062a\u0646\u0641\u064a\u0630",
];
const COMPLETE_LABELS = ["\u0625\u0643\u0645\u0627\u0644"];

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const qaTitle = `QA UI Lifecycle ${runId}`;
const qaDescription =
  "Created by Playwright to verify UI status transitions, then deleted by the lifecycle runner.";

const result = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  title: qaTitle,
  createdTaskId: null,
  cleanup: {
    apiDeleteAttempted: false,
    apiDeleteOk: false,
  },
  observedButtons: {},
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

const truncate = (value, max = 500) => {
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
        message: "Suppressed by Tasks UI lifecycle smoke test.",
      }),
    });
  });

  return context;
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
      text: truncate(text, 700),
      location: message.location(),
    });
  });

  page.on("pageerror", (error) => {
    result.consoleErrors.push({
      type: "pageerror",
      text: truncate(error?.stack || error?.message || error, 900),
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

const clickVisibleTaskButton = async (page, title, labels) =>
  page.evaluate(
    ({ title: taskTitle, labels: expectedLabels }) => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return (
          element.getClientRects().length > 0 &&
          box.width > 0 &&
          box.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity) !== 0
        );
      };
      const containers = Array.from(document.querySelectorAll("tr, article"))
        .filter((container) => {
          const text = container.textContent || "";
          return text.includes(taskTitle) && isVisible(container);
        });
      const buttonTexts = containers.flatMap((container) =>
        Array.from(container.querySelectorAll("button")).filter(isVisible).map((button) =>
          normalize(button.innerText || button.textContent || button.getAttribute("aria-label")),
        ),
      );

      for (const container of containers) {
        for (const button of Array.from(container.querySelectorAll("button")).filter(isVisible)) {
          const text = normalize(
            button.innerText || button.textContent || button.getAttribute("aria-label"),
          );
          if (expectedLabels.includes(text)) {
            button.click();
            return { clicked: true, label: text, buttonTexts };
          }
        }
      }

      return { clicked: false, label: null, buttonTexts };
    },
    { title, labels },
  );

const getTaskFromApi = async (taskId) => {
  const verify = await apiFetch(`tasks/${taskId}`, { method: "GET" });
  return {
    response: verify.response,
    task: extractTask(verify.data),
  };
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
      "No failing MaxP API responses during lifecycle flow",
      "WARN",
      `${relevantFailures.length} failing API response(s)`,
    );
  } else {
    addCheck("No failing MaxP API responses during lifecycle flow", "PASS");
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

  const markdown = `# Task UI Lifecycle - 2026-05-03

- Base URL: ${BASE_URL}
- Started: ${result.startedAt}
- Finished: ${result.finishedAt}
- Created task id: ${result.createdTaskId || "not-created"}
- QA title: ${qaTitle}
- Summary: ${result.summary.pass} pass / ${result.summary.fail} fail / ${result.summary.warn} warn
- Safety: WhatsApp send endpoint was suppressed by the runner to avoid external notifications.

## Checks

${checkRows}

## Observed Buttons

\`\`\`json
${JSON.stringify(result.observedButtons, null, 2)}
\`\`\`

## Cleanup

- API delete attempted: ${result.cleanup.apiDeleteAttempted}
- API delete ok: ${result.cleanup.apiDeleteOk}

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
    await page.waitForFunction(
      (title) =>
        Array.from(document.querySelectorAll("tr, article")).some((element) => {
          const box = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return (
            (element.textContent || "").includes(title) &&
            box.width > 0 &&
            box.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        }),
      qaTitle,
      { timeout: 15000 },
    );
    addCheck("Created task appears in the UI list", "PASS", qaTitle);
    await captureScreenshot(page, "03-created-pending");

    if (result.createdTaskId) {
      const pending = await getTaskFromApi(result.createdTaskId);
      addCheck(
        "Created task starts as PENDING through API",
        pending.response.ok &&
          String(pending.task?.status || "").toUpperCase() === STATUS.PENDING
          ? "PASS"
          : "FAIL",
        `status=${pending.task?.status || "none"}`,
      );

      const startResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/tasks/${result.createdTaskId}/status`) &&
          response.request().method() === "PUT",
        { timeout: 10000 },
      ).catch((error) => ({ error }));
      const startClick = await clickVisibleTaskButton(page, qaTitle, START_LABELS);
      result.observedButtons.beforeStart = startClick.buttonTexts;
      if (!startClick.clicked) {
        addCheck(
          "UI exposes start button for pending task",
          "FAIL",
          `visible buttons=${JSON.stringify(startClick.buttonTexts)}`,
        );
      } else {
        addCheck("UI exposes start button for pending task", "PASS", startClick.label);
        const startResponse = await startResponsePromise;
        if (startResponse?.error) {
          addCheck(
            "UI start action sends status update request",
            "FAIL",
            startResponse.error.message,
          );
        } else {
          addCheck(
            "UI start action sends status update request",
            startResponse.ok() ? "PASS" : "FAIL",
            `status=${startResponse.status()}`,
          );
        }
      }

      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await captureScreenshot(page, "04-after-start-attempt");
      const inProgress = await getTaskFromApi(result.createdTaskId);
      addCheck(
        "Task reaches IN_PROGRESS through UI start action",
        inProgress.response.ok &&
          String(inProgress.task?.status || "").toUpperCase() === STATUS.IN_PROGRESS
          ? "PASS"
          : "FAIL",
        `status=${inProgress.task?.status || "none"}`,
      );

      if (
        String(inProgress.task?.status || "").toUpperCase() === STATUS.IN_PROGRESS
      ) {
        const completeResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/tasks/${result.createdTaskId}/status`) &&
            response.request().method() === "PUT",
          { timeout: 10000 },
        ).catch((error) => ({ error }));
        const completeClick = await clickVisibleTaskButton(
          page,
          qaTitle,
          COMPLETE_LABELS,
        );
        result.observedButtons.beforeComplete = completeClick.buttonTexts;
        if (!completeClick.clicked) {
          addCheck(
            "UI exposes complete button for in-progress task",
            "FAIL",
            `visible buttons=${JSON.stringify(completeClick.buttonTexts)}`,
          );
        } else {
          addCheck(
            "UI exposes complete button for in-progress task",
            "PASS",
            completeClick.label,
          );
          const completeResponse = await completeResponsePromise;
          if (completeResponse?.error) {
            addCheck(
              "UI complete action sends status update request",
              "FAIL",
              completeResponse.error.message,
            );
          } else {
            addCheck(
              "UI complete action sends status update request",
              completeResponse.ok() ? "PASS" : "FAIL",
              `status=${completeResponse.status()}`,
            );
          }
        }

        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await captureScreenshot(page, "05-after-complete-attempt");
        const completed = await getTaskFromApi(result.createdTaskId);
        addCheck(
          "Task reaches COMPLETED with progress 100 through UI complete action",
          completed.response.ok &&
            String(completed.task?.status || "").toUpperCase() === STATUS.COMPLETED &&
            Number(completed.task?.progress) === 100
            ? "PASS"
            : "FAIL",
          `status=${completed.task?.status || "none"}, progress=${completed.task?.progress ?? "none"}`,
        );
      }

      result.cleanup.apiDeleteAttempted = true;
      const deletion = await apiFetch(`tasks/${result.createdTaskId}`, {
        method: "DELETE",
      });
      result.cleanup.apiDeleteOk =
        deletion.response.ok && deletion.data?.success !== false;
      addCheck(
        "Created QA lifecycle task is deleted through Tasks API",
        result.cleanup.apiDeleteOk ? "PASS" : "FAIL",
        `status=${deletion.response.status}`,
      );
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
          "Created QA lifecycle task cleanup ran after interrupted flow",
          result.cleanup.apiDeleteOk ? "PASS" : "FAIL",
          `status=${deletion.response.status}`,
        );
      } catch (error) {
        addCheck(
          "Created QA lifecycle task cleanup ran after interrupted flow",
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
