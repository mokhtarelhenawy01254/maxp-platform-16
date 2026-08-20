const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL'];

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
 * ╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪¬╪╖╪¿┘è┘é╪º╪¬ ╪º┘ä╪»┘ü╪╣ ╪¡╪│╪¿ ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à (PPU) ┘ä╪┤╪▒┘â╪⌐ ╪╣┘ä┘ë ╪╖┘ä╪¿ ┘à╪╣┘è┘å.
 * Returns: { apps: [{ companyAppId, appSlug, appName, cost, quantity, method }], totalCost }
 */
async function computePpuCosts({ companyId, orderTotal, itemsCount }) {
  const prisma = getSharedPrismaClient();

  const companyApps = await prisma.companyApp.findMany({
    where: {
      companyId,
      activePricingModel: 'PAY_PER_USE',
      status: { in: ACTIVE_STATUSES },
    },
    include: {
      app: {
        select: {
          id: true,
          name: true,
          slug: true,
          unitPrice: true,
          unitName: true,
          ppuBillingMethod: true,
        },
      },
    },
  });

  const apps = [];

  for (const companyApp of companyApps) {
    const app = companyApp.app;
    const unitPrice = Number(app.unitPrice || 0);
    const method = app.ppuBillingMethod || 'PER_ORDER';
    const nItems = Number(itemsCount) || 0;
    const nTotal = Number(orderTotal) || 0;

    if (unitPrice <= 0) continue;

    let cost = 0;
    let quantity = 1;

    switch (method) {
      case 'PER_ORDER':
        cost = unitPrice;
        quantity = 1;
        break;
      case 'PER_ITEM':
        cost = unitPrice * nItems;
        quantity = nItems;
        break;
      case 'PERCENTAGE':
        cost = (unitPrice / 100) * nTotal;
        quantity = 1;
        break;
      default:
        cost = unitPrice;
        quantity = 1;
    }

    cost = Math.round(cost * 100) / 100;

    if (cost <= 0) continue;

    apps.push({
      companyAppId: companyApp.id,
      appSlug: app.slug,
      appName: app.name,
      cost,
      quantity,
      method,
    });
  }

  return { apps, totalCost: Math.round(apps.reduce((sum, a) => sum + a.cost, 0) * 100) / 100 };
}

/**
 * ┘ü┘ê╪º╪¬┘è╪▒ ╪¬╪╖╪¿┘è┘é╪º╪¬ PPU ╪╣┘ä┘ë ╪╖┘ä╪¿ ╪¼╪»┘è╪».
 * - ╪Ñ╪░╪º ┘â╪º┘å ╪º┘ä╪▒╪╡┘è╪» ┘è┘â┘ü┘è: ╪«╪╡┘à ╪░╪▒┘è + ╪¬╪│╪¼┘è┘ä Transaction + appUsageLog.
 * - ╪Ñ╪░╪º ┘ä┘à ┘è┘â┘å ┘â╪º┘ü┘è╪º┘ï ┘ê┘â╪º┘å orderId ┘à╪¬╪º╪¡╪º┘ï: ╪¬╪╣┘ä┘è┘é ╪º┘ä╪╖┘ä╪¿ (billingHold) ┘ê╪│╪¼┘æ┘ä ┘ü╪º╪¬┘ê╪▒╪⌐ PENDING
 *   ┘ä┘è╪¬┘à ╪¬╪¡╪╡┘è┘ä┘ç╪º ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘å╪» ╪┤╪¡┘å ╪º┘ä╪▒╪╡┘è╪» (processPendingUsageCharges).
 */
async function billOrderPpuApps({ companyId, orderNumber, orderTotal, itemsCount, metadata, orderId }) {
  try {
    const prisma = getSharedPrismaClient();

    const { apps, totalCost } = await computePpuCosts({ companyId, orderTotal, itemsCount });

    if (apps.length === 0) {
      return { billed: false, reason: 'no-ppu-apps', deductions: [] };
    }

    let wallet = await prisma.companyWallet.findUnique({ where: { companyId } });

    if (!wallet) {
      wallet = await prisma.companyWallet.create({
        data: { companyId, balance: 0, currency: 'EGP' },
      });
    }

    const balance = Number(wallet.balance);

    // ≡ƒÜº ╪º┘ä╪▒╪╡┘è╪» ┘ä╪º ┘è┘â┘ü┘è ΓåÆ ╪¬╪╣┘ä┘è┘é ╪º┘ä╪╖┘ä╪¿ ╪¡╪¬┘ë ┘è┘Å╪┤╪¡┘å ╪º┘ä╪▒╪╡┘è╪»
    if (balance < totalCost) {
      if (!orderId) {
        console.error(`Γ¥î [PPU-BILLING] Insufficient balance for ${companyId}: need ${totalCost}, have ${balance} (no orderId ΓÇö skipped)`);
        return { billed: false, reason: 'insufficient-balance', deductions: [] };
      }

      const heldAt = new Date();
      const billing = await executeWithRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          const created = await tx.billingHistory.create({
            data: {
              companyId,
              type: 'APP_USAGE',
              amount: totalCost,
              description: `╪▒╪│┘ê┘à ╪º╪│╪¬╪«╪»╪º┘à ╪║┘è╪▒ ┘à╪¡╪╡┘ä╪⌐ - ╪╖┘ä╪¿ #${orderNumber}`,
              status: 'PENDING',
              referenceId: orderId,
            },
          });

          const existing = await tx.order.findUnique({
            where: { id: orderId },
            select: { metadata: true },
          });
          const meta = parseOrderMetadata(existing?.metadata);
          meta.billingHold = {
            heldAt: heldAt.toISOString(),
            amount: totalCost,
            billingHistoryId: created.id,
            apps,
          };

          await tx.order.update({
            where: { id: orderId },
            data: {
              billingHoldAt: heldAt,
              billingHoldAmount: totalCost,
              metadata: JSON.stringify(meta),
            },
          });

          return created;
        });
      });

      console.warn(`ΓÅ╕∩╕Å [PPU-BILLING] Order #${orderNumber} HOLD for company ${companyId}: need ${totalCost}, have ${balance}`);

      // ╪Ñ╪┤╪╣╪º╪▒ ┘ü┘ê╪▒┘è ┘ä┘à╪»┘è╪▒┘è ╪º┘ä╪┤╪▒┘â╪⌐ ╪ú┘å ╪º┘ä╪╖┘ä╪¿ ┘à╪╣┘ä┘æ┘é ╪¿╪│╪¿╪¿ ╪º┘ä╪▒╪╡┘è╪»
      try {
        const admins = await prisma.user.findMany({
          where: {
            companyId,
            role: { in: ['OWNER', 'COMPANY_ADMIN', 'MANAGER'] },
            isActive: true,
          },
          select: { id: true },
        });
        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              companyId,
              userId: admin.id,
              type: 'order_billing_hold',
              title: 'ΓÅ╕∩╕Å ╪╖┘ä╪¿ ┘à╪╣┘ä┘æ┘é ╪¿╪│╪¿╪¿ ╪▒╪╡┘è╪» ╪º┘ä┘à╪¡┘ü╪╕╪⌐',
              message: `╪º┘ä╪╖┘ä╪¿ #${orderNumber} ┘ä┘à ┘è╪╕┘ç╪▒ ┘ü┘è ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ä╪ú┘å ╪▒╪╡┘è╪» ╪º┘ä┘à╪¡┘ü╪╕╪⌐ (${balance} ╪¼.┘à) ┘ä╪º ┘è┘â┘ü┘è ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à (${totalCost} ╪¼.┘à). ╪º╪┤╪¡┘å ╪▒╪╡┘è╪»┘â ┘ä┘è┘Å╪«╪╡┘à ╪º┘ä┘à╪¿┘ä╪║ ┘ê┘è╪╕┘ç╪▒ ╪º┘ä╪╖┘ä╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï.`,
              data: { orderNumber, orderId, amount: totalCost, balance },
            },
          });
        }
      } catch (notifyError) {
        console.error('ΓÜá∩╕Å [PPU-BILLING] Failed to notify hold:', notifyError.message);
      }

      return { billed: false, held: true, heldAmount: totalCost, billingHistoryId: billing.id, deductions: [] };
    }

    // Γ£à ╪º┘ä╪▒╪╡┘è╪» ┘â╪º┘ü┘ì ΓåÆ ╪«╪╡┘à ╪░╪▒┘è ┘ä┘â┘ä ╪¬╪╖╪¿┘è┘é ┘à╪╣ ╪¡┘à╪º┘è╪⌐ ┘à┘å ╪º┘ä╪º╪▓╪»┘ê╪º╪¼
    const deductions = [];

    for (const item of apps) {
      const result = await executeWithRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          const referenceId = `ORDER_${orderNumber}_${item.appSlug}`;

          // Idempotency: ┘à┘å╪╣ ╪«╪╡┘à ┘à╪▓╪»┘ê╪¼ ╪Ñ╪░╪º ╪ú┘Å╪╣┘è╪»╪¬ ┘å┘ü╪│ ╪º┘ä╪╣┘à┘ä┘è╪⌐
          const existing = await tx.transaction.findFirst({
            where: { walletId: wallet.id, referenceId },
            select: { id: true },
          });
          if (existing) {
            return { alreadyBilled: true };
          }

          // ╪«╪╡┘à ╪░╪▒┘è: ┘ü┘é╪╖ ╪Ñ╪░╪º ┘â╪º┘å ╪º┘ä╪▒╪╡┘è╪» >= ╪º┘ä╪¬┘â┘ä┘ü╪⌐
          const updated = await tx.companyWallet.updateMany({
            where: { companyId, balance: { gte: item.cost } },
            data: {
              balance: { decrement: item.cost },
              totalSpent: { increment: item.cost },
            },
          });

          if (updated.count === 0) {
            throw new Error(`INSUFFICIENT_BALANCE_ATOMIC_${item.appSlug}`);
          }

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: item.cost,
              type: 'DEDUCT',
              status: 'COMPLETED',
              description: `PPU: ${item.appName} - ${item.method === 'PERCENTAGE' ? `${item.cost}╪¼` : `${item.cost} ╪¼`}`,
              referenceId,
            },
          });

          const usageLog = await tx.appUsageLog.create({
            data: {
              companyAppId: item.companyAppId,
              feature: 'order_billing',
              quantity: item.quantity,
              totalCost: item.cost,
              metadata: {
                orderNumber,
                orderTotal,
                itemsCount,
                ppuBillingMethod: item.method,
                appSlug: item.appSlug,
                appName: item.appName,
              },
            },
          });

          return { usageLogId: usageLog.id };
        });
      });

      if (result.alreadyBilled) {
        console.log(`ΓÅ¡∩╕Å [PPU-BILLING] Already billed ${item.appSlug} for order ${orderNumber}`);
      } else {
        deductions.push({ appSlug: item.appSlug, appName: item.appName, cost: item.cost, method: item.method, usageLogId: result.usageLogId });
      }
    }

    if (deductions.length > 0) {
      console.log(`Γ£à [PPU-BILLING] Billed company ${companyId} for order ${orderNumber}:`, deductions);
    }

    return { billed: deductions.length > 0, deductions };
  } catch (error) {
    console.error('Γ¥î [PPU-BILLING] Error:', error.message);
    return { billed: false, error: error.message, deductions: [] };
  }
}

module.exports = { billOrderPpuApps, computePpuCosts };
