/**
 * QP Express Automated Background Status Sync Cron
 * مهمة مجدولة في الخلفية لمزامنة وتحديث حالات شحنات كيو بي إكسبريس تلقائياً
 */

const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const QpExpressService = require('../services/qpExpressService');
const shippingProviderService = require('../services/shippingProviderService');

let isRunning = false;

async function runQpExpressStatusSync() {
  if (isRunning) {
    console.log('⏳ [QP-EXPRESS-CRON] Previous sync still active, skipping.');
    return;
  }

  isRunning = true;
  try {
    const prisma = getSharedPrismaClient();
    console.log('🔄 [QP-EXPRESS-CRON] Checking active QP Express shipments for automated status sync...');

    // Find all active shipments with carrierType QP_EXPRESS that are not yet in final states
    const activeShipments = await safeQuery(() =>
      prisma.shipment.findMany({
        where: {
          carrierType: 'QP_EXPRESS',
          status: {
            notIn: ['DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED'],
          },
          trackingNumber: {
            not: null,
          },
        },
        include: {
          order: true,
        },
        take: 100,
      })
    , 2);

    if (!activeShipments || activeShipments.length === 0) {
      console.log('✨ [QP-EXPRESS-CRON] No active shipments pending sync.');
      return;
    }

    console.log(`📦 [QP-EXPRESS-CRON] Found ${activeShipments.length} active shipment(s) to sync.`);
    let updatedCount = 0;

    for (const shipment of activeShipments) {
      try {
        const qpService = new QpExpressService({}, shipment.companyId);
        const tracking = await qpService.trackShipment(shipment.trackingNumber);

        if (tracking && tracking.found) {
          const oldStatus = shipment.status;
          const newStatus = tracking.status;

          // Update Shipment in DB
          await safeQuery(() =>
            prisma.shipment.update({
              where: { id: shipment.id },
              data: {
                status: newStatus,
                metadata: JSON.stringify({
                  ...shippingProviderService.safeJsonParse(shipment.metadata, {}),
                  lastLiveSync: new Date().toISOString(),
                  liveStatus: tracking,
                }),
              },
            })
          , 2);

          // If final or changed, sync with Order status as well
          if (shipment.orderId && newStatus !== oldStatus) {
            let orderStatusToSet = null;
            if (newStatus === 'DELIVERED') {
              orderStatusToSet = 'DELIVERED';
            } else if (newStatus === 'RETURNED') {
              orderStatusToSet = 'RETURNED';
            } else if (newStatus === 'OUT_FOR_DELIVERY') {
              orderStatusToSet = 'SHIPPED';
            }

            if (orderStatusToSet) {
              await safeQuery(() =>
                prisma.order.update({
                  where: { id: shipment.orderId },
                  data: {
                    status: orderStatusToSet,
                  },
                })
              , 2).catch(() => {});
            }
          }

          updatedCount++;
        }
      } catch (itemErr) {
        console.warn(`⚠️ [QP-EXPRESS-CRON] Error syncing shipment ${shipment.trackingNumber}:`, itemErr.message);
      }
    }

    console.log(`✅ [QP-EXPRESS-CRON] Completed. Synced and updated ${updatedCount}/${activeShipments.length} shipments.`);
  } catch (error) {
    console.error('❌ [QP-EXPRESS-CRON] Background sync job failed:', error.message);
  } finally {
    isRunning = false;
  }
}

function startQpExpressSyncCron() {
  console.log('🚀 [QP-EXPRESS-CRON] Starting QP Express automated status sync scheduler...');

  // Run every 30 minutes: '*/30 * * * *'
  cron.schedule('*/30 * * * *', runQpExpressStatusSync);

  // Initial delayed run 2 minutes after startup
  setTimeout(() => {
    runQpExpressStatusSync().catch((error) => {
      console.error('❌ [QP-EXPRESS-CRON] Initial sync run failed:', error.message);
    });
  }, 2 * 60 * 1000);

  console.log('✅ [QP-EXPRESS-CRON] Automated status sync scheduler started (runs every 30 minutes)');
}

module.exports = {
  startQpExpressSyncCron,
  runQpExpressStatusSync,
};
