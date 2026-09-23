const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');
const { safeJsonParse } = require('../utils/jsonUtils');

let _tablesEnsured = false;

/**
 * 🛡️ Self-healing DDL: Ensure order webhook tables exist in PostgreSQL
 * even before `prisma db push` runs on production.
 */
async function ensureTablesExist() {
  if (_tablesEnsured) return;
  try {
    const prisma = getSharedPrismaClient();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "order_webhook_configs" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "name" TEXT DEFAULT 'Webhook Endpoint',
        "url" TEXT NOT NULL,
        "secret" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "events" TEXT NOT NULL DEFAULT 'order.created',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastTriggeredAt" TIMESTAMP(3),
        "lastStatusCode" INTEGER,
        "lastError" TEXT,
        "failureCount" INTEGER NOT NULL DEFAULT 0,
        "successCount" INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS "order_webhook_configs_companyId_idx" ON "order_webhook_configs"("companyId");
      CREATE INDEX IF NOT EXISTS "order_webhook_configs_companyId_isActive_idx" ON "order_webhook_configs"("companyId", "isActive");

      CREATE TABLE IF NOT EXISTS "order_webhook_logs" (
        "id" TEXT PRIMARY KEY,
        "webhookId" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        "event" TEXT NOT NULL,
        "orderId" TEXT,
        "orderNumber" TEXT,
        "payload" JSONB,
        "requestHeaders" JSONB,
        "responseStatus" INTEGER,
        "responseBody" TEXT,
        "durationMs" INTEGER,
        "isSuccess" BOOLEAN NOT NULL DEFAULT false,
        "error" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "order_webhook_logs_webhookId_createdAt_idx" ON "order_webhook_logs"("webhookId", "createdAt");
      CREATE INDEX IF NOT EXISTS "order_webhook_logs_companyId_createdAt_idx" ON "order_webhook_logs"("companyId", "createdAt");
      CREATE INDEX IF NOT EXISTS "order_webhook_logs_orderId_idx" ON "order_webhook_logs"("orderId");
    `);
    _tablesEnsured = true;
  } catch (err) {
    console.warn('⚠️ [ORDER-WEBHOOK] Auto-migration check:', err.message);
  }
}

/**
 * Generate a cryptographically secure 32-byte secret key (64 hex characters)
 */
function generateSecret() {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Sign payload using HMAC-SHA256
 */
function signPayload(payloadString, secret) {
  if (!secret) return '';
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  return crypto.createHmac('sha256', cleanSecret).update(payloadString, 'utf8').digest('hex');
}

/**
 * Extract and clean all distinct phone numbers associated with an order/customer
 */
function extractAllPhones(order, customer, parsedMetadata, shippingAddressObj) {
  const phones = new Set();

  const addCandidate = (val) => {
    if (!val) return;
    const str = String(val).trim();
    if (str.length >= 7 && str.length <= 25) {
      phones.add(str);
    }
  };

  addCandidate(order.customerPhone);
  addCandidate(customer?.phone);
  addCandidate(customer?.phoneNormalized);
  addCandidate(shippingAddressObj?.phone);
  addCandidate(shippingAddressObj?.secondaryPhone);
  addCandidate(shippingAddressObj?.phone2);
  addCandidate(shippingAddressObj?.altPhone);

  if (parsedMetadata?.secondaryPhone) addCandidate(parsedMetadata.secondaryPhone);
  if (parsedMetadata?.altPhone) addCandidate(parsedMetadata.altPhone);
  if (parsedMetadata?.whatsappPhone) addCandidate(parsedMetadata.whatsappPhone);

  // Extract phone patterns from customer notes if available
  const notesText = `${order.notes || ''} ${order.customerNotes || ''}`;
  const phoneRegex = /(?:\+?20|0)?1[0125][0-9]{8}/g;
  const matches = notesText.match(phoneRegex);
  if (matches) {
    matches.forEach(addCandidate);
  }

  return Array.from(phones);
}

/**
 * Parse structured shipping address object from string or object
 */
function parseAddress(rawAddress) {
  if (!rawAddress) return {};
  if (typeof rawAddress === 'object') return rawAddress;
  try {
    const parsed = JSON.parse(rawAddress);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch (_) {}
  return { fullAddress: String(rawAddress) };
}

/**
 * 📦 Build the rich, comprehensive payload containing EVERY detail of the order
 */
function buildFullOrderPayload({ order, company, event = 'order.created', deliveryId = null }) {
  const parsedMetadata = typeof order.metadata === 'string'
    ? safeJsonParse(order.metadata, {})
    : (order.metadata || {});

  const customer = order.customer || {};
  const shippingAddressObj = parseAddress(order.shippingAddress || order.customerAddress);
  const billingAddressObj = parseAddress(order.billingAddress);

  const customerName = (
    order.customerName ||
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
    shippingAddressObj?.name ||
    'عميل غير محدد'
  );

  const nameParts = customerName.split(' ');
  const firstName = customer.firstName || nameParts[0] || customerName;
  const lastName = customer.lastName || nameParts.slice(1).join(' ') || '';

  const allPhones = extractAllPhones(order, customer, parsedMetadata, shippingAddressObj);
  const primaryPhone = order.customerPhone || customer.phone || allPhones[0] || null;
  const secondaryPhone = (
    shippingAddressObj?.secondaryPhone ||
    shippingAddressObj?.phone2 ||
    allPhones.find(p => p !== primaryPhone) ||
    null
  );

  // Items and Variants
  const items = Array.isArray(order.orderItems) ? order.orderItems.map((item) => {
    const itemMetadata = typeof item.metadata === 'string'
      ? safeJsonParse(item.metadata, {})
      : (item.metadata || {});

    const variant = item.productVariant || {};
    const product = item.product || {};

    const color = item.productColor || variant.color || itemMetadata.color || null;
    const size = item.productSize || variant.size || itemMetadata.size || null;
    const sku = item.productSku || variant.sku || product.sku || null;
    const image = item.productImage || variant.image || product.image || null;

    return {
      id: item.id,
      productId: item.productId || null,
      productName: item.productName || product.name || 'منتج غير محدد',
      productSku: sku,
      productImage: image,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 0,
      totalPrice: Number(item.total) || 0,
      basePrice: item.basePrice !== null && item.basePrice !== undefined ? Number(item.basePrice) : null,
      merchantPrice: item.merchantPrice !== null && item.merchantPrice !== undefined ? Number(item.merchantPrice) : null,
      variant: {
        variantId: item.variantId || variant.id || null,
        color,
        size,
        sku,
        image,
        attributes: variant.attributes || itemMetadata.attributes || {
          ...(color ? { color } : {}),
          ...(size ? { size } : {}),
        }
      },
      details: item.productDetails || itemMetadata.details || null
    };
  }) : [];

  // Session, Telemetry, and IP
  const sessionDetails = parsedMetadata.sessionDetails || {};
  const attribution = parsedMetadata.attribution || {};
  const trafficSource = sessionDetails.trafficSource || {};

  const clientIp = (
    sessionDetails.ip ||
    parsedMetadata.clientIp ||
    parsedMetadata.ip ||
    order.registration_ip ||
    null
  );

  const ipCity = sessionDetails.ipCity || null;
  const ipGovernorate = sessionDetails.ipGovernorate || null;
  const ipCountry = sessionDetails.ipCountry || 'EG';

  // Financials
  const subtotal = Number(order.subtotal ?? 0);
  const shippingCost = Number(order.shipping ?? 0);
  const discountAmount = Number(order.discount ?? 0);
  const taxAmount = Number(order.tax ?? 0);
  const total = Number(order.total ?? (subtotal + shippingCost - discountAmount));

  // Resolved Address
  const fullAddress = (
    shippingAddressObj.fullAddress ||
    shippingAddressObj.address ||
    order.customerAddress ||
    order.shippingAddress ||
    ''
  );

  const city = order.city || shippingAddressObj.city || null;
  const governorate = order.governorate || shippingAddressObj.governorate || shippingAddressObj.state || null;

  return {
    event,
    eventId: deliveryId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    company: {
      id: company?.id || order.companyId,
      name: company?.name || null,
      slug: company?.slug || null,
    },
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customStatusCode: order.customStatusCode || null,
      sourceType: order.sourceType || 'storefront',
      orderSource: order.orderSource || 'REGULAR',
      externalId: order.externalId || null,
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : new Date().toISOString(),
      confirmedAt: order.confirmedAt ? new Date(order.confirmedAt).toISOString() : null,
      scheduledDeliveryDate: order.scheduledDeliveryDate ? new Date(order.scheduledDeliveryDate).toISOString() : null,

      customer: {
        id: customer.id || order.customerId || null,
        name: customerName,
        firstName,
        lastName,
        phone: primaryPhone,
        phoneNormalized: customer.phoneNormalized || (primaryPhone ? primaryPhone.replace(/\s+/g, '') : null),
        secondaryPhone,
        allPhones,
        email: order.customerEmail || customer.email || null,
        notes: customer.notes || null,
      },

      shipping: {
        recipientName: shippingAddressObj.name || customerName,
        recipientPhone: shippingAddressObj.phone || primaryPhone,
        secondaryPhone: shippingAddressObj.secondaryPhone || secondaryPhone,
        address: fullAddress,
        street: shippingAddressObj.street || shippingAddressObj.address || null,
        building: shippingAddressObj.building || shippingAddressObj.buildingNumber || null,
        floor: shippingAddressObj.floor || null,
        apartment: shippingAddressObj.apartment || shippingAddressObj.flat || null,
        landmark: shippingAddressObj.landmark || null,
        city,
        governorate,
        country: shippingAddressObj.country || 'EG',
        postalCode: shippingAddressObj.postalCode || shippingAddressObj.zipCode || null,
        shippingCost,
      },

      billing: {
        address: billingAddressObj.address || fullAddress,
        city: billingAddressObj.city || city,
        governorate: billingAddressObj.governorate || governorate,
        country: billingAddressObj.country || 'EG',
      },

      financials: {
        subtotal,
        shippingCost,
        discountAmount,
        taxAmount,
        total,
        currency: order.currency || company?.currency || 'EGP',
        paymentMethod: order.paymentMethod || 'CASH',
        paymentStatus: order.paymentStatus || 'PENDING',
        codDepositAmount: order.codDepositAmount ? Number(order.codDepositAmount) : 0,
        codDepositPaid: Boolean(order.codDepositPaid),
        couponCode: parsedMetadata.couponCode || (parsedMetadata.coupon ? parsedMetadata.coupon.code : null) || null,
        discountReason: parsedMetadata.discountReason || null,
      },

      items,

      notes: {
        customerNotes: order.notes || null,
        orderNotes: parsedMetadata.orderNotes || null,
        confirmationNotes: order.confirmationNotes || null,
      },

      attribution: {
        utm_source: attribution.utm_source || attribution.source || trafficSource.source || null,
        utm_medium: attribution.utm_medium || attribution.medium || trafficSource.medium || null,
        utm_campaign: attribution.utm_campaign || attribution.campaign || trafficSource.campaignName || null,
        utm_term: attribution.utm_term || attribution.term || null,
        utm_content: attribution.utm_content || attribution.content || null,
        platform: attribution.platform || trafficSource.platform || null,
        referrer: attribution.referrer || trafficSource.referrer || null,
        landingPath: attribution.landingPath || trafficSource.landingPath || null,
        fbclid: attribution.fbclid || null,
        gclid: attribution.gclid || null,
        ttclid: attribution.ttclid || null,
        adId: attribution.adId || trafficSource.adId || null,
        adSetId: attribution.adSetId || trafficSource.adSetId || null,
        campaignId: attribution.campaignId || trafficSource.campaignId || null,
      },

      telemetry: {
        clientIp,
        ipCity,
        ipGovernorate,
        ipCountry,
        userAgent: sessionDetails.userAgent || parsedMetadata.userAgent || null,
        durationSeconds: sessionDetails.durationSeconds || 0,
        pagesVisitedCount: Array.isArray(sessionDetails.pagesVisited) ? sessionDetails.pagesVisited.length : 0,
        firstSeenAt: sessionDetails.firstSeenAt || null,
        sessionStartedAt: sessionDetails.sessionStartedAt || null,
      },

      metadata: parsedMetadata,
    },
  };
}

/**
 * Dispatch HTTP POST request to a single webhook endpoint
 */
async function sendWebhook(webhook, event, payload, orderId = null, orderNumber = null) {
  const deliveryId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.secret);

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'MaxP-Webhook/1.0',
    'X-Webhook-Event': event,
    'X-Webhook-Delivery': deliveryId,
    'X-Webhook-Timestamp': String(timestamp),
    'X-Webhook-Signature': `sha256=${signature}`,
    'X-MaxP-Signature': signature,
  };

  const startTime = Date.now();
  let responseStatus = null;
  let responseBody = null;
  let isSuccess = false;
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    isSuccess = res.status >= 200 && res.status < 300;

    const text = await res.text().catch(() => '');
    responseBody = text.slice(0, 1000); // truncate response body to 1000 chars

    if (!isSuccess) {
      errorMessage = `HTTP ${res.status}: ${res.statusText || responseBody || 'Request failed'}`;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      errorMessage = 'Timeout: Target endpoint took longer than 10 seconds to respond';
    } else {
      errorMessage = err.message || 'Network error';
    }
  }

  const durationMs = Date.now() - startTime;

  // Record log in database
  try {
    const prisma = getSharedPrismaClient();
    await ensureTablesExist();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "order_webhook_logs" 
      ("id", "webhookId", "companyId", "event", "orderId", "orderNumber", "payload", "requestHeaders", "responseStatus", "responseBody", "durationMs", "isSuccess", "error", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, NOW())
    `,
      crypto.randomUUID(),
      webhook.id,
      webhook.companyId,
      event,
      orderId,
      orderNumber,
      payloadString,
      JSON.stringify(headers),
      responseStatus,
      responseBody,
      durationMs,
      isSuccess,
      errorMessage
    );

    // Update config stats
    await prisma.$executeRawUnsafe(`
      UPDATE "order_webhook_configs"
      SET 
        "lastTriggeredAt" = NOW(),
        "lastStatusCode" = $1,
        "lastError" = $2,
        "successCount" = "successCount" + $3,
        "failureCount" = "failureCount" + $4,
        "updatedAt" = NOW()
      WHERE "id" = $5
    `,
      responseStatus,
      errorMessage,
      isSuccess ? 1 : 0,
      isSuccess ? 0 : 1,
      webhook.id
    );
  } catch (dbErr) {
    console.warn('⚠️ [ORDER-WEBHOOK] Error saving delivery log:', dbErr.message);
  }

  return {
    deliveryId,
    isSuccess,
    responseStatus,
    durationMs,
    errorMessage,
    responseBody,
    signature,
    headers,
  };
}

/**
 * 🚀 Main entry point to trigger order webhooks when an order is created
 * Runs asynchronously and never blocks or throws errors.
 */
function triggerOrderCreated(orderId, companyId) {
  if (!orderId || !companyId) return;

  // Run in next tick / background to guarantee zero latency on the main response
  setImmediate(async () => {
    try {
      await ensureTablesExist();
      const prisma = getSharedPrismaClient();

      // Find active webhooks for this company subscribed to order.created
      const activeWebhooks = await prisma.$queryRawUnsafe(`
        SELECT * FROM "order_webhook_configs"
        WHERE "companyId" = $1 AND "isActive" = true
      `, companyId);

      if (!activeWebhooks || activeWebhooks.length === 0) {
        return;
      }

      // Filter webhooks that listen to order.created or *
      const matchedWebhooks = activeWebhooks.filter((wh) => {
        const events = (wh.events || '').split(',').map(e => e.trim().toLowerCase());
        return events.includes('order.created') || events.includes('*') || events.includes('all');
      });

      if (matchedWebhooks.length === 0) return;

      // Fetch the full order with relations
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true,
              productVariant: true,
            },
          },
          customer: true,
          company: {
            select: { id: true, name: true, slug: true, currency: true },
          },
        },
      });

      if (!order) return;

      const payload = buildFullOrderPayload({
        order,
        company: order.company,
        event: 'order.created',
      });

      // Dispatch to each matched webhook
      for (const webhook of matchedWebhooks) {
        sendWebhook(webhook, 'order.created', payload, order.id, order.orderNumber).catch(err => {
          console.warn(`⚠️ [ORDER-WEBHOOK] Webhook delivery failed for ${webhook.url}:`, err.message);
        });
      }
    } catch (err) {
      console.error('❌ [ORDER-WEBHOOK] triggerOrderCreated error:', err.message);
    }
  });
}

/**
 * 🧪 Send a sample test webhook event
 */
async function testWebhook(webhookId, companyId) {
  await ensureTablesExist();
  const prisma = getSharedPrismaClient();

  const webhooks = await prisma.$queryRawUnsafe(`
    SELECT * FROM "order_webhook_configs"
    WHERE "id" = $1 AND "companyId" = $2
    LIMIT 1
  `, webhookId, companyId);

  if (!webhooks || webhooks.length === 0) {
    throw new Error('الويب هوك المطلوب غير موجود');
  }

  const webhook = webhooks[0];

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, currency: true },
  });

  const sampleOrder = {
    id: 'test_ord_' + crypto.randomBytes(4).toString('hex'),
    orderNumber: 'TEST-ORD-1001',
    status: 'PENDING',
    customStatusCode: null,
    sourceType: 'storefront',
    orderSource: 'REGULAR',
    externalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: null,
    scheduledDeliveryDate: null,
    customerName: 'أحمد محمود التست',
    customerPhone: '01012345678',
    customerEmail: 'test.customer@example.com',
    customerAddress: '15 شارع الثورة، مصر الجديدة، القاهرة',
    shippingAddress: JSON.stringify({
      name: 'أحمد محمود التست',
      phone: '01012345678',
      secondaryPhone: '01198765432',
      address: '15 شارع الثورة، مصر الجديدة، القاهرة',
      street: 'شارع الثورة',
      building: 'عمارة 15',
      floor: '4',
      apartment: '10',
      landmark: 'بجوار محطة المترو',
      city: 'مصر الجديدة',
      governorate: 'القاهرة',
      country: 'EG',
    }),
    billingAddress: null,
    city: 'مصر الجديدة',
    governorate: 'القاهرة',
    subtotal: 750,
    shipping: 50,
    discount: 50,
    tax: 0,
    total: 750,
    currency: company?.currency || 'EGP',
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    codDepositAmount: 0,
    codDepositPaid: false,
    notes: 'برجاء الاتصال قبل الوصول بنصف ساعة للتسليم',
    metadata: JSON.stringify({
      couponCode: 'WELCOME2026',
      discountReason: 'كوبون ترويجي 50 جنيه',
      attribution: {
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale_2026',
        utm_content: 'video_carousel_1',
        utm_term: 'fashion',
        platform: 'facebook',
        referrer: 'https://l.facebook.com/',
        landingPath: '/shop',
        fbclid: 'IwAR0123456789abcdef',
      },
      sessionDetails: {
        ip: '197.38.120.45',
        ipCity: 'Cairo',
        ipGovernorate: 'Cairo',
        ipCountry: 'EG',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        durationSeconds: 165,
        pagesVisited: [
          { path: '/', title: 'Home' },
          { path: '/shop', title: 'Shop' },
          { path: '/product/test-product', title: 'Product Detail' },
          { path: '/checkout', title: 'Checkout' }
        ],
        firstSeenAt: new Date(Date.now() - 165000).toISOString(),
        sessionStartedAt: new Date(Date.now() - 165000).toISOString(),
      },
    }),
    customer: {
      id: 'cust_sample_123',
      firstName: 'أحمد',
      lastName: 'محمود',
      phone: '01012345678',
      phoneNormalized: '+201012345678',
      email: 'test.customer@example.com',
      notes: 'عميل مميز سابق',
    },
    orderItems: [
      {
        id: 'item_sample_1',
        productId: 'prod_sample_1',
        productName: 'تيشيرت كاجوال قطني أوفر سايز',
        productSku: 'TSH-BLK-L',
        productImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300',
        quantity: 2,
        price: 375,
        total: 750,
        basePrice: 220,
        merchantPrice: 260,
        productColor: 'أسود',
        productSize: 'L',
        productVariant: {
          id: 'var_sample_1',
          color: 'أسود',
          size: 'L',
          sku: 'TSH-BLK-L',
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300',
          attributes: { color: 'أسود', size: 'L' },
        },
      },
    ],
  };

  const payload = buildFullOrderPayload({
    order: sampleOrder,
    company: company || { id: companyId, name: 'Sample Store', slug: 'sample-store' },
    event: 'test.ping',
  });

  return await sendWebhook(webhook, 'test.ping', payload, sampleOrder.id, sampleOrder.orderNumber);
}

module.exports = {
  ensureTablesExist,
  generateSecret,
  signPayload,
  buildFullOrderPayload,
  sendWebhook,
  triggerOrderCreated,
  testWebhook,
};
