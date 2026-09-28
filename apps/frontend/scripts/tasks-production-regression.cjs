const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const ARTIFACTS_DIR = path.join(ROOT_DIR, "artifacts");

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const RUN_DIR = path.join(ARTIFACTS_DIR, `tasks-production-regression-${RUN_ID}`);
const BASE_URL = (process.env.TASK_REGRESSION_BASE_URL || process.env.TASK_UI_BASE_URL || "https://maxp.online").replace(/\/+$/, "");
const API_BASE_URL = `${BASE_URL}/api/v1`;
const EXTERNAL_BASE_URL = (
  process.env.TASKS_API_BASE_URL ||
  process.env.TASK_REGRESSION_EXTERNAL_BASE_URL ||
  `${API_BASE_URL}/external/tasks`
).replace(/\/+$/, "");

const DEFAULT_USER_ID = process.env.TASK_REGRESSION_USER_ID || "cmleybpg2002bjuo2m44y4kip";
const DEFAULT_COMPANY_ID = process.env.TASK_REGRESSION_COMPANY_ID || "cmleybpf70028juo2wwpmp8rt";
const DEFAULT_EMAIL = process.env.TASK_REGRESSION_USER_EMAIL || "swan@h2m.com";
const DEFAULT_ROLE = process.env.TASK_REGRESSION_USER_ROLE || "COMPANY_ADMIN";
const SKIP_UI = String(process.env.TASK_REGRESSION_SKIP_UI || "false").toLowerCase() === "true";

const result = {
  runId: RUN_ID,
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  externalBaseUrl: EXTERNAL_BASE_URL,
  checks: [],
  tempCredentials: [],
  cleanup: {
    taskIds: [],
    credentialIds: [],
    warnings: [],
  },
  uiRuns: [],
  summary: {
    pass: 0,
    fail: 0,
    warn: 0,
  },
};

const addCheck = (suite, name, status, detail = "") => {
  result.checks.push({
    suite,
    name,
    status,
    detail,
    timestamp: new Date().toISOString(),
  });
  if (status === "PASS") result.summary.pass += 1;
  if (status === "FAIL") result.summary.fail += 1;
  if (status === "WARN") result.summary.warn += 1;
};

const truncate = (value, max = 500) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const maskKey = (value) => {
  if (!value) return null;
  const text = String(value);
  const parts = text.split("_");
  if (parts.length >= 3) return `${parts[0]}_${parts[1]}_****`;
  return `${text.slice(0, 8)}****`;
};

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: truncate(text) };
  }
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return { response, body: await safeJson(response) };
};

const generateAuthToken = () => {
  const existingToken = process.env.TASK_REGRESSION_AUTH_TOKEN ||
    process.env.TASK_SYSTEM_AUTH_TOKEN ||
    process.env.TASK_UI_AUTH_TOKEN;
  if (existingToken) {
    return { token: existingToken, source: "environment" };
  }

  const script = `
require('dotenv').config({ path: '.env.production', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./utils/jwtSecret');
const token = jwt.sign({
  userId: ${JSON.stringify(DEFAULT_USER_ID)},
  id: ${JSON.stringify(DEFAULT_USER_ID)},
  companyId: ${JSON.stringify(DEFAULT_COMPANY_ID)},
  role: ${JSON.stringify(DEFAULT_ROLE)},
  email: ${JSON.stringify(DEFAULT_EMAIL)}
}, getJwtSecret(), { expiresIn: '25m' });
process.stdout.write(token);
`;

  const generated = spawnSync(process.execPath, ["-e", script], {
    cwd: BACKEND_DIR,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024,
  });

  if (generated.status !== 0) {
    throw new Error(
      `Could not generate auth token locally. Set TASK_REGRESSION_AUTH_TOKEN. ${truncate(generated.stderr || generated.stdout)}`,
    );
  }

  return { token: generated.stdout.trim(), source: "local-jwt" };
};

const internalRequest = async (authToken, pathname, options = {}) => {
  const cleanPath = String(pathname || "").replace(/^\/+/, "");
  return requestJson(`${API_BASE_URL}/${cleanPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
};

const externalRequest = async (apiKey, pathname = "", options = {}) => {
  return requestJson(`${EXTERNAL_BASE_URL}${pathname}`, {
    ...options,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    },
  });
};

const extractArray = (body) => {
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.items)) return body.items;
  return [];
};

const pickAssignee = (users) => {
  const requested = process.env.TASK_ASSIGNED_TO || process.env.TASK_REGRESSION_ASSIGNED_TO;
  if (requested) {
    const found = users.find((user) => user.id === requested);
    if (found) return found;
  }
  return users.find((user) => String(user.role || "").toUpperCase() !== "OWNER") || users[0] || null;
};

const getAssignableUser = async (authToken) => {
  const usersResult = await internalRequest(authToken, "tasks/company-users");
  const users = extractArray(usersResult.body);
  const assignee = pickAssignee(users);
  if (!usersResult.response.ok || !assignee?.id) {
    throw new Error(`Could not resolve an assignable company user. status=${usersResult.response.status}`);
  }
  addCheck("permissions", "Internal company users are readable for regression setup", "PASS", `${users.length} user(s)`);
  return assignee;
};

const createCredential = async (authToken, name, scopes, assigneeId) => {
  const needsActingUser = scopes.includes("tasks:write");
  const payload = {
    name,
    description: "Temporary credential created by Tasks production regression suite.",
    scopes,
    ...(needsActingUser ? { defaultActingUserId: assigneeId } : {}),
  };

  const created = await internalRequest(authToken, "tasks/integrations/credentials", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const id = created.body?.data?.id;
  const apiKey = created.body?.secret?.apiKey;
  if (created.response.status !== 201 || !id || !apiKey) {
    throw new Error(`Could not create temporary credential ${name}. status=${created.response.status}`);
  }

  const credential = { id, name, scopes, apiKey, maskedKey: maskKey(apiKey) };
  result.tempCredentials.push({
    id,
    name,
    scopes,
    maskedKey: credential.maskedKey,
  });
  return credential;
};

const cleanupTask = async (authToken, taskId) => {
  if (!taskId) return;
  if (!result.cleanup.taskIds.includes(taskId)) {
    result.cleanup.taskIds.push(taskId);
  }
  try {
    const deleted = await internalRequest(authToken, `tasks/${taskId}`, { method: "DELETE" });
    if (!deleted.response.ok && deleted.response.status !== 404) {
      result.cleanup.warnings.push(`Task cleanup returned ${deleted.response.status} for ${taskId}`);
    }
  } catch (error) {
    result.cleanup.warnings.push(`Task cleanup failed for ${taskId}: ${error.message}`);
  }
};

const cleanupCredential = async (authToken, credentialId) => {
  if (!credentialId) return;
  if (!result.cleanup.credentialIds.includes(credentialId)) {
    result.cleanup.credentialIds.push(credentialId);
  }
  try {
    const deleted = await internalRequest(authToken, `tasks/integrations/credentials/${credentialId}`, {
      method: "DELETE",
      body: JSON.stringify({ reason: "Temporary regression credential cleanup." }),
    });
    if (!deleted.response.ok && deleted.response.status !== 404) {
      result.cleanup.warnings.push(`Credential cleanup returned ${deleted.response.status} for ${credentialId}`);
    }
  } catch (error) {
    result.cleanup.warnings.push(`Credential cleanup failed for ${credentialId}: ${error.message}`);
  }
};

const assertStatus = (condition, message) => {
  if (!condition) throw new Error(message);
};

const createExternalTask = async (apiKey, assignee, titlePrefix) => {
  const created = await externalRequest(apiKey, "", {
    method: "POST",
    body: JSON.stringify({
      title: `${titlePrefix} ${RUN_ID}`,
      description: "Temporary task created by Tasks production regression suite.",
      priority: "LOW",
      type: "qa-regression",
      assignedTo: assignee.id,
      tags: ["qa-task-regression", RUN_ID],
    }),
  });

  const task = created.body?.data;
  return { created, task };
};

const runPermissionSuite = async (authToken) => {
  const assignee = await getAssignableUser(authToken);
  const credentials = [];
  const createdTasks = [];

  try {
    const readWrite = await createCredential(authToken, `QA regression read-write ${RUN_ID}`, ["tasks:read", "tasks:write"], assignee.id);
    const readOnly = await createCredential(authToken, `QA regression read-only ${RUN_ID}`, ["tasks:read"], assignee.id);
    const writeOnly = await createCredential(authToken, `QA regression write-only ${RUN_ID}`, ["tasks:write"], assignee.id);
    const disabled = await createCredential(authToken, `QA regression disabled ${RUN_ID}`, ["tasks:read"], assignee.id);
    credentials.push(readWrite, readOnly, writeOnly, disabled);
    addCheck("permissions", "Temporary API credentials are created without exposing secrets", "PASS", `${credentials.length} credential(s)`);

    const disabledUpdate = await internalRequest(authToken, `tasks/integrations/credentials/${disabled.id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: false }),
    });
    assertStatus(disabledUpdate.response.ok, `Could not disable temporary credential. status=${disabledUpdate.response.status}`);

    const invalid = await externalRequest(`tsk_deadbeef_${RUN_ID.replace(/-/g, "").slice(0, 24)}`, "/users", { method: "GET" });
    addCheck(
      "permissions",
      "Invalid API key is rejected",
      invalid.response.status === 401 ? "PASS" : "FAIL",
      `status=${invalid.response.status}`,
    );

    const disabledRead = await externalRequest(disabled.apiKey, "/users", { method: "GET" });
    addCheck(
      "permissions",
      "Disabled API key is rejected",
      disabledRead.response.status === 401 ? "PASS" : "FAIL",
      `status=${disabledRead.response.status}`,
    );

    const readOnlyRead = await externalRequest(readOnly.apiKey, "/users", { method: "GET" });
    const readOnlyWrite = await createExternalTask(readOnly.apiKey, assignee, "QA Readonly Blocked");
    addCheck(
      "permissions",
      "Read-only API key can read and cannot write",
      readOnlyRead.response.ok && readOnlyWrite.created.response.status === 403 ? "PASS" : "FAIL",
      `read=${readOnlyRead.response.status}, write=${readOnlyWrite.created.response.status}`,
    );

    const writeOnlyRead = await externalRequest(writeOnly.apiKey, "/users", { method: "GET" });
    const writeOnlyWrite = await createExternalTask(writeOnly.apiKey, assignee, "QA Writeonly Allowed");
    if (writeOnlyWrite.task?.id) createdTasks.push(writeOnlyWrite.task.id);
    addCheck(
      "permissions",
      "Write-only API key cannot read but can write",
      writeOnlyRead.response.status === 403 && writeOnlyWrite.created.response.status === 201 && Boolean(writeOnlyWrite.task?.id)
        ? "PASS"
        : "FAIL",
      `read=${writeOnlyRead.response.status}, write=${writeOnlyWrite.created.response.status}`,
    );

    const readWriteUsers = await externalRequest(readWrite.apiKey, "/users", { method: "GET" });
    const readWriteProjects = await externalRequest(readWrite.apiKey, "/projects", { method: "GET" });
    const readWriteCreated = await createExternalTask(readWrite.apiKey, assignee, "QA Readwrite Lifecycle");
    const readWriteTask = readWriteCreated.task;
    if (readWriteTask?.id) createdTasks.push(readWriteTask.id);

    assertStatus(readWriteUsers.response.ok, `read/write /users failed: ${readWriteUsers.response.status}`);
    assertStatus(readWriteProjects.response.ok, `read/write /projects failed: ${readWriteProjects.response.status}`);
    assertStatus(readWriteCreated.created.response.status === 201 && readWriteTask?.id, `read/write create failed: ${readWriteCreated.created.response.status}`);

    const fetched = await externalRequest(readWrite.apiKey, `/${readWriteTask.id}`, { method: "GET" });
    const updatedDetails = await externalRequest(readWrite.apiKey, `/${readWriteTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: `${readWriteTask.title} - QA Updated`,
        description: "Updated description by QA external API test",
        priority: "HIGH",
        tags: ["qa-updated", RUN_ID],
      }),
    });
    const inProgress = await externalRequest(readWrite.apiKey, `/${readWriteTask.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS", progress: 40 }),
    });
    const completed = await externalRequest(readWrite.apiKey, `/${readWriteTask.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const completedTask = completed.body?.data;

    const invalidAssignee = await externalRequest(readWrite.apiKey, `/${readWriteTask.id}`, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: "non-existent-user-id" }),
    });
    addCheck(
      "permissions",
      "Assigning task to an invalid or external user is rejected with 400",
      invalidAssignee.response.status === 400 ? "PASS" : "FAIL",
      `status=${invalidAssignee.response.status}`,
    );

    const notificationsResult = await internalRequest(authToken, "tasks/notifications");
    const notifications = notificationsResult.body?.notifications || [];
    const taskNotification = notifications.find((n) => n.taskId === readWriteTask.id);
    addCheck(
      "permissions",
      "Assignee receives notification for external task updates",
      Boolean(taskNotification) ? "PASS" : "FAIL",
      `found=${Boolean(taskNotification)}, title=${taskNotification?.title || "none"}`,
    );

    addCheck(
      "permissions",
      "Read/write API key can read, create, and update task lifecycle and details",
      fetched.response.ok &&
        updatedDetails.response.ok &&
        updatedDetails.body?.data?.description === "Updated description by QA external API test" &&
        inProgress.response.ok &&
        completed.response.ok &&
        String(completedTask?.status || "").toUpperCase() === "COMPLETED" &&
        Number(completedTask?.progress) === 100
        ? "PASS"
        : "FAIL",
      `fetch=${fetched.response.status}, patchDetails=${updatedDetails.response.status}, inProgress=${inProgress.response.status}, completed=${completed.response.status}, final=${completedTask?.status || "none"}`,
    );
  } catch (error) {
    addCheck("permissions", "Permission regression suite completed without runner error", "FAIL", error.message);
  } finally {
    for (const taskId of createdTasks.reverse()) {
      await cleanupTask(authToken, taskId);
    }
    for (const credential of credentials.reverse()) {
      await cleanupCredential(authToken, credential.id);
    }
  }
};

const runUiScript = (authToken, key, label, scriptName) => {
  const jsonReport = path.join(RUN_DIR, `${key}.json`);
  const mdReport = path.join(RUN_DIR, `${key}.md`);
  const screenshotDir = path.join(RUN_DIR, key);
  const logPath = path.join(RUN_DIR, `${key}.log`);
  const scriptPath = path.join(FRONTEND_DIR, "scripts", scriptName);

  const child = spawnSync(process.execPath, [scriptPath], {
    cwd: FRONTEND_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      TASK_UI_AUTH_TOKEN: authToken,
      TASK_UI_BASE_URL: BASE_URL,
      TASK_UI_OUT_DIR: screenshotDir,
      TASK_UI_JSON_REPORT: jsonReport,
      TASK_UI_MD_REPORT: mdReport,
    },
    maxBuffer: 12 * 1024 * 1024,
  });

  fs.writeFileSync(logPath, `${child.stdout || ""}\n${child.stderr || ""}`, "utf8");

  let childReport = null;
  if (fs.existsSync(jsonReport)) {
    try {
      childReport = JSON.parse(fs.readFileSync(jsonReport, "utf8"));
    } catch (_error) {
      childReport = null;
    }
  }

  const childSummary = childReport?.summary || {};
  const childFails = Number(childSummary.fail || 0);
  const status = child.status === 0 && childFails === 0 ? "PASS" : "FAIL";
  addCheck(
    "ui",
    `${label} passes`,
    status,
    `exit=${child.status}, summary=${Number(childSummary.pass || 0)} pass / ${childFails} fail / ${Number(childSummary.warn || 0)} warn`,
  );

  result.uiRuns.push({
    key,
    label,
    exitCode: child.status,
    report: path.relative(ROOT_DIR, mdReport).replace(/\\/g, "/"),
    json: path.relative(ROOT_DIR, jsonReport).replace(/\\/g, "/"),
    log: path.relative(ROOT_DIR, logPath).replace(/\\/g, "/"),
    summary: childSummary,
  });
};

const writeReports = () => {
  result.finishedAt = new Date().toISOString();
  if (result.cleanup.warnings.length > 0) {
    addCheck("cleanup", "Cleanup completed without warnings", "WARN", result.cleanup.warnings.join("; "));
  } else {
    addCheck("cleanup", "Cleanup completed without warnings", "PASS");
  }

  const jsonPath = path.join(ARTIFACTS_DIR, "tasks-production-regression-latest.json");
  const mdPath = path.join(ARTIFACTS_DIR, "tasks-production-regression-latest.md");
  const runJsonPath = path.join(RUN_DIR, "summary.json");
  const runMdPath = path.join(RUN_DIR, "summary.md");

  const mdLines = [
    `# Tasks Production Regression ${RUN_ID}`,
    "",
    `- Base URL: ${BASE_URL}`,
    `- External base URL: ${EXTERNAL_BASE_URL}`,
    `- Started: ${result.startedAt}`,
    `- Finished: ${result.finishedAt}`,
    `- Result: ${result.summary.pass} pass / ${result.summary.fail} fail / ${result.summary.warn} warn`,
    `- Temp credentials created: ${result.tempCredentials.length}`,
    `- Cleanup task ids: ${result.cleanup.taskIds.length ? result.cleanup.taskIds.map((id) => `\`${id}\``).join(", ") : "none"}`,
    "",
    "## Checks",
    "",
    "| Suite | Status | Check | Detail |",
    "| --- | --- | --- | --- |",
    ...result.checks.map((check) => (
      `| ${check.suite} | ${check.status} | ${check.name} | ${String(check.detail || "").replace(/\|/g, "\\|")} |`
    )),
    "",
    "## UI Runs",
    "",
    ...result.uiRuns.map((run) => `- ${run.label}: ${run.summary?.pass || 0} pass / ${run.summary?.fail || 0} fail / ${run.summary?.warn || 0} warn - ${run.report}`),
    "",
  ];

  fs.writeFileSync(runJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(runMdPath, mdLines.join("\n"), "utf8");
  fs.copyFileSync(runJsonPath, jsonPath);
  fs.copyFileSync(runMdPath, mdPath);

  return { jsonPath, mdPath, runJsonPath, runMdPath };
};

(async () => {
  fs.mkdirSync(RUN_DIR, { recursive: true });

  const { token: authToken, source } = generateAuthToken();
  result.authTokenSource = source;

  await runPermissionSuite(authToken);

  if (SKIP_UI) {
    addCheck("ui", "UI regression scripts skipped", "WARN", "TASK_REGRESSION_SKIP_UI=true");
  } else {
    runUiScript(authToken, "ui-smoke", "Tasks UI smoke", "tasks-ui-smoke-production.cjs");
    runUiScript(authToken, "ui-write-flow", "Tasks UI write flow", "tasks-ui-write-flow-production.cjs");
    runUiScript(authToken, "ui-lifecycle", "Tasks UI lifecycle", "tasks-ui-lifecycle-production.cjs");
  }

  const artifacts = writeReports();
  console.log(JSON.stringify({
    success: result.summary.fail === 0,
    summary: result.summary,
    report: path.relative(ROOT_DIR, artifacts.mdPath).replace(/\\/g, "/"),
    json: path.relative(ROOT_DIR, artifacts.jsonPath).replace(/\\/g, "/"),
    runDir: path.relative(ROOT_DIR, RUN_DIR).replace(/\\/g, "/"),
  }, null, 2));

  if (result.summary.fail > 0) {
    process.exitCode = 1;
  }
})().catch((error) => {
  addCheck("runner", "Tasks production regression runner completed", "FAIL", error?.message || String(error));
  const artifacts = writeReports();
  console.error(error?.stack || error?.message || String(error));
  console.error(`Report: ${path.relative(ROOT_DIR, artifacts.mdPath).replace(/\\/g, "/")}`);
  process.exitCode = 1;
});
