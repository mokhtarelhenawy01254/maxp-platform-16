/**
 * taskBacklogService.js
 * 
 * Manages continuous product backlog items (task_backlogs), converting notes to tasks,
 * tracking daily improvement quotas (at least 1 improvement task per day), and auto-suggestions.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Lists backlog items with filtering.
 */
async function getBacklogItems(companyId, filters = {}) {
  const prisma = getSharedPrismaClient();
  const { status = 'PENDING', search = '', priority, type, source, limit = 50, page = 1 } = filters;

  const where = {
    companyId,
    ...(status && status !== 'ALL' ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(type ? { type } : {}),
    ...(source ? { source } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const take = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.taskBacklog.findMany({
      where,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        convertedTask: { select: { id: true, title: true, status: true } }
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take,
      skip
    }),
    prisma.taskBacklog.count({ where })
  ]);

  return {
    items,
    total,
    page: Number(page) || 1,
    limit: take
  };
}

/**
 * Creates a new backlog item from a note or idea.
 */
async function createBacklogItem(companyId, userId, data = {}) {
  const prisma = getSharedPrismaClient();
  const title = String(data.title || '').trim();
  const description = String(data.description || '').trim();

  if (!title) {
    throw new Error('عنوان عنصر الباك لوج مطلوب');
  }

  const item = await prisma.taskBacklog.create({
    data: {
      companyId,
      title,
      description: description || title,
      source: data.source || 'PRODUCT_NOTE',
      priority: data.priority || 'MEDIUM',
      type: data.type || 'improvement',
      suggestedCategory: data.suggestedCategory || null,
      tags: data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
      status: 'PENDING',
      createdBy: userId,
      assignedTo: data.assignedTo || null
    },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true } }
    }
  });

  return item;
}

/**
 * Converts a backlog item into an actionable Task.
 */
async function convertBacklogItemToTask(companyId, userId, backlogId, overrides = {}) {
  const prisma = getSharedPrismaClient();

  const backlog = await prisma.taskBacklog.findFirst({
    where: { id: backlogId, companyId }
  });

  if (!backlog) {
    throw new Error('عنصر الباك لوج غير موجود');
  }

  if (backlog.status === 'CONVERTED' && backlog.convertedTaskId) {
    const existingTask = await prisma.task.findUnique({ where: { id: backlog.convertedTaskId } });
    if (existingTask) {
      return { backlog, task: existingTask, alreadyConverted: true };
    }
  }

  const assignedTo = overrides.assignedTo || backlog.assignedTo || userId;

  // Create the new Task
  const newTask = await prisma.task.create({
    data: {
      companyId,
      title: overrides.title || backlog.title,
      description: overrides.description || backlog.description,
      priority: overrides.priority || backlog.priority,
      type: overrides.type || backlog.type || 'improvement',
      categoryId: overrides.categoryId || backlog.suggestedCategory || null,
      status: 'PENDING',
      progress: 0,
      createdBy: userId,
      assignedTo: assignedTo,
      tags: backlog.tags || JSON.stringify(['backlog_converted', backlog.type || 'improvement']),
      hasEvidence: false,
      missingEvidence: false,
      returnCount: 0
    }
  });

  // Mark backlog as CONVERTED
  const updatedBacklog = await prisma.taskBacklog.update({
    where: { id: backlog.id },
    data: {
      status: 'CONVERTED',
      convertedTaskId: newTask.id,
      convertedAt: new Date()
    }
  });

  return {
    backlog: updatedBacklog,
    task: newTask,
    alreadyConverted: false
  };
}

/**
 * Calculates daily improvement task quota (at least 1 improvement task per day).
 */
async function getDailyImprovementQuota(companyId, userId) {
  const prisma = getSharedPrismaClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Check tasks of type 'improvement' worked on, created, or completed today
  const improvementTasksToday = await prisma.task.findMany({
    where: {
      companyId,
      assignedTo: userId,
      OR: [
        { type: { in: ['improvement', 'IMPROVEMENT', 'refactor', 'REFACTOR'] } },
        { tags: { contains: 'improvement' } }
      ],
      OR: [
        { createdAt: { gte: startOfToday } },
        { completedDate: { gte: startOfToday } },
        { submittedForReviewAt: { gte: startOfToday } }
      ]
    },
    select: {
      id: true,
      title: true,
      status: true,
      completedDate: true,
      submittedForReviewAt: true,
      createdAt: true
    }
  });

  const count = improvementTasksToday.length;
  const completedCount = improvementTasksToday.filter(t => t.status === 'COMPLETED' || t.status === 'IN_REVIEW').length;

  return {
    required: 1,
    currentCount: count,
    completedCount,
    isMet: count >= 1,
    isCompleted: completedCount >= 1,
    date: startOfToday.toISOString().slice(0, 10),
    tasks: improvementTasksToday
  };
}

/**
 * Proactively suggests backlog items when the user has 0 open tasks.
 */
async function getAutoSuggestions(companyId, userId) {
  const prisma = getSharedPrismaClient();

  // Check how many open tasks the user currently has
  const openTasksCount = await prisma.task.count({
    where: {
      companyId,
      assignedTo: userId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    }
  });

  // Fetch top candidate backlog items
  const suggestedItems = await prisma.taskBacklog.findMany({
    where: {
      companyId,
      status: 'PENDING'
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ],
    take: 5
  });

  return {
    hasOpenTasks: openTasksCount > 0,
    openTasksCount,
    shouldSuggest: openTasksCount === 0,
    reason: openTasksCount === 0
      ? 'ليس لديك أي مهمة قيد التنفيذ حالياً — ننصح باختيار مهمة تحسين من الباك لوج لاستيفاء حصتك اليومية'
      : 'لديك مهام قيد العمل بالفعل',
    suggestions: suggestedItems
  };
}

module.exports = {
  getBacklogItems,
  createBacklogItem,
  convertBacklogItemToTask,
  getDailyImprovementQuota,
  getAutoSuggestions
};
