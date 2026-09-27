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
      couponCode, cartId, pixelEventId, attribution,
    } = req.body;

    const resolvedGuestName = String(guestName || req.body.customerName || req.body.name || '').trim();
    const resolvedGuestPhone = String(guestPhone || req.body.phone || req.body.phone1 || req.body.mobileNumber || '').trim();
    const resolvedGuestEmail = String(guestEmail || req.body.email || '').trim();
    const resolvedShippingAddress = shippingAddress || (req.body.address ? {
      address: req.body.address,
      street: req.body.address,
      city: req.body.city || req.body.governorate || '',
      governorate: req.body.governorate || req.body.city || '',
    } : null);

    if (!resolvedGuestPhone || !resolvedGuestName || !resolvedShippingAddress) {
      return res.status(400).json({
        success: false, error: 'جميع الحقول المطلوبة يجب ملؤها (الاسم، الهاتف، العنوان)',
      });
    }

    const prisma = getPrisma();
    const companyId = company.id;

    // Find or create customer
    let customer = await findCustomerByPhone(prisma, resolvedGuestPhone, companyId);

    if (!customer) {
      const nameParts = (resolvedGuestName || 'Customer').split(/\s+/).filter(Boolean);
      customer = await safeCreateCustomer(
        prisma,
        {
          data: {
            firstName: nameParts[0] || 'Customer',
            lastName: nameParts.slice(1).join(' ') || '',
            email: resolvedGuestEmail || '',
            phone: resolvedGuestPhone,
            phoneNormalized: toCanonicalE164(resolvedGuestPhone),
            companyId,
            status: 'ACTIVE',
          },
        },
        buildPhoneWhere(resolvedGuestPhone, companyId)
      );
    }

    // Generate order number
    const orderNumber = await orderService.generateOrderNumber(companyId);

    // Prepare order items safely checking FK existence
    const orderItemsData = await Promise.all((items || []).map(async (item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const image = item.image || item.productImage || null;

      let validProductId = null;
      let validVariantId = null;

      if (item.productId) {
        const productExists = await prisma.product.findFirst({
          where: { id: item.productId, companyId },
          select: { id: true },
        }).catch(() => null);

        if (productExists) {
          validProductId = productExists.id;
          if (item.variantId) {
            const variantExists = await prisma.productVariant.findFirst({
              where: { id: item.variantId, productId: productExists.id },
              select: { id: true },
            }).catch(() => null);
            if (variantExists) {
              validVariantId = variantExists.id;
            }
          }
        }
      }

      return {
        productId: validProductId,
        variantId: validVariantId,
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
    }));

    const orderSubtotal = Number(subtotal) || orderItemsData.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const orderShipping = Number(shippingCost) || 0;
    const orderTotal = Number(total) || (orderSubtotal + orderShipping);
    const orderDiscount = Math.max(0, Math.round(((orderSubtotal + orderShipping) - orderTotal) * 100) / 100);

    // Create Kashier session with store origin redirect
    const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
    let storeOrigin = req.get('origin') || (req.get('referer') ? (() => { try { return new URL(req.get('referer')).origin; } catch { return null; } })() : null);
    if (!storeOrigin || (storeOrigin.includes('localhost') && process.env.NODE_ENV === 'production')) {
      storeOrigin = company.customDomain
        ? `https://${company.customDomain}`
        : (company.slug ? `https://${company.slug}.${baseDomain}` : `https://${baseDomain}`);
    }
    const redirectUrl = `${storeOrigin}/thank-you?orderId=${encodeURIComponent(orderNumber)}&orderNumber=${encodeURIComponent(orderNumber)}`;
    const webhookUrl = `https://${baseDomain}/api/v1/payment/kashier/webhook`;

    const session = await KashierService.createPaymentSession(
      {
        amount: orderTotal,
        currency: 'EGP',
        orderId: orderNumber,
        customer: { email: resolvedGuestEmail, reference: resolvedGuestPhone },
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

    // Create order with valid schema values
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        companyId,
        customerName: resolvedGuestName,
        customerPhone: resolvedGuestPhone,
        customerEmail: resolvedGuestEmail || '',
        shippingAddress: JSON.stringify(resolvedShippingAddress),
        customerAddress: JSON.stringify(resolvedShippingAddress),
        city: resolvedShippingAddress?.city || '',
        governorate: resolvedShippingAddress?.governorate || '',
        subtotal: orderSubtotal,
        shipping: orderShipping,
        discount: orderDiscount,
        total: orderTotal,
        currency: 'EGP',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CREDIT_CARD',
        notes: notes || '',
        sourceType: 'storefront',
        extractionMethod: 'storefront',
        orderSource: 'REGULAR',
        isViewed: false,
        metadata: JSON.stringify({
          kashierSessionId: session.sessionId,
          kashierMode: session.mode || process.env.KASHIER_MODE || 'live',
          cartId: cartId || null,
          pixelEventId: pixelEventId || null,
          attribution: attribution || null,
          ...(couponCode ? { couponCode } : {}),
        }),
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    // Clean up guestCart if provided
    if (cartId) {
      await prisma.guestCart.delete({ where: { cartId } }).catch(() => {});
    }

    // Decrement stock for valid products
    for (const item of orderItemsData) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: Number(item.quantity) || 1 } },
        }).catch(() => {});
      }
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

    // 1. Check if this is a wallet recharge via customer reference, orderNumber, or metaData
    const customerRef = (
      eventData.customer?.reference ||
      rawBody.customer?.reference ||
      eventData.customerReference ||
      metaData.customerReference ||
      ''
    );

    const isWalletRecharge = (
      customerRef.startsWith('wallet:') ||
      (orderNumber && orderNumber.startsWith('WLT-')) ||
      metaData.type === 'WALLET_RECHARGE'
    );

    if (isWalletRecharge) {
      let walletCompanyId = null;
      let rechargeAmount = parseFloat(eventData.amount || rawBody.amount || metaData.rechargeAmount || 0);

      // Strategy A: From customer.reference "wallet:<companyId>:<amount>"
      if (customerRef.startsWith('wallet:')) {
        const parts = customerRef.split(':');
        walletCompanyId = parts[1];
        if (!rechargeAmount && parts[2]) rechargeAmount = parseFloat(parts[2]);
      }

      // Strategy B: From metaData.companyId
      if (!walletCompanyId && metaData.companyId) {
        walletCompanyId = metaData.companyId;
      }

      // Strategy C: From orderNumber format "WLT-<companyId>-<timestamp>"
      if (!walletCompanyId && orderNumber && orderNumber.startsWith('WLT-')) {
        const orderParts = orderNumber.split('-');
        if (orderParts.length >= 3 && orderParts[1].length >= 10) {
          walletCompanyId = orderParts[1];
        }
      }

      // Strategy D: Lookup pre-recorded transaction in DB by referenceId = orderNumber
      if (!walletCompanyId && orderNumber) {
        const pendingTx = await prisma.transaction.findFirst({
          where: { referenceId: orderNumber, type: 'DEPOSIT' },
          include: { wallet: true },
        }).catch(() => null);

        if (pendingTx && pendingTx.wallet?.companyId) {
          walletCompanyId = pendingTx.wallet.companyId;
          if (!rechargeAmount) rechargeAmount = Number(pendingTx.amount);
        }
      }

      if (!walletCompanyId) {
        console.error(`[KASHIER-WEBHOOK] CRITICAL: Wallet recharge received for order ${orderNumber} but companyId could not be identified. Raw payload:`, JSON.stringify(rawBody));
        return res.status(400).json({ success: false, error: 'Cannot identify company for wallet recharge' });
      }

      if (paymentStatus === 'COMPLETED' && rechargeAmount > 0) {
        // Idempotency check: prevent duplicate credits
        const existingCompleted = await prisma.transaction.findFirst({
          where: {
            wallet: { companyId: walletCompanyId },
            type: 'DEPOSIT',
            status: 'COMPLETED',
            OR: [
              ...(transactionId ? [{ referenceId: transactionId }] : []),
              ...(orderNumber ? [{ referenceId: orderNumber }] : []),
            ],
          },
        }).catch(() => null);

        if (existingCompleted) {
          console.log(`[KASHIER-WEBHOOK] Deposit already credited for reference ${transactionId || orderNumber}, skipping duplicate.`);
          return res.json({ success: true, message: 'Deposit already processed' });
        }

        const companyWallet = await prisma.companyWallet.upsert({
          where: { companyId: walletCompanyId },
          update: {
            balance: { increment: rechargeAmount },
            totalDeposited: { increment: rechargeAmount },
          },
          create: {
            companyId: walletCompanyId,
            balance: rechargeAmount,
            currency: 'EGP',
            totalDeposited: rechargeAmount,
          },
        });

        // Update pre-existing pending transaction if one exists, otherwise create new
        const pendingTx = orderNumber ? await prisma.transaction.findFirst({
          where: { walletId: companyWallet.id, referenceId: orderNumber, status: 'PENDING' },
        }).catch(() => null) : null;

        if (pendingTx) {
          await prisma.transaction.update({
            where: { id: pendingTx.id },
            data: {
              status: 'COMPLETED',
              amount: rechargeAmount,
              description: `شحن المحفظة عبر كاشير: ${rechargeAmount} جنيه`,
              referenceId: transactionId || orderNumber,
            },
          });
        } else {
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
        }

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

        console.log(`[KASHIER-WEBHOOK] Wallet recharge completed for company ${walletCompanyId}: ${rechargeAmount} EGP (Ref: ${transactionId || orderNumber})`);
      } else if (paymentStatus === 'FAILED' && orderNumber) {
        await prisma.transaction.updateMany({
          where: { referenceId: orderNumber, status: 'PENDING' },
          data: { status: 'FAILED' },
        }).catch(() => {});
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
      // ⚠️ الطلبات المدفوعة مسبقاً/أونلاين تدخل مرحلة المراجعة (PENDING) ولا يتم تأكيدها آلياً دون مراجعة وتأكيد يدوي
      ...(order.status === 'PENDING' ? { status: 'PENDING' } : {}),
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
          ? `✅ تم الدفع إلكترونياً عبر كاشير بنجاح: ${kashierPayment.amount} ${kashierPayment.currency} عن طريق ${methodArabic}${payerInfo}${txInfo} — الطلب قيد المراجعة والمطابقة قبل التأكيد`
          : `❌ فشلت عملية الدفع عبر كاشير${txInfo}`;

        await prisma.orderNote.create({
          data: {
            orderId: order.id,
            content: noteText,
            authorName: 'Kashier Gateway',
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
