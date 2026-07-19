const { PrismaClient } = require('../generated/postgresql_v2');
const prisma = new PrismaClient();

// Convert waitTime + timeUnit to milliseconds
function toMs(waitTime, timeUnit) {
  switch (timeUnit) {
    case 'Minutes': return waitTime * 60 * 1000;
    case 'Hours':   return waitTime * 60 * 60 * 1000;
    case 'Days':    return waitTime * 24 * 60 * 60 * 1000;
    default:        return waitTime * 60 * 1000;
  }
}

async function testAutoChange() {
  console.log('--- Starting Auto-Change Test ---');
  let fakeOrderId = null;
  let ruleId = null;

  try {
    // 1. Get a company to use
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('No company found to test with.');
      return;
    }
    const companyId = company.id;
    console.log(`Using Company ID: ${companyId}`);

    // 2. Create an Auto Change Rule (PENDING -> CONFIRMED after 30 minutes)
    const rule = await prisma.orderStatusAutoChangeRule.create({
      data: {
        companyId,
        fromStatus: 'PENDING',
        toStatus: 'CONFIRMED',
        waitTime: 30,
        timeUnit: 'Minutes'
      }
    });
    ruleId = rule.id;
    console.log(`Created Rule ID: ${ruleId} (PENDING -> CONFIRMED after 30 Minutes)`);

    // 3. Create a Fake Order set to 31 minutes ago
    const thirtyOneMinutesAgo = new Date(Date.now() - (31 * 60 * 1000));
    
    // We need to create a Customer or just an Order directly if possible.
    // Order model requires many fields, so we will use an existing customer or just minimal required fields.
    let customer = await prisma.customer.findFirst({ where: { companyId } });
    let isFakeCustomer = false;
    if (!customer) {
      console.log('No customer found. Creating a fake one.');
      customer = await prisma.customer.create({
        data: {
          companyId,
          name: 'Test Auto Change Customer',
          phone: '+201000000000'
        }
      });
      isFakeCustomer = true;
    }

    const fakeOrder = await prisma.order.create({
      data: {
        companyId,
        customerId: customer.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotal: 100,
        total: 100,
        orderSource: 'REGULAR',
        orderNumber: 'TEST_AUTO_001',
        createdAt: thirtyOneMinutesAgo,
        updatedAt: thirtyOneMinutesAgo
      }
    });
    fakeOrderId = fakeOrder.id;
    console.log(`Created Fake Order ID: ${fakeOrderId} in status PENDING, updated 31 minutes ago.`);

    console.log('\n--- Running Cron Logic ---');
    // 4. Run Cron Logic
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - toMs(rule.waitTime, rule.timeUnit));
    
    console.log(`Cutoff Time is: ${cutoffTime.toISOString()}`);
    console.log(`Order UpdatedAt is: ${thirtyOneMinutesAgo.toISOString()}`);

    const ordersToUpdate = await prisma.order.findMany({
      where: {
        companyId: rule.companyId,
        status: rule.fromStatus,
        updatedAt: { lte: cutoffTime },
        id: fakeOrderId // only test our fake order
      },
      select: { id: true, status: true, updatedAt: true },
    });

    if (ordersToUpdate.length > 0) {
      console.log(`Cron caught ${ordersToUpdate.length} orders! Changing status to ${rule.toStatus}...`);
      
      await prisma.order.updateMany({
        where: {
          id: { in: ordersToUpdate.map(o => o.id) },
        },
        data: {
          status: rule.toStatus,
          updatedAt: now,
        },
      });

      const historyEntries = ordersToUpdate.map(o => ({
        orderId: o.id,
        oldStatus: rule.fromStatus,
        status: rule.toStatus,
        changedBy: 'SYSTEM_AUTO',
        reason: `Auto-changed by rule: after ${rule.waitTime} ${rule.timeUnit}`,
        createdAt: now,
      }));

      await prisma.orderStatusHistory.createMany({
        data: historyEntries,
        skipDuplicates: true,
      });

      console.log('Cron logic executed successfully.');
    } else {
      console.log('Cron did NOT catch the order. Something is wrong.');
    }

    console.log('\n--- Verifying Results ---');
    // 5. Verify the Order
    const updatedOrder = await prisma.order.findUnique({ where: { id: fakeOrderId } });
    console.log(`Order Status is now: ${updatedOrder.status} (Expected: CONFIRMED)`);
    if (updatedOrder.status === 'CONFIRMED') {
      console.log('✅ Status Change Test PASSED!');
    } else {
      console.log('❌ Status Change Test FAILED!');
    }

    // 6. Verify History
    const history = await prisma.orderStatusHistory.findFirst({
      where: { orderId: fakeOrderId, changedBy: 'SYSTEM_AUTO' }
    });
    if (history) {
      console.log(`✅ History Log Test PASSED! (Reason recorded: "${history.reason}")`);
    } else {
      console.log('❌ History Log Test FAILED!');
    }

  } catch (error) {
    console.error('Test script failed:', error);
  } finally {
    console.log('\n--- Cleanup ---');
    if (fakeOrderId) {
      await prisma.order.delete({ where: { id: fakeOrderId } });
      console.log(`Deleted Fake Order: ${fakeOrderId}`);
    }
    if (ruleId) {
      await prisma.orderStatusAutoChangeRule.delete({ where: { id: ruleId } });
      console.log(`Deleted Rule: ${ruleId}`);
    }
    await prisma.$disconnect();
  }
}

testAutoChange();
