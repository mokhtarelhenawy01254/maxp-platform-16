const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

const parseOrderMetadata = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) {
      /* ignore */
    }
  }
  return {};
};

/**
 * تحصيل رسوم الاستخدام المؤجلة (PENDING APP_USAGE) تلقائياً بعد شحن الرصيد.
 * - تُرتَّب الفواتير من الأقدم إلى الأحدث.
 * - لكل فاتورة: خصم ذري من المحفظة (فقط إن كان الرصيد يكفي) + تسجيل Transaction + appUsageLog
 *   + تحويل الفاتورة إلى SUCCESS + إظهار الطلب المعلّق (مسح billingHold).
 * - يتوقف تلقائياً عند نقص الرصيد ويُحاول في الشحنة التالية.
 */
async function processPendingUsageCharges(companyId, opts = {}) {
  try {
    const prisma = getSharedPrismaClient();

    const pending = await prisma.billingHistory.findMany({
      where: { companyId, type: 'APP_USAGE', status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    if (pending.length === 0) {
      return { processed: 0, released: [], remaining: 0, failed: [] };
    }

    let wallet = await prisma.companyWallet.findUnique({ where: { companyId } });
    if (!wallet) {
      return { processed: 0, released: [], remaining: pending.length, failed: [] };
    }

    let balance = Number(wallet.balance);
    let processed = 0;
    const released = [];
    const failed = [];

    for (const charge of pending) {
      const amount = Number(charge.amount);
      if (amount <= 0) continue;
      if (balance < amount) break;

      const orderId = charge.referenceId;

      try {
        await executeWithRetry(async () => {
          await prisma.$transaction(async (tx) => {
            // 1. خصم ذري من المحفظة
            const updated = await tx.companyWallet.updateMany({
              where: { companyId, balance: { gte: amount } },
              data: {
                balance: { decrement: amount },
                totalSpent: { increment: amount },
              },
            });
            if (updated.count === 0) throw new Error('INSUFFICIENT_BALANCE');

            // 2. تسجيل الحركة في سجل المحفظة
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount,
                type: 'DEDUCT',
                status: 'COMPLETED',
                description: `تحصيل رسوم استخدام مؤجلة - ${charge.description || 'طلب'}`.trim(),
                referenceId: `PENDING_${charge.id}`,
              },
            });

            // 3. تحويل الفاتورة إلى SUCCESS
            await tx.billingHistory.update({
              where: { id: charge.id },
              data: { status: 'SUCCESS' },
            });

            // 4. تسجيل الاستخدام حسب الـ breakdown المخزّن في الطلب
            if (orderId) {
              const order = await tx.order.findUnique({
                where: { id: orderId },
                select: {
                  id: true,
                  billingHoldAt: true,
                  orderNumber: true,
                  total: true,
                  metadata: true,
                },
              });

              if (order) {
                const meta = parseOrderMetadata(order.metadata);
                const breakdown = meta?.billingHold?.apps || [];
                const orderTotal = Number(order.total || 0);

                for (const appItem of breakdown) {
                  if (!appItem.companyAppId) continue;
                  await tx.appUsageLog.create({
                    data: {
                      companyAppId: appItem.companyAppId,
                      feature: 'order_billing',
                      quantity: appItem.quantity || 1,
                      totalCost: appItem.cost || 0,
                      metadata: {
                        orderNumber: order.orderNumber,
                        orderTotal,
                        ppuBillingMethod: appItem.method || 'PER_ORDER',
                        appSlug: appItem.appSlug || '',
                        appName: appItem.appName || '',
                        releasedFromHold: true,
                      },
                    },
                  });
                }

                // 5. إظهار الطلب (إزالة التعليق)
                if (order.billingHoldAt) {
                  await tx.order.update({
                    where: { id: order.id },
                    data: { billingHoldAt: null, billingHoldAmount: null },
                  });
                  released.push(order.id);
                }
              }
            }
          });
        });

        balance -= amount;
        processed += 1;
      } catch (error) {
        console.error(`❌ [PENDING-BILLING] Failed to collect charge ${charge.id}:`, error.message);
        failed.push(charge.id);
        break;
      }
    }

    const remaining = pending.length - processed;

    if (processed > 0) {
      console.log(`✅ [PENDING-BILLING] Collected ${processed} pending charge(s) for company ${companyId}, released ${released.length} order(s), ${remaining} remaining`);
    }

    return { processed, released, remaining, failed };
  } catch (error) {
    console.error('❌ [PENDING-BILLING] Error:', error.message);
    return { processed: 0, released: [], remaining: 0, failed: [], error: error.message };
  }
}

/**
 * تعليق طلب يدوي جديد بسبب انتهاء اشتراك الطلبات اليدوية.
 * الطلب يبقى موجود لكنه مخفي من قائمة الطلبات (billingHoldAt) ويظهر ماسكًا
 * في "مزيد المعلومات" حتى يتجدد الاشتراك.
 */
async function holdOrderForExpiredSubscription({ companyId, orderId, orderNumber }) {
  const prisma = getSharedPrismaClient();
  const heldAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const meta = parseOrderMetadata(existing?.metadata);
    meta.billingHold = {
      reason: 'subscription_expired',
      heldAt: heldAt.toISOString(),
      appSlug: 'manual-orders-pro',
    };
    await tx.order.update({
      where: { id: orderId },
      data: { billingHoldAt: heldAt, metadata: JSON.stringify(meta) },
    });
    return orderId;
  });

  try {
    const admins = await prisma.user.findMany({
      where: { companyId, role: { in: ['OWNER', 'COMPANY_ADMIN', 'MANAGER'] }, isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          companyId,
          userId: admin.id,
          type: 'order_subscription_hold',
          title: '⏸️ طلب يدوي معلّق بسبب انتهاء الاشتراك',
          message: `الطلب اليدوي #${orderNumber} مخفي من قائمة الطلبات لأن اشتراك الطلبات اليدوية منتهي. جدّد اشتراكك ليظهر الطلب تلقائياً.`,
          data: { orderId, orderNumber },
        },
      });
    }
  } catch (notifyError) {
    console.error('⚠️ [SUB-HOLD] Failed to notify admins:', notifyError.message);
  }

  console.warn(`⏸️ [SUB-HOLD] Manual order #${orderNumber} held for company ${companyId} (subscription expired)`);
  return updated;
}

/**
 * تحرير الطلبات اليدوية المعلّقة بسبب انتهاء الاشتراك عند عودة الاشتراك
 * إلى حالة ACTIVE/TRIAL (تجديد/ترقية/تفعيل).
 */
async function releaseSubscriptionHeldOrders(companyId) {
  const prisma = getSharedPrismaClient();

  const heldOrders = await prisma.order.findMany({
    where: { companyId, billingHoldAt: { not: null } },
    select: { id: true, metadata: true },
    take: 500,
  });

  const subscriptionHeld = heldOrders.filter(
    (order) => parseOrderMetadata(order.metadata)?.billingHold?.reason === 'subscription_expired',
  );

  if (subscriptionHeld.length === 0) {
    return { released: 0, subscriptionActive: null };
  }

  const installed = await prisma.companyApp.findMany({
    where: { companyId, app: { slug: { in: ['manual-orders-pro'] } } },
    select: { status: true },
  });

  const subscriptionActive = installed.some((r) => ['TRIAL', 'ACTIVE'].includes(r.status));
  if (!subscriptionActive) {
    return { released: 0, subscriptionActive: false };
  }

  let released = 0;
  for (const order of subscriptionHeld) {
    const meta = parseOrderMetadata(order.metadata);
    delete meta.billingHold;
    await prisma.order.update({
      where: { id: order.id },
      data: { billingHoldAt: null, metadata: JSON.stringify(meta) },
    });
    released += 1;
  }

  if (released > 0) {
    console.log(`✅ [SUB-RELEASE] Released ${released} subscription-held order(s) for company ${companyId}`);
  }

  return { released, subscriptionActive: true };
}

module.exports = { processPendingUsageCharges, holdOrderForExpiredSubscription, releaseSubscriptionHeldOrders };
