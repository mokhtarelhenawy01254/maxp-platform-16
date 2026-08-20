/**
 * tiktokOAuthService.js
 * Shared OAuth/token/config helpers for all TikTok integrations.
 * Base domain: https://open.tiktokapis.com
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../sharedDatabase');

const TIKTOK_API_BASE = 'https://open.tiktokapis.com';
const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize';

const prisma = () => getSharedPrismaClient();

function getRedirectUri() {
  return (process.env.TIKTOK_REDIRECT_URI || '').trim();
}

function getAppCredentials(settings) {
  const clientKey = settings?.clientKey || process.env.TIKTOK_CLIENT_KEY || '';
  const clientSecret = settings?.clientSecret || process.env.TIKTOK_CLIENT_SECRET || '';
  return { clientKey: clientKey.trim(), clientSecret: clientSecret.trim() };
}

async function getSettings(companyId) {
  return prisma().tikTokSettings.findUnique({ where: { companyId } });
}

async function getAccount(companyId) {
  return prisma().tikTokAccount.findFirst({
    where: { companyId, status: 'connected' },
    orderBy: { updatedAt: 'desc' },
  });
}

async function upsertAccount(companyId, data) {
  const existing = data.openId
    ? await prisma().tikTokAccount.findUnique({
        where: { companyId_openId: { companyId, openId: data.openId } },
      })
    : null;

  if (existing) {
    return prisma().tikTokAccount.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma().tikTokAccount.create({ data: { companyId, ...data } });
}

async function saveToken(companyId, tokenData) {
  const { open_id: openId, access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, scope } = tokenData;
  const scopes = Array.isArray(scope) ? scope.join(',') : (typeof scope === 'string' ? scope : null);
  const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  return upsertAccount(companyId, {
    openId: openId || 'manual',
    accessToken,
    refreshToken: refreshToken || null,
    tokenExpiresAt,
    scopes,
    source: 'oauth',
    status: 'connected',
  });
}

function buildAuthUrl(clientKey, redirectUri, scope, state) {
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope,
    redirect_uri: redirectUri,
    state,
  });
  return `${TIKTOK_AUTH_BASE}/?${params.toString()}`;
}

async function exchangeCodeForToken(code, redirectUri, clientKey, clientSecret) {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await axios.post(`${TIKTOK_API_BASE}/v2/oauth/token/`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  return res.data;
}

async function refreshAccessToken(refreshToken, clientKey, clientSecret) {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await axios.post(`${TIKTOK_API_BASE}/v2/oauth/token/`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  return res.data;
}

async function getValidAccessToken(account, companyId) {
  if (!account) return null;
  const now = new Date();
  const expired = account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() - now.getTime() < 5 * 60 * 1000;

  if (!expired && account.accessToken) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    return account.accessToken || null;
  }

  try {
    const settings = await getSettings(companyId);
    const { clientKey, clientSecret } = getAppCredentials(settings);
    const data = await refreshAccessToken(account.refreshToken, clientKey, clientSecret);
    const newToken = data?.data?.access_token || data?.access_token;
    if (newToken) {
      const tokenExpiresAt = (data?.data?.expires_in || data?.expires_in)
        ? new Date(Date.now() + (data.data.expires_in || data.expires_in) * 1000)
        : null;
      await prisma().tikTokAccount.update({
        where: { id: account.id },
        data: { accessToken: newToken, refreshToken: data?.data?.refresh_token || account.refreshToken, tokenExpiresAt },
      });
      return newToken;
    }
  } catch (err) {
    console.error('Γ¥î [TikTok OAuth] Refresh failed:', err.response?.data || err.message);
  }
  return account.accessToken || null;
}

async function fetchUserInfo(accessToken) {
  const res = await axios.get(`${TIKTOK_API_BASE}/v2/user/info/`, {
    params: { fields: 'open_id,display_name,avatar_url,union_id' },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
  return res.data?.data?.user || null;
}

async function tiktokApi(config) {
  const res = await axios({ baseURL: TIKTOK_API_BASE, ...config });
  return res.data;
}

function extractApiError(res, fallback) {
  return {
    code: res?.error?.code ?? res?.error_code ?? res?.code ?? 'UNKNOWN',
    message: res?.error?.message ?? res?.message ?? fallback,
  };
}

module.exports = {
  TIKTOK_API_BASE,
  TIKTOK_AUTH_BASE,
  getRedirectUri,
  getAppCredentials,
  getSettings,
  getAccount,
  upsertAccount,
  saveToken,
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidAccessToken,
  fetchUserInfo,
  tiktokApi,
  extractApiError,
};
