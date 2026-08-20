/**
 * tiktokPublishService.js
 * TikTok Content Posting (Direct Post) helpers.
 * Uses the shared tiktokOAuthService for token + API access.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const {
  getAccount,
  getValidAccessToken,
  tiktokApi,
  extractApiError,
} = require('./tiktokOAuthService');

const PRIVACY_LEVELS = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWERS',
  'SELF_ONLY',
  'PRIVATE_TO_EVERYONE',
];

const STATUS_MAP = {
  PUBLISH_COMPLETE: 'PUBLISHED',
  FAILED: 'FAILED',
  PROCESSING_DOWNLOAD: 'PROCESSING',
  PROCESSING_UPLOAD: 'PROCESSING',
};

function isValidVideoUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

function buildHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

async function getPostAccessToken(post) {
  const account = await getAccount(post.companyId);
  if (!account) {
    throw { code: 'NO_ACCOUNT', message: '┘ä╪º ┘è┘ê╪¼╪» ╪¡╪│╪º╪¿ TikTok ┘à╪▒╪¬╪¿╪╖ ╪¿┘ç╪░┘ç ╪º┘ä╪┤╪▒┘â╪⌐' };
  }
  const accessToken = await getValidAccessToken(account, post.companyId);
  if (!accessToken) {
    throw { code: 'NO_ACCESS_TOKEN', message: '┘ä╪º ┘è┘ê╪¼╪» ╪¬┘ê┘â┘å ╪╡╪º┘ä╪¡ ┘ä╪¡╪│╪º╪¿ TikTok' };
  }
  return accessToken;
}

async function initPublish({ companyId, account, videoUrl, caption, privacyLevel }) {
  const prisma = getSharedPrismaClient();

  if (!isValidVideoUrl(videoUrl)) {
    throw { code: 'INVALID_VIDEO_URL', message: '╪▒╪º╪¿╪╖ ╪º┘ä┘ü┘è╪»┘è┘ê ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪î ┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ╪▒╪º╪¿╪╖ http(s) ╪╡╪º┘ä╪¡╪º┘ï' };
  }

  const finalPrivacyLevel = PRIVACY_LEVELS.includes(privacyLevel) ? privacyLevel : 'SELF_ONLY';

  const accessToken = await getValidAccessToken(account, companyId);
  if (!accessToken) {
    throw { code: 'NO_ACCESS_TOKEN', message: '┘ä╪º ┘è┘ê╪¼╪» ╪¬┘ê┘â┘å ╪╡╪º┘ä╪¡ ┘ä╪¡╪│╪º╪¿ TikTok╪î ╪ú╪╣╪» ╪▒╪¿╪╖ ╪º┘ä╪¡╪│╪º╪¿' };
  }

  let apiRes;
  try {
    apiRes = await tiktokApi({
      method: 'POST',
      url: '/v2/post/publish/video/init/',
      headers: buildHeaders(accessToken),
      data: {
        post_info: { title: caption || '', privacy_level: finalPrivacyLevel },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
        video_info: {},
      },
    });
  } catch (err) {
    const apiError = extractApiError(err?.response?.data, '┘ü╪┤┘ä ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿┘Ç TikTok ╪ú╪½┘å╪º╪í ╪¿╪»╪í ╪º┘ä┘å╪┤╪▒');
    throw { code: apiError.code, message: apiError.message };
  }

  const publishId = apiRes?.data?.publish_id;
  if (!publishId) {
    const apiError = extractApiError(apiRes, '┘ä┘à ┘è╪¬┘à ╪Ñ╪▒╪¼╪º╪╣ publish_id ┘à┘å TikTok');
    throw { code: apiError.code, message: apiError.message };
  }

  const existing = await prisma.tikTokPost.findFirst({ where: { publishId } });
  const data = {
    companyId,
    accountId: account.id,
    videoUrl,
    caption: caption || '',
    publishId,
    status: 'PROCESSING',
    metadata: JSON.stringify({ privacyLevel: finalPrivacyLevel }),
  };

  const post = existing
    ? await prisma.tikTokPost.update({ where: { id: existing.id }, data })
    : await prisma.tikTokPost.create({ data });

  return post;
}

async function pollStatus(prisma, post) {
  if (!post || !post.publishId) return post;

  const accessToken = await getPostAccessToken(post);

  let apiRes;
  try {
    apiRes = await tiktokApi({
      method: 'POST',
      url: '/v2/post/publish/status/fetch/',
      headers: buildHeaders(accessToken),
      data: { publish_id: post.publishId },
    });
  } catch (err) {
    const apiError = extractApiError(err?.response?.data, '┘ü╪┤┘ä ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿┘Ç TikTok ╪ú╪½┘å╪º╪í ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪⌐');
    throw { code: apiError.code, message: apiError.message };
  }

  const data = apiRes?.data || {};
  const tiktokStatus = data?.status;
  const mappedStatus = STATUS_MAP[tiktokStatus];

  const updates = {};
  if (mappedStatus === 'PUBLISHED') {
    updates.status = 'PUBLISHED';
    updates.publishedAt = new Date();
  } else if (mappedStatus === 'FAILED') {
    updates.status = 'FAILED';
    updates.errorMessage = data?.fail_reason || data?.error?.message || '┘ü╪┤┘ä ╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë TikTok';
  } else if (mappedStatus === 'PROCESSING') {
    updates.status = 'PROCESSING';
  }

  if (Object.keys(updates).length > 0) {
    return prisma.tikTokPost.update({ where: { id: post.id }, data: updates });
  }

  return post;
}

async function refreshStatus({ companyId, postId }) {
  const prisma = getSharedPrismaClient();
  const post = await prisma.tikTokPost.findFirst({ where: { id: postId, companyId } });
  if (!post) {
    throw { code: 'NOT_FOUND', message: '╪º┘ä┘à┘å╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' };
  }
  return pollStatus(prisma, post);
}

async function listPosts({ companyId, page, limit, status }) {
  const prisma = getSharedPrismaClient();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { companyId };
  if (status) where.status = status;

  const [total, posts] = await Promise.all([
    prisma.tikTokPost.count({ where }),
    prisma.tikTokPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  const accountIds = [...new Set(posts.map(p => p.accountId).filter(Boolean))];
  const accounts = accountIds.length > 0
    ? await prisma.tikTokAccount.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      })
    : [];
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  const data = posts.map(p => ({ ...p, account: accountMap.get(p.accountId) || null }));

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  };
}

module.exports = {
  initPublish,
  pollStatus,
  refreshStatus,
  listPosts,
};
