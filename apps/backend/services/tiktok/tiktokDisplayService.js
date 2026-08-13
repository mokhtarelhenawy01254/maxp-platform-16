/**
 * tiktokDisplayService.js
 * TikTok Embed + Display API helpers:
 * - List account videos (video.list scope)
 * - Fetch account info (user.info.basic scope)
 * - Build official embed player URLs / profile embed HTML
 * - Storefront display settings (storefrontUsername, storefrontEnabled)
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const {
  getAccount,
  getValidAccessToken,
  getSettings: getOAuthSettings,
  tiktokApi,
  extractApiError,
} = require('./tiktokOAuthService');

const prisma = () => getSharedPrismaClient();

const VIDEO_LIST_FIELDS = 'video_id,title,cover_image_url,duration,create_time,embed_html';
const USER_INFO_FIELDS = 'open_id,display_name,avatar_url';
const TIKTOK_EMBED_JS_URL = 'https://www.tiktok.com/embed.js';

const normalizeVideo = (video) => {
  if (!video) return null;
  return {
    id: video.id || video.video_id || null,
    title: video.title || null,
    coverImageUrl: video.cover_image_url || null,
    duration: typeof video.duration === 'number' ? video.duration : Number(video.duration) || null,
    createTime: video.create_time || null,
    embedHtml: video.embed_html || null,
  };
};

async function getAccessTokenForAccount(companyId) {
  const account = await getAccount(companyId);
  if (!account) {
    throw { code: 'NO_ACCOUNT', message: 'اربط حساب TikTok أولاً' };
  }
  const accessToken = await getValidAccessToken(account, companyId);
  if (!accessToken) {
    throw { code: 'NO_VALID_TOKEN', message: 'رمز الوصول لحساب TikTok غير صالح' };
  }
  return accessToken;
}

async function getAccountVideos({ companyId, cursor }) {
  const accessToken = await getAccessTokenForAccount(companyId);
  const params = { fields: VIDEO_LIST_FIELDS };
  if (cursor) {
    params.cursor = cursor;
  }

  const res = await tiktokApi({
    method: 'GET',
    url: '/v2/video/list/',
    params,
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });

  const payload = res?.data || res;
  if (payload?.error) {
    const apiError = extractApiError(payload, 'فشل جلب فيديوهات TikTok');
    throw { code: apiError.code, message: apiError.message };
  }

  const videos = (Array.isArray(payload?.videos) ? payload.videos : [])
    .map(normalizeVideo)
    .filter(Boolean);

  return {
    videos,
    cursor: payload?.cursor ?? null,
    hasMore: Boolean(payload?.has_more),
  };
}

async function getAccountInfo({ companyId }) {
  const accessToken = await getAccessTokenForAccount(companyId);

  const res = await tiktokApi({
    method: 'GET',
    url: '/v2/user/info/',
    params: { fields: USER_INFO_FIELDS },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });

  const payload = res?.data || res;
  if (payload?.error) {
    const apiError = extractApiError(payload, 'فشل جلب بيانات حساب TikTok');
    throw { code: apiError.code, message: apiError.message };
  }

  const user = payload?.user || {};
  return {
    openId: user.open_id || user.openId || null,
    displayName: user.display_name || user.displayName || null,
    avatarUrl: user.avatar_url || user.avatarUrl || null,
  };
}

function buildEmbedUrl(videoId) {
  return `https://www.tiktok.com/player/v1/${videoId}?autoplay=0&controls=1&music=1`;
}

function buildProfileEmbedHtml(username) {
  const clean = String(username || '').replace(/^@/, '').trim();
  return `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@${clean}" data-unique-id="${clean}"><section></section></blockquote><script async src="${TIKTOK_EMBED_JS_URL}"></script>`;
}

async function getSettings(companyId) {
  if (!companyId) return null;
  return getOAuthSettings(companyId);
}

async function saveSettings(companyId, { storefrontUsername, storefrontEnabled }) {
  if (!companyId) {
    throw { code: 'COMPANY_REQUIRED', message: 'معرف الشركة مطلوب' };
  }

  const data = {};
  if (storefrontUsername !== undefined) {
    const normalized = String(storefrontUsername || '').trim().replace(/^@/, '');
    data.storefrontUsername = normalized || null;
  }
  if (storefrontEnabled !== undefined) {
    data.storefrontEnabled = Boolean(storefrontEnabled);
  }

  return prisma().tikTokSettings.upsert({
    where: { companyId },
    update: data,
    create: { companyId, ...data },
  });
}

module.exports = {
  getAccountVideos,
  getAccountInfo,
  buildEmbedUrl,
  buildProfileEmbedHtml,
  getSettings,
  saveSettings,
};
