const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const jwt = require('jsonwebtoken');
const socketService = require('../services/socketService');
const orderService = require('../services/orderService');
const WalletService = require('../services/walletService');
const { getJwtSecret } = require('../utils/jwtSecret');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const { trackAffiliateReferral, linkOrderToAffiliate } = require('../middleware/affiliateTracking');
const affiliateService = require('../services/affiliateService');
const commissionService = require('../services/commissionService');
const dropshippingService = require('../services/dropshippingService');
const EmailService = require('../services/email/EmailService');
const internalSyncService = require('../services/internalSyncService');
const { trackStorefrontAppUsage } = require('../services/storefrontAppUsageService');
const { billOrderPpuApps } = require('../services/orderBasedBillingService');
const { resolvePublicShippingQuote } = require('../controller/shippingZoneController');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../middleware/subdomainMiddleware');
const {
  resolveShippingClass
} = require('../utils/shippingClassUtils');
const { safeJsonParse } = require('../utils/jsonUtils');
const { resolveVariantAttributes } = require('../utils/productNormalizationUtils');
const { sanitizeOrderAttribution } = require('../utils/orderAttribution');
const { buildSessionDetails } = require('../utils/sessionDetailsHelper');
const { isPreOrderEligible } = require('../utils/preOrderUtils');
const { isBackorderPermitted } = require('../utils/inventoryPolicyUtils');
const {
  getConversionSuiteFreeShippingPromotion,
} = require('../utils/storefrontFreeShipping');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone, safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const { splitCustomerName } = require('../utils/customerName');
const {
  applyVolumeDiscount,
  getVolumeDiscountsFromMetadata,
} = require('../utils/volumeDiscountUtils');
const { calculateDiscount: calcStorePromotionDiscount } = require('../utils/storePromotionUtils');
const { buildCompositeDiscountReason } = require('../utils/orderDiscountUtils');
const customerBlocklistService = require('../services/customerBlocklistService');

/**
 * Public Orders Routes
 * No authentication required - for guest users
 * Company isolation through subdomain middleware
 */

// Log all requests to this router
router.use((req, res, next) => {
  console.log(`🌐 [PUBLIC-ORDERS] ${req.method} ${req.path}`);
  next();
});

router.use(extractSubdomainMiddleware);
router.use(requireCompany);

// Track affiliate referrals
router.use(trackAffiliateReferral);

/**
 * حفظ خطأ الشيك آوت في سجل السلة غير المكتملة以便 كشف السبب لاحقاً
 */
async function saveCheckoutError(cartId, companyId, code, message, details = {}) {
  if (!cartId) return;
  try {
    const prisma = await getSharedPrismaClientAsync();
    const cart = await prisma.guestCart.findUnique({ where: { cartId } });
    if (!cart || cart.companyId !== companyId) return;
    let existing = {};
    try { existing = JSON.parse(cart.checkoutData || '{}'); } catch (_) {}
    const updated = {
      ...existing,
      _checkoutError: { code, message, details, failedAt: new Date().toISOString() },
    };
    await prisma.guestCart.update({
      where: { cartId },
      data: { checkoutData: JSON.stringify(updated), checkoutUpdatedAt: new Date() },
    });
  } catch (err) {
    console.warn('⚠️ [SAVE-CHECKOUT-ERROR] Failed to save:', err.message);
  }
}

// Multer setup for wallet payment proof screenshots (uploaded by customer at checkout)
const walletProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/wallet-proofs';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `wallet-proof-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  },
});

const walletProofUpload = multer({
  storage: walletProofStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// Upload a wallet payment proof screenshot before placing the order
router.post('/wallet-proof/upload', walletProofUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }
    const imageUrl = `/uploads/wallet-proofs/${req.file.filename}`;
    return res.json({ success: true, data: { imageUrl } });
  } catch (error) {
    console.error('❌ [WALLET-PROOF] Upload error:', error?.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/checkout-draft', async (req, res) => {
  try {
    const prisma = await getPrisma();
    const companyId = req.company.id;
    const requestedCartId = normalizeCheckoutDraftText(
      req.body?.cartId || req.headers['x-cart-id'] || req.cookies?.cart_id,
      160,
    );

    let resolvedCartId = requestedCartId || generateGuestCartId();
    let existingCart = await prisma.guestCart.findUnique({
      where: { cartId: resolvedCartId },
    });

    if (existingCart && existingCart.companyId !== companyId) {
      resolvedCartId = generateGuestCartId();
      existingCart = null;
    }

    const submittedItems = sanitizeCheckoutDraftItems(req.body?.items);
    const persistedItems = submittedItems.length > 0
      ? submittedItems
      : existingCart
        ? coerceCartItemsToArray(existingCart.items)
        : [];

    const attribution = sanitizeOrderAttribution(req.body?.attribution);
    const sessionDetails = await buildSessionDetails(req.body?.sessionDetails, req);

    const checkoutData = {
      customerName: normalizeCheckoutDraftText(req.body?.customerName, 120),
      email: normalizeCheckoutDraftText(req.body?.email, 160).toLowerCase(),
      phone: normalizeCheckoutDraftText(req.body?.phone, 32),
      address: normalizeCheckoutDraftText(req.body?.address, 255),
      city: normalizeCheckoutDraftText(req.body?.city, 120),
      governorate: normalizeCheckoutDraftText(req.body?.governorate, 120),
      notes: normalizeCheckoutDraftText(req.body?.notes, 500),
      paymentMethod: normalizeCheckoutDraftText(req.body?.paymentMethod, 32),
      couponCode: normalizeCheckoutDraftText(req.body?.couponCode, 64),
      selectedShippingMethod: normalizeCheckoutDraftText(req.body?.selectedShippingMethod, 64),
      subtotal: toCheckoutDraftAmount(req.body?.subtotal, 0),
      shippingCost: toCheckoutDraftAmount(req.body?.shippingCost, 0),
      total: toCheckoutDraftAmount(req.body?.total, 0),
      ...(attribution ? { attribution } : {}),
      ...(sessionDetails ? { sessionDetails } : {}),
    };

    const hasCheckoutSignal = Boolean(
      checkoutData.customerName ||
      checkoutData.email ||
      checkoutData.phone ||
      checkoutData.address ||
      checkoutData.city ||
      checkoutData.governorate ||
      checkoutData.notes
    );

    if (!persistedItems.length || !hasCheckoutSignal) {
      return res.json({
        success: true,
        data: {
          cartId: resolvedCartId,
          skipped: true,
        },
      });
    }

    // 🛡️ تجنب توليد سلة متروكة وهمية إذا كان العميل قد أتم طلباً بالفعل خلال آخر 20 دقيقة
    if (checkoutData.phone) {
      const cleanPhone = String(checkoutData.phone)
        .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
        .replace(/\D/g, '')
        .slice(-10);

      if (cleanPhone && cleanPhone.length >= 8) {
        const recentOrder = await prisma.order.findFirst({
          where: {
            companyId,
            customerPhone: { contains: cleanPhone },
            createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) }
          },
          select: { id: true, orderNumber: true }
        });

        if (recentOrder) {
          return res.json({
            success: true,
            data: {
              cartId: resolvedCartId,
              skipped: true,
              reason: 'RECENT_ORDER_COMPLETED',
              orderNumber: recentOrder.orderNumber
            }
          });
        }
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHECKOUT_DRAFT_TTL_MS);
    const total = calculateCheckoutDraftTotal(
      persistedItems,
      req.body?.total,
      req.body?.subtotal,
    );

    const savedCart = existingCart
      ? await prisma.guestCart.update({
          where: { cartId: resolvedCartId },
          data: {
            items: JSON.stringify(persistedItems),
            total,
            expiresAt,
            checkoutData: JSON.stringify(checkoutData),
            checkoutStartedAt: existingCart.checkoutStartedAt || now,
            checkoutUpdatedAt: now,
          },
        })
      : await prisma.guestCart.create({
          data: {
            cartId: resolvedCartId,
            companyId,
            items: JSON.stringify(persistedItems),
            total,
            expiresAt,
            checkoutData: JSON.stringify(checkoutData),
            checkoutStartedAt: now,
            checkoutUpdatedAt: now,
          },
        });

    if (!existingCart && savedCart) {
      try {
        const { handleCartCreated } = require('../services/orders/incompleteCartMessagingService');
        handleCartCreated(savedCart);
      } catch (triggerError) {
        console.warn('⚠️ [PUBLIC-ORDERS] Incomplete cart messaging trigger failed:', triggerError.message);
      }

      // 📡 بث إيفنت لحظي لتنبيه إدارة المتجر بطلب غير مكتمل جديد (يعمل صوت + إشعار)
      try {
        if (socketService && socketService.getIO()) {
          const cartItems = coerceCartItemsToArray(savedCart.items);
          socketService.getIO().to(`company_${companyId}`).emit('order:incomplete:new', {
            cartId: savedCart.cartId,
            companyId,
            customerName: checkoutData?.customerName || '',
            customerPhone: checkoutData?.phone || '',
            total: Number(savedCart.total || 0),
            itemCount: Array.isArray(cartItems) ? cartItems.length : 0,
            createdAt: new Date(),
          });
          console.log(`📡 [SOCKET] Emitted order:incomplete:new for cart ${savedCart.cartId}`);
        }
      } catch (socketError) {
        console.warn('⚠️ [PUBLIC-ORDERS] Failed to emit incomplete-cart socket event:', socketError.message);
      }
    }

    if (typeof res.cookie === 'function') {
      res.cookie('cart_id', resolvedCartId, {
        maxAge: CHECKOUT_DRAFT_TTL_MS,
        sameSite: 'lax',
      });
    }

    return res.json({
      success: true,
      data: {
        cartId: resolvedCartId,
        checkoutStartedAt: savedCart.checkoutStartedAt,
        checkoutUpdatedAt: savedCart.checkoutUpdatedAt,
        total: Number(savedCart.total || 0),
      },
    });
  } catch (error) {
    console.error('❌ [PUBLIC-ORDERS] Failed to save checkout draft:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل حفظ بيانات الطلب غير المكتمل',
      error: error.message,
    });
  }
});

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClientAsync();
}

function coerceCartItemsToArray(rawItems) {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;

  // If stored as JSON string in DB
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
    } catch (_) {
      return [];
    }
  }

  // If stored as an object containing items
  if (typeof rawItems === 'object' && Array.isArray(rawItems.items)) {
    return rawItems.items;
  }

  return [];
}

const CHECKOUT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeCheckoutDraftText(value, maxLength = 255) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
}

function toCheckoutDraftAmount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function sanitizeCheckoutDraftItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const price = toCheckoutDraftAmount(item.price, 0);

      return {
        productId: normalizeCheckoutDraftText(item.productId, 120),
        variantId: normalizeCheckoutDraftText(item.variantId, 120) || undefined,
        name: normalizeCheckoutDraftText(item.name, 255),
        price,
        basePrice: toCheckoutDraftAmount(item.basePrice, price),
        quantity,
        attributes:
          item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)
            ? item.attributes
            : {},
        image: normalizeCheckoutDraftText(item.image || item.productImage, 500) || undefined,
        productImage: normalizeCheckoutDraftText(item.productImage || item.image, 500) || undefined,
        metadata:
          item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
            ? item.metadata
            : undefined,
        quantityOffer:
          item.quantityOffer && typeof item.quantityOffer === 'object' && !Array.isArray(item.quantityOffer)
            ? item.quantityOffer
            : undefined,
        volumeDiscount:
          item.volumeDiscount && typeof item.volumeDiscount === 'object' && !Array.isArray(item.volumeDiscount)
            ? item.volumeDiscount
            : undefined,
      };
    })
    .filter((item) => item && (item.productId || item.name));
}

function generateGuestCartId() {
  if (typeof randomUUID === 'function') {
    return `cart_${randomUUID()}`;
  }

  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function calculateCheckoutDraftTotal(items, submittedTotal, submittedSubtotal) {
  const explicitTotal = toCheckoutDraftAmount(submittedTotal, -1);
  if (explicitTotal >= 0) {
    return explicitTotal;
  }

  const explicitSubtotal = toCheckoutDraftAmount(submittedSubtotal, -1);
  if (explicitSubtotal >= 0) {
    return explicitSubtotal;
  }

  return items.reduce((sum, item) => {
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    return sum + toCheckoutDraftAmount(item.price, 0) * quantity;
  }, 0);
}

// Helper function to map payment method string to enum
function mapPaymentMethodToEnum(method) {
  const methodMap = {
    'cash': 'CASH',
    'card': 'CREDIT_CARD',
    'bank_transfer': 'BANK_TRANSFER',
    'online': 'STRIPE', // ONLINE maps to STRIPE
    'paypal': 'PAYPAL',
    'stripe': 'STRIPE',
    'cod': 'CASH',
    'wallet': 'WALLET',
    'instapay': 'INSTAPAY',
    'vodafone_cash': 'VODAFONE_CASH'
  };
  return methodMap[method?.toLowerCase()] || 'CASH';
}

const DEFAULT_MINIMUM_ORDER_MESSAGE = 'الحد الأدنى للطلبات هو {amount} جنيه. أضف منتجات بقيمة {remaining} جنيه لإتمام الطلب.';

function formatAmount(amount) {
  const value = Number(amount || 0);
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function formatMinimumOrderMessage(settings, remaining) {
  return (settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE)
    .replace(/\{amount\}/g, formatAmount(settings.minimumOrderAmount))
    .replace(/\{remaining\}/g, formatAmount(remaining));
}

async function getMinimumOrderSettings(prisma, companyId) {
  const fallback = {
    minimumOrderEnabled: false,
    minimumOrderAmount: 0,
    minimumOrderMessage: DEFAULT_MINIMUM_ORDER_MESSAGE
  };

  if (!companyId) {
    return fallback;
  }

  try {
    const settings = await prisma.orderInvoiceSettings.findUnique({
      where: { companyId },
      select: {
        minimumOrderEnabled: true,
        minimumOrderAmount: true,
        minimumOrderMessage: true
      }
    });

    if (!settings) {
      return fallback;
    }

    return {
      minimumOrderEnabled: Boolean(settings.minimumOrderEnabled),
      minimumOrderAmount: Number(settings.minimumOrderAmount || 0),
      minimumOrderMessage: settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE
    };
  } catch (error) {
    console.warn('⚠️ [MINIMUM-ORDER] Falling back to disabled settings:', error.message);
    return fallback;
  }
}

function getMinimumOrderPayload(settings, cartTotal) {
  const minimumOrderAmount = Number(settings.minimumOrderAmount || 0);
  const numericCartTotal = Number(cartTotal || 0);
  const remaining = Math.max(0, minimumOrderAmount - numericCartTotal);

  return {
    enabled: Boolean(settings.minimumOrderEnabled) && minimumOrderAmount > 0,
    amount: minimumOrderAmount,
    cartTotal: numericCartTotal,
    remaining,
    message: formatMinimumOrderMessage(settings, remaining)
  };
}

function sendMinimumOrderViolation(res, settings, cartTotal) {
  const payload = getMinimumOrderPayload(settings, cartTotal);

  if (!payload.enabled || payload.cartTotal >= payload.amount) {
    return false;
  }

  res.status(400).json({
    success: false,
    code: 'MINIMUM_ORDER_NOT_MET',
    error: payload.message,
    message: payload.message,
    minimumOrder: payload
  });

  return true;
}

function tryDecodeCustomerToken(authHeader) {
  try {
    if (!authHeader) return null;
    const token = String(authHeader).startsWith('Bearer ')
      ? String(authHeader).split(' ')[1]
      : null;
    if (!token) return null;

    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded?.role !== 'CUSTOMER') return null;

    const customerId = decoded.customerId || decoded.userId || decoded.id;
    const companyId = decoded.companyId;
    if (!customerId || !companyId) return null;

    return { customerId, companyId };
  } catch (_) {
    return null;
  }
}

function extractCookieValue(cookieHeader, key) {
  if (!cookieHeader || !key) return null;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(cookieHeader).match(
    new RegExp(`(?:^|;\\s*)${escapedKey}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeItemAttributes(rawAttributes) {
  if (!rawAttributes || typeof rawAttributes !== 'object' || Array.isArray(rawAttributes)) {
    return {};
  }

  return Object.entries(rawAttributes).reduce((acc, [key, value]) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey || value === undefined || value === null) {
      return acc;
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      return acc;
    }

    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
}

function getAttributeValue(attributes, aliases) {
  const normalizedAttributes = normalizeItemAttributes(attributes);
  const entries = Object.entries(normalizedAttributes);

  for (const alias of aliases) {
    const match = entries.find(([key]) => key.toLowerCase() === alias.toLowerCase());
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function looksLikeSizeValue(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    value.trim(),
  );
}

function buildOrderItemMetadata(item, productImage) {
  const parsedMetadata =
    typeof item.metadata === 'string'
      ? safeJsonParse(item.metadata, null)
      : item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? item.metadata
        : null;

  const metadataPayload =
    parsedMetadata && typeof parsedMetadata === 'object' && !Array.isArray(parsedMetadata)
      ? { ...parsedMetadata }
      : {};

  const normalizedAttributes = normalizeItemAttributes(item.attributes);
  if (Object.keys(normalizedAttributes).length > 0) {
    metadataPayload.attributeValues = {
      ...(metadataPayload.attributeValues && typeof metadataPayload.attributeValues === 'object'
        ? metadataPayload.attributeValues
        : {}),
      ...normalizedAttributes,
    };
  }

  if (productImage && !metadataPayload.image) {
    metadataPayload.image = productImage;
  }

  if (item.basePrice !== undefined && item.basePrice !== null) {
    metadataPayload.basePrice = Number(item.basePrice);
  }

  if (item.volumeDiscount && typeof item.volumeDiscount === 'object') {
    metadataPayload.volumeDiscount = item.volumeDiscount;
  }

  if (item.affiliatePricing && typeof item.affiliatePricing === 'object') {
    metadataPayload.affiliatePricing = item.affiliatePricing;
  }

  const quantityOffer = getQuantityOfferMetadata(item);
  if (quantityOffer) {
    metadataPayload.quantityOffer = quantityOffer;
  }

  if (Object.keys(metadataPayload).length > 0) {
    return JSON.stringify(metadataPayload);
  }

  return typeof item.metadata === 'string' ? item.metadata : null;
}

function getNormalizedItemMetadata(item) {
  if (!item) return {};

  if (item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)) {
    return item.metadata;
  }

  if (typeof item.metadata === 'string') {
    const parsedMetadata = safeJsonParse(item.metadata, {});
    return parsedMetadata && typeof parsedMetadata === 'object' && !Array.isArray(parsedMetadata)
      ? parsedMetadata
      : {};
  }

  return {};
}

function getQuantityOfferMetadata(item) {
  if (item?.quantityOffer && typeof item.quantityOffer === 'object' && !Array.isArray(item.quantityOffer)) {
    return item.quantityOffer;
  }

  const metadata = getNormalizedItemMetadata(item);
  if (
    metadata.quantityOffer &&
    typeof metadata.quantityOffer === 'object' &&
    !Array.isArray(metadata.quantityOffer)
  ) {
    return metadata.quantityOffer;
  }

  return null;
}

function extractPrimaryProductImage(rawImages) {
  if (!rawImages) return null;

  if (Array.isArray(rawImages)) {
    return rawImages[0] || null;
  }

  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('[')) {
      const parsedImages = safeJsonParse(trimmed, []);
      return Array.isArray(parsedImages) ? parsedImages[0] || null : null;
    }

    return trimmed.split(',')[0]?.trim() || null;
  }

  return null;
}

function buildTrackedOrderItem(item) {
  const metadata = getNormalizedItemMetadata(item);
  const attributes = normalizeItemAttributes(
    item?.attributes || metadata.attributeValues || {},
  );
  const quantityOffer = getQuantityOfferMetadata(item);
  const productImage =
    item?.productImage ||
    item?.image ||
    metadata.image ||
    extractPrimaryProductImage(item?.product?.images);

  return {
    name: item?.product?.name || item?.name || item?.productName,
    productId: item?.productId,
    variantId: item?.variantId || null,
    quantity: item?.quantity,
    price: item?.price,
    productColor: (item?.productColor || item?.color || getAttributeValue(attributes, ['color', 'colour', 'اللون', 'Color', 'لون', 'ألوان', 'الوان'])) ? String(item?.productColor || item?.color || getAttributeValue(attributes, ['color', 'colour', 'اللون', 'Color', 'لون', 'ألوان', 'الوان'])) : null,
    productSize: (item?.productSize || item?.size || getAttributeValue(attributes, ['size', 'المقاس', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم'])) != null ? String(item?.productSize || item?.size || getAttributeValue(attributes, ['size', 'المقاس', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم'])) : null,
    image: productImage,
    imageUrl: productImage,
    attributes,
    quantityOffer,
    metadata,
  };
}

// Get public minimum order settings
router.get('/minimum-settings', async (req, res) => {
  try {
    const { company } = req;

    if (!company?.id) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط'
      });
    }

    const prisma = await getPrisma();
    const settings = await getMinimumOrderSettings(prisma, company.id);
    const payload = getMinimumOrderPayload(settings, 0);

    return res.json({
      success: true,
      data: {
        enabled: payload.enabled,
        amount: payload.amount,
        message: settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE
      }
    });
  } catch (error) {
    console.error('❌ [MINIMUM-ORDER] Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب إعدادات الحد الأدنى للطلبات'
    });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    console.log('📝 [CREATE-ORDER] ===== Create Order Request =====');
    console.log('📝 [CREATE-ORDER] Body:', JSON.stringify(req.body, null, 2));

    const { company } = req;
    const cartId = req.headers['x-cart-id'] || req.cookies?.cart_id || req.body?.cartId;

    console.log('🏢 [CREATE-ORDER] Company:', company?.id);
    console.log('🛒 [CREATE-ORDER] Cart ID:', cartId);

    const {
      guestEmail,
      guestPhone,
      guestName,
      shippingAddress,
      paymentMethod,
      couponCode,
      notes,
      items, // ✅ Support direct items array (for testing or direct checkout)
      pixelEventId, // Event ID from frontend Pixel for deduplication
      attribution,
      fbc,
      fbp,
      useWallet,
      walletAmount,
      redeemPoints,
      walletProof
    } = req.body;

    const headerFbc = req.headers['x-fbc'];
    const headerFbp = req.headers['x-fbp'];
    const fbcFromHeader = Array.isArray(headerFbc) ? headerFbc[0] : headerFbc;
    const fbpFromHeader = Array.isArray(headerFbp) ? headerFbp[0] : headerFbp;
    const fbcFromCookie =
      req.cookies?._fbc ||
      extractCookieValue(req.headers?.cookie, '_fbc');
    const fbpFromCookie =
      req.cookies?._fbp ||
      extractCookieValue(req.headers?.cookie, '_fbp');
    const resolvedFbc =
      fbc ||
      attribution?.fbc ||
      (attribution?.fbclid ? `fb.1.${Date.now()}.${attribution.fbclid}` : null) ||
      fbcFromHeader ||
      fbcFromCookie ||
      null;
    const resolvedFbp =
      fbp ||
      attribution?.fbp ||
      fbpFromHeader ||
      fbpFromCookie ||
      null;
    const sanitizedAttribution = sanitizeOrderAttribution(attribution, {
      fbc: resolvedFbc,
      fbp: resolvedFbp,
    });

    if (!guestPhone || !guestName || !shippingAddress) {
      saveCheckoutError(cartId, company.id, 'missing_required_fields', 'جميع الحقول المطلوبة يجب ملؤها (الاسم، الهاتف، العنوان)');
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول المطلوبة يجب ملؤها (الاسم، الهاتف، العنوان)'
      });
    }

    const prisma = await getPrisma();
    const customerAuthForBlock = tryDecodeCustomerToken(req.headers.authorization);
    const blockEvaluation = await customerBlocklistService.evaluateCustomerBlock(prisma, {
      companyId: company.id,
      customerId:
        customerAuthForBlock?.companyId === company.id
          ? customerAuthForBlock.customerId
          : null,
      phone: guestPhone,
      email: guestEmail,
      source: 'public_checkout',
      paymentMethod,
    });

    if (blockEvaluation.blocked) {
      return customerBlocklistService.sendBlockedResponse(res, blockEvaluation);
    }

    let cartItems = [];
    let cartTotal = 0;
    let shouldDeleteCart = false;

    // ✅ Support two modes: cart-based or direct items
    if (items && Array.isArray(items) && items.length > 0) {
      // Direct items mode (for testing or quick checkout)
      console.log('📦 [PUBLIC-ORDER] Using direct items mode');
      cartItems = items;
      cartTotal = 0;

      // ✅ FIX: Also clear cart if cartId exists (user might have items in cart)
      if (cartId) {
        shouldDeleteCart = true;
        console.log('🛒 [PUBLIC-ORDER] Will also clear cart after direct order');
      }
    } else if (cartId) {
      // Cart-based mode (normal flow)
      console.log('🛒 [PUBLIC-ORDER] Using cart mode');
      const cart = await prisma.guestCart.findUnique({
        where: { cartId }
      });

      const coercedItems = cart ? coerceCartItemsToArray(cart.items) : [];
      if (!cart || coercedItems.length === 0) {
        saveCheckoutError(cartId, company.id, 'empty_cart', 'السلة فارغة');
        return res.status(400).json({
          success: false,
          error: 'السلة فارغة'
        });
      }

      cartItems = coercedItems;
      cartTotal = 0;
      shouldDeleteCart = true;
    } else {
      saveCheckoutError(cartId, company?.id, 'no_cart_data', 'يجب توفير سلة أو عناصر للطلب');
      return res.status(400).json({
        success: false,
        error: 'يجب توفير سلة أو عناصر للطلب'
      });
    }

    // Normalize cart items (ensure productId exists)
    cartItems = (cartItems || []).map((item) => {
      const normalized = { ...item };
      if (!normalized.productId && normalized.id) {
        normalized.productId = normalized.id;
      }
      const parsedQuantity = Number(normalized.quantity);
      normalized.quantity =
        Number.isFinite(parsedQuantity) && parsedQuantity > 0
          ? Math.floor(parsedQuantity)
          : 0;
      return normalized;
    });

    const invalidItem = cartItems.find((item) => !item?.productId);
    if (invalidItem) {
      console.log('❌ [CREATE-ORDER] Invalid cart item (missing productId):', invalidItem);
      saveCheckoutError(cartId, company.id, 'invalid_cart_data', 'بيانات السلة غير صحيحة: يوجد منتج بدون معرف');
      return res.status(400).json({
        success: false,
        error: 'بيانات السلة غير صحيحة: يوجد منتج بدون معرف (productId)'
      });
    }

    const invalidQuantityItem = cartItems.find((item) => !item?.quantity || item.quantity < 1);
    if (invalidQuantityItem) {
      console.log('❌ [CREATE-ORDER] Invalid cart item (invalid quantity):', invalidQuantityItem);
      saveCheckoutError(cartId, company.id, 'invalid_quantity', 'الكمية يجب أن تكون 1 على الأقل');
      return res.status(400).json({
        success: false,
        error: 'بيانات السلة غير صحيحة: الكمية يجب أن تكون 1 على الأقل'
      });
    }

    const checkoutAffiliateCode = req.cookies?.affiliateCode || req.query.ref || req.query.affiliate;
    const checkoutAffiliate = checkoutAffiliateCode
      ? await prisma.affiliate.findFirst({
          where: {
            affiliateCode: checkoutAffiliateCode,
            companyId: company.id,
            status: 'ACTIVE'
          },
          select: {
            id: true,
            affiliateCode: true,
            commissionType: true
          }
        })
      : null;

    const shippingClassCounts = {};
    const preOrderItems = [];

    let companyStoreSettings = {};
    try {
      const sfSettingsRow = await prisma.storefrontSettings.findUnique({
        where: { companyId: company.id },
        select: { designTokens: true }
      });
      const designTokens = typeof sfSettingsRow?.designTokens === 'string'
        ? JSON.parse(sfSettingsRow.designTokens)
        : sfSettingsRow?.designTokens || {};
      if (designTokens?.inventorySettings) {
        companyStoreSettings = { ...designTokens.inventorySettings };
      }
    } catch (e) {
      console.warn('⚠️ [CREATE-ORDER] Failed to parse storefront inventory settings:', e.message);
    }

    // Verify stock again
    for (const item of cartItems) {
      console.log('🔍 [CREATE-ORDER] Checking product:', item.productId, 'variantId:', item.variantId, 'quantity:', item.quantity);

      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          companyId: company.id // Ensure product belongs to this company
        },
        include: { productVariants: true }
      });

      console.log('🔍 [CREATE-ORDER] Product found:', product ? 'Yes' : 'No', 'Stock:', product?.stock, 'TrackInventory:', product?.trackInventory);

      if (!product) {
        console.log('❌ [CREATE-ORDER] Product not found:', item.productId);
        saveCheckoutError(cartId, company.id, 'product_not_found', `المنتج غير موجود: ${item.name || 'Unknown'}`, { productId: item.productId });
        return res.status(400).json({
          success: false,
          error: `المنتج غير موجود: ${item.name || 'Unknown'}`
        });
      }

      const preOrderEligible = isPreOrderEligible(product);

      if (product.isDropshipped) {
        const availability = await dropshippingService.checkMerchantAvailability(
          product.id,
          item.quantity,
        );

        if (!availability.available) {
          saveCheckoutError(cartId, company.id, 'dropshipping_unavailable', availability.reason || `المنتج غير متاح للدروب شيبنج: ${item.name || product.name}`, { productId: product.id, availableStock: availability.availableStock });
          return res.status(409).json({
            success: false,
            code: 'DROPSHIPPING_UNAVAILABLE',
            error: availability.reason || `المنتج غير متاح للدروب شيبنج: ${item.name || product.name}`,
            details: {
              productId: product.id,
              productName: item.name || product.name,
              requestedQuantity: item.quantity,
              availableStock: availability.availableStock,
            },
          });
        }
      }

      const activeVariants = (product.productVariants || []).filter(v => v.isActive !== false);

      // Auto-resolve variantId from attributes or color/size if not provided
      if (!item.variantId && activeVariants.length > 0) {
        const normArabic = (s) => String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim().toLowerCase();
        const itemColor = (
          item.productColor ||
          getAttributeValue(item.attributes, ['اللون', 'color', 'Color', 'colour', 'لون']) ||
          ''
        ).trim().toLowerCase();
        const itemSize = (
          item.productSize ||
          getAttributeValue(item.attributes, ['المقاس', 'size', 'Size', 'مقاس']) ||
          ''
        ).trim().toLowerCase();

        if (itemColor || itemSize) {
          const normItemColor = normArabic(itemColor);
          const normItemSize = normArabic(itemSize);

          const matchedVariant = activeVariants.find((v) => {
            const vAttrs = resolveVariantAttributes(v);
            const vColor = normArabic(v.color || vAttrs.Color || vAttrs['اللون'] || '');
            const vSize = normArabic(v.size || vAttrs.Size || vAttrs['المقاس'] || '');
            const vName = normArabic(v.name || '');

            const colorMatches = !normItemColor || vColor === normItemColor || vName.includes(normItemColor);
            const sizeMatches = !normItemSize || vSize === normItemSize || vName.includes(normItemSize);
            return colorMatches && sizeMatches;
          });
          if (matchedVariant) {
            item.variantId = matchedVariant.id;
            console.log(`✨ [CREATE-ORDER] Auto-resolved variantId ${matchedVariant.id} from attributes (Color: ${itemColor}, Size: ${itemSize})`);
          }
        } else if (item.variantName) {
          const normVarName = normArabic(item.variantName);
          const matchedByName = activeVariants.find(v => normArabic(v.name) === normVarName || normArabic(v.name).includes(normVarName));
          if (matchedByName) {
            item.variantId = matchedByName.id;
            console.log(`✨ [CREATE-ORDER] Auto-resolved variantId ${matchedByName.id} from variantName (${item.variantName})`);
          }
        } else if (activeVariants.length === 1 && (!activeVariants[0].name || activeVariants[0].name.toLowerCase() === 'default' || activeVariants[0].name === 'افتراضي')) {
          item.variantId = activeVariants[0].id;
        } else if (!req.headers['x-admin-convert']) {
          console.log('❌ [CREATE-ORDER] Missing required variant selection for product:', product.name);
          saveCheckoutError(cartId, company.id, 'variant_required', `يرجى اختيار المقاس أو اللون للمنتج: ${item.name || product.name}`, { productId: product.id });
          return res.status(400).json({
            success: false,
            error: `يرجى اختيار المقاس أو اللون للمنتج: ${item.name || product.name}`
          });
        }
      }

      // Check variant stock if variantId is provided
      let selectedVariant = null;

      if (item.variantId) {
        const variant = product.productVariants?.find(v => v.id === item.variantId);
        console.log('🔍 [CREATE-ORDER] Variant found:', variant ? 'Yes' : 'No', 'Stock:', variant?.stock, 'TrackInventory:', variant?.trackInventory);

        if (!variant) {
          console.log('❌ [CREATE-ORDER] Variant not found:', item.variantId);
          saveCheckoutError(cartId, company.id, 'variant_not_found', `الاختيار غير موجود للمنتج: ${item.name || product.name}`, { productId: product.id, variantId: item.variantId });
          return res.status(400).json({
            success: false,
            error: `الاختيار غير موجود للمنتج: ${item.name || product.name}`
          });
        }

        // السماح بالطلب إذا كان المنتج أو المتغير يسمح بالـ Backorder أو كان طلباً مسبقاً أو غير متتبع للمخزون
        const variantTracksStock = variant.trackInventory !== false;
        const isVariantBackorderPermitted = isBackorderPermitted(product, variant, companyStoreSettings);

        if (variantTracksStock && variant.stock < item.quantity && !req.headers['x-admin-convert']) {
          if (isVariantBackorderPermitted) {
            console.log(`ℹ️ [CREATE-ORDER] Backorder permitted for variant: ${variant.name} (stock: ${variant.stock}, requested: ${item.quantity})`);
            item.isBackorder = true;
            item.shortageQuantity = item.quantity - Math.max(0, variant.stock);
          } else {
            console.log('❌ [CREATE-ORDER] Insufficient variant stock:', variant.stock, 'requested:', item.quantity);
            saveCheckoutError(cartId, company.id, 'stock_insufficient', `المخزون غير كافي: ${variant.name}. المتوفر: ${variant.stock}`, { productId: product.id, variantId: item.variantId, requested: item.quantity, available: variant.stock });
            return res.status(400).json({
              success: false,
              error: `المخزون غير كافي للاختيار: ${variant.name}. المتوفر: ${variant.stock}`
            });
          }
        }

        selectedVariant = variant;

        // ✅ ENRICH ITEM with Variant Details (Color, Size, Metadata)
        // This ensures the saved JSON contains all display info
        item.variantName = variant.name;
        // Merge metadata instead of overwriting existing quantityOffer / item metadata
        const existingItemMeta = typeof item.metadata === 'string'
          ? safeJsonParse(item.metadata, {})
          : (item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {});
        const variantMetaParsed = typeof variant.metadata === 'string'
          ? safeJsonParse(variant.metadata, {})
          : (variant.metadata && typeof variant.metadata === 'object' && !Array.isArray(variant.metadata) ? variant.metadata : {});
        item.metadata = { ...variantMetaParsed, ...existingItemMeta };

        let color =
          item.productColor ||
          item.color ||
          getAttributeValue(item.attributes, ['اللون', 'color', 'Color', 'colour', 'لون', 'ألوان', 'الوان']) ||
          variant.color;
        let size =
          item.productSize ||
          item.size ||
          getAttributeValue(item.attributes, ['المقاس', 'size', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم']) ||
          variant.size;

        // 1. Try metadata (checking both direct keys and attributeValues, case-insensitive)
        if (variant.metadata && (!color || !size)) {
          try {
            const meta = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
            if (meta && typeof meta === 'object') {
              const metaAttrs = meta.attributeValues || meta;
              if (!color) {
                color =
                  getAttributeValue(metaAttrs, ['اللون', 'color', 'Color', 'colour', 'لون', 'ألوان', 'الوان']) ||
                  meta.color ||
                  meta.Color;
              }
              if (!size) {
                size =
                  getAttributeValue(metaAttrs, ['المقاس', 'size', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم']) ||
                  meta.size ||
                  meta.Size;
              }
            }
          } catch (e) { }
        }

        // 2. Try name parsing (Robust — supports '/', '-', '–', '|', 'x')
        if (variant.name && (!color || !size)) {
          const name = variant.name;
          // If explicit type is color and no separator
          if (variant.type === 'color' && !name.includes('-') && !name.includes('|') && !name.includes('/')) {
            if (!color) color = name.trim();
          } else {
            // Handle separators including slash '/'
            const parts = name.split(/\s*[\/|–-]\s*/).filter(p => p.trim());
            if (parts.length >= 2) {
              const firstPart = parts[0].trim();
              const lastPart = parts[parts.length - 1].trim();

              if (!size && looksLikeSizeValue(firstPart)) size = firstPart;
              if (!size && looksLikeSizeValue(lastPart)) size = lastPart;

              if (!color && !looksLikeSizeValue(firstPart) && isNaN(parseFloat(firstPart))) {
                color = firstPart;
              }
              if (!color && !looksLikeSizeValue(lastPart) && isNaN(parseFloat(lastPart))) {
                color = lastPart;
              }
            } else if (parts.length === 1) {
              const val = parts[0].trim();
              if (!size && looksLikeSizeValue(val)) size = val;
              else if (isNaN(parseFloat(val)) && !color) color = val;
            }
          }
        }

        // 3. Extract Image (Product or Variant)
        let image = '';
        try {
          // 3.1 Try variant metadata image
          if (variant.metadata) {
            const meta = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
            if (meta.image) image = meta.image;
          }

          // 3.2 If no variant image, try product image
          if (!image && product.images) {
            // product.images is usually a JSON array or comma separated string
            // e.g. "[\"url1\", \"url2\"]" or "url1,url2"
            let images = [];
            if (product.images.startsWith('[')) {
              images = JSON.parse(product.images);
            } else {
              images = product.images.split(',');
            }
            if (images.length > 0) image = images[0];
          }
        } catch (e) { console.log('⚠️ Error extracting image:', e.message); }

        item.productColor = color || '';
        item.productSize = size || '';
        item.sku = variant?.sku || product?.sku || product?.barcode || '';
        item.productSku = item.sku;
        item.image = image; // ✅ Save image for frontend
        item.productImage = image; // ✅ Duplicate for safety
        item.variant = {
          id: variant.id,
          name: variant.name,
          sku: variant.sku || null,
          metadata: variant.metadata
        };
        // Add to metadata as well for redundancy
        if (typeof item.metadata === 'object' && item.metadata !== null) {
          item.metadata.image = image;
        } else if (image) {
          item.metadata = { image };
        }

        console.log(`✅ [CREATE-ORDER] Enriched item ${item.productId}: Color=${item.productColor}, Size=${item.productSize}, Image=${image ? 'Yes' : 'No'}`);
      } else {
        // Check main product stock if no variant and tracking is enabled
        const isProductBackorderPermitted = isBackorderPermitted(product, null, companyStoreSettings);
        if (product.trackInventory !== false && product.stock < item.quantity && !req.headers['x-admin-convert']) {
          if (isProductBackorderPermitted) {
            console.log(`ℹ️ [CREATE-ORDER] Backorder permitted for product: ${item.name || product.name} (stock: ${product.stock}, requested: ${item.quantity})`);
            item.isBackorder = true;
            item.shortageQuantity = item.quantity - Math.max(0, product.stock);
          } else {
            console.log('❌ [CREATE-ORDER] Insufficient stock:', product.stock, 'requested:', item.quantity);
            saveCheckoutError(cartId, company.id, 'stock_insufficient', `المخزون غير كافي: ${item.name || product.name}. المتوفر: ${product.stock}`, { productId: product.id, requested: item.quantity, available: product.stock });
            return res.status(400).json({
              success: false,
              error: `المخزون غير كافي للمنتج: ${item.name || product.name}. المتوفر: ${product.stock}`
            });
          }
        }
        if (!item.sku) {
          const itemSku = product?.sku || product?.barcode || '';
          item.sku = itemSku;
          item.productSku = itemSku;
        }
        if (!item.productColor) {
          item.productColor =
            getAttributeValue(item.attributes, ['اللون', 'color', 'Color', 'colour', 'لون', 'ألوان', 'الوان']) ||
            item.color ||
            '';
        }
        if (!item.productSize) {
          item.productSize =
            getAttributeValue(item.attributes, ['المقاس', 'size', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم']) ||
            item.size ||
            '';
        }
      }

      if (preOrderEligible) {
        preOrderItems.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          preOrderDate: product.preOrderDate || null,
        });
      }

      const itemShippingClass = resolveShippingClass(selectedVariant?.metadata, product?.metadata);
      const classQuantity = Number(item.quantity) || 1;
      shippingClassCounts[itemShippingClass] = (shippingClassCounts[itemShippingClass] || 0) + classQuantity;

      // Always trust backend prices (product/variant), never client-provided price.
      const productUnitPrice = Number(product.price);
      const variantUnitPrice = selectedVariant ? Number(selectedVariant.price) : NaN;
      let affiliateUnitPrice = NaN;
      let affiliatePricingSnapshot = null;

      if (checkoutAffiliate?.commissionType === 'MARKUP') {
        const affiliateProduct = await prisma.affiliateProduct.findUnique({
          where: {
            affiliateId_productId: {
              affiliateId: checkoutAffiliate.id,
              productId: product.id,
            },
          },
          select: {
            basePrice: true,
            markup: true,
            finalPrice: true,
            isActive: true,
          },
        });

        if (affiliateProduct?.isActive) {
          affiliateUnitPrice = Number(affiliateProduct.finalPrice);
          affiliatePricingSnapshot = {
            affiliateId: checkoutAffiliate.id,
            affiliateCode: checkoutAffiliate.affiliateCode,
            type: 'MARKUP',
            basePrice: Number(affiliateProduct.basePrice),
            markup: Number(affiliateProduct.markup),
            finalPrice: Number(affiliateProduct.finalPrice),
          };
        }
      }

      const trustedUnitPrice = Number.isFinite(affiliateUnitPrice)
        ? affiliateUnitPrice
        : Number.isFinite(variantUnitPrice)
          ? variantUnitPrice
          : Number.isFinite(productUnitPrice)
            ? productUnitPrice
            : 0;
      const variantVolumeDiscounts = getVolumeDiscountsFromMetadata(
        selectedVariant?.metadata,
        { activeOnly: true, basePrice: parseFloat(selectedVariant?.price) || 0 },
      );
      const productVolumeDiscounts = getVolumeDiscountsFromMetadata(product?.metadata, {
        activeOnly: true,
        basePrice: parseFloat(product?.price) || 0,
      });
      const volumeDiscounts =
        variantVolumeDiscounts.length > 0 ? variantVolumeDiscounts : productVolumeDiscounts;
      const volumePricing = applyVolumeDiscount({
        unitPrice: trustedUnitPrice,
        quantity: item.quantity,
        discounts: volumeDiscounts,
      });

      item.basePrice = trustedUnitPrice;
      item.price = volumePricing.effectiveUnitPrice;
      item.comparePrice = selectedVariant
        ? Number(selectedVariant.comparePrice || product.comparePrice || 0)
        : Number(product.comparePrice || 0);
      item.name = item.name || product.name;
      if (affiliatePricingSnapshot) {
        item.affiliatePricing = affiliatePricingSnapshot;
      }
      item.volumeDiscount =
        volumePricing.appliedDiscount && volumePricing.totalDiscount > 0
          ? {
              ...volumePricing.appliedDiscount,
              totalDiscount: volumePricing.totalDiscount,
              effectiveUnitPrice: volumePricing.effectiveUnitPrice,
              baseUnitPrice: volumePricing.baseUnitPrice,
            }
          : null;
      cartTotal += volumePricing.lineSubtotal;
    }

    cartTotal = Number(cartTotal.toFixed(2));

    const minimumOrderSettings = await getMinimumOrderSettings(prisma, company.id);
    if (sendMinimumOrderViolation(res, minimumOrderSettings, cartTotal)) {
      saveCheckoutError(cartId, company.id, 'minimum_order_not_met', 'الحد الأدنى للطلب غير محقق');
      return;
    }

    // Calculate shipping using the same governorate matching logic as the public quote endpoint.
    let shippingCost = 0;
    let matchingZone = null;
    if (shippingAddress?.governorate) {
      const shippingQuote = await resolvePublicShippingQuote({
        companyId: company.id,
        governorate: shippingAddress.governorate,
        shippingClassCounts,
      });

      matchingZone = shippingQuote.zone;
      shippingCost = Number(shippingQuote.price) || 0;

      if (matchingZone) {
        console.log(
          '✅ [CREATE-ORDER] Shipping cost calculated:',
          shippingCost,
          'for governorate:',
          shippingQuote.governorate || shippingAddress.governorate,
        );
      } else {
        console.log('⚠️ [CREATE-ORDER] No matching shipping zone found for:', shippingAddress.governorate);
      }
    }

    const quantityOfferSummaries = Array.from(
      cartItems.reduce((groups, item) => {
        const quantityOffer = getQuantityOfferMetadata(item);
        if (!quantityOffer?.groupId) {
          return groups;
        }

        if (!groups.has(quantityOffer.groupId)) {
          groups.set(quantityOffer.groupId, {
            groupId: quantityOffer.groupId,
            offerId: quantityOffer.offerId || null,
            offerLabel: quantityOffer.offerLabel || item.attributes?.['عرض الكمية'] || null,
            offerQuantity: Number(quantityOffer.offerQuantity || item.quantity || 0),
            freeShipping: Boolean(quantityOffer.freeShipping),
            productId: item?.productId || null,
            productName: item?.name || item?.productName || item?.product?.name || null,
            itemsCount: 0,
            totalUnits: 0,
            totalValue: 0,
          });
        }

        const group = groups.get(quantityOffer.groupId);
        const itemQuantity = Math.max(1, Number(item?.quantity || 1));
        const itemPrice = Number(item?.price || 0);
        group.itemsCount += 1;
        group.totalUnits += itemQuantity;
        group.totalValue = Number((group.totalValue + (itemPrice * itemQuantity)).toFixed(2));

        return groups;
      }, new Map()).values(),
    );

    const quantityOfferFreeShipping = quantityOfferSummaries.some(
      (summary) => Boolean(summary.freeShipping),
    );

    let freeShippingAdjustment = null;
    const originalShippingCost = Number(shippingCost) || 0;

    if (quantityOfferFreeShipping) {
      console.log('✅ [CREATE-ORDER] Free shipping applied by quantity offer');
      freeShippingAdjustment = {
        source: 'quantity-offer',
        originalShippingCost,
        discountAmount: originalShippingCost,
        appliedShippingCost: 0,
      };
      shippingCost = 0;
    } else {
      const conversionFreeShipping = await getConversionSuiteFreeShippingPromotion(
        prisma,
        company.id,
        cartTotal,
      );

      if (conversionFreeShipping.eligible) {
        console.log(
          '✅ [CREATE-ORDER] Free shipping applied by conversion-suite threshold:',
          conversionFreeShipping.threshold,
        );
        freeShippingAdjustment = {
          source: conversionFreeShipping.source,
          threshold: conversionFreeShipping.threshold,
          originalShippingCost,
          discountAmount: originalShippingCost,
          appliedShippingCost: 0,
        };
        shippingCost = 0;
      }
    }

    // Apply coupon
    let discountAmount = 0;
    if (req.headers['x-admin-convert'] && req.body?.discountAmount !== undefined) {
      discountAmount = Number(req.body.discountAmount) || 0;
    }
    let appliedCoupon = null;
    if (couponCode) {
      const now = new Date();
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: String(couponCode).trim().toUpperCase(),
          companyId: company.id,
          isActive: true,
          validFrom: { lte: now },
          validTo: { gte: now }
        }
      });

      if (coupon) {
        const usageLimitReached = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;
        const minOrderMet = !coupon.minOrderAmount || Number(cartTotal) >= Number(coupon.minOrderAmount);

        if (!usageLimitReached && minOrderMet) {
          if (coupon.type === 'PERCENTAGE') {
            discountAmount = (cartTotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
              discountAmount = Number(coupon.maxDiscountAmount);
            }
          } else if (coupon.type === 'FREE_SHIPPING') {
            discountAmount = 0;
            if (shippingCost > 0) {
              freeShippingAdjustment = {
                source: 'coupon-free-shipping',
                threshold: 0,
                originalShippingCost,
                discountAmount: originalShippingCost,
                appliedShippingCost: 0,
              };
              shippingCost = 0;
            }
          } else {
            discountAmount = Number(coupon.value);
          }
          discountAmount = Math.max(0, Math.min(cartTotal, Number(discountAmount)));
          appliedCoupon = coupon;
        }
      }
    }

    // Company settings for discount approval & auto-discounts
    const companySettingsRaw = company?.settings || (await prisma.company.findUnique({
      where: { id: company.id },
      select: { settings: true }
    }))?.settings;
    const parsedCompanySettings = typeof companySettingsRaw === 'string'
      ? JSON.parse(companySettingsRaw || '{}')
      : (companySettingsRaw || {});

    const disableAutoDiscountsWithoutApproval = parsedCompanySettings.disableAutoDiscountsWithoutApproval !== undefined
      ? Boolean(parsedCompanySettings.disableAutoDiscountsWithoutApproval)
      : true;
    const requireDiscountApproval = parsedCompanySettings.requireDiscountApproval !== undefined
      ? Boolean(parsedCompanySettings.requireDiscountApproval)
      : true;

    // Store-wide promotion discount
    let promoDiscount = 0;
    let promoLabel = '';
    if (!disableAutoDiscountsWithoutApproval) {
      const storePromotion = await prisma.storePromotion.findFirst({
        where: {
          companyId: company.id,
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
            { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
          ],
        },
      });
      if (storePromotion) {
        if (storePromotion.disableOtherDiscounts) {
          discountAmount = 0;
        }
        const promoCartItems = cartItems.map(i => ({
          productId: i.productId || i.id,
          price: i.basePrice || i.price,
          comparePrice: i.comparePrice || 0,
          quantity: i.quantity,
        }));
        const result = calcStorePromotionDiscount({
          cartItems: promoCartItems,
          tiers: storePromotion.tiers,
          disableOtherDiscounts: storePromotion.disableOtherDiscounts,
        });
        promoDiscount = result.discount;
        promoLabel = result.tier?.label || storePromotion.title || 'عرض الكمية';
        discountAmount += promoDiscount;
      }
    }

    // مزايا مستوى الولاء (شحن مجاني + خصم تلقائي) / أو كوبون الخصم التلقائي
    let loyaltyDiscount = 0;
    let loyaltyRewards = null;
    let loyaltyTierInfo = null;
    let autoDiscountVoucherId = null;
    let loyaltyCustomer = null;
    try {
      loyaltyCustomer = await findCustomerByPhone(prisma, guestPhone, company.id);
      if (loyaltyCustomer) {
        const autoDiscountService = require('../services/autoDiscountService');
        const loyaltySettings = await autoDiscountService.getSettings(company.id);
        const autoActive = !disableAutoDiscountsWithoutApproval && loyaltySettings.autoDiscountEnabled === true && loyaltySettings.enabled !== false;
        const hasTiers = await prisma.customerLoyaltyTier.count({ where: { companyId: company.id } });
        const tiersActive = loyaltySettings.tiersEnabled === true || hasTiers > 0;
        const discountCombination = loyaltySettings.discountCombination || 'ADDITIVE';
        const maxTotalDiscountPercent = Number(loyaltySettings.maxTotalDiscountPercent || 0);

        let tierDiscount = 0;
        let voucherDiscount = 0;

        // نظام "المستويات": مزايا المستوى (شحن مجاني + خصم %) — مستقل عن الخصم التلقائي
        if (tiersActive) {
          loyaltyRewards = await customerLoyaltyService.getCustomerActiveRewards(company.id, loyaltyCustomer.id);
          const progress = await customerLoyaltyService.getCustomerTierProgress(company.id, loyaltyCustomer.id);
          loyaltyTierInfo = progress?.tier || null;

          if (loyaltyRewards?.freeShipping && Number(shippingCost) > 0) {
            freeShippingAdjustment = {
              source: 'loyalty_tier',
              originalShippingCost: Number(shippingCost),
              discountAmount: Number(shippingCost),
              appliedShippingCost: 0,
            };
            shippingCost = 0;
          }

          const lp = Number(loyaltyRewards?.discountPercent || 0);
          if (lp > 0) {
            tierDiscount = (Number(cartTotal) || 0) * (lp / 100);
          }
        }

        // نظام "الخصم التلقائي": كوبون الخصم — مستقل عن المستويات
        if (autoActive) {
          const voucherRes = await autoDiscountService.applyVoucherDiscount({
            companyId: company.id,
            customerId: loyaltyCustomer.id,
            cartTotal
          });
          if (voucherRes.discount > 0 && voucherRes.voucher) {
            voucherDiscount = voucherRes.discount;
            autoDiscountVoucherId = voucherRes.voucher.id;
            await autoDiscountService.markVoucherUsed(voucherRes.voucher.id);
          }
        }

        // دمج خصم المستوى + كوبون الخصم حسب وضع الدمج (discountCombination) + حد أقصى
        const base = Number(cartTotal) || 0;
        let combined = 0;
        if (discountCombination === 'BEST') {
          combined = Math.max(tierDiscount, voucherDiscount);
        } else if (discountCombination === 'COMPOUND') {
          const tierPct = base > 0 ? (tierDiscount / base) * 100 : 0;
          const voucherPct = base > 0 ? (voucherDiscount / base) * 100 : 0;
          combined = base * (1 - (1 - tierPct / 100) * (1 - voucherPct / 100));
        } else {
          // ADDITIVE: جمع النسب
          combined = tierDiscount + voucherDiscount;
        }
        // 🛡️ حد أقصى لإجمالي الخصم
        if (maxTotalDiscountPercent > 0) {
          const capAmount = base * (maxTotalDiscountPercent / 100);
          if (combined > capAmount) combined = capAmount;
        }

        // 🛡️ B) سقف الخصم الشامل (Company.maxDiscountCap) + منع دمج الكوبون مع الولاء
        try {
          const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
          const couponCode = req.body && req.body.couponCode;
          let couponAllowWithLoyalty = true;
          if (couponCode && prisma.coupon) {
            const cp = await prisma.coupon.findFirst({ where: { companyId: company.id, code: couponCode } }).catch(() => null);
            if (cp) couponAllowWithLoyalty = cp.allowWithLoyalty !== false;
          }
          const capResult = await customerLoyaltyService.enforceDiscountCap({
            companyId: company.id,
            orderTotal: cartTotal,
            couponDiscount: combined,
            walletAmount: Number(walletAmount) || 0,
            pointsAmount: 0,
            couponAllowWithLoyalty
          });
          if (!capResult.loyaltyAllowed) {
            // الكوبون لا يُسمح بدمجه مع الولاء → أزل خصم الولاء من المجموع
            combined = capResult.couponDiscount;
          } else if (capResult.capped) {
            combined = capResult.cappedTotal;
          }
        } catch (capErr) {
          console.warn('⚠️ [LOYALTY] discount cap check failed:', capErr && capErr.message);
        }

        loyaltyDiscount = combined;
        if (loyaltyDiscount > 0) {
          discountAmount += loyaltyDiscount;
        }
      }
    } catch (loyaltyError) {
      console.error('⚠️ [LOYALTY] Failed to apply rewards at checkout:', loyaltyError?.message);
    }

    // خصم الدفع الإلكتروني (من إعدادات المتجر: discountEnabled + discountPercent) — يُطبّق على الدفع بالبطاقة أو المحفظة
    let walletDiscount = 0;
    let walletDiscountPercent = 0;
    if (paymentMethod === 'card' || paymentMethod === 'wallet') {
      try {
        const walletSettingsRow = await prisma.storefrontSettings.findUnique({
          where: { companyId: company.id },
          select: { walletPaymentSettings: true, enabledPaymentMethods: true },
        });
        const walletSettings = safeJsonParse(
          walletSettingsRow?.walletPaymentSettings,
          {}
        );
        const rawMethods = walletSettingsRow?.enabledPaymentMethods;
        const enabledMethods = typeof rawMethods === 'string'
          ? safeJsonParse(rawMethods, ['cod'])
          : (Array.isArray(rawMethods) ? rawMethods : ['cod']);

        const isWalletActive =
          walletSettings?.enabled !== false &&
          (Array.isArray(enabledMethods) ? enabledMethods.includes('wallet') : true) &&
          Boolean(walletSettings?.walletNumber?.trim());

        if (paymentMethod === 'wallet' && !isWalletActive) {
          return res.status(400).json({
            success: false,
            message: 'طريقة الدفع بالمحفظة الإلكترونية غير مفعلة في هذا المتجر حالياً',
          });
        }

        const discountEnabled =
          walletSettings?.discountEnabled === true ||
          walletSettings?.discountEnabled === 'true';
        const percent = Math.max(0, Number(walletSettings?.discountPercent || 0));
        if (discountEnabled && percent > 0 && (paymentMethod === 'card' || isWalletActive)) {
          walletDiscountPercent = percent;
          walletDiscount = Number(
            (((Number(cartTotal) || 0) * percent) / 100).toFixed(2)
          );
          discountAmount += walletDiscount;
          console.log(
            '🎁 [WALLET-DISCOUNT] Applied:',
            walletDiscount,
            'EGP (',
            percent,
            '% of cartTotal ',
            cartTotal,
            ')'
          );
        }
      } catch (walletDiscountError) {
        console.error(
          '⚠️ [WALLET-DISCOUNT] Failed to apply wallet discount:',
          walletDiscountError?.message
        );
      }
    }

    const finalTotal = (Number(cartTotal) || 0) + (Number(shippingCost) || 0) - (Number(discountAmount) || 0);

    // Wallet usage (optional - requires CUSTOMER token)
    const customerAuth = tryDecodeCustomerToken(req.headers.authorization);
    const wantsWallet = useWallet === true || useWallet === 'true' || Number(walletAmount) > 0;
    const requestedWalletAmount = walletAmount !== undefined && walletAmount !== null && walletAmount !== ''
      ? Number(walletAmount)
      : 0;

    if (wantsWallet) {
      if (!customerAuth && !loyaltyCustomer) {
        return res.status(401).json({
          success: false,
          error: 'يجب تسجيل الدخول كعميل لاستخدام المحفظة'
        });
      }

      if (customerAuth && customerAuth.companyId !== company.id) {
        return res.status(403).json({
          success: false,
          error: 'رمز العميل لا يطابق شركة المتجر'
        });
      }

      if (!Number.isFinite(requestedWalletAmount) || requestedWalletAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'قيمة المحفظة غير صحيحة'
        });
      }
    }

    // Duplicate order handling
    const duplicateSettings = await orderService.getDuplicateSettings(company.id);
    let duplicateMatch = null;
    let duplicateInfo = null;
    if (
      duplicateSettings?.enabled !== false &&
      (guestPhone || guestEmail)
    ) {
      duplicateMatch = await orderService.findDuplicateOrder({
        companyId: company.id,
        customerPhone: guestPhone,
        customerEmail: guestEmail,
        total: finalTotal,
        items: cartItems || [],
        settings: duplicateSettings,
        includeGuest: duplicateSettings.includeStoreOrders
      });
    }

    const isDuplicateOrder = !!duplicateMatch;
    if (isDuplicateOrder && (duplicateSettings?.action === 'block' || duplicateSettings?.action === 'ignore')) {
      // Optionally clear cart for duplicate attempts to avoid repeated submissions
      if (shouldDeleteCart && cartId) {
        try {
          const existingCart = await prisma.guestCart.findUnique({
            where: { cartId }
          });
          if (existingCart) {
            await prisma.guestCart.delete({ where: { cartId } });
            console.log('✅ [CREATE-ORDER] Cart deleted for duplicate order:', cartId);
          }
        } catch (error) {
          console.error('❌ [CREATE-ORDER] Error deleting cart for duplicate (non-critical):', error.message);
        }
        res.clearCookie('cart_id');
      }

      try {
        await trackStorefrontAppUsage({
          companyId: company.id,
          slug: 'conversion-suite',
          feature: 'duplicate_order_ignored',
          metadata: {
            duplicateOrderNumber: duplicateMatch.order.orderNumber,
            total: finalTotal,
            couponApplied: Boolean(couponCode && discountAmount > 0),
          },
        });
      } catch (trackingError) {
        console.error('⚠️ [CREATE-ORDER] Failed to track ignored duplicate order:', trackingError.message);
      }

      return res.json({
        success: true,
        duplicate: true,
        duplicateOf: {
          id: duplicateMatch.order.id,
          orderNumber: duplicateMatch.order.orderNumber,
          type: duplicateMatch.type
        },
        message: 'تم تجاهل الطلب المكرر',
        data: {
          id: duplicateMatch.order.id,
          orderNumber: duplicateMatch.order.orderNumber
        }
      });
    }

    if (isDuplicateOrder) {
      duplicateInfo = {
        duplicateOfId: duplicateMatch.order.id,
        duplicateOfOrderNumber: duplicateMatch.order.orderNumber,
        duplicateOfType: duplicateMatch.type,
        detectedAt: new Date().toISOString(),
        windowMinutes: duplicateSettings?.windowEnabled ? duplicateSettings.windowMinutes : null,
        criteria: duplicateSettings?.criteria,
        originalStatus: 'PENDING'
      };
    }
    let affiliateReferralId = null;
    let affiliateId = null;
    let orderSource = 'REGULAR';
    // Get affiliate code from cookies or query
    if (!isDuplicateOrder) {
      const affiliateCode = req.cookies?.affiliateCode || req.query.ref || req.query.affiliate;

      // Track affiliate referral if code exists
      if (affiliateCode) {
        try {
          const prisma = getSharedPrismaClient();
          const affiliate = await prisma.affiliate.findFirst({
            where: {
              affiliateCode,
              companyId: company.id,
              status: 'ACTIVE'
            }
          });

          if (affiliate) {
            affiliateId = affiliate.id;
            orderSource = 'AFFILIATE_REFERRAL';

            // البحث عن أو إنشاء العميل لربط الإحالة
            let customer = await findCustomerByPhone(prisma, guestPhone, company.id);

            if (!customer) {
              const nameParts = splitCustomerName(guestName);
              customer = await safeCreateCustomer(
                prisma,
                {
                  data: {
                    firstName: nameParts.firstName || 'عميل',
                    lastName: nameParts.lastName || '',
                    phone: guestPhone,
                    phoneNormalized: toCanonicalE164(guestPhone),
                    email: guestEmail || null,
                    company: { connect: { id: company.id } },
                    status: 'ACTIVE'
                  }
                },
                buildPhoneWhere(guestPhone, company.id)
              );
            }

            // تتبع الإحالة (سيتم تحسين trackReferral لمنع التكرار)
            const referral = await affiliateService.trackReferral(affiliateCode, customer.id, {
              companyId: company.id,
              url: req.originalUrl,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              source: req.query.source || 'direct'
            });

            affiliateReferralId = referral.id;
          }

        } catch (error) {
          console.error('⚠️ [CREATE-ORDER] Error tracking affiliate:', error.message);
          // Continue without affiliate tracking
        }
      }

    }

    const orderLimitCheck = await ensureWithinPlanLimit(company.id, 'orders', 1);
    if (!orderLimitCheck.allowed) {
      return res.status(400).json(orderLimitCheck.payload);
    }

    // Generate order number using centralized service
    const orderNumber = await orderService.generateOrderNumber(company.id);

    // Create order and update stock in a transaction to ensure data consistency
    // ✅ FIX: Increased timeout to 30 seconds to prevent "Transaction already closed" errors
    let pointsApplied = 0;
    let pointsUsed = 0;
    let pointsProgramId = null;
    const order = await prisma.$transaction(async (tx) => {
      let walletApplied = 0;
      let walletBalanceBefore = null;
      let walletBalanceAfter = null;
      let walletIdForTxn = null;

      const walletCustomerId = customerAuth?.customerId || loyaltyCustomer?.id || null;
      if (wantsWallet && walletCustomerId) {
        // Ensure wallet exists
        let wallet = await tx.customerWallet.findFirst({
          where: {
            customerId: walletCustomerId,
            companyId: company.id,
            isActive: true
          }
        });

        if (!wallet) {
          wallet = await tx.customerWallet.create({
            data: {
              customerId: walletCustomerId,
              companyId: company.id,
              balance: 0,
              totalEarned: 0,
              totalSpent: 0,
              currency: 'EGP',
              isActive: true
            }
          });
        }

        walletIdForTxn = wallet.id;

        walletBalanceBefore = wallet.balance;
        walletApplied = Math.min(Number(wallet.balance) || 0, requestedWalletAmount, Number(finalTotal) || 0);

        if (walletApplied <= 0) {
          throw new Error('رصيد المحفظة غير كاف');
        }

        walletBalanceAfter = walletBalanceBefore - walletApplied;

        await tx.customerWallet.update({
          where: { id: wallet.id },
          data: {
            balance: walletBalanceAfter,
            totalSpent: (Number(wallet.totalSpent) || 0) + walletApplied
          }
        });
      }

      const finalTotalAfterWallet = Math.max(0, (Number(finalTotal) || 0) - walletApplied);

      // استبدال النقاط كدفع (نظام الخصم التلقائي): نقطة = pointsRedemptionValue ج
      if (redeemPoints === true || redeemPoints === 'true') {
        try {
          const autoDiscountService = require('../services/autoDiscountService');
          const autoSettings = await autoDiscountService.getSettings(company.id);
          if (autoSettings.autoDiscountEnabled === true && autoSettings.redeemPointsEnabled !== false) {
            const program = await tx.customerLoyaltyProgram.findFirst({
              where: { companyId: company.id, type: 'POINTS', status: 'ACTIVE' },
              orderBy: { createdAt: 'asc' }
            });
            if (program && loyaltyCustomer) {
              const record = await tx.customerLoyaltyRecord.findUnique({
                where: { customerId_programId: { customerId: loyaltyCustomer.id, programId: program.id } }
              });
              if (record && parseFloat(record.currentPoints) > 0) {
                const valuePer = Number(autoSettings.pointsRedemptionValue || 1);
                const maxUsable = Math.floor(finalTotalAfterWallet / valuePer);
                pointsUsed = Math.min(Math.floor(parseFloat(record.currentPoints)), maxUsable);
                if (pointsUsed > 0) {
                  pointsApplied = pointsUsed * valuePer;
                  await tx.customerLoyaltyRecord.update({
                    where: { id: record.id },
                    data: {
                      currentPoints: Math.max(0, parseFloat(record.currentPoints) - pointsUsed),
                      totalRedeemed: (parseFloat(record.totalRedeemed) || 0) + pointsUsed,
                      lastPointsRedeemed: new Date()
                    }
                  });
                  pointsProgramId = program.id;
                }
              }
            }
          }
        } catch (pointsError) {
          console.error('⚠️ [POINTS-REDEEM] Failed to redeem points at checkout:', pointsError?.message);
        }
      }
      const finalTotalAfterPoints = Math.max(0, finalTotalAfterWallet - pointsApplied);

      // Create order
      // Note: items and shippingAddress must be JSON strings for Prisma
      const orderMetadata = {};
      if (affiliateReferralId) {
        orderMetadata.affiliateReferralId = affiliateReferralId;
        orderMetadata.affiliateId = affiliateId;
        orderMetadata.orderSource = orderSource;
      }

      if (customerAuth && customerAuth.companyId === company.id) {
        orderMetadata.walletCustomerId = customerAuth.customerId;
      }

      if (walletApplied > 0) {
        orderMetadata.walletApplied = walletApplied;
        orderMetadata.walletCustomerId = walletCustomerId;
        orderMetadata.walletBalanceBefore = walletBalanceBefore;
        orderMetadata.walletBalanceAfter = walletBalanceAfter;
      }

      if (duplicateInfo) {
        orderMetadata.duplicate = duplicateInfo;
      }

      if (quantityOfferSummaries.length > 0) {
        orderMetadata.quantityOffers = quantityOfferSummaries;
        orderMetadata.quantityOfferFreeShipping = quantityOfferFreeShipping;
      }

      if (preOrderItems.length > 0) {
        orderMetadata.preOrder = {
          items: preOrderItems,
          orderedAt: new Date().toISOString(),
        };
      }

      const backorderItems = cartItems.filter((item) => item.isBackorder === true);
      if (backorderItems.length > 0) {
        orderMetadata.backorder = {
          hasBackorder: true,
          items: backorderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            name: item.name,
            quantity: item.quantity,
            shortageQuantity: item.shortageQuantity || item.quantity,
          })),
          orderedAt: new Date().toISOString(),
        };
      }

      if (freeShippingAdjustment) {
        orderMetadata.freeShipping = freeShippingAdjustment;
      }

      if (loyaltyDiscount > 0 || loyaltyTierInfo) {
        orderMetadata.loyalty = {
          tierName: loyaltyTierInfo?.name || loyaltyTierInfo?.nameAr || null,
          tierNameAr: loyaltyTierInfo?.nameAr || null,
          discountPercent: Number(loyaltyRewards?.discountPercent || 0),
          discountAmount: Number(loyaltyDiscount.toFixed(2)),
          freeShipping: Boolean(loyaltyRewards?.freeShipping),
        };
      }

      if (walletDiscount > 0) {
        orderMetadata.walletDiscount = {
          percent: walletDiscountPercent,
          discountAmount: Number(walletDiscount.toFixed(2)),
        };
      }

      if (autoDiscountVoucherId) {
        orderMetadata.autoDiscount = {
          usedVoucherId: autoDiscountVoucherId,
          discountAmount: Number(loyaltyDiscount.toFixed(2)),
          appliedAt: new Date().toISOString()
        };
      }

      if (pointsApplied > 0) {
        orderMetadata.pointsRedemption = {
          programId: pointsProgramId,
          pointsUsed,
          value: pointsApplied,
          appliedAt: new Date().toISOString()
        };
      }

      if (appliedCoupon) {
        orderMetadata.coupon = {
          code: appliedCoupon.code,
          name: appliedCoupon.name || null,
          type: appliedCoupon.type,
          value: appliedCoupon.value,
          discountAmount: Number(discountAmount.toFixed(2))
        };
        orderMetadata.couponCode = appliedCoupon.code;
      }

      if (promoDiscount > 0) {
        orderMetadata.storePromotion = {
          discount: promoDiscount,
          label: promoLabel
        };
      }

      if (discountAmount > 0) {
        orderMetadata.discountReason = buildCompositeDiscountReason({
          coupon: appliedCoupon,
          promoLabel,
          promoDiscount,
          loyaltyTierTitle: loyaltyTierInfo?.nameAr || loyaltyTierInfo?.name,
          loyaltyDiscount,
          hasAutoDiscount: Boolean(autoDiscountVoucherId),
          walletDiscountPercent,
          walletDiscount,
          pointsUsed,
          pointsApplied,
          totalDiscount: discountAmount
        });

        if (requireDiscountApproval && !req.headers['x-admin-convert']) {
          orderMetadata.needsDiscountApproval = true;
          orderMetadata.discountApprovalStatus = 'PENDING_APPROVAL';
          orderMetadata.discountApprovalRequestedAt = new Date().toISOString();
        }
      }

      if (req.body?.appliedDiscount) {
        orderMetadata.appliedDiscount = req.body.appliedDiscount;
      }
      if (req.body?.bundleItems) {
        orderMetadata.bundleItems = req.body.bundleItems;
      }

      if (sanitizedAttribution) {
        orderMetadata.attribution = sanitizedAttribution;
      }

      const resolvedSessionDetails = await buildSessionDetails(req.body?.sessionDetails, req);
      if (resolvedSessionDetails) {
        orderMetadata.sessionDetails = resolvedSessionDetails;
      }

      // Wallet payment proof (screenshot + transfer details) uploaded by customer
      if (paymentMethod === 'wallet' && walletProof && typeof walletProof === 'object') {
        orderMetadata.walletPaymentProof = {
          imageUrl: String(walletProof.imageUrl || '').slice(0, 500),
          walletNumber: String(walletProof.walletNumber || '').slice(0, 120) || null,
          transferRef: String(walletProof.transferRef || '').slice(0, 120) || null,
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
        };
      }

      const newOrder = await tx.guestOrder.create({
        data: {
          orderNumber,
          guestEmail: guestEmail || '',
          guestPhone,
          guestName,
          items: JSON.stringify(cartItems),
          total: cartTotal,
          shippingCost,
          discountAmount,
          finalTotal: finalTotalAfterPoints,
          shippingAddress: JSON.stringify(shippingAddress),
          paymentMethod,
          status: isDuplicateOrder ? 'DUPLICATE_ORDER' : 'PENDING',
          notes,
          companyId: company.id,
          metadata: Object.keys(orderMetadata).length > 0 ? JSON.stringify(orderMetadata) : null
        }
      });

      if (walletApplied > 0 && customerAuth) {
        await tx.walletTransaction.create({
          data: {
            walletId: walletIdForTxn,
            type: 'DEBIT',
            amount: walletApplied,
            balanceBefore: walletBalanceBefore,
            balanceAfter: walletBalanceAfter,
            description: `Used for storefront order ${orderNumber}`,
            metadata: JSON.stringify({ guestOrderId: newOrder.id, orderNumber })
          }
        });
      }

      // Update stock
      for (const item of cartItems) {
        // Update variant stock if variant is selected
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          });

          if (variant && variant.trackInventory !== false) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });
            console.log('✅ [CREATE-ORDER] Updated variant stock:', item.variantId, 'decremented by:', item.quantity);
          }
        }

        // Update main product stock if tracking is enabled
        if (!item.productId) {
          throw new Error('Missing productId in cart item during stock update');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (product && product.trackInventory !== false) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
          console.log('✅ [CREATE-ORDER] Updated product stock:', item.productId, 'decremented by:', item.quantity);
        }
      }

      return newOrder;
    }, {
      maxWait: 30000, // Maximum time to wait to acquire a transaction slot
      timeout: 30000  // Maximum time the transaction can run
    });

    // حفظ عنوان العميل تلقائياً من الشيك آوت (يظهر في "بياناتي" من غير ما يكتبه بنفسه)
    try {
      const rawAddr = shippingAddress || null;
      if (rawAddr) {
        if (customerAuth?.customerId) {
          await orderService._saveCustomerAddress(customerAuth.customerId, company.id, rawAddr);
        } else if (guestPhone) {
          const db = await getSharedPrismaClientAsync();
          const matched = await db.customer.findFirst({
            where: { companyId: company.id, phone: guestPhone },
            select: { id: true }
          });
          if (matched) await orderService._saveCustomerAddress(matched.id, company.id, rawAddr);
        }
      }
    } catch (addrErr) {
      console.error('⚠️ [CHECKOUT] Failed to save customer address:', addrErr?.message || addrErr);
    }

    // تنبيه الفريق في حال كان الطلب مكرراً وتم إنشاؤه بنجاح
    if (isDuplicateOrder && duplicateSettings?.alertTeam && duplicateMatch?.order) {
      orderService.alertTeamAboutDuplicate(company.id, guestPhone, duplicateMatch.order, order.orderNumber).catch(err => {
        console.error('⚠️ [DUPLICATE-ALERT] Failed to alert team:', err?.message || err);
      });
    }

    // Delete cart (only if using cart mode)
    if (shouldDeleteCart && cartId) {
      try {
        // Check if cart exists before attempting to delete
        const existingCart = await prisma.guestCart.findUnique({
          where: { cartId }
        });

        if (existingCart) {
          // نلتقط بيانات السلة قبل حذفها لتسجيل التحويل الطبيعي
          let convCheckoutData = {};
          try {
            convCheckoutData = existingCart.checkoutData
              ? (typeof existingCart.checkoutData === 'string' ? JSON.parse(existingCart.checkoutData) : existingCart.checkoutData)
              : {};
          } catch (e) {
            convCheckoutData = {};
          }
          const convValue = typeof existingCart.total === 'string'
            ? parseFloat(existingCart.total) || 0
            : Number(existingCart.total || 0);

          await prisma.guestCart.delete({
            where: { cartId }
          });
          console.log('✅ [CREATE-ORDER] Cart deleted successfully:', cartId);

          // سجل التحويل الطبيعي (العميل كمل الشيك آوت لوحده).
          // بيتجاهل طلبات admin-convert لأن نقطة التحويل دي بتسجل بالفعل في routes/orders.js
          if (!req.headers['x-admin-convert']) {
            try {
              await prisma.cartConversionLog.create({
                data: {
                  cartId,
                  orderId: order?.id || null,
                  orderNumber: order?.orderNumber || null,
                  employeeId: null,
                  employeeName: null,
                  companyId: company.id,
                  cartValue: convValue,
                  governorate: convCheckoutData?.governorate || convCheckoutData?.city || null,
                  channel: 'natural',
                },
              });
            } catch (logError) {
              console.error('⚠️ [CREATE-ORDER] Failed to record natural cart conversion log:', logError.message);
            }
          }
        } else {
          console.log('⚠️ [CREATE-ORDER] Cart not found, skipping delete:', cartId);
        }
      } catch (error) {
        // Don't fail the order creation if cart deletion fails
        console.error('❌ [CREATE-ORDER] Error deleting cart (non-critical):', error.message);
      }

      // Clear cookie regardless of deletion success
      res.clearCookie('cart_id');
    }

    // Track Purchase event via Facebook Conversions API (Server-side)
    if (!isDuplicateOrder) {
      try {
      const storefrontSettings = await prisma.storefrontSettings.findUnique({
        where: { companyId: company.id }
      });

      if (
        storefrontSettings &&
        storefrontSettings.facebookConvApiEnabled &&
        storefrontSettings.facebookPixelId &&
        storefrontSettings.capiTrackPurchase !== false
      ) {
        let effectiveCapiToken = storefrontSettings.facebookConvApiToken
          ? storefrontSettings.facebookConvApiToken.trim()
          : null;

        if (!effectiveCapiToken && company?.id) {
          const companyTokens = await prisma.company.findUnique({
            where: { id: company.id },
            select: {
              facebookPixelAccessToken: true,
              facebookAdsAccessToken: true,
              facebookUserAccessToken: true,
            },
          });
          effectiveCapiToken =
            companyTokens?.facebookPixelAccessToken?.trim() ||
            companyTokens?.facebookAdsAccessToken?.trim() ||
            companyTokens?.facebookUserAccessToken?.trim() ||
            null;
        }

        if (effectiveCapiToken) {
          const FacebookConversionsService = require('../services/facebookConversionsService');
          const fbService = new FacebookConversionsService(
            storefrontSettings.facebookPixelId,
            effectiveCapiToken,
            storefrontSettings.facebookConvApiTestCode
          );

        // Use event ID from frontend Pixel for deduplication, or generate new one
        // This ensures the same event is not counted twice (Pixel + CAPI)
        const eventId = pixelEventId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🔄 [Facebook CAPI] Using event ID for deduplication:', eventId);

        // Extract user data from request
        const rawForwardedIp = req.headers['x-forwarded-for'];
        const cleanClientIp = rawForwardedIp
          ? String(rawForwardedIp).split(',')[0].trim()
          : (req.ip || req.connection?.remoteAddress || null);

        const userData = {
          email: guestEmail,
          phone: guestPhone,
          firstName: guestName?.split(' ')[0] || null,
          lastName: guestName?.split(' ').slice(1).join(' ') || null,
          city: shippingAddress?.city || shippingAddress?.governorate || null,
          state: shippingAddress?.governorate || null,
          country: (shippingAddress?.country || 'eg').toLowerCase(),
          zip: shippingAddress?.zipCode || null,
          ip: cleanClientIp,
          userAgent: req.headers['user-agent'],
          pageUrl: req.headers['referer'] || `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          fbc: resolvedFbc,
          fbp: resolvedFbp,
        };

        // Prepare order data
        const orderData = {
          orderNumber: order.orderNumber,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          })),
          total: finalTotal
        };

        // Send Purchase event
        await fbService.trackPurchase(userData, orderData, eventId);
        console.log('✅ [Facebook CAPI] Purchase event tracked for order:', order.orderNumber);
        }
      }
    } catch (capiError) {
      // Don't fail the order creation if CAPI fails
      console.error('❌ [Facebook CAPI] Error tracking Purchase event:', capiError);
    }

    // TikTok Events (best-effort, never throws)
    try {
      const tiktokEventsManager = require('../services/tiktok/tiktokEventsManager');
      const tiktokEventId = pixelEventId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await tiktokEventsManager.trackPurchaseForCompany(
        company.id,
        {
          email: guestEmail,
          phone: guestPhone,
          ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          pageUrl: req.headers['referer'] || `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        },
        {
          orderNumber: order.orderNumber,
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          total: finalTotal,
        },
        tiktokEventId,
      );
    } catch (tiktokTrackErr) {
      console.error('❌ [TikTok Events] Error tracking Purchase event:', tiktokTrackErr);
    }

    }

    // Emit socket event for real-time updates
    try {
      if (socketService && socketService.getIO()) {
        const enhancedOrder = {
          ...order,
          // Add any necessary fields for the frontend to render immediately without refetching if possible
          // or just sending the basic order is enough if frontend refetches or adapts it.
          // Following the structure in Orders.tsx might be needed.
          customerName: order.guestName,
          customerPhone: order.guestPhone,
          paymentStatus: 'PENDING',
          status: isDuplicateOrder ? 'DUPLICATE_ORDER' : 'PENDING',
          items: cartItems, // simplified
          createdAt: order.createdAt
        };
        socketService.getIO().to(`company_${company.id}`).emit('order:created', enhancedOrder);
        console.log('📡 [SOCKET] Emitted order:created event');
      }
    } catch (socketError) {
      console.error('❌ [SOCKET] Error emitting event:', socketError);
    }

    try {
      const { sendBrowserPushToCompany } = require('../services/browserPushService');
      void sendBrowserPushToCompany({
        companyId: company.id,
        typeId: 'order_created',
        title: `طلب جديد #${order.orderNumber}`,
        body: `${order.guestName || 'عميل'} • ${finalTotal} ج.م`,
        compactBody: 'تم استلام طلب جديد',
        url: `/orders?search=${encodeURIComponent(order.orderNumber)}`,
        requireInteraction: String(company.id) === 'cmteva12p00lrjuwxpufr4k8w' ? true : undefined,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      }).catch((pushError) => {
        console.error('❌ [WEB-PUSH] Error sending order push:', pushError.message || pushError);
      });
    } catch (pushBootstrapError) {
      console.error('❌ [WEB-PUSH] Failed to bootstrap order push:', pushBootstrapError.message || pushBootstrapError);
    }

    // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية)
    let createdOrder = null;
    let dropshippingRoutingError = null;
    // ملاحظة: guestOrder مختلف عن Order، لكن يمكننا إنشاء Order من guestOrder للتصدير
    try {
      console.log('🔍 [ORDER-CREATE] Starting Order creation from GuestOrder:', order.orderNumber);

      const { getWooCommerceAutoExportService } = require('../services/wooCommerceAutoExportService');
      const wooExportService = getWooCommerceAutoExportService();

      // إنشاء Order من guestOrder للتصدير
      // نحتاج لإنشاء customer أولاً إذا لم يكن موجوداً
      const prisma = await getPrisma();

      // البحث عن أو إنشاء customer
      let customer = await findCustomerByPhone(prisma, order.guestPhone, company.id);

      // If order was placed by an authenticated customer, prefer linking to that customer record
      if (customerAuth && customerAuth.companyId === company.id) {
        const tokenCustomer = await prisma.customer.findUnique({
          where: { id: customerAuth.customerId }
        });
        if (tokenCustomer && tokenCustomer.companyId === company.id) {
          customer = tokenCustomer;
        }
      }

      if (!customer) {
        // إنشاء customer جديد
        console.log('🔍 [ORDER-CREATE] Creating new customer:', order.guestName, order.guestPhone);

        // Split name into first and last
        const nameParts = splitCustomerName(order.guestName);
        const firstName = nameParts.firstName;
        const lastName = nameParts.lastName;

        customer = await safeCreateCustomer(
          prisma,
          {
            data: {
              firstName: firstName || 'عميل',
              lastName: lastName || '',
              phone: order.guestPhone,
              phoneNormalized: toCanonicalE164(order.guestPhone),
              email: order.guestEmail || null,
              company: { connect: { id: company.id } },
              status: 'ACTIVE',
              metadata: JSON.stringify({ source: 'guest_order', guestOrderId: order.id })
            }
          },
          buildPhoneWhere(order.guestPhone, company.id)
        );
        console.log('✅ [ORDER-CREATE] Customer created:', customer.id);
      } else {
        const updateData = {};
        if (customer.status === 'LEAD') updateData.status = 'ACTIVE';
        if (!customer.phoneNormalized && customer.phone) {
          updateData.phoneNormalized = toCanonicalE164(customer.phone);
        }
        if (Object.keys(updateData).length > 0) {
          try {
            updateData.updatedAt = new Date();
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: updateData
            });
          } catch (statusErr) {
            console.error('⚠️ [ORDER-CREATE] Failed to update customer:', statusErr.message);
          }
        }
        console.log('✅ [ORDER-CREATE] Found existing customer:', customer.id);
      }

      console.log('🔍 [ORDER-CREATE] Preparing order items...');

      // إنشاء Order من guestOrder مع جلب الأسعار التاريخية (تاجر ومنصة)
      const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      const orderItems = await Promise.all(parsedItems.map(async (item) => {
        // جلب تفاصيل المنتج للتأكد من الأسعار وقت الطلب
        const product = await prisma.product.findFirst({
          where: {
            id: item.productId,
            companyId: company.id,
          },
          include: { merchantProducts: true, productVariants: true }
        });
        const merchantProduct = product?.merchantProducts?.[0];
        let productColor =
          item.productColor ||
          item.color ||
          getAttributeValue(item.attributes, ['color', 'colour', 'اللون', 'Color', 'لون', 'ألوان', 'الوان']) ||
          null;
        let productSize =
          item.productSize ||
          item.size ||
          getAttributeValue(item.attributes, ['size', 'المقاس', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم']) ||
          null;

        if ((!productColor || !productSize) && item.variantId) {
          const matchedVariant = product?.productVariants?.find(v => v.id === item.variantId);
          if (matchedVariant) {
            const vAttrs = resolveVariantAttributes(matchedVariant);
            if (!productColor) productColor = vAttrs.Color || vAttrs.color || vAttrs.اللون || matchedVariant.color || null;
            if (!productSize) productSize = vAttrs.Size || vAttrs.size || vAttrs.المقاس || matchedVariant.size || null;
            if (!productColor && !productSize && matchedVariant.name) {
              if (matchedVariant.type === 'color') productColor = matchedVariant.name;
              else if (matchedVariant.type === 'size') productSize = matchedVariant.name;
              else {
                const parts = matchedVariant.name.split(/\s*[-–|\/]\s*/);
                if (parts.length >= 2) {
                  productColor = parts[0];
                  productSize = parts[1];
                }
              }
            }
          }
        }
        const productImage = item.productImage || item.image || null;

        return {
          productName: item.name || item.productName || 'منتج',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0),
          total: parseFloat((item.price || 0) * (item.quantity || 1)),
          productSku: item.productSku || item.sku || null,
          // productColor/productSize مقبولان في OrderItem كـ String فقط؛
          // خصائص الفاريانت (سايز) قد تكون Int (37) فيخفق إنشاء الـ primary order.
          productColor: productColor == null ? null : String(productColor),
          productSize: productSize == null ? null : String(productSize),
          productId: item.productId || null,
          variantId: item.variantId || null,
          productImage,
          merchantPrice: merchantProduct ? Number(merchantProduct.merchantPrice) : null,
          basePrice: product ? Number(product.basePrice || product.price) : null,
          metadata: buildOrderItemMetadata(item, productImage),
        };
      }));

      // Check for affiliate referral from guestOrder metadata
      const regularOrderMetadata = {};
      let affiliateReferralId = null;
      let affiliateId = null;
      let orderSource = 'REGULAR';
      let duplicateMetadata = null;
      let attributionMetadata = null;
      let freeShippingMetadata = null;
      // Wallet payment metadata carried over from the guest order
      let walletPaymentProofMetadata = null;
      let walletDiscountMetadata = null;
      let walletAppliedMetadata = null;
      let walletCustomerIdMetadata = null;
      let walletBalanceBeforeMetadata = null;
      let walletBalanceAfterMetadata = null;
      let discountReasonMetadata = null;
      let couponMetadata = null;
      let couponCodeMetadata = null;
      let sessionDetailsMetadata = null;
      let guestOrderMeta = null;

      if (order.metadata) {
        try {
          guestOrderMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          const metadata = guestOrderMeta;
          if (metadata.affiliateReferralId) {
            affiliateReferralId = metadata.affiliateReferralId;
            affiliateId = metadata.affiliateId;
            orderSource = metadata.orderSource || 'AFFILIATE_REFERRAL';
          }
          if (metadata.duplicate) {
            duplicateMetadata = metadata.duplicate;

          }
          if (metadata.attribution) {
            attributionMetadata = sanitizeOrderAttribution(metadata.attribution);
          }
          if (metadata.sessionDetails) {
            sessionDetailsMetadata = metadata.sessionDetails;
          }
          if (metadata.freeShipping) {
            freeShippingMetadata = metadata.freeShipping;
          }
          if (metadata.walletPaymentProof) {
            walletPaymentProofMetadata = metadata.walletPaymentProof;
          }
          if (metadata.walletDiscount) {
            walletDiscountMetadata = metadata.walletDiscount;
          }
          if (metadata.walletApplied !== undefined && metadata.walletApplied !== null) {
            walletAppliedMetadata = metadata.walletApplied;
          }
          if (metadata.walletCustomerId) {
            walletCustomerIdMetadata = metadata.walletCustomerId;
          }
          if (metadata.walletBalanceBefore !== undefined && metadata.walletBalanceBefore !== null) {
            walletBalanceBeforeMetadata = metadata.walletBalanceBefore;
          }
          if (metadata.walletBalanceAfter !== undefined && metadata.walletBalanceAfter !== null) {
            walletBalanceAfterMetadata = metadata.walletBalanceAfter;
          }
          if (metadata.discountReason) {
            discountReasonMetadata = metadata.discountReason;
          }
          if (metadata.coupon) {
            couponMetadata = metadata.coupon;
          }
          if (metadata.couponCode) {
            couponCodeMetadata = metadata.couponCode;
          }
          if (metadata.needsDiscountApproval !== undefined) {
            regularOrderMetadata.needsDiscountApproval = metadata.needsDiscountApproval;
          }
          if (metadata.discountApprovalStatus) {
            regularOrderMetadata.discountApprovalStatus = metadata.discountApprovalStatus;
          }
          if (metadata.discountApprovalRequestedAt) {
            regularOrderMetadata.discountApprovalRequestedAt = metadata.discountApprovalRequestedAt;
          }
          if (metadata.discountApprovedBy) {
            regularOrderMetadata.discountApprovedBy = metadata.discountApprovedBy;
          }
          if (metadata.discountApprovedAt) {
            regularOrderMetadata.discountApprovedAt = metadata.discountApprovedAt;
          }
          if (metadata.discountRejectedBy) {
            regularOrderMetadata.discountRejectedBy = metadata.discountRejectedBy;
          }
          if (metadata.discountRejectedAt) {
            regularOrderMetadata.discountRejectedAt = metadata.discountRejectedAt;
          }
          if (metadata.discountRejectionReason) {
            regularOrderMetadata.discountRejectionReason = metadata.discountRejectionReason;
          }
        } catch (e) {
          // Ignore metadata parsing errors
        }
      }
 
      if (discountReasonMetadata) {
        regularOrderMetadata.discountReason = discountReasonMetadata;
      }
      if (couponMetadata) {
        regularOrderMetadata.coupon = couponMetadata;
      }
      if (couponCodeMetadata) {
        regularOrderMetadata.couponCode = couponCodeMetadata;
      }
      if (duplicateMetadata) {
        regularOrderMetadata.duplicate = duplicateMetadata;
      }
      if (attributionMetadata) {
        regularOrderMetadata.attribution = attributionMetadata;
      }
      if (sessionDetailsMetadata) {
        regularOrderMetadata.sessionDetails = sessionDetailsMetadata;
      }
      if (freeShippingMetadata) {
        regularOrderMetadata.freeShipping = freeShippingMetadata;
      }
      if (pointsApplied > 0) {
        regularOrderMetadata.pointsRedemption = {
          programId: pointsProgramId,
          pointsUsed,
          value: pointsApplied,
          appliedAt: new Date().toISOString()
        };
      }
      if (promoDiscount > 0) {
        regularOrderMetadata.storePromotion = { discount: promoDiscount, label: promoLabel };
      }
      if (guestOrderMeta?.appliedDiscount) {
        regularOrderMetadata.appliedDiscount = guestOrderMeta.appliedDiscount;
      }
      if (guestOrderMeta?.bundleItems) {
        regularOrderMetadata.bundleItems = guestOrderMeta.bundleItems;
      }
      // Wallet payment metadata (proof screenshot + transfer details + discounts)
      if (walletPaymentProofMetadata) {
        regularOrderMetadata.walletPaymentProof = walletPaymentProofMetadata;
      }
      if (walletDiscountMetadata) {
        regularOrderMetadata.walletDiscount = walletDiscountMetadata;
      }
      if (walletAppliedMetadata !== null) {
        regularOrderMetadata.walletApplied = walletAppliedMetadata;
      }
      if (walletCustomerIdMetadata) {
        regularOrderMetadata.walletCustomerId = walletCustomerIdMetadata;
      }
      if (walletBalanceBeforeMetadata !== null) {
        regularOrderMetadata.walletBalanceBefore = walletBalanceBeforeMetadata;
      }
      if (walletBalanceAfterMetadata !== null) {
        regularOrderMetadata.walletBalanceAfter = walletBalanceAfterMetadata;
      }
      if (order.id && Object.keys(regularOrderMetadata).length > 0) {
        regularOrderMetadata.guestOrderId = order.id;
      }

      // Check if affiliateReferralId is already bound to another Order (prevent P2002 @unique collision)
      if (affiliateReferralId) {
        try {
          const existingOrderWithReferral = await prisma.order.findUnique({
            where: { affiliateReferralId },
            select: { id: true, orderNumber: true }
          });
          if (existingOrderWithReferral) {
            console.warn(`⚠️ [ORDER-CREATE] affiliateReferralId ${affiliateReferralId} already bound to order ${existingOrderWithReferral.orderNumber} (${existingOrderWithReferral.id}). Detaching from new Order to prevent unique constraint crash.`);
            affiliateReferralId = null;
          }
        } catch (chkErr) {
          console.warn('⚠️ [ORDER-CREATE] Failed to check affiliateReferralId collision:', chkErr.message);
        }
      }

      // Defensive check: ensure variantId exists in DB before attaching to avoid foreign key errors
      for (const item of orderItems) {
        if (item.variantId) {
          try {
            const vExists = await prisma.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true }
            });
            if (!vExists) {
              console.warn(`⚠️ [ORDER-CREATE] variantId ${item.variantId} does not exist in DB, clearing to prevent foreign key violation.`);
              item.variantId = null;
            }
          } catch (_) {
            item.variantId = null;
          }
        }
      }

      console.log('🔍 [ORDER-CREATE] About to create Order with data:', {
        orderNumber: order.orderNumber,
        customerId: customer.id,
        customerName: order.guestName,
        customerPhone: order.guestPhone
      });

      try {
        createdOrder = await prisma.order.create({
          data: {
            orderNumber: order.orderNumber,
            customerId: customer.id,
            companyId: company.id,
            customerName: order.guestName,
            customerPhone: order.guestPhone,
            customerEmail: order.guestEmail || null,
            customerAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : shippingAddress,
            shippingAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : shippingAddress,
            governorate: (() => {
              const rawGovernorate = shippingAddress?.governorate || shippingAddress?.state || shippingAddress?.region || '';
              try {
                const { getTurboGovernorateName } = require('../utils/turbo/governorateMapper');
                const normalized = getTurboGovernorateName(rawGovernorate);
                return normalized || rawGovernorate || '';
              } catch (e) {
                return rawGovernorate || '';
              }
            })(),
            city: shippingAddress?.city || '',
            subtotal: parseFloat(order.total),
            shipping: parseFloat(order.shippingCost || 0),
            discount: parseFloat(order.discountAmount || 0),
            total: parseFloat(order.finalTotal),
            status: isDuplicateOrder ? 'DUPLICATE_ORDER' : 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod: mapPaymentMethodToEnum(paymentMethod || 'cash'),
            notes: order.notes || `طلب من الموقع - ${order.orderNumber}`,
            sourceType: 'storefront',
            extractionMethod: 'storefront',
            isViewed: false,
            affiliateReferralId,
            affiliateId,
            orderSource: orderSource || 'REGULAR',
            metadata:
              Object.keys(regularOrderMetadata).length > 0
                ? JSON.stringify(regularOrderMetadata)
                : undefined,
            orderItems: {
              create: orderItems
            }
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            },
            customer: true
          }
        });
      } catch (firstErr) {
        console.warn('⚠️ [ORDER-CREATE] First attempt to create Order failed, checking existing or self-healing fallback:', firstErr.message);

        // 1. If order already exists with orderNumber, reuse it
        const existingOrder = await prisma.order.findFirst({
          where: {
            companyId: company.id,
            orderNumber: order.orderNumber
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            },
            customer: true
          }
        });

        if (existingOrder) {
          createdOrder = existingOrder;
          console.log('✅ [ORDER-CREATE] Reusing existing Order matching orderNumber:', existingOrder.orderNumber);
        } else {
          // 2. Retry with fully sanitized order items (detaching variantId and productId to guarantee zero foreign key error)
          const sanitizedItems = orderItems.map((item) => ({
            productName: item.productName || 'منتج',
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            total: Number(item.total) || 0,
            productSku: item.productSku || null,
            productColor: item.productColor ? String(item.productColor) : null,
            productSize: item.productSize ? String(item.productSize) : null,
            productId: null,
            variantId: null,
            productImage: item.productImage || null,
            metadata: item.metadata || null
          }));

          createdOrder = await prisma.order.create({
            data: {
              orderNumber: order.orderNumber,
              customerId: customer.id,
              companyId: company.id,
              customerName: order.guestName,
              customerPhone: order.guestPhone,
              customerEmail: order.guestEmail || null,
              customerAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : (shippingAddress || ''),
              shippingAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : (shippingAddress || ''),
              governorate: (() => {
                const rawGovernorate = shippingAddress?.governorate || shippingAddress?.state || shippingAddress?.region || '';
                try {
                  const { getTurboGovernorateName } = require('../utils/turbo/governorateMapper');
                  const normalized = getTurboGovernorateName(rawGovernorate);
                  return normalized || rawGovernorate || '';
                } catch (e) {
                  return rawGovernorate || '';
                }
              })(),
              city: shippingAddress?.city || '',
              subtotal: parseFloat(order.total || 0),
              shipping: parseFloat(order.shippingCost || 0),
              discount: parseFloat(order.discountAmount || 0),
              total: parseFloat(order.finalTotal || 0),
              status: isDuplicateOrder ? 'DUPLICATE_ORDER' : 'PENDING',
              paymentStatus: 'PENDING',
              paymentMethod: mapPaymentMethodToEnum(paymentMethod || 'cash'),
              notes: order.notes || `طلب من الموقع - ${order.orderNumber}`,
              sourceType: 'storefront',
              extractionMethod: 'storefront',
              isViewed: false,
              orderSource: orderSource || 'REGULAR',
              metadata:
                Object.keys(regularOrderMetadata).length > 0
                  ? JSON.stringify(regularOrderMetadata)
                  : undefined,
              orderItems: {
                create: sanitizedItems
              }
            },
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          });
          console.log('✅ [ORDER-CREATE] Self-healing fallback succeeded for order:', createdOrder.orderNumber);
        }
      }

      if (!isDuplicateOrder) {
        // Update referral to mark as converted
        if (affiliateReferralId) {
          try {
            const referralBefore = await prisma.affiliateReferral.findUnique({
              where: { id: affiliateReferralId },
              select: { id: true, converted: true }
            });

            await prisma.affiliateReferral.update({
              where: { id: affiliateReferralId },
              data: {
                converted: true,
                convertedAt: new Date(),
                orderId: createdOrder.id
              }
            });

            // 🎁 منح المسوق نقاط ولاء بدلاً من العمولة المالية عند نجاح الإحالة
            if (referralBefore && !referralBefore.converted) {
              try {
                const affiliateService = require('../services/affiliateService');
                await affiliateService.awardReferralLoyaltyPoints(affiliateReferralId);
              } catch (awardErr) {
                console.error('⚠️ [GUEST-ORDER] Error awarding referral loyalty points:', awardErr.message);
              }
            }
          } catch (error) {
            console.error('⚠️ [GUEST-ORDER] Error updating referral:', error.message);
          }
        }

        // Calculate commissions and route to merchant if needed
        try {
          // Check if order needs dropshipping
          const productIds = orderItems.filter(item => item.productId).map(item => item.productId);
          if (productIds.length > 0) {
            const products = await prisma.product.findMany({
              where: {
                id: { in: productIds },
                companyId: company.id
              },
              select: { id: true, isDropshipped: true }
            });

            const needsDropshipping = products.some(p => p.isDropshipped);
            if (needsDropshipping) {
              await dropshippingService.routeOrderToMerchant(createdOrder.id);
            }
          }

          // Calculate commissions (will be triggered when order is confirmed)
          // We'll calculate when status changes to CONFIRMED
        } catch (error) {
          console.error('⚠️ [GUEST-ORDER] Error processing dropshipping:', error.message);
          dropshippingRoutingError = error;
          try {
            await prisma.order.update({
              where: { id: createdOrder.id },
              data: {
                status: 'CANCELLED',
                notes: `${createdOrder.notes || ''}\nفشل توجيه طلب الدروب شيبنج: ${error.message}`.trim(),
              },
            });
          } catch (statusError) {
            console.error('❌ [GUEST-ORDER] Failed to mark dropshipping order as cancelled:', statusError.message);
          }
        }

        if (!dropshippingRoutingError) {
          console.log('✅ [ORDER-CREATE] Order created successfully:', createdOrder.id, createdOrder.orderNumber);

          // 🎁 الولاء: المنح فقط عند التسليم (DELIVERED) — لا تمنح نقاط عند إنشاء طلب المتجر (PENDING)
          if (createdOrder.status === 'DELIVERED') {
            try {
              const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
              await customerLoyaltyService.applyLoyaltyPointsForOrder({
                orderId: createdOrder.id,
                companyId: company.id,
                changedBy: null
              }).catch((loyaltyError) => {
                console.error(`❌ [LOYALTY-AUTO] Failed to award points for storefront order ${createdOrder.orderNumber}:`, loyaltyError.message);
              });
            } catch (loyaltyError) {
              console.error('❌ [LOYALTY-AUTO] Loyalty service error:', loyaltyError.message);
            }
          }

          // تصدير Order إلى WooCommerce
          wooExportService.exportOrderAsync(createdOrder.id);
          console.log('✅ [GUEST-ORDER] Order created and queued for WooCommerce export:', createdOrder.orderNumber);

          // 🚀 دفع الطلب للموردين إذا كان يحتوي على منتجات مستوردة
          internalSyncService.pushOrderToProvider(createdOrder.id, company.id).catch(err => {
            console.error(`❌ [GUEST-ORDER] Failed to push order ${createdOrder.id} to provider:`, err.message);
          });

          // ⚡ إرسال الويب هوك الصادر للطلبات (Outgoing Webhook)
          try {
            const orderWebhookService = require('../services/orderWebhookService');
            orderWebhookService.triggerOrderCreated(createdOrder.id, company.id);
          } catch (webhookErr) {
            console.warn('⚠️ [GUEST-ORDER] Failed to trigger order webhook:', webhookErr.message);
          }
        } else {
          console.warn('⚠️ [GUEST-ORDER] Skipping external sync because dropshipping routing failed');
        }
      } else {
        console.log('⚠️ [GUEST-ORDER] Duplicate order detected, skipping external sync.');
      }
    } catch (wooError) {
      // لا نوقف العملية إذا فشل التصدير ولكن نسجل تفاصيل الخطأ بدقة
      console.error('❌ [ORDER-CREATE-MIRROR] Error during order mirroring / WooCommerce export:', wooError.message);
      console.error('❌ [ORDER-CREATE-MIRROR] Full stack trace:', wooError);
    }

    if (dropshippingRoutingError) {
      return res.status(409).json({
        success: false,
        code: 'DROPSHIPPING_ROUTING_FAILED',
        error: 'تم رفض الطلب لأن توجيه الدروب شيبنج فشل. برجاء مراجعة المورد أو المخزون.',
        details: {
          orderNumber: createdOrder?.orderNumber || order?.orderNumber,
          reason: dropshippingRoutingError.message,
        },
      });
    }

    if (!isDuplicateOrder) {
    // عناصر الطلب — متاحة دائماً من الـ guest order
    let guestItems = [];
    try {
      guestItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    } catch (parseErr) {
      guestItems = cartItems || [];
    }

    // 📱 إرسال إشعار WhatsApp تلقائي للطلب الجديد
    // ملاحظة: نعتمد على بيانات الـ guest order (المتوفرة دائماً) بدلاً من createdOrder —
    // لو فشل تحويل الزائر لطلب عادي (customer.create/order.create) يبقى الإشعار يشتغل عادي.
    try {
      console.log('📱 [WHATSAPP] Preparing to send notification for order:', order.orderNumber);
      console.log('📱 [WHATSAPP] Order data:', {
        id: order.id,
        customerPhone: order.guestPhone,
        customerName: order.guestName,
        companyId: company.id,
        total: order.finalTotal
      });

      const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

      // تجهيز بيانات الطلب للإشعار
      const orderForNotification = {
        id: createdOrder?.id || order.id,
        orderNumber: order.orderNumber,
        companyId: company.id,
        customerPhone: order.guestPhone || createdOrder?.customerPhone,
        customerName: order.guestName || createdOrder?.customerName,
        customer: {
          firstName: (order.guestName || createdOrder?.customerName || '').split(' ')[0] || order.guestName,
          phone: order.guestPhone || createdOrder?.customerPhone
        },
        customerId: createdOrder?.customerId || null,
        total: parseFloat(order.finalTotal ?? order.total ?? createdOrder?.total ?? 0),
        shipping: parseFloat(order.shippingCost ?? createdOrder?.shipping ?? 0),
        currency: 'EGP',
        items: (createdOrder?.orderItems && createdOrder.orderItems.length > 0) ? createdOrder.orderItems : guestItems,
        createdAt: order.createdAt || createdOrder?.createdAt
      };

      console.log('📱 [WHATSAPP] Calling sendOrderCreatedNotification with:', orderForNotification);

      const result = await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);
      console.log('✅ [WHATSAPP] Notification result:', result);

      if (!result.success) {
        console.error('❌ [WHATSAPP] Notification failed:', result.reason);
        if (result.reason === 'disabled') {
          console.error('⚠️ [WHATSAPP] WhatsApp notifications are disabled in settings. Check:');
          console.error('   1. orderNotificationsEnabled must be true');
          console.error('   2. orderCreatedEnabled must be true');
        } else if (result.reason === 'no_phone') {
          console.error('⚠️ [WHATSAPP] No customer phone number provided');
        } else if (result.reason === 'no_session') {
          console.error('⚠️ [WHATSAPP] No WhatsApp session available');
        } else if (result.reason === 'session_not_connected') {
          console.error('⚠️ [WHATSAPP] WhatsApp session is not connected');
        } else if (result.reason === 'no_template') {
          console.error('⚠️ [WHATSAPP] No notification template found for ORDER_CREATED');
        }
      } else {
        console.log('✅ [WHATSAPP] Order notification sent successfully for:', order.orderNumber);
      }
    } catch (whatsappError) {
      // لا نوقف العملية إذا فشل WhatsApp
      console.error('❌ [WHATSAPP] Failed to send notification:', whatsappError.message);
      console.error('❌ [WHATSAPP] Error stack:', whatsappError.stack);
    }

    // 📧 إرسال إشعار البريد الإلكتروني تلقائياً
    try {
      const emailRecipient = createdOrder?.customerEmail || order.guestEmail;
      if (emailRecipient) {
        console.log('📧 [EMAIL] Preparing to send confirmation to:', emailRecipient);

        const emailItems = ((createdOrder?.orderItems && createdOrder.orderItems.length > 0)
          ? createdOrder.orderItems
          : guestItems
        ).map(item => ({
          productName: item.product?.name || item.productName || item.name,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0),
          productColor: item.productColor,
          productSize: item.productSize
        }));

        await EmailService.sendOrderConfirmation({
          customerEmail: emailRecipient,
          customerName: createdOrder?.customerName || order.guestName,
          orderNumber: order.orderNumber,
          items: emailItems,
          total: parseFloat(order.finalTotal ?? createdOrder?.total ?? 0),
          status: createdOrder?.status || order.status || 'PENDING',
          customerPhone: order.guestPhone || createdOrder?.customerPhone
        });
        console.log('✅ [EMAIL] Order confirmation sent successfully');
      }
    } catch (emailError) {
      console.error('❌ [EMAIL] Failed to send confirmation:', emailError.message);
    }

    }

    // Trigger auto-distribution immediately
    try {
      const confirmationService = require('../services/orderConfirmationService');
      
      if (createdOrder) {
        await confirmationService.autoAssignOnCreation(company.id, createdOrder.id, 'regular');
      } else if (order) {
        await confirmationService.autoAssignOnCreation(company.id, order.id, 'guest');
      }
    } catch (distError) {
      console.error('❌ [CREATE-ORDER] Error in auto-distribution:', distError.message);
    }

    // 🤖 Trigger the order-confirmation agent (منى) to resolve the delivery area
    // against the shipping company's map. Fire-and-forget — never blocks checkout.
    try {
      const aiServiceAdminClient = require('../services/aiServiceAdminClient');
      const addressFieldsForAgent = (() => {
        if (typeof shippingAddress === 'object' && shippingAddress) {
          return {
            address_text: [
              shippingAddress.street || shippingAddress.address || '',
              shippingAddress.city || '',
              shippingAddress.governorate || '',
            ].filter(Boolean).join(', ') || null,
            governorate: shippingAddress.governorate || shippingAddress.state || null,
            city: shippingAddress.city || null,
          };
        }
        const raw = typeof shippingAddress === 'string' ? shippingAddress : (order?.customerAddress || order?.shippingAddress || '');
        return {
          address_text: typeof raw === 'string' && raw.trim() ? raw : null,
          governorate: null,
          city: null,
        };
      })();

      aiServiceAdminClient.notifyOrderCreated({
        company_id: company.id,
        order_number: order?.orderNumber || createdOrder?.orderNumber || orderNumber,
        customer_phone: order?.guestPhone || createdOrder?.customerPhone || null,
        customer_name: order?.guestName || createdOrder?.customerName || null,
        ...addressFieldsForAgent,
        source: 'storefront',
      }).catch((agentErr) => {
        console.warn('⚠️ [ORDER-CREATED-AGENT] AI agent trigger failed (non-blocking):', agentErr.message);
      });
    } catch (agentTriggerErr) {
      console.warn('⚠️ [ORDER-CREATED-AGENT] AI agent trigger skipped (non-blocking):', agentTriggerErr.message);
    }

    // Automated AI Voice Call Confirmation trigger (non-blocking)
    try {
      const companySettings = typeof company.settings === 'string' ? JSON.parse(company.settings) : (company.settings || {});
      const voiceSettings = companySettings.voiceSettings || {};
      if (voiceSettings.autoCallEnabled && (createdOrder?.id || order?.id)) {
        const voiceCallService = require('../services/voice/voiceCallService');
        voiceCallService.dispatchOrderConfirmationCall({
          companyId: company.id,
          orderId: createdOrder?.id || order?.id,
          orderNumber: order?.orderNumber || createdOrder?.orderNumber || orderNumber,
          customerPhone: order?.guestPhone || createdOrder?.customerPhone,
          customerName: order?.guestName || createdOrder?.customerName,
          total: Number(order?.finalTotal || finalTotal || 0),
          force: false,
        }).catch((voiceErr) => {
          console.warn('[VOICE-AUTO-CALL] Auto confirmation call skipped/failed (non-blocking):', voiceErr.message);
        });
      }
    } catch (voiceDispatchErr) {
      console.warn('[VOICE-AUTO-CALL] Failed to check voice settings:', voiceDispatchErr.message);
    }

    try {
      const trackedTotal = Number(order?.finalTotal || finalTotal || 0);
      const itemsCount = Array.isArray(cartItems) ? cartItems.length : 0;

      await billOrderPpuApps({
        companyId: company.id,
        orderNumber: order?.orderNumber || orderNumber || '',
        orderTotal: trackedTotal,
        itemsCount,
        metadata: { paymentMethod },
        orderId: createdOrder?.id || null,
      });
    } catch (ppuError) {
      console.error('❌ [PPU-BILLING] Error billing PPU apps:', ppuError.message);
    }

    try {
      const trackedTotal = Number(order?.finalTotal || finalTotal || 0);
      const itemsCount = Array.isArray(cartItems) ? cartItems.length : 0;

      await trackStorefrontAppUsage({
        companyId: company.id,
        slug: 'conversion-suite',
        feature: isDuplicateOrder ? 'duplicate_order_created' : 'order_created',
        metadata: {
          orderNumber: order?.orderNumber || orderNumber,
          paymentMethod,
          total: trackedTotal,
          itemsCount,
          couponApplied: Boolean(couponCode && discountAmount > 0),
          discountAmount: Number(discountAmount || 0),
          source: items && Array.isArray(items) && items.length > 0 ? 'direct' : 'cart',
        },
      });

      if (appliedCoupon) {
        try {
          await prisma.$transaction([
            prisma.couponUsage.create({
              data: {
                couponId: appliedCoupon.id,
                companyId: company.id,
                customerId: customer?.id || null,
                orderId: createdOrder?.id || null,
                discountAmount: Number(discountAmount || 0),
                orderAmount: Number(trackedTotal || cartTotal || 0),
              }
            }),
            prisma.coupon.update({
              where: { id: appliedCoupon.id },
              data: {
                usageCount: { increment: 1 }
              }
            })
          ]);
        } catch (couponUsageErr) {
          console.error('⚠️ [ORDER-CREATE] Failed to record coupon usage:', couponUsageErr);
        }
      }

      if (couponCode && (Number(discountAmount || 0) > 0 || appliedCoupon?.type === 'FREE_SHIPPING')) {
        await trackStorefrontAppUsage({
          companyId: company.id,
          slug: 'conversion-suite',
          feature: 'coupon_applied_to_order',
          metadata: {
            couponCode: String(couponCode).trim().toUpperCase(),
            orderNumber: order?.orderNumber || orderNumber,
            discountAmount: Number(discountAmount || 0),
            total: trackedTotal,
          },
        });
      }

      if (quantityOfferSummaries.length > 0) {
        for (const quantityOfferSummary of quantityOfferSummaries) {
          await trackStorefrontAppUsage({
            companyId: company.id,
            slug: 'quantity-offers-pro',
            feature: 'quantity_offer_order_created',
            quantity: Number(
              quantityOfferSummary.offerQuantity ||
                quantityOfferSummary.totalUnits ||
                quantityOfferSummary.itemsCount ||
                1,
            ),
            totalCost: Number(quantityOfferSummary.totalValue || 0),
            metadata: {
              orderNumber: order?.orderNumber || orderNumber,
              paymentMethod,
              offerId: quantityOfferSummary.offerId || null,
              offerLabel: quantityOfferSummary.offerLabel || null,
              groupId: quantityOfferSummary.groupId,
              productId: quantityOfferSummary.productId || null,
              productName: quantityOfferSummary.productName || null,
              freeShipping: Boolean(quantityOfferSummary.freeShipping),
              itemsCount: Number(quantityOfferSummary.itemsCount || 0),
              totalUnits: Number(quantityOfferSummary.totalUnits || 0),
              source: items && Array.isArray(items) && items.length > 0 ? 'direct' : 'cart',
            },
          });
        }
      }
    } catch (trackingError) {
      console.error('⚠️ [CREATE-ORDER] Failed to track order usage:', trackingError.message);
    }

    res.json({
      success: true,
      data: {
        ...order,
        storePromotionDiscount: promoDiscount,
        storePromotionLabel: promoLabel,
        loyaltyDiscount,
        loyaltyFreeShipping: Boolean(loyaltyRewards?.freeShipping),
        loyaltyTierName: loyaltyTierInfo?.nameAr || loyaltyTierInfo?.name || null,
        autoDiscountApplied: Boolean(autoDiscountVoucherId),
        autoDiscountVoucherId,
        pointsRedemptionApplied: pointsApplied > 0,
        pointsUsed,
        pointsValue: pointsApplied,
      },
      duplicate: isDuplicateOrder,
      message: isDuplicateOrder ? 'تم تسجيل الطلب المكرر' : 'تم إنشاء الطلب بنجاح'
    });
  } catch (error) {
    console.error('❌ [CREATE-ORDER] Error creating order:', error);
    console.error('❌ [CREATE-ORDER] Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track order by order number and phone (query params)
router.get('/track', async (req, res) => {
  try {
    console.log('🔍 [TRACK-ORDER] ===== Track Order Request =====');
    const { company } = req;
    const { orderNumber, phone } = req.query;

    console.log('🏢 [TRACK-ORDER] Company ID:', company?.id);
    console.log('📋 [TRACK-ORDER] Order Number:', orderNumber);
    console.log('📞 [TRACK-ORDER] Phone:', phone);

    if (!orderNumber || !phone) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب ورقم الهاتف مطلوبان'
      });
    }

    const prisma = await getPrisma();

    // البحث في GuestOrder أولاً
    let order = await prisma.guestOrder.findFirst({
      where: {
        orderNumber: orderNumber,
        guestPhone: phone,
        companyId: company.id
      }
    });

    console.log('🔍 [TRACK-ORDER] GuestOrder found:', !!order);

    if (order) {
      order.items = coerceCartItemsToArray(order.items).map(buildTrackedOrderItem);
    }

    // دمج بيانات الطلب الأساسي (Order) مع GuestOrder:
    // الـ GuestOrder لقطة وقت الإنشاء وبتفضل متجمدة، بينما مكافآت الولاء
    // (النقاط والكاش باك) والحالة الحقيقية بتتكتب على الـ Order الأساسي بعد التسليم.
    // ملاحظة: أوردرات الستور بتخزن رقم الطلب في حقل id، فبنبحث بـ id أو orderNumber.
    if (order) {
      try {
        const primaryOrder = await prisma.order.findFirst({
          where: {
            companyId: company.id,
            OR: [
              { id: order.orderNumber },
              { orderNumber: order.orderNumber }
            ]
          },
          select: {
            metadata: true,
            status: true,
            total: true,
            subtotal: true,
            shipping: true,
            discount: true,
            turboTrackingNumber: true,
            turboShipmentStatus: true,
            turboShipmentId: true,
            turboLabelUrl: true,
            turboCaptainName: true,
            turboCaptainPhone: true,
            turboBranchName: true,
            turboBranchPhone: true,
            turboDelayReason: true,
            turboReturnReason: true
          }
        });
        if (primaryOrder) {
          const guestMeta = (() => {
            try { return typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {}); } catch (e) { return {}; }
          })();
          const primaryMeta = (() => {
            try { return typeof primaryOrder.metadata === 'string' ? JSON.parse(primaryOrder.metadata) : (primaryOrder.metadata || {}); } catch (e) { return {}; }
          })();
          order.metadata = JSON.stringify({ ...guestMeta, ...primaryMeta });
          if (primaryOrder.status) order.status = primaryOrder.status;
          // GuestOrder total/finalTotal/discountAmount/shippingCost تقابل Order total/discount/shipping
          if (primaryOrder.total !== null && primaryOrder.total !== undefined) {
            order.total = primaryOrder.total;
            order.finalTotal = primaryOrder.total;
          }
          if (primaryOrder.discount !== null && primaryOrder.discount !== undefined) order.discountAmount = primaryOrder.discount;
          if (primaryOrder.shipping !== null && primaryOrder.shipping !== undefined) order.shippingCost = primaryOrder.shipping;
          if (primaryOrder.subtotal !== null && primaryOrder.subtotal !== undefined) order.subtotal = primaryOrder.subtotal;

          // Merge Turbo tracking fields if present on primaryOrder
          if (primaryOrder.turboTrackingNumber && !order.turboTrackingNumber) {
            order.turboTrackingNumber = primaryOrder.turboTrackingNumber;
          }
          if (primaryOrder.turboShipmentStatus && !order.turboShipmentStatus) {
            order.turboShipmentStatus = primaryOrder.turboShipmentStatus;
          }
          if (primaryOrder.turboShipmentId && !order.turboShipmentId) {
            order.turboShipmentId = primaryOrder.turboShipmentId;
          }
          if (primaryOrder.turboLabelUrl && !order.turboLabelUrl) {
            order.turboLabelUrl = primaryOrder.turboLabelUrl;
          }
          if (primaryOrder.turboCaptainName && !order.turboCaptainName) {
            order.turboCaptainName = primaryOrder.turboCaptainName;
          }
          if (primaryOrder.turboCaptainPhone && !order.turboCaptainPhone) {
            order.turboCaptainPhone = primaryOrder.turboCaptainPhone;
          }
          if (primaryOrder.turboBranchName && !order.turboBranchName) {
            order.turboBranchName = primaryOrder.turboBranchName;
          }
          if (primaryOrder.turboBranchPhone && !order.turboBranchPhone) {
            order.turboBranchPhone = primaryOrder.turboBranchPhone;
          }
          if (primaryOrder.turboDelayReason && !order.turboDelayReason) {
            order.turboDelayReason = primaryOrder.turboDelayReason;
          }
          if (primaryOrder.turboReturnReason && !order.turboReturnReason) {
            order.turboReturnReason = primaryOrder.turboReturnReason;
          }
        }
      } catch (mergeError) {
        console.error('⚠️ [TRACK-ORDER] Failed to merge primary order data:', mergeError.message);
      }
    }

    // إذا لم يتم العثور عليه في GuestOrder، ابحث في Order العادي
    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          orderNumber: orderNumber,
          companyId: company.id
        },
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });

      console.log('🔍 [TRACK-ORDER] Regular Order found:', !!order);

      // التحقق من رقم الهاتف للطلب العادي
      if (order && order.customer && order.customer.phone !== phone) {
        console.log('❌ [TRACK-ORDER] Phone mismatch for regular order');
        order = null;
      }

      // تحويل Order العادي لنفس صيغة GuestOrder
      if (order) {
        order = {
          ...order,
          guestName: order.customer?.name || order.customerName,
          guestPhone: order.customer?.phone || order.phone,
          items: order.orderItems?.map(buildTrackedOrderItem) || []
        };
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو رقم الهاتف غير صحيح'
      });
    }

    // إعادة حساب الشحن بناءً على المحافظة إذا لم يكن محسوباً
    let updatedOrder = { ...order };

    // إعادة حساب المجموع الفرعي من المنتجات
    let calculatedSubtotal = 0;
    if (order.items && Array.isArray(order.items)) {
      calculatedSubtotal = order.items.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseInt(item.quantity || 0);
        const itemTotal = itemPrice * itemQuantity;

        console.log('🧮 [ITEM-CALC]', {
          name: item.name,
          price: item.price,
          priceAsNumber: itemPrice,
          quantity: item.quantity,
          quantityAsNumber: itemQuantity,
          itemTotal: itemTotal
        });

        return sum + itemTotal;
      }, 0);

      console.log('🧮 [TRACK-ORDER] Calculated subtotal from items:', calculatedSubtotal);
      console.log('🧮 [TRACK-ORDER] Original total in DB:', order.total);

      // استخدام المجموع المحسوب إذا كان مختلف عن المحفوظ
      if (Math.abs(calculatedSubtotal - (order.total || 0)) > 1) {
        console.log('⚠️ [TRACK-ORDER] Total mismatch, using calculated subtotal');
        updatedOrder.total = calculatedSubtotal;
      }
    }

    if (order.shippingCost === 0 && order.shippingAddress) {
      try {
        let governorate = '';

        // استخراج المحافظة من العنوان
        if (typeof order.shippingAddress === 'string') {
          // إذا كان العنوان string، حاول استخراج المحافظة
          governorate = order.shippingAddress.split(',')[0]?.trim();
        } else if (order.shippingAddress && typeof order.shippingAddress === 'object') {
          governorate = order.shippingAddress.governorate;
        }

        console.log('🏛️ [TRACK-ORDER] Governorate for shipping:', governorate);

        if (governorate) {
          // البحث عن تكلفة الشحن للمحافظة
          const shippingZone = await prisma.shippingZone.findFirst({
            where: {
              companyId: company.id,
              governorate: governorate
            }
          });

          if (shippingZone) {
            console.log('📦 [TRACK-ORDER] Shipping cost found:', shippingZone.cost);
            updatedOrder.shippingCost = parseFloat(shippingZone.cost || 0);
          }
        }
      } catch (shippingError) {
        console.error('❌ [TRACK-ORDER] Error calculating shipping:', shippingError);
      }
    }

    // إعادة حساب الإجمالي النهائي في جميع الحالات
    const subtotal = parseFloat(updatedOrder.total || 0);
    const shipping = parseFloat(updatedOrder.shippingCost || 0);
    const discount = parseFloat(updatedOrder.discountAmount || 0);

    updatedOrder.finalTotal = subtotal + shipping - discount;

    console.log('🧮 [TRACK-ORDER] Final calculation:', {
      subtotal: updatedOrder.total,
      shipping: updatedOrder.shippingCost,
      discount: updatedOrder.discountAmount,
      finalTotal: updatedOrder.finalTotal
    });

    console.log('✅ [TRACK-ORDER] Order details:', {
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      total: updatedOrder.total,
      shippingCost: updatedOrder.shippingCost,
      discountAmount: updatedOrder.discountAmount,
      finalTotal: updatedOrder.finalTotal,
      items: updatedOrder.items?.length || 0,
      shippingAddress: typeof updatedOrder.shippingAddress === 'object'
        ? updatedOrder.shippingAddress?.governorate
        : 'string format'
    });

    // استخراج خصم عروض المتجر من metadata
    let storePromotionDiscount = 0;
    let storePromotionLabel = '';
    if (updatedOrder.metadata) {
      try {
        const meta = typeof updatedOrder.metadata === 'string' ? JSON.parse(updatedOrder.metadata) : updatedOrder.metadata;
        if (meta?.storePromotion) {
          storePromotionDiscount = Number(meta.storePromotion.discount) || 0;
          storePromotionLabel = meta.storePromotion.label || '';
        }
      } catch (e) { /* ignore */ }
    }
    updatedOrder.storePromotionDiscount = storePromotionDiscount;
    updatedOrder.storePromotionLabel = storePromotionLabel;

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('❌ [TRACK-ORDER] Error tracking order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔐 تطبيع رقم الهاتف للمطابقة (تحويل الأرقام العربية-الهندية وإزالة الرموز)
const normalizeGuestPhone = (value) => {
  if (!value) return '';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/\D/g, '');
};

// مطابقة متسامحة: تطابق تام أو تطابق لواحقة (10 أرقام فأكثر) عشان صيغ +20/01
// — العتبة 10 عشان ما تفتحش باب تخمين لواحقة قصيرة
const phoneMatchesGuest = (provided, stored) => {
  const a = normalizeGuestPhone(provided);
  const b = normalizeGuestPhone(stored);
  if (!a || !b) return false;
  if (a === b) return true;
  const minLen = Math.min(a.length, b.length);
  return minLen >= 10 && (a.endsWith(b) || b.endsWith(a));
};

const extractGuestPhone = (req) => req.query.phone || req.body?.phone || '';

// Track order by order number (legacy route)
router.get('/:orderNumber/track', async (req, res) => {
  try {
    const { company } = req;
    const { orderNumber } = req.params;
    const phone = extractGuestPhone(req);
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب ورقم الهاتف مطلوبان'
      });
    }

    const prisma = await getPrisma();
    const order = await prisma.guestOrder.findFirst({
      where: {
        orderNumber,
        companyId: company.id
      }
    });

    // 🔐 بدون مطابقة هاتف الطلب بيرجع 404 (نفس سلوك /track الرسمي) — مفيش كشف وجود
    if (order && !phoneMatchesGuest(phone, order.guestPhone)) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    if (order) {
      try {
        const primaryOrder = await prisma.order.findFirst({
          where: {
            companyId: company.id,
            OR: [
              { id: orderNumber },
              { orderNumber }
            ]
          },
          select: { metadata: true, status: true, total: true, subtotal: true, shipping: true, discount: true }
        });
        if (primaryOrder) {
          const guestMeta = (() => { try { return typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {}); } catch (e) { return {}; } })();
          const primaryMeta = (() => { try { return typeof primaryOrder.metadata === 'string' ? JSON.parse(primaryOrder.metadata) : (primaryOrder.metadata || {}); } catch (e) { return {}; } })();
          order.metadata = JSON.stringify({ ...guestMeta, ...primaryMeta });
          if (primaryOrder.status) order.status = primaryOrder.status;
          if (primaryOrder.total !== null && primaryOrder.total !== undefined) {
            order.total = primaryOrder.total;
            order.finalTotal = primaryOrder.total;
          }
          if (primaryOrder.discount !== null && primaryOrder.discount !== undefined) order.discountAmount = primaryOrder.discount;
          if (primaryOrder.shipping !== null && primaryOrder.shipping !== undefined) order.shippingCost = primaryOrder.shipping;
          if (primaryOrder.subtotal !== null && primaryOrder.subtotal !== undefined) order.subtotal = primaryOrder.subtotal;
        }
      } catch (mergeError) {
        console.error('⚠️ [TRACK-ORDER-LEGACY] Failed to merge primary order data:', mergeError.message);
      }
    }

    if (!order) {
      const primaryOrder = await prisma.order.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { id: orderNumber },
            { orderNumber }
          ]
        },
        include: {
          customer: true,
          orderItems: {
            include: { product: true }
          }
        }
      });

      if (primaryOrder && phoneMatchesGuest(phone, primaryOrder.customerPhone || primaryOrder.customer?.phone)) {
        order = {
          ...primaryOrder,
          guestName: primaryOrder.customer?.name || primaryOrder.customerName,
          guestPhone: primaryOrder.customerPhone || primaryOrder.customer?.phone,
          guestEmail: primaryOrder.customerEmail || primaryOrder.customer?.email,
          items: primaryOrder.orderItems?.map(buildTrackedOrderItem) || [],
          finalTotal: primaryOrder.total,
          shippingCost: primaryOrder.shipping,
          discountAmount: primaryOrder.discount
        };
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search orders by email
router.get('/search', async (req, res) => {
  try {
    const { company } = req;
    const { email, phone } = req.query;

    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني ورقم الهاتف مطلوبان'
      });
    }

    const prisma = await getPrisma();
    const [guestOrders, regularOrders] = await Promise.all([
      prisma.guestOrder.findMany({
        where: {
          guestEmail: email,
          companyId: company.id
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.order.findMany({
        where: {
          companyId: company.id,
          customerEmail: email
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // 🔐 مطابقة الهاتف قبل إرجاع أي بيانات
    const matchedGuests = guestOrders.filter((order) => phoneMatchesGuest(phone, order.guestPhone));
    const matchedRegular = regularOrders.filter((order) => phoneMatchesGuest(phone, order.customerPhone)).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      guestName: order.customerName,
      guestPhone: order.customerPhone,
      guestEmail: order.customerEmail,
      total: order.subtotal,
      finalTotal: order.total,
      shippingCost: order.shipping,
      discountAmount: order.discount,
      status: order.status,
      createdAt: order.createdAt
    }));

    const seenOrderNumbers = new Set(matchedGuests.map(g => String(g.orderNumber).trim().toLowerCase()));
    const finalMatched = [...matchedGuests];
    for (const reg of matchedRegular) {
      const key = String(reg.orderNumber).trim().toLowerCase();
      if (!seenOrderNumbers.has(key)) {
        finalMatched.push(reg);
        seenOrderNumbers.add(key);
      }
    }

    res.json({ success: true, data: finalMatched });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order details by ID or order number
router.get('/:id', async (req, res) => {
  console.log('🎯 [GET-ORDER-ROUTE] Route handler called!', req.params);
  try {
    const { company } = req;
    const { id } = req.params;

    // 🔐 الهاتف إلزامي — نفس حارس /track الرسمي (رقم الطلب لوحده مش إثبات ملكية)
    const phone = extractGuestPhone(req);
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب ورقم الهاتف مطلوبان'
      });
    }

    console.log('📦 [GET-ORDER] Fetching order:', { id, companyId: company?.id });

    const prisma = await getPrisma();

    // Try to find by ID first, then by order number
    let order = await prisma.guestOrder.findFirst({
      where: {
        id,
        companyId: company.id
      }
    });

    console.log('🔍 [GET-ORDER] Search by ID result:', order ? 'Found' : 'Not found');

    // If not found by ID, try by order number
    if (!order) {
      console.log('🔍 [GET-ORDER] Trying by order number...');
      order = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: id,
          companyId: company.id
        }
      });
      console.log('🔍 [GET-ORDER] Search by orderNumber result:', order ? 'Found' : 'Not found');
    }

    // 🔐 هاتف غلط = 404 (نفس رد عدم الوجود — مفيش كشف وجود)
    if (order && !phoneMatchesGuest(phone, order.guestPhone)) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // If not found in GuestOrder, try by ID or orderNumber in Order table
    if (!order) {
      console.log('🔍 [GET-ORDER] Trying in primary Order table...');
      const primaryOrder = await prisma.order.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { id },
            { orderNumber: id }
          ]
        },
        include: {
          customer: true,
          orderItems: {
            include: { product: true }
          }
        }
      });

      if (primaryOrder && phoneMatchesGuest(phone, primaryOrder.customerPhone || primaryOrder.customer?.phone)) {
        order = {
          ...primaryOrder,
          guestName: primaryOrder.customer?.name || primaryOrder.customerName,
          guestPhone: primaryOrder.customerPhone || primaryOrder.customer?.phone,
          guestEmail: primaryOrder.customerEmail || primaryOrder.customer?.email,
          items: JSON.stringify(primaryOrder.orderItems?.map(buildTrackedOrderItem) || []),
          finalTotal: primaryOrder.total,
          shippingCost: primaryOrder.shipping,
          discountAmount: primaryOrder.discount
        };
      }
    }

    if (!order) {
      console.log('❌ [GET-ORDER] Order not found');
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    console.log('✅ [GET-ORDER] Order found:', order.orderNumber);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ [GET-ORDER] Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ⚡ POST /api/v1/public/orders/:id/accept-offer
 * Accept post-purchase special offer and append item to existing order atomically
 */
router.post('/:id/accept-offer', async (req, res) => {
  try {
    const { company } = req;
    const { id } = req.params;
    const {
      productId,
      variantId,
      quantity = 1,
      price,
      name,
      imageUrl,
      originalPrice,
      color,
      size,
      productColor,
      productSize,
      attributes
    } = req.body || {};

    console.log('🎁 [ACCEPT-POST-PURCHASE-OFFER] Request for order:', id, 'company:', company?.id);

    if (!company?.id) {
      return res.status(400).json({ success: false, message: 'Storefront company context required' });
    }

    const prisma = await getPrisma();

    // Find order by id or orderNumber
    let order = await prisma.guestOrder.findFirst({
      where: {
        id,
        companyId: company.id
      }
    });

    if (!order) {
      order = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: id,
          companyId: company.id
        }
      });
    }

    let isPrimaryOnly = false;
    let primaryTargetOrder = null;
    if (!order) {
      primaryTargetOrder = await prisma.order.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { id },
            { orderNumber: id }
          ]
        },
        include: {
          customer: true
        }
      });
      if (primaryTargetOrder) {
        isPrimaryOnly = true;
        order = {
          id: primaryTargetOrder.id,
          orderNumber: primaryTargetOrder.orderNumber,
          companyId: primaryTargetOrder.companyId,
          guestName: primaryTargetOrder.customer?.name || primaryTargetOrder.customerName,
          guestPhone: primaryTargetOrder.customerPhone || primaryTargetOrder.customer?.phone,
          total: primaryTargetOrder.total,
          finalTotal: primaryTargetOrder.total,
          shippingCost: primaryTargetOrder.shipping,
          discountAmount: primaryTargetOrder.discount,
          items: '[]',
          metadata: primaryTargetOrder.metadata,
          createdAt: primaryTargetOrder.createdAt
        };
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    // ⏰ حماية زمنية: ارفض القبول لو order.createdAt أقدم من 6 ساعات
    const orderCreatedAt = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    const sixHoursMs = 6 * 60 * 60 * 1000;
    if (orderCreatedAt && (Date.now() - orderCreatedAt > sixHoursMs)) {
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية العرض لهذا الطلب'
      });
    }

    let metadata = {};
    try {
      metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
    } catch (_) {
      metadata = {};
    }

    // Guard against duplicate accept
    if (metadata.postPurchaseOfferAccepted) {
      return res.json({
        success: true,
        alreadyAccepted: true,
        message: 'تمت إضافة العرض مسبقاً',
        data: order
      });
    }

    let resolvedName = name || 'عرض خاص بعد الطلب';
    let resolvedPrice = Math.max(0, Number(price) || 0);
    let resolvedImage = imageUrl || null;
    let resolvedSku = '';
    let resolvedColor =
      productColor ||
      color ||
      getAttributeValue(attributes, ['color', 'colour', 'اللون', 'Color', 'لون', 'ألوان', 'الوان']) ||
      null;
    let resolvedSize =
      productSize ||
      size ||
      getAttributeValue(attributes, ['size', 'المقاس', 'Size', 'مقاس', 'مقاسات', 'حجم', 'الحجم']) ||
      null;
    let resolvedAttributes = attributes && typeof attributes === 'object' ? { ...attributes } : {};

    if (productId) {
      const dbProduct = await prisma.product.findFirst({
        where: { id: productId, companyId: company.id },
        include: { productVariants: true }
      });
      if (dbProduct) {
        resolvedName = dbProduct.name;
        if (!resolvedImage) {
          const firstImg = dbProduct.mainImage || dbProduct.imageUrl || (Array.isArray(dbProduct.images) && dbProduct.images[0]);
          resolvedImage = typeof firstImg === 'string' ? firstImg : firstImg?.url || null;
        }
        const variantsList = Array.isArray(dbProduct.productVariants) ? dbProduct.productVariants : [];
        if (variantId && variantsList.length > 0) {
          const matchedVariant = variantsList.find(v => v.id === variantId);
          if (matchedVariant) {
            resolvedName = `${dbProduct.name} - ${matchedVariant.name || ''}`;
            resolvedSku = matchedVariant.sku || '';
            if (matchedVariant.price && resolvedPrice === 0) {
              resolvedPrice = Number(matchedVariant.price);
            }
            const vAttrs = resolveVariantAttributes(matchedVariant);
            if (!resolvedColor) resolvedColor = vAttrs.Color || vAttrs.color || vAttrs.اللون || matchedVariant.color || null;
            if (!resolvedSize) resolvedSize = vAttrs.Size || vAttrs.size || vAttrs.المقاس || matchedVariant.size || null;
            if (!resolvedColor && !resolvedSize && matchedVariant.name) {
              if (matchedVariant.type === 'color') resolvedColor = matchedVariant.name;
              else if (matchedVariant.type === 'size') resolvedSize = matchedVariant.name;
              else {
                const parts = matchedVariant.name.split(/\s*[-–|\/]\s*/);
                if (parts.length >= 2) {
                  resolvedColor = parts[0];
                  resolvedSize = parts[1];
                }
              }
            }
            resolvedAttributes = { ...vAttrs, ...resolvedAttributes };
          }
        } else if (resolvedPrice === 0 && dbProduct.price) {
          resolvedPrice = Number(dbProduct.price);
        }
      }
    }

    if (resolvedColor && !resolvedAttributes.Color && !resolvedAttributes.color) {
      resolvedAttributes.Color = resolvedColor;
    }
    if (resolvedSize && !resolvedAttributes.Size && !resolvedAttributes.size) {
      resolvedAttributes.Size = resolvedSize;
    }

    let existingItems = [];
    try {
      existingItems = typeof order.items === 'string'
        ? JSON.parse(order.items)
        : (Array.isArray(order.items) ? order.items : []);
    } catch (_) {
      existingItems = [];
    }

    const offerItemQty = Math.max(1, Number(quantity) || 1);
    const offerItem = {
      productId: productId || null,
      variantId: variantId || null,
      name: resolvedName,
      sku: resolvedSku,
      price: resolvedPrice,
      basePrice: resolvedPrice,
      originalPrice: Math.max(0, Number(originalPrice) || resolvedPrice),
      quantity: offerItemQty,
      imageUrl: resolvedImage,
      productColor: resolvedColor ? String(resolvedColor) : null,
      productSize: resolvedSize ? String(resolvedSize) : null,
      color: resolvedColor ? String(resolvedColor) : null,
      size: resolvedSize ? String(resolvedSize) : null,
      attributes: resolvedAttributes,
      isPostPurchaseOffer: true,
      addedPostPurchase: true
    };

    existingItems.push(offerItem);

    const additionalTotal = Number((resolvedPrice * offerItemQty).toFixed(2));
    const nextTotal = Number((Number(order.total || 0) + additionalTotal).toFixed(2));
    const nextFinalTotal = Number((Number(order.finalTotal || 0) + additionalTotal).toFixed(2));

    metadata.postPurchaseOfferAccepted = true;
    metadata.postPurchaseOffer = {
      productId,
      variantId: variantId || null,
      productName: resolvedName,
      productColor: resolvedColor ? String(resolvedColor) : null,
      productSize: resolvedSize ? String(resolvedSize) : null,
      offerPrice: resolvedPrice,
      quantity: offerItemQty,
      acceptedAt: new Date().toISOString()
    };

    let updatedOrder = null;
    if (!isPrimaryOnly) {
      updatedOrder = await prisma.guestOrder.update({
        where: { id: order.id },
        data: {
          items: JSON.stringify(existingItems),
          total: nextTotal,
          finalTotal: nextFinalTotal,
          metadata: JSON.stringify(metadata)
        }
      });
    } else {
      updatedOrder = {
        ...order,
        items: JSON.stringify(existingItems),
        total: nextTotal,
        finalTotal: nextFinalTotal,
        metadata: JSON.stringify(metadata)
      };
    }

    // Also sync to primary order and create orderItem row if primary order exists
    try {
      const primaryOrder = primaryTargetOrder || await prisma.order.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { id: order.orderNumber },
            { orderNumber: order.orderNumber },
            { id: order.id }
          ]
        }
      });
      if (primaryOrder) {
        const nextOrderTotal = Number((Number(primaryOrder.total || 0) + additionalTotal).toFixed(2));
        const nextOrderSubtotal = Number((Number(primaryOrder.subtotal || 0) + additionalTotal).toFixed(2));
        await prisma.order.update({
          where: { id: primaryOrder.id },
          data: {
            total: nextOrderTotal,
            subtotal: nextOrderSubtotal
          }
        });
        try {
          await prisma.orderItem.create({
            data: {
              orderId: primaryOrder.id,
              productId: productId || null,
              variantId: variantId || null,
              productName: resolvedName,
              productSku: resolvedSku || null,
              productColor: resolvedColor ? String(resolvedColor) : null,
              productSize: resolvedSize ? String(resolvedSize) : null,
              productImage: resolvedImage || null,
              price: resolvedPrice,
              total: Number((resolvedPrice * offerItemQty).toFixed(2)),
              quantity: offerItemQty,
              metadata: JSON.stringify({ isPostPurchaseOffer: true, addedPostPurchase: true, attributes: resolvedAttributes || {} })
            }
          });
        } catch (itemErr) {
          console.warn('⚠️ [POST-PURCHASE-OFFER] orderItem create failed, retrying with detached productId/variantId:', itemErr.message);
          await prisma.orderItem.create({
            data: {
              orderId: primaryOrder.id,
              productId: null,
              variantId: null,
              productName: resolvedName,
              productSku: resolvedSku || null,
              productColor: resolvedColor ? String(resolvedColor) : null,
              productSize: resolvedSize ? String(resolvedSize) : null,
              productImage: resolvedImage || null,
              price: resolvedPrice,
              total: Number((resolvedPrice * offerItemQty).toFixed(2)),
              quantity: offerItemQty,
              metadata: JSON.stringify({ isPostPurchaseOffer: true, addedPostPurchase: true, attributes: resolvedAttributes || {} })
            }
          });
        }
      } else {
        console.warn('⚠️ [POST-PURCHASE-OFFER] Primary order not found for sync:', order.orderNumber);
      }
    } catch (orderSyncErr) {
      console.error('❌ [POST-PURCHASE-OFFER] Sync to primary order error:', orderSyncErr);
    }

    // Decrement stock if tracking enabled
    try {
      if (variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
        if (variant && variant.trackInventory !== false) {
          await prisma.productVariant.update({
            where: { id: variantId },
            data: { stock: { decrement: offerItemQty } }
          });
        }
      }
      if (productId) {
        const prod = await prisma.product.findUnique({ where: { id: productId } });
        if (prod && prod.trackInventory !== false) {
          await prisma.product.update({
            where: { id: productId },
            data: { stock: { decrement: offerItemQty } }
          });
        }
      }
    } catch (stockErr) {
      console.warn('⚠️ [POST-PURCHASE-OFFER] Stock decrement warning:', stockErr.message);
    }

    // Try socket notification for merchant realtime dashboard
    try {
      socketService.emitToCompany(company.id, 'order:updated', updatedOrder);
    } catch (_) {}

    console.log('🎉 [ACCEPT-POST-PURCHASE-OFFER] Success for order:', order.orderNumber, 'new total:', nextFinalTotal);

    return res.json({
      success: true,
      data: updatedOrder,
      message: 'تمت إضافة العرض الخاص بنجاح إلى طلبك'
    });
  } catch (error) {
    console.error('❌ [ACCEPT-POST-PURCHASE-OFFER] Error accepting offer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update guest order status
router.patch('/orders/:orderNumber/status', async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden'
  });
});

// Update guest order payment status
router.patch('/orders/:orderNumber/payment-status', async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden'
  });
});

module.exports = router;

























