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

    const { isValidOrderStatusEnum } = require('../utils/orderStatusEnum');
    const orderService = require('../services/orderService');
    let socketService = null;
    try {
      socketService = require('../services/socketService');
    } catch (_) {}

    for (const [companyId, companyRules] of Object.entries(rulesByCompany)) {
      for (const rule of companyRules) {
        try {
          const cutoffTime = new Date(now.getTime() - toMs(rule.waitTime, rule.timeUnit));
          const fromStatusTrimmed = String(rule.fromStatus || '').trim();
          const isSystemFromStatus = isValidOrderStatusEnum(fromStatusTrimmed);

          // 🛡️ PRODUCTION-FIX (actual-status-engine):
          // 1. لا نمرر حالة مخصصة إلى Prisma status (Enum) لمنع خطأ Invalid value for argument status.
          // 2. نقارن الحالة الفعلية: إذا كانت مخصصة نفحص customStatusCode، وإذا كانت نظامية
          //    نفحص status مع التأكد من خلو customStatusCode (ليست مغطاة بحالة مخصصة).
          // 3. المؤقت يُحسب بدقة من تاريخ الدخول للحالة من OrderStatusHistory (أو createdAt
          //    إذا لم يتغير status الطلب من قبل)، بحيث لا يتصفّر العدّاد بتعديل ملاحظة أو تاج.
          let orders = [];
          if (isSystemFromStatus) {
            orders = await prisma.$queryRawUnsafe(`
              SELECT o.id, o.status, o."customStatusCode", o."orderNumber", o."createdAt",
                COALESCE(
                  (
                    SELECT osh."createdAt" 
                    FROM "OrderStatusHistory" osh 
                    WHERE osh."orderId" = o.id 
                    ORDER BY osh."createdAt" DESC 
                    LIMIT 1
                  ),
                  o."createdAt"
                ) AS "statusEnteredAt"
              FROM orders o
              WHERE o."companyId" = $1
                AND o.status = $2::"OrderStatus"
                AND (o."customStatusCode" IS NULL OR o."customStatusCode" = '')
                AND COALESCE(
                  (
                    SELECT osh."createdAt" 
                    FROM "OrderStatusHistory" osh 
                    WHERE osh."orderId" = o.id 
                    ORDER BY osh."createdAt" DESC 
                    LIMIT 1
                  ),
                  o."createdAt"
                ) <= $3
              ORDER BY COALESCE(
                (
                  SELECT osh."createdAt" 
                  FROM "OrderStatusHistory" osh 
                  WHERE osh."orderId" = o.id 
                  ORDER BY osh."createdAt" DESC 
                  LIMIT 1
                ),
                o."createdAt"
              ) ASC
              LIMIT 50
            `, companyId, fromStatusTrimmed.toUpperCase(), cutoffTime);
          } else {
            orders = await prisma.$queryRawUnsafe(`
              SELECT o.id, o.status, o."customStatusCode", o."orderNumber", o."createdAt",
                COALESCE(
                  (
                    SELECT osh."createdAt" 
                    FROM "OrderStatusHistory" osh 
                    WHERE osh."orderId" = o.id 
                    ORDER BY osh."createdAt" DESC 
                    LIMIT 1
                  ),
                  o."createdAt"
                ) AS "statusEnteredAt"
              FROM orders o
              WHERE o."companyId" = $1
                AND LOWER(o."customStatusCode") = LOWER($2)
                AND COALESCE(
                  (
                    SELECT osh."createdAt" 
                    FROM "OrderStatusHistory" osh 
                    WHERE osh."orderId" = o.id 
                    ORDER BY osh."createdAt" DESC 
                    LIMIT 1
                  ),
                  o."createdAt"
                ) <= $3
              ORDER BY COALESCE(
                (
                  SELECT osh."createdAt" 
                  FROM "OrderStatusHistory" osh 
                  WHERE osh."orderId" = o.id 
                  ORDER BY osh."createdAt" DESC 
                  LIMIT 1
                ),
                o."createdAt"
              ) ASC
              LIMIT 50
            `, companyId, fromStatusTrimmed, cutoffTime);
          }

          if (!orders || orders.length === 0) continue;

          console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Company ${companyId}: Found ${orders.length} orders to transition "${rule.fromStatus}" → "${rule.toStatus}"`);

          const reason = `Auto-changed by rule: after ${rule.waitTime} ${rule.timeUnit}`;
          const isDelayedTargetStatus = String(rule.toStatus || '').toUpperCase().includes('DELAY') ||
                                        String(rule.toStatus || '').toUpperCase().includes('HOLD');

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

              // 📡 إشارة لإيجنت الشحن (shipping-agent) عند دخول الطلب حالة متأخرة
              if (isDelayedTargetStatus) {
                const enteredTime = new Date(order.statusEnteredAt || order.createdAt).getTime();
                const daysDelayed = Math.max(1, Math.round((now.getTime() - enteredTime) / (1000 * 60 * 60 * 24)));
                console.log(`📡 [SHIPPING-AGENT-SIGNAL] Delayed order detected: Order #${order.orderNumber || order.id} entered "${rule.toStatus}" (delayed ~${daysDelayed} days). Ready for shipping ticket creation.`);
                if (socketService?.broadcastToCompany) {
                  try {
                    socketService.broadcastToCompany(companyId, 'shipping:delayed_order', {
                      orderId: order.id,
                      orderNumber: order.orderNumber,
                      status: rule.toStatus,
                      daysDelayed,
                      timestamp: now.toISOString(),
                      suggestedAction: 'shipping_ticket_create'
                    });
                  } catch (_) {}
                }
              }
            } catch (err) {
              failed++;
              console.error(`[ORDER-STATUS-AUTO-CHANGE-CRON] Order ${order.id} failed:`, err.message);
            }
          }

          console.log(`[ORDER-STATUS-AUTO-CHANGE-CRON] Rule ${rule.fromStatus}→${rule.toStatus}: ${updated} ok, ${failed} failed`);

        } catch (ruleErr) {
          console.error(`[ORDER-STATUS-AUTO-CHANGE-CRON] Error processing rule ${rule.id} (${rule.fromStatus}→${rule.toStatus}):`, ruleErr.message);
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

module.exports = { startOrderStatusAutoChangeCron, runOrderStatusAutoChange };
