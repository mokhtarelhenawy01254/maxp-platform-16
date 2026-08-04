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
            // 🚨 PRODUCTION-FIX (notifications-fix-plan §1.2): حدّ الدفعة —
            // استدعاء updateOrderStatus لكل طلب أبطأ من updateMany، والكرون يعمل
            // كل دقيقة فسيلحق بالدفعات اللاحقة.
            take: 50,
          });

          if (orders.length === 0) continue;

          console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Company ${companyId}: Found ${orders.length} orders to transition ${rule.fromStatus} → ${rule.toStatus}`);

          // 🚨 PRODUCTION-FIX (notifications-fix-plan §1.2):
          // مرّ عبر updateOrderStatus لضمان: إشعارات واتساب + metadata.preparationStatus +
          // commission/loyalty/invoice side-effects.
          // ملاحظة (تصحيح §3.1): updateOrderStatus يكتب OrderStatusHistory متداخلاً
          // (statusHistory.create داخل order.update — orderService.js) — لذا لا createMany منفصل
          // لتجنّب صفّي history مكررين. changedBy = 'SYSTEM_AUTO' عبر userId.
          const orderService = require('../services/orderService');
          const reason = `Auto-changed by rule: after ${rule.waitTime} ${rule.timeUnit}`;

          let updated = 0;
          let failed = 0;

          for (const order of orders) {
            try {
              await orderService.setCompanyId(companyId).updateOrderStatus(
                order.id,           // orderNumber (يقبل id أو orderNumber)
                companyId,          // companyId
                rule.toStatus,      // status
                reason,             // notes
                'SYSTEM_AUTO',      // userId → changedBy في OrderStatusHistory
                'System Automation',// userName
                null,               // existingOrderObject
                false,              // isOverride
                {                   // options
                  skipTransitionValidation: true, // القاعدة موثوقة؛ تجاوز فحص allowedNextStatuses
                  skipCallAttemptGuard: true,     // لا يوجد مكالمة عميل في الأتمتة
                }
              );
              updated++;
            } catch (err) {
              failed++;
              console.error(`[ORDER-STATUS-AUTO-CHANGE-CRON] Order ${order.id} failed:`, err.message);
            }
          }

          console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Rule ${rule.fromStatus}→${rule.toStatus}: ${updated} ok, ${failed} failed`);

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
