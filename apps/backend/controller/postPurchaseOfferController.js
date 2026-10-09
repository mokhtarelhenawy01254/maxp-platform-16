const { getSharedPrismaClientAsync, safeQuery } = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
const redisCacheService = require('../services/redisCacheService');

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveProductImage = (product) => {
  if (!product) return '';
  if (typeof product.mainImage === 'string' && product.mainImage.trim()) {
    return product.mainImage.trim();
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    return typeof first === 'string' ? first : first?.url || '';
  }
  if (typeof product.images === 'string' && product.images.trim()) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        return typeof first === 'string' ? first : first?.url || '';
      }
    } catch {
      if (product.images.startsWith('http')) {
        return product.images.split(',')[0].trim();
      }
    }
  }
  return '';
};

const DEFAULT_OFFER_CONFIG = {
  enabled: false,
  title: 'انتظر! لدينا عرض خاص وحصري لطلبك الآن',
  subtitle: 'وفر أكثر بإضافة هذا المنتج الحصري إلى شحنتك الحالية قبل تجهيزها',
  badgeText: 'عرض لمرة واحدة فقط',
  productId: '',
  productName: '',
  productImage: '',
  originalPrice: 0,
  discountType: 'percentage', // 'percentage' | 'fixed_price'
  discountValue: 30, // e.g. 30% or 199 EGP
  offerPrice: 0,
  freeShipping: true,
  timerMinutes: 5,
  description: 'احصل على هذا العرض الحصري كإضافة مميزة لطلبك دون أي مصاريف شحن إضافية.',
  features: [
    'يُشحن مجانًا داخل نفس طرد طلبك الحالي',
    'خصم استثنائي لمرة واحدة لن يتكرر بعد إغلاق الصفحة',
    'الدفع عند الاستلام مع باقي محتويات الطلب',
    'ضمان الاستبدال والاسترجاع لمدة 14 يومًا'
  ],
  acceptButtonText: 'نعم! أضف هذا العرض إلى طلبي الآن',
  declineButtonText: 'لا شكراً، اكتفِ بطلبي الأصلي فقط',
  triggerCondition: 'all', // 'all' | 'specific_products'
  triggerProductIds: []
};

const resolveCompanyId = (req) =>
  req.companyId ||
  req.user?.companyId ||
  req.company?.id ||
  req.query?.companyId ||
  null;

const runQuery = async (operation) =>
  tenantContext.run(null, () => safeQuery((prisma) => operation(prisma)));

/**
 * GET /api/v1/post-purchase-offer
 * Get post-purchase offer configuration for the authenticated merchant
 */
const getOffer = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const settings = await runQuery(async (prisma) => {
      return prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: { designTokens: true }
      });
    });

    const designTokens = isRecord(settings?.designTokens) ? settings.designTokens : {};
    const savedOffer = isRecord(designTokens.postPurchaseOffer)
      ? designTokens.postPurchaseOffer
      : {};

    const offer = { ...DEFAULT_OFFER_CONFIG, ...savedOffer };

    // If a product is selected, enrich with current product data
    if (offer.productId) {
      const product = await runQuery(async (prisma) => {
        return prisma.product.findFirst({
          where: { id: offer.productId, companyId },
          select: {
            id: true,
            name: true,
            price: true,
            comparePrice: true,
            mainImage: true,
            images: true,
            isActive: true,
            productVariants: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                price: true,
                comparePrice: true,
                sku: true,
                stock: true,
                metadata: true
              }
            }
          }
        });
      });

      if (product) {
        const variants = (product.productVariants || []).map((v) => {
          let options = {};
          if (v.metadata) {
            try {
              const meta = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : v.metadata;
              if (meta && typeof meta === 'object') {
                options = meta.options || meta.attributes || {};
              }
            } catch (_) {}
          }
          return {
            id: v.id,
            name: v.name,
            price: Number(v.price || product.price || 0),
            comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
            sku: v.sku || '',
            stock: v.stock || 0,
            options
          };
        });
        product.variants = variants;
        const resolvedImg = resolveProductImage(product);
        product.imageUrl = resolvedImg;
        offer.product = product;
        if (!offer.productName) offer.productName = product.name;
        if (!offer.originalPrice) offer.originalPrice = Number(product.price || 0);
        if (!offer.productImage) {
          offer.productImage = resolvedImg;
        }
      }
    }

    return res.json({ success: true, data: offer });
  } catch (error) {
    console.error('❌ [POST-PURCHASE-OFFER] Error fetching offer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/v1/post-purchase-offer
 * Update post-purchase offer configuration
 */
const updateOffer = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const payload = req.body || {};

    const sanitizedOffer = {
      enabled: Boolean(payload.enabled),
      title: typeof payload.title === 'string' ? payload.title.slice(0, 200) : DEFAULT_OFFER_CONFIG.title,
      subtitle: typeof payload.subtitle === 'string' ? payload.subtitle.slice(0, 300) : DEFAULT_OFFER_CONFIG.subtitle,
      badgeText: typeof payload.badgeText === 'string' ? payload.badgeText.slice(0, 100) : DEFAULT_OFFER_CONFIG.badgeText,
      productId: typeof payload.productId === 'string' ? payload.productId.trim() : '',
      productName: typeof payload.productName === 'string' ? payload.productName.slice(0, 200) : '',
      productImage: typeof payload.productImage === 'string' ? payload.productImage.slice(0, 500) : '',
      originalPrice: Math.max(0, Number(payload.originalPrice) || 0),
      discountType: payload.discountType === 'fixed_price' ? 'fixed_price' : 'percentage',
      discountValue: Math.max(0, Number(payload.discountValue) || 0),
      offerPrice: Math.max(0, Number(payload.offerPrice) || 0),
      freeShipping: payload.freeShipping !== false,
      timerMinutes: Math.max(1, Math.min(60, Number(payload.timerMinutes) || 5)),
      description: typeof payload.description === 'string' ? payload.description.slice(0, 1000) : DEFAULT_OFFER_CONFIG.description,
      features: Array.isArray(payload.features)
        ? payload.features.map(f => String(f).trim()).filter(Boolean).slice(0, 8)
        : DEFAULT_OFFER_CONFIG.features,
      acceptButtonText: typeof payload.acceptButtonText === 'string' ? payload.acceptButtonText.slice(0, 150) : DEFAULT_OFFER_CONFIG.acceptButtonText,
      declineButtonText: typeof payload.declineButtonText === 'string' ? payload.declineButtonText.slice(0, 150) : DEFAULT_OFFER_CONFIG.declineButtonText,
      triggerCondition: payload.triggerCondition === 'specific_products' ? 'specific_products' : 'all',
      triggerProductIds: Array.isArray(payload.triggerProductIds)
        ? payload.triggerProductIds.map(id => String(id).trim()).filter(Boolean)
        : []
    };

    // Calculate offerPrice if not set or if percentage is used
    if (sanitizedOffer.discountType === 'percentage' && sanitizedOffer.originalPrice > 0) {
      const discounted = sanitizedOffer.originalPrice * (1 - (sanitizedOffer.discountValue / 100));
      sanitizedOffer.offerPrice = Number(Math.max(0, discounted).toFixed(2));
    } else if (sanitizedOffer.discountType === 'fixed_price') {
      sanitizedOffer.offerPrice = Number(sanitizedOffer.discountValue.toFixed(2));
    }

    await runQuery(async (prisma) => {
      const existing = await prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: { designTokens: true }
      });

      const currentTokens = isRecord(existing?.designTokens) ? existing.designTokens : {};
      const nextTokens = {
        ...currentTokens,
        postPurchaseOffer: sanitizedOffer
      };

      return prisma.storefrontSettings.upsert({
        where: { companyId },
        update: { designTokens: nextTokens },
        create: {
          companyId,
          designTokens: nextTokens
        }
      });
    });

    try {
      await redisCacheService.del(`storefront_settings:${companyId}`);
    } catch (err) {
      console.warn('⚠️ [REDIS] failed to invalidate settings cache:', err);
    }

    return res.json({
      success: true,
      message: 'تم حفظ إعدادات العرض الخاص بنجاح',
      data: sanitizedOffer
    });
  } catch (error) {
    console.error('❌ [POST-PURCHASE-OFFER] Error updating offer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/public/post-purchase-offer
 * Public endpoint to fetch active post-purchase offer on the storefront
 */
const getPublicOffer = async (req, res) => {
  try {
    let companyId = req.company?.id;
    if (!companyId && req.params?.companyId) {
      companyId = req.params.companyId;
    }
    if (!companyId && req.query?.companyId) {
      companyId = req.query.companyId;
    }
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Storefront company context required' });
    }

    const settings = await runQuery(async (prisma) => {
      return prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: { designTokens: true }
      });
    });

    const designTokens = isRecord(settings?.designTokens) ? settings.designTokens : {};
    const offer = isRecord(designTokens.postPurchaseOffer) ? designTokens.postPurchaseOffer : null;

    if (!offer || !offer.enabled || !offer.productId) {
      return res.json({ success: true, data: null });
    }

    // Fetch live product details to guarantee stock and prices are accurate
    const product = await runQuery(async (prisma) => {
      return prisma.product.findFirst({
        where: { id: offer.productId, companyId, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          comparePrice: true,
          mainImage: true,
          images: true,
          productVariants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              price: true,
              comparePrice: true,
              sku: true,
              stock: true,
              metadata: true
            }
          }
        }
      });
    });

    if (!product) {
      return res.json({ success: true, data: null });
    }

    const variants = (product.productVariants || []).map((v) => {
      let options = {};
      if (v.metadata) {
        try {
          const meta = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : v.metadata;
          if (meta && typeof meta === 'object') {
            options = meta.options || meta.attributes || {};
          }
        } catch (_) {}
      }
      return {
        id: v.id,
        name: v.name,
        price: Number(v.price || product.price || 0),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
        sku: v.sku || '',
        stock: v.stock || 0,
        options
      };
    });
    product.variants = variants;

    const originalPrice = Number(product.price || offer.originalPrice || 0);
    let offerPrice = offer.offerPrice;
    if (offer.discountType === 'percentage' && originalPrice > 0) {
      offerPrice = Number((originalPrice * (1 - (offer.discountValue / 100))).toFixed(2));
    } else if (offer.discountType === 'fixed_price') {
      offerPrice = Number(offer.discountValue.toFixed(2));
    }

    const resolvedImg = resolveProductImage(product);
    product.imageUrl = resolvedImg;

    const enrichedOffer = {
      ...offer,
      originalPrice,
      offerPrice,
      productName: product.name,
      productImage: resolvedImg || offer.productImage || '',
      product
    };

    return res.json({ success: true, data: enrichedOffer });
  } catch (error) {
    console.error('❌ [PUBLIC-POST-PURCHASE-OFFER] Error fetching public offer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOffer,
  updateOffer,
  getPublicOffer,
  DEFAULT_OFFER_CONFIG
};
