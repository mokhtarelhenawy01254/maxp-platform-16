const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const { isCompanyTrialActive } = require('./companyTrialService');

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

// 🔒 Strict Whitelist: Only approved e-commerce / order-based applications can be billed per order.
// Non-order apps (AI, HR, Communication, Marketing, etc.) must NEVER be billed on orders.
const ALLOWED_ORDER_PPU_SLUGS = new Set(['store']);

/**
 * حساب تكلفة تطبيقات الدفع حسب الاستخدام (PPU) لشركة على طلب معين.
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
          category: true,
        },
      },
    },
  });

  const apps = [];

  for (const companyApp of companyApps) {
    const app = companyApp.app;
    if (!app) continue;

    // 🛡️ Safety Guard 1: Strict Whitelist check
    if (!ALLOWED_ORDER_PPU_SLUGS.has(app.slug)) {
      continue;
    }

    // 🛡️ Safety Guard 2: Category and Unit Name check
    if (app.category !== 'ECOMMERCE' || app.unitName !== 'طلب') {
      continue;
    }

    // 🛡️ Safety Guard 3: Explicit billing method required (NO toxic fallback to PER_ORDER!)
    const method = app.ppuBillingMethod;
    if (!method) {
      continue;
    }

    const unitPrice = Number(app.unitPrice || 0);
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
        continue;
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
 * فواتير تطبيقات PPU على طلب جديد.
 * - إذا كان الرصيد يكفي: خصم ذري + تسجيل Transaction + appUsageLog.
 * - إذا لم يكن كافياً وكان orderId متاحاً: تعليق الطلب (billingHold) وسجّل فاتورة PENDING
 *   ليتم تحصيلها تلقائياً عند شحن الرصيد (processPendingUsageCharges).
 */
async function billOrderPpuApps({ companyId, orderNumber, orderTotal, itemsCount, metadata, orderId }) {
  try {
    const prisma = getSharedPrismaClient();

    const { apps, totalCost } = await computePpuCosts({ companyId, orderTotal, itemsCount });

    if (apps.length === 0) {
      return { billed: false, reason: 'no-ppu-apps', deductions: [] };
    }

    // 🆓 داخل الفترة التجريبية (تفعيل تجريبي): نسجّل الاستخدام فقط (appUsageLog)
    // بدون أي خصم من المحفظة، ويُحصَّل الاستهلاك لاحقاً عند انتهاء التجربة حسب الاستهلاك.
    const isTrialActive = await isCompanyTrialActive(prisma, companyId);
    if (isTrialActive) {
      for (const item of apps) {
        await prisma.appUsageLog.create({
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
              trial: true,
            },
          },
        });
      }
      console.log(`🎟️ [PPU-BILLING] Recorded ${apps.length} app usage during trial for company ${companyId} (order #${orderNumber})`);
      return { billed: false, reason: 'trial', deductions: [], trial: true };
    }

    let wallet = await prisma.companyWallet.findUnique({ where: { companyId } });

    if (!wallet) {
      wallet = await prisma.companyWallet.create({
        data: { companyId, balance: 0, currency: 'EGP' },
      });
    }

    const balance = Number(wallet.balance);

    // 🚧 الرصيد لا يكفي → تعليق الطلب حتى يُشحن الرصيد
    if (balance < totalCost) {
      if (!orderId) {
        console.error(`❌ [PPU-BILLING] Insufficient balance for ${companyId}: need ${totalCost}, have ${balance} (no orderId — skipped)`);
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
              description: `رسوم استخدام غير محصلة - طلب #${orderNumber}`,
              status: 'PENDING',
              referenceId: orderId,
            },
          });

          const existing = await tx.order.findUnique({
            where: { id: orderId },
            select: { metadata: true },
          });

          if (existing) {
            const meta = parseOrderMetadata(existing.metadata);
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
          }

          return created;
        });
      });

      console.warn(`⏸️ [PPU-BILLING] Order #${orderNumber} HOLD for company ${companyId}: need ${totalCost}, have ${balance}`);

      // إشعار فوري لمديري الشركة أن الطلب معلّق بسبب الرصيد
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
              title: '⏸️ طلب معلّق بسبب رصيد المحفظة',
              message: `الطلب #${orderNumber} لم يظهر في قائمة الطلبات لأن رصيد المحفظة (${balance} ج.م) لا يكفي تكلفة الاستخدام (${totalCost} ج.م). اشحن رصيدك ليُخصم المبلغ ويظهر الطلب تلقائياً.`,
              data: { orderNumber, orderId, amount: totalCost, balance },
            },
          });
        }
      } catch (notifyError) {
        console.error('⚠️ [PPU-BILLING] Failed to notify hold:', notifyError.message);
      }

      return { billed: false, held: true, heldAmount: totalCost, billingHistoryId: billing.id, deductions: [] };
    }

    // ✅ الرصيد كافٍ → خصم ذري لكل تطبيق مع حماية من الازدواج
    const deductions = [];

    for (const item of apps) {
      const result = await executeWithRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          const referenceId = `ORDER_${orderNumber}_${item.appSlug}`;

          // Idempotency: منع خصم مزدوج إذا أُعيدت نفس العملية
          const existing = await tx.transaction.findFirst({
            where: { walletId: wallet.id, referenceId },
            select: { id: true },
          });
          if (existing) {
            return { alreadyBilled: true };
          }

          // خصم ذري: فقط إذا كان الرصيد >= التكلفة
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
              description: `PPU: ${item.appName} - ${item.method === 'PERCENTAGE' ? `${item.cost}ج` : `${item.cost} ج`}`,
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
        console.log(`⏭️ [PPU-BILLING] Already billed ${item.appSlug} for order ${orderNumber}`);
      } else {
        deductions.push({ appSlug: item.appSlug, appName: item.appName, cost: item.cost, method: item.method, usageLogId: result.usageLogId });
      }
    }

    if (deductions.length > 0) {
      console.log(`✅ [PPU-BILLING] Billed company ${companyId} for order ${orderNumber}:`, deductions);
    }

    return { billed: deductions.length > 0, deductions };
  } catch (error) {
    console.error('❌ [PPU-BILLING] Error:', error.message);
    return { billed: false, error: error.message, deductions: [] };
  }
}

module.exports = { billOrderPpuApps, computePpuCosts };
