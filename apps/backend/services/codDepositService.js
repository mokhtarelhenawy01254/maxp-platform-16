const KashierService = require('./kashierService');
const orderService = require('./orderService');
const { getSharedPrismaClient } = require('./sharedDatabase');

const getPrisma = () => getSharedPrismaClient();

class CodDepositService {

  static async getDepositSettings(companyId) {
    const prisma = getPrisma();
    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId },
      select: {
        codDepositEnabled: true,
        codDepositType: true,
        codDepositValue: true,
        codDepositMinAmount: true,
        codDepositMaxAmount: true,
      },
    });

    if (!settings || !settings.codDepositEnabled) {
      return { enabled: false };
    }

    const value = Number(settings.codDepositValue) || 30;
    const minAmount = settings.codDepositMinAmount ? Number(settings.codDepositMinAmount) : null;
    const maxAmount = settings.codDepositMaxAmount ? Number(settings.codDepositMaxAmount) : null;

    return {
      enabled: true,
      type: settings.codDepositType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      value,
      minAmount,
      maxAmount,
    };
  }

  static calculateDepositAmount(orderTotal, settings) {
    if (!settings.enabled) return 0;

    let amount = 0;

    if (settings.type === 'FIXED') {
      amount = settings.value;
    } else {
      amount = (orderTotal * settings.value) / 100;
    }

    if (settings.minAmount !== null && amount < settings.minAmount) {
      amount = settings.minAmount;
    }

    if (settings.maxAmount !== null && amount > settings.maxAmount) {
      amount = settings.maxAmount;
    }

    return Math.round(amount * 100) / 100;
  }

  static async createDepositSession(orderId, companyId, redirectUrl) {
    const prisma = getPrisma();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const depositSettings = await this.getDepositSettings(companyId);
    if (!depositSettings.enabled) {
      return { success: false, error: 'COD deposit not enabled for this company' };
    }

    const depositAmount = this.calculateDepositAmount(Number(order.total), depositSettings);

    if (depositAmount <= 0) {
      return { success: false, error: 'Invalid deposit amount' };
    }

    if (order.codDepositPaid) {
      return { success: false, error: 'Deposit already paid for this order' };
    }

    const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
    const webhookUrl = `https://${baseDomain}/api/v1/payment/cod-deposit/webhook`;
    const finalRedirect = redirectUrl || `https://${baseDomain}/storefront/thank-you?orderNumber=${order.orderNumber}&deposit=true`;

    const session = await KashierService.createPaymentSession(
      {
        amount: depositAmount,
        currency: order.currency || 'EGP',
        orderId: `${order.orderNumber}-deposit`,
        customer: {
          email: order.customerEmail || '',
          reference: order.customerPhone || order.id,
        },
        redirectUrl: finalRedirect,
        webhookUrl,
        description: `COD deposit for order ${order.orderNumber}`,
      },
      companyId,
    );

    if (!session.success) {
      return { success: false, error: session.error || 'Failed to create payment session' };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        codDepositAmount: depositAmount,
        codDepositSessionId: session.sessionId,
        codDepositMethod: 'kashier_card',
        metadata: JSON.stringify({
          ...JSON.parse(order.metadata || '{}'),
          codDepositSessionId: session.sessionId,
          codDepositAmount: depositAmount,
          codDepositSessionUrl: session.sessionUrl,
          codDepositCreatedAt: new Date().toISOString(),
        }),
      },
    });

    return {
      success: true,
      data: {
        depositAmount,
        sessionUrl: session.sessionUrl,
        sessionId: session.sessionId,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    };
  }

  static async handleDepositWebhook(payload) {
    const prisma = getPrisma();

    const sessionId = payload._id || payload.sessionId || payload.data?.sessionId;
    const status = payload.status || payload.data?.status;

    if (!sessionId || !status) {
      return { success: false, error: 'Invalid webhook payload' };
    }

    const isSuccess = status === 'CAPTURED' || status === 'SUCCESS';

    const order = await prisma.order.findFirst({
      where: { codDepositSessionId: sessionId },
    });

    if (!order) {
      const orderByMetadata = await prisma.order.findFirst({
        where: {
          metadata: { contains: sessionId },
          codDepositSessionId: null,
        },
      });

      if (orderByMetadata) {
        await prisma.order.update({
          where: { id: orderByMetadata.id },
          data: { codDepositSessionId: sessionId },
        });
      }

      if (!orderByMetadata) {
        console.warn('[COD-DEPOSIT-WEBHOOK] No order found for session:', sessionId);
        return { success: true, message: 'Not found, acknowledged' };
      }

      if (!isSuccess) {
        return { success: true, message: 'Payment not successful, no action taken' };
      }

      await this.confirmOrderAfterDeposit(orderByMetadata.id, 'kashier_card');

      return { success: true, message: 'Deposit processed via metadata lookup' };
    }

    if (!isSuccess) {
      console.log(`[COD-DEPOSIT-WEBHOOK] Payment failed for session ${sessionId}`);
      return { success: true, message: 'Payment not successful' };
    }

    if (order.codDepositPaid) {
      console.log(`[COD-DEPOSIT-WEBHOOK] Deposit already paid for order ${order.orderNumber}`);
      return { success: true, message: 'Already processed' };
    }

    await this.confirmOrderAfterDeposit(order.id, 'kashier_card');

    return { success: true, message: 'Deposit processed successfully' };
  }

  static async confirmOrderAfterDeposit(orderId, method = 'kashier_card') {
    const prisma = getPrisma();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        codDepositPaid: true,
        codDepositPaidAt: new Date(),
        codDepositMethod: method,
        paymentStatus: 'PARTIALLY_PAID',
        metadata: JSON.stringify({
          ...JSON.parse(order.metadata || '{}'),
          codDepositConfirmedAt: new Date().toISOString(),
          codDepositMethod: method,
        }),
      },
    });

    try {
      const remainingAmount = Number(order.total) - Number(order.codDepositAmount || 0);
      await orderService.updateOrderStatus(
        order.id,
        order.companyId,
        'CONFIRMED',
        remainingAmount > 0
          ? `تم دفع دفعة مقدم ${order.codDepositAmount} ج. المتبقي ${remainingAmount} ج عند الاستلام`
          : `تم دفع كامل المبلغ مقدماً ${order.total} ج`,
        'SYSTEM_COD_DEPOSIT',
        'COD Deposit System',
        null,
        false,
        { skipCallAttemptGuard: true },
      );
    } catch (statusError) {
      console.error('[COD-DEPOSIT] Status update error (non-fatal):', statusError.message);
    }

    console.log(`[COD-DEPOSIT] Order ${order.orderNumber} confirmed after deposit payment`);
  }

  static async getDepositStatus(orderId) {
    const prisma = getPrisma();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        codDepositAmount: true,
        codDepositPaid: true,
        codDepositPaidAt: true,
        codDepositMethod: true,
        codDepositSessionId: true,
        codDepositRefunded: true,
        paymentStatus: true,
        status: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const remainingAmount = Number(order.total) - Number(order.codDepositAmount || 0);

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        depositAmount: Number(order.codDepositAmount || 0),
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
        isPaid: order.codDepositPaid,
        paidAt: order.codDepositPaidAt,
        method: order.codDepositMethod,
        isRefunded: order.codDepositRefunded,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
      },
    };
  }
}

module.exports = CodDepositService;
