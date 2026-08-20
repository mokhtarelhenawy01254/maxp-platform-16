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
 * ╪¬╪¡╪╡┘è┘ä ╪▒╪│┘ê┘à ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à ╪º┘ä┘à╪ñ╪¼┘ä╪⌐ (PENDING APP_USAGE) ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪¿╪╣╪» ╪┤╪¡┘å ╪º┘ä╪▒╪╡┘è╪».
 * - ╪¬┘Å╪▒╪¬┘Ä┘æ╪¿ ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒ ┘à┘å ╪º┘ä╪ú┘é╪»┘à ╪Ñ┘ä┘ë ╪º┘ä╪ú╪¡╪»╪½.
 * - ┘ä┘â┘ä ┘ü╪º╪¬┘ê╪▒╪⌐: ╪«╪╡┘à ╪░╪▒┘è ┘à┘å ╪º┘ä┘à╪¡┘ü╪╕╪⌐ (┘ü┘é╪╖ ╪Ñ┘å ┘â╪º┘å ╪º┘ä╪▒╪╡┘è╪» ┘è┘â┘ü┘è) + ╪¬╪│╪¼┘è┘ä Transaction + appUsageLog
 *   + ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐ ╪Ñ┘ä┘ë SUCCESS + ╪Ñ╪╕┘ç╪º╪▒ ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪╣┘ä┘æ┘é (┘à╪│╪¡ billingHold).
 * - ┘è╪¬┘ê┘é┘ü ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘å╪» ┘å┘é╪╡ ╪º┘ä╪▒╪╡┘è╪» ┘ê┘è┘Å╪¡╪º┘ê┘ä ┘ü┘è ╪º┘ä╪┤╪¡┘å╪⌐ ╪º┘ä╪¬╪º┘ä┘è╪⌐.
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
            // 1. ╪«╪╡┘à ╪░╪▒┘è ┘à┘å ╪º┘ä┘à╪¡┘ü╪╕╪⌐
            const updated = await tx.companyWallet.updateMany({
              where: { companyId, balance: { gte: amount } },
              data: {
                balance: { decrement: amount },
                totalSpent: { increment: amount },
              },
            });
            if (updated.count === 0) throw new Error('INSUFFICIENT_BALANCE');

            // 2. ╪¬╪│╪¼┘è┘ä ╪º┘ä╪¡╪▒┘â╪⌐ ┘ü┘è ╪│╪¼┘ä ╪º┘ä┘à╪¡┘ü╪╕╪⌐
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                amount,
                type: 'DEDUCT',
                status: 'COMPLETED',
                description: `╪¬╪¡╪╡┘è┘ä ╪▒╪│┘ê┘à ╪º╪│╪¬╪«╪»╪º┘à ┘à╪ñ╪¼┘ä╪⌐ - ${charge.description || '╪╖┘ä╪¿'}`.trim(),
                referenceId: `PENDING_${charge.id}`,
              },
            });

            // 3. ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐ ╪Ñ┘ä┘ë SUCCESS
            await tx.billingHistory.update({
              where: { id: charge.id },
              data: { status: 'SUCCESS' },
            });

            // 4. ╪¬╪│╪¼┘è┘ä ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à ╪¡╪│╪¿ ╪º┘ä┘Ç breakdown ╪º┘ä┘à╪«╪▓┘æ┘å ┘ü┘è ╪º┘ä╪╖┘ä╪¿
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

                // 5. ╪Ñ╪╕┘ç╪º╪▒ ╪º┘ä╪╖┘ä╪¿ (╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪¬╪╣┘ä┘è┘é)
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
        console.error(`Γ¥î [PENDING-BILLING] Failed to collect charge ${charge.id}:`, error.message);
        failed.push(charge.id);
        break;
      }
    }

    const remaining = pending.length - processed;

    if (processed > 0) {
      console.log(`Γ£à [PENDING-BILLING] Collected ${processed} pending charge(s) for company ${companyId}, released ${released.length} order(s), ${remaining} remaining`);
    }

    return { processed, released, remaining, failed };
  } catch (error) {
    console.error('Γ¥î [PENDING-BILLING] Error:', error.message);
    return { processed: 0, released: [], remaining: 0, failed: [], error: error.message };
  }
}

/**
 * ╪¬╪╣┘ä┘è┘é ╪╖┘ä╪¿ ┘è╪»┘ê┘è ╪¼╪»┘è╪» ╪¿╪│╪¿╪¿ ╪º┘å╪¬┘ç╪º╪í ╪º╪┤╪¬╪▒╪º┘â ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘è╪»┘ê┘è╪⌐.
 * ╪º┘ä╪╖┘ä╪¿ ┘è╪¿┘é┘ë ┘à┘ê╪¼┘ê╪» ┘ä┘â┘å┘ç ┘à╪«┘ü┘è ┘à┘å ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ (billingHoldAt) ┘ê┘è╪╕┘ç╪▒ ┘à╪º╪│┘â┘ï╪º
 * ┘ü┘è "┘à╪▓┘è╪» ╪º┘ä┘à╪╣┘ä┘ê┘à╪º╪¬" ╪¡╪¬┘ë ┘è╪¬╪¼╪»╪» ╪º┘ä╪º╪┤╪¬╪▒╪º┘â.
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
          title: 'ΓÅ╕∩╕Å ╪╖┘ä╪¿ ┘è╪»┘ê┘è ┘à╪╣┘ä┘æ┘é ╪¿╪│╪¿╪¿ ╪º┘å╪¬┘ç╪º╪í ╪º┘ä╪º╪┤╪¬╪▒╪º┘â',
          message: `╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘è╪»┘ê┘è #${orderNumber} ┘à╪«┘ü┘è ┘à┘å ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ä╪ú┘å ╪º╪┤╪¬╪▒╪º┘â ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘è╪»┘ê┘è╪⌐ ┘à┘å╪¬┘ç┘è. ╪¼╪»┘æ╪» ╪º╪┤╪¬╪▒╪º┘â┘â ┘ä┘è╪╕┘ç╪▒ ╪º┘ä╪╖┘ä╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï.`,
          data: { orderId, orderNumber },
        },
      });
    }
  } catch (notifyError) {
    console.error('ΓÜá∩╕Å [SUB-HOLD] Failed to notify admins:', notifyError.message);
  }

  console.warn(`ΓÅ╕∩╕Å [SUB-HOLD] Manual order #${orderNumber} held for company ${companyId} (subscription expired)`);
  return updated;
}

/**
 * ╪¬╪¡╪▒┘è╪▒ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘è╪»┘ê┘è╪⌐ ╪º┘ä┘à╪╣┘ä┘æ┘é╪⌐ ╪¿╪│╪¿╪¿ ╪º┘å╪¬┘ç╪º╪í ╪º┘ä╪º╪┤╪¬╪▒╪º┘â ╪╣┘å╪» ╪╣┘ê╪»╪⌐ ╪º┘ä╪º╪┤╪¬╪▒╪º┘â
 * ╪Ñ┘ä┘ë ╪¡╪º┘ä╪⌐ ACTIVE/TRIAL (╪¬╪¼╪»┘è╪»/╪¬╪▒┘é┘è╪⌐/╪¬┘ü╪╣┘è┘ä).
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
    console.log(`Γ£à [SUB-RELEASE] Released ${released} subscription-held order(s) for company ${companyId}`);
  }

  return { released, subscriptionActive: true };
}

module.exports = { processPendingUsageCharges, holdOrderForExpiredSubscription, releaseSubscriptionHeldOrders };
