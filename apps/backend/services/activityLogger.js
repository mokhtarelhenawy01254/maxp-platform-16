const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Activity Logger Service
 * Logs all activities for dev tasks
 */

// Activity Types
const ACTIVITY_TYPES = {
    TASK_CREATED: 'TASK_CREATED',
    STATUS_CHANGED: 'STATUS_CHANGED',
    PRIORITY_CHANGED: 'PRIORITY_CHANGED',
    TYPE_CHANGED: 'TYPE_CHANGED',
    ASSIGNEE_CHANGED: 'ASSIGNEE_CHANGED',
    PROJECT_CHANGED: 'PROJECT_CHANGED',
    RELEASE_CHANGED: 'RELEASE_CHANGED',
    DUE_DATE_CHANGED: 'DUE_DATE_CHANGED',
    ESTIMATED_HOURS_CHANGED: 'ESTIMATED_HOURS_CHANGED',
    COMMENT_ADDED: 'COMMENT_ADDED',
    COMMENT_DELETED: 'COMMENT_DELETED',
    ATTACHMENT_ADDED: 'ATTACHMENT_ADDED',
    ATTACHMENT_DELETED: 'ATTACHMENT_DELETED',
    TIMER_STARTED: 'TIMER_STARTED',
    TIMER_STOPPED: 'TIMER_STOPPED',
    TIMER_PAUSED: 'TIMER_PAUSED',
    TIMER_RESUMED: 'TIMER_RESUMED',
    CHECKLIST_CREATED: 'CHECKLIST_CREATED',
    CHECKLIST_ITEM_ADDED: 'CHECKLIST_ITEM_ADDED',
    CHECKLIST_ITEM_COMPLETED: 'CHECKLIST_ITEM_COMPLETED',
    CHECKLIST_ITEM_UNCOMPLETED: 'CHECKLIST_ITEM_UNCOMPLETED',
    CHECKLIST_ITEM_DELETED: 'CHECKLIST_ITEM_DELETED',
    SUBTASK_CREATED: 'SUBTASK_CREATED',
    WATCHER_ADDED: 'WATCHER_ADDED',
    WATCHER_REMOVED: 'WATCHER_REMOVED',
    TASK_DUPLICATED: 'TASK_DUPLICATED',
    TASK_ESCALATED: 'TASK_ESCALATED'
};

// Arabic descriptions for activities
const ACTIVITY_DESCRIPTIONS = {
    TASK_CREATED: 'أنشأ المهمة',
    STATUS_CHANGED: 'غيّر الحالة',
    PRIORITY_CHANGED: 'غيّر الأولوية',
    TYPE_CHANGED: 'غيّر النوع',
    ASSIGNEE_CHANGED: 'غيّر المسؤول',
    PROJECT_CHANGED: 'غيّر المشروع',
    RELEASE_CHANGED: 'غيّر الإصدار',
    DUE_DATE_CHANGED: 'غيّر تاريخ الاستحقاق',
    ESTIMATED_HOURS_CHANGED: 'غيّر الساعات المقدرة',
    COMMENT_ADDED: 'أضاف تعليق',
    COMMENT_DELETED: 'حذف تعليق',
    ATTACHMENT_ADDED: 'أضاف مرفق',
    ATTACHMENT_DELETED: 'حذف مرفق',
    TIMER_STARTED: 'بدأ العمل',
    TIMER_STOPPED: 'أوقف العمل',
    TIMER_PAUSED: 'أوقف العمل مؤقتاً',
    TIMER_RESUMED: 'استأنف العمل',
    CHECKLIST_CREATED: 'أنشأ قائمة تحقق',
    CHECKLIST_ITEM_ADDED: 'أضاف عنصر للقائمة',
    CHECKLIST_ITEM_COMPLETED: 'أكمل عنصر',
    CHECKLIST_ITEM_UNCOMPLETED: 'ألغى إكمال عنصر',
    CHECKLIST_ITEM_DELETED: 'حذف عنصر من القائمة',
    SUBTASK_CREATED: 'أنشأ مهمة فرعية',
    WATCHER_ADDED: 'أضاف مراقب',
    WATCHER_REMOVED: 'أزال مراقب',
    TASK_DUPLICATED: 'كرّر المهمة',
    TASK_ESCALATED: 'تم تصعيد المهمة'
};

/**
 * Log an activity for a task
 * @param {string} taskId - Task ID
 * @param {string} memberId - Member ID who performed the action
 * @param {string} action - Action type from ACTIVITY_TYPES
 * @param {object} options - Additional options
 * @param {string} options.field - Field that changed
 * @param {string} options.oldValue - Old value
 * @param {string} options.newValue - New value
 * @param {string} options.description - Custom description (optional)
 */
async function logActivity(taskId, memberId, action, options = {}) {
    try {
        const prisma = getSharedPrismaClient();

        // Build description
        let description = options.description || ACTIVITY_DESCRIPTIONS[action] || action;

        // Add field-specific details if provided
        if (options.field && options.oldValue && options.newValue) {
            description = `${description}`;
        }

        const activity = await prisma.devTaskActivity.create({
            data: {
                taskId,
                memberId,
                action,
                field: options.field || null,
                oldValue: options.oldValue || null,
                newValue: options.newValue || null,
                description
            }
        });

        console.log(`📝 [ACTIVITY] Logged: ${description} for task ${taskId.slice(0, 8)}`);
        return activity;
    } catch (error) {
        console.error('❌ [ACTIVITY] Error logging activity:', error);
        // Don't throw - activity logging should not break the main operation
        return null;
    }
}

/**
 * Log task creation
 */
async function logTaskCreated(taskId, memberId, taskTitle) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.TASK_CREATED, {
        description: `أنشأ المهمة "${taskTitle}"`
    });
}

/**
 * Log status change
 */
async function logStatusChange(taskId, memberId, oldStatus, newStatus) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.STATUS_CHANGED, {
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus
    });
}

/**
 * Log priority change
 */
async function logPriorityChange(taskId, memberId, oldPriority, newPriority) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.PRIORITY_CHANGED, {
        field: 'priority',
        oldValue: oldPriority,
        newValue: newPriority
    });
}

/**
 * Log assignee change
 */
async function logAssigneeChange(taskId, memberId, oldAssigneeName, newAssigneeName) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.ASSIGNEE_CHANGED, {
        field: 'assignee',
        oldValue: oldAssigneeName || 'غير محدد',
        newValue: newAssigneeName || 'غير محدد'
    });
}

/**
 * Log comment added
 */
async function logCommentAdded(taskId, memberId) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.COMMENT_ADDED);
}

/**
 * Log attachment added
 */
async function logAttachmentAdded(taskId, memberId, fileName) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.ATTACHMENT_ADDED, {
        description: `أضاف مرفق "${fileName}"`
    });
}

/**
 * Log attachment deleted
 */
async function logAttachmentDeleted(taskId, memberId, fileName) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.ATTACHMENT_DELETED, {
        description: `حذف مرفق "${fileName}"`
    });
}

/**
 * Log timer started
 */
async function logTimerStarted(taskId, memberId) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.TIMER_STARTED);
}

/**
 * Log timer stopped
 */
async function logTimerStopped(taskId, memberId, durationMinutes) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.TIMER_STOPPED, {
        description: `أوقف العمل (المدة: ${durationMinutes} دقيقة)`
    });
}

/**
 * Log checklist created
 */
async function logChecklistCreated(taskId, memberId, checklistTitle) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.CHECKLIST_CREATED, {
        description: `أنشأ قائمة تحقق "${checklistTitle}"`
    });
}

/**
 * Log checklist item completed
 */
async function logChecklistItemCompleted(taskId, memberId, itemContent, isCompleted) {
    const action = isCompleted ? ACTIVITY_TYPES.CHECKLIST_ITEM_COMPLETED : ACTIVITY_TYPES.CHECKLIST_ITEM_UNCOMPLETED;
    const desc = isCompleted ? `أكمل عنصر: "${itemContent}"` : `ألغى إكمال عنصر: "${itemContent}"`;

    return logActivity(taskId, memberId, action, {
        description: desc
    });
}

/**
 * Log subtask created
 */
async function logSubtaskCreated(taskId, memberId, subtaskTitle) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.SUBTASK_CREATED, {
        description: `أنشأ مهمة فرعية "${subtaskTitle}"`
    });
}

/**
 * Log multiple field changes (for bulk updates)
 */
async function logFieldChanges(taskId, memberId, changes) {
    const promises = [];

    for (const [field, change] of Object.entries(changes)) {
        // ملاحظة: القيم دي بتتغيّر جوه الـswitch (تحويل IDs لأسماء أعضاء/مشاريع/إصدارات)،
        // فمينفعش تكون const مفكوكة من الحلقة — كان بيعمل TypeError: Assignment to constant variable
        // وبيتبلع في الـcatch فبيتسجّل الـID الخام بدل الاسم.
        let oldValue = change?.oldValue;
        let newValue = change?.newValue;
        if (oldValue !== newValue) {
            let action = null;

            switch (field) {
                case 'status':
                    action = ACTIVITY_TYPES.STATUS_CHANGED;
                    break;
                case 'priority':
                    action = ACTIVITY_TYPES.PRIORITY_CHANGED;
                    break;
                case 'type':
                    action = ACTIVITY_TYPES.TYPE_CHANGED;
                    break;
                case 'assigneeId':
                    action = ACTIVITY_TYPES.ASSIGNEE_CHANGED;
                    // Resolve names for assignee change
                    try {
                        const prisma = getSharedPrismaClient();
                        const [oldMember, newMember] = await Promise.all([
                            oldValue ? prisma.devTeamMember.findUnique({ where: { id: oldValue }, include: { user: true } }) : null,
                            newValue ? prisma.devTeamMember.findUnique({ where: { id: newValue }, include: { user: true } }) : null
                        ]);
                        oldValue = oldMember ? `${oldMember.user.firstName} ${oldMember.user.lastName}` : 'غير محدد';
                        newValue = newMember ? `${newMember.user.firstName} ${newMember.user.lastName}` : 'غير محدد';
                    } catch (e) { console.error('Failed to resolve assignee names', e); }
                    break;
                case 'projectId':
                    action = ACTIVITY_TYPES.PROJECT_CHANGED;
                    try {
                        const prisma = getSharedPrismaClient();
                        const [oldProject, newProject] = await Promise.all([
                            oldValue ? prisma.devProject.findUnique({ where: { id: oldValue } }) : null,
                            newValue ? prisma.devProject.findUnique({ where: { id: newValue } }) : null
                        ]);
                        oldValue = oldProject?.name || 'غير محدد';
                        newValue = newProject?.name || 'غير محدد';
                    } catch (e) { }
                    break;
                case 'releaseId':
                    action = ACTIVITY_TYPES.RELEASE_CHANGED;
                    try {
                        const prisma = getSharedPrismaClient();
                        const [oldRelease, newRelease] = await Promise.all([
                            oldValue ? prisma.devRelease.findUnique({ where: { id: oldValue } }) : null,
                            newValue ? prisma.devRelease.findUnique({ where: { id: newValue } }) : null
                        ]);
                        oldValue = oldRelease?.version || 'غير محدد';
                        newValue = newRelease?.version || 'غير محدد';
                    } catch (e) { }
                    break;
                case 'dueDate':
                    action = ACTIVITY_TYPES.DUE_DATE_CHANGED;
                    break;
                case 'estimatedHours':
                    action = ACTIVITY_TYPES.ESTIMATED_HOURS_CHANGED;
                    break;
            }

            if (action) {
                promises.push(
                    logActivity(taskId, memberId, action, {
                        field,
                        oldValue: String(oldValue || ''),
                        newValue: String(newValue || '')
                    })
                );
            }
        }
    }

    return Promise.all(promises);
}

/**
 * Log task escalation
 */
async function logTaskEscalated(taskId, memberId, fromUserId, toUserId, reason) {
    return logActivity(taskId, memberId, ACTIVITY_TYPES.TASK_ESCALATED, {
        description: `تم تصعيد المهمة تلقائياً: ${reason}`,
        field: 'assigneeId',
        oldValue: fromUserId,
        newValue: toUserId
    });
}

module.exports = {
    ACTIVITY_TYPES,
    ACTIVITY_DESCRIPTIONS,
    logActivity,
    logTaskCreated,
    logStatusChange,
    logPriorityChange,
    logAssigneeChange,
    logCommentAdded,
    logAttachmentAdded,
    logAttachmentDeleted,
    logTimerStarted,
    logTimerStopped,
    logChecklistCreated,
    logChecklistItemCompleted,
    logSubtaskCreated,
    logTaskEscalated,
    logFieldChanges
};
