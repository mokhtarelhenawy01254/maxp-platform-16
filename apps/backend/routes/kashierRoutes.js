const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');
const KashierService = require('../services/kashierService');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');

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
    let customer = await prisma.customer.findFirst({
      where: { phone: guestPhone, companyId },
    });

    if (!customer) {
      const nameParts = (guestName || 'Customer').split(/\s+/).filter(Boolean);
      customer = await prisma.customer.create({
        data: {
          firstName: nameParts[0] || 'Customer',
          lastName: nameParts.slice(1).join(' ') || '',
          email: guestEmail || '',
          phone: guestPhone,
          companyId,
          status: 'ACTIVE',
        },
      });
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
        productColor: item.color || item.attributes?.color || item.attributes?.Colour || null,
        productSize: item.size || item.attributes?.size || null,
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
    const payload = req.body;
    console.log('[KASHIER-WEBHOOK] Received:', JSON.stringify(payload));

    const sessionId = payload._id || payload.sessionId || payload.data?.sessionId;
    const status = payload.status || payload.data?.status;

    if (!sessionId || !status) {
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    }

    const prisma = getPrisma();
    const orders = await prisma.order.findMany({
      where: { metadata: { contains: sessionId } },
    });

    if (orders.length === 0) {
      console.warn('[KASHIER-WEBHOOK] No order found for session:', sessionId);
      return res.status(200).json({ success: true, message: 'Order not found, acknowledged' });
    }

    const order = orders[0];
    const paymentStatus = status === 'CAPTURED' || status === 'SUCCESS' ? 'COMPLETED' : 'FAILED';

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        ...(paymentStatus === 'COMPLETED' ? { status: 'CONFIRMED' } : {}),
        metadata: JSON.stringify({
          ...JSON.parse(order.metadata || '{}'),
          kashierWebhookStatus: status,
          kashierConfirmedAt: new Date().toISOString(),
        }),
      },
    });

    console.log(`[KASHIER-WEBHOOK] Order ${order.orderNumber} updated to ${paymentStatus}`);
    res.json({ success: true, message: 'Webhook processed' });
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
