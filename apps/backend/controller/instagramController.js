/**
 * Instagram Studio Controller
 *
 * واجهات رقيقة فوق instagramGraphService — كل النداءات الخارجية داخل الخدمة.
 * حالة الاستجابة: 400 لأخطاء Graph، 404 لعدم ربط حساب Instagram، 200 لغير ذلك.
 */

const axios = require('axios');
const { getMetaGraphApiBaseUrl } = require('../config/metaApi');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const instagramGraphService = require('../services/instagramGraphService');

const { InstagramError } = instagramGraphService;

function respondError(res, error, context) {
  if (error instanceof InstagramError) {
    console.log(`[INSTAGRAM] ${context} -> ${error.status}: ${error.message}`);
    return res.status(error.status || 400).json({
      success: false,
      error: error.message,
      code: error.code ?? null,
      subcode: error.subcode ?? null,
      type: error.type || 'InstagramError',
    });
  }
  console.error(`[INSTAGRAM] ${context} -> 500:`, error?.message || error);
  return res.status(500).json({
    success: false,
    error: 'حدث خطأ غير متوقع أثناء تنفيذ طلب Instagram',
  });
}

function getCompanyId(req) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new InstagramError('مستخدم غير صالح أو غير مرتبط بشركة', {
      status: 401,
      type: 'Unauthorized',
    });
  }
  return companyId;
}

/**
 * GET /instagram/targets — الحسابات المتاحة بالاسم
 */
async function getTargets(req, res) {
  try {
    const companyId = getCompanyId(req);
    const pages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId,
        status: 'connected',
        instagramAccountId: { not: null },
      },
      orderBy: { connectedAt: 'asc' },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        instagramAccountId: true,
        instagramAccountName: true,
      },
    });

    const targets = (pages || [])
      .filter((page) => page.instagramAccountId && page.instagramAccountId.trim())
      .map((page) => ({
        igId: page.instagramAccountId.trim(),
        igUsername: page.instagramAccountName || null,
        pageName: page.pageName,
        pageId: page.pageId,
      }));

    return res.json({
      success: true,
      data: {
        targets,
        noAccountMessage: targets.length
          ? null
          : instagramGraphService.NO_ACCOUNT_MESSAGE,
      },
    });
  } catch (error) {
    return respondError(res, error, 'targets');
  }
}

async function getMedia(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { igAccountId, limit } = req.query;
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const result = await instagramGraphService.listMedia(target, { limit });

    return res.json({
      success: true,
      data: {
        account: {
          igId: target.igId,
          igUsername: target.igUsername,
          pageName: target.page.pageName,
        },
        media: result.data,
        paging: result.paging,
      },
    });
  } catch (error) {
    return respondError(res, error, 'media');
  }
}

async function getMediaInsights(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { mediaId } = req.params;
    const { igAccountId } = req.query;
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const metrics = await instagramGraphService.getMediaInsights(target, mediaId);

    return res.json({
      success: true,
      data: { mediaId, metrics },
    });
  } catch (error) {
    return respondError(res, error, 'media-insights');
  }
}

async function getComments(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { mediaId } = req.params;
    const { igAccountId } = req.query;
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const result = await instagramGraphService.listComments(target, mediaId);

    return res.json({
      success: true,
      data: { mediaId, comments: result.comments },
    });
  } catch (error) {
    return respondError(res, error, 'comments');
  }
}

async function replyComment(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { commentId } = req.params;
    const { message, igAccountId } = req.body || {};
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const result = await instagramGraphService.replyToComment(target, commentId, message);

    return res.json({ success: true, data: result });
  } catch (error) {
    return respondError(res, error, 'reply-comment');
  }
}

async function hideComment(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { commentId } = req.params;
    const { hide, igAccountId } = req.body || {};
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const result = await instagramGraphService.hideComment(target, commentId, hide !== false);

    return res.json({ success: true, data: result });
  } catch (error) {
    return respondError(res, error, 'hide-comment');
  }
}

async function deleteComment(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { commentId } = req.params;
    const { igAccountId } = req.query;
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const result = await instagramGraphService.deleteComment(target, commentId);

    return res.json({ success: true, data: result });
  } catch (error) {
    return respondError(res, error, 'delete-comment');
  }
}

async function createContainer(req, res) {
  try {
    const companyId = getCompanyId(req);
    const body = req.body || {};
    const target = await instagramGraphService.resolveInstagramTarget(companyId, {
      igAccountId: body.igAccountId,
    });
    const result = await instagramGraphService.createPublishContainer(target, body);

    return res.json({ success: true, data: result });
  } catch (error) {
    return respondError(res, error, 'create-container');
  }
}

async function getContainerStatus(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { containerId } = req.params;
    const { igAccountId } = req.query;
    const target = await instagramGraphService.resolveInstagramTarget(companyId, { igAccountId });
    const result = await instagramGraphService.getContainerStatus(target, containerId);

    return res.json({ success: true, data: result });
  } catch (error) {
    return respondError(res, error, 'container-status');
  }
}

/**
 * POST /instagram/publish/now — إنشاء الحاوية + الانتظار + النشر في نداء واحد
 */
async function publishNow(req, res) {
  try {
    const companyId = getCompanyId(req);
    const body = req.body || {};
    const target = await instagramGraphService.resolveInstagramTarget(companyId, {
      igAccountId: body.igAccountId,
    });

    // إن مرّر العميل containerId جاهزاً (أُنشئ عبر /publish/container ومُراقَبته)
    // ننتظر جاهزيته وننشره فقط — بدون إنشاء حاوية ثانية وتكرار النشر.
    const containerId = body.containerId
      ? String(body.containerId)
      : (await instagramGraphService.createPublishContainer(target, body)).containerId;

    await instagramGraphService.waitForContainer(target, containerId, {
      timeoutMs: body.timeoutMs,
      intervalMs: body.intervalMs,
    });
    const published = await instagramGraphService.publishContainer(target, containerId);

    let permalink = null;
    if (published.mediaId) {
      try {
        const media = await axios.get(
          `${getMetaGraphApiBaseUrl()}/${published.mediaId}`,
          {
            params: { fields: 'permalink', access_token: target.pageAccessToken },
            timeout: 15000,
          },
        );
        permalink = media.data?.permalink || null;
      } catch (permaLinkError) {
        console.log('[INSTAGRAM] permalink lookup skipped:', permaLinkError?.message);
      }
    }

    return res.json({
      success: true,
      data: {
        containerId,
        mediaId: published.mediaId,
        permalink,
      },
    });
  } catch (error) {
    return respondError(res, error, 'publish-now');
  }
}

module.exports = {
  getTargets,
  getMedia,
  getMediaInsights,
  getComments,
  replyComment,
  hideComment,
  deleteComment,
  createContainer,
  getContainerStatus,
  publishNow,
};
