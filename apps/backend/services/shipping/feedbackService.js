/**
 * Shipment Customer Feedback Service (SHIP-T4)
 * Handles token generation upon delivery, public rating submissions, and analytics reports.
 * Scoped to companyId. Strict prevention of duplicate feedback (409).
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../sharedDatabase');

function serviceError(message, statusCode, code) {
  const err = new Error(message);
  if (statusCode) err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function buildDateFilter(from, to, field = 'submittedAt') {
  if (!from && !to) return {};
  const filter = {};
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) filter.gte = fromDate;
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      if (typeof to === 'string' && to.length === 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      filter.lte = toDate;
    }
  }
  return Object.keys(filter).length > 0 ? { [field]: filter } : {};
}

/**
 * Creates or retrieves a unique feedback token for a delivered shipment.
 */
async function ensureShipmentFeedbackToken(prismaClient, companyId, shipmentId, { channel = 'PORTAL' } = {}) {
  const prisma = prismaClient || getSharedPrismaClient();

  const existing = await prisma.shipmentFeedback.findFirst({
    where: { companyId, shipmentId },
  });

  if (existing) {
    return existing;
  }

  const token = crypto.randomBytes(16).toString('hex');

  const created = await prisma.shipmentFeedback.create({
    data: {
      companyId,
      shipmentId,
      token,
      channel,
    },
  });

  return created;
}

/**
 * Public lookup of a feedback form by its unique token.
 */
async function getFeedbackByToken(token) {
  const prisma = getSharedPrismaClient();

  if (!token || typeof token !== 'string') {
    throw serviceError('رمز التقييم غير صالح', 400, 'INVALID_TOKEN');
  }

  const feedback = await prisma.shipmentFeedback.findUnique({
    where: { token: token.trim() },
    include: {
      shipment: {
        select: {
          id: true,
          trackingNumber: true,
          recipientName: true,
          destinationCity: true,
          destinationGovernorate: true,
          status: true,
          companyId: true,
        },
      },
    },
  });

  if (!feedback) {
    throw serviceError('رابط التقييم غير موجود أو منتهي الصلاحية', 404, 'TOKEN_NOT_FOUND');
  }

  return {
    id: feedback.id,
    token: feedback.token,
    submittedAt: feedback.submittedAt,
    rating: feedback.rating,
    comment: feedback.comment,
    tags: feedback.tags ? feedback.tags.split(',').map((t) => t.trim()) : [],
    channel: feedback.channel,
    isSubmitted: Boolean(feedback.submittedAt),
    shipment: feedback.shipment ? {
      trackingNumber: feedback.shipment.trackingNumber,
      recipientName: feedback.shipment.recipientName,
      city: feedback.shipment.destinationCity || feedback.shipment.destinationGovernorate,
      status: feedback.shipment.status,
    } : null,
  };
}

/**
 * Public submission of customer feedback. Rejects duplicates with 409.
 */
async function submitFeedback(token, { rating, comment, tags, channel } = {}) {
  const prisma = getSharedPrismaClient();

  if (!token || typeof token !== 'string') {
    throw serviceError('رمز التقييم غير صالح', 400, 'INVALID_TOKEN');
  }

  const feedback = await prisma.shipmentFeedback.findUnique({
    where: { token: token.trim() },
  });

  if (!feedback) {
    throw serviceError('رابط التقييم غير موجود أو منتهي الصلاحية', 404, 'TOKEN_NOT_FOUND');
  }

  // Prevent duplicate submission on same token
  if (feedback.submittedAt) {
    throw serviceError('تم إرسال هذا التقييم مسبقاً ولا يمكن تعديله', 409, 'FEEDBACK_ALREADY_SUBMITTED');
  }

  // Prevent duplicate feedback for the same shipment across different tokens
  const existingForShipment = await prisma.shipmentFeedback.findFirst({
    where: {
      shipmentId: feedback.shipmentId,
      submittedAt: { not: null },
      id: { not: feedback.id },
    },
  });

  if (existingForShipment) {
    throw serviceError('تم تقييم هذه الشحنة مسبقاً', 409, 'FEEDBACK_DUPLICATE');
  }

  const numRating = parseInt(rating, 10);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    throw serviceError('التقييم يجب أن يكون رقماً صحيحاً بين 1 و 5', 400, 'INVALID_RATING');
  }

  const cleanTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean).join(',')
    : (tags ? String(tags).trim() : null);

  const updated = await prisma.shipmentFeedback.update({
    where: { id: feedback.id },
    data: {
      rating: numRating,
      comment: comment ? String(comment).trim() : null,
      tags: cleanTags || null,
      channel: channel ? String(channel).trim() : (feedback.channel || 'DIRECT'),
      submittedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Aggregated Feedback Report for Operations / Management.
 */
async function getFeedbackReport(companyId, { from, to } = {}) {
  const prisma = getSharedPrismaClient();

  const dateFilter = buildDateFilter(from, to, 'submittedAt');
  const where = {
    companyId,
    submittedAt: { not: null },
    ...dateFilter,
  };

  const feedbacks = await prisma.shipmentFeedback.findMany({
    where,
    include: {
      shipment: {
        select: {
          id: true,
          trackingNumber: true,
          recipientName: true,
          recipientPhone: true,
          status: true,
          destinationCity: true,
          destinationGovernorate: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const totalCount = feedbacks.length;
  const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let sumRating = 0;

  for (const f of feedbacks) {
    const r = f.rating || 0;
    if (distribution[String(r)] !== undefined) {
      distribution[String(r)] += 1;
    }
    sumRating += r;
  }

  const averageRating = totalCount > 0 ? Math.round((sumRating / totalCount) * 10) / 10 : 0;

  // Worst 10 shipments (lowest rating first, then most recent)
  const sortedWorst = [...feedbacks]
    .sort((a, b) => {
      if ((a.rating || 0) !== (b.rating || 0)) {
        return (a.rating || 0) - (b.rating || 0);
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    })
    .slice(0, 10)
    .map((f) => ({
      feedbackId: f.id,
      shipmentId: f.shipmentId,
      trackingNumber: f.shipment?.trackingNumber || f.shipmentId,
      recipientName: f.shipment?.recipientName || 'غير محدد',
      recipientPhone: f.shipment?.recipientPhone || null,
      city: f.shipment?.destinationCity || f.shipment?.destinationGovernorate || null,
      status: f.shipment?.status || null,
      rating: f.rating,
      comment: f.comment,
      tags: f.tags ? f.tags.split(',').map((t) => t.trim()) : [],
      submittedAt: f.submittedAt,
      channel: f.channel,
    }));

  return {
    totalCount,
    averageRating,
    distribution,
    worstShipments: sortedWorst,
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      shipmentId: f.shipmentId,
      trackingNumber: f.shipment?.trackingNumber,
      recipientName: f.shipment?.recipientName,
      rating: f.rating,
      comment: f.comment,
      tags: f.tags,
      submittedAt: f.submittedAt,
      channel: f.channel,
    })),
  };
}

/**
 * Format feedback report as CSV
 */
function feedbackReportToCsv(report) {
  const lines = [];
  lines.push('\uFEFF"كود الشحنة","اسم العميل","التقييم","التعليق","الوسوم","القناة","تاريخ التقييم"');

  for (const item of (report.worstShipments || report.feedbacks || [])) {
    const tracking = `"${(item.trackingNumber || '').replace(/"/g, '""')}"`;
    const name = `"${(item.recipientName || '').replace(/"/g, '""')}"`;
    const rating = item.rating || '';
    const comment = `"${(item.comment || '').replace(/"/g, '""')}"`;
    const tags = `"${(Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')).replace(/"/g, '""')}"`;
    const channel = `"${(item.channel || '').replace(/"/g, '""')}"`;
    const date = item.submittedAt ? new Date(item.submittedAt).toISOString().replace('T', ' ').substring(0, 19) : '';
    lines.push([tracking, name, rating, comment, tags, channel, date].join(','));
  }

  return lines.join('\r\n');
}

module.exports = {
  ensureShipmentFeedbackToken,
  getFeedbackByToken,
  submitFeedback,
  getFeedbackReport,
  feedbackReportToCsv,
  serviceError,
};
