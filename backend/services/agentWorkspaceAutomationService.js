const { getSharedPrismaClient } = require('./sharedDatabase');
const orderService = require('./orderService');

class AgentWorkspaceAutomationService {
  constructor() {
    this.MAX_CALL_ATTEMPTS = 5; // Default limit for auto-cancellation
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * Run automated checks for the agent workspace
   * Called by a cron job or background worker
   */
  async runAutomatedChecks() {
    console.log('🤖 [AGENT-AUTOMATION] Starting automated checks...');
    try {
      await this.processExcessiveCallAttempts();
      // Add more checks here as needed (e.g., follow-up reminders)
    } catch (error) {
      console.error('❌ [AGENT-AUTOMATION] Error in automated checks:', error);
    }
  }

  /**
   * Automatically cancel or escalate orders with too many failed call attempts
   */
  async processExcessiveCallAttempts() {
    console.log('🤖 [AGENT-AUTOMATION] Checking for orders with excessive call attempts...');

    const statusesToWatch = ['PENDING', 'pending', 'NEW', 'new'];

    // 1. Regular Orders
    const regularOrders = await this.prisma.order.findMany({
      where: {
        status: { in: statusesToWatch },
        callAttempts: { gte: this.MAX_CALL_ATTEMPTS },
        updatedAt: { lt: new Date(Date.now() - 3600000) } // At least 1 hour old to avoid immediate cancellation
      }
    });

    for (const order of regularOrders) {
      console.log(`🤖 [AGENT-AUTOMATION] Cancelling regular order ${order.orderNumber} (Attempts: ${order.callAttempts})`);
      const svc = new (require('./orderService'))(order.companyId);
      await svc.updateOrderStatus(
        order.id,
        order.companyId,
        'CANCELLED',
        `إلغاء تلقائي: تجاوز حد محاولات الاتصال (${this.MAX_CALL_ATTEMPTS} محاولات)`,
        null, // System action
        'System'
      );
    }

    // 2. Guest Orders
    const guestOrders = await this.prisma.guestOrder.findMany({
      where: {
        status: { in: statusesToWatch },
        callAttempts: { gte: this.MAX_CALL_ATTEMPTS },
        updatedAt: { lt: new Date(Date.now() - 3600000) }
      }
    });

    for (const order of guestOrders) {
      console.log(`🤖 [AGENT-AUTOMATION] Cancelling guest order ${order.orderNumber} (Attempts: ${order.callAttempts})`);
      
      await this.prisma.$transaction([
        this.prisma.guestOrder.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' }
        }),
        this.prisma.orderStatusHistory.create({
          data: {
            guestOrderId: order.id,
            status: 'CANCELLED',
            reason: `إلغاء تلقائي: تجاوز حد محاولات الاتصال (${this.MAX_CALL_ATTEMPTS} محاولات)`,
            userName: 'System'
          }
        })
      ]);
    }

    console.log(`✅ [AGENT-AUTOMATION] Processed ${regularOrders.length} regular and ${guestOrders.length} guest orders.`);
  }
}

module.exports = new AgentWorkspaceAutomationService();
