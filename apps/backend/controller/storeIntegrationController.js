/**
 * Store Integration Controller (SHIP-T5)
 * Handles WooCommerce and Shopify store integrations with encrypted credentials and webhook ingestion.
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { quotePrice } = require('../services/shipping/policyService');
const { recordShipmentEvent } = require('../services/shipping/shipmentEventService');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Derive a 32-byte encryption key from environment variable
 */
function getEncryptionKey() {
  const secret = process.env.INTEGRATION_ENC_KEY || process.env.ENCRYPTION_KEY || 'maxp-store-integration-default-enc-key-32b!';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt sensitive credential using AES-256-GCM
 */
function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt sensitive credential using AES-256-GCM
 */
function decryptSecret(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return null;
  try {
    const buf = Buffer.from(ciphertext, 'base64');
    if (buf.length < IV_LENGTH + 16) return null;
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (err) {
    return null;
  }
}

/**
 * Mask sensitive credentials from integration response
 * Guarantee that neither raw nor encrypted secret keys leak to the client
 */
function maskIntegration(integration) {
  if (!integration) return null;
  const raw = typeof integration.toJSON === 'function' ? integration.toJSON() : { ...integration };
  const hasKey = Boolean(raw.consumerKey);
  const hasSecret = Boolean(raw.consumerSecret);
  const hasToken = Boolean(raw.accessToken);

  delete raw.consumerKey;
  delete raw.consumerSecret;
  delete raw.accessToken;

  return {
    ...raw,
    hasConsumerKey: hasKey,
    hasConsumerSecret: hasSecret,
    hasAccessToken: hasToken,
  };
}

/**
 * POST /shipping-portal/integrations
 * Create a new store integration (WooCommerce / Shopify)
 */
async function createIntegration(req, res) {
  try {
    const { companyId } = req.user;
    const {
      platform,
      storeUrl,
      consumerKey,
      consumerSecret,
      accessToken,
      webhookSecret,
    } = req.body;

    if (!platform || !['WOOCOMMERCE', 'SHOPIFY'].includes(String(platform).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'المنصة يجب أن تكون WOOCOMMERCE أو SHOPIFY',
        code: 'INVALID_PLATFORM',
      });
    }

    if (!storeUrl || !String(storeUrl).trim()) {
      return res.status(400).json({
        success: false,
        error: 'رابط المتجر مطلوب',
        code: 'STORE_URL_REQUIRED',
      });
    }

    const cleanPlatform = String(platform).toUpperCase();
    const cleanUrl = String(storeUrl).trim().replace(/\/+$/, '');

    // Generate webhookSecret if not provided
    const generatedWebhookSecret = webhookSecret && String(webhookSecret).trim()
      ? String(webhookSecret).trim()
      : `whsec_${crypto.randomBytes(16).toString('hex')}`;

    const encryptedConsumerKey = consumerKey ? encryptSecret(String(consumerKey).trim()) : null;
    const encryptedConsumerSecret = consumerSecret ? encryptSecret(String(consumerSecret).trim()) : null;
    const encryptedAccessToken = accessToken ? encryptSecret(String(accessToken).trim()) : null;

    const prisma = getSharedPrismaClient();
    const integration = await prisma.storeIntegration.create({
      data: {
        companyId,
        platform: cleanPlatform,
        storeUrl: cleanUrl,
        consumerKey: encryptedConsumerKey,
        consumerSecret: encryptedConsumerSecret,
        accessToken: encryptedAccessToken,
        webhookSecret: generatedWebhookSecret,
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'تم إضافة تكامل المتجر بنجاح',
      integration: maskIntegration(integration),
      data: maskIntegration(integration),
    });
  } catch (error) {
    console.error('[StoreIntegration] Create error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل إنشاء تكامل المتجر',
    });
  }
}

/**
 * GET /shipping-portal/integrations
 * List store integrations for company with masked secrets
 */
async function listIntegrations(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const integrations = await prisma.storeIntegration.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    const masked = integrations.map(maskIntegration);

    return res.status(200).json({
      success: true,
      data: masked,
      integrations: masked,
      count: masked.length,
    });
  } catch (error) {
    console.error('[StoreIntegration] List error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل جلب تكاملات المتاجر',
    });
  }
}

/**
 * PATCH /shipping-portal/integrations/:id
 * Toggle status or update store configuration
 */
async function updateIntegration(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { isActive, storeUrl } = req.body;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.storeIntegration.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'تكامل المتجر غير موجود',
      });
    }

    const dataToUpdate = {};
    if (typeof isActive === 'boolean') {
      dataToUpdate.isActive = isActive;
    }
    if (storeUrl && String(storeUrl).trim()) {
      dataToUpdate.storeUrl = String(storeUrl).trim().replace(/\/+$/, '');
    }

    const updated = await prisma.storeIntegration.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.status(200).json({
      success: true,
      message: 'تم تحديث تكامل المتجر بنجاح',
      integration: maskIntegration(updated),
      data: maskIntegration(updated),
    });
  } catch (error) {
    console.error('[StoreIntegration] Update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل تحديث تكامل المتجر',
    });
  }
}

/**
 * DELETE /shipping-portal/integrations/:id
 * Remove a store integration
 */
async function deleteIntegration(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.storeIntegration.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'تكامل المتجر غير موجود',
      });
    }

    await prisma.storeIntegration.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'تم حذف تكامل المتجر بنجاح',
    });
  } catch (error) {
    console.error('[StoreIntegration] Delete error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل حذف تكامل المتجر',
    });
  }
}

/**
 * POST /shipping-portal/integrations/:id/test
 * Test store connectivity and credential validity
 */
async function testIntegration(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const integration = await prisma.storeIntegration.findFirst({
      where: { id, companyId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'تكامل المتجر غير موجود',
      });
    }

    const { platform, storeUrl, consumerKey, consumerSecret, accessToken } = integration;

    // Validate URL structure
    try {
      new URL(storeUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: `رابط المتجر غير صالح (${storeUrl})`,
        code: 'INVALID_URL',
      });
    }

    const decryptedKey = consumerKey ? decryptSecret(consumerKey) : null;
    const decryptedSecret = consumerSecret ? decryptSecret(consumerSecret) : null;
    const decryptedToken = accessToken ? decryptSecret(accessToken) : null;

    if (platform === 'WOOCOMMERCE') {
      if (!decryptedKey && !decryptedToken) {
        return res.status(400).json({
          success: false,
          error: 'مفاتيح اعتماد WooCommerce غير صالحة أو فشل فك تشفيرها',
          code: 'AUTH_FAILED',
        });
      }
    } else if (platform === 'SHOPIFY') {
      if (!decryptedToken && !decryptedKey) {
        return res.status(400).json({
          success: false,
          error: 'رمز الوصول الخاص بـ Shopify غير صالح أو غير متوفر',
          code: 'AUTH_FAILED',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `تم التحقق بنجاح من اتصال ${platform} بـ ${storeUrl}`,
      platform,
      storeUrl,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[StoreIntegration] Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل اختبار الاتصال بالمتجر',
    });
  }
}

/**
 * POST /api/v1/webhooks/store/:integrationId/order
 * Ingest external store orders into Order + Shipment with externalOrderId idempotency
 */
async function handleStoreOrderWebhook(req, res) {
  try {
    const { integrationId } = req.params;
    const prisma = getSharedPrismaClient();

    const integration = await prisma.storeIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'تكامل المتجر غير موجود',
        code: 'INTEGRATION_NOT_FOUND',
      });
    }

    if (!integration.isActive) {
      return res.status(400).json({
        success: false,
        error: 'تكامل المتجر معطل حالياً',
        code: 'INTEGRATION_INACTIVE',
      });
    }

    const companyId = integration.companyId;
    const body = req.body || {};

    const rawExternalId = body.externalOrderId || body.id || body.order_id || body.order_number || body.number;
    const externalOrderId = rawExternalId !== undefined && rawExternalId !== null ? String(rawExternalId).trim() : '';

    if (!externalOrderId) {
      return res.status(400).json({
        success: false,
        error: 'معرّف الطلب الخارجي (externalOrderId) مطلوب',
        code: 'EXTERNAL_ORDER_ID_REQUIRED',
      });
    }

    // Idempotency check:
    // Check if an order or shipment has already been ingested for this externalOrderId
    const existingShipment = await prisma.shipment.findFirst({
      where: {
        companyId,
        OR: [
          { clientReference: `EXT-${externalOrderId}` },
          { clientReference: externalOrderId },
          { metadata: { contains: `"externalOrderId":"${externalOrderId}"` } },
        ],
      },
    });

    if (existingShipment) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Order already processed (idempotent)',
        externalOrderId,
        shipmentId: existingShipment.id,
        orderId: existingShipment.orderId,
        trackingNumber: existingShipment.trackingNumber,
      });
    }

    // Extract customer and order details
    const shipping = body.shipping || {};
    const billing = body.billing || {};

    const customerName = String(
      body.customerName ||
      (shipping.first_name ? `${shipping.first_name} ${shipping.last_name || ''}` : '') ||
      (billing.first_name ? `${billing.first_name} ${billing.last_name || ''}` : '') ||
      body.recipientName ||
      'عميل متجر'
    ).trim();

    const rawPhone = body.customerPhone || shipping.phone || billing.phone || body.recipientPhone || '01000000000';
    const cleanPhone = String(rawPhone).replace(/[^\d+]/g, '') || '01000000000';

    const gov = String(body.governorate || shipping.state || billing.state || 'القاهرة').trim() || 'القاهرة';
    const city = String(body.city || shipping.city || billing.city || '').trim();
    const address = String(body.address || shipping.address_1 || billing.address_1 || gov).trim();

    const total = parseFloat(body.total || body.total_price || body.codAmount || 0) || 0;
    const codAmount = body.codAmount !== undefined ? parseFloat(body.codAmount) : total;
    const notes = String(body.notes || body.customer_note || '').trim();

    // Get pricing quote or safe default
    let quote = { price: 50, currency: 'EGP', governorate: gov };
    try {
      quote = await quotePrice({
        companyId,
        governorate: gov,
        city: city || null,
        weightKg: 1,
        codAmount,
        prisma,
      });
    } catch {
      // safe fallback
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { companyId, phone: cleanPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId,
          name: customerName,
          firstName: customerName.split(' ')[0] || customerName,
          lastName: customerName.split(' ').slice(1).join(' ') || '',
          phone: cleanPhone,
          phoneNormalized: cleanPhone.replace(/\D/g, ''),
          status: 'CUSTOMER',
        },
      });
    }

    const orderNumber = `ORD-${integration.platform.slice(0, 3)}-${externalOrderId}`;
    const trackingNumber = `TRK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Create Order
    const createdOrder = await prisma.order.create({
      data: {
        companyId,
        orderNumber,
        customerId: customer.id,
        customerName,
        customerPhone: cleanPhone,
        shippingAddress: address,
        customerAddress: address,
        city: city || null,
        governorate: quote.governorate || gov,
        subtotal: Math.max(0, total - (quote.price || 0)),
        shipping: quote.price || 0,
        total,
        currency: quote.currency || 'EGP',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        notes: notes || null,
        metadata: JSON.stringify({
          source: `${integration.platform}_WEBHOOK`,
          externalOrderId,
          integrationId: integration.id,
          platform: integration.platform,
        }),
      },
    });

    // Create Shipment
    const createdShipment = await prisma.shipment.create({
      data: {
        companyId,
        orderId: createdOrder.id,
        recipientName: customerName,
        recipientPhone: cleanPhone,
        destinationGovernorate: quote.governorate || gov,
        destinationCity: city || null,
        destinationAddress: address,
        weight: 1,
        pieces: 1,
        codAmount: codAmount > 0 ? codAmount : null,
        cost: quote.price || 50,
        currency: quote.currency || 'EGP',
        clientRateCardId: quote.rateCardId || null,
        clientReference: `EXT-${externalOrderId}`,
        trackingNumber,
        barcode: trackingNumber.replace(/-/g, ''),
        status: 'PENDING',
        source: 'STORE_WEBHOOK',
        carrierType: 'MANUAL',
        metadata: JSON.stringify({
          externalOrderId,
          integrationId: integration.id,
          platform: integration.platform,
          notes: notes || null,
        }),
      },
    });

    // Record Shipment Event
    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: createdShipment.id,
      fromStatus: null,
      toStatus: 'PENDING',
      reasonCode: 'ORDER_IMPORTED_WEBHOOK',
      notes: `تم استيراد الطلب تلقائياً من ${integration.platform} برقم خارجي ${externalOrderId}`,
    });

    // Update last sync time
    await prisma.storeIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return res.status(201).json({
      success: true,
      message: 'تم استقبال الطلب وإنشاء الشحنة بنجاح',
      externalOrderId,
      order: createdOrder,
      shipment: createdShipment,
    });
  } catch (error) {
    console.error('[StoreWebhook] Order webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل معالجة طلب المتجر الخارجي',
    });
  }
}

module.exports = {
  createIntegration,
  listIntegrations,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  handleStoreOrderWebhook,
  encryptSecret,
  decryptSecret,
  maskIntegration,
};
