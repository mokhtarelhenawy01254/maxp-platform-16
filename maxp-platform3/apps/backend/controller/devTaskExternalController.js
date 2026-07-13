const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const VALID_DEV_TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'CANCELLED'];
const VALID_DEV_TASK_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VALID_DEV_TASK_TYPES = ['BUG', 'FEATURE', 'ENHANCEMENT', 'DOCUMENTATION', 'SECURITY', 'PERFORMANCE', 'TESTING', 'REFACTOR', 'MAINTENANCE', 'HOTFIX'];

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

const clampProgress = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const normalizeStatus = (status, fallback = 'BACKLOG') => {
  if (!status) {
    return fallback;
  }

  const normalized = String(status).trim().toUpperCase();
  if (!VALID_DEV_TASK_STATUSES.includes(normalized)) {
    throw createHttpError(400, `Invalid status. Allowed values: ${VALID_DEV_TASK_STATUSES.join(', ')}`);
  }

  return normalized;
};

const normalizePriority = (priority, fallback = 'MEDIUM') => {
  if (!priority) {
    return fallback;
  }

  const normalized = String(priority).trim().toUpperCase();
  if (!VALID_DEV_TASK_PRIORITIES.includes(normalized)) {
    throw createHttpError(400, `Invalid priority. Allowed values: ${VALID_DEV_TASK_PRIORITIES.join(', ')}`);
  }

  return normalized;
};

const normalizeType = (type, fallback = 'FEATURE') => {
  if (!type) {
    return fallback;
  }

  const normalized = String(type).trim().toUpperCase();
  if (!VALID_DEV_TASK_TYPES.includes(normalized)) {
    throw createHttpError(400, `Invalid type. Allowed values: ${VALID_DEV_TASK_TYPES.join(', ')}`);
  }

  return normalized;
};

const parseLinks = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (_error) {
      return [value];
    }
  }

  return [];
};

const serializeLinks = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() ? JSON.stringify([value.trim()]) : null;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return JSON.stringify(value);
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, `${fieldName} is invalid`);
  }

  return parsed;
};

const formatTask = (task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  type: task.type,
  status: task.status,
  priority: task.priority,
  component: task.component,
  assigneeId: task.assigneeId,
  assigneeName: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members
    ? `${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.user.firstName} ${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.user.lastName}`.trim()
    : null,
  reporterId: task.reporterId,
  reporterName: task.dev_team_members_dev_tasks_reporterIdTodev_team_members
    ? `${task.dev_team_members_dev_tasks_reporterIdTodev_team_members.user.firstName} ${task.dev_team_members_dev_tasks_reporterIdTodev_team_members.user.lastName}`.trim()
    : null,
  projectId: task.projectId,
  projectName: task.dev_project?.name || null,
  releaseId: task.releaseId,
  releaseVersion: task.dev_release?.version || null,
  dueDate: task.dueDate,
  startDate: task.startDate,
  completedDate: task.completedDate,
  estimatedHours: task.estimatedHours,
  actualHours: task.actualHours,
  progress: task.progress,
  tags: parseStoredArray(task.tags),
  gitBranch: task.gitBranch,
  ticketId: task.ticketId,
  businessValue: task.businessValue,
  acceptanceCriteria: task.acceptanceCriteria,
  relatedLinks: parseLinks(task.relatedLinks),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

const getIntegrationContext = (req) => ({
  credentialId: req.externalDevTaskApi?.credentialId || null,
  integrationName: req.externalDevTaskApi?.name || 'external-dev-task-client',
  defaultReporterMemberId: req.externalDevTaskApi?.defaultReporterMemberId || null,
  defaultAssigneeMemberId: req.externalDevTaskApi?.defaultAssigneeMemberId || null,
  defaultProjectId: req.externalDevTaskApi?.defaultProjectId || null
});

const ensureProject = async (prisma, projectId) => {
  if (!projectId) {
    return null;
  }

  const project = await prisma.devProject.findUnique({
    where: { id: projectId },
    select: { id: true, name: true }
  });

  if (!project) {
    throw createHttpError(400, 'Invalid projectId');
  }

  return project;
};

const requireBoundProjectId = (req) => {
  const boundProjectId = req.externalDevTaskApi?.defaultProjectId || null;
  if (!boundProjectId) {
    throw createHttpError(403, 'This API key is not bound to a development project');
  }

  return boundProjectId;
};

const ensureBoundProject = async (prisma, projectId) => {
  const project = await prisma.devProject.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      progress: true,
      repository: true,
      updatedAt: true,
      managerId: true,
      teamMembers: true
    }
  });

  if (!project) {
    throw createHttpError(403, 'The API key is linked to a missing development project');
  }

  return project;
};

const getAllowedProjectMemberIds = (project, integrationContext = {}) => {
  const ids = [
    ...(parseStoredArray(project?.teamMembers).filter(Boolean)),
    project?.managerId,
    integrationContext.defaultReporterMemberId,
    integrationContext.defaultAssigneeMemberId
  ].filter(Boolean);

  return [...new Set(ids)];
};

const enforceBoundProjectMatch = (requestedProjectId, boundProjectId) => {
  if (requestedProjectId && requestedProjectId !== boundProjectId) {
    throw createHttpError(403, 'This API key is restricted to its bound development project');
  }
};

const enforceAllowedAssignee = (assigneeId, allowedMemberIds) => {
  if (!assigneeId) {
    return;
  }

  if (allowedMemberIds.length > 0 && !allowedMemberIds.includes(assigneeId)) {
    throw createHttpError(403, 'This API key cannot assign tasks outside its allowed project team');
  }
};

const ensureMember = async (prisma, memberId, label) => {
  if (!memberId) {
    return null;
  }

  const member = await prisma.devTeamMember.findFirst({
    where: {
      id: memberId,
      isActive: true,
      user: {
        isActive: true
      }
    },
    select: {
      id: true,
      userId: true
    }
  });

  if (!member) {
    throw createHttpError(400, `${label} is invalid or inactive`);
  }

  return member;
};

const createTaskActivity = async (prisma, payload) => {
  try {
    await prisma.devTaskActivity.create({ data: payload });
  } catch (error) {
    console.error('⚠️ [EXTERNAL-DEV-TASKS] Failed to create activity log:', error.message);
  }
};

const taskInclude = {
  dev_project: {
    select: { id: true, name: true }
  },
  dev_release: {
    select: { id: true, version: true }
  },
  dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  },
  dev_team_members_dev_tasks_reporterIdTodev_team_members: {
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  }
};

const devTaskExternalController = {
  listProjects: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const boundProjectId = requireBoundProjectId(req);
      const project = await ensureBoundProject(prisma, boundProjectId);

      return res.json({
        success: true,
        data: [{
          id: project.id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          repository: project.repository,
          updatedAt: project.updatedAt
        }]
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-DEV-TASKS] Failed to list projects:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to list projects'
      });
    }
  },

  listTeamMembers: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const integrationContext = getIntegrationContext(req);
      const project = await ensureBoundProject(prisma, requireBoundProjectId(req));
      const allowedMemberIds = getAllowedProjectMemberIds(project, integrationContext);
      const members = await prisma.devTeamMember.findMany({
        where: {
          ...(allowedMemberIds.length > 0 && {
            id: { in: allowedMemberIds }
          }),
          isActive: true,
          user: {
            isActive: true
          }
        },
        select: {
          id: true,
          role: true,
          department: true,
          availability: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: [
          { role: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return res.json({
        success: true,
        data: members.map((member) => ({
          id: member.id,
          userId: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`.trim(),
          email: member.user.email,
          role: member.role,
          department: member.department,
          availability: member.availability
        }))
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-DEV-TASKS] Failed to list team members:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to list team members'
      });
    }
  },

  listTasks: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const integrationContext = getIntegrationContext(req);
      const boundProjectId = requireBoundProjectId(req);
      const {
        projectId,
        status,
        priority,
        assigneeId,
        search,
        page = 1,
        limit = DEFAULT_PAGE_SIZE
      } = req.query;

      const parsedPage = parsePositiveInt(page, 1);
      const parsedLimit = Math.min(parsePositiveInt(limit, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
      const skip = (parsedPage - 1) * parsedLimit;
      const project = await ensureBoundProject(prisma, boundProjectId);
      const allowedMemberIds = getAllowedProjectMemberIds(project, integrationContext);

      enforceBoundProjectMatch(projectId, boundProjectId);
      if (assigneeId && allowedMemberIds.length > 0 && !allowedMemberIds.includes(assigneeId)) {
        throw createHttpError(403, 'This API key cannot filter by assignees outside its bound project team');
      }

      const where = {
        projectId: boundProjectId,
        ...(status && { status: normalizeStatus(status, undefined) }),
        ...(priority && { priority: normalizePriority(priority, undefined) }),
        ...(assigneeId && { assigneeId })
      };

      if (search) {
        where.OR = [
          { title: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } }
        ];
      }

      const [tasks, total] = await Promise.all([
        prisma.devTask.findMany({
          where,
          include: taskInclude,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: parsedLimit
        }),
        prisma.devTask.count({ where })
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
      console.error('❌ [EXTERNAL-DEV-TASKS] Failed to list tasks:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to list tasks'
      });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { id } = req.params;
      const boundProjectId = requireBoundProjectId(req);

      const task = await prisma.devTask.findFirst({
        where: {
          id,
          projectId: boundProjectId
        },
        include: taskInclude
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
      console.error('❌ [EXTERNAL-DEV-TASKS] Failed to fetch task:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch task'
      });
    }
  },

  createTask: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const {
        integrationName,
        credentialId,
        defaultReporterMemberId,
        defaultAssigneeMemberId,
        defaultProjectId
      } = getIntegrationContext(req);
      const {
        title,
        description,
        type,
        priority,
        status,
        assigneeId,
        projectId,
        releaseId,
        dueDate,
        startDate,
        estimatedHours = 0,
        progress = 0,
        component = null,
        tags = [],
        gitBranch = null,
        ticketId = null,
        businessValue = null,
        acceptanceCriteria = null,
        relatedLinks = null
      } = req.body || {};

      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: 'title is required'
        });
      }

      if (!defaultReporterMemberId) {
        return res.status(400).json({
          success: false,
          message: 'This API key does not have a default reporter member'
        });
      }

      const boundProjectId = requireBoundProjectId(req);
      const boundProject = await ensureBoundProject(prisma, boundProjectId);
      const allowedMemberIds = getAllowedProjectMemberIds(boundProject, {
        defaultReporterMemberId,
        defaultAssigneeMemberId
      });
      const reporterMember = await ensureMember(prisma, defaultReporterMemberId, 'defaultReporterMemberId');
      const finalAssigneeId = assigneeId || defaultAssigneeMemberId || null;
      enforceAllowedAssignee(finalAssigneeId, allowedMemberIds);
      await ensureMember(prisma, finalAssigneeId, 'assigneeId');

      enforceBoundProjectMatch(projectId, boundProjectId);
      const finalProjectId = boundProjectId;
      await ensureProject(prisma, finalProjectId);

      if (releaseId) {
        const release = await prisma.devRelease.findUnique({
          where: { id: releaseId },
          select: { id: true }
        });

        if (!release) {
          return res.status(400).json({
            success: false,
            message: 'Invalid releaseId'
          });
        }
      }

      const normalizedStatus = normalizeStatus(status);
      const normalizedProgress = clampProgress(progress, normalizedStatus === 'DONE' ? 100 : 0);
      const parsedDueDate = parseOptionalDate(dueDate, 'dueDate');
      const parsedStartDate = parseOptionalDate(startDate, 'startDate');
      const createdTask = await prisma.devTask.create({
        data: {
          id: crypto.randomUUID(),
          title: String(title).trim(),
          description: String(description || title).trim(),
          type: normalizeType(type),
          priority: normalizePriority(priority),
          status: normalizedStatus,
          assigneeId: finalAssigneeId,
          reporterId: reporterMember.id,
          projectId: finalProjectId,
          releaseId: releaseId || null,
          dueDate: parsedDueDate === undefined ? null : parsedDueDate,
          startDate: parsedStartDate === undefined ? null : parsedStartDate,
          completedDate: normalizedStatus === 'DONE' ? new Date() : null,
          estimatedHours: Number(estimatedHours) || 0,
          actualHours: 0,
          progress: normalizedProgress,
          component: component ? String(component).trim() : null,
          tags: serializeArray(Array.isArray(tags) ? tags : parseStoredArray(tags)),
          gitBranch: gitBranch ? String(gitBranch).trim() : null,
          ticketId: ticketId ? String(ticketId).trim() : null,
          businessValue: businessValue ? String(businessValue).trim() : null,
          acceptanceCriteria: acceptanceCriteria ? String(acceptanceCriteria).trim() : null,
          relatedLinks: serializeLinks(relatedLinks)
        },
        include: taskInclude
      });

      await createTaskActivity(prisma, {
        taskId: createdTask.id,
        memberId: reporterMember.id,
        action: 'external_task_created',
        newValue: credentialId,
        description: `Task created by external dev integration: ${integrationName}`
      });

      return res.status(201).json({
        success: true,
        data: formatTask(createdTask),
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-DEV-TASKS] Failed to create task:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to create task'
      });
    }
  },

  updateTaskStatus: async (req, res) => {
    try {
      const prisma = getSharedPrismaClient();
      const { id } = req.params;
      const { integrationName, defaultReporterMemberId } = getIntegrationContext(req);
      const boundProjectId = requireBoundProjectId(req);
      const { status, progress } = req.body || {};

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'status is required'
        });
      }

      const currentTask = await prisma.devTask.findFirst({
        where: {
          id,
          projectId: boundProjectId
        },
        include: taskInclude
      });

      if (!currentTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      const normalizedStatus = normalizeStatus(status);
      const nextProgress = progress !== undefined
        ? clampProgress(progress, currentTask.progress)
        : normalizedStatus === 'DONE'
          ? 100
          : currentTask.progress;

      const updatedTask = await prisma.devTask.update({
        where: { id },
        data: {
          status: normalizedStatus,
          progress: nextProgress,
          completedDate: normalizedStatus === 'DONE' ? new Date() : null
        },
        include: taskInclude
      });

      await createTaskActivity(prisma, {
        taskId: updatedTask.id,
        memberId: defaultReporterMemberId || currentTask.reporterId,
        action: 'external_status_update',
        field: 'status',
        oldValue: currentTask.status,
        newValue: normalizedStatus,
        description: `Task status updated by external dev integration: ${integrationName}`
      });

      return res.json({
        success: true,
        data: formatTask(updatedTask),
        message: 'Task status updated successfully'
      });
    } catch (error) {
      console.error('❌ [EXTERNAL-DEV-TASKS] Failed to update task status:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update task status'
      });
    }
  }
};

module.exports = devTaskExternalController;
