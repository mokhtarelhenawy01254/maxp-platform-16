const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Milestone / Gift Engine for Swan Shoe store
 * - Order 2: هدية مفاجئة (كوبون شحن مجاني أو 15%)
 * - Order 3: Milestone (كوبون 20% أو منتج مجاني)
 * - Anniversary: ذكرى سنة من أول طلب
 * Called on DELIVERED status transition.
 */
async function handleOrderMilestones({ orderId, companyId, customerId }) {
  if (!companyId || !customerId || !orderId) return { handled: false, reason: 'missing_params' };
  const prisma = getSharedPrismaClient();
  try {
    const deliveredCount = await prisma.order.count({
      where: { companyId, customerId, status: 'DELIVERED' }
    });

    // Load first order date for anniversary check
    const firstOrder = await prisma.order.findFirst({
      where: { companyId, customerId, status: 'DELIVERED' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, orderNumber: true }
    });

    let gifts = [];

    // Order 2 gift
    if (deliveredCount === 2) {
      const gift = await createMilestoneCoupon({
        companyId,
        customerId,
        prefix: 'SWAN-GIFT2',
        value: 15,
        type: 'PERCENTAGE',
        name: 'هدية الطلب الثاني 🎁',
        description: 'هدية مفاجئة - شكراً لثقتك الثانية في Swan',
        validDays: 30
      });
      gifts.push({ milestone: 'order_2', coupon: gift?.code });
      await notifyMilestone(companyId, customerId, 'MILESTONE_ORDER_2', {
        orderCount: '2',
        couponCode: gift?.code || '',
        productName: 'هدية مفاجئة'
      });
    }

    // Order 3 milestone
    if (deliveredCount === 3) {
      const gift = await createMilestoneCoupon({
        companyId,
        customerId,
        prefix: 'SWAN-MILE3',
        value: 20,
        type: 'PERCENTAGE',
        name: 'هدية الطلب الثالث 🏆',
        description: 'Milestone - وصلتِ 3 طلبات، تستحقي الأفضل',
        validDays: 45
      });
      gifts.push({ milestone: 'order_3', coupon: gift?.code });
      await notifyMilestone(companyId, customerId, 'MILESTONE_ORDER_3', {
        orderCount: '3',
        couponCode: gift?.code || '',
        productName: 'هدية Milestone'
      });
    }

    // Anniversary check (365 days from first order)
    if (firstOrder) {
      const now = new Date();
      const anniversaryDate = new Date(firstOrder.createdAt);
      anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);
      // If today is anniversary ±3 days and not notified before this year
      const diffDays = Math.abs((now - anniversaryDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 && now >= anniversaryDate) {
        // Check if already gifted this year via coupon metadata
        const yearTag = `anniv-${anniversaryDate.getFullYear()}`;
        const existing = await prisma.coupon.findFirst({
          where: { companyId, customerSegments: { contains: customerId }, metadata: { contains: yearTag } }
        });
        if (!existing) {
          const gift = await createMilestoneCoupon({
            companyId,
            customerId,
            prefix: 'SWAN-ANNIV',
            value: 25,
            type: 'PERCENTAGE',
            name: 'ذكرى سنة مع Swan 💖',
            description: 'سنة كاملة مع Swan - هديتك الخاصة',
            validDays: 30,
            extraMeta: yearTag
          });
          gifts.push({ milestone: 'anniversary', coupon: gift?.code });
          await notifyMilestone(companyId, customerId, 'MILESTONE_ANNIVERSARY', {
            couponCode: gift?.code || '',
            years: '1'
          });
        }
      }
    }

    if (gifts.length > 0) {
      console.log(`🎁 [MILESTONE] customer=${customerId} count=${deliveredCount} gifts=${JSON.stringify(gifts)}`);
      return { handled: true, deliveredCount, gifts };
    }
    return { handled: false, deliveredCount };
  } catch (e) {
    console.warn('Milestone handling failed', e.message);
    return { handled: false, error: e.message };
  }
}

async function createMilestoneCoupon({ companyId, customerId, prefix, value, type, name, description, validDays, extraMeta }) {
  const prisma = getSharedPrismaClient();
  const code = `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${String(customerId).slice(-4).toUpperCase()}`;
  const now = new Date();
  const validTo = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);
  try {
    const coupon = await prisma.coupon.create({
      data: {
        companyId,
        code: code.toUpperCase(),
        name,
        description,
        type: type === 'FIXED' ? 'FIXED_AMOUNT' : 'PERCENTAGE',
        value: parseFloat(value),
        validFrom: now,
        validTo,
        isActive: true,
        usageLimit: 1,
        userUsageLimit: 1,
        customerSegments: JSON.stringify([customerId]),
        metadata: JSON.stringify({ milestone: true, customerId, prefix, extraMeta }),
        createdBy: 'milestone-engine'
      }
    });
    return coupon;
  } catch (e) {
    console.warn('Failed to create milestone coupon', e.message);
    return null;
  }
}

async function notifyMilestone(companyId, customerId, eventType, variables) {
  try {
    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, phone: true, firstName: true, lastName: true } });
    if (!customer || !customer.phone) return;
    const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
    await sendCustomerNotification({
      companyId,
      eventType,
      customer: { id: customer.id, phone: customer.phone, firstName: customer.firstName, lastName: customer.lastName, name: `${customer.firstName||''} ${customer.lastName||''}`.trim() },
      customerId: customer.id,
      variables
    });
  } catch (e) {
    console.warn('Milestone notify failed', e.message);
  }
}

// Cron for anniversary (run daily) — finds customers whose first order anniversary is today
async function runAnniversaryCron() {
  const prisma = getSharedPrismaClient();
  const companies = await prisma.company.findMany({ select: { id: true } });
  let sent = 0;
  for (const c of companies) {
    const customers = await prisma.customer.findMany({ where: { companyId: c.id }, select: { id: true } });
    for (const cust of customers) {
      const res = await handleOrderMilestones({ orderId: 'cron', companyId: c.id, customerId: cust.id });
      if (res?.gifts?.some(g => g.milestone === 'anniversary')) sent++;
    }
  }
  return { sent };
}

module.exports = { handleOrderMilestones, runAnniversaryCron };