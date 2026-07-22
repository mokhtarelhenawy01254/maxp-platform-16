/**
 * Turbo Tracking Scheduler Service
 * خدمة لتحديث حالة الشحنات بشكل دوري من Turbo API
 */

const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const TurboService = require('./turboService');
const { syncTurboStatusToOrder } = require('./turboStatusSyncService');

class TurboTrackingScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.lastRun = null;
    this.stats = {
      totalChecked: 0,
      totalUpdated: 0,
      totalErrors: 0
    };
  }

  /**
   * بدء خدمة التتبع
   */
  start() {
    if (this.cronJob) {
      console.log('⚠️ [TURBO-TRACKING] Service already running');
      return;
    }

    console.log('🚀 [TURBO-TRACKING] Starting tracking scheduler...');

    // فحص كل 6 ساعات
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      await this.updateAllShipments();
    });

    console.log('✅ [TURBO-TRACKING] Scheduler started - checking every 6 hours');
    
    // تشغيل فحص أولي بعد 5 دقائق من بدء السيرفر
    setTimeout(() => {
      console.log('🔄 [TURBO-TRACKING] Running initial check...');
      this.updateAllShipments();
    }, 5 * 60 * 1000);
  }

  /**
   * إيقاف خدمة التتبع
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('🛑 [TURBO-TRACKING] Scheduler stopped');
    }
  }

  /**
   * تحديث حالة جميع الشحنات
   */
  async updateAllShipments() {
    if (this.isRunning) return;
    this.isRunning = true;
    const startTime = Date.now();
    console.log('🔄 [TURBO-TRACKING] Starting batch update...');
    try {
      const prisma = getSharedPrismaClient();
      const companies = await safeQuery(() => prisma.company.findMany({
        where: { turboEnabled: true, turboApiKey: { not: null } },
        select: { id: true, turboApiKey: true }
      }), 3);
      if (!companies?.length) {
        console.log('ℹ️ [TURBO-TRACKING] No Turbo-enabled companies');
        this.isRunning = false; this.lastRun = new Date(); return;
      }
      let totalChecked = 0, totalUpdated = 0, totalErrors = 0;
      for (const company of companies) {
        try {
          const turboService = new TurboService(company.turboApiKey, company.id);
          const statusResult = await turboService.fetchAllStatuses();
          if (!statusResult?.success || !statusResult.shipments?.length) continue;

          const statusByCode = {};
          for (const s of statusResult.shipments) {
            if (s.code) statusByCode[s.code] = s;
            if (s.barCode) statusByCode[s.barCode] = s;
          }
          const codes = Object.keys(statusByCode);

          // Find Orders
          const orders = await safeQuery(() => prisma.order.findMany({
            where: {
              companyId: company.id,
              turboShipmentStatus: { notIn: ['delivered', 'cancelled', 'returned', 'remitted'] },
              OR: [{ turboShipmentId: { in: codes } }, { turboTrackingNumber: { in: codes } }]
            },
            select: { id: true, orderNumber: true, turboShipmentId: true, turboTrackingNumber: true, turboShipmentStatus: true }
          }), 3);

          for (const order of orders) {
            totalChecked++;
            const key = order.turboShipmentId || order.turboTrackingNumber;
            const matched = statusByCode[key];
            if (!matched) continue;

            const newTurboStatus = matched.internalStatus;
            if (newTurboStatus && newTurboStatus !== order.turboShipmentStatus) {
              await syncTurboStatusToOrder({
                orderId: order.id,
                orderNumber: order.orderNumber,
                companyId: company.id,
                rawStatus: matched.statusCode || matched.status || newTurboStatus,
                payload: matched.raw || matched,
                isGuestOrder: false
              });
              totalUpdated++;
              console.log(`✅ [TURBO-TRACKING] Order ${order.orderNumber}: ${order.turboShipmentStatus} → ${newTurboStatus}`);
            }
          }

          // Find GuestOrders
          const guestOrders = await safeQuery(() => prisma.guestOrder.findMany({
            where: {
              companyId: company.id,
              turboShipmentStatus: { notIn: ['delivered', 'cancelled', 'returned', 'remitted'] },
              OR: [{ turboShipmentId: { in: codes } }, { turboTrackingNumber: { in: codes } }]
            },
            select: { id: true, orderNumber: true, turboShipmentId: true, turboTrackingNumber: true, turboShipmentStatus: true }
          }), 3);

          for (const guestOrder of guestOrders) {
            totalChecked++;
            const key = guestOrder.turboShipmentId || guestOrder.turboTrackingNumber;
            const matched = statusByCode[key];
            if (!matched) continue;

            const newTurboStatus = matched.internalStatus;
            if (newTurboStatus && newTurboStatus !== guestOrder.turboShipmentStatus) {
              await syncTurboStatusToOrder({
                orderId: guestOrder.id,
                orderNumber: guestOrder.orderNumber,
                companyId: company.id,
                rawStatus: matched.statusCode || matched.status || newTurboStatus,
                payload: matched.raw || matched,
                isGuestOrder: true
              });
              totalUpdated++;
              console.log(`✅ [TURBO-TRACKING] GuestOrder ${guestOrder.orderNumber}: ${guestOrder.turboShipmentStatus} → ${newTurboStatus}`);
            }
          }

        } catch (e) { totalErrors++; console.error(`❌ [TURBO-TRACKING] Company ${company.id}:`, e.message); }
      }
      this.stats.totalChecked += totalChecked;
      this.stats.totalUpdated += totalUpdated;
      this.stats.totalErrors += totalErrors;
      const dur = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [TURBO-TRACKING] Done in ${dur}s | Checked: ${totalChecked} Updated: ${totalUpdated} Errors: ${totalErrors}`);
      this.lastRun = new Date();
    } catch (e) { console.error('❌ [TURBO-TRACKING]', e); this.stats.totalErrors++; }
    finally { this.isRunning = false; }
  }

  async updateSingleShipment(orderNumber, companyId) {
    try {
      const prisma = getSharedPrismaClient();
      let order = await safeQuery(() => prisma.order.findFirst({
        where: { orderNumber, companyId },
        include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true } } }
      }), 3);

      let isGuest = false;
      if (!order) {
        order = await safeQuery(() => prisma.guestOrder.findFirst({
          where: { orderNumber, companyId }
        }), 3);
        isGuest = true;
      }

      if (!order?.turboTrackingNumber) throw new Error('Order not found or no tracking number');
      
      const company = isGuest
        ? await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { id: true, turboApiKey: true, turboEnabled: true } }), 2)
        : order.company;

      if (!company?.turboEnabled || !company?.turboApiKey) throw new Error('Turbo not enabled');
      
      const turboService = new TurboService(company.turboApiKey, companyId);
      const statusResult = await turboService.fetchAllStatuses();

      if (statusResult?.success && statusResult.shipments?.length > 0) {
        const key = order.turboShipmentId || order.turboTrackingNumber;
        const matched = statusResult.shipments.find(s => s.code === key || s.barCode === key);
        if (matched) {
          const syncRes = await syncTurboStatusToOrder({
            orderId: order.id,
            orderNumber: order.orderNumber,
            companyId,
            rawStatus: matched.statusCode || matched.status || matched.internalStatus,
            payload: matched.raw || matched,
            isGuestOrder: isGuest
          });
          return { success: true, status: syncRes.turboStatus, data: matched };
        }
      }
      return { success: false, error: 'Failed to track shipment' };
    } catch (e) { console.error('❌ [TURBO-TRACKING]', e); throw e; }
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      stats: { ...this.stats }
    };
  }
}

const turboTrackingScheduler = new TurboTrackingScheduler();

module.exports = turboTrackingScheduler;
