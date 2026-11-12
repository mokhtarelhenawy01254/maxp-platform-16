/**
 * Report Stuck Discount Approvals (TASK 33bf4717)
 * Audits all COMPLETED payment orders from the last 60 days
 * where discount approval status is PENDING_APPROVAL.
 *
 * READ-ONLY AUDIT: Zero automatic database mutations or refunds.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

function safeParseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function reportStuckDiscountApprovals({ days = 60 } = {}) {
  const prisma = getSharedPrismaClient();

  const gte = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: 'COMPLETED',
      createdAt: { gte },
    },
    select: {
      orderNumber: true,
      subtotal: true,
      discount: true,
      total: true,
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

  const headers = [
    'orderNumber',
    'createdAt',
    'subtotal',
    'discount',
    'total',
    'paymentStatus',
    'discountSource',
    'discountReason',
  ];

  console.log(headers.join(','));

  for (const order of stuckOrders) {
    const meta = safeParseJson(order.metadata);
    const row = [
      `"${order.orderNumber}"`,
      `"${order.createdAt ? new Date(order.createdAt).toISOString() : ''}"`,
      Number(order.subtotal || 0).toFixed(2),
      Number(order.discount || 0).toFixed(2),
      Number(order.total || 0).toFixed(2),
      `"${order.paymentStatus || ''}"`,
      `"${meta.discountSource || 'SYSTEM'}"`,
      `"${String(meta.discountReason || '').replace(/"/g, '""')}"`,
    ];
    console.log(row.join(','));
  }

  return stuckOrders;
}

if (require.main === module) {
  reportStuckDiscountApprovals()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ [REPORT-STUCK-DISCOUNTS] Error:', err);
      process.exit(1);
    });
}

module.exports = {
  reportStuckDiscountApprovals,
};
