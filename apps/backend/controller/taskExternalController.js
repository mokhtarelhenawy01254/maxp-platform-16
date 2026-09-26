const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const taskNotificationService = require('../services/taskNotificationService');
const { queueTaskWebhook } = require('../services/taskWebhookService');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const VALID_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'IN_REVIEW'];
const VALID_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseStoredArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const serializeArray = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return JSON.stringify(
    value
      .map((item) => String(item).trim())
      .filter(Boolean)
  );
};

const normalizeStatus = (status, fallback = 'PENDING') => {
  if (!status) {
    return fallback;
  }

  const normalized = String(status).trim().toUpperCase();
  if (!VALID_TASK_STATUSES.includes(normalized)) {
    throw createHttpError(400, `Invalid status. Allowed values: ${VALID_TASK_STATUSES.join(', ')}`);
  }

  return normalized;
};

const normalizePriority = (priority, fallback = 'MEDIUM') => {
  if (!priority) {
    return fallback;
  }

  const normalized = String(priority).trim().toUpperCase();
  if (!VALID_TASK_PRIORITIES.includes(normalized)) {
    throw createHttpError(400, `Invalid priority. Allowed values: ${VALID_TASK_PRIORITIES.join(', ')}`);
  }

  return normalized;
};

const buildCompanyUserWhere = (companyId, extraWhere = {}) => ({
  ...extraWhere,
  OR: [
    { companyId },
    {
      userCompanies: {
        some: {
          companyId,
          isActive: true
        }
      }
    }
  ]
});

const formatTask = (task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  type: task.type,
  projectId: task.projectId,
  projectName: task.project?.name || null,
  assignedTo: task.assignedTo,
  assignedToName: task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim()
    : null,
  createdBy: task.createdBy,
  createdByName: task.creator
    ? `${task.creator.firstName} ${task.creator.lastName}`.trim()
    : null,
  dueDate: task.dueDate,
  startDate: task.startDate,
  completedDate: task.completedDate,
  estimatedHours: task.estimatedHours,
  actualHours: task.actualHours,
  progress: task.progress,
  isRecurring: task.isRecurring,
  recurringRule: task.recurringRule,
  tags: parseStoredArray(task.tags),
  dependencies: parseStoredArray(task.dependencies),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

const getIntegrationContext = (req) => {
  const companyId = req.externalTaskApi?.companyId;

  if (!companyId) {
    throw createHttpError(503, 'External task API company scope is missing');
  }

  return {
    companyId,
    credentialId: req.externalTaskApi?.credentialId || null,
    integrationName: req.externalTaskApi?.name || 'external-task-client',
    actingUserId: req.externalTaskApi?.actingUserId || null
  };
};

const findCompanyUser = async (prisma, companyId, userId) => {
  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: buildCompanyUserWhere(companyId, {
      id: userId,
      isActive: true
    }),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });
};

const createTaskActivity = async (prisma, payload) => {
  try {
    await prisma.taskActivity.create({ data: payload });
  } catch (error) {
    console.error('⚠️ [EXTERNAL-TASKS] Failed to create activity log:', error.message);
  }
};

const taskExternalController = {
  listTasks: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId } = getIntegrationContext(req);
      const {
        projectId,
        status,
        priority,
        assignedTo,
        search,
        page = 1,
        limit = DEFAULT_PAGE_SIZE
      } = req.query;

      const parsedPage = parsePositiveInt(page, 1);
      const parsedLimit = Math.min(parsePositiveInt(limit, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
      const skip = (parsedPage - 1) * parsedLimit;

      const where = {
        companyId,
        ...(projectId && { projectId }),
        ...(status && { status: normalizeStatus(status, undefined) }),
        ...(priority && { priority: normalizePriority(priority, undefined) }),
        ...(assignedTo && { assignedTo })
      };

      if (search) {
        where.OR = [
          { title: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } }
        ];
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            project: {
              select: { id: true, name: true }
            },
            assignee: {
              select: { id: true, firstName: true, lastName: true }
            },
            creator: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: parsedLimit
        }),
        prisma.task.count({ where })
      ]);

      return res.json({
        success: true,
        data: tasks.map(formatTask),
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit)
        }
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to list tasks:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to list tasks'
      });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId } = getIntegrationContext(req);
      const { id } = req.params;

      const task = await prisma.task.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          project: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true }
          },
          creator: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      return res.json({
        success: true,
        data: formatTask(task)
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to fetch task:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch task'
      });
    }
  },

  listProjects: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId } = getIntegrationContext(req);

      const projects = await prisma.project.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          progress: true,
          startDate: true,
          endDate: true,
          updatedAt: true
        },
        orderBy: [
          { status: 'asc' },
          { name: 'asc' }
        ]
      });

      return res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to list projects:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to list projects'
      });
    }
  },

  listUsers: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId } = getIntegrationContext(req);

      const users = await prisma.user.findMany({
        where: buildCompanyUserWhere(companyId, {
          isActive: true
        }),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          phone: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      });

      return res.json({
        success: true,
        data: users.map((user) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          phone: user.phone
        }))
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to list users:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to list users'
      });
    }
  },

  createTask: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId, integrationName, actingUserId } = getIntegrationContext(req);
      const {
        projectId,
        title,
        description,
        priority,
        type = 'general',
        assignedTo,
        dueDate,
        startDate,
        estimatedHours = 0,
        progress = 0,
        tags = [],
        dependencies = [],
        isRecurring = false,
        recurringRule = null
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'title and description are required'
        });
      }

      if (!actingUserId) {
        return res.status(400).json({
          success: false,
          message: 'This API key does not have an acting user for write operations'
        });
      }

      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, companyId },
          select: { id: true }
        });

        if (!project) {
          return res.status(400).json({
            success: false,
            message: 'Invalid projectId for this company'
          });
        }
      }

      const actorUserId = actingUserId;

      const finalAssignedTo = assignedTo || actorUserId;
      const assignee = await findCompanyUser(prisma, companyId, finalAssignedTo);
      if (!assignee) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignedTo for this company'
        });
      }

      const createdTask = await prisma.task.create({
        data: {
          id: uuidv4(),
          companyId,
          projectId: projectId || null,
          title: String(title).trim(),
          description: String(description).trim(),
          status: 'PENDING',
          priority: normalizePriority(priority),
          type: String(type || 'general').trim() || 'general',
          assignedTo: finalAssignedTo,
          createdBy: actorUserId,
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          estimatedHours: Number(estimatedHours) || 0,
          actualHours: 0,
          progress: Number(progress) || 0,
          tags: serializeArray(tags),
          dependencies: serializeArray(dependencies),
          isRecurring: Boolean(isRecurring),
          recurringRule: recurringRule ? String(recurringRule) : null
        },
        include: {
          project: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true }
          },
          creator: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      await createTaskActivity(prisma, {
        taskId: createdTask.id,
        userId: actorUserId,
        companyId,
        action: 'external_task_created',
        description: `Task created by external integration: ${integrationName}`
      });

      if (createdTask.assignedTo && createdTask.assignedTo !== actorUserId) {
        await taskNotificationService.notify({
          companyId,
          taskId: createdTask.id,
          userId: createdTask.assignedTo,
          type: 'task_assigned',
          title: 'مهمة جديدة من تكامل خارجي',
          message: `تم إنشاء مهمة جديدة لك من خلال ${integrationName}: ${createdTask.title}`,
          link: `/tasks/${createdTask.id}`,
          whatsappData: {
            templateName: 'TASK_CREATED',
            taskTitle: createdTask.title,
            variables: taskNotificationService.helpers.buildTaskVariables(createdTask)
          },
          actorUserId,
          logActivity: true,
          activityDescription: `تم إرسال إشعار مهمة خارجية جديدة من ${integrationName}`
        });
      }

      queueTaskWebhook('task.created', {
        companyId,
        actorUserId,
        requestId: req.id,
        task: createdTask
      });

      return res.status(201).json({
        success: true,
        data: formatTask(createdTask),
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to create task:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to create task'
      });
    }
  },

  updateTaskStatus: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId, integrationName, actingUserId } = getIntegrationContext(req);
      const { id } = req.params;
      const { status, progress } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'status is required'
        });
      }

      if (!actingUserId) {
        return res.status(400).json({
          success: false,
          message: 'This API key does not have an acting user for write operations'
        });
      }

      const normalizedStatus = normalizeStatus(status);
      const currentTask = await prisma.task.findFirst({
        where: { id, companyId },
        include: {
          project: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true }
          },
          creator: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      if (!currentTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const actorUserId = actingUserId;

      // Check whether acting user is assignee-only (non-manager/admin)
      const actingUser = await prisma.user.findFirst({
        where: { id: actorUserId, companyId },
        select: { id: true, role: true }
      });

      const isManagerOrAdmin = actingUser && [
        'SUPER_ADMIN',
        'COMPANY_ADMIN',
        'OWNER',
        'MANAGER'
      ].includes(String(actingUser.role || '').toUpperCase());

      const isAssigneeOnly = !isManagerOrAdmin && currentTask.createdBy !== actorUserId && currentTask.assignedTo === actorUserId;

      let effectiveStatus = normalizedStatus;
      if (isAssigneeOnly && normalizedStatus === 'COMPLETED') {
        effectiveStatus = 'IN_REVIEW';
      }

      const nextProgress = progress !== undefined
        ? Number(progress) || 0
        : effectiveStatus === 'COMPLETED' || effectiveStatus === 'IN_REVIEW'
          ? 100
          : currentTask.progress;

      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          status: effectiveStatus,
          progress: nextProgress,
          completedDate: effectiveStatus === 'COMPLETED' ? new Date() : null
        },
        include: {
          project: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true }
          },
          creator: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      await createTaskActivity(prisma, {
        taskId: updatedTask.id,
        userId: actorUserId,
        companyId,
        action: 'external_status_update',
        field: 'status',
        oldValue: currentTask.status,
        newValue: effectiveStatus,
        description: `Task status updated by external integration: ${integrationName}`
      });

      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task: updatedTask,
        actorUserId,
        type: 'status_changed',
        title: 'تحديث خارجي لحالة المهمة',
        message: `تم تحديث حالة المهمة "${updatedTask.title}" إلى ${taskNotificationService.helpers.normalizeStatusLabel(effectiveStatus)} من خلال ${integrationName}`,
        includeAssignee: true,
        includeCreator: true,
        includeWatchers: true,
        whatsappData: {
          templateName: 'TASK_STATUS_CHANGED',
          taskTitle: updatedTask.title,
          variables: taskNotificationService.helpers.buildTaskVariables(updatedTask, {
            oldStatus: taskNotificationService.helpers.normalizeStatusLabel(currentTask.status),
            newStatus: taskNotificationService.helpers.normalizeStatusLabel(effectiveStatus)
          })
        },
        logActivity: true,
        activityDescription: `تم إرسال إشعار تحديث خارجي لحالة المهمة من ${integrationName}`
      });

      queueTaskWebhook('task.status_changed', {
        companyId,
        actorUserId,
        requestId: req.id,
        task: updatedTask,
        previousTask: currentTask
      });

      return res.json({
        success: true,
        data: formatTask(updatedTask),
        message: 'Task status updated successfully'
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to update task status:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update task status'
      });
    }
  }
};

module.exports = taskExternalController;
