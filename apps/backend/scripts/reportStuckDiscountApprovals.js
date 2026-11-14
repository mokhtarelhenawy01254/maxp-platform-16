/**
 * Report Stuck Discount Approvals (TASK 33bf4717 — Round 2)
 * Audits orders from the last 60 days with discountApprovalStatus === 'PENDING_APPROVAL'
 * for a mandatory companyId across all payment statuses.
 *
 * Provides safe CLI release for paid stuck orders without mutating order status.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const PAID_PAYMENT_STATUSES = new Set(['COMPLETED', 'PAID', 'CAPTURED', 'SETTLED']);

function safeParseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function reportStuckDiscountApprovals({ companyId, days = 60 } = {}) {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const prisma = getSharedPrismaClient();
  const gte = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: { gte },
    },
    select: {
      id: true,
      orderNumber: true,
      companyId: true,
      status: true,
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
    'companyId',
    'orderStatus',
    'paymentStatus',
    'createdAt',
    'subtotal',
    'discount',
    'total',
    'discountSource',
    'discountReason',
  ];

  console.log(headers.join(','));

  for (const order of stuckOrders) {
    const meta = safeParseJson(order.metadata);
    const row = [
      `"${order.orderNumber}"`,
      `"${order.companyId || ''}"`,
      `"${order.status || ''}"`,
      `"${order.paymentStatus || ''}"`,
      `"${order.createdAt ? new Date(order.createdAt).toISOString() : ''}"`,
      Number(order.subtotal || 0).toFixed(2),
      Number(order.discount || 0).toFixed(2),
      Number(order.total || 0).toFixed(2),
      `"${meta.discountSource || 'SYSTEM'}"`,
      `"${String(meta.discountReason || '').replace(/"/g, '""')}"`,
    ];
    console.log(row.join(','));
  }

  return stuckOrders;
}

async function releaseStuckDiscountApproval({ companyId, orderNumber, releasedBy = 'CLI_MANUAL' } = {}) {
  if (!orderNumber) {
    throw new Error('orderNumber is required');
  }

  const prisma = getSharedPrismaClient();
  const where = { orderNumber };
  if (companyId) {
    where.companyId = companyId;
  }

  const order = await prisma.order.findFirst({ where });
  if (!order) {
    throw new Error(`Order ${orderNumber} not found`);
  }

  const isPaid = PAID_PAYMENT_STATUSES.has(String(order.paymentStatus || '').toUpperCase());
  if (!isPaid) {
    throw new Error(
      `Order ${orderNumber} is not paid (paymentStatus: ${order.paymentStatus || 'UNPAID'}). Cannot release discount approval for unpaid order.`
    );
  }

  const meta = safeParseJson(order.metadata);
  meta.discountApprovalStatus = 'AUTO_APPROVED_PAID';
  meta.needsDiscountApproval = false;
  meta.discountReleasedAt = new Date().toISOString();
  meta.discountReleasedBy = releasedBy;
  meta.discountReleaseReason = 'Manual CLI release of stuck paid discount approval';

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      metadata: JSON.stringify(meta),
    },
  });

  console.log(`✅ [RELEASE] Successfully released discount approval for paid order ${orderNumber} to AUTO_APPROVED_PAID`);
  return updatedOrder;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let companyIdArg = null;
  let releaseOrderArg = null;
  let daysArg = 60;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--company-id=')) companyIdArg = arg.split('=')[1];
    else if (arg === '--company-id' && args[i + 1]) companyIdArg = args[++i];
    else if (arg.startsWith('--companyId=')) companyIdArg = arg.split('=')[1];
    else if (arg === '--companyId' && args[i + 1]) companyIdArg = args[++i];
    else if (arg.startsWith('--release=')) releaseOrderArg = arg.split('=')[1];
    else if (arg === '--release' && args[i + 1]) releaseOrderArg = args[++i];
    else if (arg.startsWith('--days=')) daysArg = Number(arg.split('=')[1]) || 60;
    else if (arg === '--days' && args[i + 1]) daysArg = Number(args[++i]) || 60;
  }

  if (releaseOrderArg) {
    releaseStuckDiscountApproval({ companyId: companyIdArg, orderNumber: releaseOrderArg })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('❌ [RELEASE-STUCK-DISCOUNTS] Error:', err.message);
        process.exit(1);
      });
  } else {
    reportStuckDiscountApprovals({ companyId: companyIdArg, days: daysArg })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('❌ [REPORT-STUCK-DISCOUNTS] Error:', err.message);
        process.exit(1);
      });
  }
}

module.exports = {
  reportStuckDiscountApprovals,
  releaseStuckDiscountApproval,
  PAID_PAYMENT_STATUSES,
};
