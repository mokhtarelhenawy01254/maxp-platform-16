const cron = require("node-cron");
const facebookAdsBudgetAlertService = require("../services/facebookAdsBudgetAlertService");

let schedulerTask = null;
let isTickRunning = false;

const start = () => {
  if (schedulerTask) {
    return schedulerTask;
  }

  if (process.env.FACEBOOK_ADS_BUDGET_ALERT_CRON === "false") {
    console.log("ℹ️ [ADS-BUDGET-ALERT-CRON] Disabled by environment");
    return null;
  }

  schedulerTask = cron.schedule("*/15 * * * *", async () => {
    if (isTickRunning) {
      console.log("⚠️ [ADS-BUDGET-ALERT-CRON] Previous check still running, skipping");
      return;
    }

    isTickRunning = true;
    try {
      const result = await facebookAdsBudgetAlertService.runDueRules({ limit: 150 });
      if (result.checked > 0 || result.delivered > 0) {
        console.log(
          `✅ [ADS-BUDGET-ALERT-CRON] Checked ${result.checked}, triggered ${result.triggered}, delivered ${result.delivered}`,
        );
      }
    } catch (error) {
      console.error("❌ [ADS-BUDGET-ALERT-CRON] Check failed:", error);
    } finally {
      isTickRunning = false;
    }
  });

  console.log(
    "✅ [ADS-BUDGET-ALERT-CRON] Started (checks every 15 minutes)",
  );
  return schedulerTask;
};

const stop = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }
};

module.exports = {
  start,
  stop,
};
