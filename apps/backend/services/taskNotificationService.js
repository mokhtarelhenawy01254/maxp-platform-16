const { getSharedPrismaClient } = require('./sharedDatabase');
const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
const { queueTaskWebhook } = require('./taskWebhookService');
const { t } = require('./i18n');

function getTaskStatusLabel(status) {
    const key = String(status || '').toUpperCase();
    if (key === 'IN_REVIEW' || key === 'PENDING_REVIEW') return 'قيد المراجعة والاعتماد';
    if (key === 'COMPLETED') return 'مكتملة ومعتمدة';
    if (key === 'IN_PROGRESS') return 'قيد التنفيذ';
    if (key === 'TODO' || key === 'PENDING') return 'قيد الانتظار';
    if (key === 'CANCELLED') return 'ملغاة';
    const result = t('task.status.' + key);
    return result !== 'task.status.' + key ? result : t('task.status.fallback');
}

function getTaskPriorityLabel(priority) {
    const key = String(priority || '').toUpperCase();
    const result = t('task.priority.' + key);
    return result !== 'task.priority.' + key ? result : t('task.priority.fallback');
}

function getExecutionResponseLabel(response) {
    const key = String(response || '');
    const result = t('task.execution.' + key);
    return result !== 'task.execution.' + key ? result : key;
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

function normalizePhoneForCompare(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
    if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
        cleaned = `20${cleaned.slice(1)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = `20${cleaned}`;
    } else if (cleaned.length === 10 && !cleaned.startsWith('2')) {
        cleaned = `20${cleaned}`;
    }
    return cleaned;
}

function phoneFromJid(remoteJid) {
    return normalizePhoneForCompare(String(remoteJid || '').split('@')[0]);
}

async function findUserByWhatsAppJid(companyId, remoteJid) {
    const normalizedPhone = phoneFromJid(remoteJid);
    if (!normalizedPhone) return null;

    const users = await getSharedPrismaClient().user.findMany({
        where: {
            companyId,
            isActive: true,
            phone: { not: null }
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
        }
    });

    return users.find((user) => normalizePhoneForCompare(user.phone) === normalizedPhone) || null;
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
     * @param {Object} options.whatsappData - Data for WhatsApp notification (optional)
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
            whatsappData,
            actorUserId,
            logActivity = false,
            activityDescription
        } = options;
        const prisma = getSharedPrismaClient();

        try {
            // 1. Create In-App Notification
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

            // 2. Trigger WhatsApp Notification if requested and data provided
            let whatsappResult = null;

            if (whatsappData) {
                // Fetch recipient user details (phone)
                const recipient = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { phone: true, firstName: true, lastName: true, email: true }
                });

                if (recipient && recipient.phone) {
                    whatsappResult = await WhatsAppNotificationService.sendNotification({
                        companyId,
                        recipientPhone: recipient.phone,
                        recipientName: buildUserName(recipient),
                        recipientType: 'EMPLOYEE',
                        category: 'TASKS',
                        eventType: whatsappData.templateName || whatsappData.eventType || 'TASK_UPDATED',
                        variables: {
                            userName: recipient.firstName || buildUserName(recipient),
                            taskTitle: whatsappData.taskTitle || 'مهمة جديدة',
                            ...whatsappData.variables
                        },
                        contentOverride: whatsappData.contentOverride,
                        buttons: whatsappData.buttons || null
                    });
                }
            }

            // 3. Dispatch Push Notification (FCM mobile & Web Push) respecting user preferences
            try {
                const { sendBrowserPushToUser } = require('./browserPushService');
                void sendBrowserPushToUser({
                    companyId,
                    userId,
                    typeId: type || 'task_assigned',
                    title: title || 'إشعار مهمة جديد',
                    body: message || 'تم تحديث تفاصيل المهمة',
                    compactBody: title || 'إشعار مهمة',
                    url: link || `/tasks/${taskId}`,
                    data: {
                        source: 'task_notification',
                        taskId,
                        typeId: type || 'task_assigned',
                    },
                }).catch((pushErr) => {
                    console.warn('⚠️ [PUSH-TASK] Failed to dispatch task push:', pushErr?.message || pushErr);
                });
            } catch (pushImportErr) {
                console.warn('⚠️ [PUSH-TASK] Bootstrap error:', pushImportErr?.message || pushImportErr);
            }

            if (logActivity && taskId) {
                await createTaskActivitySafe({
                    taskId,
                    companyId,
                    userId: actorUserId || userId,
                    action: 'notification_sent',
                    field: whatsappData ? 'whatsapp' : 'in_app',
                    newValue: whatsappResult
                        ? (whatsappResult.success ? 'sent' : whatsappResult.reason || 'failed')
                        : 'created',
                    description: activityDescription || `تم إرسال إشعار "${title}" إلى مستخدم`
                });
            }

            return notification;
        } catch (error) {
            console.error('Error in taskNotificationService.notify:', error);
            // We don't want to break the main flow if notification fails
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
            whatsappData,
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
                whatsappData,
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
            whatsappData: {
                templateName: 'TASK_EXECUTION_CHECK',
                taskTitle: task.title,
                variables: buildTaskVariables(task, { reason: reasonLabel }),
                buttons: [
                    { id: 'task_done_{taskId}', text: 'تم التنفيذ' },
                    { id: 'task_not_done_{taskId}', text: 'لم يتم بعد' },
                    { id: 'task_blocked_{taskId}', text: 'توجد مشكلة' }
                ]
            },
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
            includeWatchers: true,
            whatsappData: {
                templateName: 'TASK_EXECUTION_CHECK_SENT',
                taskTitle: task.title,
                variables: buildTaskVariables(task, {
                    assigneeName: buildUserName(task.assignee),
                    reason: reasonLabel
                })
            }
        });

        return { success: true, taskId: task.id, assigneeId: task.assignedTo };
    },

    handleExecutionResponse: async ({ companyId, taskId, remoteJid, response, source = 'whatsapp_button' }) => {
        const prisma = getSharedPrismaClient();
        const task = await prisma.task.findFirst({
            where: { id: taskId, companyId },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, phone: true } },
                creator: { select: { id: true, firstName: true, lastName: true } },
                taskWatchers: { select: { userId: true } }
            }
        });

        if (!task) {
            return { success: false, reason: 'task_not_found' };
        }

        const responder = await findUserByWhatsAppJid(companyId, remoteJid);
        const remotePhone = phoneFromJid(remoteJid);
        const assigneePhone = normalizePhoneForCompare(task.assignee?.phone);

        if (responder && responder.id !== task.assignedTo) {
            console.warn(`⚠️ [TASK-WA] Ignoring execution response for task ${task.id}: responder is not assignee`);
            return { success: false, reason: 'responder_not_assignee' };
        }

        if (!responder && (!assigneePhone || remotePhone !== assigneePhone)) {
            console.warn(`⚠️ [TASK-WA] Ignoring execution response for task ${task.id}: sender phone does not match assignee`);
            return { success: false, reason: 'sender_not_assignee' };
        }

        const responderId = responder?.id || task.assignedTo;
        const oldStatus = task.status;
        let nextStatus = task.status;
        let updateData = {};

        if (response === 'done') {
            // سد الباب الخلفي: تحويل إلى IN_REVIEW بدلاً من COMPLETED المباشر للحفاظ على بوابات التسليم والاعتماد
            nextStatus = 'IN_REVIEW';
            const hasEvidenceAlready = Boolean(task.hasEvidence || task.evidence);
            updateData = {
                status: nextStatus,
                progress: 100,
                submittedForReviewAt: new Date(),
                missingEvidence: !hasEvidenceAlready
            };
        } else if (response === 'blocked') {
            nextStatus = 'ON_HOLD';
            updateData = {
                status: nextStatus
            };
        } else {
            nextStatus = task.status === 'PENDING' ? 'IN_PROGRESS' : task.status;
            updateData = {
                status: nextStatus
            };
        }

        const updatedTask = await prisma.task.update({
            where: { id: task.id },
            data: updateData,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
                creator: { select: { id: true, firstName: true, lastName: true } },
                taskWatchers: { select: { userId: true } }
            }
        });

        const responseLabel = getExecutionResponseLabel(response);
        const responderName = buildUserName(responder || task.assignee, 'منفذ المهمة');

        await createTaskActivitySafe({
            taskId: task.id,
            companyId,
            userId: responderId,
            action: 'whatsapp_execution_response',
            field: 'status',
            oldValue: oldStatus,
            newValue: nextStatus,
            description: `${responderName} رد على سؤال التنفيذ عبر واتساب: ${responseLabel}`
        });

        await taskNotificationService.notifyTaskStakeholders({
            companyId,
            task: updatedTask,
            actorUserId: responderId,
            type: 'execution_response',
            title: 'رد منفذ المهمة',
            message: `${responderName} رد على المهمة "${task.title}": ${responseLabel}`,
            includeAssignee: false,
            includeCreator: true,
            includeWatchers: true,
            whatsappData: {
                templateName: 'TASK_EXECUTION_RESPONSE',
                taskTitle: task.title,
                variables: buildTaskVariables(updatedTask, {
                    responderName,
                    response: responseLabel,
                    oldStatus: normalizeStatusLabel(oldStatus),
                    newStatus: normalizeStatusLabel(nextStatus)
                })
            }
        });

        queueTaskWebhook('task.status_changed', {
            companyId,
            actorUserId: responderId,
            task: updatedTask,
            previousTask: task,
            source
        });

        return {
            success: true,
            taskId: task.id,
            response,
            status: nextStatus
        };
    },

    helpers: {
        buildTaskVariables,
        normalizeStatusLabel,
        normalizePriorityLabel,
        formatDate
    }
};

module.exports = taskNotificationService;
