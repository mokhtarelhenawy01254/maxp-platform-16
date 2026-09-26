const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const taskNotificationService = require("../services/taskNotificationService");
const { queueTaskWebhook } = require("../services/taskWebhookService");
const recurringTaskService = require("../services/recurringTaskService");
const taskNotificationHelpers = taskNotificationService.helpers;

let legacyTaskColumnsCache = null;

// Helper function to convert status to uppercase
const normalizeStatus = (status) => {
  if (!status) return null;
  return status.toUpperCase();
};

// Helper function to convert priority to uppercase
const normalizePriority = (priority) => {
  if (!priority) return "MEDIUM";
  return priority.toUpperCase();
};

const normalizeMeasurementType = (measurementType) => {
  const normalized = String(measurementType || "TIME").toUpperCase();
  return ["TIME", "COUNT", "VALUE"].includes(normalized)
    ? normalized
    : "TIME";
};

const parseStringArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const toNumberValue = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const clampProgress = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
};

const escapeSqlLike = (value) =>
  String(value ?? "")
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

const toApiStatus = (status) => String(status || "pending").toLowerCase();
const toApiPriority = (priority) => String(priority || "medium").toLowerCase();

const makePersonName = (user) => {
  if (!user) {
    return "غير محدد";
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return fullName || user.name || "غير محدد";
};

const dateComparableValue = (value) => {
  if (!value) return null;
  const dateValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
};

const buildTaskUpdateChangeSummary = (existingTask, input) => {
  const changes = [];

  if (input.title && input.title !== existingTask.title) {
    changes.push("العنوان");
  }

  if (input.description && input.description !== existingTask.description) {
    changes.push("الوصف");
  }

  if (input.priority && normalizePriority(input.priority) !== existingTask.priority) {
    changes.push(`الأولوية إلى ${taskNotificationHelpers.normalizePriorityLabel(input.priority)}`);
  }

  if (
    input.dueDate !== undefined &&
    dateComparableValue(input.dueDate) !== dateComparableValue(existingTask.dueDate)
  ) {
    changes.push(`موعد التسليم إلى ${taskNotificationHelpers.formatDate(input.dueDate)}`);
  }

  if (
    input.startDate !== undefined &&
    dateComparableValue(input.startDate) !== dateComparableValue(existingTask.startDate)
  ) {
    changes.push(`موعد البدء إلى ${taskNotificationHelpers.formatDate(input.startDate)}`);
  }

  if (input.assignedTo && input.assignedTo !== existingTask.assignedTo) {
    changes.push("المسؤول عن التنفيذ");
  }

  if (input.progress !== undefined && Number(input.progress) !== Number(existingTask.progress || 0)) {
    changes.push(`نسبة الإنجاز إلى ${clampProgress(input.progress)}%`);
  }

  if (input.estimatedHours !== undefined && Number(input.estimatedHours) !== Number(existingTask.estimatedHours || 0)) {
    changes.push("الساعات المقدرة");
  }

  if (input.actualHours !== undefined && Number(input.actualHours) !== Number(existingTask.actualHours || 0)) {
    changes.push("الساعات الفعلية");
  }

  if (input.categoryId !== undefined && (input.categoryId || null) !== (existingTask.categoryId || null)) {
    changes.push("القسم");
  }

  if (input.projectId !== undefined && (input.projectId || null) !== (existingTask.projectId || null)) {
    changes.push("المشروع");
  }

  if (input.goalId !== undefined && (input.goalId || null) !== (existingTask.goalId || null)) {
    changes.push("الهدف المرتبط");
  }

  if (input.metricCurrentValue !== undefined || input.metricTargetValue !== undefined || input.metricUnit !== undefined) {
    changes.push("قياس الإنجاز");
  }

  if (input.tags !== undefined) {
    changes.push("الوسوم");
  }

  return [...new Set(changes)];
};

const buildTaskOrderClause = (sortBy, sortOrder) => {
  const columnMap = {
    createdAt: '"createdAt"',
    dueDate: '"dueDate"',
    priority: '"priority"',
    status: '"status"',
    title: '"title"',
  };

  const safeColumn = columnMap[sortBy] || '"createdAt"';
  const safeDirection =
    String(sortOrder || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

  return `${safeColumn} ${safeDirection}, "createdAt" DESC`;
};

async function getLegacyTaskColumns() {
  if (legacyTaskColumnsCache) {
    return legacyTaskColumnsCache;
  }

  const rows = await getSharedPrismaClient().$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Task'
    ORDER BY ordinal_position
  `);

  legacyTaskColumnsCache = new Set(
    rows.map((row) => String(row.column_name || row.COLUMN_NAME)),
  );

  return legacyTaskColumnsCache;
}

async function shouldUseLegacyTaskQueries() {
  const columns = await getLegacyTaskColumns();

  return (
    columns.has("id") &&
    (!columns.has("goalId") ||
      !columns.has("measurementType") ||
      !columns.has("metricUnit"))
  );
}

function buildLegacyTaskWhereClause(filters) {
  const clauses = [];
  const params = [];

  clauses.push(`"companyId" = $1`);
  params.push(filters.companyId);

  if (filters.projectId) {
    clauses.push(`"projectId" = $${params.length + 1}`);
    params.push(filters.projectId);
  }

  if (filters.assignedTo) {
    clauses.push(`"assignedTo" = $${params.length + 1}`);
    params.push(filters.assignedTo);
  }

  if (filters.createdBy) {
    clauses.push(`"createdBy" = $${params.length + 1}`);
    params.push(filters.createdBy);
  }

  if (filters.status) {
    clauses.push(`"status" = $${params.length + 1}`);
    params.push(normalizeStatus(filters.status));
  }

  if (filters.priority) {
    clauses.push(`"priority" = $${params.length + 1}`);
    params.push(normalizePriority(filters.priority));
  }

  if (filters.search) {
    const searchParamIdx = params.length + 1;
    clauses.push(`(
      LOWER(COALESCE("title", '')) LIKE LOWER($${searchParamIdx}) ESCAPE '\\'
      OR LOWER(COALESCE("description", '')) LIKE LOWER($${searchParamIdx}) ESCAPE '\\'
    )`);
    params.push(`%${escapeSqlLike(filters.search)}%`);
  }

  return { sql: clauses.join(" AND "), params };
}

async function fetchLegacyTaskSummaries({
  companyId,
  projectId,
  status,
  priority,
  assignedTo,
  createdBy,
  search,
  page = 1,
  limit = 50,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const { sql: whereClause, params: whereParams } = buildLegacyTaskWhereClause({
    companyId,
    projectId,
    status,
    priority,
    assignedTo,
    createdBy,
    search,
  });
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.max(1, Number(limit) || 50);
  const offset = (parsedPage - 1) * parsedLimit;
  const orderClause = buildTaskOrderClause(sortBy, sortOrder);
  const prisma = getSharedPrismaClient();

  const limitIdx = whereParams.length + 1;
  const offsetIdx = whereParams.length + 2;

  const [tasks, countRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `
      SELECT
        "id",
        "projectId",
        "categoryId",
        "title",
        "description",
        "status",
        "priority",
        "type",
        "assignedTo",
        "createdBy",
        "dueDate",
        "startDate",
        "estimatedHours",
        "actualHours",
        "progress",
        "tags",
        "dependencies",
        "companyId",
        "createdAt",
        "updatedAt",
        "completedDate",
        "isRecurring"
      FROM "Task"
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx}
    `,
      ...whereParams,
      parsedLimit,
      offset,
    ),
    prisma.$queryRawUnsafe(
      `
      SELECT COUNT(*)::int AS total
      FROM "Task"
      WHERE ${whereClause}
    `,
      ...whereParams,
    ),
  ]);

  const formattedTasks = await hydrateLegacyTasks(tasks);

  return {
    tasks: formattedTasks,
    total: Number(countRows?.[0]?.total || 0),
    page: parsedPage,
    limit: parsedLimit,
  };
}

async function hydrateLegacyTasks(tasks) {
  const prisma = getSharedPrismaClient();
  const projectIds = [
    ...new Set(tasks.map((task) => task.projectId).filter(Boolean)),
  ];
  const categoryIds = [
    ...new Set(tasks.map((task) => task.categoryId).filter(Boolean)),
  ];
  const userIds = [
    ...new Set(
      tasks
        .flatMap((task) => [task.assignedTo, task.createdBy])
        .filter(Boolean),
    ),
  ];

  const [projects, categories, users] = await Promise.all([
    projectIds.length > 0
      ? prisma.project
          .findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    categoryIds.length > 0
      ? prisma.taskCategory
          .findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.user
          .findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const usersById = new Map(users.map((user) => [user.id, user]));

  return tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId || "",
      projectName: projectsById.get(task.projectId)?.name || "مشروع غير محدد",
      categoryId: task.categoryId || null,
      categoryName: categoriesById.get(task.categoryId)?.name || null,
      goalId: null,
      goalTitle: null,
      goalType: null,
      title: task.title,
      description: task.description || "",
      status: toApiStatus(task.status),
      priority: toApiPriority(task.priority),
      type: task.type || "general",
      assignedTo: task.assignedTo,
      assignedToName: makePersonName(usersById.get(task.assignedTo)),
      createdBy: task.createdBy,
      createdByName: makePersonName(usersById.get(task.createdBy)),
      dueDate: task.dueDate,
      startDate: task.startDate || null,
      estimatedHours: Number(task.estimatedHours || 0),
      actualHours: Number(task.actualHours || 0),
      progress: Number(task.progress || 0),
      measurementType: "TIME",
      metricUnit: null,
      metricTargetValue: null,
      metricCurrentValue: 0,
      tags: parseStringArray(task.tags),
      dependencies: parseStringArray(task.dependencies),
      taskAttachments: [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
}

async function fetchLegacyTaskById(companyId, taskId) {
  const prisma = getSharedPrismaClient();
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT
      "id",
      "projectId",
      "categoryId",
      "title",
      "description",
      "status",
      "priority",
      "type",
      "assignedTo",
      "createdBy",
      "dueDate",
      "startDate",
      "estimatedHours",
      "actualHours",
      "progress",
      "tags",
      "dependencies",
      "companyId",
      "createdAt",
      "updatedAt",
      "completedDate",
      "isRecurring"
    FROM "Task"
    WHERE "companyId" = $1
      AND "id" = $2
    LIMIT 1
  `,
    companyId,
    taskId,
  );

  if (!rows?.length) {
    return null;
  }

  const [task] = await hydrateLegacyTasks(rows);
  return task || null;
}

const computeTaskProgress = ({
  measurementType,
  metricTargetValue,
  metricCurrentValue,
  progress,
  status,
}) => {
  if (String(status || "").toUpperCase() === "COMPLETED") {
    return 100;
  }

  const normalizedMeasurementType = normalizeMeasurementType(measurementType);

  if (normalizedMeasurementType !== "TIME") {
    const targetValue = toNumberValue(metricTargetValue, 0);
    const currentValue = toNumberValue(metricCurrentValue, 0);

    if (targetValue > 0) {
      return clampProgress((currentValue / targetValue) * 100);
    }

    return currentValue > 0 ? 100 : 0;
  }

  return clampProgress(progress);
};

const buildTaskSummaryInclude = () => ({
  project: {
    select: {
      name: true,
    },
  },
  taskCategory: {
    select: {
      id: true,
      name: true,
    },
  },
  goal: {
    select: {
      id: true,
      title: true,
      goalType: true,
    },
  },
  assignee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  creator: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  taskAttachments: {
    select: {
      id: true,
      fileName: true,
      originalName: true,
      fileSize: true,
      fileType: true,
      filePath: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  taskWatchers: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  task_dependencies_task_dependencies_taskIdTotasks: {
    select: {
      dependsOnId: true,
    },
  },
});

const formatTaskSummary = (task) => ({
  id: task.id,
  projectId: task.projectId,
  projectName: task.project?.name || "مشروع غير محدد",
  categoryId: task.categoryId || null,
  categoryName: task.taskCategory?.name || null,
  goalId: task.goalId || null,
  goalTitle: task.goal?.title || null,
  goalType: task.goal?.goalType || null,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  type: task.type,
  assignedTo: task.assignedTo,
  assignee: task.assignee || null,
  assignedToName: task.assignee
    ? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim() || task.assignee.email
    : "غير محدد",
  createdBy: task.createdBy,
  creator: task.creator || null,
  createdByName: task.creator
    ? `${task.creator.firstName || ''} ${task.creator.lastName || ''}`.trim() || task.creator.email
    : "غير محدد",
  taskAttachments: task.taskAttachments || [],
  taskWatchers: task.taskWatchers || [],
  dueDate: task.dueDate,
  startDate: task.startDate || null,
  estimatedHours: task.estimatedHours,
  actualHours: task.actualHours,
  progress: Number(task.progress || 0),
  measurementType: task.measurementType || "TIME",
  metricUnit: task.metricUnit || null,
  metricTargetValue:
    task.metricTargetValue === null || task.metricTargetValue === undefined
      ? null
      : Number(task.metricTargetValue),
  metricCurrentValue:
    task.metricCurrentValue === null || task.metricCurrentValue === undefined
      ? 0
      : Number(task.metricCurrentValue),
  tags: parseStringArray(task.tags),
  dependencies: (() => {
    const tableDeps = (task.task_dependencies_task_dependencies_taskIdTotasks || []).map(
      (d) => d.dependsOnId
    );
    const jsonDeps = parseStringArray(task.dependencies);
    return Array.from(new Set([...tableDeps, ...jsonDeps]));
  })(),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

async function validateGoalLink(companyId, goalId) {
  if (!goalId) {
    return null;
  }

  return getSharedPrismaClient().goal.findFirst({
    where: {
      id: goalId,
      companyId,
    },
    select: {
      id: true,
      title: true,
    },
  });
}

async function resolveCompanyContext(req) {
  let companyId =
    req.user?.companyId ||
    req.headers?.["x-company-id"] ||
    req.headers?.["X-Company-Id"] ||
    req.query?.companyId;

  if (!companyId && req.user?.role === "SUPER_ADMIN") {
    try {
      const prisma = getSharedPrismaClient();
      const userComp = await prisma.userCompany.findFirst({
        where: { userId: req.user?.userId || req.user?.id, isActive: true },
        select: { companyId: true },
      });
      if (userComp?.companyId) {
        companyId = userComp.companyId;
      } else {
        const h2m = await prisma.company.findFirst({
          where: { id: "cmldvhqkx0000juj6sdbx2jw0" },
          select: { id: true },
        });
        companyId = h2m
          ? h2m.id
          : (await prisma.company.findFirst({ select: { id: true } }))?.id;
      }
    } catch (e) {
      console.warn("[taskController] resolveCompanyContext fallback error:", e?.message);
    }
  }
  return companyId;
}

const taskController = {
  // Get all tasks with filtering
  getAllTasks: async (req, res) => {
    try {
      const {
        projectId,
        status,
        priority,
        assignedTo,
        search,
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const parsedPage = Math.max(1, parseInt(page));
      const parsedLimit = Math.max(1, parseInt(limit));
      const skip = (parsedPage - 1) * parsedLimit;
      const companyId = await resolveCompanyContext(req);

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "معرف الشركة مطلوب",
        });
      }

      if (await shouldUseLegacyTaskQueries()) {
        const result = await fetchLegacyTaskSummaries({
          companyId,
          projectId,
          status,
          priority,
          assignedTo,
          search,
          page: parsedPage,
          limit: parsedLimit,
          sortBy,
          sortOrder,
        });

        return res.json({
          success: true,
          data: result.tasks,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.ceil(result.total / result.limit),
          },
        });
      }

      const userRole = String(req.user?.role || "").toUpperCase();
      const isManagerOrAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(userRole);
      const currentUserId = req.user?.userId || req.user?.id;

      // Build filter conditions
      const where = {
        companyId,
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedTo && { assignedTo }),
      };

      if (!isManagerOrAdmin && currentUserId) {
        where.OR = [
          { assignedTo: currentUserId },
          { createdBy: currentUserId },
          { taskWatchers: { some: { userId: currentUserId } } },
        ];
      }

      // Get tasks with project and user information
      const [tasks, totalTasks] = await Promise.all([
        getSharedPrismaClient().task.findMany({
          where,
          include: buildTaskSummaryInclude(),
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: parsedLimit,
        }),
        getSharedPrismaClient().task.count({ where }),
      ]);

      // Format response
      const formattedTasks = tasks.map(formatTaskSummary);


      res.json({
        success: true,
        data: formattedTasks,
        pagination: {
          total: totalTasks,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalTasks / parsedLimit),
        },
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب المهام",
      });
    }
  },

  // Create new task
  createTask: async (req, res) => {
    try {
      const {
        projectId,
        categoryId,
        goalId,
        title,
        description,
        priority,
        type = "general",
        assignedTo,
        dueDate,
        startDate,
        estimatedHours = 0,
        tags = [],
        measurementType = "TIME",
        metricUnit,
        metricTargetValue,
        metricCurrentValue,
        watchers = [],
        isRecurring = false,
        recurringRule = null,
      } = req.body;

      const companyId = await resolveCompanyContext(req);
      const createdBy = req.user?.userId || req.user?.id;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "معرف الشركة مطلوب",
        });
      }

      if (!createdBy) {
        return res.status(403).json({
          success: false,
          message: "معرف المستخدم مطلوب",
        });
      }

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: "العنوان والوصف مطلوبان",
        });
      }

      // التحقق من أن المستخدم المحدد موجود في نفس الشركة
      const finalAssignedTo = assignedTo || createdBy;
      const normalizedMeasurementType =
        normalizeMeasurementType(measurementType);
      const parsedMetricTargetValue = toNumberValue(metricTargetValue, null);
      const parsedMetricCurrentValue = toNumberValue(metricCurrentValue, 0);
      if (finalAssignedTo !== createdBy) {
        const assignedUser = await getSharedPrismaClient().user.findFirst({
          where: {
            id: finalAssignedTo,
            companyId: companyId,
            isActive: true,
          },
        });

        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            error: "المستخدم المحدد غير موجود أو غير نشط في الشركة",
          });
        }
      }

      const isLegacyTaskSchema = await shouldUseLegacyTaskQueries();

      if (goalId && !isLegacyTaskSchema) {
        const linkedGoal = await validateGoalLink(companyId, goalId);

        if (!linkedGoal) {
          return res.status(400).json({
            success: false,
            error: "Linked goal is invalid",
          });
        }
      }

      const taskId = uuidv4();
      const startDateValue = startDate ? new Date(startDate) : null;
      const dueDateValue = dueDate
        ? new Date(dueDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const safeEstimatedHours = Math.max(
        0,
        Math.round(
          Number(estimatedHours) ||
            (req.body.estimatedMinutes ? Math.ceil(Number(req.body.estimatedMinutes) / 60) : 0)
        )
      );
      const serializedTags =
        tags && Array.isArray(tags) ? JSON.stringify(tags) : null;
      const taskPriority = normalizePriority(priority);
      const isRecurringBool = Boolean(isRecurring);
      const serializedRecurringRule = recurringRule
        ? typeof recurringRule === "object"
          ? JSON.stringify(recurringRule)
          : String(recurringRule)
        : null;

      let newTask;

      if (isLegacyTaskSchema) {
        const legacyColumns = await getLegacyTaskColumns();
        const legacyTaskData = {
          id: taskId,
          companyId,
          projectId: projectId || null,
          categoryId: categoryId || null,
          title,
          description,
          status: "PENDING",
          priority: taskPriority,
          type: type || "general",
          assignedTo: finalAssignedTo,
          createdBy,
          startDate: startDateValue,
          dueDate: dueDateValue,
          estimatedHours: safeEstimatedHours,
          actualHours: 0,
          progress: 0,
          tags: serializedTags,
          dependencies: null,
          isRecurring: isRecurringBool,
          recurringRule: serializedRecurringRule,
          completedDate: null,
          updatedAt: new Date(),
          createdAt: new Date(),
        };

        const insertColumns = Object.keys(legacyTaskData).filter((columnName) =>
          legacyColumns.has(columnName),
        );
        const insertColumnSql = insertColumns
          .map((columnName) => `"${columnName}"`)
          .join(", ");
        const insertPlaceholders = insertColumns
          .map((_, i) => `$${i + 1}`)
          .join(", ");
        const insertValues = insertColumns.map(
          (columnName) => legacyTaskData[columnName],
        );

        await getSharedPrismaClient().$executeRawUnsafe(
          `
          INSERT INTO "Task" (${insertColumnSql})
          VALUES (${insertPlaceholders})
        `,
          ...insertValues,
        );

        newTask = await fetchLegacyTaskById(companyId, taskId);
      } else {
        newTask = await getSharedPrismaClient().task.create({
          data: {
            id: taskId,
            companyId,
            projectId: projectId || null,
            categoryId: categoryId || null,
            goalId: goalId || null,
            title,
            description,
            status: "PENDING",
            priority: taskPriority,
            type,
            assignedTo: finalAssignedTo,
            createdBy,
            startDate: startDateValue,
            dueDate: dueDateValue,
            estimatedHours: safeEstimatedHours,
            actualHours: 0,
            progress: computeTaskProgress({
              measurementType: normalizedMeasurementType,
              metricTargetValue: parsedMetricTargetValue,
              metricCurrentValue: parsedMetricCurrentValue,
              progress: 0,
              status: "PENDING",
            }),
            measurementType: normalizedMeasurementType,
            metricUnit: metricUnit || null,
            metricTargetValue: parsedMetricTargetValue,
            metricCurrentValue: parsedMetricCurrentValue ?? 0,
            tags: serializedTags,
            dependencies: null,
            isRecurring: isRecurringBool,
            recurringRule: serializedRecurringRule,
            updatedAt: new Date(),
          },
          include: buildTaskSummaryInclude(),
        });
      }

      if (!newTask) {
        throw new Error("Failed to load task after creation");
      }

      // حفظ المتابعين إن وجدوا
      if (watchers && Array.isArray(watchers) && watchers.length > 0) {
        for (const wUserId of watchers) {
          if (wUserId && wUserId !== finalAssignedTo) {
            await getSharedPrismaClient().taskWatcher.create({
              data: {
                taskId: newTask.id,
                userId: wUserId,
                companyId,
              },
            }).catch(() => {});
          }
        }
      }

      res.json({
        success: true,
        data: isLegacyTaskSchema ? newTask : formatTaskSummary(newTask),
        message: "تم إنشاء المهمة بنجاح",
      });

      // 🔔 ارسال اشعارات للمكلف
      if (newTask.assignedTo && newTask.assignedTo !== createdBy) {
        await taskNotificationService.notify({
          companyId,
          taskId: newTask.id,
          userId: newTask.assignedTo,
          type: "task_assigned",
          title: "مهمة جديدة مسندة إليك",
          message: `تم تكليفك بمهمة: ${newTask.title}`,
          link: `/tasks/${newTask.id}`,
          whatsappData: {
            templateName: "TASK_CREATED",
            taskTitle: newTask.title,
            variables: {
              taskId: newTask.id,
              dueDate: newTask.dueDate
                ? new Date(newTask.dueDate).toLocaleDateString("ar-EG")
                : "غير محدد",
              priority: taskNotificationHelpers.normalizePriorityLabel(newTask.priority),
              status: taskNotificationHelpers.normalizeStatusLabel(newTask.status),
            },
          },
          actorUserId: createdBy,
          logActivity: true,
          activityDescription: `تم إرسال إشعار واتساب للمسؤول عن تنفيذ المهمة: ${newTask.title}`,
        });
      }

      queueTaskWebhook("task.created", {
        companyId,
        actorUserId: createdBy,
        requestId: req.id,
        task: newTask,
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({
        success: false,
        error: "فشل في إنشاء المهمة",
      });
    }
  },

  // Get task by ID
  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = await resolveCompanyContext(req);

      if (await shouldUseLegacyTaskQueries()) {
        const task = await fetchLegacyTaskById(companyId, id);

        if (!task) {
          return res.status(404).json({
            success: false,
            error: "المهمة غير موجودة",
          });
        }

        return res.json({
          success: true,
          data: task,
        });
      }

      const task = await getSharedPrismaClient().task.findFirst({
        where: {
          id,
          companyId,
        },
        include: buildTaskSummaryInclude(),
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      res.json({
        success: true,
        data: formatTaskSummary(task),
      });
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب المهمة",
      });
    }
  },

  // Update task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        projectId,
        title,
        description,
        priority,
        type,
        assignedTo,
        dueDate,
        estimatedHours,
        actualHours,
        progress,
        tags,
        categoryId,
        startDate,
        goalId,
        measurementType,
        metricUnit,
        metricTargetValue,
        metricCurrentValue,
      } = req.body;
      const companyId = await resolveCompanyContext(req);

      // Fetch the existing task to check if assignedTo changes
      const existingTask = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
      });

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      const userRole = String(req.user?.role || "").toUpperCase();
      const isManagerOrAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(userRole);
      const currentUserId = req.user?.userId || req.user?.id;

      if (!isManagerOrAdmin && existingTask.createdBy !== currentUserId && existingTask.assignedTo !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: "ليس لديك صلاحية تعديل بيانات هذه المهمة (ليست مسندة إليك وليست من إنشائك)",
        });
      }

      // التحقق من أن المستخدم المحدد موجود في نفس الشركة (إذا تم تحديث assignedTo)
      if (assignedTo && assignedTo !== existingTask.assignedTo) {
        const assignedUser = await getSharedPrismaClient().user.findFirst({
          where: {
            id: assignedTo,
            companyId: companyId,
            isActive: true,
          },
        });

        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            error: "المستخدم المحدد غير موجود أو غير نشط في الشركة",
          });
        }
      }

      if (goalId) {
        const linkedGoal = await validateGoalLink(companyId, goalId);

        if (!linkedGoal) {
          return res.status(400).json({
            success: false,
            error: "Linked goal is invalid",
          });
        }
      }

      const nextMeasurementType =
        measurementType !== undefined
          ? normalizeMeasurementType(measurementType)
          : existingTask.measurementType;
      const nextMetricTargetValue =
        metricTargetValue !== undefined
          ? toNumberValue(metricTargetValue, null)
          : existingTask.metricTargetValue;
      const nextMetricCurrentValue =
        metricCurrentValue !== undefined
          ? toNumberValue(metricCurrentValue, 0)
          : existingTask.metricCurrentValue;
      const nextProgress = computeTaskProgress({
        measurementType: nextMeasurementType,
        metricTargetValue: nextMetricTargetValue,
        metricCurrentValue: nextMetricCurrentValue,
        progress: progress !== undefined ? progress : existingTask.progress,
        status: existingTask.status,
      });

      const updatedTask = await getSharedPrismaClient().task.updateMany({
        where: {
          id,
          companyId,
        },
        data: {
          ...(projectId !== undefined ? { projectId: projectId || null } : {}),
          ...(title && { title }),
          ...(description && { description }),
          ...(priority && { priority: normalizePriority(priority) }),
          ...(type && { type }),
          ...(assignedTo && { assignedTo }),
          ...(dueDate !== undefined
            ? { dueDate: dueDate ? new Date(dueDate) : null }
            : {}),
          ...(estimatedHours !== undefined && { estimatedHours }),
          ...(actualHours !== undefined && { actualHours }),
          ...(tags !== undefined && {
            tags: Array.isArray(tags) ? JSON.stringify(tags) : tags,
          }),
          ...(categoryId !== undefined && { categoryId: categoryId || null }),
          ...(startDate !== undefined
            ? { startDate: startDate ? new Date(startDate) : null }
            : {}),
          ...(goalId !== undefined ? { goalId: goalId || null } : {}),
          ...(measurementType !== undefined
            ? { measurementType: nextMeasurementType }
            : {}),
          ...(metricUnit !== undefined ? { metricUnit: metricUnit || null } : {}),
          ...(metricTargetValue !== undefined
            ? { metricTargetValue: nextMetricTargetValue }
            : {}),
          ...(metricCurrentValue !== undefined
            ? { metricCurrentValue: nextMetricCurrentValue }
            : {}),
          ...(req.body.isRecurring !== undefined
            ? { isRecurring: Boolean(req.body.isRecurring) }
            : {}),
          ...(req.body.recurringRule !== undefined
            ? {
                recurringRule: req.body.recurringRule
                  ? typeof req.body.recurringRule === "object"
                    ? JSON.stringify(req.body.recurringRule)
                    : String(req.body.recurringRule)
                  : null,
              }
            : {}),
          progress: nextProgress,
        },
      });

      if (updatedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      // مزامنة المتابعين في حال تم تمريرهم
      if (req.body.watchers !== undefined && Array.isArray(req.body.watchers)) {
        await getSharedPrismaClient().taskWatcher.deleteMany({
          where: { taskId: id, companyId },
        });
        for (const wUserId of req.body.watchers) {
          if (wUserId && wUserId !== (assignedTo || existingTask.assignedTo)) {
            await getSharedPrismaClient().taskWatcher.create({
              data: {
                taskId: id,
                userId: wUserId,
                companyId,
              },
            }).catch(() => {});
          }
        }
      }

      // Get updated task with relations
      const task = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
        include: buildTaskSummaryInclude(),
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      // Send notification if assignee changed
      if (
        assignedTo &&
        existingTask.assignedTo !== assignedTo &&
        assignedTo !== req.user.userId
      ) {
        await taskNotificationService.notify({
          companyId,
          taskId: task.id,
          userId: assignedTo,
          type: "task_assigned",
          title: "مهمة مسندة إليك",
          message: `تم تكليفك بمهمة: ${task.title}`,
          link: `/tasks/${task.id}`,
          whatsappData: {
            templateName: "TASK_CREATED",
            taskTitle: task.title,
            variables: {
              taskId: task.id,
              dueDate: task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("ar-EG")
                : "غير محدد",
              priority: taskNotificationHelpers.normalizePriorityLabel(task.priority),
              status: taskNotificationHelpers.normalizeStatusLabel(task.status),
            },
          },
          actorUserId: req.user.userId,
          logActivity: true,
          activityDescription: `تم إرسال إشعار واتساب للمسؤول الجديد عن المهمة: ${task.title}`,
        });
      }

      const updateChanges = buildTaskUpdateChangeSummary(existingTask, req.body);
      const assignmentChanged = Boolean(
        assignedTo && existingTask.assignedTo !== assignedTo,
      );

      if (updateChanges.length > 0) {
        await taskNotificationService.notifyTaskStakeholders({
          companyId,
          task,
          actorUserId: req.user.userId,
          type: "task_updated",
          title: "تحديث مهمة",
          message: `تم تحديث المهمة "${task.title}": ${updateChanges.join("، ")}`,
          includeAssignee: !assignmentChanged,
          includeCreator: true,
          includeWatchers: true,
          whatsappData: {
            templateName: "TASK_UPDATED",
            taskTitle: task.title,
            variables: taskNotificationHelpers.buildTaskVariables(task, {
              changes: updateChanges.join("، "),
            }),
          },
          logActivity: true,
          activityDescription: `تم إرسال إشعار تحديث المهمة: ${updateChanges.join("، ")}`,
        });
      }

      res.json({
        success: true,
        data: formatTaskSummary(task),
        message: "تم تحديث المهمة بنجاح",
      });

      queueTaskWebhook("task.updated", {
        companyId,
        actorUserId: req.user?.userId,
        requestId: req.id,
        task,
        previousTask: existingTask,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({
        success: false,
        error: "فشل في تحديث المهمة",
      });
    }
  },

  // Update task status
  updateTaskStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, progress } = req.body;
      const companyId = await resolveCompanyContext(req);

      const userRole = String(req.user?.role || "").toUpperCase();
      const isManagerOrAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(userRole);
      const currentUserId = req.user?.userId || req.user?.id;

      if (await shouldUseLegacyTaskQueries()) {
        let existingTask = null;
        if (companyId) {
          existingTask = await fetchLegacyTaskById(companyId, id);
        }

      if (!existingTask) {
        const fallbackTask = await getSharedPrismaClient().task.findUnique({
          where: { id },
        });
        if (fallbackTask) {
          const canAccess =
            isManagerOrAdmin ||
            fallbackTask.assignedTo === currentUserId ||
            fallbackTask.createdBy === currentUserId ||
            req.user?.companyId === fallbackTask.companyId;
          if (canAccess) {
            companyId = fallbackTask.companyId;
            existingTask = await fetchLegacyTaskById(companyId, id);
          }
        }
      }

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

        if (!isManagerOrAdmin && existingTask.assignedTo !== currentUserId && existingTask.createdBy !== currentUserId) {
          return res.status(403).json({
            success: false,
            error: "ليس لديك صلاحية تعديل حالة هذه المهمة (ليست موكلة إليك وليست من إنشائك)",
          });
        }

        let normalizedStatus = normalizeStatus(status);
        const isAssigneeOnly = !isManagerOrAdmin && existingTask.createdBy !== currentUserId && existingTask.assignedTo === currentUserId;

        // إذا كان المنفذ فقط يحاول إنهاء المهمة ذاتياً، يتم توجيهها لمرحلة المراجعة والاعتماد
        if (isAssigneeOnly && normalizedStatus === "COMPLETED") {
          normalizedStatus = "IN_REVIEW";
        }

        const isReopening = existingTask.status === "COMPLETED" && normalizedStatus !== "COMPLETED";
        const isSubmittingForReview = normalizedStatus === "IN_REVIEW" && existingTask.status !== "IN_REVIEW";
        const isApproving = existingTask.status === "IN_REVIEW" && normalizedStatus === "COMPLETED";
        const isReturning = existingTask.status === "IN_REVIEW" && normalizedStatus === "IN_PROGRESS";

        const nextProgress =
          normalizedStatus === "COMPLETED"
            ? 100
            : isSubmittingForReview
              ? 100
              : isReopening || isReturning
                ? (existingTask.progress === 100 ? 50 : existingTask.progress)
                : progress === undefined
                  ? existingTask.progress
                  : clampProgress(progress);
        const completedDate =
          normalizedStatus === "COMPLETED" ? new Date() : null;
        const updatedCount = await getSharedPrismaClient().$executeRawUnsafe(
          `
          UPDATE "Task"
          SET
            "status" = $1,
            "progress" = $2,
            "completedDate" = $3,
            "updatedAt" = $4
          WHERE "id" = $5
            AND "companyId" = $6
        `,
          normalizedStatus,
          nextProgress,
          completedDate,
          new Date(),
          id,
          companyId,
        );

        if (!updatedCount) {
          return res.status(404).json({
            success: false,
            error: "المهمة غير موجودة",
          });
        }

        if (["COMPLETED", "CANCELLED", "IN_REVIEW"].includes(normalizedStatus)) {
          try {
            const runningEntries = await getSharedPrismaClient().timeEntry.findMany({
              where: { taskId: id, companyId, isRunning: true },
            });
            const stopNow = new Date();
            for (const entry of runningEntries) {
              const dur = Math.max(1, Math.round((stopNow - new Date(entry.startTime)) / 60000));
              await getSharedPrismaClient().timeEntry.update({
                where: { id: entry.id },
                data: { endTime: stopNow, duration: dur, isRunning: false },
              });
            }
          } catch (e) {
            console.warn("[taskController] Failed to auto-stop running time entries on completion/review:", e?.message);
          }
        }

        const task = await fetchLegacyTaskById(companyId, id);

        if (!task) {
          return res.status(404).json({
            success: false,
            error: "المهمة غير موجودة",
          });
        }

        let successMsg = "تم تحديث حالة المهمة بنجاح";
        let notifTitle = "تحديث حالة المهمة";
        let notifMsg = `تم تغيير حالة المهمة "${task.title}" إلى ${taskNotificationHelpers.normalizeStatusLabel(normalizedStatus)}`;

        if (isSubmittingForReview) {
          successMsg = "تم تسليم المهمة بنجاح وهي الآن بانتظار مراجعة واعتماد الإدارة / المكلّف";
          notifTitle = "تسليم مهمة للمراجعة والاعتماد";
          notifMsg = `سلّم ${req.user.firstName || "الموظف"} المهمة "${task.title}" للمراجعة والاعتماد`;
        } else if (isApproving) {
          successMsg = "تم اعتماد المهمة بنجاح كـ مكتملة";
          notifTitle = "اعتماد إنجاز المهمة";
          notifMsg = `اعتمد ${req.user.firstName || "المدير"} إنجاز المهمة "${task.title}" رسمياً`;
        } else if (isReturning) {
          successMsg = "تمت إعادة المهمة للعمل مع طلب تعديلات";
          notifTitle = "طلب تعديلات على المهمة";
          notifMsg = `أعاد ${req.user.firstName || "المدير"} المهمة "${task.title}" للعمل لمراجعة الملاحظات`;
        } else if (isReopening) {
          successMsg = "تم إعادة فتح المهمة بنجاح";
          notifTitle = "إعادة فتح المهمة";
          notifMsg = `أعاد ${req.user.firstName || "مستخدم"} فتح المهمة "${task.title}"`;
        } else if (normalizedStatus === "COMPLETED") {
          successMsg = "تم إنجاز المهمة بنجاح";
          notifTitle = "إنجاز المهمة";
          notifMsg = `أنجز ${req.user.firstName || "مستخدم"} المهمة "${task.title}"`;

          // 🎯 GOAL-METRIC-ENGINE: Auto-advance goals on task completion
          if (existingTask.status !== "COMPLETED") {
            try {
              const goalMetricEngine = require("../services/goalMetricEngine");
              goalMetricEngine.recordGoalMetricEvent({
                companyId,
                userId: task.assignedTo || existingTask.assignedTo || req.user.userId || req.user.id,
                departmentId: task.departmentId || existingTask.departmentId || null,
                projectId: task.projectId || existingTask.projectId || null,
                metricKey: "TASK_COMPLETED",
                incrementValue: 1,
                metadata: { taskId: task.id || id, title: task.title },
              }).catch(err => console.warn("⚠️ [GOAL-HOOK] Task completion error:", err.message));
            } catch (goalHookErr) {
              console.warn("⚠️ [GOAL-HOOK] Task goal error:", goalHookErr.message);
            }
          }
        }

        res.json({
          success: true,
          data: task,
          message: successMsg,
        });

        await taskNotificationService.notifyTaskStakeholders({
          companyId,
          task,
          actorUserId: req.user.userId,
          type: isReopening ? "task_reopened" : "status_changed",
          title: notifTitle,
          message: notifMsg,
          includeAssignee: true,
          includeCreator: true,
          includeWatchers: true,
          whatsappData: {
            templateName: "TASK_STATUS_CHANGED",
            taskTitle: task.title,
            variables: taskNotificationHelpers.buildTaskVariables(task, {
              oldStatus: taskNotificationHelpers.normalizeStatusLabel(existingTask.status),
              newStatus: taskNotificationHelpers.normalizeStatusLabel(normalizedStatus),
            }),
          },
          logActivity: true,
          activityDescription: `تم إرسال إشعار ${notifTitle}: ${notifMsg}`,
        });

        queueTaskWebhook("task.status_changed", {
          companyId,
          actorUserId: req.user?.userId,
          requestId: req.id,
          task,
          previousTask: existingTask,
        });

        if ((normalizedStatus === "COMPLETED" || (normalizedStatus === "IN_REVIEW" && isAssigneeOnly)) && task?.isRecurring) {
          recurringTaskService.handleTaskCompletion(task, req.user?.userId).catch((err) => {
            console.error("[taskController] Failed to spawn recurring task in legacy branch:", err);
          });
        }

        return;
      }

      let existingTask = null;
      if (companyId) {
        existingTask = await getSharedPrismaClient().task.findFirst({
          where: { id, companyId },
        });
      }

      if (!existingTask) {
        const fallbackTask = await getSharedPrismaClient().task.findUnique({
          where: { id },
        });
        if (fallbackTask) {
          const canAccess =
            isManagerOrAdmin ||
            fallbackTask.assignedTo === currentUserId ||
            fallbackTask.createdBy === currentUserId ||
            req.user?.companyId === fallbackTask.companyId;
          if (canAccess) {
            companyId = fallbackTask.companyId;
            existingTask = fallbackTask;
          }
        }
      }

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      if (!isManagerOrAdmin && existingTask.assignedTo !== currentUserId && existingTask.createdBy !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: "ليس لديك صلاحية تعديل حالة هذه المهمة (ليست موكلة إليك وليست من إنشائك)",
        });
      }

      let normalizedStatus = normalizeStatus(status);
      const isAssigneeOnly = !isManagerOrAdmin && existingTask.createdBy !== currentUserId && existingTask.assignedTo === currentUserId;

      // إذا كان المنفذ فقط يحاول إنهاء المهمة ذاتياً، يتم توجيهها لمرحلة المراجعة والاعتماد
      if (isAssigneeOnly && normalizedStatus === "COMPLETED") {
        normalizedStatus = "IN_REVIEW";
      }

      const isReopening = existingTask.status === "COMPLETED" && normalizedStatus !== "COMPLETED";
      const isSubmittingForReview = normalizedStatus === "IN_REVIEW" && existingTask.status !== "IN_REVIEW";
      const isApproving = existingTask.status === "IN_REVIEW" && normalizedStatus === "COMPLETED";
      const isReturning = existingTask.status === "IN_REVIEW" && normalizedStatus === "IN_PROGRESS";

      const nextProgress =
        normalizedStatus === "COMPLETED"
          ? 100
          : isSubmittingForReview
            ? 100
            : isReopening || isReturning
              ? (existingTask.progress === 100 ? 50 : existingTask.progress)
              : progress === undefined
                ? existingTask.progress
                : clampProgress(progress);
      const completedDate = normalizedStatus === "COMPLETED" ? new Date() : null;

      const updateData = {
        status: normalizedStatus,
        progress: nextProgress,
        completedDate,
      };

      const updatedTask = await getSharedPrismaClient().task.updateMany({
        where: {
          id,
          companyId,
        },
        data: updateData,
      });

      if (updatedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      if (["COMPLETED", "CANCELLED", "IN_REVIEW"].includes(normalizedStatus)) {
        try {
          const runningEntries = await getSharedPrismaClient().timeEntry.findMany({
            where: { taskId: id, companyId, isRunning: true },
          });
          const stopNow = new Date();
          for (const entry of runningEntries) {
            const dur = Math.max(1, Math.round((stopNow - new Date(entry.startTime)) / 60000));
            await getSharedPrismaClient().timeEntry.update({
              where: { id: entry.id },
              data: { endTime: stopNow, duration: dur, isRunning: false },
            });
            await getSharedPrismaClient().task.updateMany({
              where: { id, companyId },
              data: { actualHours: { increment: Math.round(dur / 60) } },
            });
          }
        } catch (e) {
          console.warn("[taskController] Failed to auto-stop running time entries on completion/review:", e?.message);
        }
      }

      // Get updated task with relations
      const task = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
        include: buildTaskSummaryInclude(),
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      let successMsg = "تم تحديث حالة المهمة بنجاح";
      let notifTitle = "تحديث حالة المهمة";
      let notifMsg = `تم تغيير حالة المهمة "${task.title}" إلى ${taskNotificationHelpers.normalizeStatusLabel(normalizedStatus)}`;

      if (isSubmittingForReview) {
        successMsg = "تم تسليم المهمة بنجاح وهي الآن بانتظار مراجعة واعتماد الإدارة / المكلّف";
        notifTitle = "تسليم مهمة للمراجعة والاعتماد";
        notifMsg = `سلّم ${req.user.firstName || "الموظف"} المهمة "${task.title}" للمراجعة والاعتماد`;
      } else if (isApproving) {
        successMsg = "تم اعتماد المهمة بنجاح كـ مكتملة";
        notifTitle = "اعتماد إنجاز المهمة";
        notifMsg = `اعتمد ${req.user.firstName || "المدير"} إنجاز المهمة "${task.title}" رسمياً`;
      } else if (isReturning) {
        successMsg = "تمت إعادة المهمة للعمل مع طلب تعديلات";
        notifTitle = "طلب تعديلات على المهمة";
        notifMsg = `أعاد ${req.user.firstName || "المدير"} المهمة "${task.title}" للعمل لمراجعة الملاحظات`;
      } else if (isReopening) {
        successMsg = "تم إعادة فتح المهمة بنجاح";
        notifTitle = "إعادة فتح المهمة";
        notifMsg = `أعاد ${req.user.firstName || "مستخدم"} فتح المهمة "${task.title}"`;
      } else if (normalizedStatus === "COMPLETED") {
        successMsg = "تم إنجاز المهمة بنجاح";
        notifTitle = "إنجاز المهمة";
        notifMsg = `أنجز ${req.user.firstName || "مستخدم"} المهمة "${task.title}"`;

        // 🎯 GOAL-METRIC-ENGINE: Auto-advance goals on task completion
        if (existingTask.status !== "COMPLETED") {
          try {
            const goalMetricEngine = require("../services/goalMetricEngine");
            goalMetricEngine.recordGoalMetricEvent({
              companyId,
              userId: task.assignedTo || existingTask.assignedTo || req.user.userId || req.user.id,
              departmentId: task.departmentId || existingTask.departmentId || null,
              projectId: task.projectId || existingTask.projectId || null,
              metricKey: "TASK_COMPLETED",
              incrementValue: 1,
              metadata: { taskId: task.id || id, title: task.title },
            }).catch(err => console.warn("⚠️ [GOAL-HOOK] Fallback task completion error:", err.message));
          } catch (goalHookErr) {
            console.warn("⚠️ [GOAL-HOOK] Fallback task goal error:", goalHookErr.message);
          }
        }
      }

      res.json({
        success: true,
        data: formatTaskSummary(task),
        message: successMsg,
      });

      // 🔔 ارسال اشعارات بتغيير الحالة للمسؤول والمراقبين
      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task,
        actorUserId: req.user.userId,
        type: isReopening ? "task_reopened" : "status_changed",
        title: notifTitle,
        message: notifMsg,
        includeAssignee: true,
        includeCreator: true,
        includeWatchers: true,
        whatsappData: {
          templateName: "TASK_STATUS_CHANGED",
          taskTitle: task.title,
          variables: taskNotificationHelpers.buildTaskVariables(task, {
            oldStatus: taskNotificationHelpers.normalizeStatusLabel(existingTask.status),
            newStatus: taskNotificationHelpers.normalizeStatusLabel(normalizedStatus),
          }),
        },
        logActivity: true,
        activityDescription: `تم إرسال إشعار ${notifTitle}: ${notifMsg}`,
      });

      queueTaskWebhook("task.status_changed", {
        companyId,
        actorUserId: req.user?.userId,
        requestId: req.id,
        task,
        previousTask: existingTask,
      });

      if ((normalizedStatus === "COMPLETED" || (normalizedStatus === "IN_REVIEW" && isAssigneeOnly)) && task?.isRecurring) {
        recurringTaskService.handleTaskCompletion(task, req.user?.userId).catch((err) => {
          console.error("[taskController] Failed to spawn recurring task:", err);
        });
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({
        success: false,
        error: "فشل في تحديث حالة المهمة",
      });
    }
  },

  askTaskExecution: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      const actorUserId = req.user.userId;
      const { reason = "manual" } = req.body || {};

      const result = await taskNotificationService.askTaskExecution({
        companyId,
        taskId: id,
        actorUserId,
        reason,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error:
            result.reason === "task_or_assignee_missing"
              ? "المهمة غير موجودة أو لا يوجد مسؤول تنفيذ نشط"
              : "فشل في إرسال سؤال متابعة التنفيذ",
        });
      }

      res.json({
        success: true,
        data: result,
        message: "تم إرسال سؤال متابعة التنفيذ عبر واتساب",
      });
    } catch (error) {
      console.error("Error asking task execution:", error);
      res.status(500).json({
        success: false,
        error: "فشل في إرسال سؤال متابعة التنفيذ",
      });
    }
  },

  // Delete task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = await resolveCompanyContext(req);

      const existingTask = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
      });

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      const currentUserId = req.user?.userId || req.user?.id;
      const isManagerOrAdmin = [
        "SUPER_ADMIN",
        "COMPANY_ADMIN",
        "OWNER",
        "MANAGER",
      ].includes(req.user?.role);

      if (!isManagerOrAdmin && existingTask.createdBy !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: "ليس لديك صلاحية حذف هذه المهمة (ليست من إنشائك ولست مديراً)",
        });
      }

      const deletionRecipients = await taskNotificationService.getTaskStakeholderIds(
        existingTask,
        {
          companyId,
          actorUserId: req.user?.userId || req.user?.id,
          includeAssignee: true,
          includeCreator: true,
          includeWatchers: true,
        },
      );

      const deletedTask = await getSharedPrismaClient().task.deleteMany({
        where: {
          id,
          companyId,
        },
      });

      if (deletedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: "المهمة غير موجودة",
        });
      }

      if (deletionRecipients.length > 0) {
        await taskNotificationService.notifyMany(deletionRecipients, {
          companyId,
          taskId: existingTask.id,
          type: "task_deleted",
          title: "تم حذف مهمة",
          message: `تم حذف المهمة "${existingTask.title}"`,
          link: "/tasks",
          whatsappData: {
            templateName: "TASK_DELETED",
            taskTitle: existingTask.title,
            variables: taskNotificationHelpers.buildTaskVariables(existingTask),
          },
          actorUserId: req.user.userId,
          logActivity: false,
        });
      }

      res.json({
        success: true,
        message: "تم حذف المهمة بنجاح",
      });

      queueTaskWebhook("task.deleted", {
        companyId,
        actorUserId: req.user?.userId,
        requestId: req.id,
        task: existingTask,
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({
        success: false,
        error: "فشل في حذف المهمة",
      });
    }
  },

  // Get my tasks (tasks assigned to current user)
  getMyTasks: async (req, res) => {
    try {
      const {
        projectId,
        status,
        priority,
        search,
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const parsedPage = Math.max(1, parseInt(page));
      const parsedLimit = Math.max(1, parseInt(limit));
      const skip = (parsedPage - 1) * parsedLimit;
      const companyId = await resolveCompanyContext(req);
      const userId = req.user?.userId || req.user?.id;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "معرف الشركة مطلوب",
        });
      }

      if (await shouldUseLegacyTaskQueries()) {
        const result = await fetchLegacyTaskSummaries({
          companyId,
          projectId,
          status,
          priority,
          assignedTo: userId,
          search,
          page: parsedPage,
          limit: parsedLimit,
          sortBy,
          sortOrder,
        });

        return res.json({
          success: true,
          data: result.tasks,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.ceil(result.total / result.limit),
          },
        });
      }

      // Build filter conditions — include tasks assigned to user OR where user is a watcher
      const where = {
        companyId,
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority }),
      };

      if (userId) {
        where.OR = [
          { assignedTo: userId },
          { taskWatchers: { some: { userId } } },
        ];
      }

      // Get tasks with project and user information
      const [tasks, totalTasks] = await Promise.all([
        getSharedPrismaClient().task.findMany({
          where,
          include: buildTaskSummaryInclude(),
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: parsedLimit,
        }),
        getSharedPrismaClient().task.count({ where }),
      ]);

      // Format response
      const formattedTasks = tasks.map(formatTaskSummary);


      res.json({
        success: true,
        data: formattedTasks,
        pagination: {
          total: totalTasks,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalTasks / parsedLimit),
        },
      });
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب المهام",
      });
    }
  },

  // Get tasks assigned by me (tasks created by current user)
  getTasksAssignedByMe: async (req, res) => {
    try {
      const {
        projectId,
        status,
        priority,
        assignedTo,
        search,
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const parsedPage = Math.max(1, parseInt(page));
      const parsedLimit = Math.max(1, parseInt(limit));
      const skip = (parsedPage - 1) * parsedLimit;
      const companyId = await resolveCompanyContext(req);
      const userId = req.user?.userId || req.user?.id;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "معرف الشركة مطلوب",
        });
      }

      if (await shouldUseLegacyTaskQueries()) {
        const result = await fetchLegacyTaskSummaries({
          companyId,
          projectId,
          status,
          priority,
          assignedTo,
          createdBy: userId,
          search,
          page: parsedPage,
          limit: parsedLimit,
          sortBy,
          sortOrder,
        });

        return res.json({
          success: true,
          data: result.tasks,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.ceil(result.total / result.limit),
          },
        });
      }

      // Build filter conditions
      const where = {
        companyId,
        createdBy: userId,
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedTo && { assignedTo }),
      };

      // Get tasks with project and user information
      const [tasks, totalTasks] = await Promise.all([
        getSharedPrismaClient().task.findMany({
          where,
          include: buildTaskSummaryInclude(),
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: parsedLimit,
        }),
        getSharedPrismaClient().task.count({ where }),
      ]);

      // Format response
      const formattedTasks = tasks.map(formatTaskSummary);

      res.json({
        success: true,
        data: formattedTasks,
        pagination: {
          total: totalTasks,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(totalTasks / parsedLimit),
        },
      });
    } catch (error) {
      console.error("Error fetching tasks assigned by me:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب المهام",
      });
    }
  },

  // Get company users (for task assignment)
  getCompanyUsers: async (req, res) => {
    try {
      const companyId = await resolveCompanyContext(req);

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "معرف الشركة مطلوب",
        });
      }

      // Get all active users in the company
      const users = await getSharedPrismaClient().user.findMany({
        where: {
          companyId: companyId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          phone: true,
        },
        orderBy: [
          { role: "asc" }, // COMPANY_ADMIN first
          { firstName: "asc" },
        ],
      });

      // Format response
      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
      }));

      res.json({
        success: true,
        data: formattedUsers,
      });
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب المستخدمين",
      });
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const companyId = await resolveCompanyContext(req);
      const userId = req.user?.userId || req.user?.id;
      const prisma = getSharedPrismaClient();

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "معرف الشركة مطلوب",
        });
      }

      const now = new Date();

      const [
        taskStatusCounts,
        myTaskStatusCounts,
        taskPriorityCounts,
        overdueTasks,
        myOverdueTasks,
        projectStatusCounts,
        projectAggregates,
        recentTasks,
      ] = await Promise.all([
        prisma.task.groupBy({
          by: ["status"],
          where: { companyId },
          _count: { _all: true },
        }),
        prisma.task.groupBy({
          by: ["status"],
          where: { companyId, assignedTo: userId },
          _count: { _all: true },
        }),
        prisma.task.groupBy({
          by: ["priority"],
          where: { companyId },
          _count: { _all: true },
        }),
        prisma.task.count({
          where: {
            companyId,
            dueDate: { lt: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        prisma.task.count({
          where: {
            companyId,
            assignedTo: userId,
            dueDate: { lt: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        prisma.project.groupBy({
          by: ["status"],
          where: { companyId },
          _count: { _all: true },
        }),
        prisma.project.aggregate({
          where: { companyId },
          _avg: { progress: true },
          _sum: { budget: true, spentBudget: true },
        }),
        prisma.task.findMany({
          where: { companyId },
          include: {
            project: { select: { name: true } },
            assignee: { select: { firstName: true, lastName: true } },
            creator: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      const statusCountMap = taskStatusCounts.reduce((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {});

      const myStatusCountMap = myTaskStatusCounts.reduce((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {});

      const priorityCountMap = taskPriorityCounts.reduce((acc, row) => {
        acc[row.priority] = row._count._all;
        return acc;
      }, {});

      const tasksByStatus = {
        pending: statusCountMap.PENDING || 0,
        inProgress: statusCountMap.IN_PROGRESS || 0,
        inReview: statusCountMap.IN_REVIEW || 0,
        completed: statusCountMap.COMPLETED || 0,
        cancelled: statusCountMap.CANCELLED || 0,
      };

      const myTasksByStatus = {
        pending: myStatusCountMap.PENDING || 0,
        inProgress: myStatusCountMap.IN_PROGRESS || 0,
        inReview: myStatusCountMap.IN_REVIEW || 0,
        completed: myStatusCountMap.COMPLETED || 0,
        cancelled: myStatusCountMap.CANCELLED || 0,
      };

      const tasksByPriority = {
        urgent: priorityCountMap.URGENT || 0,
        high: priorityCountMap.HIGH || 0,
        medium: priorityCountMap.MEDIUM || 0,
        low: priorityCountMap.LOW || 0,
      };

      const totalTasks = Object.values(tasksByStatus).reduce(
        (sum, value) => sum + value,
        0,
      );
      const totalMyTasks = Object.values(myTasksByStatus).reduce(
        (sum, value) => sum + value,
        0,
      );

      const stats = {
        totalTasks,
        myTasks: totalMyTasks,
        tasksByStatus,
        myTasksByStatus,
        tasksByPriority,
        overdueTasks,
        myOverdueTasks,
        completionRate:
          totalTasks > 0
            ? Math.round((tasksByStatus.completed / totalTasks) * 100)
            : 0,
        myCompletionRate:
          totalMyTasks > 0
            ? Math.round((myTasksByStatus.completed / totalMyTasks) * 100)
            : 0,
      };

      const projectStatusMap = projectStatusCounts.reduce((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {});

      const totalProjects = Object.values(projectStatusMap).reduce(
        (sum, value) => sum + value,
        0,
      );

      const projectStats = {
        totalProjects,
        activeProjects: projectStatusMap.ACTIVE || 0,
        completedProjects: projectStatusMap.COMPLETED || 0,
        planningProjects: projectStatusMap.PLANNING || 0,
        onHoldProjects: projectStatusMap.ON_HOLD || 0,
        averageProgress:
          totalProjects > 0
            ? Math.round(projectAggregates._avg.progress || 0)
            : 0,
        totalBudget: projectAggregates._sum.budget || 0,
        totalSpent: projectAggregates._sum.spentBudget || 0,
      };

      res.json({
        success: true,
        data: {
          tasks: stats,
          projects: projectStats,
          recentTasks: recentTasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            projectName: task.project?.name || "بدون مشروع",
            assignedToName: task.assignee
              ? `${task.assignee.firstName} ${task.assignee.lastName}`
              : "غير محدد",
            createdAt: task.createdAt,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب الإحصائيات",
      });
    }
  },

  // ==================== المهام الفرعية (Subtasks) ====================

  createSubtask: async (req, res) => {
    try {
      const { parentTaskId } = req.params;
      const {
        title,
        description,
        priority,
        assignedTo,
        dueDate,
        estimatedHours,
      } = req.body;
      const companyId = req.user.companyId;
      const createdBy = req.user.userId;

      const parentTask = await getSharedPrismaClient().task.findFirst({
        where: { id: parentTaskId, companyId },
      });

      if (!parentTask) {
        return res
          .status(404)
          .json({ success: false, error: "المهمة الأب غير موجودة" });
      }

      const subtask = await getSharedPrismaClient().task.create({
        data: {
          id: uuidv4(),
          companyId,
          projectId: parentTask.projectId,
          parentTaskId,
          title,
          description: description || "",
          status: "PENDING",
          priority: normalizePriority(priority),
          type: "general",
          assignedTo: assignedTo || createdBy,
          createdBy,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours: estimatedHours || 0,
          actualHours: 0,
          progress: 0,
          tags: null,
          dependencies: null,
          updatedAt: new Date(),
        },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      });

      await getSharedPrismaClient().taskActivity.create({
        data: {
          taskId: parentTaskId,
          userId: createdBy,
          action: "subtask_created",
          description: `تم إنشاء مهمة فرعية: ${title}`,
          companyId,
        },
      });

      res.json({
        success: true,
        data: subtask,
        message: "تم إنشاء المهمة الفرعية بنجاح",
      });

      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task: parentTask,
        actorUserId: createdBy,
        type: "subtask_created",
        title: "مهمة فرعية جديدة",
        message: `تم إنشاء مهمة فرعية "${title}" ضمن المهمة "${parentTask.title}"`,
        includeAssignee: true,
        includeCreator: true,
        includeWatchers: true,
        excludeUserIds: [createdBy],
        whatsappData: {
          templateName: "TASK_SUBTASK_CREATED",
          taskTitle: parentTask.title,
          variables: taskNotificationHelpers.buildTaskVariables(parentTask, {
            parentTaskTitle: parentTask.title,
            subtaskTitle: title,
          }),
        },
        logActivity: true,
        activityDescription: `تم إرسال إشعار مهمة فرعية جديدة: ${title}`,
      });
    } catch (error) {
      console.error("Error creating subtask:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في إنشاء المهمة الفرعية" });
    }
  },

  getSubtasks: async (req, res) => {
    try {
      const { parentTaskId } = req.params;
      const companyId = req.user.companyId;

      const subtasks = await getSharedPrismaClient().task.findMany({
        where: { parentTaskId, companyId },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
        orderBy: { order: "asc" },
      });

      res.json({ success: true, data: subtasks });
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في جلب المهام الفرعية" });
    }
  },

  // ==================== التعليقات (Comments) ====================

  addComment: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { content, parentCommentId, mentions } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
      });
      if (!task) {
        return res
          .status(404)
          .json({ success: false, error: "المهمة غير موجودة" });
      }

      const comment = await getSharedPrismaClient().taskComment.create({
        data: {
          taskId,
          userId,
          content,
          parentCommentId: parentCommentId || null,
          mentions: mentions || [],
          companyId,
        },
        include: {
          users: { select: { firstName: true, lastName: true, avatar: true } },
          replies: {
            include: {
              users: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
      });

      await getSharedPrismaClient().taskActivity.create({
        data: {
          taskId,
          userId,
          action: "commented",
          description: "تم إضافة تعليق",
          companyId,
        },
      });

      const mentionedUserIds = Array.isArray(mentions)
        ? mentions
        : parseStringArray(mentions);

      res.json({
        success: true,
        data: comment,
        message: "تم إضافة التعليق بنجاح",
      });

      // 🔔 ارسال اشعارات للمتابعين أو المسند إليهم والمذكورين (باستثناء صاحب التعليق)
      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task,
        actorUserId: userId,
        type: "comment_added",
        title: "تعليق جديد على مهمة",
        message: `${req.user.firstName}: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
        includeAssignee: true,
        includeCreator: true,
        includeWatchers: true,
        additionalUserIds: mentionedUserIds,
        whatsappData: {
          templateName: "TASK_COMMENTED",
          taskTitle: task.title,
          variables: taskNotificationHelpers.buildTaskVariables(task, {
            commentAuthor: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "مستخدم",
            commentExcerpt: content.substring(0, 100),
          }),
        },
        logActivity: true,
        activityDescription: "تم إرسال إشعار تعليق جديد على المهمة",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ success: false, error: "فشل في إضافة التعليق" });
    }
  },

  getComments: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const comments = await getSharedPrismaClient().taskComment.findMany({
        where: { taskId, companyId, parentCommentId: null },
        include: {
          users: { select: { firstName: true, lastName: true, avatar: true } },
          replies: {
            include: {
              users: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: comments });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ success: false, error: "فشل في جلب التعليقات" });
    }
  },

  updateComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const comment = await getSharedPrismaClient().taskComment.findFirst({
        where: { id: commentId, companyId, userId },
      });
      if (!comment) {
        return res
          .status(404)
          .json({
            success: false,
            error: "التعليق غير موجود أو ليس لديك صلاحية تعديله",
          });
      }

      const updatedComment = await getSharedPrismaClient().taskComment.update({
        where: { id: commentId },
        data: { content, isEdited: true, editedAt: new Date() },
        include: {
          users: { select: { firstName: true, lastName: true, avatar: true } },
        },
      });

      res.json({
        success: true,
        data: updatedComment,
        message: "تم تعديل التعليق بنجاح",
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ success: false, error: "فشل في تعديل التعليق" });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const comment = await getSharedPrismaClient().taskComment.findFirst({
        where: { id: commentId, companyId, userId },
      });
      if (!comment) {
        return res
          .status(404)
          .json({
            success: false,
            error: "التعليق غير موجود أو ليس لديك صلاحية حذفه",
          });
      }

      await getSharedPrismaClient().taskComment.delete({
        where: { id: commentId },
      });
      res.json({ success: true, message: "تم حذف التعليق بنجاح" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ success: false, error: "فشل في حذف التعليق" });
    }
  },

  // ==================== تتبع الوقت (Time Tracking) ====================

  startTimeTracking: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { description, isBillable, hourlyRate } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId || req.user.id;

      const userRole = String(req.user?.role || "").toUpperCase();
      const isManagerOrAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(userRole);

      const targetTask = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
        select: { id: true, title: true, assignedTo: true, createdBy: true },
      });
      if (!targetTask) {
        return res.status(404).json({ success: false, error: "المهمة غير موجودة" });
      }

      if (!isManagerOrAdmin && targetTask.assignedTo !== userId) {
        return res.status(403).json({
          success: false,
          error: "لا يمكنك بدء تتبع الوقت على مهمة غير موكلة إليك",
        });
      }

      const { stopOthers } = req.body;
      const existingTaskEntry = await getSharedPrismaClient().timeEntry.findFirst({
        where: { userId, companyId, taskId, isRunning: true },
        include: { task: { select: { title: true } } },
      });
      if (existingTaskEntry) {
        return res.json({
          success: true,
          data: existingTaskEntry,
          message: "المؤقت يعمل بالفعل لهذه المهمة",
        });
      }

      if (stopOthers === true) {
        const otherRunningEntries = await getSharedPrismaClient().timeEntry.findMany({
          where: { userId, companyId, isRunning: true },
        });
        const stopNow = new Date();
        for (const runningEntry of otherRunningEntries) {
          const dur = Math.max(1, Math.round((stopNow - new Date(runningEntry.startTime)) / 60000));
          await getSharedPrismaClient().timeEntry.update({
            where: { id: runningEntry.id },
            data: { endTime: stopNow, duration: dur, isRunning: false },
          });
        }
      }

      const timeEntry = await getSharedPrismaClient().timeEntry.create({
        data: {
          taskId,
          userId,
          startTime: new Date(),
          description: description || "",
          isBillable: isBillable || false,
          hourlyRate: hourlyRate || null,
          isRunning: true,
          companyId,
        },
        include: { task: { select: { title: true } } },
      });

      res.json({
        success: true,
        data: timeEntry,
        message: "تم بدء تتبع الوقت",
      });

      const taskForNotif = timeEntry.task || await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
        select: { id: true, title: true, assignedTo: true, createdBy: true },
      });

      if (taskForNotif) {
        await taskNotificationService.notifyTaskStakeholders({
          companyId,
          task: taskForNotif,
          actorUserId: userId,
          type: "time_entry_added",
          title: "بدء تتبع وقت",
          message: `بدأ ${req.user.firstName || "مستخدم"} تتبع الوقت على المهمة "${taskForNotif.title}"`,
          includeAssignee: true,
          includeCreator: true,
          includeWatchers: true,
          excludeUserIds: [userId],
          whatsappData: {
            templateName: "TASK_TIME_ENTRY_ADDED",
            taskTitle: taskForNotif.title,
            variables: taskNotificationHelpers.buildTaskVariables(taskForNotif, {
              entryType: "بدء تتبع",
              duration: "جاري...",
            }),
          },
          logActivity: true,
          activityDescription: "تم إرسال إشعار بدء تتبع الوقت",
        });
      }
    } catch (error) {
      console.error("Error starting time tracking:", error);
      res.status(500).json({ success: false, error: "فشل في بدء تتبع الوقت" });
    }
  },

  stopTimeTracking: async (req, res) => {
    try {
      const { entryId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId || req.user.id;

      const timeEntry = await getSharedPrismaClient().timeEntry.findFirst({
        where: { id: entryId, userId, companyId, isRunning: true },
      });
      if (!timeEntry) {
        return res
          .status(404)
          .json({
            success: false,
            error: "سجل الوقت غير موجود أو متوقف بالفعل",
          });
      }

      const endTime = new Date();
      const duration = Math.round((endTime - timeEntry.startTime) / 60000);

      const updatedEntry = await getSharedPrismaClient().timeEntry.update({
        where: { id: entryId },
        data: { endTime, duration, isRunning: false },
        include: { task: { select: { title: true } } },
      });

      await getSharedPrismaClient().task.update({
        where: { id: timeEntry.taskId },
        data: { actualHours: { increment: Math.round(duration / 60) } },
      });

      // 🎯 GOAL-METRIC-ENGINE: Auto-advance hours goal on timer stop
      try {
        const hoursLogged = Math.round((duration / 60) * 100) / 100;
        if (hoursLogged > 0) {
          const goalMetricEngine = require("../services/goalMetricEngine");
          goalMetricEngine
            .recordGoalMetricEvent({
              companyId,
              userId,
              metricKey: "TASK_STOPWATCH_HOURS",
              incrementValue: hoursLogged,
              metadata: { taskId: timeEntry.taskId, durationMinutes: duration },
            })
            .catch((err) =>
              console.warn("⚠️ [GOAL-HOOK] Timer hours error:", err.message)
            );
        }
      } catch (timerGoalErr) {
        console.warn("⚠️ [GOAL-HOOK] Timer goal error:", timerGoalErr.message);
      }

      res.json({
        success: true,
        data: updatedEntry,
        message: `تم إيقاف تتبع الوقت. المدة: ${duration} دقيقة`,
      });

      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task: timeEntry.task ? { id: timeEntry.taskId, title: timeEntry.task.title, assignedTo: timeEntry.userId, companyId } : { id: timeEntry.taskId, companyId },
        actorUserId: userId,
        type: "time_entry_added",
        title: "إيقاف تتبع وقت",
        message: `أوقف ${req.user.firstName || "مستخدم"} تتبع الوقت على المهمة. المدة: ${duration} دقيقة`,
        includeAssignee: true,
        includeCreator: true,
        includeWatchers: true,
        excludeUserIds: [userId],
        whatsappData: {
          templateName: "TASK_TIME_ENTRY_ADDED",
          taskTitle: timeEntry.task?.title || "المهمة",
          variables: taskNotificationHelpers.buildTaskVariables({
            id: timeEntry.taskId,
            title: timeEntry.task?.title || "المهمة",
          }, {
            entryType: "إيقاف تتبع",
            duration: `${duration} دقيقة`,
          }),
        },
        logActivity: true,
        activityDescription: `تم إرسال إشعار إيقاف تتبع الوقت: ${duration} دقيقة`,
      });
    } catch (error) {
      console.error("Error stopping time tracking:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في إيقاف تتبع الوقت" });
    }
  },

  addManualTimeEntry: async (req, res) => {
    try {
      const { taskId } = req.params;
      const {
        startTime,
        endTime,
        duration,
        description,
        isBillable,
        hourlyRate,
      } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const calculatedDuration =
        duration ||
        Math.round((new Date(endTime) - new Date(startTime)) / 60000);

      const timeEntry = await getSharedPrismaClient().timeEntry.create({
        data: {
          taskId,
          userId,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          duration: calculatedDuration,
          description: description || "",
          isBillable: isBillable || false,
          hourlyRate: hourlyRate || null,
          isRunning: false,
          companyId,
        },
        include: { task: { select: { title: true } } },
      });

      await getSharedPrismaClient().task.update({
        where: { id: taskId },
        data: {
          actualHours: { increment: Math.round(calculatedDuration / 60) },
        },
      });

      res.json({
        success: true,
        data: timeEntry,
        message: "تم إضافة سجل الوقت بنجاح",
      });

      const taskForTimeEntry = timeEntry.task || await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
        select: { id: true, title: true, assignedTo: true, createdBy: true },
      });

      if (taskForTimeEntry) {
        await taskNotificationService.notifyTaskStakeholders({
          companyId,
          task: taskForTimeEntry,
          actorUserId: userId,
          type: "time_entry_added",
          title: "تسجيل وقت يدوي",
          message: `تم تسجيل ${calculatedDuration} دقيقة على المهمة "${taskForTimeEntry.title}"`,
          includeAssignee: true,
          includeCreator: true,
          includeWatchers: true,
          excludeUserIds: [userId],
          whatsappData: {
            templateName: "TASK_TIME_ENTRY_ADDED",
            taskTitle: taskForTimeEntry.title,
            variables: taskNotificationHelpers.buildTaskVariables(taskForTimeEntry, {
              entryType: "تسجيل يدوي",
              duration: `${calculatedDuration} دقيقة`,
            }),
          },
          logActivity: true,
          activityDescription: `تم إرسال إشعار تسجيل وقت: ${calculatedDuration} دقيقة`,
        });
      }
    } catch (error) {
      console.error("Error adding manual time entry:", error);
      res.status(500).json({ success: false, error: "فشل في إضافة سجل الوقت" });
    }
  },

  getTimeEntries: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const timeEntries = await getSharedPrismaClient().timeEntry.findMany({
        where: { taskId, companyId },
        include: { users: { select: { firstName: true, lastName: true } } },
        orderBy: { startTime: "desc" },
      });

      const totalMinutes = timeEntries.reduce(
        (sum, entry) => sum + entry.duration,
        0,
      );

      res.json({
        success: true,
        data: {
          entries: timeEntries,
          totalMinutes,
          totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        },
      });
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ success: false, error: "فشل في جلب سجلات الوقت" });
    }
  },

  getCompanyTimeEntries: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { startDate, endDate, userId, projectId } = req.query;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          error: "معرف الشركة مطلوب",
        });
      }

      const where = {
        companyId,
        ...(userId && { userId }),
      };

      if (startDate || endDate) {
        where.startTime = {};

        if (startDate) {
          where.startTime.gte = new Date(`${startDate}T00:00:00.000Z`);
        }

        if (endDate) {
          where.startTime.lte = new Date(`${endDate}T23:59:59.999Z`);
        }
      }

      if (projectId) {
        where.task = {
          projectId,
        };
      }

      const timeEntries = await getSharedPrismaClient().timeEntry.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
      });

      const normalizedEntries = timeEntries.map((entry) => ({
        id: entry.id,
        taskId: entry.taskId,
        taskTitle: entry.task?.title || "مهمة بدون عنوان",
        projectId: entry.task?.project?.id || null,
        projectName: entry.task?.project?.name || "بدون مشروع",
        userId: entry.userId,
        userName: entry.user
          ? `${entry.user.firstName || ""} ${entry.user.lastName || ""}`.trim()
          : "مستخدم غير معروف",
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration || 0,
        description: entry.description || "",
        createdAt: entry.createdAt,
      }));

      res.json({
        success: true,
        data: normalizedEntries,
      });
    } catch (error) {
      console.error("Error fetching company time entries:", error);
      res.status(500).json({ success: false, error: "فشل في جلب تقرير الوقت" });
    }
  },

  getRunningTimer: async (req, res) => {
    try {
      const companyId = await resolveCompanyContext(req);
      const userId = req.user.userId || req.user.id;

      const runningEntries = await getSharedPrismaClient().timeEntry.findMany({
        where: { userId, companyId, isRunning: true },
        include: { task: { select: { id: true, title: true, status: true, priority: true } } },
        orderBy: { startTime: 'desc' },
      });

      const validRunning = [];
      const stopNow = new Date();
      for (const entry of runningEntries) {
        const taskStatus = String(entry.task?.status || "").toUpperCase();
        if (["COMPLETED", "CANCELLED"].includes(taskStatus)) {
          const dur = Math.max(1, Math.round((stopNow - new Date(entry.startTime)) / 60000));
          await getSharedPrismaClient().timeEntry.update({
            where: { id: entry.id },
            data: { endTime: stopNow, duration: dur, isRunning: false },
          });
        } else {
          validRunning.push(entry);
        }
      }

      const primaryRunning = validRunning[0] || null;
      res.json({
        success: true,
        data: primaryRunning,
        runningTimer: primaryRunning,
        runningTimers: validRunning,
      });
    } catch (error) {
      console.error("Error fetching running timer:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في جلب المؤقت الجاري" });
    }
  },

  getCompanyActiveTimers: async (req, res) => {
    try {
      const companyId = await resolveCompanyContext(req);
      const userRole = String(req.user?.role || "").toUpperCase();
      const isAdminOrManager = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER", "HR_MANAGER"].includes(userRole);

      if (!isAdminOrManager) {
        return res.status(403).json({
          success: false,
          error: "غير مصرح: استعراض مؤقتات الفريق المباشرة متاح للمدراء فقط",
        });
      }

      const activeEntries = await getSharedPrismaClient().timeEntry.findMany({
        where: {
          companyId,
          isRunning: true,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
              assignedTo: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              employees: {
                select: {
                  id: true,
                  position: { select: { title: true } },
                  department: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { startTime: "desc" },
      });

      const validActive = [];
      const cleanupIds = [];

      for (const entry of activeEntries) {
        const taskStatus = String(entry.task?.status || "").toUpperCase();
        if (["COMPLETED", "CANCELLED"].includes(taskStatus)) {
          cleanupIds.push(entry.id);
        } else {
          const now = Date.now();
          const startMs = new Date(entry.startTime).getTime();
          const elapsedSeconds = !isNaN(startMs) && now > startMs ? Math.floor((now - startMs) / 1000) : 0;
          const fullName = [entry.user?.firstName, entry.user?.lastName].filter(Boolean).join(" ").trim() || entry.user?.email || "عضو الفريق";

          validActive.push({
            id: entry.id,
            taskId: entry.taskId,
            taskTitle: entry.task?.title || "مهمة قيد العمل",
            priority: entry.task?.priority || "MEDIUM",
            taskStatus: entry.task?.status || "IN_PROGRESS",
            projectId: entry.task?.project?.id || null,
            projectName: entry.task?.project?.name || null,
            userId: entry.userId,
            userName: fullName,
            userAvatar: entry.user?.avatar || null,
            userJobTitle: entry.user?.employees?.position?.title || entry.user?.employeeRel?.position?.title || "موظف",
            userDepartment: entry.user?.employees?.department?.name || entry.user?.employeeRel?.department?.name || "فريق العمل",
            startTime: entry.startTime,
            elapsedSeconds,
          });
        }
      }

      if (cleanupIds.length > 0) {
        const stopNow = new Date();
        getSharedPrismaClient().timeEntry.updateMany({
          where: { id: { in: cleanupIds } },
          data: { endTime: stopNow, isRunning: false },
        }).catch((err) => console.warn("[taskController] Auto cleanup stopped timers error:", err.message));
      }

      res.json({
        success: true,
        count: validActive.length,
        data: validActive,
      });
    } catch (error) {
      console.error("Error fetching company active timers:", error);
      res.status(500).json({ success: false, error: "فشل في جلب مؤقتات المهام المباشرة للفريق" });
    }
  },

  // ==================== سجل النشاطات (Activity Log) ====================

  getTaskActivities: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const activities = await getSharedPrismaClient().taskActivity.findMany({
        where: { taskId, companyId },
        include: {
          users: { select: { firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({ success: true, data: activities });
    } catch (error) {
      console.error("Error fetching task activities:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في جلب سجل النشاطات" });
    }
  },

  // ==================== المتابعون (Watchers) ====================

  addWatcher: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { userId: watcherUserId } = req.body;
      const companyId = req.user.companyId;

      const watcher = await getSharedPrismaClient().taskWatcher.create({
        data: { taskId, userId: watcherUserId, companyId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });

      res.json({
        success: true,
        data: watcher,
        message: "تم إضافة المتابع بنجاح",
      });

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
      });

      if (task) {
        await taskNotificationService.notify({
          companyId,
          taskId,
          userId: watcherUserId,
          type: "watcher_added",
          title: "تمت إضافتك كمراقب على مهمة",
          message: `تمت إضافتك كمراقب على المهمة "${task.title}"`,
          link: `/tasks/${taskId}`,
          whatsappData: {
            templateName: "TASK_WATCHER_ADDED",
            taskTitle: task.title,
            variables: taskNotificationHelpers.buildTaskVariables(task),
          },
          actorUserId: req.user.userId,
          logActivity: true,
          activityDescription: `تم إرسال إشعار إضافة مراقب على المهمة: ${task.title}`,
        });
      }
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(400)
          .json({ success: false, error: "المستخدم يتابع هذه المهمة بالفعل" });
      }
      console.error("Error adding watcher:", error);
      res.status(500).json({ success: false, error: "فشل في إضافة المتابع" });
    }
  },

  removeWatcher: async (req, res) => {
    try {
      const { taskId, watcherUserId } = req.params;
      const companyId = req.user.companyId;

      await getSharedPrismaClient().taskWatcher.deleteMany({
        where: { taskId, userId: watcherUserId, companyId },
      });
      res.json({ success: true, message: "تم إزالة المتابع بنجاح" });
    } catch (error) {
      console.error("Error removing watcher:", error);
      res.status(500).json({ success: false, error: "فشل في إزالة المتابع" });
    }
  },

  getWatchers: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const watchers = await getSharedPrismaClient().taskWatcher.findMany({
        where: { taskId, companyId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
          },
        },
      });

      res.json({ success: true, data: watchers.map((w) => w.user).filter(Boolean) });
    } catch (error) {
      console.error("Error fetching watchers:", error);
      res.status(500).json({ success: false, error: "فشل في جلب المتابعين" });
    }
  },

  // ==================== الإشعارات (Notifications) ====================

  getNotifications: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.userId;
      const { unreadOnly, includeWhatsapp } = req.query;

      const where = { userId, companyId };
      if (unreadOnly === "true") where.isRead = false;

      const notifications =
        await getSharedPrismaClient().taskNotification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
        });

      const unreadCount = await getSharedPrismaClient().taskNotification.count({
        where: { userId, companyId, isRead: false },
      });

      let enrichedNotifications = notifications;
      if (includeWhatsapp === "true") {
        const phone = req.user.phone;
        if (phone) {
          const normalizedPhone = phone.replace(/\D/g, "");
          const logs = await getSharedPrismaClient().whatsAppNotificationLog.findMany({
            where: {
              companyId,
              recipientPhone: { contains: normalizedPhone.slice(-10) },
              eventType: { in: notifications.map((n) => `TASK_${n.type.toUpperCase().replace(/-/g, "_")}`) },
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, eventType: true, createdAt: true },
          });

          const logMap = new Map();
          for (const log of logs) {
            const key = log.eventType.replace("TASK_", "").toLowerCase();
            if (!logMap.has(key) || log.createdAt > logMap.get(key).createdAt) {
              logMap.set(key, { whatsappLogId: log.id, whatsappStatus: log.status === "SENT" ? "sent" : log.status === "FAILED" ? "failed" : "pending" });
            }
          }

          enrichedNotifications = notifications.map((n) => ({
            ...n,
            ...(logMap.get(n.type) || { whatsappStatus: null, whatsappLogId: null }),
          }));
        }
      }

      res.json({ success: true, data: { notifications: enrichedNotifications, unreadCount } });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ success: false, error: "فشل في جلب الإشعارات" });
    }
  },

  resendTaskNotificationWhatsApp: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const notification = await getSharedPrismaClient().taskNotification.findFirst({
        where: { id: notificationId, userId, companyId },
        include: { task: { select: { id: true, title: true } } },
      });

      if (!notification) {
        return res.status(404).json({ success: false, error: "الإشعار غير موجود" });
      }

      const task = notification.task || await getSharedPrismaClient().task.findFirst({
        where: { id: notification.taskId, companyId },
        select: { id: true, title: true },
      });

      const result = await taskNotificationService.notify({
        companyId,
        taskId: notification.taskId,
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        whatsappData: {
          templateName: `TASK_${notification.type.toUpperCase().replace(/-/g, "_")}`,
          taskTitle: task?.title || "مهمة",
          variables: taskNotificationHelpers.buildTaskVariables(task || { id: notification.taskId, title: task?.title || "مهمة" }),
        },
        actorUserId: userId,
        logActivity: true,
        activityDescription: "إعادة إرسال إشعار واتساب يدويًا",
      });

      res.json({
        success: true,
        data: result,
        message: result?.whatsappResult?.success ? "تم إعادة إرسال الإشعار" : "تم إنشاء الإشعار",
      });
    } catch (error) {
      console.error("Error resending notification:", error);
      res.status(500).json({ success: false, error: "فشل في إعادة إرسال الإشعار" });
    }
  },

  markNotificationAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      await getSharedPrismaClient().taskNotification.updateMany({
        where: { id: notificationId, userId, companyId },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({ success: true, message: "تم تحديد الإشعار كمقروء" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ success: false, error: "فشل في تحديث الإشعار" });
    }
  },

  markAllNotificationsAsRead: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      await getSharedPrismaClient().taskNotification.updateMany({
        where: { userId, companyId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({ success: true, message: "تم تحديد كل الإشعارات كمقروءة" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ success: false, error: "فشل في تحديث الإشعارات" });
    }
  },

  // ==================== Kanban Board ====================

  getKanbanTasks: async (req, res) => {
    try {
      const { projectId } = req.query;
      const companyId = req.user.companyId;

      const where = { companyId };
      if (projectId) where.projectId = projectId;

      const tasks = await getSharedPrismaClient().task.findMany({
        where,
        include: {
          assignee: {
            select: { firstName: true, lastName: true, avatar: true },
          },
          other_tasks: { select: { id: true, status: true } },
          _count: { select: { taskComments: true, taskAttachments: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const kanbanData = {
        PENDING: [],
        IN_PROGRESS: [],
        COMPLETED: [],
        CANCELLED: [],
      };

      tasks.forEach((task) => {
        const formattedTask = {
          ...task,
          subtasksCount: task.other_tasks ? task.other_tasks.length : 0,
          completedSubtasks: task.other_tasks
            ? task.other_tasks.filter((s) => s.status === "COMPLETED").length
            : 0,
          commentsCount: task._count ? task._count.taskComments || 0 : 0,
          attachmentsCount: task._count ? task._count.taskAttachments || 0 : 0,
        };
        delete formattedTask.other_tasks;
        delete formattedTask._count;

        if (kanbanData[task.status])
          kanbanData[task.status].push(formattedTask);
      });

      res.json({ success: true, data: kanbanData });
    } catch (error) {
      console.error("Error fetching kanban tasks:", error);
      res.status(500).json({ success: false, error: "فشل في جلب مهام Kanban" });
    }
  },

  updateTaskOrder: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { newStatus, newOrder } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
      });
      if (!task) {
        return res
          .status(404)
          .json({ success: false, error: "المهمة غير موجودة" });
      }

      const oldStatus = task.status;

      const updatedTask = await getSharedPrismaClient().task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          order: newOrder,
          ...(newStatus === "COMPLETED" && {
            completedDate: new Date(),
            progress: 100,
          }),
          ...(newStatus !== "COMPLETED" &&
            oldStatus === "COMPLETED" && { completedDate: null }),
        },
      });

      if (oldStatus !== newStatus) {
        await getSharedPrismaClient().taskActivity.create({
          data: {
            taskId,
            userId,
            action: "status_changed",
            field: "status",
            oldValue: oldStatus,
            newValue: newStatus,
            companyId,
          },
        });
      }

      res.json({
        success: true,
        data: updatedTask,
        message: "تم تحديث ترتيب المهمة",
      });

      if (oldStatus !== newStatus) {
        const taskForOrderNotif = await getSharedPrismaClient().task.findFirst({
          where: { id: taskId, companyId },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            creator: { select: { id: true, firstName: true, lastName: true } },
            taskWatchers: { select: { userId: true } },
          },
        });

        if (taskForOrderNotif) {
          await taskNotificationService.notifyTaskStakeholders({
            companyId,
            task: taskForOrderNotif,
            actorUserId: userId,
            type: "status_changed",
            title: "تحديث حالة المهمة",
            message: `تم تغيير حالة المهمة "${updatedTask.title}" إلى ${taskNotificationHelpers.normalizeStatusLabel(newStatus)}`,
            includeAssignee: true,
            includeCreator: true,
            includeWatchers: true,
            whatsappData: {
              templateName: "TASK_STATUS_CHANGED",
              taskTitle: updatedTask.title,
              variables: taskNotificationHelpers.buildTaskVariables(taskForOrderNotif, {
                oldStatus: taskNotificationHelpers.normalizeStatusLabel(oldStatus),
                newStatus: taskNotificationHelpers.normalizeStatusLabel(newStatus),
              }),
            },
            logActivity: true,
            activityDescription: `تم إرسال إشعار تغيير حالة من Kanban: ${oldStatus} ← ${newStatus}`,
          });
        }
      }
    } catch (error) {
      console.error("Error updating task order:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في تحديث ترتيب المهمة" });
    }
  },

  // ==================== تفاصيل المهمة الكاملة ====================

  getTaskDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
        include: {
          goal: { select: { id: true, title: true, goalType: true } },
          project: { select: { id: true, name: true } },
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          // Use correct schema relation names
          task: { select: { id: true, title: true } }, // parentTask relation
          other_tasks: {
            // subTasks relation
            include: {
              assignee: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          taskComments: {
            where: { parentCommentId: null },
            include: {
              users: {
                select: { firstName: true, lastName: true, avatar: true },
              },
              other_task_comments: {
                include: {
                  users: {
                    select: { firstName: true, lastName: true, avatar: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          taskAttachments: {
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: "desc" },
          },
          taskWatchers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          taskActivities: {
            include: {
              user: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!task) {
        return res
          .status(404)
          .json({ success: false, error: "المهمة غير موجودة" });
      }

      // Fetch time entries separately if the model exists
      let timeEntries = [];
      let totalMinutes = 0;
      try {
        timeEntries = await getSharedPrismaClient().timeEntry.findMany({
          where: { taskId: id, companyId },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { startTime: "desc" },
          take: 10,
        });
        totalMinutes = timeEntries.reduce(
          (sum, entry) => sum + (entry.duration || 0),
          0,
        );
      } catch (timeErr) {
        // time entries model may not exist in this schema — skip silently
      }

      res.json({
        success: true,
        data: {
          ...task,
          ...formatTaskSummary(task),
          parentTask: task.task || null,
          subtasks: task.other_tasks || [],
          subTasks: task.other_tasks || [],
          comments: task.taskComments || [],
          attachments: task.taskAttachments || [],
          activities: task.taskActivities || [],
          timeEntries: timeEntries,
          totalTimeMinutes: totalMinutes,
          totalTimeHours: Math.round((totalMinutes / 60) * 100) / 100,
          watchersList: task.taskWatchers
            ? task.taskWatchers.map((w) => w.users).filter(Boolean)
            : [],
        },
      });
    } catch (error) {
      console.error("Error fetching task details:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في جلب تفاصيل المهمة" });
    }
  },

  // ==================== المرفقات (Attachments) ====================

  // جلب مرفقات المهمة
  getAttachments: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const attachments = await getSharedPrismaClient().taskAttachment.findMany(
        {
          where: { taskId, companyId },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      );

      res.json({ success: true, data: attachments });
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ success: false, error: "فشل في جلب المرفقات" });
    }
  },

  // إضافة مرفق
  addAttachment: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { fileName, originalName, fileSize, fileType, filePath, base64Data } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.id || req.user.userId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
      });

      if (!task) {
        return res
          .status(404)
          .json({ success: false, error: "المهمة غير موجودة" });
      }

      let finalFilePath = filePath;
      let finalFileName = fileName || originalName;
      let finalFileSize = fileSize;

      // Direct base64 support: saves file on disk directly without requiring multipart upload
      if (base64Data && typeof base64Data === 'string') {
        try {
          const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          const ext = path.extname(originalName || '') || (String(fileType || '').includes('png') ? '.png' : '.jpg');
          finalFileName = `task-${uuidv4()}${ext}`;
          const uploadsDir = path.resolve(__dirname, '../uploads/tasks');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const diskPath = path.join(uploadsDir, finalFileName);
          fs.writeFileSync(diskPath, buffer);
          finalFilePath = `/uploads/tasks/${finalFileName}`;
          finalFileSize = buffer.length;
        } catch (saveErr) {
          console.error('[taskController] Failed to save base64 attachment to disk:', saveErr);
        }
      }

      const attachment = await getSharedPrismaClient().taskAttachment.create({
        data: {
          taskId,
          userId,
          fileName: finalFileName,
          originalName: originalName || finalFileName,
          fileSize: finalFileSize || 0,
          fileType: fileType || 'image/png',
          filePath: finalFilePath,
          companyId,
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      });

      // تسجيل النشاط
      await getSharedPrismaClient().taskActivity.create({
        data: {
          taskId,
          userId,
          action: "attachment_added",
          description: `تم إضافة مرفق: ${originalName}`,
          companyId,
        },
      });

      res.json({
        success: true,
        data: attachment,
        message: "تم إضافة المرفق بنجاح",
      });

      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task,
        actorUserId: userId,
        type: "attachment_added",
        title: "مرفق جديد على مهمة",
        message: `تم إضافة مرفق جديد على المهمة "${task.title}": ${originalName}`,
        includeAssignee: true,
        includeCreator: true,
        includeWatchers: true,
        whatsappData: {
          templateName: "TASK_ATTACHMENT_ADDED",
          taskTitle: task.title,
          variables: taskNotificationHelpers.buildTaskVariables(task, {
            attachmentName: originalName,
          }),
        },
        logActivity: true,
        activityDescription: `تم إرسال إشعار إضافة المرفق: ${originalName}`,
      });
    } catch (error) {
      console.error("Error adding attachment:", error);
      res.status(500).json({ success: false, error: "فشل في إضافة المرفق" });
    }
  },

  // حذف مرفق
  deleteAttachment: async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const attachment = await getSharedPrismaClient().taskAttachment.findFirst(
        {
          where: { id: attachmentId, companyId },
        },
      );

      if (!attachment) {
        return res
          .status(404)
          .json({ success: false, error: "المرفق غير موجود" });
      }

      // التحقق من صلاحية الحذف (صاحب المرفق فقط)
      if (attachment.userId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: "لا يمكنك حذف هذا المرفق" });
      }

      await getSharedPrismaClient().taskAttachment.delete({
        where: { id: attachmentId },
      });

      // تسجيل النشاط
      await getSharedPrismaClient().taskActivity.create({
        data: {
          taskId: attachment.taskId,
          userId,
          action: "attachment_deleted",
          description: `تم حذف مرفق: ${attachment.originalName}`,
          companyId,
        },
      });

      res.json({ success: true, message: "تم حذف المرفق بنجاح" });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ success: false, error: "فشل في حذف المرفق" });
    }
  },

  // ==================== Task Categories ====================

  // جلب جميع الأقسام
  getCategories: async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const categories = await getSharedPrismaClient().taskCategory.findMany({
        where: { companyId },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { order: "asc" },
      });

      res.json({
        success: true,
        data: categories.map((cat) => ({
          ...cat,
          taskCount: cat._count.tasks,
        })),
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ success: false, error: "فشل في جلب الأقسام" });
    }
  },

  // إنشاء قسم جديد
  createCategory: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { name, description, color, icon } = req.body;

      if (!name) {
        return res
          .status(400)
          .json({ success: false, error: "اسم القسم مطلوب" });
      }

      // التحقق من عدم وجود قسم بنفس الاسم
      const existingCategory =
        await getSharedPrismaClient().taskCategory.findFirst({
          where: { companyId, name },
        });

      if (existingCategory) {
        return res
          .status(400)
          .json({ success: false, error: "يوجد قسم بنفس الاسم" });
      }

      // الحصول على أعلى ترتيب
      const maxOrder = await getSharedPrismaClient().taskCategory.aggregate({
        where: { companyId },
        _max: { order: true },
      });

      const category = await getSharedPrismaClient().taskCategory.create({
        data: {
          name,
          description: description || null,
          color: color || "#6366f1",
          icon: icon || null,
          order: (maxOrder._max.order || 0) + 1,
          companyId,
        },
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ success: false, error: "فشل في إنشاء القسم" });
    }
  },

  // تحديث قسم
  updateCategory: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const { name, description, color, icon, isActive, order } = req.body;

      const category = await getSharedPrismaClient().taskCategory.findFirst({
        where: { id, companyId },
      });

      if (!category) {
        return res
          .status(404)
          .json({ success: false, error: "القسم غير موجود" });
      }

      // التحقق من عدم وجود قسم آخر بنفس الاسم
      if (name && name !== category.name) {
        const existingCategory =
          await getSharedPrismaClient().taskCategory.findFirst({
            where: { companyId, name, id: { not: id } },
          });
        if (existingCategory) {
          return res
            .status(400)
            .json({ success: false, error: "يوجد قسم آخر بنفس الاسم" });
        }
      }

      const updatedCategory = await getSharedPrismaClient().taskCategory.update(
        {
          where: { id },
          data: {
            name: name || category.name,
            description:
              description !== undefined ? description : category.description,
            color: color || category.color,
            icon: icon !== undefined ? icon : category.icon,
            isActive: isActive !== undefined ? isActive : category.isActive,
            order: order !== undefined ? order : category.order,
          },
        },
      );

      res.json({ success: true, data: updatedCategory });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ success: false, error: "فشل في تحديث القسم" });
    }
  },

  // حذف قسم
  deleteCategory: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      const category = await getSharedPrismaClient().taskCategory.findFirst({
        where: { id, companyId },
        include: { _count: { select: { tasks: true } } },
      });

      if (!category) {
        return res
          .status(404)
          .json({ success: false, error: "القسم غير موجود" });
      }

      // إزالة القسم من المهام المرتبطة
      await getSharedPrismaClient().task.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });

      await getSharedPrismaClient().taskCategory.delete({
        where: { id },
      });

      res.json({ success: true, message: "تم حذف القسم بنجاح" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ success: false, error: "فشل في حذف القسم" });
    }
  },

  // ==================== Templates ====================

  // جلب جميع القوالب
  getTemplates: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const templates = await getSharedPrismaClient().taskTemplate.findMany({
        where: { companyId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ success: false, error: "فشل في جلب القوالب" });
    }
  },

  // إنشاء قالب جديد
  createTemplate: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;
      const {
        name,
        description,
        defaultPriority,
        type,
        estimatedHours,
        tags,
        checklist,
        isPublic,
      } = req.body;

      const template = await getSharedPrismaClient().taskTemplate.create({
        data: {
          id: uuidv4(),
          name,
          description,
          defaultPriority: normalizePriority(defaultPriority),
          type: type || "general",
          estimatedHours: estimatedHours || 0,
          tags:
            tags && Array.isArray(tags) && tags.length > 0
              ? JSON.stringify(tags)
              : null,
          checklist:
            checklist && Array.isArray(checklist) && checklist.length > 0
              ? JSON.stringify(checklist)
              : null,
          isPublic: isPublic || false,
          createdBy: userId,
          companyId,
          updatedAt: new Date(),
        },
      });
      res.json({ success: true, data: template });
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ success: false, error: "فشل في إنشاء القالب" });
    }
  },

  // تحديث قالب
  updateTemplate: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const {
        name,
        description,
        defaultPriority,
        type,
        estimatedHours,
        tags,
        checklist,
        isPublic,
      } = req.body;

      const updateData = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(defaultPriority && {
          defaultPriority: normalizePriority(defaultPriority),
        }),
        ...(type && { type }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(isPublic !== undefined && { isPublic }),
        ...(tags !== undefined && {
          tags:
            tags && Array.isArray(tags) && tags.length > 0
              ? JSON.stringify(tags)
              : null,
        }),
        ...(checklist !== undefined && {
          checklist:
            checklist && Array.isArray(checklist) && checklist.length > 0
              ? JSON.stringify(checklist)
              : null,
        }),
      };

      const template = await getSharedPrismaClient().taskTemplate.updateMany({
        where: { id, companyId },
        data: updateData,
      });
      res.json({ success: true, data: template });
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ success: false, error: "فشل في تحديث القالب" });
    }
  },

  // حذف قالب
  deleteTemplate: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      await getSharedPrismaClient().taskTemplate.deleteMany({
        where: { id, companyId },
      });
      res.json({ success: true, message: "تم حذف القالب بنجاح" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ success: false, error: "فشل في حذف القالب" });
    }
  },

  // ==================== Checklists ====================

  // جلب قوائم التحقق للمهمة
  getChecklists: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;

      const checklists = await getSharedPrismaClient().taskChecklist.findMany({
        where: { taskId, companyId },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              completedUser: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      });
      res.json({ success: true, data: checklists });
    } catch (error) {
      console.error("Error fetching checklists:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في جلب قوائم التحقق" });
    }
  },

  // إنشاء قائمة تحقق
  createChecklist: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;
      const { title } = req.body;

      // Get max position
      const maxPosition = await getSharedPrismaClient().taskChecklist.aggregate(
        {
          where: { taskId, companyId },
          _max: { position: true },
        },
      );

      const checklist = await getSharedPrismaClient().taskChecklist.create({
        data: {
          taskId,
          title,
          position: (maxPosition._max.position || 0) + 1,
          companyId,
        },
        include: { items: true },
      });
      res.json({ success: true, data: checklist });

      const taskForChecklist = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId },
        select: { id: true, title: true, assignedTo: true, createdBy: true },
      });

      if (taskForChecklist) {
        await taskNotificationService.notifyTaskStakeholders({
          companyId,
          task: taskForChecklist,
          actorUserId: req.user.userId,
          type: "checklist_created",
          title: "قائمة تحقق جديدة",
          message: `تم إنشاء قائمة تحقق "${title}" في المهمة "${taskForChecklist.title}"`,
          includeAssignee: true,
          includeCreator: true,
          includeWatchers: true,
          excludeUserIds: [req.user.userId],
          logActivity: true,
          activityDescription: `تم إرسال إشعار قائمة تحقق جديدة: ${title}`,
        });
      }
    } catch (error) {
      console.error("Error creating checklist:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في إنشاء قائمة التحقق" });
    }
  },

  // حذف قائمة تحقق
  deleteChecklist: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { checklistId } = req.params;

      await getSharedPrismaClient().taskChecklist.deleteMany({
        where: { id: checklistId, companyId },
      });
      res.json({ success: true, message: "تم حذف قائمة التحقق" });
    } catch (error) {
      console.error("Error deleting checklist:", error);
      res
        .status(500)
        .json({ success: false, error: "فشل في حذف قائمة التحقق" });
    }
  },

  // إضافة عنصر لقائمة التحقق
  addChecklistItem: async (req, res) => {
    try {
      const { checklistId } = req.params;
      const { content } = req.body;

      // Get max position
      const maxPosition =
        await getSharedPrismaClient().taskChecklistItem.aggregate({
          where: { checklistId },
          _max: { position: true },
        });

      const item = await getSharedPrismaClient().taskChecklistItem.create({
        data: {
          checklistId,
          content,
          position: (maxPosition._max.position || 0) + 1,
        },
      });
      res.json({ success: true, data: item });
    } catch (error) {
      console.error("Error adding checklist item:", error);
      res.status(500).json({ success: false, error: "فشل في إضافة العنصر" });
    }
  },

  // تحديث عنصر قائمة التحقق
  updateChecklistItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      const { content, isCompleted } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted;
        updateData.completedAt = isCompleted ? new Date() : null;
        updateData.completedBy = isCompleted ? userId : null;
      }

      const item = await getSharedPrismaClient().taskChecklistItem.update({
        where: { id: itemId },
        data: updateData,
      });
      res.json({ success: true, data: item });

      if (isCompleted !== undefined && item.isCompleted !== undefined) {
        const checklistItemTask = await getSharedPrismaClient().taskChecklist.findUnique({
          where: { id: item.checklistId },
          select: { taskId: true, title: true, companyId: true },
        });

        if (checklistItemTask) {
          const parentTask = await getSharedPrismaClient().task.findFirst({
            where: { id: checklistItemTask.taskId, companyId },
            select: { id: true, title: true, assignedTo: true, createdBy: true, companyId: true },
          });

          if (parentTask) {
            await taskNotificationService.notifyTaskStakeholders({
              companyId,
              task: parentTask,
              actorUserId: userId,
              type: "checklist_item_completed",
              title: item.isCompleted ? "تم إتمام عنصر" : "تم إعادة فتح عنصر",
              message: `${item.isCompleted ? "تم إتمام" : "تم إعادة فتح"} العنصر "${item.content}" في قائمة "${checklistItemTask.title}" بالمهمة "${parentTask.title}"`,
              includeAssignee: true,
              includeCreator: true,
              includeWatchers: true,
              excludeUserIds: [userId],
              whatsappData: {
                templateName: "TASK_CHECKLIST_ITEM_COMPLETED",
                taskTitle: parentTask.title,
                variables: taskNotificationHelpers.buildTaskVariables(parentTask, {
                  itemContent: item.content,
                  completedBy: req.user.firstName || "مستخدم",
                }),
              },
              logActivity: true,
              activityDescription: `تم إرسال إشعار إتمام عنصر: ${item.content}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ success: false, error: "فشل في تحديث العنصر" });
    }
  },

  // حذف عنصر قائمة التحقق
  deleteChecklistItem: async (req, res) => {
    try {
      const { itemId } = req.params;

      await getSharedPrismaClient().taskChecklistItem.delete({
        where: { id: itemId },
      });
      res.json({ success: true, message: "تم حذف العنصر" });
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      res.status(500).json({ success: false, error: "فشل في حذف العنصر" });
    }
  },

  // ==================== Dependencies ====================

  // جلب تبعيات المهمة
  getDependencies: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;

      const dependencies =
        await getSharedPrismaClient().taskDependency.findMany({
          where: {
            OR: [
              { taskId, companyId },
              { dependsOnId: taskId, companyId },
            ],
          },
          include: {
            tasks_task_dependencies_taskIdTotasks: {
              select: { id: true, title: true, status: true, priority: true },
            },
            tasks_task_dependencies_dependsOnIdTotasks: {
              select: { id: true, title: true, status: true, priority: true },
            },
          },
        });
      const formatted = (dependencies || []).map((dep) => ({
        ...dep,
        task: dep.task || dep.tasks_task_dependencies_taskIdTotasks,
        dependsOn: dep.dependsOn || dep.tasks_task_dependencies_dependsOnIdTotasks,
      }));
      res.json({ success: true, data: formatted });
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      res.status(500).json({ success: false, error: "فشل في جلب التبعيات" });
    }
  },

  // إضافة تبعية
  addDependency: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;
      const { dependsOnId, type } = req.body;

      // Check if dependency already exists
      const existing = await getSharedPrismaClient().taskDependency.findFirst({
        where: { taskId, dependsOnId, companyId },
      });

      if (existing) {
        return res
          .status(400)
          .json({ success: false, error: "التبعية موجودة بالفعل" });
      }

      const dependency = await getSharedPrismaClient().taskDependency.create({
        data: {
          taskId,
          dependsOnId,
          type: type || "blocked_by",
          companyId,
        },
        include: {
          tasks_task_dependencies_taskIdTotasks: {
            select: { id: true, title: true, status: true, priority: true },
          },
          tasks_task_dependencies_dependsOnIdTotasks: {
            select: { id: true, title: true, status: true, priority: true },
          },
        },
      });

      // Keep Task.dependencies JSON column in sync
      const allDeps = await getSharedPrismaClient().taskDependency.findMany({
        where: { taskId, companyId },
        select: { dependsOnId: true },
      });
      const depIds = allDeps.map((d) => d.dependsOnId);
      await getSharedPrismaClient().task.updateMany({
        where: { id: taskId, companyId },
        data: { dependencies: JSON.stringify(depIds) },
      });

      const formatted = {
        ...dependency,
        task: dependency.task || dependency.tasks_task_dependencies_taskIdTotasks,
        dependsOn: dependency.dependsOn || dependency.tasks_task_dependencies_dependsOnIdTotasks,
      };
      res.json({ success: true, data: formatted });
    } catch (error) {
      console.error("Error adding dependency:", error);
      res.status(500).json({ success: false, error: "فشل في إضافة التبعية" });
    }
  },

  // حذف تبعية
  removeDependency: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { dependencyId } = req.params;

      const existing = await getSharedPrismaClient().taskDependency.findFirst({
        where: { id: dependencyId, companyId },
      });

      if (existing) {
        const { taskId } = existing;
        await getSharedPrismaClient().taskDependency.deleteMany({
          where: { id: dependencyId, companyId },
        });

        const allDeps = await getSharedPrismaClient().taskDependency.findMany({
          where: { taskId, companyId },
          select: { dependsOnId: true },
        });
        const depIds = allDeps.map((d) => d.dependsOnId);
        await getSharedPrismaClient().task.updateMany({
          where: { id: taskId, companyId },
          data: { dependencies: depIds.length > 0 ? JSON.stringify(depIds) : null },
        });

        return res.json({ success: true, message: "تم حذف التبعية" });
      }

      res.status(404).json({ success: false, error: "التبعية غير موجودة" });
    } catch (error) {
      console.error("Error removing dependency:", error);
      res.status(500).json({ success: false, error: "فشل في حذف التبعية" });
    }
  },
};

module.exports = taskController;
