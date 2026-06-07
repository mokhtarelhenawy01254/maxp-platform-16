const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const taskNotificationService = require('../services/taskNotificationService');

/**
 * Start the task execution check scheduler
 * Runs periodically during work hours to check on IN_PROGRESS tasks
 */
function startTaskExecutionCheckScheduler() {
    console.log('🔄 [TASK-EXECUTION-CHECK-CRON] Initializing Task Execution Check Cron Service...');

    // Runs every 4 hours during work hours (8 AM - 8 PM): 8, 12, 16, 20
    // Cron: minute hour dayOfMonth month dayOfWeek
    cron.schedule('0 8,12,16,20 * * *', async () => {
        console.log('🔄 [TASK-EXECUTION-CHECK-CRON] Checking IN_PROGRESS tasks for execution status...');
        const prisma = getSharedPrismaClient();

        try {
            const now = new Date();
            const activeStatuses = ['IN_PROGRESS'];

            // Find tasks that are IN_PROGRESS and haven't had an execution check in the last 4 hours
            // We'll check task activities to see if there was a recent 'execution_check_sent' activity
            const tasks = await prisma.task.findMany({
                where: {
                    status: { in: activeStatuses },
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
                    taskWatchers: { select: { userId: true } },
                    taskActivities: {
                        where: {
                            action: 'notification_sent',
                            field: 'whatsapp',
                            createdAt: {
                                gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) // Last 4 hours
                            }
                        },
                        take: 1,
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            console.log(`🔄 [TASK-EXECUTION-CHECK-CRON] Found ${tasks.length} IN_PROGRESS tasks.`);

            let checksSent = 0;
            for (const task of tasks) {
                if (!task.assignedTo) continue;

                // Skip if there was a recent execution check (within last 4 hours)
                const recentCheck = task.taskActivities.find(
                    a => a.description && a.description.includes('سؤال متابعة التنفيذ')
                );
                if (recentCheck) {
                    console.log(`🔄 [TASK-EXECUTION-CHECK-CRON] Skipping task ${task.id} - recent execution check found`);
                    continue;
                }

                // Ask for execution status
                await taskNotificationService.askTaskExecution({
                    companyId: task.companyId,
                    taskId: task.id,
                    actorUserId: task.assignedTo,
                    reason: 'periodic'
                });

                checksSent++;
            }

            console.log(`✅ [TASK-EXECUTION-CHECK-CRON] Sent ${checksSent} execution check reminders.`);

        } catch (error) {
            console.error('❌ [TASK-EXECUTION-CHECK-CRON] Error in task execution check cron:', error);
        }
    });

    console.log('✅ [TASK-EXECUTION-CHECK-CRON] Task execution check scheduler started (runs at 8AM, 12PM, 4PM, 8PM)');
}

module.exports = { startTaskExecutionCheckScheduler };