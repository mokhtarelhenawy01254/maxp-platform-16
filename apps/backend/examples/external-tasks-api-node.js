const API_BASE_URL = (
  process.env.TASKS_API_BASE_URL || "http://localhost:3007/api/v1/external/tasks"
).replace(/\/+$/, "");
const API_KEY = process.env.TASKS_API_KEY || "";
const ASSIGNED_TO = process.env.TASK_ASSIGNED_TO || "";
const ADMIN_TASKS_BASE_URL = (
  process.env.TASKS_ADMIN_API_BASE_URL || "http://localhost:3007/api/v1/tasks"
).replace(/\/+$/, "");
const ADMIN_TOKEN = process.env.TASKS_ADMIN_TOKEN || "";

class ExternalTasksApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async request(pathname = "", options = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...options,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok || body?.success === false) {
      throw new Error(body?.message || `Request failed with status ${response.status}`);
    }

    return body;
  }

  listUsers() {
    return this.request("/users", { method: "GET" });
  }

  listTasks() {
    return this.request("", { method: "GET" });
  }

  createTask(payload) {
    return this.request("", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getTask(taskId) {
    return this.request(`/${taskId}`, { method: "GET" });
  }

  updateTask(taskId, payload) {
    return this.request(`/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  updateTaskStatus(taskId, status, progress) {
    return this.request(`/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, progress }),
    });
  }
}

const cleanupTask = async (taskId) => {
  if (!taskId || !ADMIN_TOKEN) {
    return false;
  }

  const response = await fetch(`${ADMIN_TASKS_BASE_URL}/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || `Cleanup failed with status ${response.status}`);
  }

  return true;
};

const main = async () => {
  if (!API_KEY) {
    throw new Error("Set TASKS_API_KEY before running this example.");
  }

  const client = new ExternalTasksApiClient(API_BASE_URL, API_KEY);
  let createdTaskId = null;

  try {
    const usersResponse = await client.listUsers();
    const fallbackAssignedTo = usersResponse.data?.[0]?.id || null;
    const assignedTo = ASSIGNED_TO || fallbackAssignedTo;

    if (!assignedTo) {
      throw new Error("No assignable user found. Set TASK_ASSIGNED_TO explicitly.");
    }

    const createdTask = await client.createTask({
      title: `Node Example Task ${Date.now()}`,
      description: "Created by backend/examples/external-tasks-api-node.js",
      priority: "HIGH",
      type: "general",
      assignedTo,
      tags: ["node-example", "external-api"],
    });

    createdTaskId = createdTask.data?.id || null;

    const updatedTaskDetails = await client.updateTask(createdTaskId, {
      title: `${createdTask.data.title} (Updated)`,
      description: "Updated description from Node.js external integration script",
      priority: "URGENT",
      tags: ["node-example", "external-api", "updated"],
    });

    const updatedTaskStatus = await client.updateTaskStatus(
      createdTaskId,
      "IN_PROGRESS",
      45,
    );
    const fetchedTask = await client.getTask(createdTaskId);
    const tasksList = await client.listTasks();

    console.log(
      JSON.stringify(
        {
          success: true,
          createdTask: createdTask.data,
          updatedTaskDetails: updatedTaskDetails.data,
          updatedTaskStatus: updatedTaskStatus.data,
          fetchedTask: fetchedTask.data,
          totalTasksVisible: tasksList.pagination?.total || 0,
        },
        null,
        2,
      ),
    );
  } finally {
    if (createdTaskId && ADMIN_TOKEN) {
      const deleted = await cleanupTask(createdTaskId);
      console.log(
        JSON.stringify(
          {
            cleanup: {
              deleted,
              taskId: createdTaskId,
            },
          },
          null,
          2,
        ),
      );
    }
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        message: error.message,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
