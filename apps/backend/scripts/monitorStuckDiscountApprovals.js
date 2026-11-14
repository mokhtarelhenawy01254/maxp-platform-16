/**
 * Monitor Stuck Discount Approvals (TASK 33bf4717 — Item 6)
 * Audits paid orders where discount approval status is PENDING_APPROVAL.
 * Outputs COUNT=<count> and exits with code 2 if count > 0, 0 if clean.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const PAID_PAYMENT_STATUSES = ['COMPLETED', 'PAID', 'CAPTURED', 'SETTLED'];

function safeParseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function monitorStuckDiscountApprovals({ companyId, minDays, prismaClient } = {}) {
  const prisma = prismaClient || getSharedPrismaClient();

  const where = {
    paymentStatus: { in: PAID_PAYMENT_STATUSES },
  };

  if (companyId) {
    where.companyId = companyId;
  }

  if (minDays && Number(minDays) > 0) {
    where.createdAt = {
      lte: new Date(Date.now() - Number(minDays) * 24 * 60 * 60 * 1000),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      companyId: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const stuckOrders = orders.filter((order) => {
    const meta = safeParseJson(order.metadata);
    return meta?.discountApprovalStatus === 'PENDING_APPROVAL';
  });

  return stuckOrders;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let companyIdArg = null;
  let minDaysArg = null;

  for (const arg of args) {
    if (arg.startsWith('--company-id=')) companyIdArg = arg.split('=')[1];
    else if (arg.startsWith('--companyId=')) companyIdArg = arg.split('=')[1];
    else if (arg.startsWith('--min-days=')) minDaysArg = Number(arg.split('=')[1]);
    else if (arg.startsWith('--days=')) minDaysArg = Number(arg.split('=')[1]);
  }

  monitorStuckDiscountApprovals({ companyId: companyIdArg, minDays: minDaysArg })
    .then((stuckOrders) => {
      const count = stuckOrders.length;
      console.log(`COUNT=${count}`);
      if (count > 0) {
        console.warn(`⚠️ [MONITOR-STUCK-DISCOUNTS] Found ${count} paid order(s) stuck in PENDING_APPROVAL`);
        process.exit(2);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [MONITOR-STUCK-DISCOUNTS] Error:', err);
      process.exit(1);
    });
}

module.exports = {
  monitorStuckDiscountApprovals,
  PAID_PAYMENT_STATUSES,
};
