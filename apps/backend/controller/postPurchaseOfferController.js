const { getSharedPrismaClientAsync, safeQuery } = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
const redisCacheService = require('../services/redisCacheService');
const { formatInTimeZone, fromZonedTime } = require('date-fns-tz');
const { startOfDay, endOfDay, subDays } = require('date-fns');

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

/**
 * GET /api/v1/post-purchase-offer/analytics
 * Real-time analytics, KPIs, AOV lift, and delivery outcomes for post-purchase offers
 */
const getOfferAnalytics = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const { startDate, endDate, period } = req.query;
    const timeZone = 'Africa/Cairo';

    const now = new Date();
    let start;
    let end;

    if (startDate && endDate) {
      start = startOfDay(fromZonedTime(startDate, timeZone));
      end = endOfDay(fromZonedTime(endDate, timeZone));
    } else if (startDate) {
      start = startOfDay(fromZonedTime(startDate, timeZone));
      end = endOfDay(fromZonedTime(now, timeZone));
    } else if (period) {
      const p = String(period).trim();
      if (p === 'today') {
        const todayStr = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
        start = startOfDay(fromZonedTime(todayStr, timeZone));
        end = endOfDay(fromZonedTime(todayStr, timeZone));
      } else if (p === 'yesterday') {
        const yesterdayStr = formatInTimeZone(subDays(now, 1), timeZone, 'yyyy-MM-dd');
        start = startOfDay(fromZonedTime(yesterdayStr, timeZone));
        end = endOfDay(fromZonedTime(yesterdayStr, timeZone));
      } else if (p === 'all') {
        start = new Date('2025-01-01T00:00:00Z');
        end = now;
      } else {
        const numDays = parseInt(p, 10);
        if (!isNaN(numDays) && numDays > 0) {
          start = startOfDay(subDays(now, numDays));
          end = endOfDay(now);
        } else {
          start = subDays(now, 30);
          end = now;
        }
      }
    } else {
      start = subDays(now, 30);
      end = now;
    }

    // 1. Fetch offer configuration to know trigger conditions
    const settings = await runQuery(async (prisma) => {
      return prisma.storefrontSettings.findUnique({
        where: { companyId },
        select: { designTokens: true }
      });
    });

    const designTokens = isRecord(settings?.designTokens) ? settings.designTokens : {};
    const offerConfig = isRecord(designTokens.postPurchaseOffer) ? designTokens.postPurchaseOffer : {};
    const isSpecificTrigger = offerConfig.triggerCondition === 'specific_products';
    const triggerProductIds = new Set(
      Array.isArray(offerConfig.triggerProductIds) ? offerConfig.triggerProductIds : []
    );

    // 2. Fetch orders and guest orders in the period
    const [orders, guestOrders] = await runQuery(async (prisma) => {
      return Promise.all([
        prisma.order.findMany({
          where: {
            companyId,
            createdAt: { gte: start, lte: end },
            status: { not: 'TRASH' }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            customerName: true,
            customerPhone: true,
            total: true,
            createdAt: true,
            orderItems: {
              select: {
                id: true,
                productId: true,
                productName: true,
                productColor: true,
                productSize: true,
                price: true,
                quantity: true,
                total: true,
                metadata: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.guestOrder.findMany({
          where: {
            companyId,
            createdAt: { gte: start, lte: end },
            status: { notIn: ['TRASH', 'trash', 'deleted'] }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            guestName: true,
            guestPhone: true,
            total: true,
            finalTotal: true,
            metadata: true,
            items: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);
    });

    // Deduplicate twins by orderNumber (favor regular order)
    const regularOrderNumbers = new Set(
      (orders || []).map((o) => String(o.orderNumber || '').trim().toLowerCase()).filter(Boolean)
    );
    const filteredGuestOrders = (guestOrders || []).filter((g) => {
      const key = String(g.orderNumber || '').trim().toLowerCase();
      return !key || !regularOrderNumbers.has(key);
    });

    let totalOrdersCount = 0;
    let eligibleOrdersCount = 0;
    let offerAcceptsCount = 0;
    let totalGrossRevenue = 0;
    let offerRevenue = 0;

    let totalAcceptanceTimeMs = 0;
    let validTimeSamples = 0;

    const variantMap = {};
    const triggerProductMap = {};
    const acceptedOrdersList = [];

    const outcomeStats = {
      delivered: { count: 0, revenue: 0 },
      returned: { count: 0, revenue: 0 },
      inTransit: { count: 0, revenue: 0 }
    };

    const deliveredStatuses = ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'delivered'];
    const returnedStatuses = ['RETURNED', 'PARTIALLY_RETURNED', 'CANCELLED', 'REJECTED', 'FAILED', 'returned', 'cancelled'];

    // Process regular orders
    (orders || []).forEach((order) => {
      totalOrdersCount += 1;
      const orderTotal = Number(order.total || 0);
      totalGrossRevenue += orderTotal;

      const items = order.orderItems || [];
      const isEligible = !isSpecificTrigger || items.some((it) => triggerProductIds.has(it.productId));
      if (isEligible) {
        eligibleOrdersCount += 1;
      }

      const offerItem = items.find((it) => {
        if (!it.metadata) return false;
        if (typeof it.metadata === 'string') return it.metadata.includes('isPostPurchaseOffer');
        return Boolean(it.metadata.isPostPurchaseOffer);
      });

      if (offerItem) {
        offerAcceptsCount += 1;
        const itemQty = Number(offerItem.quantity || 1);
        const itemPrice = Number(offerItem.price || 0);
        const itemRev = itemPrice * itemQty;
        offerRevenue += itemRev;

        let orderMeta = null;
        if (order.metadata) {
          try {
            orderMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          } catch (e) {}
        }
        let itemMeta = null;
        if (offerItem.metadata) {
          try {
            itemMeta = typeof offerItem.metadata === 'string' ? JSON.parse(offerItem.metadata) : offerItem.metadata;
          } catch (e) {}
        }
        const color = offerItem.productColor || itemMeta?.color || itemMeta?.productColor || orderMeta?.postPurchaseOffer?.productColor || 'افتراضي';
        const size = offerItem.productSize || itemMeta?.size || itemMeta?.productSize || orderMeta?.postPurchaseOffer?.productSize || 'افتراضي';
        const variantKey = `${color} / ${size}`;
        if (!variantMap[variantKey]) {
          variantMap[variantKey] = { variantName: variantKey, color, size, count: 0, revenue: 0 };
        }
        variantMap[variantKey].count += itemQty;
        variantMap[variantKey].revenue += itemRev;

        items.forEach((it) => {
          if (it.id !== offerItem.id) {
            const prodName = it.productName || 'منتج أصلي';
            if (!triggerProductMap[prodName]) {
              triggerProductMap[prodName] = { name: prodName, count: 0 };
            }
            triggerProductMap[prodName].count += 1;
          }
        });

        const st = String(order.status || '').trim();
        if (deliveredStatuses.includes(st)) {
          outcomeStats.delivered.count += 1;
          outcomeStats.delivered.revenue += itemRev;
        } else if (returnedStatuses.includes(st)) {
          outcomeStats.returned.count += 1;
          outcomeStats.returned.revenue += itemRev;
        } else {
          outcomeStats.inTransit.count += 1;
          outcomeStats.inTransit.revenue += itemRev;
        }

        let acceptedAtStr = null;
        let meta = null;
        if (order.metadata) {
          try {
            meta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          } catch (e) {}
        }
        if (meta?.postPurchaseOffer?.acceptedAt) {
          acceptedAtStr = meta.postPurchaseOffer.acceptedAt;
        } else if (offerItem.metadata) {
          try {
            const itemMeta = typeof offerItem.metadata === 'string' ? JSON.parse(offerItem.metadata) : offerItem.metadata;
            acceptedAtStr = itemMeta?.acceptedAt;
          } catch (e) {}
        }

        if (acceptedAtStr && order.createdAt) {
          const acceptedTime = new Date(acceptedAtStr).getTime();
          const createdTime = new Date(order.createdAt).getTime();
          const diffMs = acceptedTime - createdTime;
          if (diffMs > 0 && diffMs < 3600000) {
            totalAcceptanceTimeMs += diffMs;
            validTimeSamples += 1;
          }
        }

        acceptedOrdersList.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName || 'عميل',
          customerPhone: order.customerPhone || '',
          orderTotal,
          offerPrice: itemPrice,
          offerQuantity: itemQty,
          offerProductName: offerItem.productName || 'منتج العرض',
          offerVariant: variantKey,
          status: order.status,
          acceptedAt: acceptedAtStr || null,
          createdAt: order.createdAt
        });
      }
    });

    // Process guest orders
    (filteredGuestOrders || []).forEach((order) => {
      totalOrdersCount += 1;
      const orderTotal = Number(order.finalTotal || order.total || 0);
      totalGrossRevenue += orderTotal;

      let items = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      } catch (_) {
        items = [];
      }

      let metadata = {};
      try {
        metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
      } catch (_) {
        metadata = {};
      }

      const isEligible = !isSpecificTrigger || items.some((it) => triggerProductIds.has(it.productId));
      if (isEligible) {
        eligibleOrdersCount += 1;
      }

      const hasAccepted = Boolean(
        metadata?.postPurchaseOfferAccepted ||
        items.some((it) => it.isPostPurchaseOffer || it.addedPostPurchase)
      );

      if (hasAccepted) {
        offerAcceptsCount += 1;

        const offerData = metadata?.postPurchaseOffer || {};
        const offerItemFromList = items.find((it) => it.isPostPurchaseOffer || it.addedPostPurchase);

        const itemPrice = Number(offerData.offerPrice || offerItemFromList?.price || 0);
        const itemQty = Number(offerData.quantity || offerItemFromList?.quantity || 1);
        const itemRev = itemPrice * itemQty;
        offerRevenue += itemRev;

        const acceptedAtStr = offerData.acceptedAt;
        if (acceptedAtStr && order.createdAt) {
          const diffMs = new Date(acceptedAtStr).getTime() - new Date(order.createdAt).getTime();
          if (diffMs > 0 && diffMs < 6 * 60 * 60 * 1000) {
            totalAcceptanceTimeMs += diffMs;
            validTimeSamples += 1;
          }
        }

        const color = offerData.productColor || offerItemFromList?.color || offerItemFromList?.productColor || 'افتراضي';
        const size = offerData.productSize || offerItemFromList?.size || offerItemFromList?.productSize || 'افتراضي';
        const variantKey = `${color} / ${size}`;
        if (!variantMap[variantKey]) {
          variantMap[variantKey] = { variantName: variantKey, color, size, count: 0, revenue: 0 };
        }
        variantMap[variantKey].count += itemQty;
        variantMap[variantKey].revenue += itemRev;

        items.forEach((it) => {
          if (!it.isPostPurchaseOffer && !it.addedPostPurchase) {
            const prodName = it.name || it.productName || 'منتج أصلي';
            if (!triggerProductMap[prodName]) {
              triggerProductMap[prodName] = { name: prodName, count: 0 };
            }
            triggerProductMap[prodName].count += 1;
          }
        });

        const st = String(order.status || '').trim();
        if (deliveredStatuses.includes(st)) {
          outcomeStats.delivered.count += 1;
          outcomeStats.delivered.revenue += itemRev;
        } else if (returnedStatuses.includes(st)) {
          outcomeStats.returned.count += 1;
          outcomeStats.returned.revenue += itemRev;
        } else {
          outcomeStats.inTransit.count += 1;
          outcomeStats.inTransit.revenue += itemRev;
        }

        acceptedOrdersList.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.guestName || 'عميل زائر',
          customerPhone: order.guestPhone || '',
          orderTotal,
          offerPrice: itemPrice,
          offerQuantity: itemQty,
          offerProductName: offerData.productName || offerItemFromList?.name || 'منتج العرض',
          offerVariant: variantKey,
          status: order.status,
          acceptedAt: acceptedAtStr || null,
          createdAt: order.createdAt
        });
      }
    });

    const acceptanceRate = eligibleOrdersCount > 0
      ? Number(((offerAcceptsCount / eligibleOrdersCount) * 100).toFixed(1))
      : 0;

    const currentAOV = totalOrdersCount > 0 ? Number((totalGrossRevenue / totalOrdersCount).toFixed(2)) : 0;
    const baselineAOV = totalOrdersCount > 0 ? Number(((totalGrossRevenue - offerRevenue) / totalOrdersCount).toFixed(2)) : 0;
    const aovLiftAmount = Number((currentAOV - baselineAOV).toFixed(2));
    const aovLiftPercentage = baselineAOV > 0 ? Number(((aovLiftAmount / baselineAOV) * 100).toFixed(1)) : 0;

    const avgAcceptanceTimeSeconds = validTimeSamples > 0
      ? Math.round(totalAcceptanceTimeMs / validTimeSamples / 1000)
      : 0;

    const formatSeconds = (sec) => {
      if (!sec) return '—';
      if (sec < 60) return `${sec} ثانية`;
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      return remSec > 0 ? `${mins} دقيقة و${remSec} ثانية` : `${mins} دقيقة`;
    };

    const variantBreakdown = Object.values(variantMap).sort((a, b) => b.count - a.count);
    const triggerProductBreakdown = Object.values(triggerProductMap).sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      data: {
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        kpis: {
          totalOrders: totalOrdersCount,
          totalOrdersCount,
          eligibleOrdersCount,
          offerAcceptedOrders: offerAcceptsCount,
          offerAcceptsCount,
          acceptanceRate,
          offerRevenue,
          totalGrossRevenue,
          currentAOV,
          withOfferAov: currentAOV,
          baselineAov: baselineAOV,
          baselineAOV,
          aovLift: aovLiftAmount,
          aovLiftAmount,
          aovLiftPercent: aovLiftPercentage,
          aovLiftPercentage,
          avgAcceptanceSeconds: avgAcceptanceTimeSeconds,
          avgAcceptanceTimeSeconds,
          avgAcceptanceSecondsText: formatSeconds(avgAcceptanceTimeSeconds),
          avgAcceptanceTimeFormatted: formatSeconds(avgAcceptanceTimeSeconds)
        },
        deliveryOutcomes: {
          ...outcomeStats,
          deliveredOrders: outcomeStats.delivered.count,
          deliveredOfferRevenue: outcomeStats.delivered.revenue,
          returnedOrders: outcomeStats.returned.count,
          returnedOfferRevenue: outcomeStats.returned.revenue,
          inTransitOrders: outcomeStats.inTransit.count,
          inTransitOfferRevenue: outcomeStats.inTransit.revenue,
          netRealizedOfferRevenue: outcomeStats.delivered.revenue,
          netRealizedRevenue: outcomeStats.delivered.revenue
        },
        variants: variantBreakdown,
        variantBreakdown,
        triggerProductBreakdown,
        recentAcceptedOrders: acceptedOrdersList.slice(0, 50)
      }
    });
  } catch (error) {
    console.error('❌ [POST-PURCHASE-OFFER-ANALYTICS] Error in getOfferAnalytics:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOffer,
  updateOffer,
  getPublicOffer,
  getOfferAnalytics,
  DEFAULT_OFFER_CONFIG
};
