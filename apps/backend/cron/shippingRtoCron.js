/**
 * Shipping Automated RTO Cron (SHIP-W3)
 * Runs periodic RTO evaluation every 6 hours across active companies
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const shippingRtoService = require('../services/shipping/shippingRtoService');

let cronInterval = null;
let isRunning = false;

async function runRtoCycle() {
  const prisma = getSharedPrismaClient();
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  let totalEvaluated = 0;
  let totalRto = 0;
  let totalReview = 0;

  for (const company of companies) {
    try {
      const res = await shippingRtoService.evaluate(company.id);
      totalEvaluated += res.evaluatedCount || 0;
      totalRto += res.rtoCount || 0;
      totalReview += res.reviewCount || 0;
    } catch (err) {
      console.warn(`[RTO-CRON] Error evaluating company ${company.id}:`, err.message);
    }
  }

  return { totalEvaluated, totalRto, totalReview };
}

function start() {
  if (cronInterval) return;
  console.log('🚀 [RTO-CRON] Starting shipping automated RTO cron (every 6 hours)...');

  cronInterval = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await runRtoCycle();
    } catch (err) {
      console.error('❌ [RTO-CRON] Cycle execution error:', err);
    } finally {
      isRunning = false;
    }
  }, 6 * 60 * 60 * 1000);
}

function stop() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('🛑 [RTO-CRON] Shipping automated RTO cron stopped.');
  }
}

module.exports = {
  start,
  stop,
  runRtoCycle
};
