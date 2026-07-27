const DECISION_STATUS = {
  NO_DATA: "NO_DATA",
  LEARNING: "LEARNING",
  SCALE: "SCALE",
  KILL: "KILL",
  WATCH: "WATCH",
  FIX_CREATIVE: "FIX_CREATIVE",
  FIX_LANDING: "FIX_LANDING",
  FIX_TRACKING: "FIX_TRACKING",
  FIX_OFFER: "FIX_OFFER",
};

const DELIVERED_STATUSES = new Set(["DELIVERED", "COMPLETED", "CONFIRMED"]);
const CANCELLED_STATUSES = new Set(["CANCELLED", "CANCELED", "REJECTED"]);
const RETURNED_STATUSES = new Set(["RETURNED", "REFUNDED"]);

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(toNumber(value) * factor) / factor;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeToken(value) {
  return normalizeText(value).toLowerCase();
}

function parseProductSlug(linkUrl) {
  try {
    const url = new URL(linkUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const productIndex = parts.findIndex((part) => part.toLowerCase() === "product");
    return productIndex >= 0 ? parts[productIndex + 1] || "" : "";
  } catch {
    return "";
  }
}

function getAverage(values) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (!validValues.length) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function getOrderAttribution(order) {
  const metadata = parseJson(order?.metadata, {});
  const attribution = metadata.attribution || {};
  return attribution && typeof attribution === "object" && !Array.isArray(attribution)
    ? attribution
    : {};
}

function hasMatchingToken(value, candidates) {
  const normalizedValue = normalizeToken(value);
  return Boolean(
    normalizedValue &&
      candidates.some((candidate) => normalizeToken(candidate) === normalizedValue),
  );
}

function getOrderMatchStrength(order, ad) {
  const attribution = getOrderAttribution(order);
  const adSet = ad.facebookAdset || {};
  const campaign = adSet.facebookCampaign || {};

  if (
    hasMatchingToken(attribution.adId || attribution.ad_id, [
      ad.facebookAdId,
      ad.id,
    ])
  ) {
    return "AD";
  }

  if (
    hasMatchingToken(attribution.adSetId || attribution.adset_id || attribution.ad_set_id, [
      adSet.facebookAdSetId,
      adSet.id,
    ])
  ) {
    return "ADSET";
  }

  if (
    hasMatchingToken(attribution.campaignId || attribution.campaign_id || attribution.utm_id, [
      campaign.facebookCampaignId,
      campaign.id,
    ])
  ) {
    return "CAMPAIGN";
  }

  return null;
}

function getItemUnitCost(item) {
  const itemPrice = toNumber(item.price);
  const explicitCost = [
    item.productVariant?.cost,
    item.product?.cost,
    item.basePrice,
    item.merchantPrice,
  ]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value >= 0);

  return explicitCost ?? itemPrice * 0.6;
}

function summarizeOrders(orders) {
  return orders.reduce(
    (summary, order) => {
      const status = normalizeToken(order.status).toUpperCase();
      const total = toNumber(order.total);
      const shipping = toNumber(order.shipping);
      const isDelivered = DELIVERED_STATUSES.has(status);

      summary.totalOrders += 1;
      summary.totalRevenue += total;

      if (isDelivered) {
        summary.deliveredOrders += 1;
        summary.deliveredRevenue += total;
        summary.shipping += shipping;
      } else if (CANCELLED_STATUSES.has(status)) {
        summary.cancelledOrders += 1;
      } else if (RETURNED_STATUSES.has(status)) {
        summary.returnedOrders += 1;
      }

      (order.orderItems || []).forEach((item) => {
        const quantity = toNumber(item.quantity);
        if (isDelivered) {
          summary.units += quantity;
          summary.cogs += getItemUnitCost(item) * quantity;
        }
      });

      return summary;
    },
    {
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalRevenue: 0,
      deliveredRevenue: 0,
      cogs: 0,
      shipping: 0,
      units: 0,
    },
  );
}

function getProductEconomics(product, relatedOrderStats, summary) {
  const productPrice = toNumber(product?.price);
  const productCost = Number(product?.cost);
  const variantAverageCost = getAverage(
    (product?.productVariants || []).map((variant) => variant.cost),
  );
  const unitRevenueFromOrders =
    relatedOrderStats.units > 0
      ? relatedOrderStats.deliveredRevenue / relatedOrderStats.units
      : 0;
  const unitCostFromOrders =
    relatedOrderStats.units > 0 ? relatedOrderStats.cogs / relatedOrderStats.units : 0;
  const price =
    productPrice ||
    unitRevenueFromOrders ||
    (summary.purchases > 0 ? toNumber(summary.purchaseValue) / summary.purchases : 0);
  const cost = Number.isFinite(productCost)
    ? productCost
    : (variantAverageCost ?? (unitCostFromOrders || price * 0.6));
  const avgShipping =
    relatedOrderStats.deliveredOrders > 0
      ? relatedOrderStats.shipping / relatedOrderStats.deliveredOrders
      : 0;
  const grossProfitPerPurchase = Math.max(0, price - cost - avgShipping);
  const targetCpa = grossProfitPerPurchase > 0 ? grossProfitPerPurchase * 0.8 : 0;
  const breakEvenRoas =
    grossProfitPerPurchase > 0 && price > 0 ? price / grossProfitPerPurchase : 0;
  const targetRoas = targetCpa > 0 && price > 0 ? price / targetCpa : 0;

  return {
    productId: product?.id || null,
    productName: product?.name || null,
    price: round(price),
    unitCost: round(cost),
    avgShipping: round(avgShipping),
    grossProfitPerPurchase: round(grossProfitPerPurchase),
    breakEvenCpa: round(grossProfitPerPurchase),
    targetCpa: round(targetCpa),
    breakEvenRoas: round(breakEvenRoas, 3),
    targetRoas: round(targetRoas, 3),
    costSource: Number.isFinite(productCost)
      ? "PRODUCT"
      : variantAverageCost !== null
        ? "VARIANT_AVERAGE"
        : unitCostFromOrders > 0
          ? "ORDER_ITEMS"
          : "ESTIMATED_60_PERCENT",
  };
}

function buildDecisionPayload(status, overrides = {}) {
  const defaults = {
    [DECISION_STATUS.NO_DATA]: {
      label: "لا توجد بيانات",
      tone: "slate",
      priority: "LOW",
      reason: "الإعلان لا يملك بيانات كافية لاتخاذ قرار.",
      nextAction: "زامن الإحصائيات أو وسّع الفترة.",
    },
    [DECISION_STATUS.LEARNING]: {
      label: "اتركه يتعلم",
      tone: "blue",
      priority: "LOW",
      reason: "العينة ما زالت صغيرة، والقرار الآن قد يقطع التعلم بدري.",
      nextAction: "راقب حتى يصل الإنفاق أو التحويلات للحد المناسب.",
    },
    [DECISION_STATUS.SCALE]: {
      label: "وسّع تدريجيًا",
      tone: "green",
      priority: "MEDIUM",
      reason: "الأداء أعلى من هدف الربحية ومعه حجم نتائج مناسب.",
      nextAction: "ارفع الميزانية 15-20% ثم راقب CPA لمدة 24-48 ساعة.",
    },
    [DECISION_STATUS.KILL]: {
      label: "مرشح للإيقاف",
      tone: "red",
      priority: "HIGH",
      reason: "الإعلان تعدى حدود الربحية أو صرف بدون نتيجة كافية.",
      nextAction: "أوقفه أو انقل الميزانية لنسخة رابحة بعد مراجعة التتبع.",
    },
    [DECISION_STATUS.WATCH]: {
      label: "راقب",
      tone: "amber",
      priority: "MEDIUM",
      reason: "الأداء غير كافٍ للتوسيع أو الإيقاف بثقة.",
      nextAction: "راجع breakdowns واستكمل المراقبة قبل تغيير الميزانية.",
    },
    [DECISION_STATUS.FIX_CREATIVE]: {
      label: "أصلح الكريتيف",
      tone: "amber",
      priority: "MEDIUM",
      reason: "الجمهور يرى الإعلان لكن معدل الضغط ضعيف.",
      nextAction: "اختبر Hook وصورة/فيديو أوضح قبل زيادة الإنفاق.",
    },
    [DECISION_STATUS.FIX_LANDING]: {
      label: "أصلح صفحة الهبوط",
      tone: "red",
      priority: "HIGH",
      reason: "يوجد تسريب بين الضغطات ومشاهدة صفحة الهبوط.",
      nextAction: "راجع سرعة الصفحة، الرابط، وحدث PageView/Landing Page View.",
    },
    [DECISION_STATUS.FIX_TRACKING]: {
      label: "أصلح التتبع",
      tone: "red",
      priority: "HIGH",
      reason: "بيانات الشراء أو Pixel/CAPI غير كافية للحكم على الربحية.",
      nextAction: "اختبر Pixel وCAPI وPurchase event قبل قرار الإيقاف أو التوسيع.",
    },
    [DECISION_STATUS.FIX_OFFER]: {
      label: "أصلح العرض",
      tone: "amber",
      priority: "MEDIUM",
      reason: "الإعلان يحصل على اهتمام لكن لا يحول لمشتريات كافية.",
      nextAction: "راجع السعر، الشحن، العرض، وخطوات checkout.",
    },
  };

  return { status, ...defaults[status], ...overrides };
}

function getConfidence({ economics, exactOrders, relatedOrders, summary, campaign }) {
  let score = 35;

  if (economics.productId) score += 15;
  if (economics.costSource !== "ESTIMATED_60_PERCENT") score += 20;
  if (exactOrders.deliveredOrders > 0) score += 15;
  else if (relatedOrders.deliveredOrders > 0) score += 8;
  if (summary.purchases >= 3 || summary.spend >= Math.max(100, economics.targetCpa || 0)) {
    score += 15;
  }
  if (/SALES|CONVERSIONS/i.test(campaign?.objective || "") && !campaign?.pixelId) {
    score -= 20;
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: boundedScore,
    level: boundedScore >= 75 ? "HIGH" : boundedScore >= 50 ? "MEDIUM" : "LOW",
  };
}

function chooseDecision({ summary, economics, exactOrders, relatedOrders, campaign }) {
  const spend = toNumber(summary.spend);
  const purchases = Math.max(toNumber(summary.purchases), exactOrders.deliveredOrders);
  const purchaseValue = Math.max(
    toNumber(summary.purchaseValue),
    exactOrders.deliveredRevenue,
  );
  const cpa = purchases > 0 ? spend / purchases : 0;
  const roas = spend > 0 ? purchaseValue / spend : 0;
  const linkClicks = toNumber(summary.linkClicks || summary.clicks);
  const landingPageViews = toNumber(summary.landingPageViews);
  const landingRate = linkClicks > 0 ? landingPageViews / linkClicks : 0;
  const targetCpa = toNumber(economics.targetCpa);
  const breakEvenCpa = toNumber(economics.breakEvenCpa);
  const targetRoas = toNumber(economics.targetRoas);
  const trackingGap = /SALES|CONVERSIONS/i.test(campaign?.objective || "") && !campaign?.pixelId;

  if (toNumber(summary.impressions) === 0 && spend === 0) {
    return buildDecisionPayload(DECISION_STATUS.NO_DATA);
  }

  if (trackingGap && (spend >= 50 || purchases === 0)) {
    return buildDecisionPayload(DECISION_STATUS.FIX_TRACKING, {
      reason: "الحملة هدفها مبيعات لكن Pixel غير واضح محليًا، فقرارات CPA/ROAS ممكن تكون مضللة.",
    });
  }

  if (linkClicks >= 20 && landingPageViews > 0 && landingRate < 0.65) {
    return buildDecisionPayload(DECISION_STATUS.FIX_LANDING, {
      reason: `نسبة Landing Page Views من الضغطات ${round(landingRate * 100)}% فقط.`,
    });
  }

  if (toNumber(summary.impressions) >= 1000 && toNumber(summary.ctr) > 0 && toNumber(summary.ctr) < 1) {
    return buildDecisionPayload(DECISION_STATUS.FIX_CREATIVE, {
      reason: `CTR الحالي ${round(summary.ctr)}% أقل من الحد الصحي المبدئي 1%.`,
    });
  }

  if (purchases >= 3 && targetCpa > 0 && cpa <= targetCpa && roas >= targetRoas) {
    return buildDecisionPayload(DECISION_STATUS.SCALE, {
      reason: `CPA ${round(cpa)} أقل من الهدف ${round(targetCpa)} وROAS ${round(roas, 2)}x فوق الهدف.`,
    });
  }

  if (purchases > 0 && breakEvenCpa > 0 && cpa > breakEvenCpa * 1.15) {
    return buildDecisionPayload(DECISION_STATUS.KILL, {
      reason: `CPA ${round(cpa)} أعلى من نقطة التعادل ${round(breakEvenCpa)}.`,
    });
  }

  if (purchases === 0 && targetCpa > 0 && spend >= Math.max(100, targetCpa * 1.25)) {
    return buildDecisionPayload(DECISION_STATUS.KILL, {
      reason: `صرف ${round(spend)} بدون Purchase وتجاوز حد الاختبار المبني على هامش المنتج.`,
    });
  }

  if (purchases === 0 && spend >= 100) {
    return buildDecisionPayload(DECISION_STATUS.FIX_OFFER);
  }

  if (spend < Math.max(100, targetCpa || 0) && purchases < 3) {
    return buildDecisionPayload(DECISION_STATUS.LEARNING);
  }

  const hasRelatedOrders = relatedOrders.deliveredOrders > exactOrders.deliveredOrders;
  return buildDecisionPayload(DECISION_STATUS.WATCH, {
    reason: hasRelatedOrders
      ? "يوجد طلبات مرتبطة بالحملة/المجموعة لكن ليست منسوبة للإعلان بدقة."
      : "الأرقام لا تكفي لقرار توسع أو إيقاف بثقة.",
  });
}

async function resolveProduct(prisma, companyId, ad, preFetchedProductMap) {
  if (preFetchedProductMap) {
    const byId = preFetchedProductMap.get(ad?.productId);
    if (byId) return byId;
    const slug = parseProductSlug(ad?.linkUrl);
    if (slug) {
      const bySlug = preFetchedProductMap.get(slug);
      if (bySlug) return bySlug;
    }
    return null;
  }

  if (ad?.productId) {
    const product = await prisma.product.findFirst({
      where: { id: ad.productId, companyId },
      include: {
        productVariants: {
          select: { cost: true, price: true },
        },
      },
    });
    if (product) return product;
  }

  const productSlug = parseProductSlug(ad?.linkUrl);
  if (!productSlug) return null;

  return prisma.product.findFirst({
    where: { companyId, slug: productSlug },
    include: {
      productVariants: {
        select: { cost: true, price: true },
      },
    },
  });
}

async function getRelatedOrders(prisma, companyId, ad, dateRange) {
  const orders = await prisma.order.findMany({
    where: {
      companyId,
      createdAt: {
        gte: dateRange.rangeStart,
        lte: dateRange.rangeEnd,
      },
      status: { notIn: ["DRAFT", "TRASH"] },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      shipping: true,
      metadata: true,
      createdAt: true,
      orderItems: {
        include: {
          product: {
            select: { id: true, name: true, price: true, cost: true },
          },
          productVariant: {
            select: { id: true, price: true, cost: true },
          },
        },
      },
    },
  });

  const exact = [];
  const related = [];

  orders.forEach((order) => {
    const strength = getOrderMatchStrength(order, ad);
    if (strength === "AD") {
      exact.push(order);
      related.push(order);
    } else if (strength === "ADSET" || strength === "CAMPAIGN") {
      related.push(order);
    }
  });

  return {
    exact,
    related,
  };
}

async function buildAdDecisionForAd({
  prisma,
  companyId,
  ad,
  summary,
  campaignSummary,
  dateRange,
  preFetchedOrders,
  preFetchedProductMap,
}) {
  const campaign = ad?.facebookAdset?.facebookCampaign || {};
  const product = await resolveProduct(prisma, companyId, ad, preFetchedProductMap);
  const orders = preFetchedOrders
    ? (() => {
        const exact = [];
        const related = [];
        preFetchedOrders.forEach((order) => {
          const strength = getOrderMatchStrength(order, ad);
          if (strength === "AD") {
            exact.push(order);
            related.push(order);
          } else if (strength === "ADSET" || strength === "CAMPAIGN") {
            related.push(order);
          }
        });
        return { exact, related };
      })()
    : await getRelatedOrders(prisma, companyId, ad, dateRange);
  const exactOrders = summarizeOrders(orders.exact);
  const relatedOrders = summarizeOrders(orders.related);
  const economics = getProductEconomics(product, relatedOrders, summary || {});
  const baseDecision = chooseDecision({
    summary: summary || {},
    economics,
    exactOrders,
    relatedOrders,
    campaign,
    campaignSummary,
  });
  const confidence = getConfidence({
    economics,
    exactOrders,
    relatedOrders,
    summary: summary || {},
    campaign,
  });
  const spend = toNumber(summary?.spend);
  const purchases = Math.max(toNumber(summary?.purchases), exactOrders.deliveredOrders);
  const revenue = Math.max(toNumber(summary?.purchaseValue), exactOrders.deliveredRevenue);
  const cogs =
    exactOrders.units > 0
      ? exactOrders.cogs
      : economics.unitCost * purchases;
  const shipping =
    exactOrders.deliveredOrders > 0
      ? exactOrders.shipping
      : economics.avgShipping * purchases;
  const contributionProfit = revenue - cogs - shipping - spend;

  return {
    ...baseDecision,
    confidence,
    metrics: {
      spend: round(spend),
      purchases: round(purchases, 0),
      purchaseValue: round(revenue),
      cpa: purchases > 0 ? round(spend / purchases) : 0,
      roas: spend > 0 ? round(revenue / spend, 3) : 0,
      estimatedCogs: round(cogs),
      estimatedShipping: round(shipping),
      estimatedProfit: round(contributionProfit),
      ctr: round(summary?.ctr),
      frequency: round(summary?.frequency),
    },
    economics,
    attribution: {
      exactOrders: exactOrders.totalOrders,
      exactDeliveredOrders: exactOrders.deliveredOrders,
      relatedOrders: relatedOrders.totalOrders,
      relatedDeliveredOrders: relatedOrders.deliveredOrders,
      cancelledOrders: relatedOrders.cancelledOrders,
      returnedOrders: relatedOrders.returnedOrders,
    },
    tracking: {
      pixelId: campaign?.pixelId || null,
      hasPixel: Boolean(campaign?.pixelId),
      productLinked: Boolean(economics.productId),
      costSource: economics.costSource,
    },
  };
}

module.exports = {
  DECISION_STATUS,
  buildAdDecisionForAd,
};
