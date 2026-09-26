const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const taskNotificationService = require('../services/taskNotificationService');

/**
 * Start the task deadline checking service
 */
function startTaskDeadlineScheduler() {
    console.log('⏰ [TASK-DEADLINE-CRON] Initializing Task Deadline Cron Service...');

    // Runs every 2 hours
    cron.schedule('0 */2 * * *', async () => {
        console.log('⏰ [TASK-DEADLINE-CRON] Checking for approaching deadlines...');
        const prisma = getSharedPrismaClient();

        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 59, 999);

            const now = new Date();

            // Statuses subject to approaching-deadline reminders (24-48h window):
            // - PENDING & IN_PROGRESS: assignee actively working; ping assignee and stakeholders.
            // - IN_REVIEW: assignee finished and submitted; notify reviewers/stakeholders only (assignee is done).
            // - ON_HOLD: parked tasks should still alert stakeholders and assignee so they are not forgotten.
            const APPROACHING_DEADLINE_STATUSES = ['PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'ON_HOLD'];

            // Statuses subject to overdue tracking (past due date):
            // - PENDING & IN_PROGRESS: overdue execution; ask assignee for status + notify stakeholders.
            // - IN_REVIEW: overdue review/approval; notify approvers & stakeholders only (do NOT harass assignee).
            // - ON_HOLD: overdue parked task; notify stakeholders without nudging assignee.
            const OVERDUE_STATUSES = ['PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'ON_HOLD'];

            // Fetch tasks that are:
            // 1. In active / pending review / on-hold status
            // 2. Due within the next 24-48 hours
            const tasks = await prisma.task.findMany({
                where: {
                    status: { in: APPROACHING_DEADLINE_STATUSES },
                    dueDate: {
                        gt: now,
                        lte: tomorrow
                    }
                },
                include: {
                    assignee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true
                        }
                    },
                    taskWatchers: { select: { userId: true } }
                }
            });

            console.log(`⏰ [TASK-DEADLINE-CRON] Found ${tasks.length} tasks approaching deadline.`);

            for (const task of tasks) {
                const isReview = task.status === 'IN_REVIEW';
                const isOnHold = task.status === 'ON_HOLD';

                // For PENDING, IN_PROGRESS, and ON_HOLD: remind assignee if present
                if (task.assignedTo && !isReview) {
                    await taskNotificationService.notify({
                        companyId: task.companyId,
                        taskId: task.id,
                        userId: task.assignedTo,
                        type: 'deadline_approaching',
                        title: isOnHold ? 'تنبيه: اقتراب موعد استحقاق مهمة معلّقة' : 'تنبيه: اقتراب موعد التسليم',
                        message: isOnHold
                            ? `المهمة المعلّقة "${task.title}" تقترب من موعد استحقاقها (${new Date(task.dueDate).toLocaleDateString('ar-EG')})`
                            : `المهمة "${task.title}" تقترب من موعد استحقاقها (${new Date(task.dueDate).toLocaleDateString('ar-EG')})`,
                        whatsappData: {
                            templateName: 'TASK_DEADLINE_REMINDER',
                            taskTitle: task.title,
                            variables: {
                                ...taskNotificationService.helpers.buildTaskVariables(task),
                                dueDate: new Date(task.dueDate).toLocaleDateString('ar-EG')
                            }
                        },
                        actorUserId: task.assignedTo,
                        logActivity: true,
                        activityDescription: 'تم إرسال تذكير واتساب باقتراب موعد التسليم'
                    });
                }

                // Notify reviewers / stakeholders
                const stakeholderTitle = isReview
                    ? 'تنبيه: اقتراب موعد اعتماد مهمة قيد المراجعة'
                    : isOnHold
                        ? 'تنبيه: مهمة معلّقة تقترب من موعدها'
                        : 'تنبيه: اقتراب موعد تسليم مهمة';

                const stakeholderMsg = isReview
                    ? `المهمة "${task.title}" بانتظار الاعتماد وتقترب من موعد استحقاقها (${new Date(task.dueDate).toLocaleDateString('ar-EG')})`
                    : isOnHold
                        ? `المهمة المعلّقة "${task.title}" تقترب من موعد استحقاقها (${new Date(task.dueDate).toLocaleDateString('ar-EG')})`
                        : `المهمة "${task.title}" تقترب من موعد استحقاقها (${new Date(task.dueDate).toLocaleDateString('ar-EG')})`;

                await taskNotificationService.notifyTaskStakeholders({
                    companyId: task.companyId,
                    task,
                    actorUserId: task.assignedTo || task.createdBy,
                    type: 'deadline_approaching',
                    title: stakeholderTitle,
                    message: stakeholderMsg,
                    includeAssignee: false,
                    includeCreator: true,
                    includeWatchers: true,
                    whatsappData: {
                        templateName: 'TASK_DEADLINE_REMINDER',
                        taskTitle: task.title,
                        variables: taskNotificationService.helpers.buildTaskVariables(task)
                    },
                    logActivity: true,
                    activityDescription: 'تم إرسال تذكير واتساب للمراقبين باقتراب موعد التسليم'
                });
            }

            const overdueTasks = await prisma.task.findMany({
                where: {
                    status: { in: OVERDUE_STATUSES },
                    dueDate: {
                        lt: now
                    }
                },
                include: {
                    assignee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true
                        }
                    },
                    creator: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    taskWatchers: { select: { userId: true } }
                }
            });

            console.log(`⏰ [TASK-DEADLINE-CRON] Found ${overdueTasks.length} overdue tasks.`);

            for (const task of overdueTasks) {
                const isReview = task.status === 'IN_REVIEW';
                const isOnHold = task.status === 'ON_HOLD';

                // ONLY ask assignee for execution status if actively executing (PENDING / IN_PROGRESS).
                // If IN_REVIEW, the assignee has already submitted their work; the reviewer is on the clock.
                // If ON_HOLD, the task is intentionally parked; do not harass assignee.
                if (!isReview && !isOnHold && task.assignedTo) {
                    await taskNotificationService.askTaskExecution({
                        companyId: task.companyId,
                        taskId: task.id,
                        actorUserId: task.assignedTo,
                        reason: 'overdue'
                    });
                }

                const overdueTitle = isReview
                    ? 'مهمة بانتظار الاعتماد متأخرة'
                    : isOnHold
                        ? 'مهمة معلّقة متأخرة'
                        : 'مهمة متأخرة';

                const overdueMsg = isReview
                    ? `المهمة "${task.title}" متأخرة عن موعدها وهي بانتظار المراجعة والاعتماد من الإدارة`
                    : isOnHold
                        ? `المهمة "${task.title}" في حالة تعليق وتجاوزت موعد استحقاقها`
                        : `المهمة "${task.title}" متأخرة عن موعدها وتم سؤال المنفذ عن موقف التنفيذ`;

                await taskNotificationService.notifyTaskStakeholders({
                    companyId: task.companyId,
                    task,
                    actorUserId: task.assignedTo || task.createdBy,
                    type: 'task_overdue',
                    title: overdueTitle,
                    message: overdueMsg,
                    includeAssignee: false,
                    includeCreator: true,
                    includeWatchers: true,
                    whatsappData: {
                        templateName: 'TASK_OVERDUE',
                        taskTitle: task.title,
                        variables: taskNotificationService.helpers.buildTaskVariables(task)
                    },
                    logActivity: true,
                    activityDescription: isReview
                        ? 'تم إرسال إشعار للمراقبين بتأخر اعتماد المهمة'
                        : isOnHold
                            ? 'تم إرسال إشعار للمراقبين بتأخر المهمة المعلّقة'
                            : 'تم إرسال إشعار للمراقبين بتأخر المهمة وسؤال المنفذ'
                });
            }

            console.log('✅ [TASK-DEADLINE-CRON] Finished processing deadline notifications.');

        } catch (error) {
            console.error('❌ [TASK-DEADLINE-CRON] Error in task deadline cron:', error);
        }
    });

    console.log('✅ [TASK-DEADLINE-CRON] Task deadline scheduler started (runs daily at 9:00 AM)');
}

module.exports = { startTaskDeadlineScheduler };
