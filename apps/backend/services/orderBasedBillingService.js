const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL'];

async function billOrderPpuApps({ companyId, orderNumber, orderTotal, itemsCount, metadata }) {
  try {
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

    if (companyApps.length === 0) {
      console.log(`⏭️ No PPU apps installed for company ${companyId}`);
      return { billed: false, reason: 'no-ppu-apps', deductions: [] };
    }

    let wallet = await prisma.companyWallet.findUnique({ where: { companyId } });

    if (!wallet) {
      console.log(`⏭️ No wallet for company ${companyId}, skipping PPU billing`);
      return { billed: false, reason: 'no-wallet', deductions: [] };
    }

    const deductions = [];

    for (const companyApp of companyApps) {
      const app = companyApp.app;
      const unitPrice = Number(app.unitPrice || 0);
      const method = app.ppuBillingMethod || 'PER_ORDER';

      if (unitPrice <= 0) continue;

      let cost = 0;
      let quantity = 1;

      switch (method) {
        case 'PER_ORDER':
          cost = unitPrice;
          quantity = 1;
          break;
        case 'PER_ITEM':
          cost = unitPrice * itemsCount;
          quantity = itemsCount;
          break;
        case 'PERCENTAGE':
          cost = (unitPrice / 100) * orderTotal;
          quantity = 1;
          break;
        default:
          cost = unitPrice;
          quantity = 1;
      }

      cost = Math.round(cost * 100) / 100;

      if (cost <= 0) continue;

      const balance = Number(wallet.balance);
      if (balance < cost) {
        console.error(`❌ [PPU-BILLING] Insufficient balance for ${app.slug}: need ${cost}, have ${balance}`);
        continue;
      }

      const result = await executeWithRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          await tx.companyWallet.update({
            where: { companyId },
            data: {
              balance: { decrement: cost },
              totalSpent: { increment: cost },
            },
          });

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: cost,
              type: 'DEDUCT',
              status: 'COMPLETED',
              description: `PPU: ${app.name} - ${method === 'PERCENTAGE' ? `${unitPrice}%` : `${unitPrice} ج`}${method === 'PER_ITEM' ? ` × ${itemsCount}` : ''}`,
              referenceId: `ORDER_${orderNumber}_${app.slug}`,
            },
          });

          const usageLog = await tx.appUsageLog.create({
            data: {
              companyAppId: companyApp.id,
              feature: 'order_billing',
              quantity,
              totalCost: cost,
              metadata: {
                orderNumber,
                orderTotal,
                itemsCount,
                ppuBillingMethod: method,
                unitPrice,
                appSlug: app.slug,
                appName: app.name,
              },
            },
          });

          return usageLog;
        });
      });

      deductions.push({
        appSlug: app.slug,
        appName: app.name,
        cost,
        method,
        usageLogId: result.id,
      });
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

module.exports = { billOrderPpuApps };
