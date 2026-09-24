const cron = require("node-cron");
const stockAndTargetAlertService = require("../services/stockAndTargetAlertService");

let schedulerTask = null;
let isTickRunning = false;

const start = () => {
  if (schedulerTask) {
    return schedulerTask;
  }

  if (process.env.STOCK_TARGET_ALERT_CRON === "false") {
    console.log("ℹ️ [STOCK-TARGET-ALERT-CRON] Disabled by environment");
    return null;
  }

  // Run every 30 minutes
  schedulerTask = cron.schedule("*/30 * * * *", async () => {
    if (isTickRunning) {
      console.log("⚠️ [STOCK-TARGET-ALERT-CRON] Previous check still running, skipping");
      return;
    }

    isTickRunning = true;
    try {
      const result = await stockAndTargetAlertService.runDueChecks();
      if (result.targetAlertsSent > 0 || result.stockAlertsSent > 0) {
        console.log(
          `✅ [STOCK-TARGET-ALERT-CRON] Checked ${result.checkedCompanies} companies. Sent: ${result.targetAlertsSent} target alerts, ${result.stockAlertsSent} stock alerts.`,
        );
      }
    } catch (error) {
      console.error("❌ [STOCK-TARGET-ALERT-CRON] Check execution failed:", error);
    } finally {
      isTickRunning = false;
    }
  });

  console.log("✅ [STOCK-TARGET-ALERT-CRON] Started (running every 30 minutes)");
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
