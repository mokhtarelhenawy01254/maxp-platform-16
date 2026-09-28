const { v4: uuidv4 } = require('uuid');
const sharedDatabase = require('../services/sharedDatabase');
const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();
const taskNotificationService = require('../services/taskNotificationService');
const taskWebhookService = require('../services/taskWebhookService');
const queueTaskWebhook = (...args) => taskWebhookService.queueTaskWebhook(...args);

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
        const otherCompanyTask = await prisma.task.findUnique({
          where: { id },
          select: { id: true, companyId: true }
        });

        if (otherCompanyTask) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Cannot modify task belonging to another company'
          });
        }

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
  },

  updateTask: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { companyId, integrationName, actingUserId } = getIntegrationContext(req);
      const { id } = req.params;
      const title = req.body.title;
      const description = req.body.description;
      const priority = req.body.priority;
      const dueDate = req.body.dueDate !== undefined ? req.body.dueDate : req.body.due_date;
      const tags = req.body.tags;
      const assignedTo = req.body.assignedTo !== undefined ? req.body.assignedTo : req.body.assigned_to;
      const projectId = req.body.projectId !== undefined ? req.body.projectId : req.body.project_id;
      const startDate = req.body.startDate !== undefined ? req.body.startDate : req.body.start_date;
      const estimatedHours = req.body.estimatedHours !== undefined ? req.body.estimatedHours : req.body.estimated_hours;
      const status = req.body.status;
      const progress = req.body.progress;

      if (!actingUserId) {
        return res.status(400).json({
          success: false,
          message: 'This API key does not have an acting user for write operations'
        });
      }

      const updatableFields = [
        title,
        description,
        priority,
        dueDate,
        tags,
        assignedTo,
        projectId,
        startDate,
        estimatedHours,
        status,
        progress
      ];
      if (updatableFields.every((val) => val === undefined)) {
        return res.status(400).json({
          success: false,
          message: 'At least one field to update must be provided'
        });
      }

      const currentTask = await prisma.task.findFirst({
        where: { id, companyId },
        include: {
          project: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true, phone: true }
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

      // Check whether acting user is a manager or admin
      const actingUser = await prisma.user.findFirst({
        where: buildCompanyUserWhere(companyId, {
          id: actorUserId,
          isActive: true
        }),
        select: { id: true, role: true }
      });

      const isManagerOrAdmin = actingUser && [
        'SUPER_ADMIN',
        'COMPANY_ADMIN',
        'OWNER',
        'MANAGER'
      ].includes(String(actingUser.role || '').toUpperCase());

      // Non-managers who are not the creator (e.g. assignee only) cannot edit task details (403)
      if (!isManagerOrAdmin && currentTask.createdBy !== actorUserId) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح للمكلّف فقط بتعديل بيانات المهمة'
        });
      }

      const updateData = {};
      const changeList = [];

      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return res.status(400).json({
            success: false,
            message: 'title cannot be empty'
          });
        }
        updateData.title = title.trim();
        if (updateData.title !== currentTask.title) {
          changeList.push('العنوان');
        }
      }

      if (description !== undefined) {
        if (typeof description !== 'string' || !description.trim()) {
          return res.status(400).json({
            success: false,
            message: 'description cannot be empty'
          });
        }
        updateData.description = description.trim();
        if (updateData.description !== currentTask.description) {
          changeList.push('الوصف');
        }
      }

      if (priority !== undefined) {
        const normalizedPriority = normalizePriority(priority);
        updateData.priority = normalizedPriority;
        if (updateData.priority !== currentTask.priority) {
          changeList.push('الأولوية');
        }
      }

      if (dueDate !== undefined) {
        if (dueDate === null || dueDate === '') {
          updateData.dueDate = null;
        } else {
          const parsedDue = new Date(dueDate);
          if (Number.isNaN(parsedDue.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'dueDate is invalid'
            });
          }
          updateData.dueDate = parsedDue;
        }
        const currentDueMs = currentTask.dueDate ? new Date(currentTask.dueDate).getTime() : null;
        const newDueMs = updateData.dueDate ? updateData.dueDate.getTime() : null;
        if (currentDueMs !== newDueMs) {
          changeList.push('موعد التسليم');
        }
      }

      if (tags !== undefined) {
        const parsedTags = parseStoredArray(tags);
        updateData.tags = serializeArray(parsedTags);
        changeList.push('الوسوم');
      }

      if (assignedTo !== undefined) {
        if (!assignedTo) {
          return res.status(400).json({
            success: false,
            message: 'assignedTo cannot be empty'
          });
        }
        const assignee = await findCompanyUser(prisma, companyId, assignedTo);
        if (!assignee) {
          return res.status(400).json({
            success: false,
            message: 'Invalid assignedTo for this company'
          });
        }
        updateData.assignedTo = assignee.id;
        if (updateData.assignedTo !== currentTask.assignedTo) {
          changeList.push('المكلّف');
        }
      }

      if (projectId !== undefined) {
        if (projectId === null || projectId === '') {
          updateData.projectId = null;
        } else {
          const project = await prisma.project.findFirst({
            where: { id: projectId, companyId },
            select: { id: true, name: true }
          });
          if (!project) {
            return res.status(400).json({
              success: false,
              message: 'Invalid projectId for this company'
            });
          }
          updateData.projectId = project.id;
        }
        if (updateData.projectId !== currentTask.projectId) {
          changeList.push('المشروع');
        }
      }

      if (startDate !== undefined) {
        if (startDate === null || startDate === '') {
          updateData.startDate = null;
        } else {
          const parsedStart = new Date(startDate);
          if (Number.isNaN(parsedStart.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'startDate is invalid'
            });
          }
          updateData.startDate = parsedStart;
        }
      }

      if (estimatedHours !== undefined) {
        const parsedHours = Number(estimatedHours);
        if (!Number.isFinite(parsedHours) || parsedHours < 0) {
          return res.status(400).json({
            success: false,
            message: 'estimatedHours must be a non-negative number'
          });
        }
        updateData.estimatedHours = parsedHours;
        if (parsedHours !== Number(currentTask.estimatedHours || 0)) {
          changeList.push('الساعات التقديرية');
        }
      }

      let effectiveStatus = currentTask.status;
      let statusChanged = false;
      if (status !== undefined) {
        const normalizedStatus = normalizeStatus(status);
        effectiveStatus = normalizedStatus;
        updateData.status = effectiveStatus;
        if (effectiveStatus !== currentTask.status) {
          statusChanged = true;
          changeList.push('الحالة');
          if (effectiveStatus === 'COMPLETED') {
            updateData.completedDate = new Date();
          } else if (currentTask.status === 'COMPLETED') {
            updateData.completedDate = null;
          }
        }
      }

      if (progress !== undefined) {
        const numericProgress = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
        updateData.progress = numericProgress;
        if (numericProgress !== currentTask.progress) {
          changeList.push('نسبة الإنجاز');
        }
      } else if (statusChanged && (effectiveStatus === 'COMPLETED' || effectiveStatus === 'IN_REVIEW')) {
        updateData.progress = 100;
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          project: {
            select: { id: true, name: true }
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true, phone: true }
          },
          creator: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      const changeDesc = changeList.length > 0 ? changeList.join('، ') : 'بيانات المهمة';

      await createTaskActivity(prisma, {
        taskId: updatedTask.id,
        userId: actorUserId,
        companyId,
        action: 'external_task_update',
        description: `Task updated by external integration: ${integrationName} (${changeDesc})`
      });

      const isReassigned = updateData.assignedTo !== undefined && updateData.assignedTo !== currentTask.assignedTo;

      if (isReassigned) {
        // Send notification to newly assigned user
        if (updatedTask.assignedTo) {
          await taskNotificationService.notify({
            companyId,
            taskId: updatedTask.id,
            userId: updatedTask.assignedTo,
            type: 'task_assigned',
            title: 'مهمة مسندة إليك من تكامل خارجي',
            message: `تم تكليفك بمهمة "${updatedTask.title}" من خلال ${integrationName}`,
            link: `/tasks/${updatedTask.id}`,
            whatsappData: {
              templateName: 'TASK_CREATED',
              taskTitle: updatedTask.title,
              variables: taskNotificationService.helpers.buildTaskVariables(updatedTask)
            },
            actorUserId,
            logActivity: true,
            activityDescription: `تم إرسال إشعار تكليف للمسؤول الجديد من ${integrationName}`
          });
        }

        // Notify old assignee of reassignment if existed
        if (currentTask.assignedTo) {
          await taskNotificationService.notify({
            companyId,
            taskId: updatedTask.id,
            userId: currentTask.assignedTo,
            type: 'task_updated',
            title: 'إلغاء تكليفك بمهمة',
            message: `تم نقل المسؤولية عن المهمة "${updatedTask.title}" إلى مستخدم آخر من خلال ${integrationName}`,
            link: `/tasks/${updatedTask.id}`,
            actorUserId,
            logActivity: false
          }).catch(() => {});
        }
      } else if (updatedTask.assignedTo) {
        // Send notification to current assignee (المكلّف)
        await taskNotificationService.notify({
          companyId,
          taskId: updatedTask.id,
          userId: updatedTask.assignedTo,
          type: statusChanged ? 'status_changed' : 'task_updated',
          title: statusChanged ? 'تحديث خارجي لحالة المهمة' : 'تحديث خارجي للمهمة',
          message: `تم تحديث ${changeDesc} للمهمة "${updatedTask.title}" من خلال ${integrationName}`,
          link: `/tasks/${updatedTask.id}`,
          whatsappData: {
            templateName: statusChanged ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED',
            taskTitle: updatedTask.title,
            variables: taskNotificationService.helpers.buildTaskVariables(updatedTask, {
              changes: changeDesc
            })
          },
          actorUserId,
          logActivity: true,
          activityDescription: `تم إرسال إشعار تحديث خارجي للمهمة إلى المكلف من ${integrationName}`
        });
      }

      // Notify other stakeholders (creator & watchers)
      await taskNotificationService.notifyTaskStakeholders({
        companyId,
        task: updatedTask,
        actorUserId,
        type: statusChanged ? 'status_changed' : 'task_updated',
        title: statusChanged ? 'تحديث خارجي لحالة المهمة' : 'تحديث خارجي للمهمة',
        message: `تم تحديث ${changeDesc} للمهمة "${updatedTask.title}" من خلال ${integrationName}`,
        includeAssignee: false,
        includeCreator: true,
        includeWatchers: true,
        whatsappData: {
          templateName: statusChanged ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED',
          taskTitle: updatedTask.title,
          variables: taskNotificationService.helpers.buildTaskVariables(updatedTask, {
            changes: changeDesc
          })
        },
        logActivity: true,
        activityDescription: `تم إرسال إشعار تحديث خارجي للمهمة من ${integrationName}`
      });

      queueTaskWebhook('task.updated', {
        companyId,
        actorUserId,
        requestId: req.id,
        task: updatedTask,
        previousTask: currentTask
      });

      if (statusChanged) {
        queueTaskWebhook('task.status_changed', {
          companyId,
          actorUserId,
          requestId: req.id,
          task: updatedTask,
          previousTask: currentTask
        });
      }

      return res.json({
        success: true,
        data: formatTask(updatedTask),
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-TASKS] Failed to update task:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update task'
      });
    }
  }
};

module.exports = taskExternalController;
