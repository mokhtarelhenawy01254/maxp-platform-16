import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

const webBaseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const apiBaseUrl =
  process.env.E2E_API_BASE_URL || "http://127.0.0.1:3007/api/v1";
const loginEmail = process.env.E2E_LOGIN_EMAIL;
const loginPassword = process.env.E2E_LOGIN_PASSWORD;
const preferredChannel = process.env.E2E_BROWSER_CHANNEL || "chrome";
const headless = process.env.E2E_HEADLESS !== "false";
const artifactDir = path.resolve("artifacts", "tasks-create-e2e");

if (!loginEmail || !loginPassword) {
  console.error(
    "Missing E2E_LOGIN_EMAIL or E2E_LOGIN_PASSWORD. Provide both env vars before running this script.",
  );
  process.exit(1);
}

mkdirSync(artifactDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[^\d]/g, "").slice(0, 14);
const projectName = `E2E Project ${stamp}`;
const taskTitle = `E2E Task ${stamp}`;

const projectPayload = {
  name: projectName,
  description: "Temporary project created by the tasks workspace E2E smoke test.",
  priority: "medium",
  startDate: "2026-04-23",
  endDate: "2026-04-30",
  budget: 1500,
  managerId: "",
  teamMembers: [],
  tags: ["e2e", "codex"],
};

const taskPayload = {
  projectId: "",
  categoryId: "",
  title: taskTitle,
  description: "Temporary task created by the tasks workspace E2E smoke test.",
  priority: "medium",
  type: "general",
  assignedTo: "",
  assignedToName: "",
  createdBy: "",
  createdByName: "",
  dueDate: "2026-04-30",
  startDate: "2026-04-23",
  estimatedHours: 2,
  tags: ["e2e", "codex"],
};

async function parseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: `Failed to parse JSON response: ${String(error)}`,
    };
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await parseJson(response);

  return { response, data };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless });
  } catch (defaultError) {
    return chromium.launch({ headless, channel: preferredChannel });
  }
}

async function verifyAppReachable() {
  const [webResponse, apiResponse] = await Promise.all([
    fetch(webBaseUrl, { redirect: "manual" }),
    fetch(`${apiBaseUrl}/health`),
  ]);

  if (!webResponse.ok && webResponse.status !== 302) {
    throw new Error(`Frontend is not reachable at ${webBaseUrl}`);
  }

  if (!apiResponse.ok) {
    throw new Error(`Backend is not reachable at ${apiBaseUrl}`);
  }
}

async function deleteIfCreated(url, token) {
  if (!url) {
    return;
  }

  await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => null);
}

async function main() {
  await verifyAppReachable();

  let token = "";
  let userId = "";
  let userName = "";
  let projectId = "";
  let taskId = "";
  let browser;

  try {
    const login = await fetchJson(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });

    if (!login.response.ok || !login.data?.success) {
      throw new Error(`Login failed: ${JSON.stringify(login.data)}`);
    }

    token = login.data.data.token;
    userId = login.data.data.user.id;
    userName =
      [
        login.data.data.user.firstName,
        login.data.data.user.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || login.data.data.user.email;

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const createProject = await fetchJson(`${apiBaseUrl}/projects`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...projectPayload,
        managerId: userId,
      }),
    });

    if (!createProject.response.ok || !createProject.data?.success) {
      throw new Error(
        `Project create failed: ${JSON.stringify(createProject.data)}`,
      );
    }

    projectId = createProject.data?.data?.id || "";
    if (!projectId) {
      throw new Error("Project create succeeded but no project id was returned.");
    }

    const createTask = await fetchJson(`${apiBaseUrl}/tasks`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...taskPayload,
        projectId,
        assignedTo: userId,
        assignedToName: userName,
        createdBy: userId,
        createdByName: userName,
      }),
    });

    if (!createTask.response.ok || !createTask.data?.success) {
      throw new Error(`Task create failed: ${JSON.stringify(createTask.data)}`);
    }

    taskId = createTask.data?.data?.id || "";
    if (!taskId) {
      throw new Error("Task create succeeded but no task id was returned.");
    }

    const [projectsList, tasksList] = await Promise.all([
      fetchJson(`${apiBaseUrl}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetchJson(`${apiBaseUrl}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    const projectVisibleInApi = JSON.stringify(projectsList.data).includes(
      projectName,
    );
    const taskVisibleInApi = JSON.stringify(tasksList.data).includes(taskTitle);

    if (!projectVisibleInApi || !taskVisibleInApi) {
      throw new Error(
        `Created records were not returned by list APIs. projectVisibleInApi=${projectVisibleInApi}, taskVisibleInApi=${taskVisibleInApi}`,
      );
    }

    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

    await page.goto(`${webBaseUrl}/auth/login`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').first().fill(loginEmail);
    await page.locator('input[type="password"]').first().fill(loginPassword);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/company-dashboard|tasks/, { timeout: 20000 });

    await page.goto(`${webBaseUrl}/tasks/projects`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1500);
    const projectsText = await page.locator("body").innerText();
    const projectVisibleInUi = projectsText.includes(projectName);
    await page.screenshot({
      path: path.join(artifactDir, "projects-created.png"),
      fullPage: true,
    });

    await page.goto(`${webBaseUrl}/tasks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const tasksText = await page.locator("body").innerText();
    const taskVisibleInUi = tasksText.includes(taskTitle);
    await page.screenshot({
      path: path.join(artifactDir, "tasks-created.png"),
      fullPage: true,
    });

    if (!projectVisibleInUi || !taskVisibleInUi) {
      throw new Error(
        `Created records were not visible in the UI. projectVisibleInUi=${projectVisibleInUi}, taskVisibleInUi=${taskVisibleInUi}`,
      );
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          loginEmail,
          project: {
            id: projectId,
            name: projectName,
            visibleInApi: projectVisibleInApi,
            visibleInUi: projectVisibleInUi,
          },
          task: {
            id: taskId,
            title: taskTitle,
            visibleInApi: taskVisibleInApi,
            visibleInUi: taskVisibleInUi,
          },
          artifacts: {
            projects: path.join(artifactDir, "projects-created.png"),
            tasks: path.join(artifactDir, "tasks-created.png"),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await deleteIfCreated(taskId ? `${apiBaseUrl}/tasks/${taskId}` : "", token);
    await deleteIfCreated(
      projectId ? `${apiBaseUrl}/projects/${projectId}` : "",
      token,
    );

    if (browser) {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
