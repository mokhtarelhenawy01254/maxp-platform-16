/**
 * @module externalOrderPayload
 * @description Formatting and payload assembly for public Developer Hub External Orders API
 * (/api/v1/public/ext/orders and /api/v1/public/ext/orders/:id).
 *
 * Ensures:
 *  - 100% backward compatibility with existing external clients (additive fields only).
 *  - Zero N+1 queries by leveraging batched Prisma relation selections.
 *  - Clean extraction of marketing attribution, delivery timestamps, COD collected amount,
 *    order quantities, and rejection reasons.
 */

/**
 * Normalizes an arbitrary value to a clean non-empty string or null.
 * @param {*} val
 * @returns {string|null}
 */
function normalizeString(val) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
}

/**
 * Parses raw metadata safely into an object.
 * @param {string|object|null|undefined} raw
 * @returns {object}
 */
function parseMetadataSafe(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      return {};
    }
  }
  return {};
}

/**
 * Extracts marketing attribution keys from order metadata.
 * Missing or null fields default to null.
 *
 * @param {string|object|null|undefined} rawMetadata
 * @returns {{
 *   utmSource: string|null,
 *   utmMedium: string|null,
 *   utmCampaign: string|null,
 *   utmTerm: string|null,
 *   utmContent: string|null,
 *   campaignId: string|null,
 *   adSetId: string|null,
 *   adId: string|null,
 *   fbclid: string|null,
 *   gclid: string|null,
 *   couponCode: string|null
 * }}
 */
function extractAttribution(rawMetadata) {
  const meta = parseMetadataSafe(rawMetadata);

  const attr = (meta.attribution && typeof meta.attribution === 'object' && !Array.isArray(meta.attribution))
    ? meta.attribution
    : {};

  const sessionDetails = (meta.sessionDetails && typeof meta.sessionDetails === 'object' && !Array.isArray(meta.sessionDetails))
    ? meta.sessionDetails
    : {};

  const traffic = (sessionDetails.trafficSource && typeof sessionDetails.trafficSource === 'object' && !Array.isArray(sessionDetails.trafficSource))
    ? sessionDetails.trafficSource
    : {};

  const utmSource = normalizeString(
    attr.utmSource || attr.utm_source || attr.source || traffic.source || meta.utmSource || meta.utm_source,
  );

  const utmMedium = normalizeString(
    attr.utmMedium || attr.utm_medium || attr.medium || traffic.medium || meta.utmMedium || meta.utm_medium,
  );

  const utmCampaign = normalizeString(
    attr.utmCampaign || attr.utm_campaign || attr.campaign || attr.campaignName || traffic.campaignName || meta.utmCampaign || meta.utm_campaign,
  );

  const utmTerm = normalizeString(
    attr.utmTerm || attr.utm_term || attr.term || meta.utmTerm || meta.utm_term,
  );

  const utmContent = normalizeString(
    attr.utmContent || attr.utm_content || attr.content || meta.utmContent || meta.utm_content,
  );

  const campaignId = normalizeString(
    attr.campaignId || attr.campaign_id || attr.utm_id || traffic.campaignId || meta.campaignId || meta.campaign_id,
  );

  const adSetId = normalizeString(
    attr.adSetId || attr.adset_id || attr.ad_set_id || traffic.adSetId || meta.adSetId || meta.adset_id,
  );

  const adId = normalizeString(
    attr.adId || attr.ad_id || traffic.adId || meta.adId || meta.ad_id,
  );

  const fbclid = normalizeString(
    attr.fbclid || meta.fbclid,
  );

  const gclid = normalizeString(
    attr.gclid || meta.gclid,
  );

  const couponCode = normalizeString(
    meta.couponCode ||
    (meta.coupon && typeof meta.coupon === 'object' ? meta.coupon.code : null) ||
    meta.coupon_code ||
    attr.couponCode ||
    attr.coupon_code,
  );

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    campaignId,
    adSetId,
    adId,
    fbclid,
    gclid,
    couponCode,
  };
}

/**
 * Calculates the total item quantity across order items.
 * @param {Array<{ quantity?: number }>} [orderItems]
 * @returns {number}
 */
function extractTotalQuantity(orderItems) {
  if (!Array.isArray(orderItems) || orderItems.length === 0) return 0;
  return orderItems.reduce((acc, item) => {
    const q = Number(item?.quantity);
    return acc + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
}

/**
 * Resolves the delivery timestamp:
 * 1. Shipment.collectedAt if present on any shipment.
 * 2. Or the latest transition to DELIVERED in OrderStatusHistory.
 * 3. Otherwise null.
 *
 * @param {object} order
 * @returns {string|null} ISO date string or null
 */
function extractDeliveredAt(order) {
  if (!order) return null;

  // 1. Shipment collectedAt
  if (Array.isArray(order.shipments)) {
    for (const s of order.shipments) {
      if (s?.collectedAt) {
        try {
          return s.collectedAt instanceof Date
            ? s.collectedAt.toISOString()
            : new Date(s.collectedAt).toISOString();
        } catch (_) {}
      }
    }
  }

  // 2. OrderStatusHistory transition to DELIVERED
  if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
    const deliveredEntries = order.statusHistory
      .filter((h) => h?.status && String(h.status).trim().toUpperCase() === 'DELIVERED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (deliveredEntries.length > 0 && deliveredEntries[0].createdAt) {
      try {
        const d = deliveredEntries[0].createdAt;
        return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Resolves the collected COD amount from Shipment.collectedAmount.
 * If not present, returns null strictly (no guessing).
 *
 * @param {object} order
 * @returns {number|null}
 */
function extractCollectedCodAmount(order) {
  if (!order || !Array.isArray(order.shipments)) return null;

  for (const s of order.shipments) {
    if (s?.collectedAmount !== null && s?.collectedAmount !== undefined) {
      const num = Number(s.collectedAmount);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }

  return null;
}

/**
 * Extracts rejection reason:
 * - From ReturnRequest.rejectionReason/reasonId (or returnReason.reason) if a return request exists.
 * - Or order.customStatusCode / turboReturnReason if the order was returned/rejected/cancelled.
 * - Otherwise null.
 *
 * @param {object} order
 * @returns {string|null}
 */
function extractRejectionReason(order) {
  if (!order) return null;

  // 1. Check ReturnRequest
  if (Array.isArray(order.returnRequests) && order.returnRequests.length > 0) {
    const rr = order.returnRequests[0];
    const directReason = (
      (typeof rr.rejectionReason === 'string' && rr.rejectionReason.trim()) ||
      (rr.returnReason?.reason && typeof rr.returnReason.reason === 'string' && rr.returnReason.reason.trim()) ||
      (typeof rr.reasonId === 'string' && rr.reasonId.trim()) ||
      (typeof rr.adminNotes === 'string' && rr.adminNotes.trim()) ||
      (typeof rr.customerNotes === 'string' && rr.customerNotes.trim()) ||
      null
    );
    if (directReason) return directReason;
  }

  // 2. Check if order status or customStatusCode indicates rejection or return
  const statusUpper = String(order.status || '').trim().toUpperCase();
  const isRejectedOrReturned = (
    statusUpper === 'RETURNED' ||
    statusUpper === 'REFUNDED' ||
    statusUpper === 'CANCELLED' ||
    statusUpper === 'REJECTED' ||
    (order.customStatusCode && /RETURN|REJECT|CANCEL|REFUND/i.test(order.customStatusCode))
  );

  if (isRejectedOrReturned) {
    if (typeof order.turboReturnReason === 'string' && order.turboReturnReason.trim()) {
      return order.turboReturnReason.trim();
    }
    if (typeof order.customStatusCode === 'string' && order.customStatusCode.trim()) {
      return order.customStatusCode.trim();
    }
  }

  return null;
}

/**
 * Formats an order object for the GET /orders list endpoint.
 *
 * @param {object} order
 * @returns {object}
 */
function formatExternalOrderListRow(order) {
  const totalQuantity = extractTotalQuantity(order.orderItems);
  const deliveredAt = extractDeliveredAt(order);
  const collectedCodAmount = extractCollectedCodAmount(order);
  const attribution = extractAttribution(order.metadata);
  const rejectionReason = extractRejectionReason(order);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    city: order.city,
    governorate: order.governorate,
    confirmedAt: order.confirmedAt || null,
    createdAt: order.createdAt,
    totalQuantity,
    deliveredAt,
    collectedCodAmount,
    attribution,
    rejectionReason,
  };
}

/**
 * Formats an order object for the GET /orders/:id detail endpoint.
 * Preserves the existing `items` array format while appending the new fields.
 *
 * @param {object} order
 * @returns {object}
 */
function formatExternalOrderDetail(order) {
  const totalQuantity = extractTotalQuantity(order.orderItems);
  const deliveredAt = extractDeliveredAt(order);
  const collectedCodAmount = extractCollectedCodAmount(order);
  const attribution = extractAttribution(order.metadata);
  const rejectionReason = extractRejectionReason(order);

  const items = (order.orderItems || []).map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    productName: item.productName,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customStatusCode: order.customStatusCode || null,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shipping,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    city: order.city,
    governorate: order.governorate,
    notes: order.notes,
    confirmedAt: order.confirmedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
    totalQuantity,
    deliveredAt,
    collectedCodAmount,
    attribution,
    rejectionReason,
  };
}

module.exports = {
  extractAttribution,
  extractTotalQuantity,
  extractDeliveredAt,
  extractCollectedCodAmount,
  extractRejectionReason,
  formatExternalOrderListRow,
  formatExternalOrderDetail,
};
