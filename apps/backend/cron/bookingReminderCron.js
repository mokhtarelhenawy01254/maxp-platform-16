const cron = require('node-cron');
const bookingNotificationService = require('../services/bookingNotificationService');

let isRunning = false;

async function runBookingReminders() {
  if (isRunning) {
    console.log('[BOOKING-REMINDER-CRON] Previous run still active, skipping.');
    return;
  }
  isRunning = true;
  try {
    const result = await bookingNotificationService.sendAppointmentReminders();
    console.log(`[BOOKING-REMINDER-CRON] Reminders done: scanned=${result.scanned} sent=${result.sent} failed=${result.failed}`);
  } catch (error) {
    console.error('[BOOKING-REMINDER-CRON] Job failed:', error.message);
  } finally {
    isRunning = false;
  }
}

function startBookingReminderCron() {
  console.log('[BOOKING-REMINDER-CRON] Starting appointment reminder scheduler...');
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', runBookingReminders);
  console.log('[BOOKING-REMINDER-CRON] Started (runs every 30 minutes)');
}

module.exports = { startBookingReminderCron, runBookingReminders };
