const cron = require("node-cron");
const recurringTaskService = require("../services/recurringTaskService");

/**
 * Start the recurring tasks generation cron service
 */
function startRecurringTaskScheduler() {
  console.log("🔁 [RECURRING-TASK-CRON] Initializing Recurring Task Cron Service...");

  // Run daily at 00:05 (5 minutes after midnight)
  cron.schedule("5 0 * * *", async () => {
    console.log("🔁 [RECURRING-TASK-CRON] Running daily check for recurring tasks...");
    try {
      const result = await recurringTaskService.processScheduledRecurringTasks();
      console.log("🔁 [RECURRING-TASK-CRON] Finished recurring tasks check:", result);
    } catch (error) {
      console.error("❌ [RECURRING-TASK-CRON] Error running recurring task cron:", error);
    }
  });
}

module.exports = { startRecurringTaskScheduler };
