/**
 * 🕐 Retention Cadence Cron — يشغّل الرسائل الدورية لكل الشركات المفعّلة
 * كل 6 ساعات. بيقرا الإعدادات من Company.loyaltySettings.cadence.
 */
const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { sendDueForCompany } = require('../services/hr/retentionCadenceService');

let isRunning = false;

async function runRetentionCadence() {
  if (isRunning) return;
  isRunning = true;
  try {
    const prisma = getSharedPrismaClient();
    // شركات عندها إعدادات cadence (نص JSON)
    const companies = await prisma.company.findMany({
      where: { loyaltySettings: { contains: '"cadence"' } },
      select: { id: true, loyaltySettings: true }
    });
    let totalSent = 0;
    for (const company of companies) {
      try {
        let ls = null;
        try { ls = JSON.parse(company.loyaltySettings || '{}'); } catch { ls = {}; }
        const cadence = ls?.cadence;
        if (!cadence || cadence.enabled !== true) continue;
        const result = await sendDueForCompany(company.id);
        totalSent += result.sent || 0;
      } catch (e) {
        console.error(`❌ [CADENCE-CRON] Failed for company ${company.id}:`, e.message);
      }
    }
    if (totalSent > 0) console.log(`✅ [CADENCE-CRON] Total sent: ${totalSent}`);
  } catch (error) {
    console.error('❌ [CADENCE-CRON] Error:', error.message);
  } finally {
    isRunning = false;
  }
}

function startRetentionCadenceScheduler() {
  console.log('🕐 [CADENCE-CRON] Initializing retention cadence scheduler...');
  cron.schedule('0 */6 * * *', async () => {
    console.log('🕒 [CADENCE-CRON] Checking due cadence messages...');
    await runRetentionCadence();
  });
  console.log('✅ [CADENCE-CRON] Scheduler started (every 6 hours)');
}

module.exports = { startRetentionCadenceScheduler, runRetentionCadence };