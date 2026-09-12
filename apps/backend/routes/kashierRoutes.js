const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');
const KashierService = require('../services/kashierService');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone, safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');

const router = express.Router();
const getPrisma = () => getSharedPrismaClient();

router.post('/kashier/checkout', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const {
      guestName, guestEmail, guestPhone,
      shippingAddress, items, notes,
      subtotal, shippingCost, total,
      couponCode,
    } = req.body;

    if (!guestPhone || !guestName || !shippingAddress) {
      return res.status(400).json({
        success: false, error: 'جميع الحقول المطلوبة يجب ملؤها (الاسم، الهاتف، العنوان)',
      });
    }

    const prisma = getPrisma();
    const companyId = company.id;

    // Find or create customer
    let customer = await findCustomerByPhone(prisma, guestPhone, companyId);

    if (!customer) {
      const nameParts = (guestName || 'Customer').split(/\s+/).filter(Boolean);
      customer = await safeCreateCustomer(
        prisma,
        {
          data: {
            firstName: nameParts[0] || 'Customer',
            lastName: nameParts.slice(1).join(' ') || '',
            email: guestEmail || '',
            phone: guestPhone,
            phoneNormalized: toCanonicalE164(guestPhone),
            companyId,
            status: 'ACTIVE',
          },
        },
        buildPhoneWhere(guestPhone, companyId)
      );
    }

    // Generate order number
    const orderNumber = await orderService.generateOrderNumber(companyId);

    // Prepare order items
    const orderItemsData = (items || []).map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const image = item.image || item.productImage || null;
      return {
        productId: item.productId || null,
        variantId: item.variantId || null,
        productName: item.name || 'Product',
        productImage: image,
        price,
        quantity,
        total: price * quantity,
        productSku: item.sku || null,
        productColor: item.color ? String(item.color) : (item.attributes?.color ? String(item.attributes.color) : (item.attributes?.Colour ? String(item.attributes.Colour) : null)),
        productSize: item.size != null ? String(item.size) : (item.attributes?.size != null ? String(item.attributes.size) : null),
        metadata: JSON.stringify({
          attributes: item.attributes || {},
          image,
        }),
      };
    });

    const orderSubtotal = Number(subtotal) || orderItemsData.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const orderShipping = Number(shippingCost) || 0;
    const orderTotal = Number(total) || (orderSubtotal + orderShipping);

    // Create Kashier session
    const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
    const redirectUrl = `https://${baseDomain}/storefront/thank-you?orderNumber=${orderNumber}`;
    const webhookUrl = `https://${baseDomain}/api/v1/payment/kashier/webhook`;

    const session = await KashierService.createPaymentSession(
      {
        amount: orderTotal,
        currency: 'EGP',
        orderId: orderNumber,
        customer: { email: guestEmail, reference: guestPhone },
        redirectUrl,
        webhookUrl,
        description: `Payment for order ${orderNumber}`,
      },
      companyId,
    );

    if (!session.success) {
      return res.status(502).json({
        success: false, error: 'فشل إنشاء جلسة الدفع. حاول مرة أخرى.',
      });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        companyId,
        customerName: guestName,
        customerPhone: guestPhone,
        customerEmail: guestEmail || '',
        shippingAddress: JSON.stringify(shippingAddress),
        customerAddress: JSON.stringify(shippingAddress),
        city: shippingAddress?.city || '',
        governorate: shippingAddress?.governorate || '',
        subtotal: orderSubtotal,
        shipping: orderShipping,
        discount: 0,
        total: orderTotal,
        currency: 'EGP',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CREDIT_CARD',
        notes: notes || '',
        sourceType: 'storefront',
        extractionMethod: 'storefront',
        orderSource: 'STOREFRONT',
        isViewed: false,
        metadata: JSON.stringify({
          kashierSessionId: session.sessionId,
          kashierMode: process.env.KASHIER_MODE || 'test',
          ...(couponCode ? { couponCode } : {}),
        }),
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    // Decrement stock
    for (const item of items || []) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: Number(item.quantity) || 1 } },
      }).catch(() => {});
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: Number(item.quantity) || 1 } },
        }).catch(() => {});
      }
    }

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        sessionUrl: session.sessionUrl,
        sessionId: session.sessionId,
      },
    });
  } catch (error) {
    console.error('[KASHIER-CHECKOUT] Error:', error);
    res.status(500).json({
      success: false, error: 'حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.',
    });
  }
});

router.post('/kashier/webhook', async (req, res) => {
  try {
    const rawBody = req.body || {};
    console.log('[KASHIER-WEBHOOK] Received:', JSON.stringify(rawBody));

    // Support all possible Kashier payload wrappers:
    // 1) Kashier delivery log: { payload: { data: { ... } } }
    // 2) Direct payload: { platform: "kashier", event: "pay", data: { ... } }
    // 3) Direct data: { data: { ... } }
    // 4) Flat: { ... }
    const eventData = rawBody.payload?.data || rawBody.data || rawBody.payload || rawBody;
    const metaData = eventData.metaData || rawBody.metaData || rawBody.payload?.metaData || {};

    const rawStatus = (
      eventData.status ||
      eventData.paymentStatus ||
      rawBody.status ||
      rawBody.paymentStatus ||
      (rawBody.eventType === 'pay' && eventData.transactionResponseCode === '00' ? 'SUCCESS' : '') ||
      ''
    ).toString().toUpperCase();

    const orderNumber = (
      eventData.merchantOrderId ||
      metaData.orderId ||
      rawBody.merchantOrderId ||
      eventData.orderId ||
      eventData.order ||
      null
    );

    const sessionId = (
      eventData.sessionId ||
      eventData._id ||
      eventData.kashierOrderId ||
      rawBody.sessionId ||
      rawBody._id ||
      null
    );

    const transactionId = (
      eventData.transactionId ||
      rawBody.resourceId ||
      (rawBody.notificationKey ? rawBody.notificationKey.split('::')[0] : null) ||
      null
    );

    const orderReference = (
      eventData.orderReference ||
      eventData.merchantReference ||
      null
    );

    if (!rawStatus && !transactionId && !orderNumber && !sessionId) {
      console.warn('[KASHIER-WEBHOOK] Empty or unrecognizable payload:', JSON.stringify(rawBody));
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    }

    const isSuccess = rawStatus === 'SUCCESS' || rawStatus === 'CAPTURED' || eventData.transactionResponseCode === '00';
    const paymentStatus = isSuccess ? 'COMPLETED' : 'FAILED';

    const prisma = getPrisma();

    // 1. Check if this is a wallet recharge via customer reference or orderNumber
    const customerRef = (
      eventData.customer?.reference ||
      rawBody.customer?.reference ||
      eventData.customerReference ||
      metaData.customerReference ||
      ''
    );

    if (customerRef.startsWith('wallet:') || (orderNumber && orderNumber.startsWith('WLT-'))) {
      let walletCompanyId = null;
      let rechargeAmount = 0;

      if (customerRef.startsWith('wallet:')) {
        const parts = customerRef.split(':');
        walletCompanyId = parts[1];
        rechargeAmount = parseFloat(parts[2]);
      } else {
        rechargeAmount = parseFloat(eventData.amount || rawBody.amount || 0);
      }

      if (paymentStatus === 'COMPLETED' && walletCompanyId && rechargeAmount > 0) {
        const companyWallet = await prisma.companyWallet.upsert({
          where: { companyId: walletCompanyId },
          update: { balance: { increment: rechargeAmount } },
          create: { companyId: walletCompanyId, balance: rechargeAmount, currency: 'EGP' },
        });

        await prisma.transaction.create({
          data: {
            walletId: companyWallet.id,
            type: 'DEPOSIT',
            amount: rechargeAmount,
            status: 'COMPLETED',
            description: `شحن المحفظة عبر كاشير: ${rechargeAmount} جنيه`,
            referenceId: transactionId || sessionId || orderNumber,
          },
        });

        // 🚀 تحصيل رسوم الاستخدام المؤجلة تلقائياً بعد شحن الرصيد
        try {
          const pendingBillingService = require('../services/pendingBillingService');
          const pendingResult = await pendingBillingService.processPendingUsageCharges(walletCompanyId);
          if (pendingResult?.processed > 0) {
            console.log(`✅ [KASHIER-WEBHOOK] Auto-collected ${pendingResult.processed} pending charge(s), released ${pendingResult.released?.length || 0} order(s) for company ${walletCompanyId}`);
          }
        } catch (pendingError) {
          console.error('⚠️ [KASHIER-WEBHOOK] Error processing pending charges:', pendingError.message);
        }

        console.log(`[KASHIER-WEBHOOK] Wallet recharge completed for company ${walletCompanyId}: ${rechargeAmount} EGP`);
      }

      return res.json({ success: true, message: 'Wallet recharge processed' });
    }

    // 2. Order flow: Find order by orderNumber, or sessionId in metadata
    let order = null;
    let isGuest = false;

    if (orderNumber) {
      order = await prisma.order.findFirst({
        where: { orderNumber },
      });
      if (!order) {
        order = await prisma.guestOrder.findFirst({
          where: { orderNumber },
        });
        if (order) isGuest = true;
      }
    }

    if (!order && sessionId) {
      order = await prisma.order.findFirst({
        where: { metadata: { contains: sessionId } },
      });
      if (!order) {
        order = await prisma.guestOrder.findFirst({
          where: { metadata: { contains: sessionId } },
        });
        if (order) isGuest = true;
      }
    }

    if (!order) {
      console.warn('[KASHIER-WEBHOOK] No order found for orderNumber:', orderNumber, 'or sessionId:', sessionId);
      return res.status(200).json({ success: true, message: 'Order not found, acknowledged' });
    }

    // Resolve payment method (WALLET, CREDIT_CARD)
    const rawMethod = String(eventData.method || eventData.sourceOfFunds?.type || '').toLowerCase();
    let resolvedPaymentMethod = 'CREDIT_CARD';
    if (rawMethod.includes('wallet')) {
      resolvedPaymentMethod = 'WALLET';
    } else if (rawMethod.includes('card') || rawMethod.includes('visa') || rawMethod.includes('mastercard')) {
      resolvedPaymentMethod = 'CREDIT_CARD';
    }

    // Build rich structured kashierPayment metadata
    const kashierPayment = {
      transactionId: transactionId || eventData.transactionId || null,
      orderReference: orderReference || eventData.orderReference || null,
      kashierOrderId: eventData.kashierOrderId || sessionId || null,
      status: rawStatus || (isSuccess ? 'SUCCESS' : 'FAILED'),
      method: rawMethod || (resolvedPaymentMethod === 'WALLET' ? 'wallet' : 'card'),
      amount: Number(eventData.amount) || Number(order.total) || 0,
      currency: eventData.currency || order.currency || 'EGP',
      payerAccount: eventData.sourceOfFunds?.walletInfo?.payerAccount || eventData.card?.maskedCardNumber || null,
      payerType: eventData.sourceOfFunds?.type || (resolvedPaymentMethod === 'WALLET' ? 'Wallet' : 'Card'),
      vat: eventData.settlementInfo?.vat || null,
      sellingRate: eventData.settlementInfo?.sellingRate || null,
      totalSellingFees: eventData.settlementInfo?.totalSellingFees || null,
      settledAmount: eventData.settlementInfo?.settledAmount || null,
      transactionResponseCode: eventData.transactionResponseCode || null,
      transactionResponseMessage: eventData.transactionResponseMessage?.ar || eventData.transactionResponseMessage?.en || 'Approved',
      confirmedAt: eventData.creationDate || new Date().toISOString(),
    };

    const existingMeta = typeof order.metadata === 'string'
      ? (() => { try { return JSON.parse(order.metadata); } catch { return {}; } })()
      : (order.metadata || {});

    const updatedMetadata = JSON.stringify({
      ...existingMeta,
      kashierSessionId: sessionId || existingMeta.kashierSessionId,
      kashierTransactionId: transactionId,
      kashierWebhookStatus: rawStatus || (isSuccess ? 'SUCCESS' : 'FAILED'),
      kashierConfirmedAt: new Date().toISOString(),
      kashierPayment,
    });

    const updateData = {
      paymentStatus,
      paymentMethod: resolvedPaymentMethod,
      ...(paymentStatus === 'COMPLETED' && order.status === 'PENDING' ? { status: 'CONFIRMED' } : {}),
      metadata: updatedMetadata,
    };

    if (isGuest) {
      await prisma.guestOrder.update({
        where: { id: order.id },
        data: updateData,
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      // Add a clear order note for activity trail
      try {
        const methodArabic = resolvedPaymentMethod === 'WALLET' ? 'المحفظة الإلكترونية' : 'البطاقة البنكية';
        const payerInfo = kashierPayment.payerAccount ? ` (رقم الدافع: ${kashierPayment.payerAccount})` : '';
        const txInfo = transactionId ? ` (رقم المعاملة: ${transactionId})` : '';
        const noteText = isSuccess
          ? `✅ تم الدفع إلكترونياً عبر كاشير بنجاح: ${kashierPayment.amount} ${kashierPayment.currency} عن طريق ${methodArabic}${payerInfo}${txInfo}`
          : `❌ فشلت عملية الدفع عبر كاشير${txInfo}`;

        await prisma.orderNote.create({
          data: {
            orderId: order.id,
            note: noteText,
            isInternal: true,
          },
        });
      } catch (noteErr) {
        console.warn('[KASHIER-WEBHOOK] Could not create order note:', noteErr.message);
      }
    }

    console.log(`✅ [KASHIER-WEBHOOK] Order ${order.orderNumber} updated to ${paymentStatus} via ${resolvedPaymentMethod} (Tx: ${transactionId})`);
    return res.json({
      success: true,
      message: 'Webhook processed',
      data: {
        orderNumber: order.orderNumber,
        paymentStatus,
        paymentMethod: resolvedPaymentMethod,
        transactionId,
      },
    });
  } catch (error) {
    console.error('[KASHIER-WEBHOOK] Error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

router.post('/kashier/test-connection', async (req, res) => {
  try {
    const { merchantId, apiKey, secretKey, mode } = req.body;

    if (!merchantId || !apiKey || !secretKey) {
      return res.status(400).json({ success: false, error: 'Missing required configuration' });
    }

    const session = await KashierService.createPaymentSession({
      amount: 1,
      currency: 'EGP',
      orderId: `test-${Date.now()}`,
      customer: { email: 'test@test.com', reference: 'test' },
      redirectUrl: 'https://example.com/test',
      webhookUrl: 'https://example.com/test',
      description: 'Connection test',
    }, null, { merchantId, apiKey, secretKey, mode: mode || 'test' });

    if (session.success) {
      res.json({ success: true, message: 'Connection successful' });
    } else {
      res.status(400).json({ success: false, error: session.error });
    }
  } catch (error) {
    console.error('[KASHIER-TEST] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
