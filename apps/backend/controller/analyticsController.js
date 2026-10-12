const analyticsService = require('../services/analyticsService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  effectiveOrderStatusSql,
  computeEffectiveOrderStatus,
} = require('../utils/orderEffectiveStatus');
const { buildDateRangeFilter, EGYPT_TIMEZONE } = require('../utils/dateUtils');

const ANALYTICS_DAY_MS = 24 * 60 * 60 * 1000;
const DELIVERED_ORDER_STATUSES = new Set(['DELIVERED']);
const CANCELLED_ORDER_STATUSES = new Set(['CANCELLED']);
const RETURNED_ORDER_STATUSES = new Set(['RETURNED']);
const ORDER_STATUS_VALUES = new Set([
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED',
  'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'PARTIALLY_REFUNDED',
  'WOO_TAGHEZ', 'DRAFT', 'TRASH', 'READY_TO_SHIP', 'ON_HOLD', 'NOT_SHIPPED',
  'OUT_FOR_DELIVERY', 'LOST', 'PENDING_PREPARATION', 'PREPARING', 'READY',
  'QUALITY_CHECK', 'PACKAGED',   'ON_HOLD_PREP', 'PARTIALLY_DELIVERED',
  'STOCK_SHORTAGE', 'SHORTAGE_FAILED', 'PENDING_CANCELLATION'
]);

/**
 * 🛡️ PRODUCTION-FIX (analytics-custom-status): فلاتر تقارير الحالات كانت بترمي
 * أكواد الحالات المخصصة بصمت (فلتر ORDER_STATUS_VALUES فقط) — التاجر يختار حالته
 * المخصصة من الـ UI والـ API يرفض بـ "لا توجد حالات طلب صالحة". الدالة دي بتقبل
 * قيم الـ enum + أكواد الحالات المخصصة النشطة للشركة (من orderStatusConfig).
 */
const resolveAnalyticsStatusCodes = async (prisma, companyId, statusCodes) => {
  const enumCodes = statusCodes.filter((code) => ORDER_STATUS_VALUES.has(code));
  const candidateCustomCodes = statusCodes.filter((code) => !ORDER_STATUS_VALUES.has(code));

  if (candidateCustomCodes.length === 0) {
    return enumCodes;
  }

  let customCodes = [];
  try {
    const rows = await prisma.orderStatusConfig.findMany({
      where: {
        companyId,
        isActive: true,
        code: { in: candidateCustomCodes, mode: 'insensitive' },
      },
      select: { code: true },
    });
    const validCustomSet = new Set(rows.map((r) => String(r.code || '').trim().toUpperCase()));
    customCodes = candidateCustomCodes.filter((code) => validCustomSet.has(code));
  } catch (configErr) {
    console.warn('⚠️ [ANALYTICS] Failed to load custom status codes:', configErr.message);
  }

  // حافظ على ترتيب اختيار المستخدم (enum أولاً كما ورد ثم المخصصة الصالحة)
  return [...enumCodes, ...customCodes];
};

const normalizeAnalyticsDateInput = (value, { endOfDay = false } = {}) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
  }

  return date;
};

const parseAnalyticsDateRange = ({ startDate, endDate, period = '30' }) => {
  let end = normalizeAnalyticsDateInput(endDate, { endOfDay: true }) || new Date();
  let start;
  const normalizedPeriod = String(period || '30').trim().toLowerCase();

  if (startDate) {
    start = normalizeAnalyticsDateInput(startDate);
  } else if (normalizedPeriod === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    start = yesterday;
    end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
  } else if (normalizedPeriod === 'today' || normalizedPeriod === '1') {
    start = new Date(end);
    start.setHours(0, 0, 0, 0);
  } else if (normalizedPeriod === '2') {
    start = new Date(end);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
  } else {
    const days = Number.parseInt(normalizedPeriod, 10);
    const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
    start = new Date(end.getTime() - (safeDays * ANALYTICS_DAY_MS));
  }

  if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid analytics date range');
  }

  return { start, end };
};

const parseJsonSafely = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const normalizeAttributionText = (value, fallbackOrMaxLength = '') => {
  const fallback = typeof fallbackOrMaxLength === 'string' ? fallbackOrMaxLength : '';
  const maxLength = typeof fallbackOrMaxLength === 'number' ? fallbackOrMaxLength : 320;
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  if (!text) return fallback;
  return text.slice(0, maxLength);
};

const buildOrderAttributionSnapshot = (metadata, orderContext = {}) => {
  let rawAttribution =
    metadata && typeof metadata === 'object' && metadata.attribution
      ? metadata.attribution
      : null;

  // Fallback to conversation metadata if order has a conversation but no direct attribution
  if (!rawAttribution && orderContext.conversation) {
    const conv = orderContext.conversation;
    let convMeta = {};
    try {
      convMeta = typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : (conv.metadata || {});
    } catch (_) {
      convMeta = {};
    }

    const convPlatform = (conv.channel || convMeta.platform || 'facebook').toLowerCase();
    const adId = convMeta.adId || null;
    const adTitle = convMeta.adsContextData?.ad_title || null;
    const campaignName = adTitle || (adId ? `إعلان فيسبوك (${adId})` : `محادثة ${convPlatform === 'whatsapp' ? 'واتساب' : 'فيسبوك'}`);

    rawAttribution = {
      channel: 'inbox',
      platform: convPlatform,
      source: `${convPlatform}_inbox`,
      medium: adId ? 'click_to_messenger' : 'chat_inbox',
      campaignName,
      campaignId: convMeta.campaignId || null,
      adId,
      adRef: convMeta.adRef || null,
      postId: convMeta.postId || null,
      pageId: convMeta.pageId || null,
      conversationId: conv.id,
      capturedAt: null,
    };
  }

  const isInboxOrder =
    Boolean(orderContext.conversationId) ||
    Boolean(orderContext.conversation) ||
    (orderContext.sourceType && String(orderContext.sourceType).includes('conversation')) ||
    (orderContext.extractionMethod && String(orderContext.extractionMethod).includes('inbox'));

  if (!rawAttribution || typeof rawAttribution !== 'object') {
    return {
      channel: isInboxOrder ? 'inbox' : 'storefront',
      trackingType: 'unattributed',
      platform: isInboxOrder ? 'facebook' : 'unknown',
      source: isInboxOrder ? 'inbox_unattributed' : 'unattributed',
      medium: isInboxOrder ? 'chat' : 'unattributed',
      campaignId: '',
      campaignName: '',
      adSetId: '',
      adId: '',
      adRef: '',
      postId: '',
      pageId: '',
      content: '',
      term: '',
      landingPath: '',
      referrer: '',
      capturedAt: null,
    };
  }

  const rawChannel = normalizeAttributionText(rawAttribution.channel, 50)?.toLowerCase();
  const sourceText = normalizeAttributionText(rawAttribution.source, 'unknown').toLowerCase();
  const isInboxExplicit =
    rawChannel === 'inbox' ||
    isInboxOrder ||
    Boolean(rawAttribution.conversationId) ||
    sourceText.includes('inbox') ||
    sourceText.includes('messenger');
  const channel = isInboxExplicit ? 'inbox' : (rawChannel || 'storefront');

  const source = sourceText;
  const medium = normalizeAttributionText(
    rawAttribution.medium,
    source === 'direct' ? 'direct' : (channel === 'inbox' ? 'chat' : 'unknown'),
  ).toLowerCase();
  const platform = normalizeAttributionText(
    rawAttribution.platform,
    source !== 'unknown' ? source : (channel === 'inbox' ? 'facebook' : 'unknown'),
  ).toLowerCase();
  const campaignId = normalizeAttributionText(
    rawAttribution.campaignId || rawAttribution.utmId,
  );
  const campaignName = normalizeAttributionText(
    rawAttribution.campaignName || rawAttribution.campaign || rawAttribution.utmCampaign,
  );
  const adSetId = normalizeAttributionText(rawAttribution.adSetId);
  const adId = normalizeAttributionText(rawAttribution.adId);
  const adRef = normalizeAttributionText(rawAttribution.adRef);
  const postId = normalizeAttributionText(rawAttribution.postId);
  const pageId = normalizeAttributionText(rawAttribution.pageId);
  const content = normalizeAttributionText(rawAttribution.content || rawAttribution.utmContent);
  const term = normalizeAttributionText(rawAttribution.term || rawAttribution.utmTerm);
  const landingPath = normalizeAttributionText(rawAttribution.landingPath);
  const referrer = normalizeAttributionText(rawAttribution.referrer);
  const capturedAt = normalizeAttributionText(rawAttribution.capturedAt) || null;

  const hasCampaign = Boolean(campaignId || campaignName || adId);
  const hasTracking = Boolean(
    hasCampaign ||
      adSetId ||
      content ||
      term ||
      landingPath ||
      referrer ||
      postId ||
      (source && source !== 'unknown' && source !== 'unattributed') ||
      (medium && medium !== 'unknown' && medium !== 'unattributed'),
  );

  let trackingType = 'unattributed';
  if (source === 'direct' || medium === 'direct') {
    trackingType = 'direct';
  } else if (hasCampaign) {
    trackingType = 'campaign';
  } else if (hasTracking) {
    trackingType = 'tracked';
  }

  return {
    channel,
    trackingType,
    platform,
    source: hasTracking ? source || 'unknown' : 'unattributed',
    medium: hasTracking ? medium || 'unknown' : 'unattributed',
    campaignId,
    campaignName,
    adSetId,
    adId,
    adRef,
    postId,
    pageId,
    content,
    term,
    landingPath,
    referrer,
    capturedAt,
  };
};

const roundAnalyticsNumber = (value) => Number.parseFloat((value || 0).toFixed(2));

const normalizeCompanyReference = (value) => {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || null;
};

const resolveAnalyticsCompanyId = async (req) => {
  const authenticatedCompanyId = normalizeCompanyReference(
    req.user?.id ? req.user.companyId : null,
  );
  if (authenticatedCompanyId) {
    return authenticatedCompanyId;
  }

  const requestedCompanyReference = normalizeCompanyReference(
      req.company?.id ||
      req.company?.slug ||
      req.companyId ||
      req.headers?.['x-company-id'] ||
      req.query?.companyId,
  );

  if (!requestedCompanyReference) {
    return null;
  }

  const company = await getSharedPrismaClient().company.findFirst({
    where: {
      OR: [
        { id: requestedCompanyReference },
        { slug: requestedCompanyReference },
      ],
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!company || !company.isActive) {
    return null;
  }

  return company.id;
};

const CANCELLATION_STATUS_VALUES = ['CANCELLED', 'cancelled', 'Cancelled'];
const UNRECORDED_CANCELLATION_REASON = 'بدون سبب مسجل';

const toAnalyticsAmount = (value) => {
  const amount = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(amount) ? amount : 0;
};

const toIsoDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const toAnalyticsDateKey = (value) => {
  const isoDate = toIsoDateTime(value);
  return isoDate ? isoDate.slice(0, 10) : null;
};

const normalizeCancellationReason = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || UNRECORDED_CANCELLATION_REASON;
};

const MAX_CANCELLATION_REASON_OPTIONS = 30;
const MAX_CANCELLATION_REASON_LENGTH = 120;

const normalizeCancellationReasonOptions = (value) => {
  let rawOptions = value;

  if (typeof rawOptions === 'string') {
    const trimmedValue = rawOptions.trim();

    if (!trimmedValue) {
      rawOptions = [];
    } else {
      try {
        rawOptions = JSON.parse(trimmedValue);
      } catch (error) {
        rawOptions = trimmedValue.split(/\r?\n/);
      }
    }
  }

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  const uniqueOptions = [];
  const seen = new Set();

  rawOptions.forEach((option) => {
    const normalizedOption = String(option || '').replace(/\s+/g, ' ').trim();

    if (!normalizedOption) {
      return;
    }

    const truncatedOption = normalizedOption.slice(
      0,
      MAX_CANCELLATION_REASON_LENGTH,
    );
    const dedupeKey = truncatedOption.toLowerCase();

    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    uniqueOptions.push(truncatedOption);
  });

  return uniqueOptions.slice(0, MAX_CANCELLATION_REASON_OPTIONS);
};

const serializeCancellationReasonOptions = (value) =>
  JSON.stringify(normalizeCancellationReasonOptions(value));

const ensureCancellationReasonSettingsRow = async (prisma, companyId) => {
  const companyScope = String(companyId);
  const existingSettings = await prisma.orderInvoiceSettings.findUnique({
    where: { companyId: companyScope },
    select: { id: true },
  });

  if (existingSettings) {
    return existingSettings;
  }

  return prisma.orderInvoiceSettings.create({
    data: { companyId: companyScope },
    select: { id: true },
  });
};

const readCancellationReasonOptions = async (prisma, companyId) => {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT "cancellationReasonOptions" FROM "order_invoice_settings" WHERE "companyId" = $1 LIMIT 1',
    String(companyId),
  );

  const settingsRow = Array.isArray(rows) ? rows[0] : null;
  return normalizeCancellationReasonOptions(
    settingsRow?.cancellationReasonOptions,
  );
};

const classifyCancellationReason = (reason) => {
  const normalizedReason = normalizeCancellationReason(reason);
  if (normalizedReason === UNRECORDED_CANCELLATION_REASON) {
    return 'بدون سبب';
  }

  const text = normalizedReason.toLowerCase();

  if (
    text.includes('تلقائي') ||
    text.includes('محاولات الاتصال') ||
    text.includes('عدم الرد') ||
    text.includes('لم يرد') ||
    text.includes('تعذر التواصل') ||
    text.includes('call') ||
    text.includes('contact') ||
    text.includes('no answer') ||
    text.includes('automatic') ||
    text.includes('auto')
  ) {
    return 'تعذر التواصل';
  }

  if (
    text.includes('العميل') ||
    text.includes('customer') ||
    text.includes('رفض') ||
    text.includes('طلب الإلغاء') ||
    text.includes('غير رأيه') ||
    text.includes('غير رايه')
  ) {
    return 'طلب العميل';
  }

  if (text.includes('مكرر') || text.includes('duplicate')) {
    return 'طلب مكرر';
  }

  if (
    text.includes('مخزون') ||
    text.includes('غير متوفر') ||
    text.includes('نفذ') ||
    text.includes('stock') ||
    text.includes('unavailable')
  ) {
    return 'مشكلة مخزون';
  }

  if (
    text.includes('توصيل') ||
    text.includes('شحن') ||
    text.includes('عنوان') ||
    text.includes('delivery') ||
    text.includes('shipping') ||
    text.includes('address')
  ) {
    return 'مشكلة شحن';
  }

  if (
    text.includes('دفع') ||
    text.includes('سعر') ||
    text.includes('payment') ||
    text.includes('price')
  ) {
    return 'مشكلة دفع أو سعر';
  }

  return 'أخرى';
};

const extractGuestAddress = (shippingAddress) => {
  const parsedAddress = parseJsonSafely(shippingAddress);
  if (!parsedAddress || typeof parsedAddress !== 'object') {
    return {};
  }

  return {
    city: parsedAddress.city || parsedAddress.area || '',
    governorate: parsedAddress.governorate || parsedAddress.state || parsedAddress.region || '',
  };
};

const getCustomerDisplayName = (customer) => {
  if (!customer) {
    return '';
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || customer.name || '';
};

const getCancellationCustomerSnapshot = (order, type) => {
  if (type === 'GUEST') {
    const address = extractGuestAddress(order.shippingAddress);
    return {
      customerName: order.guestName || 'عميل ضيف',
      customerPhone: order.guestPhone || '',
      customerEmail: order.guestEmail || '',
      city: address.city || '',
      governorate: address.governorate || '',
    };
  }

  return {
    customerName: order.customerName || getCustomerDisplayName(order.customer) || 'عميل غير محدد',
    customerPhone: order.customerPhone || order.customer?.phone || '',
    customerEmail: order.customerEmail || order.customer?.email || '',
    city: order.city || order.customer?.city || '',
    governorate: order.governorate || order.customer?.governorate || '',
  };
};

const buildCancellationRecord = ({ order, history, type }) => {
  if (!order?.id) {
    return null;
  }

  const reason = normalizeCancellationReason(history?.reason || order.notes);
  const customer = getCancellationCustomerSnapshot(order, type);
  const cancelledAt = history?.createdAt || order.updatedAt || order.createdAt;
  const total =
    type === 'GUEST'
      ? toAnalyticsAmount(order.finalTotal ?? order.total)
      : toAnalyticsAmount(order.total);
  const cancelledBy = String(history?.userName || history?.changedBy || '').trim();

  return {
    id: order.id,
    type,
    orderNumber: order.orderNumber || order.id,
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
    customerEmail: customer.customerEmail,
    city: customer.city,
    governorate: customer.governorate,
    region: customer.governorate || customer.city || 'غير محدد',
    total: roundAnalyticsNumber(total),
    paymentMethod: order.paymentMethod || '',
    reason,
    reasonCategory: classifyCancellationReason(reason),
    hasRecordedReason: reason !== UNRECORDED_CANCELLATION_REASON,
    cancelledBy: cancelledBy || 'غير محدد',
    oldStatus: history?.oldStatus || '',
    cancelledAt: toIsoDateTime(cancelledAt),
    createdAt: toIsoDateTime(order.createdAt),
    source:
      type === 'GUEST'
        ? 'guest_checkout'
        : String(order.orderSource || order.sourceType || 'regular').toLowerCase(),
    reviewUrl: `/orders/workspace?order=${encodeURIComponent(order.id)}`,
  };
};

const createEmptyCancellationAnalytics = () => ({
  summary: {
    totalCancelledOrders: 0,
    regularOrders: 0,
    guestOrders: 0,
    totalLostRevenue: 0,
    averageCancelledOrderValue: 0,
    withReason: 0,
    withoutReason: 0,
    autoCancelled: 0,
    reviewedByAgent: 0,
  },
  reasonBreakdown: [],
  categoryBreakdown: [],
  dailyTrend: [],
  orders: [],
});

const aggregateCancellationAnalytics = (records, start, end, limit) => {
  const totalCancelledOrders = records.length;
  const totalLostRevenue = records.reduce((sum, order) => sum + toAnalyticsAmount(order.total), 0);
  const reasonMap = new Map();
  const categoryMap = new Map();
  const dailyMap = new Map();

  for (let current = new Date(start); current <= end; current = new Date(current.getTime() + ANALYTICS_DAY_MS)) {
    const key = current.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, cancellations: 0, lostRevenue: 0 });
  }

  records.forEach((order) => {
    const reasonKey = order.reason;
    const categoryKey = order.reasonCategory;
    const revenue = toAnalyticsAmount(order.total);

    if (!reasonMap.has(reasonKey)) {
      reasonMap.set(reasonKey, {
        reason: reasonKey,
        count: 0,
        lostRevenue: 0,
        latestAt: order.cancelledAt,
      });
    }
    const reasonRow = reasonMap.get(reasonKey);
    reasonRow.count += 1;
    reasonRow.lostRevenue += revenue;
    if (!reasonRow.latestAt || new Date(order.cancelledAt) > new Date(reasonRow.latestAt)) {
      reasonRow.latestAt = order.cancelledAt;
    }

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        category: categoryKey,
        count: 0,
        lostRevenue: 0,
      });
    }
    const categoryRow = categoryMap.get(categoryKey);
    categoryRow.count += 1;
    categoryRow.lostRevenue += revenue;

    const dateKey = toAnalyticsDateKey(order.cancelledAt);
    if (dateKey) {
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, cancellations: 0, lostRevenue: 0 });
      }
      const dailyRow = dailyMap.get(dateKey);
      dailyRow.cancellations += 1;
      dailyRow.lostRevenue += revenue;
    }
  });

  return {
    summary: {
      totalCancelledOrders,
      regularOrders: records.filter((order) => order.type === 'REGULAR').length,
      guestOrders: records.filter((order) => order.type === 'GUEST').length,
      totalLostRevenue: roundAnalyticsNumber(totalLostRevenue),
      averageCancelledOrderValue:
        totalCancelledOrders > 0 ? roundAnalyticsNumber(totalLostRevenue / totalCancelledOrders) : 0,
      withReason: records.filter((order) => order.hasRecordedReason).length,
      withoutReason: records.filter((order) => !order.hasRecordedReason).length,
      autoCancelled: records.filter((order) => order.reasonCategory === 'تعذر التواصل').length,
      reviewedByAgent: records.filter((order) => order.cancelledBy && order.cancelledBy !== 'غير محدد').length,
    },
    reasonBreakdown: Array.from(reasonMap.values())
      .map((row) => ({
        ...row,
        percentage:
          totalCancelledOrders > 0 ? roundAnalyticsNumber((row.count / totalCancelledOrders) * 100) : 0,
        lostRevenue: roundAnalyticsNumber(row.lostRevenue),
      }))
      .sort((a, b) => b.count - a.count || b.lostRevenue - a.lostRevenue),
    categoryBreakdown: Array.from(categoryMap.values())
      .map((row) => ({
        ...row,
        percentage:
          totalCancelledOrders > 0 ? roundAnalyticsNumber((row.count / totalCancelledOrders) * 100) : 0,
        lostRevenue: roundAnalyticsNumber(row.lostRevenue),
      }))
      .sort((a, b) => b.count - a.count || b.lostRevenue - a.lostRevenue),
    dailyTrend: Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        lostRevenue: roundAnalyticsNumber(row.lostRevenue),
      })),
    orders: records
      .slice()
      .sort((a, b) => new Date(b.cancelledAt || 0) - new Date(a.cancelledAt || 0))
      .slice(0, limit),
  };
};

const getStoreAnalytics = async (req, res) => {
  try {
    // Support both authenticated and public routes
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const { startDate, endDate, period = '30', comparisonType = 'previous' } = req.query;

    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });

    const analytics = await analyticsService.getStoreAnalytics(companyId, start, end, comparisonType);

    res.json({
      success: true,
      data: analytics,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getStoreAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
};

const getConversionRate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = new Date();
    let start;

    // Smart date handling - support both days count and actual dates
    try {
      ({ start, end } = parseAnalyticsDateRange({ startDate, endDate, period }));
    } catch (dateErr) {
      console.error('Date parsing error:', dateErr);
      // Fallback to 30 days
      start = new Date(end.getTime() - (30 * ANALYTICS_DAY_MS));
    }

    const conversionData = await analyticsService.getStoreConversionRate(companyId, start, end);

    res.json({
      success: true,
      data: conversionData,
      period: { start, end }
    });
  } catch (error) {
    console.error('❌ Error in getConversionRate:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate, period: req.query.period }
    });

    // Return proper error response
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معدل التحويل',
      error: error.message
    });
  }
};

const getProductConversionRate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { productId } = req.params;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = new Date();
    let start;

    // Smart date handling - support both days count and actual dates
    try {
      if (startDate && endDate) {
        const daysAgo = parseInt(startDate);
        if (!isNaN(daysAgo) && daysAgo > 0) {
          start = new Date(end.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
        } else {
          start = new Date(startDate);
          end = new Date(endDate);
        }
      } else {
        const days = parseInt(period);
        start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
      }
    } catch (dateErr) {
      console.error('Date parsing error:', dateErr);
      start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    const conversionData = await analyticsService.getProductConversionRate(
      productId,
      companyId,
      start,
      end
    );

    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId },
      select: { id: true, name: true, price: true, images: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود أو غير مصرح بالوصول إليه'
      });
    }

    res.json({
      success: true,
      data: {
        product,
        ...conversionData
      },
      period: { start, end }
    });
  } catch (error) {
    console.error('❌ Error in getProductConversionRate:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      productId: req.params?.productId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate, period: req.query.period }
    });

    // Return proper error response
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معدل تحويل المنتج',
      error: error.message
    });
  }
};

const getTopProducts = async (req, res) => {
  try {
    // Support both authenticated and public routes
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30', limit = 10 } = req.query;

    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });

    const topProducts = await analyticsService.getTopPerformingProducts(
      companyId,
      start,
      end,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topProducts,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getTopProducts:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أفضل المنتجات',
      error: error.message
    });
  }
};

const trackProductView = async (req, res) => {
  try {
    const { productId, sessionId, source } = req.body;
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId || !productId || !sessionId) {
      console.warn('⚠️ [Analytics] Missing data for product view:', { companyId, productId, sessionId });
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة - companyId, productId, sessionId مطلوبة'
      });
    }

    console.log(`📊 [Analytics] Tracking Product View: Product=${productId}, Session=${sessionId}, Company=${companyId}`);


    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    await analyticsService.trackProductVisit({
      productId,
      companyId,
      sessionId,
      source
    });

    res.json({ success: true, message: 'تم تسجيل الزيارة بنجاح' });
  } catch (error) {
    console.error('Error in trackProductView:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الزيارة',
      error: error.message
    });
  }
};

// 📈 [WebVitals] Real-user monitoring (LCP/CLS/INP/TTFB) — zero-schema:
// beacons land in a per-company in-memory ring buffer + one structured log
// line each. Enough to read p75 from the summary endpoint without a DB
// migration. Buffer resets on process restart by design.
const WEB_VITALS_BUFFER_LIMIT = 500;
const webVitalsBuffer = new Map();

const trackWebVitals = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    const { path: pagePath, metrics } = req.body || {};

    if (!companyId || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ success: false, message: 'بيانات ناقصة - companyId, metrics مطلوبة' });
    }

    const cleanMetrics = metrics
      .filter((m) => m && typeof m.name === 'string' && Number.isFinite(Number(m.value)))
      .slice(0, 8)
      .map((m) => ({
        name: String(m.name).slice(0, 12),
        value: Math.round(Number(m.value)),
        rating: String(m.rating || '').slice(0, 10),
        id: String(m.id || '').slice(0, 40),
      }));

    if (cleanMetrics.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد مقاييس صالحة' });
    }

    const entry = {
      at: Date.now(),
      path: String(pagePath || '/').slice(0, 120),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 140),
      metrics: cleanMetrics,
    };

    const buffer = webVitalsBuffer.get(companyId) || [];
    buffer.push(entry);
    while (buffer.length > WEB_VITALS_BUFFER_LIMIT) buffer.shift();
    webVitalsBuffer.set(companyId, buffer);

    console.log(
      `📈 [WebVitals] ${companyId} ${entry.path} :: ${cleanMetrics
        .map((m) => `${m.name}=${m.value}${m.rating ? `(${m.rating})` : ''}`)
        .join(' ')}`,
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error in trackWebVitals:', error);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل مقاييس الأداء' });
  }
};

const getWebVitalsSummary = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId مطلوب' });
    }

    const windowMs = 60 * 60 * 1000;
    const since = Date.now() - windowMs;
    const recent = (webVitalsBuffer.get(companyId) || []).filter((e) => e.at >= since);

    const valuesByName = {};
    for (const entry of recent) {
      for (const metric of entry.metrics) {
        (valuesByName[metric.name] = valuesByName[metric.name] || []).push(metric.value);
      }
    }

    const summary = Object.fromEntries(
      Object.entries(valuesByName).map(([name, values]) => {
        values.sort((a, b) => a - b);
        const p75Index = Math.max(0, Math.ceil(values.length * 0.75) - 1);
        return [name, { p75: values[p75Index], count: values.length }];
      }),
    );

    res.json({ success: true, windowMinutes: 60, samples: recent.length, summary });
  } catch (error) {
    console.error('Error in getWebVitalsSummary:', error);
    res.status(500).json({ success: false, message: 'خطأ في قراءة مقاييس الأداء' });
  }
};

const trackStoreVisit = async (req, res) => {
  try {
    const { sessionId, ipAddress, userAgent, referrer, landingPage } = req.body;
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId || !sessionId) {
      console.warn('⚠️ [Analytics] Missing data for store visit:', { companyId, sessionId });
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة - companyId, sessionId مطلوبة'
      });
    }

    console.log(`🏪 [Analytics] Tracking Store Visit: Session=${sessionId}, IP=${ipAddress}, Company=${companyId}`);


    const trackedVisit = await analyticsService.trackStoreVisit({
      companyId,
      sessionId,
      ipAddress,
      userAgent,
      referrer,
      landingPage
    });

    if (!trackedVisit) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    res.json({ success: true, message: 'تم تسجيل زيارة المتجر بنجاح' });
  } catch (error) {
    console.error('Error in trackStoreVisit:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الزيارة',
      error: error.message
    });
  }
};

const trackConversion = async (req, res) => {
  try {
    const { sessionId, eventType, productId, orderId, value, metadata } = req.body;
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId || !sessionId || !eventType) {
      console.warn('⚠️ [Analytics] Missing data for conversion:', { companyId, sessionId, eventType });
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة - companyId, sessionId, eventType مطلوبة'
      });
    }

    console.log(`💰 [Analytics] Tracking Conversion: Event=${eventType}, Value=${value}, Company=${companyId}`);


    const trackedEvent = await analyticsService.trackConversionEvent({
      companyId,
      sessionId,
      eventType,
      productId,
      orderId,
      value,
      metadata
    });

    if (!trackedEvent) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    res.json({ success: true, message: 'تم تسجيل حدث التحويل بنجاح' });
  } catch (error) {
    console.error('Error in trackConversion:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الحدث',
      error: error.message
    });
  }
};

const getDailyAnalytics = async (req, res) => {
  try {
    // Support both authenticated and public routes
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });

    const dailyData = await analyticsService.getDailyAnalyticsByDate(companyId, start, end);

    res.json({
      success: true,
      data: dailyData,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getDailyAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات اليومية',
      error: error.message
    });
  }
};

const getProductAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));

    const productData = await analyticsService.getProductAnalyticsByDate(companyId, start, end);

    res.json({
      success: true,
      data: productData,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getProductAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات المنتجات',
      error: error.message
    });
  }
};

const getProductSalesPerformance = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period } = req.query;
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });

    const data = await analyticsService.getProductSalesPerformance(companyId, start, end);

    res.json({
      success: true,
      data,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getProductSalesPerformance:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقرير مبيعات المنتجات',
      error: error.message
    });
  }
};

// Get Variations Analytics
const getVariationsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { startDate, endDate, period, productId } = req.query;
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period: period || '30' });

    const data = await analyticsService.getVariationsAnalytics(
      companyId,
      start,
      end,
      productId ? String(productId) : null
    );

    res.json({
      success: true,
      data,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getVariationsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل المقاسات', error: error.message });
  }
};

// Get Categories Analytics
const getCategoriesAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      order: {
        is: {
          companyId: String(companyId),
          ...(startDate && endDate ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {})
        }
      }
    };

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        }
      }
    });

    const categoriesMap = {};
    orderItems.forEach(item => {
      const category = item.product?.category?.name || item.product?.category || 'غير مصنف';
      if (!categoriesMap[category]) {
        categoriesMap[category] = {
          category,
          quantity: 0,
          revenue: 0,
          orders: 0,
          products: new Set()
        };
      }
      categoriesMap[category].quantity += item.quantity;
      categoriesMap[category].revenue += parseFloat(item.price) * item.quantity;
      categoriesMap[category].orders += 1;
      if (item.product?.name) {
        categoriesMap[category].products.add(item.product.name);
      }
    });

    const categories = Object.values(categoriesMap).map(cat => {
      const { products, ...rest } = cat;
      return {
        ...rest,
        productsCount: products.size
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
    const categoriesWithPercentage = categories.map(cat => ({
      ...cat,
      percentage: totalRevenue > 0 ? parseFloat(((cat.revenue / totalRevenue) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        categories: categoriesWithPercentage,
        totalCategories: categories.length,
        totalRevenue,
        totalQuantity: categories.reduce((sum, c) => sum + c.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error in getCategoriesAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل الأقسام', error: error.message });
  }
};

// Get Payment Methods Analytics
const getPaymentMethodsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        paymentMethod: true,
        total: true,
        status: true
      }
    });

    const methodsMap = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'غير محدد';
      if (!methodsMap[method]) {
        methodsMap[method] = {
          method,
          orders: 0,
          revenue: 0,
          completed: 0,
          cancelled: 0
        };
      }
      methodsMap[method].orders += 1;
      methodsMap[method].revenue += parseFloat(order.total);
      if (order.status === 'DELIVERED') methodsMap[method].completed += 1;
      if (order.status === 'CANCELLED') methodsMap[method].cancelled += 1;
    });

    const methods = Object.values(methodsMap);
    const totalRevenue = methods.reduce((sum, m) => sum + m.revenue, 0);
    const totalOrders = methods.reduce((sum, m) => sum + m.orders, 0);

    const methodsWithPercentage = methods.map(method => ({
      name: method.method,
      count: method.orders,
      revenue: method.revenue,
      completed: method.completed,
      cancelled: method.cancelled,
      percentage: totalOrders > 0 ? parseFloat(((method.orders / totalOrders) * 100).toFixed(2)) : 0,
      successRate: method.orders > 0 ? parseFloat(((method.completed / method.orders) * 100).toFixed(2)) : 0,
      cancellationRate: method.orders > 0 ? parseFloat(((method.cancelled / method.orders) * 100).toFixed(2)) : 0,
      averageOrderValue: method.orders > 0 ? parseFloat((method.revenue / method.orders).toFixed(2)) : 0
    })).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        methods: methodsWithPercentage,
        totalRevenue,
        totalOrders
      }
    });
  } catch (error) {
    console.error('Error in getPaymentMethodsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل طرق الدفع', error: error.message });
  }
};

// Get Regions Analytics
const getRegionsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    // Fetch orders with customer info for customer counting
    // Note: city and governorate are on Order model, not Customer model
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true
          }
        }
      }
    });

    const regionsMap = {};
    orders.forEach(order => {
      let governorate = order.governorate;
      if (!governorate && order.shippingAddress) {
        const parsed = parseJsonSafely(order.shippingAddress);
        if (parsed && typeof parsed === 'object') {
          governorate = parsed.governorate || parsed.state || parsed.region || '';
        }
      }
      const region = governorate || order.city || 'غير محدد';
      if (!regionsMap[region]) {
        regionsMap[region] = {
          region,
          orders: 0,
          revenue: 0,
          customers: new Set()
        };
      }
      regionsMap[region].orders += 1;
      regionsMap[region].revenue += parseFloat(order.total);
      if (order.customer?.id) {
        regionsMap[region].customers.add(order.customer.id);
      }
    });

    const regions = Object.values(regionsMap).map(reg => {
      const { customers, ...rest } = reg;
      return {
        ...rest,
        customersCount: customers.size,
        avgOrderValue: reg.orders > 0 ? parseFloat((reg.revenue / reg.orders).toFixed(2)) : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = regions.reduce((sum, r) => sum + r.revenue, 0);
    const regionsWithPercentage = regions.map(region => ({
      ...region,
      percentage: totalRevenue > 0 ? parseFloat(((region.revenue / totalRevenue) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        regions: regionsWithPercentage,
        totalRegions: regions.length,
        totalRevenue,
        totalOrders: regions.reduce((sum, r) => sum + r.orders, 0)
      }
    });
  } catch (error) {
    console.error('Error in getRegionsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التحليل الجغرافي', error: error.message });
  }
};

// Get Coupons Analytics
const getCouponsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    // Get all coupons
    const coupons = await prisma.coupon.findMany({
      where: {
        companyId: String(companyId)
      },
      include: {
        couponUsages: {
          where: startDate && endDate ? {
            usedAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {}
        }
      }
    });

    // Calculate stats from coupon_usages
    const couponStats = coupons.map(coupon => {
      const usages = coupon.couponUsages || [];
      const usageCount = usages.length;

      // Calculate total discount based on coupon type and value
      let totalDiscount = 0;
      if (coupon.type === 'PERCENTAGE') {
        // For percentage coupons, we need to estimate based on usage count
        // This is an approximation since we don't have order totals
        totalDiscount = usageCount * (parseFloat(coupon.value) || 0);
      } else if (coupon.type === 'FIXED') {
        totalDiscount = usageCount * (parseFloat(coupon.value) || 0);
      }

      return {
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        usageCount: usageCount,
        usageLimit: coupon.usageLimit,
        totalDiscount: totalDiscount,
        totalRevenue: 0, // Not available without order link
        orders: usageCount,
        completedOrders: usageCount, // Assume all usages are completed
        conversionRate: 100, // Assume 100% since usage means it was used
        isActive: coupon.isActive,
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        roi: 0 // Cannot calculate without revenue data
      };
    }).sort((a, b) => b.usageCount - a.usageCount);

    const totalDiscount = couponStats.reduce((sum, c) => sum + c.totalDiscount, 0);
    const totalRevenue = couponStats.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalOrders = couponStats.reduce((sum, c) => sum + c.orders, 0);

    res.json({
      success: true,
      data: {
        coupons: couponStats,
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter(c => c.isActive).length,
        totalDiscount,
        totalRevenue,
        totalOrders,
        avgDiscountPerOrder: totalOrders > 0 ? (totalDiscount / totalOrders).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error in getCouponsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل الكوبونات', error: error.message });
  }
};

// Get COD Performance Analytics
const getCODPerformanceAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      paymentMethod: 'CASH',
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const codOrders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        city: true,
        governorate: true
      }
    });

    const totalOrders = codOrders.length;
    const deliveredOrders = codOrders.filter(o => o.status === 'DELIVERED').length;
    const cancelledOrders = codOrders.filter(o => o.status === 'CANCELLED').length;
    const returnedOrders = codOrders.filter(o => o.status === 'RETURNED').length;
    const pendingOrders = codOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;

    const totalRevenue = codOrders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + parseFloat(o.total), 0);
    const lostRevenue = codOrders.filter(o => ['CANCELLED', 'RETURNED'].includes(o.status)).reduce((sum, o) => sum + parseFloat(o.total), 0);

    // Regional performance
    const regionMap = {};
    codOrders.forEach(order => {
      const region = order.governorate || order.city || 'غير محدد';
      if (!regionMap[region]) {
        regionMap[region] = { total: 0, delivered: 0, cancelled: 0 };
      }
      regionMap[region].total += 1;
      if (order.status === 'DELIVERED') regionMap[region].delivered += 1;
      if (order.status === 'CANCELLED') regionMap[region].cancelled += 1;
    });

    const regionalPerformance = Object.entries(regionMap).map(([region, stats]) => ({
      region,
      totalOrders: stats.total,
      deliveredOrders: stats.delivered,
      cancelledOrders: stats.cancelled,
      successRate: stats.total > 0 ? parseFloat(((stats.delivered / stats.total) * 100).toFixed(2)) : 0,
      cancellationRate: stats.total > 0 ? parseFloat(((stats.cancelled / stats.total) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.totalOrders - a.totalOrders);

    res.json({
      success: true,
      data: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        pendingOrders,
        successRate: totalOrders > 0 ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2)) : 0,
        cancellationRate: totalOrders > 0 ? parseFloat(((cancelledOrders / totalOrders) * 100).toFixed(2)) : 0,
        returnRate: totalOrders > 0 ? parseFloat(((returnedOrders / totalOrders) * 100).toFixed(2)) : 0,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        lostRevenue: parseFloat(lostRevenue.toFixed(2)),
        avgOrderValue: deliveredOrders > 0 ? parseFloat((totalRevenue / deliveredOrders).toFixed(2)) : 0,
        regionalPerformance: regionalPerformance.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('❌ Error in getCODPerformanceAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateRange: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        pendingOrders: 0,
        successRate: 0,
        cancellationRate: 0,
        returnRate: 0,
        totalRevenue: 0,
        lostRevenue: 0,
        avgOrderValue: 0,
        regionalPerformance: []
      },
      error: error.message
    });
  }
};

// Get Cancellation Reasons & Review Analytics
const getCancellationAnalytics = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { start, end } = parseAnalyticsDateRange(req.query || {});
    const requestedLimit = Number.parseInt(req.query?.limit, 10);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1), 500);
    const prisma = getSharedPrismaClient();
    const companyScope = String(companyId);
    const cancellationDateFilter = { gte: start, lte: end };

    const historySelect = {
      id: true,
      oldStatus: true,
      reason: true,
      changedBy: true,
      userName: true,
      createdAt: true,
    };

    const regularOrderSelect = {
      id: true,
      orderNumber: true,
      total: true,
      paymentMethod: true,
      notes: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      city: true,
      governorate: true,
      sourceType: true,
      orderSource: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    };

    const guestOrderSelect = {
      id: true,
      orderNumber: true,
      total: true,
      finalTotal: true,
      paymentMethod: true,
      notes: true,
      guestName: true,
      guestPhone: true,
      guestEmail: true,
      shippingAddress: true,
      createdAt: true,
      updatedAt: true,
    };

    const recordsByKey = new Map();
    const addRecord = (record) => {
      if (!record) {
        return;
      }

      const key = `${record.type}:${record.id}`;
      const existing = recordsByKey.get(key);
      if (
        !existing ||
        new Date(record.cancelledAt || 0).getTime() > new Date(existing.cancelledAt || 0).getTime()
      ) {
        recordsByKey.set(key, record);
      }
    };

    const cancellationHistories = await prisma.orderStatusHistory.findMany({
      where: {
        status: { in: CANCELLATION_STATUS_VALUES },
        createdAt: cancellationDateFilter,
        OR: [
          { order: { is: { companyId: companyScope } } },
          { guestOrder: { is: { companyId: companyScope } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...historySelect,
        order: { select: regularOrderSelect },
        guestOrder: { select: guestOrderSelect },
      },
    });

    cancellationHistories.forEach((history) => {
      if (history.order) {
        addRecord(buildCancellationRecord({ order: history.order, history, type: 'REGULAR' }));
      }
      if (history.guestOrder) {
        addRecord(buildCancellationRecord({ order: history.guestOrder, history, type: 'GUEST' }));
      }
    });

    const [fallbackRegularOrders, fallbackGuestOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          companyId: companyScope,
          status: 'CANCELLED',
          updatedAt: cancellationDateFilter,
        },
        select: {
          ...regularOrderSelect,
          statusHistory: {
            where: { status: { in: CANCELLATION_STATUS_VALUES } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: historySelect,
          },
        },
      }),
      prisma.guestOrder.findMany({
        where: {
          companyId: companyScope,
          status: { in: CANCELLATION_STATUS_VALUES },
          updatedAt: cancellationDateFilter,
        },
        select: {
          ...guestOrderSelect,
          OrderStatusHistory: {
            where: { status: { in: CANCELLATION_STATUS_VALUES } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: historySelect,
          },
        },
      }),
    ]);

    fallbackRegularOrders.forEach((order) => {
      addRecord(
        buildCancellationRecord({
          order,
          history: order.statusHistory?.[0] || null,
          type: 'REGULAR',
        }),
      );
    });

    fallbackGuestOrders.forEach((order) => {
      addRecord(
        buildCancellationRecord({
          order,
          history: order.OrderStatusHistory?.[0] || null,
          type: 'GUEST',
        }),
      );
    });

    const records = Array.from(recordsByKey.values());
    res.json({
      success: true,
      data: aggregateCancellationAnalytics(records, start, end, limit),
    });
  } catch (error) {
    console.error('❌ Error in getCancellationAnalytics:', error);
    res.status(200).json({
      success: true,
      data: createEmptyCancellationAnalytics(),
      error: error.message,
    });
  }
};

const getCancellationReasonSettings = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const prisma = getSharedPrismaClient();
    await ensureCancellationReasonSettingsRow(prisma, companyId);
    const reasonOptions = await readCancellationReasonOptions(prisma, companyId);

    return res.json({
      success: true,
      data: {
        reasonOptions,
      },
    });
  } catch (error) {
    console.error('❌ Error in getCancellationReasonSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تحميل أسباب الإلغاء',
      error: error.message,
    });
  }
};

const updateCancellationReasonSettings = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const reasonOptions = normalizeCancellationReasonOptions(
      req.body?.reasonOptions,
    );
    const prisma = getSharedPrismaClient();
    await ensureCancellationReasonSettingsRow(prisma, companyId);

    await prisma.$executeRawUnsafe(
      'UPDATE "order_invoice_settings" SET "cancellationReasonOptions" = $2, "updatedAt" = NOW() WHERE "companyId" = $1',
      String(companyId),
      serializeCancellationReasonOptions(reasonOptions),
    );

    const savedReasonOptions = await readCancellationReasonOptions(
      prisma,
      companyId,
    );

    return res.json({
      success: true,
      message: 'تم حفظ أسباب الإلغاء الجاهزة',
      data: {
        reasonOptions: savedReasonOptions,
      },
    });
  } catch (error) {
    console.error('❌ Error in updateCancellationReasonSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في حفظ أسباب الإلغاء',
      error: error.message,
    });
  }
};

// Get Abandoned Cart Analytics
const getAbandonedCartAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();
    const now = new Date();

    // Smart date parsing (full day bounds to prevent date truncation)
    let start = null;
    let end = null;

    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        start = s;
      }
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        end = e;
      }
    }

    // Default to last 30 days if no range provided
    if (!start && !end) {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = new Date(now.getTime());
    } else if (start && !end) {
      end = new Date(now.getTime());
    }

    const cartDateFilter = {
      updatedAt: {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {})
      }
    };

    const convDateFilter = {
      convertedAt: {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {})
      }
    };

    // Parallel fetch: current GuestCarts and converted carts from CartConversionLog
    const [guestCarts, convertedLogs] = await Promise.all([
      prisma.guestCart.findMany({
        where: {
          companyId: String(companyId),
          ...cartDateFilter
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          cartId: true,
          items: true,
          total: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          checkoutData: true,
          checkoutStartedAt: true,
          checkoutUpdatedAt: true
        }
      }),
      prisma.cartConversionLog.findMany({
        where: {
          companyId: String(companyId),
          ...convDateFilter
        },
        orderBy: { convertedAt: 'desc' },
        select: {
          id: true,
          cartId: true,
          orderId: true,
          orderNumber: true,
          cartValue: true,
          convertedAt: true,
          channel: true,
          employeeName: true,
          governorate: true
        }
      }).catch(err => {
        console.warn('⚠️ [ANALYTICS] CartConversionLog fetch non-fatal error:', err.message);
        return [];
      })
    ]);

    // Separate active carts vs abandoned (expired or inactive > 24 hours)
    const activeCarts = [];
    const abandonedCarts = [];

    guestCarts.forEach(cart => {
      const isExpired = new Date(cart.expiresAt) < now;
      const hoursSinceUpdate = (now.getTime() - new Date(cart.updatedAt).getTime()) / (1000 * 60 * 60);
      if (isExpired || hoursSinceUpdate >= 24) {
        abandonedCarts.push(cart);
      } else {
        activeCarts.push(cart);
      }
    });

    // Aggregations
    const totalAbandonedValue = abandonedCarts.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
    const totalActiveValue = activeCarts.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
    const totalRecoveredRevenue = convertedLogs.reduce((sum, log) => sum + (parseFloat(log.cartValue) || 0), 0);

    const totalCarts = guestCarts.length + convertedLogs.length;
    const abandonedCount = abandonedCarts.length;
    const convertedCount = convertedLogs.length;
    const activeCount = activeCarts.length;

    const abandonmentRate = totalCarts > 0
      ? parseFloat(((abandonedCount / totalCarts) * 100).toFixed(1))
      : 0;

    const recoveryRate = (abandonedCount + convertedCount) > 0
      ? parseFloat(((convertedCount / (abandonedCount + convertedCount)) * 100).toFixed(1))
      : 0;

    const avgCartValue = abandonedCount > 0
      ? parseFloat((totalAbandonedValue / abandonedCount).toFixed(2))
      : 0;

    // Parse items to extract top abandoned products
    const productMap = {};
    abandonedCarts.forEach(cart => {
      try {
        let items = [];
        if (typeof cart.items === 'string') {
          items = JSON.parse(cart.items || '[]');
        } else if (Array.isArray(cart.items)) {
          items = cart.items;
        }

        items.forEach(item => {
          const name = item.productName || item.name || 'منتج غير محدد';
          const price = parseFloat(item.price) || 0;
          const qty = parseInt(item.quantity) || 1;
          const key = item.productId || item.id || name;

          if (!productMap[key]) {
            productMap[key] = {
              productId: item.productId || item.id || null,
              productName: name,
              category: item.category || 'عام',
              image: item.image || item.imageUrl || null,
              price,
              abandonedCount: 0,
              lostRevenue: 0
            };
          }
          productMap[key].abandonedCount += qty;
          productMap[key].lostRevenue += price * qty;
        });
      } catch (parseError) {
        // Safe JSON parsing ignore
      }
    });

    const topAbandonedProducts = Object.values(productMap)
      .sort((a, b) => b.lostRevenue - a.lostRevenue)
      .slice(0, 10)
      .map(p => ({
        ...p,
        lostRevenue: parseFloat(p.lostRevenue.toFixed(2))
      }));

    // Funnel stages
    const reachedCheckoutCount = guestCarts.filter(c => !!c.checkoutData || !!c.checkoutStartedAt).length + convertedCount;
    const funnel = [
      { stage: 'carts_created', label: 'السلات المنشأة', count: totalCarts },
      { stage: 'reached_checkout', label: 'بدء الدفع', count: reachedCheckoutCount },
      { stage: 'abandoned', label: 'سلات مهجورة', count: abandonedCount },
      { stage: 'recovered', label: 'تم الاسترجاع', count: convertedCount }
    ];

    // Format cart item with customer info and items preview
    const formatCartItem = (cart) => {
      let checkout = {};
      try {
        if (typeof cart.checkoutData === 'string') {
          checkout = JSON.parse(cart.checkoutData || '{}');
        } else if (cart.checkoutData && typeof cart.checkoutData === 'object') {
          checkout = cart.checkoutData;
        }
      } catch (e) {}

      let itemsList = [];
      try {
        if (typeof cart.items === 'string') {
          itemsList = JSON.parse(cart.items || '[]');
        } else if (Array.isArray(cart.items)) {
          itemsList = cart.items;
        }
      } catch (e) {}

      const customerName = checkout.guestName || checkout.fullName || checkout.customerName || checkout.name || null;
      const customerPhone = checkout.guestPhone || checkout.phoneNumber || checkout.phone || checkout.mobile || null;
      const governorate = checkout.governorate || checkout.gov || checkout.city || null;

      const isExpired = new Date(cart.expiresAt) < now;
      const ageHours = (now.getTime() - new Date(cart.updatedAt).getTime()) / (1000 * 60 * 60);

      let urgencyTier = 'expired';
      if (ageHours < 2 && !isExpired) {
        urgencyTier = 'fresh'; // Golden Window (< 2h)
      } else if (ageHours < 24 && !isExpired) {
        urgencyTier = 'active'; // Incomplete / Active (< 24h)
      }

      return {
        id: cart.id,
        cartId: cart.cartId,
        customerName,
        customerPhone,
        governorate,
        itemsCount: itemsList.length,
        items: itemsList.slice(0, 5).map(item => ({
          name: item.productName || item.name || 'منتج',
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          image: item.image || item.imageUrl || null
        })),
        cartValue: parseFloat(cart.total) || 0,
        createdAt: cart.createdAt,
        lastUpdated: cart.updatedAt,
        expiresAt: cart.expiresAt,
        hasPhone: Boolean(customerPhone && String(customerPhone).trim().length >= 8),
        urgencyTier,
        hasStartedCheckout: Boolean(cart.checkoutStartedAt || cart.checkoutData)
      };
    };

    const formattedRecentCarts = [...abandonedCarts, ...activeCarts]
      .slice(0, 30)
      .map(formatCartItem);

    const formattedConverted = convertedLogs.slice(0, 15).map(log => ({
      id: log.id,
      cartId: log.cartId,
      orderId: log.orderId,
      orderNumber: log.orderNumber,
      cartValue: parseFloat(log.cartValue) || 0,
      convertedAt: log.convertedAt,
      channel: log.channel,
      employeeName: log.employeeName,
      governorate: log.governorate
    }));

    res.json({
      success: true,
      data: {
        totalCarts,
        abandonedCarts: abandonedCount,
        activeCarts: activeCount,
        convertedCarts: convertedCount,
        abandonmentRate,
        recoveryRate,
        totalCartValue: parseFloat(totalAbandonedValue.toFixed(2)),
        activeCartValue: parseFloat(totalActiveValue.toFixed(2)),
        recoveredRevenue: parseFloat(totalRecoveredRevenue.toFixed(2)),
        avgCartValue,
        funnel,
        topAbandonedProducts,
        recentAbandonedCarts: formattedRecentCarts,
        recentConverted: formattedConverted
      }
    });
  } catch (error) {
    console.error('❌ Error in getAbandonedCartAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    res.status(200).json({
      success: true,
      data: {
        totalCarts: 0,
        abandonedCarts: 0,
        activeCarts: 0,
        convertedCarts: 0,
        abandonmentRate: 0,
        recoveryRate: 0,
        totalCartValue: 0,
        activeCartValue: 0,
        recoveredRevenue: 0,
        avgCartValue: 0,
        funnel: [],
        topAbandonedProducts: [],
        recentAbandonedCarts: [],
        recentConverted: []
      },
      error: error.message
    });
  }
};

// Get Customer Quality Scoring
const getCustomerQualityAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period } = req.query;
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });
    const prisma = getSharedPrismaClient();

    const customers = await prisma.customer.findMany({
      where: {
        companyId: String(companyId)
      },
      include: {
        orders: {
          where: {
            createdAt: {
              gte: start,
              lte: end
            }
          },
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    const customerScores = customers.map(customer => {
      const orders = customer.orders;
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
      const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
      const totalSpent = orders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + parseFloat(o.total), 0);

      // Calculate recency (days since last order)
      const lastOrderDate = orders.length > 0 ? new Date(Math.max(...orders.map(o => new Date(o.createdAt)))) : null;
      const daysSinceLastOrder = lastOrderDate ? Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24)) : 999;

      // Scoring algorithm (0-100)
      let score = 0;

      // Frequency score (30 points)
      if (totalOrders >= 10) score += 30;
      else if (totalOrders >= 5) score += 20;
      else if (totalOrders >= 3) score += 10;
      else if (totalOrders >= 1) score += 5;

      // Monetary score (30 points)
      if (totalSpent >= 10000) score += 30;
      else if (totalSpent >= 5000) score += 20;
      else if (totalSpent >= 2000) score += 10;
      else if (totalSpent >= 500) score += 5;

      // Recency score (20 points)
      if (daysSinceLastOrder <= 7) score += 20;
      else if (daysSinceLastOrder <= 30) score += 15;
      else if (daysSinceLastOrder <= 90) score += 10;
      else if (daysSinceLastOrder <= 180) score += 5;

      // Completion rate score (20 points)
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) : 0;
      score += Math.floor(completionRate * 20);

      // Determine quality tier
      let tier = 'منخفض';
      if (score >= 80) tier = 'VIP';
      else if (score >= 60) tier = 'عالي';
      else if (score >= 40) tier = 'متوسط';

      return {
        customerId: customer.id,
        customerName: getCustomerDisplayName(customer) || 'عميل غير محدد',
        customerPhone: customer.phone,
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalSpent,
        avgOrderValue: completedOrders > 0 ? (totalSpent / completedOrders).toFixed(2) : 0,
        daysSinceLastOrder,
        lastOrderDate: lastOrderDate ? lastOrderDate.toISOString() : null,
        completionRate: (completionRate * 100).toFixed(2),
        score: Math.min(100, score),
        tier
      };
    }).filter(c => c.totalOrders > 0)
      .sort((a, b) => b.score - a.score);

    const totalCustomers = customerScores.length;
    const repeatCustomers = customerScores.filter(c => c.totalOrders > 1).length;
    const newCustomers = customerScores.filter(c => c.totalOrders === 1).length;
    const repeatRate = totalCustomers > 0 ? parseFloat(((repeatCustomers / totalCustomers) * 100).toFixed(1)) : 0;
    const totalRevenue = customerScores.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0);
    const totalOrdersCount = customerScores.reduce((sum, c) => sum + c.totalOrders, 0);
    const averageOrderValue = totalOrdersCount > 0 ? parseFloat((totalRevenue / totalOrdersCount).toFixed(2)) : 0;
    const customerLifetimeValue = totalCustomers > 0 ? parseFloat((totalRevenue / totalCustomers).toFixed(2)) : 0;

    const vipRevenue = customerScores.filter(c => c.tier === 'VIP').reduce((sum, c) => sum + parseFloat(c.totalSpent), 0);

    // Segment customers by tier
    const tierCounts = {
      VIP: customerScores.filter(c => c.tier === 'VIP').length,
      'عالي': customerScores.filter(c => c.tier === 'عالي').length,
      'متوسط': customerScores.filter(c => c.tier === 'متوسط').length,
      'منخفض': customerScores.filter(c => c.tier === 'منخفض').length
    };

    const topCustomers = customerScores.slice(0, 100).map(c => ({
      id: c.customerId,
      name: c.customerName,
      email: c.customerPhone,
      orders: c.totalOrders,
      totalSpent: c.totalSpent,
      lastOrderDate: c.lastOrderDate || new Date().toISOString()
    }));

    const segments = [
      { segment: 'VIP', count: tierCounts.VIP, revenue: vipRevenue },
      { segment: 'عالي', count: tierCounts['عالي'], revenue: 0 },
      { segment: 'متوسط', count: tierCounts['متوسط'], revenue: 0 },
      { segment: 'منخفض', count: tierCounts['منخفض'], revenue: 0 }
    ];

    res.json({
      success: true,
      data: {
        totalCustomers,
        repeatCustomers,
        newCustomers,
        repeatRate,
        averageOrderValue,
        customerLifetimeValue,
        topCustomers,
        segments,
        customers: customerScores.slice(0, 100),
        tierCounts,
        totalRevenue,
        vipRevenue,
        vipRevenuePercentage: totalRevenue > 0 ? parseFloat(((vipRevenue / totalRevenue) * 100).toFixed(2)) : 0,
        avgCustomerScore: customerScores.length > 0 ? parseFloat((customerScores.reduce((sum, c) => sum + c.score, 0) / customerScores.length).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Error in getCustomerQualityAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تصنيف جودة العملاء', error: error.message });
  }
};

// Get Profit Analytics with COGS
const getProfitAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      status: 'DELIVERED',
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            productVariant: {
              select: {
                cost: true,
                price: true,
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                cost: true,
                category: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalShipping = 0;
    const productProfits = {};
    const categoryProfits = {};
    const dailyProfits = {};

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      const orderTotal = parseFloat(order.total) || 0;
      const shippingCost = parseFloat(order.shipping) || 0;

      totalRevenue += orderTotal;
      totalShipping += shippingCost;

      if (!dailyProfits[orderDate]) {
        dailyProfits[orderDate] = { date: orderDate, revenue: 0, cogs: 0, profit: 0, orders: 0 };
      }
      dailyProfits[orderDate].revenue += orderTotal;
      dailyProfits[orderDate].orders += 1;

      const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
      orderItems.forEach(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const explicitCost = [
          item.productVariant?.cost,
          item.product?.cost,
          item.basePrice,
          item.merchantPrice,
        ]
          .map((value) => Number(value))
          .find((value) => Number.isFinite(value) && value >= 0);
        const costPrice = explicitCost ?? (itemPrice * 0.6);
        const itemCOGS = costPrice * item.quantity;
        const itemRevenue = itemPrice * item.quantity;
        const itemProfit = itemRevenue - itemCOGS;

        totalCOGS += itemCOGS;
        dailyProfits[orderDate].cogs += itemCOGS;
        dailyProfits[orderDate].profit += itemProfit;

        const productName = item.product?.name || item.productName || 'غير معروف';
        if (!productProfits[productName]) {
          productProfits[productName] = { name: productName, revenue: 0, cogs: 0, profit: 0, quantity: 0, margin: 0 };
        }
        productProfits[productName].revenue += itemRevenue;
        productProfits[productName].cogs += itemCOGS;
        productProfits[productName].profit += itemProfit;
        productProfits[productName].quantity += item.quantity;

        const categoryName = item.product?.category?.name || 'غير مصنف';
        if (!categoryProfits[categoryName]) {
          categoryProfits[categoryName] = { name: categoryName, revenue: 0, cogs: 0, profit: 0 };
        }
        categoryProfits[categoryName].revenue += itemRevenue;
        categoryProfits[categoryName].cogs += itemCOGS;
        categoryProfits[categoryName].profit += itemProfit;
      });
    });

    const netProfit = totalRevenue - totalCOGS - totalShipping;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    const topProducts = Object.values(productProfits)
      .map(p => ({
        ...p,
        margin: p.revenue > 0 ? parseFloat(((p.profit / p.revenue) * 100).toFixed(2)) : 0,
        revenue: parseFloat(p.revenue.toFixed(2)),
        cogs: parseFloat(p.cogs.toFixed(2)),
        profit: parseFloat(p.profit.toFixed(2))
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20);

    const categoryBreakdown = Object.values(categoryProfits)
      .map(c => ({
        ...c,
        margin: c.revenue > 0 ? parseFloat(((c.profit / c.revenue) * 100).toFixed(2)) : 0,
        revenue: parseFloat(c.revenue.toFixed(2)),
        cogs: parseFloat(c.cogs.toFixed(2)),
        profit: parseFloat(c.profit.toFixed(2))
      }))
      .sort((a, b) => b.profit - a.profit);

    const dailyData = Object.values(dailyProfits).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalCOGS: parseFloat(totalCOGS.toFixed(2)),
          totalShipping: parseFloat(totalShipping.toFixed(2)),
          grossProfit: parseFloat((totalRevenue - totalCOGS).toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          totalOrders: orders.length,
          avgOrderProfit: orders.length > 0 ? parseFloat((netProfit / orders.length).toFixed(2)) : 0
        },
        topProducts,
        categoryBreakdown,
        dailyData: dailyData.map(d => ({
          date: d.date,
          revenue: parseFloat(d.revenue.toFixed(2)),
          cogs: parseFloat(d.cogs.toFixed(2)),
          profit: parseFloat(d.profit.toFixed(2)),
          orders: d.orders
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error in getProfitAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateRange: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue: 0,
          totalCOGS: 0,
          totalShipping: 0,
          grossProfit: 0,
          netProfit: 0,
          profitMargin: 0,
          totalOrders: 0,
          avgOrderProfit: 0
        },
        topProducts: [],
        categoryBreakdown: [],
        dailyData: []
      },
      error: error.message
    });
  }
};

// Get Delivery Rate Analytics
const getDeliveryRateAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        governorate: true,
        city: true
      }
    });

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const shippedOrders = orders.filter(o => o.status === 'SHIPPED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const returnedOrders = orders.filter(o => o.status === 'RETURNED').length;

    const deliveryRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100) : 0;
    const failureRate = totalOrders > 0 ? (((cancelledOrders + returnedOrders) / totalOrders) * 100) : 0;

    // By region
    const regionStats = {};
    orders.forEach(order => {
      const region = order.governorate || order.city || 'غير محدد';
      if (!regionStats[region]) {
        regionStats[region] = { name: region, total: 0, delivered: 0, cancelled: 0, returned: 0 };
      }
      regionStats[region].total += 1;
      if (order.status === 'DELIVERED') regionStats[region].delivered += 1;
      if (order.status === 'CANCELLED') regionStats[region].cancelled += 1;
      if (order.status === 'RETURNED') regionStats[region].returned += 1;
    });

    const regionPerformance = Object.values(regionStats).map(r => ({
      ...r,
      deliveryRate: r.total > 0 ? ((r.delivered / r.total) * 100).toFixed(2) : 0
    })).sort((a, b) => b.total - a.total).slice(0, 15);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          deliveredOrders,
          shippedOrders,
          cancelledOrders,
          returnedOrders,
          deliveryRate: deliveryRate.toFixed(2),
          failureRate: failureRate.toFixed(2),
          pendingOrders: totalOrders - deliveredOrders - cancelledOrders - returnedOrders
        },
        regionPerformance
      }
    });
  } catch (error) {
    console.error('Error in getDeliveryRateAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل التسليم', error: error.message });
  }
};

// Get Order Status Time Analytics
const getOrderStatusTimeAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    // Get orders with status history
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        statusHistory: {
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            status: true,
            createdAt: true
          }
        }
      }
    });

    const statusTimes = {
      pendingToConfirmed: [],
      confirmedToShipped: [],
      shippedToDelivered: [],
      totalProcessing: []
    };

    // Calculate times based on status history
    orders.forEach(order => {
      const createdAt = new Date(order.createdAt);
      const history = order.statusHistory || [];

      let confirmedTime = null;
      let shippedTime = null;
      let deliveredTime = null;

      history.forEach(h => {
        const status = h.status?.toLowerCase();
        if (status === 'confirmed' && !confirmedTime) {
          confirmedTime = new Date(h.createdAt);
        } else if (status === 'shipped' && !shippedTime) {
          shippedTime = new Date(h.createdAt);
        } else if (status === 'delivered' && !deliveredTime) {
          deliveredTime = new Date(h.createdAt);
        }
      });

      if (confirmedTime) {
        const hoursToConfirm = (confirmedTime - createdAt) / (1000 * 60 * 60);
        if (hoursToConfirm >= 0 && hoursToConfirm < 720) {
          statusTimes.pendingToConfirmed.push(hoursToConfirm);
        }
      }

      if (confirmedTime && shippedTime) {
        const hoursToShip = (shippedTime - confirmedTime) / (1000 * 60 * 60);
        if (hoursToShip >= 0 && hoursToShip < 720) {
          statusTimes.confirmedToShipped.push(hoursToShip);
        }
      }

      if (shippedTime && deliveredTime) {
        const hoursToDeliver = (deliveredTime - shippedTime) / (1000 * 60 * 60);
        if (hoursToDeliver >= 0 && hoursToDeliver < 720) {
          statusTimes.shippedToDelivered.push(hoursToDeliver);
        }
      }

      if (deliveredTime) {
        const totalHours = (deliveredTime - createdAt) / (1000 * 60 * 60);
        if (totalHours >= 0 && totalHours < 720) {
          statusTimes.totalProcessing.push(totalHours);
        }
      }
    });

    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    // Status distribution
    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        avgTimes: {
          pendingToConfirmed: calcAvg(statusTimes.pendingToConfirmed).toFixed(2),
          confirmedToShipped: calcAvg(statusTimes.confirmedToShipped).toFixed(2),
          shippedToDelivered: calcAvg(statusTimes.shippedToDelivered).toFixed(2),
          totalProcessing: calcAvg(statusTimes.totalProcessing).toFixed(2)
        },
        sampleSizes: {
          pendingToConfirmed: statusTimes.pendingToConfirmed.length,
          confirmedToShipped: statusTimes.confirmedToShipped.length,
          shippedToDelivered: statusTimes.shippedToDelivered.length,
          totalProcessing: statusTimes.totalProcessing.length
        },
        statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          percentage: orders.length > 0 ? ((count / orders.length) * 100).toFixed(2) : 0
        })),
        totalOrders: orders.length
      }
    });
  } catch (error) {
    console.error('Error in getOrderStatusTimeAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل وقت الحالات', error: error.message });
  }
};

// Get Product Health Score
const getProductHealthScore = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const products = await prisma.product.findMany({
      where: { companyId: String(companyId), isActive: true },
      include: {
        orderItems: {
          where: {
            order: {
              ...(startDate && endDate ? {
                createdAt: {
                  gte: new Date(startDate),
                  lte: new Date(endDate)
                }
              } : {})
            }
          },
          include: {
            order: {
              select: { status: true, createdAt: true }
            },
            productVariant: {
              select: { cost: true }
            }
          }
        },
        category: { select: { name: true } }
      }
    });

    const productScores = products.map(product => {
      const orderItems = product.orderItems || [];
      const totalOrders = orderItems.length;
      const deliveredOrders = orderItems.filter(i => i.order?.status === 'DELIVERED').length;
      const cancelledOrders = orderItems.filter(i => i.order?.status === 'CANCELLED').length;
      const returnedOrders = orderItems.filter(i => i.order?.status === 'RETURNED').length;

      const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0);
      const revenue = orderItems
        .filter(i => i.order?.status === 'DELIVERED')
        .reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);

      const deliveredCost = orderItems
        .filter(i => i.order?.status === 'DELIVERED')
        .reduce((sum, i) => {
          const itemPrice = parseFloat(i.price) || 0;
          const explicitCost = [
            i.productVariant?.cost,
            product.cost,
            i.basePrice,
            i.merchantPrice,
          ]
            .map((value) => Number(value))
            .find((value) => Number.isFinite(value) && value >= 0);
          return sum + ((explicitCost ?? (itemPrice * 0.6)) * i.quantity);
        }, 0);
      const profit = revenue - deliveredCost;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

      const deliveryRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100) : 0;
      const returnRate = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100) : 0;
      const stock = product.stock || 0;

      // Health Score Algorithm (0-100)
      let score = 0;

      // Sales volume (25 points)
      if (totalQuantity >= 100) score += 25;
      else if (totalQuantity >= 50) score += 20;
      else if (totalQuantity >= 20) score += 15;
      else if (totalQuantity >= 5) score += 10;
      else if (totalQuantity >= 1) score += 5;

      // Profit margin (25 points)
      if (profitMargin >= 40) score += 25;
      else if (profitMargin >= 30) score += 20;
      else if (profitMargin >= 20) score += 15;
      else if (profitMargin >= 10) score += 10;
      else if (profitMargin > 0) score += 5;

      // Delivery rate (25 points)
      if (deliveryRate >= 90) score += 25;
      else if (deliveryRate >= 80) score += 20;
      else if (deliveryRate >= 70) score += 15;
      else if (deliveryRate >= 60) score += 10;
      else if (deliveryRate > 0) score += 5;

      // Stock health (25 points)
      if (stock >= 50) score += 25;
      else if (stock >= 20) score += 20;
      else if (stock >= 10) score += 15;
      else if (stock >= 5) score += 10;
      else if (stock > 0) score += 5;

      // Determine recommendation
      let recommendation = 'مراجعة';
      let status = 'warning';
      if (score >= 80) { recommendation = 'توسعة'; status = 'excellent'; }
      else if (score >= 60) { recommendation = 'استمرار'; status = 'good'; }
      else if (score >= 40) { recommendation = 'تحسين'; status = 'average'; }
      else if (score < 20 && totalOrders > 5) { recommendation = 'إيقاف'; status = 'poor'; }

      return {
        productId: product.id,
        productName: product.name,
        category: product.category?.name || 'غير مصنف',
        price: product.price,
        stock,
        totalOrders,
        totalQuantity,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        revenue,
        profit: profit.toFixed(2),
        profitMargin: profitMargin.toFixed(2),
        deliveryRate: deliveryRate.toFixed(2),
        returnRate: returnRate.toFixed(2),
        score,
        recommendation,
        status
      };
    }).filter(p => p.totalOrders > 0 || p.stock > 0)
      .sort((a, b) => b.score - a.score);

    const statusCounts = {
      excellent: productScores.filter(p => p.status === 'excellent').length,
      good: productScores.filter(p => p.status === 'good').length,
      average: productScores.filter(p => p.status === 'average').length,
      warning: productScores.filter(p => p.status === 'warning').length,
      poor: productScores.filter(p => p.status === 'poor').length
    };

    res.json({
      success: true,
      data: {
        products: productScores.slice(0, 50),
        totalProducts: productScores.length,
        statusCounts,
        avgScore: productScores.length > 0 ? (productScores.reduce((sum, p) => sum + p.score, 0) / productScores.length).toFixed(2) : 0,
        productsNeedingAttention: productScores.filter(p => p.status === 'poor' || p.status === 'warning').slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error in getProductHealthScore:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقييم صحة المنتجات', error: error.message });
  }
};

// Get Return & Refund Analytics
const getReturnAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    // Handle date parameters - if startDate is a simple number (days), calculate actual dates
    let dateFilter = {};
    if (startDate && endDate) {
      try {
        // Check if startDate is a plain days-number (no hyphens, no 'T') vs an ISO date string
        const isDaysNumber = /^\d+$/.test(startDate);
        if (isDaysNumber && parseInt(startDate) > 0) {
          const now = new Date();
          const start = new Date(now.getTime() - (parseInt(startDate) * 24 * 60 * 60 * 1000));
          dateFilter = {
            createdAt: {
              gte: start,
              lte: now
            }
          };
        } else {
          // Treat as actual dates
          dateFilter = {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          };
        }
      } catch (err) {
        console.error('Date parsing error:', err);
      }
    }

    const whereClause = {
      companyId: String(companyId),
      status: { in: ['RETURNED', 'REFUNDED'] },
      ...dateFilter
    };

    const returnedOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {  // ✅ FIXED: Was 'items', now 'orderItems' (correct relation from schema)
          include: {
            product: { select: { name: true, category: { select: { name: true } } } }
          }
        }
      }
    });

    const totalOrders = await prisma.order.count({
      where: {
        companyId: String(companyId),
        ...dateFilter
      }
    });

    const totalReturns = returnedOrders.length;
    const returnRate = totalOrders > 0 ? ((totalReturns / totalOrders) * 100) : 0;
    const totalLostRevenue = returnedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // By product - with safe null checks
    const productReturns = {};
    returnedOrders.forEach(order => {
      // Safe access to orderItems (was 'items')
      const items = order.orderItems || [];

      items.forEach(item => {
        const productName = item.product?.name || item.productName || 'غير معروف';
        if (!productReturns[productName]) {
          productReturns[productName] = { name: productName, returns: 0, lostRevenue: 0 };
        }
        productReturns[productName].returns += item.quantity || 0;
        productReturns[productName].lostRevenue += (parseFloat(item.price) || 0) * (item.quantity || 0);
      });
    });

    // By region - with safe null checks and fallbacks
    const regionReturns = {};
    returnedOrders.forEach(order => {
      const region = order.governorate || order.city || 'غير محدد';

      if (!regionReturns[region]) {
        regionReturns[region] = { name: region, returns: 0, lostRevenue: 0 };
      }
      regionReturns[region].returns += 1;
      regionReturns[region].lostRevenue += parseFloat(order.total) || 0;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalReturns,
          returnRate: parseFloat(returnRate.toFixed(2)),
          totalLostRevenue: parseFloat(totalLostRevenue.toFixed(2)),
          avgReturnValue: totalReturns > 0 ? parseFloat((totalLostRevenue / totalReturns).toFixed(2)) : 0
        },
        topReturnedProducts: Object.values(productReturns)
          .map(p => ({
            ...p,
            lostRevenue: parseFloat(p.lostRevenue.toFixed(2))
          }))
          .sort((a, b) => b.returns - a.returns)
          .slice(0, 10),
        returnsByRegion: Object.values(regionReturns)
          .map(r => ({
            ...r,
            lostRevenue: parseFloat(r.lostRevenue.toFixed(2))
          }))
          .sort((a, b) => b.returns - a.returns)
          .slice(0, 10)
      }
    });
  } catch (error) {
    console.error('❌ Error in getReturnAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders: 0,
          totalReturns: 0,
          returnRate: 0,
          totalLostRevenue: 0,
          avgReturnValue: 0
        },
        topReturnedProducts: [],
        returnsByRegion: []
      },
      error: error.message
    });
  }
};

// تحليل أسباب المرتجعات (التوزيع حسب السبب والتصنيف والحالة والمنتج مع اتجاه يومي)
const createEmptyReturnReasonsAnalytics = () => ({
  summary: {
    totalReturns: 0,
    totalOrders: 0,
    returnRate: 0,
    totalRefundValue: 0,
    avgReturnValue: 0,
    withReasonCount: 0,
    withoutReasonCount: 0,
    resolvedCount: 0,
    resolutionRate: 0,
    topReason: null,
    topCategory: null,
  },
  reasonBreakdown: [],
  categoryBreakdown: [],
  statusBreakdown: [],
  dailyTrend: [],
  byProduct: [],
  recentReturns: [],
});

const aggregateReturnReasonsAnalytics = (requests, start, end, limit) => {
  const totalReturns = requests.length;
  const totalRefundValue = requests.reduce(
    (sum, request) => sum + toAnalyticsAmount(request.refundAmount ?? request.order?.total ?? 0),
    0,
  );

  const reasonMap = new Map();
  const categoryMap = new Map();
  const statusMap = new Map();
  const productMap = new Map();
  const dailyMap = new Map();

  for (let current = new Date(start); current <= end; current = new Date(current.getTime() + ANALYTICS_DAY_MS)) {
    const key = current.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, count: 0, refundAmount: 0 });
  }

  const resolvedStatuses = new Set(['COMPLETED', 'APPROVED']);

  requests.forEach((request) => {
    const reasonId = request.returnReason?.id || 'without-reason';
    const reasonName = request.returnReason?.reason?.trim() || 'بدون سبب محدد';
    const categoryName = request.returnReason?.returnReasonCategory?.name?.trim() || 'غير مصنف';
    const status = request.status || 'PENDING';
    const refund = toAnalyticsAmount(request.refundAmount ?? request.order?.total ?? 0);
    const dateKey = toAnalyticsDateKey(request.createdAt) || new Date(start).toISOString().slice(0, 10);

    if (!reasonMap.has(reasonId)) {
      reasonMap.set(reasonId, {
        id: reasonId,
        reason: reasonName,
        category: categoryName,
        count: 0,
        refundAmount: 0,
        latestAt: null,
      });
    }
    const reasonRow = reasonMap.get(reasonId);
    reasonRow.count += 1;
    reasonRow.refundAmount += refund;
    if (!reasonRow.latestAt || new Date(request.createdAt) > new Date(reasonRow.latestAt)) {
      reasonRow.latestAt = toIsoDateTime(request.createdAt);
    }

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, { category: categoryName, count: 0, refundAmount: 0 });
    }
    const categoryRow = categoryMap.get(categoryName);
    categoryRow.count += 1;
    categoryRow.refundAmount += refund;

    statusMap.set(status, (statusMap.get(status) || 0) + 1);

    const dailyRow = dailyMap.get(dateKey);
    if (dailyRow) {
      dailyRow.count += 1;
      dailyRow.refundAmount += refund;
    }

    const items = request.order?.orderItems || [];
    items.forEach((item) => {
      const productName = item.product?.name || item.productName || 'منتج غير معروف';
      if (!productMap.has(productName)) {
        productMap.set(productName, { product: productName, count: 0, refundAmount: 0 });
      }
      const productRow = productMap.get(productName);
      productRow.count += item.quantity || 1;
      productRow.refundAmount += (refund * (item.quantity || 1)) / Math.max(items.length, 1);
    });
  });

  const withoutReasonCount = reasonMap.get('without-reason')?.count || 0;
  const withReasonCount = Math.max(totalReturns - withoutReasonCount, 0);
  const resolvedCount = requests.filter((request) => resolvedStatuses.has(request.status)).length;

  const reasonBreakdown = Array.from(reasonMap.values())
    .map((row) => ({
      ...row,
      percentage: totalReturns > 0 ? roundAnalyticsNumber((row.count / totalReturns) * 100) : 0,
      refundAmount: roundAnalyticsNumber(row.refundAmount),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  const categoryBreakdown = Array.from(categoryMap.values())
    .map((row) => ({
      ...row,
      percentage: totalReturns > 0 ? roundAnalyticsNumber((row.count / totalReturns) * 100) : 0,
      refundAmount: roundAnalyticsNumber(row.refundAmount),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: totalReturns > 0 ? roundAnalyticsNumber((count / totalReturns) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const dailyTrend = Array.from(dailyMap.values()).map((row) => ({
    ...row,
    refundAmount: roundAnalyticsNumber(row.refundAmount),
  }));

  const byProduct = Array.from(productMap.values())
    .map((row) => ({ ...row, refundAmount: roundAnalyticsNumber(row.refundAmount) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topReasonRow = reasonBreakdown[0] || null;
  const topCategoryRow = categoryBreakdown[0] || null;

  return {
    summary: {
      totalReturns,
      totalOrders: 0,
      returnRate: 0,
      totalRefundValue: roundAnalyticsNumber(totalRefundValue),
      avgReturnValue: totalReturns > 0 ? roundAnalyticsNumber(totalRefundValue / totalReturns) : 0,
      withReasonCount,
      withoutReasonCount,
      resolvedCount,
      resolutionRate: totalReturns > 0 ? roundAnalyticsNumber((resolvedCount / totalReturns) * 100) : 0,
      topReason: topReasonRow
        ? { reason: topReasonRow.reason, count: topReasonRow.count, percentage: topReasonRow.percentage }
        : null,
      topCategory: topCategoryRow
        ? { category: topCategoryRow.category, count: topCategoryRow.count, percentage: topCategoryRow.percentage }
        : null,
    },
    reasonBreakdown,
    categoryBreakdown,
    statusBreakdown,
    dailyTrend,
    byProduct,
    recentReturns: [],
  };
};

const getReturnReasonsAnalytics = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { start, end } = parseAnalyticsDateRange(req.query || {});
    const requestedLimit = Number.parseInt(req.query?.limit, 10);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 12, 1), 50);
    const prisma = getSharedPrismaClient();
    const companyScope = String(companyId);

    const whereClause = {
      companyId: companyScope,
      createdAt: { gte: start, lte: end },
    };

    const categoryFilter = String(req.query?.categoryId || '').trim();
    const categoryNameFilter = String(req.query?.category || '').trim();
    const statusFilter = String(req.query?.status || '').trim();
    if (categoryFilter) {
      whereClause.returnReason = { is: { categoryId: categoryFilter } };
    } else if (categoryNameFilter) {
      whereClause.returnReason = {
        is: { returnReasonCategory: { is: { name: categoryNameFilter } } },
      };
    }
    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    const [requests, totalOrders] = await Promise.all([
      prisma.returnRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 2000,
        include: {
          returnReason: {
            include: {
              returnReasonCategory: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              governorate: true,
              city: true,
              orderItems: {
                select: {
                  quantity: true,
                  price: true,
                  productName: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      }),
      prisma.order.count({
        where: { companyId: companyScope, createdAt: { gte: start, lte: end } },
      }),
    ]);

    const data = aggregateReturnReasonsAnalytics(requests, start, end, limit);
    data.summary.totalOrders = totalOrders;
    data.summary.returnRate = totalOrders > 0 ? roundAnalyticsNumber((requests.length / totalOrders) * 100) : 0;

    data.recentReturns = requests.slice(0, 20).map((request) => ({
      id: request.id,
      orderNumber: request.order?.orderNumber || request.orderId,
      customerName: [request.customer?.firstName, request.customer?.lastName].filter(Boolean).join(' ') || 'عميل غير محدد',
      customerPhone: request.customer?.phone || '',
      region: request.order?.governorate || request.order?.city || 'غير محدد',
      total: roundAnalyticsNumber(request.order?.total ?? 0),
      refundAmount: roundAnalyticsNumber(request.refundAmount ?? request.order?.total ?? 0),
      reason: request.returnReason?.reason?.trim() || 'بدون سبب محدد',
      category: request.returnReason?.returnReasonCategory?.name?.trim() || 'غير مصنف',
      status: request.status,
      receivedStatus: request.receivedStatus,
      createdAt: toIsoDateTime(request.createdAt),
      reviewUrl: `/returns?highlight=${encodeURIComponent(request.id)}`,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error in getReturnReasonsAnalytics:', error);
    res.status(200).json({
      success: true,
      data: createEmptyReturnReasonsAnalytics(),
      error: error.message,
    });
  }
};

// تحليل تنفيذ المنتجات (تسليم / إلغاء / مرتجع) لكل منتج اتطلب في الفترة
const getProductFulfillmentAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period } = req.query;
    const prisma = getSharedPrismaClient();
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          is: {
            companyId: String(companyId),
            createdAt: { gte: start, lte: end }
          }
        }
      },
      select: {
        quantity: true,
        price: true,
        total: true,
        productId: true,
        productName: true,
        productSku: true,
        productImage: true,
        order: {
          select: {
            id: true,
            status: true
          }
        },
        product: {
          select: {
            name: true,
            sku: true,
            mainImage: true
          }
        }
      }
    });

    const productMap = {};
    const distinctOrders = new Set();

    orderItems.forEach(item => {
      const orderId = item.order?.id;
      if (orderId) distinctOrders.add(orderId);
      const status = (item.order?.status || 'PENDING').toUpperCase().trim();

      const key = item.productId || item.product?.name || item.productName || item.productSku || 'unknown';
      const name = item.product?.name || item.productName || 'منتج غير معروف';
      const sku = item.product?.sku || item.productSku || null;
      const image = item.product?.mainImage || item.productImage || null;

      if (!productMap[key]) {
        productMap[key] = {
          productId: item.productId || null,
          productName: name,
          productSku: sku,
          productImage: image,
          totalItems: 0,
          totalQuantity: 0,
          totalRevenue: 0,
          deliveredItems: 0,
          deliveredQuantity: 0,
          deliveredRevenue: 0,
          cancelledItems: 0,
          cancelledQuantity: 0,
          cancelledRevenue: 0,
          returnedItems: 0,
          returnedQuantity: 0,
          returnedRevenue: 0,
          otherItems: 0,
          deliveredOrders: new Set(),
          cancelledOrders: new Set(),
          returnedOrders: new Set()
        };
      }

      const row = productMap[key];
      const quantity = item.quantity || 0;
      const revenue = parseFloat(item.total) || (parseFloat(item.price) || 0) * quantity || 0;

      row.totalItems += 1;
      row.totalQuantity += quantity;
      row.totalRevenue += revenue;

      if (DELIVERED_ORDER_STATUSES.has(status)) {
        row.deliveredItems += 1;
        row.deliveredQuantity += quantity;
        row.deliveredRevenue += revenue;
        if (orderId) row.deliveredOrders.add(orderId);
      } else if (CANCELLED_ORDER_STATUSES.has(status)) {
        row.cancelledItems += 1;
        row.cancelledQuantity += quantity;
        row.cancelledRevenue += revenue;
        if (orderId) row.cancelledOrders.add(orderId);
      } else if (RETURNED_ORDER_STATUSES.has(status) || ['PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'RETURNED_TO_COMPANY'].includes(status)) {
        row.returnedItems += 1;
        row.returnedQuantity += quantity;
        row.returnedRevenue += revenue;
        if (orderId) row.returnedOrders.add(orderId);
      } else {
        row.otherItems += 1;
      }
    });

    const products = Object.values(productMap)
      .map(row => {
        const total = row.totalItems;
        const delivered = row.deliveredItems;
        const cancelled = row.cancelledItems;
        const returned = row.returnedItems;
        const lostRevenue = row.cancelledRevenue + row.returnedRevenue;

        return {
          productId: row.productId,
          productName: row.productName,
          productSku: row.productSku,
          productImage: row.productImage,
          totalItems: row.totalItems,
          totalQuantity: row.totalQuantity,
          totalRevenue: round2(row.totalRevenue),
          deliveredItems: delivered,
          deliveredQuantity: row.deliveredQuantity,
          deliveredRevenue: round2(row.deliveredRevenue),
          cancelledItems: cancelled,
          cancelledQuantity: row.cancelledQuantity,
          returnedItems: returned,
          returnedQuantity: row.returnedQuantity,
          otherItems: row.otherItems,
          deliveredOrders: row.deliveredOrders.size,
          cancelledOrders: row.cancelledOrders.size,
          returnedOrders: row.returnedOrders.size,
          deliveryRate: pct(delivered, total),
          cancellationRate: pct(cancelled, total),
          returnRate: pct(returned, total),
          lostRevenue: round2(lostRevenue)
        };
      })
      .filter(p => p.totalItems > 0)
      .sort((a, b) => b.totalItems - a.totalItems);

    const totalItems = products.reduce((sum, p) => sum + p.totalItems, 0);
    const deliveredItems = products.reduce((sum, p) => sum + p.deliveredItems, 0);
    const cancelledItems = products.reduce((sum, p) => sum + p.cancelledItems, 0);
    const returnedItems = products.reduce((sum, p) => sum + p.returnedItems, 0);
    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    const deliveredRevenue = products.reduce((sum, p) => sum + p.deliveredRevenue, 0);
    const lostRevenue = products.reduce((sum, p) => sum + p.lostRevenue, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalOrders: distinctOrders.size,
          totalItems,
          totalQuantity: products.reduce((sum, p) => sum + p.totalQuantity, 0),
          deliveredItems,
          cancelledItems,
          returnedItems,
          pendingItems: totalItems - deliveredItems - cancelledItems - returnedItems,
          deliveryRate: pct(deliveredItems, totalItems),
          cancellationRate: pct(cancelledItems, totalItems),
          returnRate: pct(returnedItems, totalItems),
          totalRevenue: round2(totalRevenue),
          deliveredRevenue: round2(deliveredRevenue),
          lostRevenue: round2(lostRevenue)
        },
        products
      }
    });
  } catch (error) {
    console.error('Error in getProductFulfillmentAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل تنفيذ المنتجات', error: error.message });
  }
};

const round2 = (value) => {
  const num = Number(value) || 0;
  return Math.round(num * 100) / 100;
};

const pct = (part, total) => {
  if (!total || !part) return 0;
  return Math.round((part / total) * 1000) / 10;
};

const normalizeGovName = (name) => {
  if (!name) return 'غير محدد';
  const n = String(name).trim().toLowerCase();
  if (n === 'cairo' || n === 'القاهرة') return 'القاهرة';
  if (n === 'giza' || n === 'الجيزة') return 'الجيزة';
  if (n === 'alexandria' || n === 'alex' || n === 'الإسكندرية' || n === 'الاسكندرية') return 'الإسكندرية';
  if (n === 'dakahlia' || n === 'الدقهلية' || n === 'mansoura' || n === 'المنصورة') return 'الدقهلية';
  if (n === 'sharqia' || n === 'الشرقية' || n === 'zagazig' || n === 'الزقازيق') return 'الشرقية';
  if (n === 'gharbia' || n === 'الغربية' || n === 'tanta' || n === 'طنطا') return 'الغربية';
  if (n === 'qalyubia' || n === 'القليوبية') return 'القليوبية';
  if (n === 'monufia' || n === 'المنوفية') return 'المنوفية';
  if (n === 'beheira' || n === 'البحيرة') return 'البحيرة';
  if (n === 'kafr el-sheikh' || n === 'كفر الشيخ') return 'كفر الشيخ';
  if (n === 'damietta' || n === 'دمياط') return 'دمياط';
  if (n === 'port said' || n === 'بورسعيد') return 'بورسعيد';
  if (n === 'ismailia' || n === 'الإسماعيلية') return 'الإسماعيلية';
  if (n === 'suez' || n === 'السويس') return 'السويس';
  if (n === 'fayoum' || n === 'الفيوم') return 'الفيوم';
  if (n === 'beni suef' || n === 'بني سويف') return 'بني سويف';
  if (n === 'minya' || n === 'المنيا') return 'المنيا';
  if (n === 'assiut' || n === 'أسيوط') return 'أسيوط';
  if (n === 'sohag' || n === 'سوهاج') return 'سوهاج';
  if (n === 'qena' || n === 'قنا') return 'قنا';
  if (n === 'luxor' || n === 'الأقصر') return 'الأقصر';
  if (n === 'aswan' || n === 'أسوان') return 'أسوان';
  if (n === 'red sea' || n === 'البحر الأحمر') return 'البحر الأحمر';
  if (n === 'matrouh' || n === 'مطروح') return 'مطروح';
  if (n === 'new valley' || n === 'الوادي الجديد') return 'الوادي الجديد';
  if (n === 'north sinai' || n === 'شمال سيناء') return 'شمال سيناء';
  if (n === 'south sinai' || n === 'جنوب سيناء') return 'جنوب سيناء';
  return String(name).trim();
};

// 🚚 تحليل أداء التسليم والمرتجعات اللوجستي (الشحنات الفعلية، فروع الشحن، المحافظات، أسباب المرتجع، استرداد المخزون)
const getDeliveryReturnsLogisticsAnalytics = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period } = req.query;
    const prisma = getSharedPrismaClient();
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period: period || '30' });

    const orders = await prisma.order.findMany({
      where: {
        companyId: String(companyId),
        createdAt: { gte: start, lte: end }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customStatusCode: true,
        metadata: true,
        total: true,
        subtotal: true,
        shipping: true,
        governorate: true,
        city: true,
        turboShipmentId: true,
        turboShipmentStatus: true,
        turboTrackingNumber: true,
        turboBranchName: true,
        turboCaptainName: true,
        turboReturnReason: true,
        turboDelayReason: true,
        createdAt: true,
        orderItems: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productSku: true,
            productImage: true,
            quantity: true,
            price: true,
            total: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                mainImage: true
              }
            }
          }
        },
        returnRequests: {
          select: {
            id: true,
            status: true,
            receivedStatus: true,
            refundAmount: true,
            returnReason: {
              select: {
                reason: true,
                returnReasonCategory: { select: { name: true } }
              }
            }
          }
        },
        shipments: {
          select: {
            id: true,
            status: true,
            carrierType: true,
            cost: true,
            destinationGovernorate: true,
            shippingCompany: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    let totalOrders = orders.length;
    let preDispatchCancelledCount = 0;
    let preDispatchPendingCount = 0;

    let totalShipped = 0;
    let deliveredOrders = 0;
    let returnedOrders = 0;
    let inTransitOrders = 0;

    let codDeliveredRevenue = 0;
    let lostShippingCost = 0;
    let returnedInventoryValue = 0;
    let inTransitRevenue = 0;

    let restockedCount = 0;
    let pendingWithCarrierCount = 0;
    let restockedValue = 0;
    let pendingCarrierValue = 0;

    const branchMap = {};
    const governorateMap = {};
    const returnReasonMap = {};
    const productReturnMap = {};
    const dailyMap = {};

    orders.forEach(order => {
      const effectiveStatus = computeEffectiveOrderStatus(order);
      const turboStatus = String(order.turboShipmentStatus || '').toUpperCase().trim();
      const statusUpper = String(order.status || '').toUpperCase().trim();

      const totalVal = parseFloat(order.total) || 0;
      const subtotalVal = parseFloat(order.subtotal) || totalVal;
      const shippingVal = parseFloat(order.shipping) || (order.shipments?.[0]?.cost ? parseFloat(order.shipments[0].cost) : 0) || 0;

      const hasShipment = (order.shipments && order.shipments.length > 0) || Boolean(order.turboShipmentId) || Boolean(order.turboTrackingNumber);
      const isShippedStage = [
        'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED',
        'RETURNED', 'PARTIALLY_RETURNED', 'RETURNED_TO_COMPANY',
        'REFUNDED', 'PARTIALLY_REFUNDED', 'DELAYED_WITH_CAPTAIN', 'LOST'
      ].includes(effectiveStatus) || [
        'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED',
        'RETURNED', 'PARTIALLY_RETURNED', 'RETURNED_TO_COMPANY',
        'REFUNDED', 'PARTIALLY_REFUNDED'
      ].includes(statusUpper);

      const isDispatched = hasShipment || isShippedStage;

      if (!isDispatched) {
        if (['CANCELLED', 'DUPLICATE_ORDER', 'TRASH'].includes(effectiveStatus)) {
          preDispatchCancelledCount += 1;
        } else {
          preDispatchPendingCount += 1;
        }
        return;
      }

      // Shipped cohort
      totalShipped += 1;

      const isDelivered = ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(effectiveStatus) ||
                          ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(statusUpper) ||
                          turboStatus.includes('DELIVERED');

      const isReturned = !isDelivered && (
        ['RETURNED', 'PARTIALLY_RETURNED', 'RETURNED_TO_COMPANY', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(effectiveStatus) ||
        ['RETURNED', 'PARTIALLY_RETURNED', 'RETURNED_TO_COMPANY', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(statusUpper) ||
        turboStatus.includes('RETURN') ||
        (order.returnRequests && order.returnRequests.length > 0)
      );

      const isInTransit = !isDelivered && !isReturned;

      // Branch / Carrier attribution
      const branchName = (order.turboBranchName || order.shipments?.[0]?.shippingCompany?.name || (order.turboShipmentId ? 'شركة Turbo' : 'شحن داخلي / مناديب')).trim();
      if (!branchMap[branchName]) {
        branchMap[branchName] = {
          name: branchName,
          totalShipped: 0,
          delivered: 0,
          returned: 0,
          inTransit: 0,
          codCollected: 0,
          lostShipping: 0
        };
      }
      branchMap[branchName].totalShipped += 1;

      // Governorate attribution
      const rawGov = (order.governorate || order.city || 'غير محدد').trim();
      const govName = normalizeGovName(rawGov);
      if (!governorateMap[govName]) {
        governorateMap[govName] = {
          name: govName,
          totalShipped: 0,
          delivered: 0,
          returned: 0,
          inTransit: 0,
          codCollected: 0
        };
      }
      governorateMap[govName].totalShipped += 1;

      // Daily trend
      const dayKey = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : 'other';
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { date: dayKey, shipped: 0, delivered: 0, returned: 0, inTransit: 0 };
      }
      dailyMap[dayKey].shipped += 1;

      if (isDelivered) {
        deliveredOrders += 1;
        codDeliveredRevenue += totalVal;
        branchMap[branchName].delivered += 1;
        branchMap[branchName].codCollected += totalVal;
        governorateMap[govName].delivered += 1;
        governorateMap[govName].codCollected += totalVal;
        dailyMap[dayKey].delivered += 1;
      } else if (isReturned) {
        returnedOrders += 1;
        const estShip = shippingVal > 0 ? shippingVal : 45;
        lostShippingCost += estShip;
        returnedInventoryValue += subtotalVal;
        branchMap[branchName].returned += 1;
        branchMap[branchName].lostShipping += estShip;
        governorateMap[govName].returned += 1;
        dailyMap[dayKey].returned += 1;

        // Reason
        let foundReason = order.turboReturnReason || order.turboDelayReason;
        if (!foundReason && order.returnRequests?.length > 0) {
          foundReason = order.returnRequests[0].returnReason?.reason || order.returnRequests[0].returnReason?.returnReasonCategory?.name;
        }
        const reasonKey = (foundReason || 'رفض أو عدم استلام بدون سبب').trim();
        if (!returnReasonMap[reasonKey]) {
          returnReasonMap[reasonKey] = { reason: reasonKey, count: 0, lostValue: 0 };
        }
        returnReasonMap[reasonKey].count += 1;
        returnReasonMap[reasonKey].lostValue += totalVal;

        // Physical restock
        const isBackInWarehouse = effectiveStatus === 'RETURNED_TO_COMPANY' ||
                                  statusUpper === 'RETURNED_TO_COMPANY' ||
                                  turboStatus === 'RETURNED_TO_COMPANY' ||
                                  order.returnRequests?.some(r => r.receivedStatus === 'RECEIVED' || r.receivedStatus === 'RESTOCKED');
        if (isBackInWarehouse) {
          restockedCount += 1;
          restockedValue += subtotalVal;
        } else {
          pendingWithCarrierCount += 1;
          pendingCarrierValue += subtotalVal;
        }

        // Product level return
        (order.orderItems || []).forEach(item => {
          const pKey = item.productId || item.product?.name || item.productName || 'unknown';
          const pName = item.product?.name || item.productName || 'منتج غير معروف';
          const pImage = item.product?.mainImage || item.productImage || null;
          const pSku = item.product?.sku || item.productSku || null;

          if (!productReturnMap[pKey]) {
            productReturnMap[pKey] = {
              productId: item.productId,
              productName: pName,
              productSku: pSku,
              productImage: pImage,
              shippedQuantity: 0,
              returnedQuantity: 0,
              lostRevenue: 0
            };
          }
          productReturnMap[pKey].returnedQuantity += (item.quantity || 1);
          productReturnMap[pKey].lostRevenue += (parseFloat(item.total) || (parseFloat(item.price) || 0) * (item.quantity || 1) || 0);
        });
      } else {
        inTransitOrders += 1;
        inTransitRevenue += totalVal;
        branchMap[branchName].inTransit += 1;
        governorateMap[govName].inTransit += 1;
        dailyMap[dayKey].inTransit += 1;
      }

      // Shipped quantity
      (order.orderItems || []).forEach(item => {
        const pKey = item.productId || item.product?.name || item.productName || 'unknown';
        const pName = item.product?.name || item.productName || 'منتج غير معروف';
        const pImage = item.product?.mainImage || item.productImage || null;
        const pSku = item.product?.sku || item.productSku || null;

        if (!productReturnMap[pKey]) {
          productReturnMap[pKey] = {
            productId: item.productId,
            productName: pName,
            productSku: pSku,
            productImage: pImage,
            shippedQuantity: 0,
            returnedQuantity: 0,
            lostRevenue: 0
          };
        }
        productReturnMap[pKey].shippedQuantity += (item.quantity || 1);
      });
    });

    const closedOrders = deliveredOrders + returnedOrders;
    const closedDeliveryRate = pct(deliveredOrders, closedOrders);
    const closedReturnRate = pct(returnedOrders, closedOrders);
    const shippedDeliveryRate = pct(deliveredOrders, totalShipped);
    const returnRate = pct(returnedOrders, totalShipped);
    const inTransitRate = pct(inTransitOrders, totalShipped);
    const stockRecoveryRate = pct(restockedCount, returnedOrders);

    const branches = Object.values(branchMap).map(b => {
      const closed = b.delivered + b.returned;
      return {
        ...b,
        deliveryRate: pct(b.delivered, closed > 0 ? closed : b.totalShipped),
        closedReturnRate: pct(b.returned, closed > 0 ? closed : b.totalShipped),
        returnRate: pct(b.returned, b.totalShipped),
        codCollected: round2(b.codCollected),
        lostShipping: round2(b.lostShipping)
      };
    }).sort((a, b) => b.totalShipped - a.totalShipped);

    const governorates = Object.values(governorateMap).map(g => {
      const closed = g.delivered + g.returned;
      return {
        ...g,
        deliveryRate: pct(g.delivered, closed > 0 ? closed : g.totalShipped),
        closedReturnRate: pct(g.returned, closed > 0 ? closed : g.totalShipped),
        returnRate: pct(g.returned, g.totalShipped),
        codCollected: round2(g.codCollected)
      };
    }).sort((a, b) => b.totalShipped - a.totalShipped);

    const returnReasons = Object.values(returnReasonMap).map(r => ({
      ...r,
      percentage: pct(r.count, returnedOrders),
      lostValue: round2(r.lostValue)
    })).sort((a, b) => b.count - a.count);

    const topReturnedProducts = Object.values(productReturnMap)
      .filter(p => p.returnedQuantity > 0)
      .map(p => ({
        ...p,
        returnRate: pct(p.returnedQuantity, p.shippedQuantity),
        lostRevenue: round2(p.lostRevenue)
      }))
      .sort((a, b) => b.returnedQuantity - a.returnedQuantity)
      .slice(0, 10);

    const dailyTrends = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          preDispatchCancelledCount,
          preDispatchPendingCount,
          totalShipped,
          deliveredOrders,
          returnedOrders,
          inTransitOrders,
          closedOrders,
          closedDeliveryRate,
          closedReturnRate,
          shippedDeliveryRate,
          returnRate,
          inTransitRate,
          codDeliveredRevenue: round2(codDeliveredRevenue),
          lostShippingCost: round2(lostShippingCost),
          returnedInventoryValue: round2(returnedInventoryValue),
          inTransitRevenue: round2(inTransitRevenue),
          restockedCount,
          pendingWithCarrierCount,
          restockedValue: round2(restockedValue),
          pendingCarrierValue: round2(pendingCarrierValue),
          stockRecoveryRate
        },
        branches,
        governorates,
        returnReasons,
        restockStatus: {
          restockedCount,
          pendingWithCarrierCount,
          restockedValue: round2(restockedValue),
          pendingCarrierValue: round2(pendingCarrierValue),
          stockRecoveryRate
        },
        topReturnedProducts,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Error in getDeliveryReturnsLogisticsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليلات التسليم والمرتجعات اللوجستية', error: error.message });
  }
};

// Get Team Performance Analytics
const getTeamPerformanceAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period } = req.query;
    const prisma = getSharedPrismaClient();

    // Smart date handling
    let whereClause = {
      companyId: String(companyId)
    };

    if (startDate || endDate || period) {
      try {
        const { start, end } = parseAnalyticsDateRange({
          startDate,
          endDate,
          period: period || '30'
        });
        whereClause.createdAt = {
          gte: start,
          lte: end
        };
      } catch (err) {
        console.error('Date parsing error:', err);
      }
    }

    const users = await prisma.user.findMany({
      where: { companyId: String(companyId), isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        total: true,
        createdBy: true,
        confirmedBy: true,
        createdAt: true
      }
    });

    const userPerformance = {};
    users.forEach(user => {
      userPerformance[user.id] = {
        userId: user.id,
        userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        email: user.email,
        role: user.role,
        ordersCreated: 0,
        ordersConfirmed: 0,
        totalRevenue: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        successfulOrders: 0,
        confirmedSuccessfulOrders: 0
      };
    });

    const CONFIRMED_OR_FULFILLED_STATUSES = new Set([
      'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
      'READY_TO_SHIP', 'READY_FOR_PROCESSING', 'SCHEDULED',
      'OUT_FOR_DELIVERY', 'PREPARING', 'READY', 'PACKAGED',
      'EXCHANGED', 'PARTIALLY_DELIVERED', 'WOO_TAGHEZ'
    ]);
    const CANCELLED_STATUSES = new Set(['CANCELLED', 'DUPLICATE_ORDER', 'FAILED', 'REJECTED']);

    orders.forEach(order => {
      const orderAmount = parseFloat(order.total) || 0;
      const isConfirmedOrDelivered = CONFIRMED_OR_FULFILLED_STATUSES.has(order.status);
      const isDelivered = order.status === 'DELIVERED';
      const isCancelled = CANCELLED_STATUSES.has(order.status);

      if (order.createdBy && userPerformance[order.createdBy]) {
        userPerformance[order.createdBy].ordersCreated += 1;
        if (isConfirmedOrDelivered) {
          userPerformance[order.createdBy].totalRevenue += orderAmount;
          userPerformance[order.createdBy].successfulOrders += 1;
        }
        if (isDelivered) {
          userPerformance[order.createdBy].deliveredOrders += 1;
        }
        if (isCancelled) {
          userPerformance[order.createdBy].cancelledOrders += 1;
        }
      }

      if (order.confirmedBy && userPerformance[order.confirmedBy]) {
        userPerformance[order.confirmedBy].ordersConfirmed += 1;
        if (isConfirmedOrDelivered) {
          userPerformance[order.confirmedBy].confirmedSuccessfulOrders += 1;
        }
        // If order has no internal creator (e.g. from storefront/chat), attribute revenue and success to confirmer
        if (!order.createdBy || !userPerformance[order.createdBy]) {
          if (isConfirmedOrDelivered) {
            userPerformance[order.confirmedBy].totalRevenue += orderAmount;
            userPerformance[order.confirmedBy].successfulOrders += 1;
          }
          if (isDelivered) {
            userPerformance[order.confirmedBy].deliveredOrders += 1;
          }
          if (isCancelled) {
            userPerformance[order.confirmedBy].cancelledOrders += 1;
          }
        }
      }
    });

    const teamStats = Object.values(userPerformance)
      .filter(u => u.ordersCreated > 0 || u.ordersConfirmed > 0)
      .map(u => {
        const totalActivity = u.ordersCreated > 0 ? u.ordersCreated : u.ordersConfirmed;
        const relevantSuccess = u.ordersCreated > 0
          ? (u.successfulOrders > 0 ? u.successfulOrders : u.deliveredOrders)
          : (u.confirmedSuccessfulOrders > 0 ? u.confirmedSuccessfulOrders : u.successfulOrders);
        const successRate = totalActivity > 0
          ? parseFloat(Math.min(100, (relevantSuccess / totalActivity) * 100).toFixed(2))
          : 0;
        const avgDivisor = u.successfulOrders > 0 ? u.successfulOrders : (u.deliveredOrders > 0 ? u.deliveredOrders : u.confirmedSuccessfulOrders);
        const avgOrderValue = avgDivisor > 0
          ? parseFloat((u.totalRevenue / avgDivisor).toFixed(2))
          : 0;

        return {
          userId: u.userId,
          userName: u.userName,
          email: u.email,
          role: u.role,
          ordersCreated: u.ordersCreated,
          ordersConfirmed: u.ordersConfirmed,
          totalRevenue: parseFloat(u.totalRevenue.toFixed(2)),
          deliveredOrders: u.deliveredOrders,
          cancelledOrders: u.cancelledOrders,
          successRate,
          avgOrderValue
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      success: true,
      data: {
        teamMembers: teamStats,
        totalTeamMembers: teamStats.length,
        totalOrdersProcessed: orders.length,
        totalTeamRevenue: parseFloat(teamStats.reduce((sum, u) => sum + u.totalRevenue, 0).toFixed(2))
      }
    });
  } catch (error) {
    console.error('❌ Error in getTeamPerformanceAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        teamMembers: [],
        totalTeamMembers: 0,
        totalOrdersProcessed: 0,
        totalTeamRevenue: 0
      },
      error: error.message
    });
  }
};

// Get Funnel Analytics
const getFunnelAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;
    const prisma = getSharedPrismaClient();
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });
    const createdAtFilter = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };
    const visitedAtFilter = {
      visitedAt: {
        gte: start,
        lte: end,
      },
    };

    const [
      storeVisits,
      productViews,
      addToCarts,
      startedOrders,
      orderSnapshots,
    ] = await Promise.all([
      prisma.storeVisit.count({
        where: { companyId: String(companyId), ...visitedAtFilter },
      }),
      prisma.productVisit.count({
        where: { companyId: String(companyId), ...visitedAtFilter },
      }),
      prisma.conversionEvent.count({
        where: { companyId: String(companyId), eventType: 'add_to_cart', ...createdAtFilter },
      }),
      prisma.conversionEvent.count({
        where: { companyId: String(companyId), eventType: 'checkout', ...createdAtFilter },
      }),
      analyticsService.getAnalyticsOrderSnapshots(String(companyId), start, end),
    ]);

    const purchases =
      orderSnapshots.regularOrders.length + orderSnapshots.supplementalGuestOrders.length;
    const deliveredOrders = [
      ...orderSnapshots.regularOrders,
      ...orderSnapshots.supplementalGuestOrders,
    ].filter((order) => String(order?.status || '').trim().toUpperCase() === 'DELIVERED').length;

    const funnelSteps = [
      { key: 'visits', step: 'زيارات المتجر', count: storeVisits, rate: 100 },
      {
        key: 'views',
        step: 'مشاهدات المنتجات',
        count: productViews,
        rate: storeVisits > 0 ? ((productViews / storeVisits) * 100) : 0,
      },
      {
        key: 'started_orders',
        step: 'بدء الطلب',
        count: startedOrders,
        rate: productViews > 0 ? ((startedOrders / productViews) * 100) : 0,
      },
      {
        key: 'purchases',
        step: 'إتمام الطلب',
        count: purchases,
        rate: startedOrders > 0
          ? ((purchases / startedOrders) * 100)
          : (productViews > 0 ? ((purchases / productViews) * 100) : (storeVisits > 0 ? ((purchases / storeVisits) * 100) : 0)),
      },
      {
        key: 'delivered',
        step: 'تسليم ناجح',
        count: deliveredOrders,
        rate: purchases > 0 ? ((deliveredOrders / purchases) * 100) : 0,
      },
    ];

    // Storefront conversion rate is based on orders placed vs visits
    const overallConversionRate = storeVisits > 0 ? ((purchases / storeVisits) * 100) : 0;
    const deliveryRate = purchases > 0 ? ((deliveredOrders / purchases) * 100) : 0;

    // Find biggest drop-off within the shopping funnel (visits -> views -> checkout -> purchase)
    let biggestDropOff = { from: '', to: '', dropRate: 0 };
    for (let i = 0; i < funnelSteps.length - 2; i++) {
      if (funnelSteps[i].count > 0) {
        const dropRate = 100 - ((funnelSteps[i + 1].count / funnelSteps[i].count) * 100);
        if (dropRate > biggestDropOff.dropRate) {
          biggestDropOff = {
            from: funnelSteps[i].step,
            to: funnelSteps[i + 1].step,
            dropRate: dropRate
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        funnelSteps: funnelSteps.map(s => ({
          ...s,
          rate: parseFloat(s.rate.toFixed(2))
        })),
        supportingSignals: {
          addToCarts,
        },
        overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        deliveredOrders,
        purchases,
        biggestDropOff: {
          ...biggestDropOff,
          dropRate: parseFloat(biggestDropOff.dropRate.toFixed(2))
        }
      },
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('❌ Error in getFunnelAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate, period: req.query.period }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        funnelSteps: [
          { key: 'visits', step: 'زيارات المتجر', count: 0, rate: 0 },
          { key: 'views', step: 'مشاهدات المنتجات', count: 0, rate: 0 },
          { key: 'started_orders', step: 'بدء الطلب', count: 0, rate: 0 },
          { key: 'purchases', step: 'إتمام الطلب', count: 0, rate: 0 },
          { key: 'delivered', step: 'تسليم ناجح', count: 0, rate: 0 }
        ],
        supportingSignals: {
          addToCarts: 0,
        },
        overallConversionRate: 0,
        biggestDropOff: { from: '', to: '', dropRate: 0 }
      },
      error: error.message
    });
  }
};

// Get Stock Forecast Analytics
const getStockForecastAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const prisma = getSharedPrismaClient();

    // Get products with their sales in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await prisma.product.findMany({
      where: { companyId: String(companyId), isActive: true },
      select: {
        id: true,
        name: true,
        stock: true
      }
    });

    // Get orders first
    const orders = await prisma.order.findMany({
      where: {
        companyId: String(companyId),
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] }
      },
      select: {
        id: true
      }
    });

    const orderIds = orders.map(o => o.id);

    // Get order items for these orders
    const orderItems = await prisma.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
        productId: { not: null }
      },
      select: {
        productId: true,
        quantity: true
      }
    });

    // Group order items by product
    const salesByProduct = {};
    orderItems.forEach(item => {
      if (!salesByProduct[item.productId]) {
        salesByProduct[item.productId] = 0;
      }
      salesByProduct[item.productId] += item.quantity;
    });

    const stockForecasts = products.map(product => {
      const totalSold = salesByProduct[product.id] || 0;
      const dailyAvgSales = totalSold / 30;
      const monthlyAvgSales = totalSold;
      const currentStock = product.stock || 0;
      const daysUntilStockout = dailyAvgSales > 0 ? Math.floor(currentStock / dailyAvgSales) : 999;

      let urgency = 'safe';
      if (daysUntilStockout <= 7) urgency = 'critical';
      else if (daysUntilStockout <= 14) urgency = 'warning';
      else if (daysUntilStockout <= 30) urgency = 'moderate';

      const suggestedReorder = Math.ceil(dailyAvgSales * 30);

      return {
        id: product.id,
        name: product.name,
        stock: currentStock,
        threshold: 10, // Default threshold
        salesVelocity: parseFloat(dailyAvgSales.toFixed(2)),
        avgSales: parseFloat(monthlyAvgSales.toFixed(2)),
        totalSoldLast30Days: totalSold,
        dailyAvgSales: parseFloat(dailyAvgSales.toFixed(2)),
        daysUntilStockout,
        urgency,
        suggestedReorder
      };
    }).filter(p => p.totalSoldLast30Days > 0 || p.stock > 0);

    // Categorize products
    const lowStockProducts = stockForecasts.filter(p => p.stock > 0 && p.stock <= p.threshold);
    const outOfStockProducts = stockForecasts.filter(p => p.stock === 0);
    const fastMovingProducts = stockForecasts
      .filter(p => p.salesVelocity > 0)
      .sort((a, b) => b.salesVelocity - a.salesVelocity)
      .slice(0, 20);
    const overstockedProducts = stockForecasts
      .filter(p => p.stock > 0 && p.avgSales > 0 && (p.stock / p.avgSales) > 3)
      .sort((a, b) => (b.stock / b.avgSales) - (a.stock / a.avgSales))
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        lowStockProducts,
        fastMovingProducts,
        overstockedProducts,
        totalLowStock: lowStockProducts.length,
        totalOutOfStock: outOfStockProducts.length,
        forecasts: stockForecasts.slice(0, 50),
        summary: {
          totalProducts: stockForecasts.length,
          criticalCount: stockForecasts.filter(p => p.urgency === 'critical').length,
          warningCount: stockForecasts.filter(p => p.urgency === 'warning').length,
          safeCount: stockForecasts.filter(p => p.urgency === 'safe').length
        }
      }
    });
  } catch (error) {
    console.error('Error in getStockForecastAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب توقعات المخزون', error: error.message });
  }
};

const getCampaignAttributionAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const {
      startDate,
      endDate,
      period = '30',
      source,
      platform,
      trackingType,
      channel,
      search,
    } = req.query;
    const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period });

    const orders = await getSharedPrismaClient().order.findMany({
      where: {
        companyId,
        createdAt: { gte: start, lte: end },
        status: { notIn: ['DRAFT', 'TRASH'] },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        metadata: true,
        conversationId: true,
        sourceType: true,
        extractionMethod: true,
        conversation: {
          select: {
            id: true,
            channel: true,
            metadata: true,
          },
        },
      },
    });

    const allOrders = orders.map((order) => {
      const metadata = parseJsonSafely(order.metadata);
      const attribution = buildOrderAttributionSnapshot(metadata, order);
      const total = Number.parseFloat(String(order.total || 0));
      const safeTotal = Number.isFinite(total) ? total : 0;
      const safeStatus = normalizeAttributionText(order.status, 'PENDING');
      const createdAtDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
      const createdAtKey = createdAtDate.toISOString().slice(0, 10);
      const searchText = [
        order.orderNumber,
        attribution.channel,
        attribution.platform,
        attribution.source,
        attribution.medium,
        attribution.campaignId,
        attribution.campaignName,
        attribution.adSetId,
        attribution.adId,
        attribution.adRef,
        attribution.postId,
        attribution.content,
        attribution.term,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: safeStatus,
        total: safeTotal,
        createdAt: createdAtDate,
        createdAtKey,
        delivered: DELIVERED_ORDER_STATUSES.has(safeStatus),
        cancelled: CANCELLED_ORDER_STATUSES.has(safeStatus),
        returned: RETURNED_ORDER_STATUSES.has(safeStatus),
        searchText,
        ...attribution,
      };
    });

    const sourceFilter = normalizeAttributionText(source).toLowerCase();
    const platformFilter = normalizeAttributionText(platform).toLowerCase();
    const trackingTypeFilter = normalizeAttributionText(trackingType).toLowerCase();
    const channelFilter = normalizeAttributionText(channel).toLowerCase();
    const searchFilter = normalizeAttributionText(search).toLowerCase();

    const filteredOrders = allOrders.filter((order) => {
      if (channelFilter && channelFilter !== 'all' && order.channel !== channelFilter) {
        return false;
      }

      if (sourceFilter && sourceFilter !== 'all' && order.source !== sourceFilter) {
        return false;
      }

      if (platformFilter && platformFilter !== 'all' && order.platform !== platformFilter) {
        return false;
      }

      if (
        trackingTypeFilter &&
        trackingTypeFilter !== 'all' &&
        order.trackingType !== trackingTypeFilter
      ) {
        return false;
      }

      if (searchFilter && !order.searchText.includes(searchFilter)) {
        return false;
      }

      return true;
    });

    const summary = filteredOrders.reduce(
      (accumulator, order) => {
        accumulator.totalOrders += 1;
        accumulator.totalRevenue += order.total;

        if (order.channel === 'inbox') {
          accumulator.inboxOrders += 1;
          accumulator.inboxRevenue += order.total;
        } else {
          accumulator.storefrontOrders += 1;
          accumulator.storefrontRevenue += order.total;
        }

        if (order.trackingType !== 'unattributed') {
          accumulator.trackedOrders += 1;
        }

        if (order.trackingType === 'campaign') {
          accumulator.campaignTaggedOrders += 1;
        }

        if (order.trackingType === 'direct') {
          accumulator.directOrders += 1;
        }

        if (order.trackingType === 'unattributed') {
          accumulator.unattributedOrders += 1;
        }

        if (order.delivered) {
          accumulator.deliveredOrders += 1;
          accumulator.deliveredRevenue += order.total;
        }

        if (order.cancelled) {
          accumulator.cancelledOrders += 1;
        }

        if (order.returned) {
          accumulator.returnedOrders += 1;
        }

        return accumulator;
      },
      {
        totalOrders: 0,
        storefrontOrders: 0,
        inboxOrders: 0,
        storefrontRevenue: 0,
        inboxRevenue: 0,
        trackedOrders: 0,
        campaignTaggedOrders: 0,
        directOrders: 0,
        unattributedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        totalRevenue: 0,
        deliveredRevenue: 0,
      },
    );

    summary.totalRevenue = roundAnalyticsNumber(summary.totalRevenue);
    summary.storefrontRevenue = roundAnalyticsNumber(summary.storefrontRevenue);
    summary.inboxRevenue = roundAnalyticsNumber(summary.inboxRevenue);
    summary.deliveredRevenue = roundAnalyticsNumber(summary.deliveredRevenue);
    summary.averageOrderValue =
      summary.totalOrders > 0
        ? roundAnalyticsNumber(summary.totalRevenue / summary.totalOrders)
        : 0;
    summary.trackingCoverage =
      summary.totalOrders > 0
        ? roundAnalyticsNumber((summary.trackedOrders / summary.totalOrders) * 100)
        : 0;
    summary.deliveryRate =
      summary.totalOrders > 0
        ? roundAnalyticsNumber((summary.deliveredOrders / summary.totalOrders) * 100)
        : 0;

    const campaignRowsMap = new Map();
    const sourceBreakdownMap = new Map();
    const platformBreakdownMap = new Map();
    const trendMap = new Map();

    filteredOrders.forEach((order) => {
      const rowKey = [
        order.channel,
        order.trackingType,
        order.platform,
        order.source,
        order.medium,
        order.campaignId || '-',
        order.campaignName || '-',
        order.adSetId || '-',
        order.adId || '-',
      ].join('::');

      if (!campaignRowsMap.has(rowKey)) {
        campaignRowsMap.set(rowKey, {
          key: rowKey,
          channel: order.channel,
          trackingType: order.trackingType,
          platform: order.platform,
          source: order.source,
          medium: order.medium,
          campaignId: order.campaignId || null,
          campaignName:
            order.campaignName ||
            (order.trackingType === 'direct'
              ? 'Direct / بدون حملة'
              : order.trackingType === 'unattributed'
                ? 'غير منسوب'
                : 'بدون اسم حملة'),
          adSetId: order.adSetId || null,
          adId: order.adId || null,
          adRef: order.adRef || null,
          postId: order.postId || null,
          pageId: order.pageId || null,
          content: order.content || null,
          term: order.term || null,
          landingPath: order.landingPath || null,
          referrer: order.referrer || null,
          capturedAt: order.capturedAt || null,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
          totalRevenue: 0,
          deliveredRevenue: 0,
        });
      }

      const row = campaignRowsMap.get(rowKey);
      row.totalOrders += 1;
      row.totalRevenue += order.total;
      if (order.delivered) {
        row.deliveredOrders += 1;
        row.deliveredRevenue += order.total;
      }
      if (order.cancelled) {
        row.cancelledOrders += 1;
      }
      if (order.returned) {
        row.returnedOrders += 1;
      }

      if (!sourceBreakdownMap.has(order.source)) {
        sourceBreakdownMap.set(order.source, {
          source: order.source,
          orders: 0,
          deliveredOrders: 0,
          revenue: 0,
        });
      }

      const sourceRow = sourceBreakdownMap.get(order.source);
      sourceRow.orders += 1;
      sourceRow.revenue += order.total;
      if (order.delivered) {
        sourceRow.deliveredOrders += 1;
      }

      if (!platformBreakdownMap.has(order.platform)) {
        platformBreakdownMap.set(order.platform, {
          platform: order.platform,
          orders: 0,
          revenue: 0,
        });
      }

      const platformRow = platformBreakdownMap.get(order.platform);
      platformRow.orders += 1;
      platformRow.revenue += order.total;

      if (!trendMap.has(order.createdAtKey)) {
        trendMap.set(order.createdAtKey, {
          date: order.createdAtKey,
          totalOrders: 0,
          trackedOrders: 0,
          campaignOrders: 0,
          revenue: 0,
          deliveredRevenue: 0,
        });
      }

      const trendRow = trendMap.get(order.createdAtKey);
      trendRow.totalOrders += 1;
      trendRow.revenue += order.total;
      if (order.trackingType !== 'unattributed') {
        trendRow.trackedOrders += 1;
      }
      if (order.trackingType === 'campaign') {
        trendRow.campaignOrders += 1;
      }
      if (order.delivered) {
        trendRow.deliveredRevenue += order.total;
      }
    });

    const rows = Array.from(campaignRowsMap.values())
      .map((row) => ({
        ...row,
        totalRevenue: roundAnalyticsNumber(row.totalRevenue),
        deliveredRevenue: roundAnalyticsNumber(row.deliveredRevenue),
        averageOrderValue:
          row.totalOrders > 0 ? roundAnalyticsNumber(row.totalRevenue / row.totalOrders) : 0,
        deliveredRate:
          row.totalOrders > 0
            ? roundAnalyticsNumber((row.deliveredOrders / row.totalOrders) * 100)
            : 0,
      }))
      .sort((left, right) => {
        if (right.totalRevenue !== left.totalRevenue) {
          return right.totalRevenue - left.totalRevenue;
        }

        return right.totalOrders - left.totalOrders;
      });

    const sourceBreakdown = Array.from(sourceBreakdownMap.values())
      .map((row) => ({
        ...row,
        revenue: roundAnalyticsNumber(row.revenue),
        share:
          summary.totalOrders > 0
            ? roundAnalyticsNumber((row.orders / summary.totalOrders) * 100)
            : 0,
      }))
      .sort((left, right) => right.orders - left.orders);

    const platformBreakdown = Array.from(platformBreakdownMap.values())
      .map((row) => ({
        ...row,
        revenue: roundAnalyticsNumber(row.revenue),
        share:
          summary.totalOrders > 0
            ? roundAnalyticsNumber((row.orders / summary.totalOrders) * 100)
            : 0,
      }))
      .sort((left, right) => right.orders - left.orders);

    const trend = Array.from(trendMap.values())
      .map((row) => ({
        ...row,
        revenue: roundAnalyticsNumber(row.revenue),
        deliveredRevenue: roundAnalyticsNumber(row.deliveredRevenue),
      }))
      .sort((left, right) => left.date.localeCompare(right.date));

    const availableFilters = {
      channels: ['all', 'storefront', 'inbox'],
      sources: [...new Set(allOrders.map((order) => order.source))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
      platforms: [...new Set(allOrders.map((order) => order.platform))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
      trackingTypes: [...new Set(allOrders.map((order) => order.trackingType))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    };

    res.json({
      success: true,
      data: {
        summary,
        rows,
        sourceBreakdown,
        platformBreakdown,
        trend,
        availableFilters,
        appliedFilters: {
          channel: channelFilter || 'all',
          source: sourceFilter || 'all',
          platform: platformFilter || 'all',
          trackingType: trackingTypeFilter || 'all',
          search: searchFilter,
        },
      },
      period: { start, end, days: period },
    });
  } catch (error) {
    console.error('Error in getCampaignAttributionAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تحليل الحملات',
      error: error.message,
    });
  }
};

// ==================== Public Analytics Endpoints ====================

const getPublicStoreAnalytics = async (req, res) => {
  try {
    // Get companyId from header (used in Storefront)
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب في الـ header'
      });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const analytics = await analyticsService.getStoreAnalytics(companyId, start, end);

    res.json({
      success: true,
      data: analytics,
      period: { start, end, days: period }
    });
    return;
  } catch (error) {
    console.error('Error in getPublicStoreAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
};

const getPublicTopProducts = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب في الـ header'
      });
    }

    const { startDate, endDate, period = '30', limit = 10 } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const topProducts = await analyticsService.getTopPerformingProducts(
      companyId,
      start,
      end,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topProducts,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getPublicTopProducts:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أفضل المنتجات',
      error: error.message
    });
  }
};

const getPublicDailyAnalytics = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب في الـ header'
      });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const dailyAnalytics = await analyticsService.getDailyAnalyticsByDate(companyId, start, end);

    res.json({
      success: true,
      data: dailyAnalytics,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getPublicDailyAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات اليومية',
      error: error.message
    });
  }
};

// Get Available Order Statuses
const getAvailableStatuses = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { statusType } = req.query;
    const prisma = getSharedPrismaClient();

    let finalStatuses = [];

    if (statusType === 'order' || statusType === 'order,preparation' || !statusType) {
      const { DEFAULT_ORDER_STATUSES, DEFAULT_PREPARATION_STATUSES } = require('./orderStatusController');
      
      // 1. Get standard order statuses
      const standardMap = new Map();
      if (DEFAULT_ORDER_STATUSES) {
        DEFAULT_ORDER_STATUSES.forEach(s => standardMap.set(s.code, s));
      }

      // 1b. Get standard preparation statuses (for status-summary to include Stock Shortage etc.)
      if (DEFAULT_PREPARATION_STATUSES) {
        DEFAULT_PREPARATION_STATUSES.forEach(s => standardMap.set(s.code, s));
      }

      // 2. Get statuses configured in the DB for this company (both order and preparation)
      const dbStatuses = await prisma.orderStatusConfig.findMany({
        where: {
          companyId: String(companyId),
          isActive: true,
          statusType: { in: ['order', 'preparation'] }
        },
        select: {
          code: true,
          name: true,
          nameEn: true,
          color: true,
          icon: true,
          sortOrder: true
        }
      });
      dbStatuses.forEach(s => standardMap.set(s.code, s));

      // 3. Get any distinct statuses actually used in orders to catch unconfigured ones
      const usedStatuses = await prisma.order.findMany({
        where: { companyId: String(companyId) },
        select: { status: true },
        distinct: ['status']
      });

      usedStatuses.forEach(s => {
        if (!standardMap.has(s.status)) {
          standardMap.set(s.status, {
            code: s.status,
            name: s.status, // Fallback to code as name
            nameEn: s.status,
            sortOrder: 99
          });
        }
      });

      finalStatuses = Array.from(standardMap.values()).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
    } else {
      // Fallback for other status types
      finalStatuses = await prisma.orderStatusConfig.findMany({
        where: {
          companyId: String(companyId),
          isActive: true,
          statusType: String(statusType)
        },
        select: {
          code: true,
          name: true,
          nameEn: true,
          color: true,
          icon: true,
          sortOrder: true
        },
        orderBy: { sortOrder: 'asc' }
      });
    }

    res.json({
      success: true,
      data: finalStatuses
    });
  } catch (error) {
    console.error('Error in getAvailableStatuses:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب حالات الطلب', error: error.message });
  }
};

// Get Status Summary Report (aggregate per status)
const getStatusSummaryReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { statuses, startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    if (!statuses) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار حالة واحدة على الأقل' });
    }

    const statusCodes = String(statuses).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (statusCodes.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار حالة واحدة على الأقل' });
    }

    // 🛡️ PRODUCTION-FIX (analytics-custom-status): اقبل أكواد الـ enum + الحالات
    // المخصصة النشطة للشركة — بدل فلتر ORDER_STATUS_VALUES اللي كان بيرمي المخصصة
    // بصمت (وكان ناقصه PENDING_CANCELLATION كمان).
    const filteredStatusCodes = await resolveAnalyticsStatusCodes(prisma, companyId, statusCodes);

    if (filteredStatusCodes.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد حالات طلب صالحة للفلترة' });
    }

    const companyTimezone = req.company?.timezone || req.user?.company?.timezone || EGYPT_TIMEZONE;
    const dateRangeFilter = buildDateRangeFilter(startDate, endDate, companyTimezone);

    // Build date conditions for raw SQL (Timezone-aware end-of-day alignment)
    const dateConditions = [];
    const queryParams = [String(companyId)];
    if (dateRangeFilter.gte) {
      dateConditions.push(`o."createdAt" >= $${queryParams.length + 1}`);
      queryParams.push(dateRangeFilter.gte);
    }
    if (dateRangeFilter.lte) {
      dateConditions.push(`o."createdAt" <= $${queryParams.length + 1}`);
      queryParams.push(dateRangeFilter.lte);
    }
    const dateClause = dateConditions.length ? dateConditions.join(' AND ') : 'TRUE';

    // Build status placeholders
    const statusPlaceholders = filteredStatusCodes.map((_, i) => `$${queryParams.length + 1 + i}`).join(', ');
    queryParams.push(...filteredStatusCodes);

    // 🛡️ PRODUCTION-FIX (analytics-unify): نفس تعبير الحالة الفعلية الموحّد بتاع
    // صفحة الطلبات (كود مخصص ← تجهيز محوّلة ← enum) — كان COALESCE خام غير محوّل
    // فنفس الطلب كان بيتحسب بشكل مختلف في التحليلات عن صفحة الطلبات.
    const orders = await prisma.$queryRawUnsafe(`
      SELECT o.id, o.status, o."customStatusCode", o.metadata, o.shipping, o."createdAt",
             ${effectiveOrderStatusSql('o')} AS effective_status,
             oi.oi_quantity, oi.oi_total
      FROM "orders" o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(oi_inner.quantity), 0)::int AS oi_quantity,
               COALESCE(SUM(oi_inner.total), 0)::numeric AS oi_total
        FROM "order_items" oi_inner
        WHERE oi_inner."orderId" = o.id
      ) oi ON true
      WHERE o."companyId" = $1
        AND ${dateClause}
        AND ${effectiveOrderStatusSql('o')} IN (${statusPlaceholders})
    `, ...queryParams);

    // Group by effective status (computed in SQL — same source as the filter)
    const statusMap = {};
    for (const order of orders) {
      const effectiveStatus = String(order.effective_status || '').toUpperCase() || 'PENDING';
      
      if (!statusMap[effectiveStatus]) {
        statusMap[effectiveStatus] = {
          status: effectiveStatus,
          ordersCount: 0,
          itemsCount: 0,
          productsValue: 0,
          shippingValue: 0
        };
      }
      statusMap[effectiveStatus].ordersCount += 1;
      statusMap[effectiveStatus].shippingValue += Number(order.shipping) || 0;
      statusMap[effectiveStatus].itemsCount += Number(order.oi_quantity) || 0;
      statusMap[effectiveStatus].productsValue += Number(order.oi_total) || 0;
    }

    // Build per-status rows (include all selected statuses, even with 0 orders)
    const statusRows = filteredStatusCodes.map(code => {
      const data = statusMap[code];
      return {
        status: code,
        ordersCount: data ? data.ordersCount : 0,
        itemsCount: data ? data.itemsCount : 0,
        productsValue: data ? Number(data.productsValue.toFixed(2)) : 0,
        shippingValue: data ? Number(data.shippingValue.toFixed(2)) : 0
      };
    });

    // Grand totals
    const grandTotal = {
      ordersCount: statusRows.reduce((s, r) => s + r.ordersCount, 0),
      itemsCount: statusRows.reduce((s, r) => s + r.itemsCount, 0),
      productsValue: Number(statusRows.reduce((s, r) => s + r.productsValue, 0).toFixed(2)),
      shippingValue: Number(statusRows.reduce((s, r) => s + r.shippingValue, 0).toFixed(2))
    };

    res.json({
      success: true,
      data: {
        rows: statusRows,
        totals: grandTotal
      }
    });
  } catch (error) {
    console.error('Error in getStatusSummaryReport:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقرير الحالات', error: error.message });
  }
};

// Get orders detail for selected statuses (drill-down)
const getStatusSummaryOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { statuses, startDate, endDate, page = '1', limit = '50' } = req.query;
    const prisma = getSharedPrismaClient();

    if (!statuses) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار حالة واحدة على الأقل' });
    }

    const statusCodes = String(statuses).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (statusCodes.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار حالة واحدة على الأقل' });
    }

    // 🛡️ PRODUCTION-FIX (analytics-custom-status): enum + الحالات المخصصة النشطة
    const filteredStatusCodes = await resolveAnalyticsStatusCodes(prisma, companyId, statusCodes);

    if (filteredStatusCodes.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد حالات طلب صالحة للفلترة' });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const companyTimezone = req.company?.timezone || req.user?.company?.timezone || EGYPT_TIMEZONE;
    const dateRangeFilter = buildDateRangeFilter(startDate, endDate, companyTimezone);

    // Build raw SQL with effective status for orders
    // 🛡️ PRODUCTION-FIX (analytics-unify): تعبير الحالة الفعلية الموحّد (مخصصة ← تجهيز ← enum)
    const oQueryParams = [String(companyId)];
    const oDateConditions = [];
    if (dateRangeFilter.gte) {
      oDateConditions.push(`o."createdAt" >= $${oQueryParams.length + 1}`);
      oQueryParams.push(dateRangeFilter.gte);
    }
    if (dateRangeFilter.lte) {
      oDateConditions.push(`o."createdAt" <= $${oQueryParams.length + 1}`);
      oQueryParams.push(dateRangeFilter.lte);
    }
    const oDateClause = oDateConditions.length ? oDateConditions.join(' AND ') : 'TRUE';
    const oStatusPlaceholders = filteredStatusCodes.map((_, i) => `$${oQueryParams.length + 1 + i}`).join(', ');
    oQueryParams.push(...filteredStatusCodes);

    const oCountQueryParams = [...oQueryParams];
    const oCountSql = `
      SELECT COUNT(*)::int AS total
      FROM "orders" o
      WHERE o."companyId" = $1
        AND ${oDateClause}
        AND ${effectiveOrderStatusSql('o')} IN (${oStatusPlaceholders})
    `;
    const [countResult] = await prisma.$queryRawUnsafe(oCountSql, ...oCountQueryParams);
    const totalCount = countResult.total;

    const oLimitClause = limitNum ? `LIMIT ${limitNum}` : '';
    const oOffsetClause = skip ? `OFFSET ${skip}` : '';
    const ordersSql = `
      SELECT o.id, o."orderNumber", o.status, o."customStatusCode", o.metadata, o.total, o.shipping,
             o.subtotal, o."customerId", o.governorate, o.city, o."paymentMethod",
             o."sourceType", o."createdAt",
             c."firstName", c."lastName", c.phone
      FROM "orders" o
      LEFT JOIN "customers" c ON c.id = o."customerId"
      WHERE o."companyId" = $1
        AND ${oDateClause}
        AND ${effectiveOrderStatusSql('o')} IN (${oStatusPlaceholders})
      ORDER BY o."createdAt" DESC
      ${oLimitClause} ${oOffsetClause}
    `;
    const orders = await prisma.$queryRawUnsafe(ordersSql, ...oQueryParams);

    // Attach order items for each order
    const orderIds = orders.map(o => o.id);
    let itemsMap = {};
    if (orderIds.length > 0) {
      const itemPlaceholders = orderIds.map((_, i) => `$${i + 1}`).join(', ');
      const orderItems = await prisma.$queryRawUnsafe(`
        SELECT oi."orderId", oi.id, oi.quantity, oi.price, oi.total,
               oi."productName", oi."productColor", oi."productSize", oi."productSku",
               p.name AS p_name, p.sku AS p_sku
        FROM "order_items" oi
        LEFT JOIN "products" p ON p.id = oi."productId"
        WHERE oi."orderId" IN (${itemPlaceholders})
      `, ...orderIds);
      itemsMap = {};
      for (const item of orderItems) {
        if (!itemsMap[item.orderId]) itemsMap[item.orderId] = [];
        itemsMap[item.orderId].push(item);
      }
    }

    const enrichedOrders = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      // 🛡️ (analytics-unify): نفس أولوية الحالة الفعلية الموحّدة
      status: computeEffectiveOrderStatus(o).toLowerCase(),
      total: o.total,
      shipping: o.shipping,
      subtotal: o.subtotal,
      customerId: o.customerId,
      governorate: o.governorate,
      city: o.city,
      paymentMethod: o.paymentMethod,
      sourceType: o.sourceType,
      createdAt: o.createdAt,
      customer: o.firstName ? { firstName: o.firstName, lastName: o.lastName, phone: o.phone } : null,
      orderItems: (itemsMap[o.id] || []).map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        productName: item.productName,
        productColor: item.productColor,
        productSize: item.productSize,
        productSku: item.productSku,
        product: item.p_name ? { name: item.p_name, sku: item.p_sku } : null
      }))
    }));

    res.json({
      success: true,
      data: {
        orders: enrichedOrders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error in getStatusSummaryOrders:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الطلبات', error: error.message });
  }
};

// Get items detail for selected statuses (drill-down)
const getStatusSummaryItems = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { statuses, startDate, endDate, page = '1', limit = '50' } = req.query;
    const prisma = getSharedPrismaClient();

    if (!statuses) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار حالة واحدة على الأقل' });
    }

    const statusCodes = String(statuses).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (statusCodes.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار حالة واحدة على الأقل' });
    }

    // 🛡️ PRODUCTION-FIX (analytics-custom-status): enum + الحالات المخصصة النشطة
    const filteredStatusCodes = await resolveAnalyticsStatusCodes(prisma, companyId, statusCodes);

    if (filteredStatusCodes.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد حالات طلب صالحة للفلترة' });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const companyTimezone = req.company?.timezone || req.user?.company?.timezone || EGYPT_TIMEZONE;
    const dateRangeFilter = buildDateRangeFilter(startDate, endDate, companyTimezone);

    // Build raw SQL with effective status for items
    // 🛡️ PRODUCTION-FIX (analytics-unify): تعبير الحالة الفعلية الموحّد (مخصصة ← تجهيز ← enum)
    const iQueryParams = [String(companyId)];
    const iDateConditions = [];
    if (dateRangeFilter.gte) {
      iDateConditions.push(`o."createdAt" >= $${iQueryParams.length + 1}`);
      iQueryParams.push(dateRangeFilter.gte);
    }
    if (dateRangeFilter.lte) {
      iDateConditions.push(`o."createdAt" <= $${iQueryParams.length + 1}`);
      iQueryParams.push(dateRangeFilter.lte);
    }
    const iDateClause = iDateConditions.length ? iDateConditions.join(' AND ') : 'TRUE';
    const iStatusPlaceholders = filteredStatusCodes.map((_, i) => `$${iQueryParams.length + 1 + i}`).join(', ');
    iQueryParams.push(...filteredStatusCodes);

    const iLimitClause = limitNum ? `LIMIT ${limitNum}` : '';
    const iOffsetClause = skip ? `OFFSET ${skip}` : '';

    const itemsSql = `
      SELECT oi.id, oi.quantity, oi.price, oi.total,
             oi."productName", oi."productColor", oi."productSize", oi."productSku",
             o.id AS o_id, o."orderNumber", o.status, o."customStatusCode", o.metadata, o."createdAt",
             ${effectiveOrderStatusSql('o')} AS effective_status,
             p.name AS p_name, p.sku AS p_sku
      FROM "order_items" oi
      JOIN "orders" o ON o.id = oi."orderId"
      LEFT JOIN "products" p ON p.id = oi."productId"
      WHERE o."companyId" = $1
        AND ${iDateClause}
        AND ${effectiveOrderStatusSql('o')} IN (${iStatusPlaceholders})
      ORDER BY o."createdAt" DESC, oi.id
      ${iLimitClause} ${iOffsetClause}
    `;
    const items = await prisma.$queryRawUnsafe(itemsSql, ...iQueryParams);

    const flatItems = items.map(item => {
      const effectiveStatus = String(item.effective_status || item.status || 'UNKNOWN');
      return {
        orderId: item.o_id || '',
        orderNumber: item.orderNumber || 'غير معروف',
        orderStatus: effectiveStatus || 'UNKNOWN',
        createdAt: item.createdAt || new Date(),
        itemId: item.id,
        productName: item.productName || item.p_name || 'منتج غير معروف',
        productColor: item.productColor,
        productSize: item.productSize,
        productSku: item.productSku || item.p_sku,
        quantity: item.quantity,
        price: Number(item.price) || 0,
        total: Number(item.total) || 0
      };
    });

    // Count total items matching the filter
    const countItemsSql = `
      SELECT COUNT(*)::int AS total
      FROM "order_items" oi
      JOIN "orders" o ON o.id = oi."orderId"
      WHERE o."companyId" = $1
        AND ${iDateClause}
        AND ${effectiveOrderStatusSql('o')} IN (${iStatusPlaceholders})
    `;
    const [totalResult] = await prisma.$queryRawUnsafe(countItemsSql, ...iQueryParams);
    const totalItems = totalResult.total;

    res.json({
      success: true,
      data: {
        items: flatItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalItems,
          totalPages: Math.ceil(totalItems / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error in getStatusSummaryItems:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل القطع', error: error.message });
  }
};

const getTodayOps = async (req, res) => {
  try {
    const companyId = await resolveAnalyticsCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const todayS = new Date(now); todayS.setHours(0,0,0,0);
    const todayE = new Date(now); todayE.setHours(23,59,59,999);

    // ── Section 1: شغل النهارده (Actions Today) ──
    // All status-change actions that happened today
    const todayHistory = await prisma.orderStatusHistory.findMany({
      where: { order: { companyId }, createdAt: { gte: todayS, lte: todayE } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, orderId: true, guestOrderId: true, status: true, oldStatus: true, changedBy: true, userName: true, createdAt: true }
    });

    // Confirmations today (via Order.confirmedAt)
    const confirmsFromDb = await prisma.order.count({ where: { companyId, confirmedAt: { gte: todayS, lte: todayE } } });
    // Also track confirmed guest orders via history today
    const guestConfirmIds = [...new Set(todayHistory.filter(h => h.status === 'CONFIRMED' && h.guestOrderId).map(h => h.guestOrderId))];
    const guestCancelsIds = [...new Set(todayHistory.filter(h => h.status === 'CANCELLED' && h.guestOrderId).map(h => h.guestOrderId))];
    // Cancellations today (via Order.status + updatedAt today, OR via history)
    const cancelsFromDb = await prisma.order.count({ where: { companyId, status: 'CANCELLED', updatedAt: { gte: todayS, lte: todayE } } });

    // Actions summary
    const todayConfirms = confirmsFromDb + guestConfirmIds.length;
    const todayCancels = cancelsFromDb + guestCancelsIds.length;

    // Team grouping: who did what today
    const teamMap = {};
    todayHistory.forEach(h => {
      const name = h.userName || h.changedBy || 'system';
      if (!teamMap[name]) teamMap[name] = { confirms: 0, cancels: 0, others: 0, total: 0 };
      teamMap[name].total++;
      if (h.status === 'CONFIRMED') teamMap[name].confirms++;
      else if (h.status === 'CANCELLED') teamMap[name].cancels++;
      else teamMap[name].others++;
    });

    // Build order lookup for today's history
    const hOrderIds = [...new Set(todayHistory.filter(h => h.orderId).map(h => h.orderId))].filter(Boolean);
    const hGuestIds = [...new Set(todayHistory.filter(h => h.guestOrderId).map(h => h.guestOrderId))].filter(Boolean);
    let hOrderMap = {};
    let hGuestMap = {};
    if (hOrderIds.length) {
      const hOrders = await prisma.order.findMany({ where: { id: { in: hOrderIds } }, select: { id: true, orderNumber: true, createdAt: true } });
      hOrders.forEach(o => hOrderMap[o.id] = o);
    }
    if (hGuestIds.length) {
      const hGuests = await prisma.guestOrder.findMany({ where: { id: { in: hGuestIds } }, select: { id: true, orderNumber: true, createdAt: true } });
      hGuests.forEach(o => hGuestMap[o.id] = o);
    }

    // Distinguish old vs new orders for today's actions
    const actionsFeed = todayHistory.slice(0, 100).map(h => {
      const ord = hOrderMap[h.orderId] || hGuestMap[h.guestOrderId];
      const orderCreated = ord ? new Date(ord.createdAt) : null;
      const isOld = orderCreated && orderCreated < todayS;
      return {
        id: h.id,
        orderLabel: ord ? ord.orderNumber : (h.orderId || h.guestOrderId || '').slice(0, 8),
        oldStatus: h.oldStatus, newStatus: h.status,
        changedBy: h.userName || h.changedBy || 'system',
        createdAt: h.createdAt,
        orderDate: ord ? ord.createdAt : null,
        isOldOrder: isOld,
      };
    });

    // ── Section 2: تقرير يوم (Day Snapshot) ──
    // نستخدم snapshotDate من query洗干净، افتراضيًا اليوم
    const { snapshotDate } = req.query || {};
    let snapS = snapshotDate ? normalizeAnalyticsDateInput(snapshotDate) : new Date(todayS);
    if (!snapS) { snapS = new Date(todayS); }
    const snapE = new Date(snapS); snapE.setHours(23, 59, 59, 999);

    const snapOrders = await prisma.order.findMany({
      where: { companyId, createdAt: { gte: snapS, lte: snapE } },
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true, status: true, confirmedAt: true, createdAt: true, sourceType: true },
      orderBy: { createdAt: 'desc' },
    });
    const snapGuests = await prisma.guestOrder.findMany({
      where: { companyId, createdAt: { gte: snapS, lte: snapE } },
      select: { id: true, orderNumber: true, guestName: true, guestPhone: true, finalTotal: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Status distribution for snapshot
    const snapStatusMap = {};
    snapOrders.forEach(o => { snapStatusMap[o.status] = (snapStatusMap[o.status] || 0) + 1; });
    snapGuests.forEach(o => { snapStatusMap[o.status] = (snapStatusMap[o.status] || 0) + 1; });
    const snapStatusBreakdown = Object.entries(snapStatusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Pending orders in snapshot (not confirmed, not cancelled/terminal)
    const terminalStatuses = ['CANCELLED','DELIVERED','REFUNDED','DUPLICATE_ORDER'];
    const snapPending = snapOrders.filter(o => !o.confirmedAt && !terminalStatuses.includes(o.status));
    const snapPendingGuests = snapGuests.filter(o => !terminalStatuses.includes(o.status));

    const snapshot = {
      date: snapS.toISOString().slice(0, 10),
      totalOrders: snapOrders.length + snapGuests.length,
      regular: snapOrders.length,
      guests: snapGuests.length,
      pendingList: snapPending.slice(0, 50).map(o => ({
        orderNumber: o.orderNumber, customerName: o.customerName, customerPhone: o.customerPhone,
        total: o.total, status: o.status, sourceType: o.sourceType, createdAt: o.createdAt,
      })),
      pendingListGuests: snapPendingGuests.slice(0, 50).map(o => ({
        orderNumber: o.orderNumber, customerName: o.guestName, customerPhone: o.guestPhone,
        total: o.finalTotal, status: o.status, createdAt: o.createdAt,
      })),
      statusBreakdown: snapStatusBreakdown,
      // Hourly distribution (for orders created on that day)
      hourly: Object.entries(
        [...snapOrders, ...snapGuests].reduce(function(acc, o) {
          const h = new Date(o.createdAt).getHours();
          acc[h] = (acc[h] || 0) + 1;
          return acc;
        }, {})
      ).sort(function(a, b) { return Number(a[0]) - Number(b[0]); }).map(function(e) { return { hour: Number(e[0]), count: e[1] }; }),
    };

    res.json({
      success: true,
      data: {
        todayActions: {
          confirms: todayConfirms,
          cancels: todayCancels,
          total: todayConfirms + todayCancels,
          team: Object.entries(teamMap).map(function(e) { return { name: e[0], confirms: e[1].confirms, cancels: e[1].cancels, others: e[1].others, total: e[1].total }; }).sort(function(a, b) { return b.total - a.total; }),
          feed: actionsFeed,
        },
        daySnapshot: snapshot,
      },
    });
  } catch (error) {
    console.error('Error in getTodayOps:', error);
    res.status(200).json({ success: true, data: {
      todayActions: { confirms: 0, cancels: 0, total: 0, team: [], feed: [] },
      daySnapshot: { date: '', totalOrders: 0, regular: 0, guests: 0, pendingList: [], pendingListGuests: [], statusBreakdown: [], hourly: [] },
    }, error: error.message });
  }
};

/**
 * 🏷️ تقرير عمولات المسوقين (Marketer Commissions Analytics)
 * يحسب عدد الطلبات والقطع (items[].quantity) والعمولة التقديرية (افتراضياً 50 ج/قطعة)
 * لكل مسوق أنشأ طلبات (createdBy = userId) خلال فترة زمنية محددة
 */
const getMarketerCommissionsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period, userId, commissionPerPiece } = req.query;
    const ratePerPiece = parseFloat(commissionPerPiece) || 50;
    const prisma = getSharedPrismaClient();

    let whereClause = {
      companyId: String(companyId),
      createdBy: { not: null }
    };

    if (userId) {
      whereClause.createdBy = String(userId);
    }

    if (startDate || endDate || period) {
      try {
        const { start, end } = parseAnalyticsDateRange({ startDate, endDate, period: period || '30' });
        whereClause.createdAt = {
          gte: start,
          lte: end
        };
      } catch (err) {
        console.error('Date parsing error in getMarketerCommissionsAnalytics:', err);
      }
    }

    const userWhere = { companyId: String(companyId) };
    if (userId) {
      userWhere.id = String(userId);
    }

    const [users, orders] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      }),
      prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdBy: true,
          confirmedBy: true,
          createdAt: true,
          orderItems: {
            select: {
              quantity: true,
              price: true,
              total: true
            }
          }
        }
      })
    ]);

    const marketerStats = {};
    users.forEach(u => {
      marketerStats[u.id] = {
        userId: u.id,
        userName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        email: u.email,
        role: u.role,
        ordersCreated: 0,
        totalPieces: 0,
        totalRevenue: 0,
        estimatedCommission: 0,
        confirmedOrders: 0,
        confirmedPieces: 0,
        deliveredOrders: 0,
        deliveredPieces: 0,
        deliveredCommission: 0,
        shippedOrders: 0,
        shippedPieces: 0,
        returnedOrders: 0,
        returnedPieces: 0,
        cancelledOrders: 0,
        cancelledPieces: 0,
        statusBreakdown: {}
      };
    });

    orders.forEach(order => {
      const creatorId = order.createdBy;
      if (!creatorId) return;

      if (!marketerStats[creatorId]) {
        marketerStats[creatorId] = {
          userId: creatorId,
          userName: 'مستخدم غير معروف',
          email: '',
          role: 'AGENT',
          ordersCreated: 0,
          totalPieces: 0,
          totalRevenue: 0,
          estimatedCommission: 0,
          confirmedOrders: 0,
          confirmedPieces: 0,
          deliveredOrders: 0,
          deliveredPieces: 0,
          deliveredCommission: 0,
          shippedOrders: 0,
          shippedPieces: 0,
          returnedOrders: 0,
          returnedPieces: 0,
          cancelledOrders: 0,
          cancelledPieces: 0,
          statusBreakdown: {}
        };
      }

      const st = String(order.status || 'UNKNOWN').toUpperCase();
      const m = marketerStats[creatorId];
      const pieces = order.orderItems && order.orderItems.length > 0
        ? order.orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
        : 1;
      const orderRevenue = parseFloat(order.total) || 0;

      m.ordersCreated += 1;
      m.totalPieces += pieces;
      m.totalRevenue += orderRevenue;

      if (!m.statusBreakdown[st]) {
        m.statusBreakdown[st] = { count: 0, pieces: 0, revenue: 0 };
      }
      m.statusBreakdown[st].count += 1;
      m.statusBreakdown[st].pieces += pieces;
      m.statusBreakdown[st].revenue += orderRevenue;

      if (order.confirmedBy) {
        m.confirmedOrders += 1;
        m.confirmedPieces += pieces;
      }

      if (st === 'DELIVERED') {
        m.deliveredOrders += 1;
        m.deliveredPieces += pieces;
        m.deliveredCommission += pieces * ratePerPiece;
      } else if (st === 'SHIPPED') {
        m.shippedOrders += 1;
        m.shippedPieces += pieces;
      } else if (st === 'RETURNED') {
        m.returnedOrders += 1;
        m.returnedPieces += pieces;
      } else if (st === 'CANCELLED') {
        m.cancelledOrders += 1;
        m.cancelledPieces += pieces;
      }
    });

    const activeMarketers = Object.values(marketerStats)
      .filter(m => m.ordersCreated > 0)
      .map(m => ({
        ...m,
        totalRevenue: parseFloat(m.totalRevenue.toFixed(2)),
        estimatedCommission: m.totalPieces * ratePerPiece,
        deliveredCommission: m.deliveredPieces * ratePerPiece
      }))
      .sort((a, b) => b.totalPieces - a.totalPieces);

    const totalPiecesSum = activeMarketers.reduce((s, m) => s + m.totalPieces, 0);
    const totalDeliveredPiecesSum = activeMarketers.reduce((s, m) => s + m.deliveredPieces, 0);

    res.json({
      success: true,
      data: {
        commissionRatePerPiece: ratePerPiece,
        summary: {
          totalMarketers: activeMarketers.length,
          totalOrders: activeMarketers.reduce((s, m) => s + m.ordersCreated, 0),
          totalPieces: totalPiecesSum,
          totalRevenue: parseFloat(activeMarketers.reduce((s, m) => s + m.totalRevenue, 0).toFixed(2)),
          totalEstimatedCommission: totalPiecesSum * ratePerPiece,
          totalDeliveredPieces: totalDeliveredPiecesSum,
          totalDeliveredCommission: totalDeliveredPiecesSum * ratePerPiece
        },
        marketers: activeMarketers
      }
    });
  } catch (error) {
    console.error('❌ Error in getMarketerCommissionsAnalytics:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب تقرير عمولات المسوقين', error: error.message });
  }
};

module.exports = {
  getStoreAnalytics,
  getConversionRate,
  getProductConversionRate,
  getTopProducts,
  trackProductView,
  trackWebVitals,
  getWebVitalsSummary,
  trackStoreVisit,
  trackConversion,
  getDailyAnalytics,
  getProductAnalytics,
  getVariationsAnalytics,
  getCategoriesAnalytics,
  getPaymentMethodsAnalytics,
  getRegionsAnalytics,
  getCouponsAnalytics,
  getCODPerformanceAnalytics,
  getCancellationAnalytics,
  getCancellationReasonSettings,
  updateCancellationReasonSettings,
  getAbandonedCartAnalytics,
  getCustomerQualityAnalytics,
  getProfitAnalytics,
  getDeliveryRateAnalytics,
  getOrderStatusTimeAnalytics,
  getProductHealthScore,
  getReturnAnalytics,
  getReturnReasonsAnalytics,
  getProductFulfillmentAnalytics,
  getDeliveryReturnsLogisticsAnalytics,
  getProductSalesPerformance,
  getTeamPerformanceAnalytics,
  getMarketerCommissionsAnalytics,
  getFunnelAnalytics,
  getStockForecastAnalytics,
  getCampaignAttributionAnalytics,
  getAvailableStatuses,
  getStatusSummaryReport,
  getStatusSummaryOrders,
  getStatusSummaryItems,
  getTodayOps,
  // Public endpoints
  getPublicStoreAnalytics,
  getPublicTopProducts,
  getPublicDailyAnalytics
};
