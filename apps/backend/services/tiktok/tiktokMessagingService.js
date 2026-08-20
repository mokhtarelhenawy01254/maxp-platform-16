/**
 * tiktokMessagingService.js
 * TikTok Business Messaging (DM) helpers — sends text messages to TikTok users
 * via the Business Messaging API, using the per-company TikTokBusinessAccount.
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../sharedDatabase');
const { getValidAccessToken } = require('./tiktokOAuthService');

const DEFAULT_SEND_ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/message/send/';

function getSendEndpoint() {
  return (process.env.TIKTOK_MESSAGING_SEND_ENDPOINT || '').trim() || DEFAULT_SEND_ENDPOINT;
}

function extractApiError(payload, fallback) {
  return {
    code: payload?.error?.code ?? payload?.error_code ?? payload?.code ?? 'UNKNOWN',
    message: payload?.error?.message ?? payload?.message ?? payload?.msg ?? fallback,
  };
}

async function getBusinessAccount(companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.tikTokBusinessAccount.findFirst({
    where: { companyId, status: 'connected' },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Send a text message to a TikTok user via Business Messaging API.
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.toOpenId  - recipient TikTok open_id
 * @param {string} params.text      - message body
 * @returns {Promise<{success:boolean, data?:{message_id:string}, message?:string, error?:string}>}
 */
async function sendTextMessage({ companyId, toOpenId, text }) {
  try {
    if (!companyId || !toOpenId || !text) {
      return { success: false, message: 'Missing companyId, toOpenId or text' };
    }

    const account = await getBusinessAccount(companyId);
    if (!account) {
      return { success: false, message: 'لا يوجد حساب TikTok Business مرتبط بهذه الشركة' };
    }

    const accessToken = await getValidAccessToken(account, companyId);
    if (!accessToken) {
      return { success: false, message: 'لا يوجد توكن صالح لحساب TikTok' };
    }

    const res = await axios.post(
      getSendEndpoint(),
      {
        to_open_id: toOpenId,
        message_type: 'TEXT',
        content: { text: String(text) },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );

    const body = res?.data || {};
    if (body?.error) {
      const apiError = extractApiError(body, 'فشل إرسال الرسالة على TikTok');
      return { success: false, error: apiError.message, code: apiError.code };
    }

    const messageId = body?.data?.message_id || body?.message_id || null;
    return {
      success: Boolean(messageId) || body?.code === 0,
      data: messageId ? { message_id: messageId } : undefined,
      message: messageId ? 'sent' : 'sent',
    };
  } catch (err) {
    const apiError = extractApiError(err?.response?.data, err?.message || 'فشل الاتصال بـ TikTok');
    return { success: false, error: apiError.message, code: apiError.code };
  }
}

/**
 * Status helpers used by the settings UI + health checks.
 */
async function getStatus(companyId) {
  const prisma = getSharedPrismaClient();
  const [settings, account] = await Promise.all([
    prisma.tikTokSettings.findUnique({ where: { companyId } }),
    getBusinessAccount(companyId),
  ]);

  return {
    enabled: Boolean(settings?.messagingEnabled ?? false),
    connected: Boolean(account),
    tiktokUsername: account?.displayName || account?.businessAccountId || null,
    webhookSecretSet: Boolean(settings?.webhookSecret || account?.webhookSecret),
  };
}

async function saveStatus(companyId, { enabled }) {
  const prisma = getSharedPrismaClient();
  const data = { messagingEnabled: Boolean(enabled) };
  const existing = await prisma.tikTokSettings.findUnique({ where: { companyId } });
  if (existing) {
    await prisma.tikTokSettings.update({ where: { companyId }, data });
  } else {
    await prisma.tikTokSettings.create({ data: { companyId, ...data } });
  }
  return getStatus(companyId);
}

module.exports = {
  sendTextMessage,
  getStatus,
  saveStatus,
  getBusinessAccount,
};