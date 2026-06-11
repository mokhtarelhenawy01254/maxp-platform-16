const { getSharedPrismaClient } = require('./sharedDatabase');
const { queueTaskWebhook } = require('./taskWebhookService');
const { t } = require('../legacy-ai-agent/aiAgent/i18n');

function getTaskStatusLabel(status) {
    const key = String(status || '').toUpperCase();
    const result = t('task.status.' + key);
    return result !== 'task.status.' + key ? result : t('task.status.fallback');
}

function getTaskPriorityLabel(priority) {
    const key = String(priority || '').toUpperCase();
    const result = t('task.priority.' + key);
    return result !== 'task.priority.' + key ? result : t('task.priority.fallback');
}

function buildUserName(user, fallback) {
    const defaultFallback = t('task.userFallback') || 'المستخدم';
    const actualFallback = fallback || defaultFallback;
    if (!user) return actualFallback;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.name || user.email || actualFallback;
}

function formatDate(value) {
    const fallback = t('task.status.fallback') || 'غير محدد';
    if (!value) return fallback;
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return fallback;
    return dateValue.toLocaleDateString('ar-EG');
}

function normalizeStatusLabel(status) {
    return getTaskStatusLabel(status);
}

function normalizePriorityLabel(priority) {
    return getTaskPriorityLabel(priority);
}

function uniqueUserIds(userIds = []) {
    return [...new Set(userIds.filter(Boolean))];
}

function buildTaskVariables(task, extra = {}) {
    return {
        taskId: task?.id || extra.taskId || '',
        taskTitle: task?.title || extra.taskTitle || 'مهمة',
        dueDate: formatDate(task?.dueDate || extra.dueDate),
        priority: normalizePriorityLabel(task?.priority || extra.priority),
        status: normalizeStatusLabel(task?.status || extra.status),
        ...extra
    };
}

async function createTaskActivitySafe({ taskId, companyId, userId, action, field, oldValue, newValue, description }) {
    if (!taskId || !companyId || !userId) return null;

    try {
        return await getSharedPrismaClient().taskActivity.create({
            data: {
                taskId,
                companyId,
                userId,
                action,
                field: field || null,
                oldValue: oldValue === undefined || oldValue === null ? null : String(oldValue),
                newValue: newValue === undefined || newValue === null ? null : String(newValue),
                description: description || null
            }
        });
    } catch (error) {
        console.error('Error creating task notification activity:', error.message);
        return null;
    }
}

const taskNotificationService = {
    /**
     * Create a notification for a task event
     * @param {Object} options
     * @param {string} options.companyId
     * @param {string} options.taskId
     * @param {string} options.userId - Recipient user ID
     * @param {string} options.type - Notification type (e.g., 'task_assigned', 'task_updated', 'comment_added', 'mention')
     * @param {string} options.title - Notification title
     * @param {string} options.message - Notification message
     * @param {string} options.link - Link to the task
     */
    notify: async (options) => {
        const {
            companyId,
            taskId,
            userId,
            type,
            title,
            message,
            link,
            actorUserId,
            logActivity = false,
            activityDescription
        } = options;
        const prisma = getSharedPrismaClient();

        try {
            const notification = await prisma.taskNotification.create({
                data: {
                    companyId,
                    taskId,
                    userId,
                    type,
                    title,
                    message,
                    link: link || `/tasks/${taskId}`,
                    isRead: false
                }
            });

            if (logActivity && taskId) {
                await createTaskActivitySafe({
                    taskId,
                    companyId,
                    userId: actorUserId || userId,
                    action: 'notification_sent',
                    field: 'in_app',
                    newValue: 'created',
                    description: activityDescription || `تم إرسال إشعار "${title}" إلى مستخدم`
                });
            }

            return notification;
        } catch (error) {
            console.error('Error in taskNotificationService.notify:', error);
            return null;
        }
    },

    /**
     * Notify multipe users (e.g., watchers or team members)
     */
    notifyMany: async (userIds, options) => {
        const promises = uniqueUserIds(userIds).map(userId =>
            taskNotificationService.notify({ ...options, userId })
        );
        return Promise.all(promises);
    },

    getTaskStakeholderIds: async (task, options = {}) => {
        const {
            companyId,
            actorUserId,
            excludeUserIds = [],
            includeAssignee = true,
            includeCreator = true,
            includeWatchers = true,
            additionalUserIds = []
        } = options;

        const excluded = new Set(uniqueUserIds([
            ...(Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds]),
            actorUserId
        ]));

        const recipients = [];
        if (includeAssignee && task?.assignedTo) recipients.push(task.assignedTo);
        if (includeCreator && task?.createdBy) recipients.push(task.createdBy);

        if (includeWatchers && task?.id) {
            try {
                const watchersFromTask = Array.isArray(task.taskWatchers)
                    ? task.taskWatchers.map((watcher) => watcher.userId)
                    : null;
                const watcherIds = watchersFromTask || (await getSharedPrismaClient().taskWatcher.findMany({
                    where: {
                        taskId: task.id,
                        ...(companyId ? { companyId } : {})
                    },
                    select: { userId: true }
                })).map((watcher) => watcher.userId);
                recipients.push(...watcherIds);
            } catch (error) {
                console.error('Error collecting task watchers for notification:', error.message);
            }
        }

        recipients.push(...additionalUserIds);
        return uniqueUserIds(recipients).filter((recipientId) => !excluded.has(recipientId));
    },

    notifyTaskStakeholders: async (options) => {
        const {
            companyId,
            task,
            taskId,
            actorUserId,
            type,
            title,
            message,
            link,
            includeAssignee = true,
            includeCreator = true,
            includeWatchers = true,
            additionalUserIds = [],
            excludeUserIds = [],
            logActivity = false,
            activityDescription
        } = options;

        try {
            const prisma = getSharedPrismaClient();
            const taskRecord = task || await prisma.task.findFirst({
                where: { id: taskId, companyId },
                include: { taskWatchers: { select: { userId: true } } }
            });

            if (!taskRecord) return [];

            const recipients = await taskNotificationService.getTaskStakeholderIds(taskRecord, {
                companyId,
                actorUserId,
                excludeUserIds,
                includeAssignee,
                includeCreator,
                includeWatchers,
                additionalUserIds
            });

            if (recipients.length === 0) return [];

            return taskNotificationService.notifyMany(recipients, {
                companyId,
                taskId: taskRecord.id,
                type,
                title,
                message,
                link: link || `/tasks/${taskRecord.id}`,
                actorUserId,
                logActivity,
                activityDescription
            });
        } catch (error) {
            console.error('Error in taskNotificationService.notifyTaskStakeholders:', error);
            return [];
        }
    },

    askTaskExecution: async ({ companyId, taskId, actorUserId, reason = 'manual' }) => {
        const prisma = getSharedPrismaClient();
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] }
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, phone: true } },
                creator: { select: { id: true, firstName: true, lastName: true } },
                taskWatchers: { select: { userId: true } }
            }
        });

        if (!task || !task.assignedTo) {
            return { success: false, reason: 'task_or_assignee_missing' };
        }

        const reasonLabel = reason === 'overdue'
            ? 'المهمة متأخرة عن موعدها'
            : reason === 'deadline'
                ? 'اقترب موعد تسليم المهمة'
                : 'طلب متابعة من المشرف';

        await taskNotificationService.notify({
            companyId,
            taskId: task.id,
            userId: task.assignedTo,
            type: 'execution_check',
            title: 'متابعة تنفيذ المهمة',
            message: `هل تم تنفيذ المهمة "${task.title}"؟`,
            link: `/tasks/${task.id}`,
            actorUserId: actorUserId || task.assignedTo,
            logActivity: true,
            activityDescription: `تم إرسال سؤال متابعة التنفيذ إلى ${buildUserName(task.assignee)}`
        });

        await taskNotificationService.notifyTaskStakeholders({
            companyId,
            task,
            actorUserId: actorUserId || task.assignedTo,
            type: 'execution_check_sent',
            title: 'تم سؤال منفذ المهمة',
            message: `تم إرسال سؤال متابعة التنفيذ للمنفذ بخصوص المهمة "${task.title}"`,
            includeAssignee: false,
            includeCreator: true,
            includeWatchers: true
        });

        return { success: true, taskId: task.id, assigneeId: task.assignedTo };
    },

    helpers: {
        buildTaskVariables,
        normalizeStatusLabel,
        normalizePriorityLabel,
        formatDate
    }
};

module.exports = taskNotificationService;
