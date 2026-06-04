const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const taskNotificationService = require('../services/taskNotificationService');

/**
 * Start the task deadline checking service
 */
function startTaskDeadlineScheduler() {
    console.log('⏰ [TASK-DEADLINE-CRON] Initializing Task Deadline Cron Service...');

    // Runs every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ [TASK-DEADLINE-CRON] Checking for approaching deadlines...');
        const prisma = getSharedPrismaClient();

        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 59, 999);

            const now = new Date();
            const activeStatuses = ['PENDING', 'IN_PROGRESS'];

            // Fetch tasks that are:
            // 1. Not completed or cancelled
            // 2. Due within the next 24-48 hours
            // 3. Haven't been notified for deadline yet (optional, but good)
            const tasks = await prisma.task.findMany({
                where: {
                    status: { in: activeStatuses },
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
                if (!task.assignedTo) continue;

                await taskNotificationService.notify({
                    companyId: task.companyId,
                    taskId: task.id,
                    userId: task.assignedTo,
                    type: 'deadline_approaching',
                    title: 'تنبيه: اقتراب موعد التسليم',
                    message: `المهمة "${task.title}" تقترب من موعد استحقاقها (${new Date(task.dueDate).toLocaleDateString('ar-EG')})`,
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

            const overdueTasks = await prisma.task.findMany({
                where: {
                    status: { in: activeStatuses },
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
                await taskNotificationService.askTaskExecution({
                    companyId: task.companyId,
                    taskId: task.id,
                    actorUserId: task.assignedTo,
                    reason: 'overdue'
                });

                await taskNotificationService.notifyTaskStakeholders({
                    companyId: task.companyId,
                    task,
                    actorUserId: task.assignedTo,
                    type: 'task_overdue',
                    title: 'مهمة متأخرة',
                    message: `المهمة "${task.title}" متأخرة عن موعدها وتم سؤال المنفذ عن موقف التنفيذ`,
                    includeAssignee: false,
                    includeCreator: true,
                    includeWatchers: true,
                    whatsappData: {
                        templateName: 'TASK_OVERDUE',
                        taskTitle: task.title,
                        variables: taskNotificationService.helpers.buildTaskVariables(task)
                    },
                    logActivity: true,
                    activityDescription: 'تم إرسال إشعار للمراقبين بتأخر المهمة وسؤال المنفذ'
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
