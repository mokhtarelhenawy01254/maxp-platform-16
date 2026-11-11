/**
 * Instagram Graph API Service
 *
 * كل نداءات Instagram Graph API الأساسية (instagram_basic / instagram_manage_comments /
 * instagram_content_publish) عبر توكن الصفحة المرتبطة بحساب Instagram الاحترافي.
 *
 * المصدر الوحيد للحقيقة: facebookPage.instagramAccountId + facebookPage.pageAccessToken
 */

const axios = require('axios');
const { getMetaGraphApiBaseUrl, getMetaGraphApiVersion } = require('../config/metaApi');
const { getSharedPrismaClient } = require('./sharedDatabase');

const GRAPH_TIMEOUT_MS = 30000;
const MEDIA_FIELDS = [
  'id',
  'caption',
  'media_type',
  'media_url',
  'thumbnail_url',
  'permalink',
  'timestamp',
  'like_count',
  'comments_count',
].join(',');

/**
 * خطأ Instagram موحّد — يحمل كود Graph ورسالة عربية واضحة
 */
class InstagramError extends Error {
  constructor(message, { code = null, subcode = null, type = 'InstagramError', status = 400 } = {}) {
    super(message);
    this.name = 'InstagramError';
    this.code = code;
    this.subcode = subcode;
    this.type = type;
    this.status = status;
  }
}

const NO_ACCOUNT_MESSAGE =
  'لا يوجد حساب Instagram احترافي مرتبط بصفحة Facebook لهذه الشركة. اربط الحساب أولاً ثم أعد المحاولة.';

/**
 * تطبيع أي خطأ Graph إلى { message, code, subcode, type }
 */
function normalizeGraphError(error) {
  const graphError = error?.response?.data?.error;
  if (graphError) {
    return {
      message: graphError.message || 'خطأ من Instagram Graph API',
      code: graphError.code ?? null,
      subcode: graphError.error_subcode ?? null,
      type: graphError.type || 'GraphApiError',
    };
  }
  return {
    message: error?.message || 'تعذر الاتصال بـ Instagram Graph API',
    code: error?.code ?? null,
    subcode: null,
    type: 'NetworkError',
  };
}

function toInstagramError(error, status = 400) {
  const normalized = normalizeGraphError(error);
  return new InstagramError(normalized.message, {
    code: normalized.code,
    subcode: normalized.subcode,
    type: normalized.type,
    status,
  });
}

function graphUrl(pathname) {
  return `${getMetaGraphApiBaseUrl()}${pathname}`;
}

async function graphRequest(method, pathname, { params = {}, data = null } = {}) {
  try {
    const response = await axios.request({
      method,
      url: graphUrl(pathname),
      params,
      data,
      timeout: GRAPH_TIMEOUT_MS,
    });
    return response.data || {};
  } catch (error) {
    throw toInstagramError(error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * تحديد الحساب المستهدف للشركة
 */
async function resolveInstagramTarget(companyId, { igAccountId = null } = {}) {
  if (!companyId) {
    throw new InstagramError('معرّف الشركة مطلوب', { status: 400, type: 'ValidationError' });
  }

  const where = {
    companyId,
    status: 'connected',
    instagramAccountId: { not: null },
  };
  if (igAccountId) where.instagramAccountId = igAccountId;

  const page = await getSharedPrismaClient().facebookPage.findFirst({
    where,
    orderBy: { connectedAt: 'asc' },
  });

  if (!page || !page.instagramAccountId || !page.instagramAccountId.trim()) {
    throw new InstagramError(NO_ACCOUNT_MESSAGE, { status: 404, type: 'NoInstagramAccount' });
  }

  const igId = page.instagramAccountId.trim();
  let igUsername = page.instagramAccountName || null;

  if (!igUsername) {
    try {
      const profile = await graphRequest('GET', `/${igId}`, {
        params: { fields: 'username', access_token: page.pageAccessToken },
      });
      igUsername = profile.username || null;
    } catch (error) {
      igUsername = null; // اسم المستخدم تحسين شكلي فقط — لا نُفشل الطلب بسببه
    }
  }

  return {
    page,
    igId,
    igUsername,
    pageAccessToken: page.pageAccessToken,
  };
}

async function listMedia(target, { limit = 25 } = {}) {
  const payload = await graphRequest('GET', `/${target.igId}/media`, {
    params: {
      fields: MEDIA_FIELDS,
      limit: Math.min(Math.max(Number(limit) || 25, 1), 100),
      access_token: target.pageAccessToken,
    },
  });
  return { data: payload.data || [], paging: payload.paging || null };
}

/**
 * الإحصاءات — نتسامح مع المقاييس غير المتاحة لحساب/نوع الوسائط
 */
async function getMediaInsights(target, mediaId) {
  if (!mediaId) throw new InstagramError('معرّف الوسائط مطلوب', { status: 400, type: 'ValidationError' });

  const metricTiers = ['impressions,reach,engagement,saved', 'impressions,reach', 'engagement'];
  let lastError = null;

  for (const metric of metricTiers) {
    try {
      const payload = await graphRequest('GET', `/${mediaId}/insights`, {
        params: { metric, access_token: target.pageAccessToken },
      });
      const metrics = {};
      for (const item of payload.data || []) {
        const value = item.values?.[0]?.value;
        metrics[item.name] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
      }
      return metrics;
    } catch (error) {
      lastError = error;
    }
  }

  console.log('[INSTAGRAM] insights unavailable for media', mediaId, lastError?.message || '');
  return {};
}

const COMMENT_FIELDS =
  'id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}';

async function listComments(target, mediaId) {
  if (!mediaId) throw new InstagramError('معرّف الوسائط مطلوب', { status: 400, type: 'ValidationError' });

  const payload = await graphRequest('GET', `/${mediaId}/comments`, {
    params: { fields: COMMENT_FIELDS, limit: 50, access_token: target.pageAccessToken },
  });
  return { comments: payload.data || [] };
}

async function replyToComment(target, commentId, message) {
  if (!commentId) throw new InstagramError('معرّف التعليق مطلوب', { status: 400, type: 'ValidationError' });
  const text = (message || '').trim();
  if (!text) throw new InstagramError('نص الرد مطلوب', { status: 400, type: 'ValidationError' });

  const payload = await graphRequest('POST', `/${commentId}/replies`, {
    params: { message: text, access_token: target.pageAccessToken },
  });
  return { id: payload.id || null, text };
}

async function hideComment(target, commentId, hide = true) {
  if (!commentId) throw new InstagramError('معرّف التعليق مطلوب', { status: 400, type: 'ValidationError' });

  await graphRequest('POST', `/${commentId}`, {
    params: { hide: hide === true || hide === 'true', access_token: target.pageAccessToken },
  });
  return { id: commentId, hidden: hide === true || hide === 'true' };
}

async function deleteComment(target, commentId) {
  if (!commentId) throw new InstagramError('معرّف التعليق مطلوب', { status: 400, type: 'ValidationError' });

  await graphRequest('DELETE', `/${commentId}`, {
    params: { access_token: target.pageAccessToken },
  });
  return { id: commentId, deleted: true };
}

async function createPublishContainer(target, options = {}) {
  const {
    mediaType = 'IMAGE',
    imageUrl = null,
    videoUrl = null,
    caption = '',
    isReel = false,
    carouselItems = [],
  } = options;

  const type = String(mediaType || 'IMAGE').toUpperCase();

  if (type === 'CAROUSEL') {
    if (!Array.isArray(carouselItems) || carouselItems.length < 2) {
      throw new InstagramError('Carousel يتطلب عنصرين على الأقل', { status: 400, type: 'ValidationError' });
    }

    const childIds = [];
    for (const item of carouselItems) {
      const childParams = {
        is_carousel_item: true,
        access_token: target.pageAccessToken,
      };
      if (item.videoUrl) {
        childParams.media_type = 'VIDEO';
        childParams.video_url = item.videoUrl;
      } else if (item.imageUrl) {
        childParams.image_url = item.imageUrl;
      } else {
        throw new InstagramError('كل عنصر Carousel يحتاج رابط صورة أو فيديو', {
          status: 400,
          type: 'ValidationError',
        });
      }
      const child = await graphRequest('POST', `/${target.igId}/media`, { params: childParams });
      childIds.push(child.id);
    }

    const container = await graphRequest('POST', `/${target.igId}/media`, {
      params: {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: (caption || '').slice(0, 2200),
        access_token: target.pageAccessToken,
      },
    });
    return { containerId: container.id, childIds };
  }

  const params = { access_token: target.pageAccessToken };
  if (caption) params.caption = caption.slice(0, 2200);

  if (type === 'REELS' || (type === 'VIDEO' && isReel)) {
    if (!videoUrl) throw new InstagramError('رابط الفيديو مطلوب لنشر Reel', { status: 400, type: 'ValidationError' });
    params.media_type = 'REELS';
    params.video_url = videoUrl;
  } else if (type === 'VIDEO') {
    if (!videoUrl) throw new InstagramError('رابط الفيديو مطلوب', { status: 400, type: 'ValidationError' });
    params.media_type = 'VIDEO';
    params.video_url = videoUrl;
  } else {
    if (!imageUrl) throw new InstagramError('رابط الصورة مطلوب', { status: 400, type: 'ValidationError' });
    params.image_url = imageUrl;
  }

  const container = await graphRequest('POST', `/${target.igId}/media`, { params });
  return { containerId: container.id };
}

async function getContainerStatus(target, containerId) {
  if (!containerId) throw new InstagramError('معرّف الحاوية مطلوب', { status: 400, type: 'ValidationError' });

  const payload = await graphRequest('GET', `/${containerId}`, {
    params: { fields: 'status_code,status', access_token: target.pageAccessToken },
  });
  return {
    containerId,
    status_code: payload.status_code || 'UNKNOWN',
    status: payload.status || null,
  };
}

async function publishContainer(target, containerId) {
  if (!containerId) throw new InstagramError('معرّف الحاوية مطلوب', { status: 400, type: 'ValidationError' });

  const payload = await graphRequest('POST', `/${target.igId}/media_publish`, {
    params: { creation_id: containerId, access_token: target.pageAccessToken },
  });
  return { mediaId: payload.id || null };
}

/**
 * انتظار جاهزية الحاوية (FINISHED / ERROR / EXPIRED)
 */
async function waitForContainer(target, containerId, { timeoutMs = 120000, intervalMs = 5000 } = {}) {
  const deadline = Date.now() + Math.max(Number(timeoutMs) || 120000, 1000);
  const step = Math.max(Number(intervalMs) || 5000, 1000);
  let last = { containerId, status_code: 'IN_PROGRESS', status: null };

  while (Date.now() < deadline) {
    last = await getContainerStatus(target, containerId);
    if (last.status_code === 'FINISHED') return last;
    if (last.status_code === 'ERROR' || last.status_code === 'EXPIRED') {
      throw new InstagramError(
        last.status || `فشل تجهيز الحاوية (${last.status_code})`,
        { status: 400, type: 'ContainerError', code: last.status_code },
      );
    }
    await sleep(step);
  }

  throw new InstagramError('انتهت مدة انتظار تجهيز الحاوية على Instagram', {
    status: 400,
    type: 'ContainerTimeout',
    code: 'TIMEOUT',
  });
}

module.exports = {
  InstagramError,
  NO_ACCOUNT_MESSAGE,
  normalizeGraphError,
  resolveInstagramTarget,
  listMedia,
  getMediaInsights,
  listComments,
  replyToComment,
  hideComment,
  deleteComment,
  createPublishContainer,
  getContainerStatus,
  publishContainer,
  waitForContainer,
  MEDIA_FIELDS,
};
