/**
 * Order Status Auto-Change Cron
 * يفحص الطلبات كل دقيقة ويغير حالتها تلقائياً حسب القواعد المضبوطة
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

let isRunning = false;

// Convert waitTime + timeUnit to milliseconds
function toMs(waitTime, timeUnit) {
  switch (timeUnit) {
    case 'Minutes': return waitTime * 60 * 1000;
    case 'Hours':   return waitTime * 60 * 60 * 1000;
    case 'Days':    return waitTime * 24 * 60 * 60 * 1000;
    default:        return waitTime * 60 * 1000;
  }
}

async function runOrderStatusAutoChange() {
  if (isRunning) {
    console.log('[ORDER-STATUS-AUTO-CHANGE-CRON] Previous run still active, skipping.');
    return;
  }

  isRunning = true;

  try {
    const prisma = getSharedPrismaClient();

    // Fetch all active rules
    const rules = await prisma.orderStatusAutoChangeRule.findMany({
      where: { isActive: true },
    });

    if (rules.length === 0) {
      return;
    }

    // Group rules by company for efficient processing
    const rulesByCompany = {};
    for (const rule of rules) {
      if (!rulesByCompany[rule.companyId]) {
        rulesByCompany[rule.companyId] = [];
      }
      rulesByCompany[rule.companyId].push(rule);
    }

    const now = new Date();

    for (const [companyId, companyRules] of Object.entries(rulesByCompany)) {
      for (const rule of companyRules) {
        try {
          const cutoffTime = new Date(now.getTime() - toMs(rule.waitTime, rule.timeUnit));

          // Find all orders matching the fromStatus that were last updated before the cutoff
          const orders = await prisma.order.findMany({
            where: {
              companyId,
              status: rule.fromStatus,
              updatedAt: { lte: cutoffTime },
            },
            select: { id: true, status: true, updatedAt: true },
          });

          if (orders.length === 0) continue;

          console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Company ${companyId}: Found ${orders.length} orders to transition ${rule.fromStatus} → ${rule.toStatus}`);

          // Batch update
          await prisma.order.updateMany({
            where: {
              id: { in: orders.map(o => o.id) },
              status: rule.fromStatus, // double-check to avoid race conditions
            },
            data: {
              status: rule.toStatus,
              updatedAt: now,
            },
          });

          // Log status history for each order
          const historyEntries = orders.map(order => ({
            orderId: order.id,
            oldStatus: rule.fromStatus,
            status: rule.toStatus,
            changedBy: 'SYSTEM_AUTO',
            reason: `Auto-changed by rule: after ${rule.waitTime} ${rule.timeUnit}`,
            createdAt: now,
          }));

          try {
            await prisma.orderStatusHistory.createMany({
              data: historyEntries,
              skipDuplicates: true,
            });
          } catch (historyErr) {
            // OrderStatusHistory may not exist on all deployments - non-fatal
            console.warn('[ORDER-STATUS-AUTO-CHANGE-CRON] Could not write status history:', historyErr.message);
          }

        } catch (ruleErr) {
          console.error(`[ORDER-STATUS-AUTO-CHANGE-CRON] Error processing rule ${rule.id}:`, ruleErr.message);
        }
      }
    }

  } catch (error) {
    console.error('[ORDER-STATUS-AUTO-CHANGE-CRON] Job failed:', error.message);
  } finally {
    isRunning = false;
  }
}

function startOrderStatusAutoChangeCron() {
  console.log('[ORDER-STATUS-AUTO-CHANGE-CRON] Starting order status auto-change scheduler...');

  // Run every minute
  cron.schedule('* * * * *', runOrderStatusAutoChange);

  console.log('[ORDER-STATUS-AUTO-CHANGE-CRON] Scheduler started (runs every 1 minute)');
}

module.exports = { startOrderStatusAutoChangeCron };
