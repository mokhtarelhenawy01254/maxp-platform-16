const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');
const KashierService = require('../services/kashierService');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const { resolvePublicShippingQuote } = require('../controller/shippingZoneController');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone, safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');
const { resolveCheckoutPricing, safeParseJson } = require('../utils/orderDiscountUtils');
const { parseProductMetadata } = require('../utils/productMetadataUtils');
const {
  applyVolumeDiscount,
  getVolumeDiscountsFromMetadata,
} = require('../utils/volumeDiscountUtils');

const router = express.Router();
const getPrisma = () => getSharedPrismaClient();

router.post('/kashier/checkout', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const {
      guestName, guestEmail, guestPhone,
      shippingAddress, items, notes,
      couponCode, cartId, pixelEventId, attribution,
      // NOTE: client-sent subtotal/shippingCost/total are intentionally NOT read —
      // every monetary value is computed server-side from the database.
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

    // ─── Idempotency Check on Retry (pixelEventId / cartId) ─────────────────
    // Prevents duplicate orders, double-discount, double-stock decrement, and repeated coupon usage
    if (pixelEventId || cartId) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          companyId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          OR: [
            ...(pixelEventId ? [{ metadata: { contains: `"pixelEventId":"${pixelEventId}"` } }] : []),
            ...(cartId ? [{ metadata: { contains: `"cartId":"${cartId}"` } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingOrder) {
        const meta = safeParseJson(existingOrder.metadata, {});
        if (meta.kashierSessionUrl && meta.kashierSessionId) {
          console.log(`[KASHIER-CHECKOUT] Idempotent retry detected for pixelEventId=${pixelEventId || cartId}, returning existing session ${existingOrder.orderNumber}`);
          return res.json({
            success: true,
            data: {
              orderId: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              sessionUrl: meta.kashierSessionUrl,
              sessionId: meta.kashierSessionId,
              subtotal: existingOrder.subtotal,
              discount: existingOrder.discount,
              shipping: existingOrder.shipping,
              total: existingOrder.total,
            },
          });
        }
      }
    }

    // Generate order number
    const orderNumber = await orderService.generateOrderNumber(companyId);

    // ─── Server-side pricing: the database is the single source of truth ────
    // Items with unknown/inactive product ids are dropped — client-provided
    // prices are never trusted.
    const groupTotalUnitsMap = new Map();
    const productTotalUnitsMap = new Map();
    for (const rawItem of items || []) {
      if (!rawItem || !rawItem.productId) continue;
      const q = Math.min(Math.max(1, Math.floor(Number(rawItem.quantity) || 1)), 999);
      const pid = String(rawItem.productId);
      productTotalUnitsMap.set(pid, (productTotalUnitsMap.get(pid) || 0) + q);
      const qo =
        rawItem.quantityOffer && typeof rawItem.quantityOffer === 'object'
          ? rawItem.quantityOffer
          : rawItem.metadata?.quantityOffer && typeof rawItem.metadata.quantityOffer === 'object'
            ? rawItem.metadata.quantityOffer
            : null;
      if (qo?.groupId) {
        groupTotalUnitsMap.set(qo.groupId, (groupTotalUnitsMap.get(qo.groupId) || 0) + q);
      }
    }

    const orderItemsData = [];
    for (const item of items || []) {
      if (!item || !item.productId) continue;

      const product = await prisma.product.findFirst({
        where: { id: item.productId, companyId, isActive: true },
        select: { id: true, name: true, price: true, metadata: true },
      }).catch(() => null);
      if (!product) continue;

      let validVariantId = null;
      let variant = null;
      if (item.variantId) {
        variant = await prisma.productVariant.findFirst({
          where: { id: item.variantId, productId: product.id },
          select: { id: true, price: true, metadata: true },
        }).catch(() => null);
        if (variant) {
          validVariantId = variant.id;
        }
      }

      const baseUnitPrice =
        variant &&
        variant.price !== null &&
        variant.price !== undefined &&
        String(variant.price).trim() !== '' &&
        Number(variant.price) > 0
          ? Number(variant.price)
          : (Number(product.price) || 0);
      const quantity = Math.min(Math.max(1, Math.floor(Number(item.quantity) || 1)), 999);
      const itemQuantityOffer =
        item.quantityOffer && typeof item.quantityOffer === 'object'
          ? item.quantityOffer
          : item.metadata?.quantityOffer && typeof item.metadata.quantityOffer === 'object'
            ? item.metadata.quantityOffer
            : null;
      let applicableQuantity = quantity;
      if (itemQuantityOffer?.groupId && groupTotalUnitsMap.has(itemQuantityOffer.groupId)) {
        applicableQuantity = Math.max(applicableQuantity, groupTotalUnitsMap.get(itemQuantityOffer.groupId));
      } else if (productTotalUnitsMap.has(String(product.id))) {
        applicableQuantity = Math.max(applicableQuantity, productTotalUnitsMap.get(String(product.id)));
      }

      const variantDiscounts = getVolumeDiscountsFromMetadata(variant?.metadata, {
        activeOnly: true,
        basePrice: baseUnitPrice,
      });
      const productDiscounts = getVolumeDiscountsFromMetadata(product?.metadata, {
        activeOnly: true,
        basePrice: baseUnitPrice,
      });
      const discounts = variantDiscounts.length > 0 ? variantDiscounts : productDiscounts;
      const volumePricing = applyVolumeDiscount({
        unitPrice: baseUnitPrice,
        quantity,
        applicableQuantity,
        discounts,
      });

      const unitPrice = volumePricing.effectiveUnitPrice;
      const image = item.image || item.productImage || null;
      const itemMeta = {
        attributes: item.attributes || {},
        image,
      };
      if (itemQuantityOffer) {
        // 🔒 Trust freeShipping only from stored DB offer definitions, never client payload.
        const variantMeta = parseProductMetadata(variant?.metadata);
        const productMeta = parseProductMetadata(product?.metadata);
        const dbOffers = [
          ...(Array.isArray(variantMeta?.quantityOffers) ? variantMeta.quantityOffers : []),
          ...(Array.isArray(productMeta?.quantityOffers) ? productMeta.quantityOffers : []),
        ];
        const matchedDbOffer = dbOffers.find(
          (offer) =>
            offer &&
            typeof offer === 'object' &&
            ((itemQuantityOffer.offerId &&
              String(offer.id) === String(itemQuantityOffer.offerId)) ||
              Number(offer.quantity ?? offer.minQuantity) ===
                Number(itemQuantityOffer.offerQuantity ?? quantity)),
        );
        itemMeta.quantityOffer = {
          ...itemQuantityOffer,
          freeShipping: Boolean(matchedDbOffer?.enableFreeShipping),
        };
      }
      if (volumePricing.appliedDiscount && volumePricing.totalDiscount > 0) {
        itemMeta.basePrice = baseUnitPrice;
        itemMeta.volumeDiscount = {
          ...volumePricing.appliedDiscount,
          totalDiscount: volumePricing.totalDiscount,
          effectiveUnitPrice: volumePricing.effectiveUnitPrice,
          baseUnitPrice: volumePricing.baseUnitPrice,
        };
      }

      orderItemsData.push({
        productId: product.id,
        variantId: validVariantId,
        productName: item.name || product.name || 'Product',
        productImage: image,
        price: unitPrice,
        quantity,
        total: volumePricing.lineSubtotal,
        productSku: item.sku || null,
        productColor: item.color ? String(item.color) : (item.attributes?.color ? String(item.attributes.color) : (item.attributes?.Colour ? String(item.attributes.Colour) : null)),
        productSize: item.size != null ? String(item.size) : (item.attributes?.size != null ? String(item.attributes.size) : null),
        metadata: JSON.stringify(itemMeta),
      });
    }

    if (orderItemsData.length === 0) {
      return res.status(400).json({
        success: false, error: 'لا توجد منتجات صالحة في الطلب',
      });
    }

    const round2 = (n) => Math.round(n * 100) / 100;
    const orderSubtotal = round2(orderItemsData.reduce((sum, i) => sum + i.total, 0));

    // Shipping from the company's own zones — same governorate matching logic
    // as the reference storefront order flow, never the client's number.
    let orderShipping = 0;
    try {
      const shippingQuote = await resolvePublicShippingQuote({
        companyId,
        governorate: resolvedShippingAddress?.governorate || resolvedShippingAddress?.city || '',
      });
      orderShipping = Number(shippingQuote?.price) || 0;
    } catch (shippingErr) {
      console.warn('[KASHIER-CHECKOUT] Shipping quote failed, defaulting to 0:', shippingErr.message);
      orderShipping = 0;
    }

    // ─── Unified Server-Side Checkout Pricing ───────────────────────────────
    // Single source of truth (orderDiscountUtils.resolveCheckoutPricing):
    // Computes subtotal, coupon, store promotion, loyalty rewards, and electronic
    // payment discount (e.g. 10% for card) identically to /public/orders.
    const pricing = await resolveCheckoutPricing({
      prisma,
      companyId,
      items: orderItemsData,
      subtotal: orderSubtotal,
      couponCode,
      paymentMethod: 'card',
      customerId: customer.id,
      customerPhone: resolvedGuestPhone,
      shippingCost: orderShipping,
      shippingAddress: resolvedShippingAddress,
      company,
    });

    const orderSubtotalFinal = pricing.subtotal;
    const orderShippingFinal = pricing.shipping;
    const orderDiscount = pricing.totalDiscount;
    const orderTotal = pricing.total;
    const appliedCoupon = pricing.appliedCoupon;
    const couponDiscountAmount = pricing.couponDiscount;

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
        subtotal: orderSubtotalFinal,
        shipping: orderShippingFinal,
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
          kashierSessionUrl: session.sessionUrl,
          kashierMode: session.mode || process.env.KASHIER_MODE || 'live',
          cartId: cartId || null,
          pixelEventId: pixelEventId || null,
          attribution: attribution || null,
          ...(couponCode ? { couponCode } : {}),
          ...(pricing.orderMetadata || {}),
        }),
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    // Record coupon usage (same as the reference storefront flow) — only after
    // the order exists, so a failed payment session never consumes a use.
    if (appliedCoupon && couponDiscountAmount > 0) {
      try {
        await prisma.$transaction([
          prisma.couponUsage.create({
            data: {
              couponId: appliedCoupon.id,
              companyId,
              customerId: customer.id,
              orderId: order.id,
              discountAmount: Number(couponDiscountAmount || 0),
              orderAmount: Number(orderTotal),
            },
          }),
          prisma.coupon.update({
            where: { id: appliedCoupon.id },
            data: { usageCount: { increment: 1 } },
          }),
        ]);
      } catch (couponUsageErr) {
        console.error('⚠️ [KASHIER-CHECKOUT] Failed to record coupon usage:', couponUsageErr);
      }
    }

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
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        total: order.total,
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
      if (!walletCompanyId && orderNumber) {        const pendingTx = await prisma.transaction.findFirst({
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
    // 1.5 Bundle subscription payments (integrated landing): metaData.type = BUNDLE_SUBSCRIPTION
    //     or orderNumber prefix BND-<companyIdTail>-<slug>-<ts>. Activation requires the
    //     pending BUNDLE_CHECKOUT_CREATED intent recorded at checkout time (blocks
    //     fabricated webhooks) and is idempotent.
    const isBundleSubscription =
      metaData.type === 'BUNDLE_SUBSCRIPTION' ||
      (orderNumber && orderNumber.startsWith('BND-'));

    if (isBundleSubscription) {
      const marketplaceController = require('../controller/marketplaceController');
      if (!isSuccess) {
        console.warn('[KASHIER-WEBHOOK] Bundle payment not successful for order:', orderNumber);
        return res.json({ success: true, message: 'Bundle payment failure acknowledged' });
      }
      const activation = await marketplaceController.activateBundleFromWebhook({
        orderNumber,
        companyIdHint: metaData.companyId || null
      });
      console.log('[KASHIER-WEBHOOK] Bundle activation result:', JSON.stringify(activation));
      return res.json({ success: true, ...activation });
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

    // 🎓 أكاديمية: تسجيل تلقائي فوري بعد إتمام السداد الإلكتروني عبر كاشير
    if (isSuccess) {
      try {
        const academyService = require('../services/academyService');
        await academyService.processOrderAutoEnrollment({
          orderId: order.id,
          orderNumber: order.orderNumber,
          companyId: order.companyId,
          changedBy: 'KASHIER_WEBHOOK',
        }).catch((e) => console.warn('[KASHIER-WEBHOOK] academy auto-enroll failed:', e.message));
      } catch (academyErr) {
        console.warn('[KASHIER-WEBHOOK] academy error:', academyErr.message);
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
