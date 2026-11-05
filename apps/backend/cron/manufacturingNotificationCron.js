const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const ManufacturingNotificationService = require('../services/manufacturingNotificationService');

/**
 * Scan overdue production orders and samples, emitting delay notifications
 * Testable & safe
 */
async function triggerOverdueScan() {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  let ordersScanned = 0;
  let samplesScanned = 0;
  let notificationsTriggered = 0;

  try {
    // 1. Overdue Production Orders
    const overdueOrders = await prisma.productionOrder.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['PLANNED', 'RELEASED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        companyId: true,
        orderNumber: true,
        dueDate: true,
        plannedQuantity: true,
        customerId: true,
        bom: {
          select: { name: true },
        },
        stages: {
          where: { partnerFactoryId: { not: null } },
          orderBy: { sequence: 'asc' },
          take: 1,
          include: { partnerFactory: true },
        },
      },
    });

    ordersScanned = overdueOrders.length;
    for (const order of overdueOrders) {
      try {
        await ManufacturingNotificationService.emit('PRODUCTION_ORDER_DELAYED', {
          companyId: order.companyId,
          productionOrder: {
            ...order,
            productName: order.bom?.name || 'أمر إنتاج',
          },
        });
        notificationsTriggered++;
      } catch (err) {
        console.warn(`[MFG-OVERDUE-CRON] Order ${order.id} emit failed:`, err.message);
      }
    }

    // 2. Overdue Sample Orders
    const overdueSamples = await prisma.sampleOrder.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
        sampleReceived: false,
      },
      select: {
        id: true,
        companyId: true,
        sampleNumber: true,
        productName: true,
        dueDate: true,
        customerId: true,
        partnerFactoryId: true,
      },
    });

    samplesScanned = overdueSamples.length;
    for (const sample of overdueSamples) {
      try {
        await ManufacturingNotificationService.emit('PRODUCTION_ORDER_DELAYED', {
          companyId: sample.companyId,
          sampleOrder: sample,
          entityId: sample.id,
        });
        notificationsTriggered++;
      } catch (err) {
        console.warn(`[MFG-OVERDUE-CRON] Sample ${sample.id} emit failed:`, err.message);
      }
    }

    return {
      success: true,
      ordersScanned,
      samplesScanned,
      notificationsTriggered,
    };
  } catch (error) {
    console.error('❌ [MFG-OVERDUE-CRON] Error during scan:', error.message);
    return {
      success: false,
      error: error.message,
      ordersScanned,
      samplesScanned,
      notificationsTriggered,
    };
  }
}

/**
 * Start periodic cron job every 15 minutes
 */
function startManufacturingNotificationCron() {
  console.log('⏰ [MFG-NOTIFICATION-CRON] Initializing Manufacturing Notification Cron (every 15 min)...');

  cron.schedule('*/15 * * * *', async () => {
    console.log('⏰ [MFG-NOTIFICATION-CRON] Running scheduled scan for overdue manufacturing orders...');
    try {
      const res = await triggerOverdueScan();
      console.log(
        `✅ [MFG-NOTIFICATION-CRON] Overdue scan completed: orders=${res.ordersScanned}, samples=${res.samplesScanned}, triggered=${res.notificationsTriggered}`
      );
    } catch (err) {
      console.error('❌ [MFG-NOTIFICATION-CRON] Cron run failed:', err.message);
    }
  });
}

module.exports = {
  startManufacturingNotificationCron,
  triggerOverdueScan,
};
