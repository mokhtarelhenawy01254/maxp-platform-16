const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
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
const {
  getConversionSuiteFreeShippingPromotion,
} = require('../utils/storefrontFreeShipping');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone } = require('../utils/customerIdentity');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const { splitCustomerName } = require('../utils/customerName');
const {
  applyVolumeDiscount,
  getVolumeDiscountsFromMetadata,
} = require('../utils/volumeDiscountUtils');
const { calculateDiscount: calcStorePromotionDiscount } = require('../utils/storePromotionUtils');
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
    'cod': 'CASH'
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

function normalizeAttributionText(value, maxLength = 320) {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  return normalized.slice(0, maxLength);
}

function sanitizeAttributionRawParams(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value)
    .slice(0, 24)
    .map(([key, rawValue]) => {
      const normalizedKey = normalizeAttributionText(key, 80)?.toLowerCase();
      const normalizedValue = normalizeAttributionText(rawValue, 320);
      return normalizedKey && normalizedValue ? [normalizedKey, normalizedValue] : null;
    })
    .filter(Boolean);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function sanitizeLandingPageAttribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const sanitized = {
    source: normalizeAttributionText(value.source, 120),
    landingPageId: normalizeAttributionText(value.landingPageId, 160),
    landingPageSlug: normalizeAttributionText(value.landingPageSlug, 160),
    generationMode: normalizeAttributionText(value.generationMode, 80),
    productId: normalizeAttributionText(value.productId, 160),
  };

  return Object.entries(sanitized).reduce((acc, [key, rawValue]) => {
    if (rawValue !== null && rawValue !== undefined) {
      acc[key] = rawValue;
    }
    return acc;
  }, {});
}

function inferAttributionPlatform(source, referrer, clickIds = {}) {
  const haystack = [
    source,
    referrer,
    clickIds.fbclid ? 'facebook' : '',
    clickIds.fbc ? 'facebook' : '',
    clickIds.fbp ? 'facebook' : '',
    clickIds.gclid ? 'google' : '',
    clickIds.ttclid ? 'tiktok' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('instagram')) return 'instagram';
  if (
    haystack.includes('facebook') ||
    haystack.includes('meta') ||
    haystack.includes('l.facebook.com')
  ) {
    return 'facebook';
  }
  if (haystack.includes('google')) return 'google';
  if (haystack.includes('tiktok')) return 'tiktok';
  if (haystack.includes('youtube')) return 'youtube';

  return null;
}

function sanitizeOrderAttribution(rawAttribution, fallbacks = {}) {
  const attribution =
    typeof rawAttribution === 'string'
      ? safeJsonParse(rawAttribution, null)
      : rawAttribution;

  if (!attribution || typeof attribution !== 'object' || Array.isArray(attribution)) {
    return null;
  }

  const rawParams = sanitizeAttributionRawParams(attribution.rawParams);
  const landingPage =
    sanitizeLandingPageAttribution(attribution.landingPage) ||
    sanitizeLandingPageAttribution({
      source: attribution.landingPageSource,
      landingPageId: attribution.landingPageId,
      landingPageSlug: attribution.landingPageSlug,
      generationMode: attribution.generationMode,
      productId: attribution.productId,
    });
  const referrer = normalizeAttributionText(attribution.referrer, 1024);
  const clickIds = {
    fbclid: normalizeAttributionText(attribution.fbclid, 255),
    gclid: normalizeAttributionText(attribution.gclid, 255),
    ttclid: normalizeAttributionText(attribution.ttclid, 255),
    fbc: normalizeAttributionText(attribution.fbc || fallbacks.fbc, 255),
    fbp: normalizeAttributionText(attribution.fbp || fallbacks.fbp, 255),
  };
  const platform =
    normalizeAttributionText(attribution.platform, 80)?.toLowerCase() ||
    inferAttributionPlatform(attribution.source, referrer, clickIds);

  let source = normalizeAttributionText(attribution.source, 120)?.toLowerCase();
  if (!source) {
    if (platform) {
      source = platform;
    } else if (referrer) {
      try {
        source = new URL(referrer).hostname.replace(/^www\./i, '').slice(0, 120);
      } catch (_) {
        source = null;
      }
    }
  }

  if (!source) {
    source = 'direct';
  }

  let medium = normalizeAttributionText(attribution.medium, 120)?.toLowerCase();
  if (!medium) {
    if (source === 'direct') {
      medium = 'none';
    } else if (clickIds.gclid) {
      medium = 'cpc';
    } else if (platform && ['facebook', 'instagram', 'tiktok'].includes(platform)) {
      medium = 'paid_social';
    } else if (referrer) {
      medium = 'referral';
    }
  }

  const sanitized = {
    platform,
    source,
    medium,
    campaignName: normalizeAttributionText(
      attribution.campaignName || attribution.campaign || attribution.utm_campaign,
      160,
    ),
    campaignId: normalizeAttributionText(
      attribution.campaignId ||
        attribution.campaign_id ||
        attribution.utm_id,
      160,
    ),
    adSetId: normalizeAttributionText(
      attribution.adSetId ||
        attribution.adset_id ||
        attribution.ad_set_id,
      160,
    ),
    adId: normalizeAttributionText(
      attribution.adId ||
        attribution.ad_id,
      160,
    ),
    content: normalizeAttributionText(
      attribution.content || attribution.utm_content,
      160,
    ),
    term: normalizeAttributionText(
      attribution.term || attribution.utm_term,
      160,
    ),
    landingPath: normalizeAttributionText(attribution.landingPath, 1024),
    referrer,
    fbclid: clickIds.fbclid,
    gclid: clickIds.gclid,
    ttclid: clickIds.ttclid,
    fbc: clickIds.fbc,
    fbp: clickIds.fbp,
    capturedAt:
      normalizeAttributionText(attribution.capturedAt, 80) || new Date().toISOString(),
    rawParams,
    landingPage:
      landingPage && Object.keys(landingPage).length > 0 ? landingPage : null,
  };

  return Object.entries(sanitized).reduce((acc, [key, value]) => {
    if (
      value !== null &&
      value !== undefined &&
      (!(typeof value === 'object' && !Array.isArray(value)) || Object.keys(value).length > 0)
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
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
    productColor: (item?.productColor || getAttributeValue(attributes, ['color', 'colour', 'اللون'])) ? String(item?.productColor || getAttributeValue(attributes, ['color', 'colour', 'اللون'])) : null,
    productSize: (item?.productSize || getAttributeValue(attributes, ['size', 'المقاس'])) != null ? String(item?.productSize || getAttributeValue(attributes, ['size', 'المقاس'])) : null,
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
    const cartId = req.headers['x-cart-id'] || req.cookies?.cart_id;

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
      redeemPoints
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
    const resolvedFbc = fbc || fbcFromHeader || fbcFromCookie || null;
    const resolvedFbp = fbp || fbpFromHeader || fbpFromCookie || null;
    const sanitizedAttribution = sanitizeOrderAttribution(attribution, {
      fbc: resolvedFbc,
      fbp: resolvedFbp,
    });

    if (!guestPhone || !guestName || !shippingAddress) {
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
        return res.status(400).json({
          success: false,
          error: 'السلة فارغة'
        });
      }

      cartItems = coercedItems;
      cartTotal = 0;
      shouldDeleteCart = true;
    } else {
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
      return res.status(400).json({
        success: false,
        error: 'بيانات السلة غير صحيحة: يوجد منتج بدون معرف (productId)'
      });
    }

    const invalidQuantityItem = cartItems.find((item) => !item?.quantity || item.quantity < 1);
    if (invalidQuantityItem) {
      console.log('❌ [CREATE-ORDER] Invalid cart item (invalid quantity):', invalidQuantityItem);
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
        return res.status(400).json({
          success: false,
          error: `المنتج غير موجود: ${item.name || 'Unknown'}`
        });
      }

      if (product.isDropshipped) {
        const availability = await dropshippingService.checkMerchantAvailability(
          product.id,
          item.quantity,
        );

        if (!availability.available) {
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

      // Check variant stock if variantId is provided
      let selectedVariant = null;

      if (item.variantId) {
        const variant = product.productVariants?.find(v => v.id === item.variantId);
        console.log('🔍 [CREATE-ORDER] Variant found:', variant ? 'Yes' : 'No', 'Stock:', variant?.stock, 'TrackInventory:', variant?.trackInventory);

        if (!variant) {
          console.log('❌ [CREATE-ORDER] Variant not found:', item.variantId);
          return res.status(400).json({
            success: false,
            error: `الاختيار غير موجود للمنتج: ${item.name || product.name}`
          });
        }

        if (variant.trackInventory !== false && variant.stock < item.quantity && !req.headers['x-admin-convert']) {
          console.log('❌ [CREATE-ORDER] Insufficient variant stock:', variant.stock, 'requested:', item.quantity);
          return res.status(400).json({
            success: false,
            error: `المخزون غير كافي للاختيار: ${variant.name}. المتوفر: ${variant.stock}`
          });
        }

        selectedVariant = variant;

        // ✅ ENRICH ITEM with Variant Details (Color, Size, Metadata)
        // This ensures the saved JSON contains all display info
        item.variantName = variant.name;
        item.metadata = variant.metadata; // Save full metadata

        let color =
          getAttributeValue(item.attributes, ['اللون', 'color']) ||
          variant.color;
        let size =
          getAttributeValue(item.attributes, ['المقاس', 'size']) ||
          variant.size;

        // 1. Try metadata
        if (variant.metadata) {
          try {
            const meta = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
            if (!color && meta.attributeValues) {
              color = meta.attributeValues['اللون'] || meta.attributeValues['color'] || meta.attributeValues['Color'];
            }
            if (!size && meta.attributeValues) {
              size = meta.attributeValues['المقاس'] || meta.attributeValues['size'] || meta.attributeValues['Size'];
            }
            if (!color) color = meta.color;
            if (!size) size = meta.size;
          } catch (e) { }
        }

        // 2. Try name parsing (Robust)
        if (variant.name && (!color || !size)) {
          const name = variant.name;
          // If explicit type is color and no separator
          if (variant.type === 'color' && !name.includes('-') && !name.includes('|')) {
            if (!color) color = name.trim();
          } else {
            // Handle separators
            const parts = name.split(/\s*[-–|]\s*/).filter(p => p.trim());
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
        item.image = image; // ✅ Save image for frontend
        item.productImage = image; // ✅ Duplicate for safety
        item.variant = {
          id: variant.id,
          name: variant.name,
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
        if (product.trackInventory !== false && product.stock < item.quantity && !req.headers['x-admin-convert']) {
          console.log('❌ [CREATE-ORDER] Insufficient stock:', product.stock, 'requested:', item.quantity);
          return res.status(400).json({
            success: false,
            error: `المخزون غير كافي للمنتج: ${item.name || product.name}. المتوفر: ${product.stock}`
          });
        }
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
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          companyId: company.id,
          isActive: true,
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: new Date() } }
          ]
        }
      });

      if (coupon) {
        if (coupon.type === 'PERCENTAGE') {
          discountAmount = (cartTotal * coupon.value) / 100;
        } else {
          discountAmount = coupon.value;
        }
      }
    }

    // Store-wide promotion discount
    let promoDiscount = 0;
    let promoLabel = '';
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
        const autoActive = await autoDiscountService.isAutoDiscountActive(company.id);

        if (autoActive) {
          // نظام "الخصم التلقائي": نطبق كوبون 10% على الأوردر الجاي (لو موجود نشط)
          const voucherRes = await autoDiscountService.applyVoucherDiscount({
            companyId: company.id,
            customerId: loyaltyCustomer.id,
            cartTotal
          });
          if (voucherRes.discount > 0 && voucherRes.voucher) {
            loyaltyDiscount = voucherRes.discount;
            discountAmount += loyaltyDiscount;
            autoDiscountVoucherId = voucherRes.voucher.id;
            await autoDiscountService.markVoucherUsed(voucherRes.voucher.id);
          }
        } else {
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
            loyaltyDiscount = (Number(cartTotal) || 0) * (lp / 100);
            discountAmount += loyaltyDiscount;
          }
        }
      }
    } catch (loyaltyError) {
      console.error('⚠️ [LOYALTY] Failed to apply rewards at checkout:', loyaltyError?.message);
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
      duplicateSettings &&
      (guestPhone || guestEmail) &&
      finalTotal !== undefined &&
      finalTotal !== null
    ) {
      duplicateMatch = await orderService.findDuplicateOrder({
        companyId: company.id,
        customerPhone: guestPhone,
        customerEmail: guestEmail,
        total: finalTotal,
        windowMinutes: duplicateSettings.windowMinutes,
        includeGuest: true
      });
    }

    const isDuplicateOrder = !!duplicateMatch;
    if (isDuplicateOrder && duplicateSettings?.action === 'ignore') {
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
        windowMinutes: duplicateSettings?.windowMinutes || 60,
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
              customer = await prisma.customer.create({
                data: {
                  ...splitCustomerName(guestName),
                  phone: guestPhone,
                  phoneNormalized: toCanonicalE164(guestPhone),
                  email: guestEmail,
                  companyId: company.id,
                  status: 'ACTIVE'
                }
              });
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
          if (autoSettings.loyaltySystem === 'AUTO_DISCOUNT' && autoSettings.redeemPointsEnabled !== false) {
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

      if (sanitizedAttribution) {
        orderMetadata.attribution = sanitizedAttribution;
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
                  orderId: newOrder?.id || null,
                  orderNumber: newOrder?.orderNumber || null,
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

      if (storefrontSettings &&
        storefrontSettings.facebookConvApiEnabled &&
        storefrontSettings.facebookPixelId &&
        storefrontSettings.facebookConvApiToken &&
        storefrontSettings.capiTrackPurchase !== false) {

        const FacebookConversionsService = require('../services/facebookConversionsService');
        const fbService = new FacebookConversionsService(
          storefrontSettings.facebookPixelId,
          storefrontSettings.facebookConvApiToken,
          storefrontSettings.facebookConvApiTestCode
        );

        // Use event ID from frontend Pixel for deduplication, or generate new one
        // This ensures the same event is not counted twice (Pixel + CAPI)
        const eventId = pixelEventId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🔄 [Facebook CAPI] Using event ID for deduplication:', eventId);

        // Extract user data from request
        const userData = {
          email: guestEmail,
          phone: guestPhone,
          firstName: guestName?.split(' ')[0] || null,
          lastName: guestName?.split(' ').slice(1).join(' ') || null,
          city: shippingAddress?.city || shippingAddress?.governorate || null,
          country: 'eg',
          zip: shippingAddress?.zipCode || null,
          ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
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
    } catch (capiError) {
      // Don't fail the order creation if CAPI fails
      console.error('❌ [Facebook CAPI] Error tracking Purchase event:', capiError);
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

        customer = await prisma.customer.create({
          data: {
            firstName: firstName,
            lastName: lastName || null,
            phone: order.guestPhone,
            phoneNormalized: toCanonicalE164(order.guestPhone),
            email: order.guestEmail || null,
            companyId: company.id,
            status: 'ACTIVE',
            metadata: JSON.stringify({ source: 'guest_order', guestOrderId: order.id })
          }
        });
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
          include: { merchantProducts: true }
        });
        const merchantProduct = product?.merchantProducts?.[0];
        const productColor =
          item.productColor ||
          getAttributeValue(item.attributes, ['color', 'colour', 'اللون']) ||
          null;
        const productSize =
          item.productSize ||
          getAttributeValue(item.attributes, ['size', 'المقاس']) ||
          null;
        const productImage = item.productImage || item.image || null;

        return {
          productName: item.name || item.productName || 'منتج',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0),
          total: parseFloat((item.price || 0) * (item.quantity || 1)),
          productSku: item.productSku || item.sku || null,
          productColor,
          productSize,
          productId: item.productId || null,
          variantId: item.variantId || null,
          productImage,
          merchantPrice: merchantProduct ? Number(merchantProduct.merchantPrice) : null,
          basePrice: product ? Number(product.basePrice || product.price) : null,
          metadata: buildOrderItemMetadata(item, productImage),
        };
      }));

      // Check for affiliate referral from guestOrder metadata
      let affiliateReferralId = null;
      let affiliateId = null;
      let orderSource = 'REGULAR';
      let duplicateMetadata = null;
      let attributionMetadata = null;
      let freeShippingMetadata = null;

      if (order.metadata) {
        try {
          const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
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
          if (metadata.freeShipping) {
            freeShippingMetadata = metadata.freeShipping;
          }
        } catch (e) {
          // Ignore metadata parsing errors
        }
      }

      const regularOrderMetadata = {};
      if (duplicateMetadata) {
        regularOrderMetadata.duplicate = duplicateMetadata;
      }
      if (attributionMetadata) {
        regularOrderMetadata.attribution = attributionMetadata;
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
      if (order.id && Object.keys(regularOrderMetadata).length > 0) {
        regularOrderMetadata.guestOrderId = order.id;
      }

      console.log('🔍 [ORDER-CREATE] About to create Order with data:', {
        orderNumber: order.orderNumber,
        customerId: customer.id,
        customerName: order.guestName,
        customerPhone: order.guestPhone
      });

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
          governorate: shippingAddress?.governorate || shippingAddress?.state || shippingAddress?.region || '',
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
          isViewed: false,
          affiliateReferralId,
          affiliateId,
          orderSource,
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

      if (!isDuplicateOrder) {
        // Update referral to mark as converted
        if (affiliateReferralId) {
          try {
            await prisma.affiliateReferral.update({
              where: { id: affiliateReferralId },
              data: {
                converted: true,
                convertedAt: new Date(),
                orderId: createdOrder.id
              }
            });
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

          // تصدير Order إلى WooCommerce
          wooExportService.exportOrderAsync(createdOrder.id);
          console.log('✅ [GUEST-ORDER] Order created and queued for WooCommerce export:', createdOrder.orderNumber);

          // 🚀 دفع الطلب للموردين إذا كان يحتوي على منتجات مستوردة
          internalSyncService.pushOrderToProvider(createdOrder.id, company.id).catch(err => {
            console.error(`❌ [GUEST-ORDER] Failed to push order ${createdOrder.id} to provider:`, err.message);
          });
        } else {
          console.warn('⚠️ [GUEST-ORDER] Skipping external sync because dropshipping routing failed');
        }
      } else {
        console.log('⚠️ [GUEST-ORDER] Duplicate order detected, skipping external sync.');
      }
    } catch (wooError) {
      // لا نوقف العملية إذا فشل التصدير
      console.log('⚠️ [GUEST-ORDER] WooCommerce auto-export skipped:', wooError.message);
      console.error('❌ [ORDER-CREATE] Full error:', wooError);
      // ❌ [PRIMARY-ORDER-FAILURE] تشخيص: نسجّل خطأ إنشاء الـ primary order في
      // metadata الـ guest order حتى نقرأه من API التتبع بدون الحاجة للوجات السيرفر
      try {
        const prismaDiag = await getPrisma();
        const curGuest = await prismaDiag.guestOrder.findFirst({ where: { orderNumber: order?.orderNumber } });
        if (curGuest) {
          const curMeta = (() => { try { return typeof curGuest.metadata === 'string' ? JSON.parse(curGuest.metadata) : (curGuest.metadata || {}); } catch (e) { return {}; } })();
          await prismaDiag.guestOrder.update({
            where: { id: curGuest.id },
            data: { metadata: JSON.stringify({ ...curMeta, primaryOrderError: String(wooError?.message || wooError || 'unknown').slice(0, 3000), primaryOrderStack: String(wooError?.stack || '').slice(0, 1500) }) }
          });
        }
      } catch (diagErr) {
        console.error('❌ [PRIMARY-ORDER-FAILURE] diag write failed:', diagErr.message);
      }
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

    try {
      const trackedTotal = Number(order?.finalTotal || finalTotal || 0);
      const itemsCount = Array.isArray(cartItems) ? cartItems.length : 0;

      await billOrderPpuApps({
        companyId: company.id,
        orderNumber: order?.orderNumber || orderNumber || '',
        orderTotal: trackedTotal,
        itemsCount,
        metadata: { paymentMethod },
        orderId: createdOrder?.id || order?.id || null,
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

      if (couponCode && Number(discountAmount || 0) > 0) {
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
          select: { metadata: true, status: true, total: true, subtotal: true, shipping: true, discount: true }
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

// Track order by order number (legacy route)
router.get('/:orderNumber/track', async (req, res) => {
  try {
    const { company } = req;
    const { orderNumber } = req.params;

    const prisma = await getPrisma();
    const order = await prisma.guestOrder.findFirst({
      where: {
        orderNumber,
        companyId: company.id
      }
    });

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
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني مطلوب'
      });
    }

    const prisma = await getPrisma();
    const orders = await prisma.guestOrder.findMany({
      where: {
        guestEmail: email,
        companyId: company.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({ success: true, data: orders });
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

























