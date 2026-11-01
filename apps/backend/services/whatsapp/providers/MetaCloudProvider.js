/**
 * Meta WhatsApp Cloud API Provider
 * Sends messages via Graph API for official WhatsApp.
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../../sharedDatabase');
const { getMetaGraphApiVersion } = require('../../../config/metaApi');
const { mapError } = require('../whatsappErrorCodes');
const { decryptField } = require('../../../utils/fieldEncryption');

async function getSession(sessionId) {
  return await getSharedPrismaClient().whatsAppSession.findUnique({
    where: { id: sessionId }
  });
}

function resolveBaseConfig(session) {
  const apiVersion = session?.metaApiVersion || getMetaGraphApiVersion();
  const accessToken = decryptField(session?.metaAccessToken);
  if (!accessToken) {
    throw new Error('Missing Meta Cloud access token for session');
  }
  return { apiVersion, accessToken };
}

function resolveConfig(session) {
  const base = resolveBaseConfig(session);
  const phoneNumberId = session?.metaPhoneNumberId;

  if (!phoneNumberId) {
    throw new Error('Missing Meta Cloud phone number ID for session');
  }

  return { ...base, phoneNumberId };
}

function normalizePhone(to) {
  if (!to) return '';
  let cleaned = String(to)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  // Egyptian local numbers (01xxxxxxxxx -> 201xxxxxxxxx)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '20' + cleaned.substring(1);
  } else if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
}

async function apiCall(fn) {
  try {
    return await fn();
  } catch (err) {
    const mapped = mapError(err);
    const error = new Error(mapped.apiMessage || mapped.reason || 'WhatsApp API error');
    error.code = mapped.code;
    error.reason = mapped.reason;
    error.retryable = mapped.retryable;
    error.details = mapped.details;
    error.httpStatus = mapped.httpStatus;
    error.statusCode = mapped.httpStatus || (mapped.code === 100 ? 400 : 500);
    error.originalError = err;
    throw error;
  }
}

async function postMessage(session, payload) {
  if (payload && 'to' in payload) {
    const recipient = String(payload.to || '').trim();
    if (!recipient || recipient.length < 6) {
      const err = new Error('رقم هاتف المستلم غير صحيح أو مفقود');
      err.statusCode = 400;
      err.code = 'WA_INVALID_RECIPIENT';
      throw err;
    }
  }

  const { apiVersion, accessToken, phoneNumberId } = resolveConfig(session);
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await apiCall(() => axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  }));

  const messageId = response.data?.messages?.[0]?.id || response.data?.message_id || null;
  if (!messageId) {
    // 🔍 DIAG (2026-08-26): ميتا رجعت رد من غير messageId — اطبع الـ body كامل
    console.error('❌ [META-CLOUD] postMessage returned no messageId. Full response:', JSON.stringify(response.data));
  }
  return {
    messageId,
    raw: response.data
  };
}

// ── Cache for Meta templates to prevent explosive memory & rate-limit crashes ──
const templateListCache = new Map();
const TEMPLATE_LIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

let redisCacheService = null;
try {
  redisCacheService = require('../../redisCacheService');
} catch (e) {
  // fallback if redis service not available
}

function invalidateTemplateCache(sessionId) {
  if (sessionId) {
    templateListCache.delete(sessionId);
    if (redisCacheService && typeof redisCacheService.del === 'function') {
      redisCacheService.del(`meta_templates:${sessionId}`).catch(() => {});
    }
  } else {
    templateListCache.clear();
  }
}

async function listTemplates(sessionId, options = {}) {
  const forceRefresh = Boolean(options && (options.forceRefresh || options.refresh));

  // 1. Check in-memory process cache first
  const cached = templateListCache.get(sessionId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.templates;
  }

  // 2. Check distributed Redis cache (shared across all PM2 cluster workers)
  if (!forceRefresh && redisCacheService && typeof redisCacheService.get === 'function') {
    try {
      const redisCached = await redisCacheService.get(`meta_templates:${sessionId}`);
      if (Array.isArray(redisCached) && redisCached.length > 0) {
        templateListCache.set(sessionId, {
          templates: redisCached,
          expiresAt: Date.now() + TEMPLATE_LIST_CACHE_TTL_MS
        });
        return redisCached;
      }
    } catch (redisErr) {
      console.warn('⚠️ [MetaCloudProvider] Redis cache read failed (falling back to Meta API):', redisErr.message);
    }
  }

  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) {
    throw new Error('Missing Meta WABA ID for session');
  }

  // 🔧 Meta Graph API pagination
  const baseUrl = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
  const allTemplates = [];
  let afterCursor = null;

  do {
    const url = `${baseUrl}?limit=200${afterCursor ? `&after=${encodeURIComponent(afterCursor)}` : ''}`;
    const response = await apiCall(() => axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 30000
    }));

    const pageData = response.data?.data || [];
    allTemplates.push(...pageData);
    afterCursor = response.data?.paging?.cursors?.after || null;

    // 🚀 Performance Guard:
    // Meta always returns cursors.after even on the last page.
    // We only continue if Meta explicitly returned paging.next AND pageData has reached limit (200).
    // If pageData is empty or less than 200, or paging.next is missing, break immediately!
    if (!response.data?.paging?.next || pageData.length < 200) {
      break;
    }
  } while (afterCursor);

  templateListCache.set(sessionId, {
    templates: allTemplates,
    expiresAt: Date.now() + TEMPLATE_LIST_CACHE_TTL_MS
  });

  if (redisCacheService && typeof redisCacheService.set === 'function') {
    try {
      await redisCacheService.set(`meta_templates:${sessionId}`, allTemplates, 600); // 10 minutes TTL
    } catch (redisSetErr) {
      // non-fatal
    }
  }

  return allTemplates;
}

/**
 * 🎯 قراءة قالب واحد بالـ metaTemplateId مباشرة من Graph API.
 * أرخص وأدق من سحب كل قوالب الـWABA لما عايزين نتأكد من عدد متغيرات قالب
 * الشركة المستخدَم فعلًا (بارامترات BODY) قبل الإرسال.
 *
 * @param {string} sessionId جلسة META_CLOUD (بها access token)
 * @param {string} templateId metaTemplateId المخزّن في صف قالب الشركة
 * @returns {Promise<Object|null>} { id, name, status, components, ... } أو null
 */
async function getTemplateById(sessionId, templateId) {
  if (!sessionId || !templateId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const url =
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(templateId)}` +
    '?fields=id,name,status,components';

  const response = await apiCall(() => axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 15000
  }));

  return response?.data || null;
}

async function sendText(sessionId, to, text, options = {}) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone || normalizedPhone.length < 6) {
    const error = new Error('رقم هاتف المستلم غير صحيح أو مفقود ولا يمكن إرسال الرسالة إليه');
    error.statusCode = 400;
    error.code = 'WA_INVALID_RECIPIENT';
    throw error;
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: {
      body: text,
      preview_url: !!options.previewUrl
    }
  };

  return await postMessage(session, payload);
}

function makeUrlAbsolute(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl = (process.env.APP_URL || 'https://maxp.online').replace(/\/$/, '');
  const relativePath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${relativePath}`;
}

/**
 * كشف الـ URLs الداخلية التي لا تستطيع خوادم Meta الوصول إليها.
 * ميتا تتحمّل الـ link من خوادمها، فـ localhost/127.0.0.1/عناوين خاصة
 * (10.x, 172.16-31.x, 192.168.x) مش متاحة لها → لازم نرفعها بـ media id.
 */
function isInternalUrl(url) {
  if (!url) return false;
  if (!/^https?:\/\//i.test(String(url))) return true; // نسبي = داخلي
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (!hostname) return true;
    if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]' || hostname === '0.0.0.0') return true;
    if (/^127\./.test(hostname)) return true;
    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
    return false;
  } catch (e) {
    return true;
  }
}

function guessMediaMime(url, fallback = 'image/jpeg') {
  const clean = String(url || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.ogg')) return 'audio/ogg';
  return fallback;
}

function guessMediaFileName(url, fallback = 'media') {
  try {
    const pathname = new URL(url).pathname;
    const base = decodeURIComponent(pathname.split('/').pop() || '');
    if (base && base.includes('.')) return base;
  } catch (e) { /* ignore */ }
  return fallback;
}

async function downloadMediaBuffer(url, timeoutMs = 20000) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: timeoutMs,
    maxContentLength: 20 * 1024 * 1024,
    maxBodyLength: 20 * 1024 * 1024,
  });
  return Buffer.from(response.data);
}
async function uploadMediaFile(sessionId, fileBuffer, mimetype, filename) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const { apiVersion, accessToken, phoneNumberId } = resolveConfig(session);
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`;

  const FormData = require('form-data');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', fileBuffer, { filename, contentType: mimetype });
  form.append('type', mimetype);

  const response = await apiCall(() => axios.post(url, form, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...form.getHeaders()
    },
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  }));

  return response.data?.id || null;
}

/**
 * يرفع وسيطاً (صورة/فيديو/مستند) لاستخدامه في HEADER قالب ميتا عبر
 * Resumable Upload API — ميتا تتطلب الـ handle الناتج في example.header_handle
 * عند إنشاء/تعديل قالب هيدره من نوع IMAGE|VIDEO|DOCUMENT.
 *
 * @returns {Promise<string|null>} الـ handle (h) أو id، أو null عند الفشل
 */
async function uploadTemplateMedia(sessionId, fileBuffer, mimetype, filename) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const { apiVersion, accessToken } = resolveBaseConfig(session);

  // 🔧 FIX (2026-10-22): Resumable Upload API بتاعة ميتا بتشتغل على **APP ID**
  // مش على WABA ID — النداء القديم كان بيرمي `/{wabaId}/uploads` فيرجّع
  // "Object with ID ... does not exist ... does not support this operation" (500).
  // كمان الرفع محتاج **خطوتين**: (1) إنشاء upload session، (2) رفع البايتات
  // على `/upload:<session>` بـ `Authorization: OAuth` + `file_offset`، والرد
  // فيه الـ handle (h) اللي يتكتب في example.header_handle.
  const uploadMeta = await prepareTemplateUploadMedia(fileBuffer, mimetype, filename);
  const { buffer, mimetype: uploadMime, fileName } = uploadMeta;

  const appIdCandidates = await resolveTemplateUploadAppIds(session, accessToken, apiVersion);
  if (!appIdCandidates.length) {
    throw new Error('تعذّر تحديد Meta App ID اللازم لرفع وسائط القالب');
  }

  let uploadSessionId = null;
  let lastError = null;

  for (const appId of appIdCandidates) {
    try {
      uploadSessionId = await startTemplateUploadSession({
        appId, accessToken, apiVersion, fileLength: buffer.length, fileType: uploadMime, fileName
      });
      if (uploadSessionId) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!uploadSessionId) {
    throw lastError || new Error('فشل بدء جلسة رفع الوسائط إلى ميتا');
  }

  const handle = await finishTemplateUploadSession({
    uploadSessionId, accessToken, apiVersion, buffer, mimetype: uploadMime
  });

  return handle || null;
}

// ميتا بتقبل بس هذه الصيغ في Resumable Upload API — أي صورة تانية (WEBP/BMP/HEIC)
// لازم تتحوّل لـ JPEG قبل الرفع وإلا الطلب يترفض.
const TEMPLATE_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4'
]);

async function prepareTemplateUploadMedia(fileBuffer, mimetype, filename) {
  const fallbackName = `template_media_${Date.now()}`;
  let buffer = fileBuffer;
  let uploadMime = String(mimetype || '').toLowerCase() || 'image/jpeg';
  let fileName = filename || fallbackName;

  if (uploadMime.startsWith('image/') && !TEMPLATE_UPLOAD_MIME_TYPES.has(uploadMime)) {
    const { normalizeImageForWhatsApp } = require('../../../utils/whatsAppImageCompat');
    const normalized = await normalizeImageForWhatsApp(buffer, uploadMime);
    buffer = normalized.buffer || buffer;
    uploadMime = String(normalized.mimetype || 'image/jpeg').toLowerCase();
    fileName = `${String(fileName).replace(/\.[^.]+$/, '') || fallbackName}.jpg`;
  }

  if (!TEMPLATE_UPLOAD_MIME_TYPES.has(uploadMime)) {
    throw new Error(`نوع الملف غير مدعوم في قوالب ميتا: ${uploadMime}`);
  }

  return { buffer, mimetype: uploadMime, fileName };
}

// ترتيب المرشّحين: الـ app المالك للتوكن (GET /app) ثم الإعدادات ثم الـ session.
async function resolveTemplateUploadAppIds(session, accessToken, apiVersion) {
  let { getFacebookOAuthConfig } = {};
  try {
    ({ getFacebookOAuthConfig } = require('../../../config/facebookAppConfig'));
  } catch (_) {
    // إعدادات فيسبوك غير متاحة — نكمل بالمرشّحين الآخرين
  }

  const config = typeof getFacebookOAuthConfig === 'function' ? getFacebookOAuthConfig() : {};
  const now = Date.now();
  const cached = templateUploadAppIdCache.get(session?.id);
  const discovered = cached && cached.expiresAt > now ? cached.appId : null;

  const candidates = [
    discovered,
    session?.metaAppId,
    config?.whatsappAppId,
    config?.appId,
    process.env.FACEBOOK_APP_ID,
    process.env.WHATSAPP_APP_ID
  ];

  if (!discovered) {
    const resolved = await discoverTemplateUploadAppId(session?.id, accessToken, apiVersion);
    if (resolved) candidates.unshift(resolved);
  }

  return [...new Set(
    candidates
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => /^\d{6,}$/.test(value))
  )];
}

const templateUploadAppIdCache = new Map();
const TEMPLATE_APP_ID_TTL_MS = 6 * 60 * 60 * 1000;

async function discoverTemplateUploadAppId(sessionId, accessToken, apiVersion) {
  try {
    const response = await axios.get(`https://graph.facebook.com/${apiVersion}/app`, {
      params: { fields: 'id,name', access_token: accessToken },
      timeout: 15000
    });
    const appId = response.data?.id ? String(response.data.id) : '';
    if (/^\d{6,}$/.test(appId)) {
      if (sessionId) {
        templateUploadAppIdCache.set(sessionId, { appId, expiresAt: Date.now() + TEMPLATE_APP_ID_TTL_MS });
      }
      return appId;
    }
  } catch (error) {
    // بعض التوكنات (system user) مش بتسمح بـ /app — نرجع للإعدادات
  }
  return null;
}

async function startTemplateUploadSession({ appId, accessToken, apiVersion, fileLength, fileType, fileName }) {
  const response = await apiCall(() => axios.post(
    `https://graph.facebook.com/${apiVersion}/${appId}/uploads`,
    null,
    {
      params: {
        file_name: fileName,
        file_length: String(fileLength),
        file_type: fileType,
        access_token: accessToken
      },
      timeout: 60000
    }
  ));

  const sessionId = response.data?.id;
  if (!sessionId) {
    throw new Error('ميتا لم ترجع upload session id');
  }
  return sessionId;
}

async function finishTemplateUploadSession({ uploadSessionId, accessToken, apiVersion, buffer, mimetype }) {
  const sessionPath = String(uploadSessionId).startsWith('upload:')
    ? uploadSessionId
    : `upload:${uploadSessionId}`;

  const response = await apiCall(() => axios.post(
    `https://graph.facebook.com/${apiVersion}/${sessionPath}`,
    buffer,
    {
      headers: {
        // ميتا بتطلب OAuth هنا (مش Bearer) وإلا الطلب يترفض
        Authorization: `OAuth ${accessToken}`,
        file_offset: '0',
        'Content-Type': mimetype || 'application/octet-stream'
      },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
  ));

  return response.data?.h || null;
}

async function sendMedia(sessionId, to, media, kind, options = {}) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  let mediaObj = media;
  if (typeof media === 'string') {
    mediaObj = { url: media };
  }

  const mediaPayload = {};

  if (mediaObj?.id || mediaObj?.mediaId) {
    mediaPayload.id = mediaObj.id || mediaObj.mediaId;
  } else if (mediaObj?.buffer && (kind === 'audio' || kind === 'video')) {
    const uploadMime = kind === 'video'
      ? (mediaObj.mimetype || 'video/mp4')
      : (mediaObj.mimetype || 'audio/ogg');
    const uploadFileName = mediaObj.fileName || (kind === 'video' ? 'video.mp4' : `voice_note.${uploadMime.split('/')[1] || 'ogg'}`);

    const mediaId = await uploadMediaFile(
      sessionId,
      mediaObj.buffer,
      uploadMime,
      uploadFileName
    );
    if (mediaId) {
      mediaPayload.id = mediaId;
    } else {
      throw new Error('فشل رفع الملف إلى خوادم Meta');
    }
  } else {
    const rawUrl = mediaObj?.url || mediaObj?.link;
    if (rawUrl) {
      const guessedMime = mediaObj?.mimetype || guessMediaMime(rawUrl, kind === 'image' ? 'image/jpeg' : 'application/octet-stream');
      // 🚨 ميتا بتتحمّل الـ link من خوادمها — الـ URLs الداخلية (localhost/خاصة)
      // مش متاحة لها، فبننزّل الملف ونرفعه لخوادم ميتا ونبعت بـ media id.
      // وكمان صور WEBP/BMP/SVG (صيغ مش مدعومة لرسائل الصور في Cloud API)
      // لازم تتحوّل لـ JPEG محلياً — حتى لو الرابط عام، ميتا مش هتعرف تعرضه.
      const needsLocalUpload = isInternalUrl(rawUrl) || (kind === 'image' && !['image/jpeg', 'image/png', 'image/gif'].includes(guessedMime));
      if (needsLocalUpload) {
        try {
          let buffer = await downloadMediaBuffer(makeUrlAbsolute(rawUrl));
          let mime = guessedMime;
          let fileName = mediaObj?.fileName || guessMediaFileName(rawUrl, `media_${Date.now()}`);
          if (kind === 'image') {
            const { normalizeImageForWhatsApp } = require('../../../utils/whatsAppImageCompat');
            const normalized = await normalizeImageForWhatsApp(buffer, mime);
            buffer = normalized.buffer;
            mime = normalized.mimetype;
          }
          const mediaId = await uploadMediaFile(sessionId, buffer, mime, fileName);
          if (mediaId) {
            mediaPayload.id = mediaId;
          } else {
            throw new Error('فشل رفع الملف إلى خوادم Meta');
          }
        } catch (uploadErr) {
          // فشل التحميل أو الرفع → fallback للـ link المطلق (قد ينجح لو الـ host عام)
          console.warn(`⚠️ [META-SEND] Internal media upload failed, falling back to link: ${uploadErr.message}`);
          mediaPayload.link = makeUrlAbsolute(rawUrl);
        }
      } else {
        mediaPayload.link = makeUrlAbsolute(rawUrl);
      }
    }
  }

  const caption = options.caption || mediaObj?.caption;
  if (caption) {
    mediaPayload.caption = caption;
  }

  const filename = options.fileName || mediaObj?.fileName;
  if (filename && kind === 'document') {
    mediaPayload.filename = filename;
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: kind,
    [kind]: mediaPayload
  };

  return await postMessage(session, payload);
}

async function sendLocation(sessionId, to, location) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'location',
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      address: location.address
    }
  };

  return await postMessage(session, payload);
}

async function sendContacts(sessionId, to, contacts) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'contacts',
    contacts
  };

  return await postMessage(session, payload);
}

async function sendReaction(sessionId, to, messageId, emoji) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'reaction',
    reaction: {
      message_id: messageId,
      emoji
    }
  };

  return await postMessage(session, payload);
}

async function sendTemplate(sessionId, to, templateName, languageCodeOrOptions, components = []) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  let languageCode = 'ar';
  let finalComponents = components;

  if (typeof languageCodeOrOptions === 'object' && languageCodeOrOptions !== null) {
    languageCode = languageCodeOrOptions.language || languageCodeOrOptions.languageCode || 'ar';
    if (Array.isArray(languageCodeOrOptions.components)) {
      finalComponents = languageCodeOrOptions.components;
    }
  } else if (typeof languageCodeOrOptions === 'string' && languageCodeOrOptions.trim()) {
    languageCode = languageCodeOrOptions.trim();
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: finalComponents
    }
  };

  return await postMessage(session, payload);
}

async function sendInteractive(sessionId, to, interactivePayload) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: interactivePayload
  };

  return await postMessage(session, payload);
}

async function sendRaw(sessionId, payload) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  return await postMessage(session, payload);
}

async function checkContact(sessionId, phoneNumbers) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const config = resolveConfig(session);
  const { apiVersion, accessToken, phoneNumberId } = config;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/contacts`;

  console.error('🔍 [MetaCloud checkContact debug]:', {
    sessionId,
    provider: session.provider,
    hasToken: !!accessToken,
    tokenPrefix: accessToken?.substring(0, 10),
    phoneNumberId,
    apiVersion,
    url,
    numbers: phoneNumbers,
  });

  const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
  const normalizedNumbers = numbers.map(n => normalizePhone(n));

  try {
    const response = await apiCall(() => axios.post(url, {
      messaging_product: 'whatsapp',
      contacts: normalizedNumbers
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }));

    return response.data?.contacts || [];
  } catch (err) {
    console.error('❌ MetaCloud checkContact error:', {
      status: err.httpStatus || err.response?.status,
      code: err.code,
      reason: err.reason,
      data: JSON.stringify(err.response?.data),
      url,
      phoneNumberId,
    });
    throw err;
  }
}

function generateComponentExamples(components) {
  return components.map(comp => {
    if (comp.type === 'BODY' && comp.text) {
      // عدد المتغيرات الفريد (مش عدد مرات التكرار) — ميتا تطلب قيمة لكل متغير مرة واحدة،
      // فلو {{1}} اتكرر مرتين لازم يفضل عنصر واحد في المصفوفة وإلا القالب يترفض.
      const varCount = new Set(comp.text.match(/\{\{\d+\}\}/g) || []).size;
      if (varCount > 0 && !comp.example) {
        const examples = Array.from({ length: varCount }, (_, i) => `example${i + 1}`);
        return { ...comp, example: { body_text: [examples] } };
      }
    }
    // HEADER وسائط (IMAGE/VIDEO/DOCUMENT): ميتا تتطلب example.header_handle
    // من Resumable Upload API عند إنشاء/تعديل القالب — من غيره يرفض القالب.
    if (comp.type === 'HEADER' && comp.format && comp.format !== 'TEXT') {
      // نشيل الحقول الداخلية (headerHandle/mediaHandle) قبل الإرسال — ميتا ترفض
      // أي مفتاح غير معروف بـ (#100) Unexpected key "headerHandle".
      const { headerHandle, mediaHandle, ...rest } = comp;
      const mediaHandleValue = headerHandle || mediaHandle || rest.example?.header_handle?.[0];
      if (mediaHandleValue) {
        return { ...rest, example: { ...(rest.example || {}), header_handle: [mediaHandleValue] } };
      }
      return rest;
    }
    return comp;
  });
}

async function createTemplate(sessionId, templateData) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) throw new Error('Missing Meta WABA ID for session');

  const { name, language, category, components: rawComponents, allowCategoryChange, generateExample = true } = templateData;
  if (!name || !language || !category) {
    throw new Error('Missing required fields: name, language, category');
  }

  let components;
  if (category === 'AUTHENTICATION') {
    // Normalization for Meta Graph API Authentication Template specification:
    // 1. BODY: Meta restricts custom body text. Requires add_security_recommendation, no text, no example.
    // 2. FOOTER: code_expiration_minutes (integer), no text.
    // 3. BUTTONS: type OTP with otp_type COPY_CODE.
    const rawList = Array.isArray(rawComponents) ? rawComponents : [];
    components = rawList.map(comp => {
      const type = (comp.type || '').toUpperCase();
      if (type === 'BODY') {
        const bodyComp = { type: 'BODY' };
        if (typeof comp.add_security_recommendation === 'boolean') {
          bodyComp.add_security_recommendation = comp.add_security_recommendation;
        } else if (comp.addSecurityRecommendation !== undefined) {
          bodyComp.add_security_recommendation = Boolean(comp.addSecurityRecommendation);
        } else {
          bodyComp.add_security_recommendation = true;
        }
        return bodyComp;
      }
      if (type === 'FOOTER') {
        const mins = Number(comp.code_expiration_minutes || comp.codeExpirationMinutes || 10);
        return {
          type: 'FOOTER',
          code_expiration_minutes: Math.max(1, Math.min(90, isNaN(mins) ? 10 : mins))
        };
      }
      if (type === 'BUTTONS') {
        const rawBtns = Array.isArray(comp.buttons) ? comp.buttons : [];
        const buttons = rawBtns.map(b => ({
          type: 'OTP',
          otp_type: 'COPY_CODE',
          text: b.text || 'نسخ الرمز'
        }));
        return {
          type: 'BUTTONS',
          buttons: buttons.length > 0 ? buttons : [{ type: 'OTP', otp_type: 'COPY_CODE', text: 'نسخ الرمز' }]
        };
      }
      return comp;
    });

    if (!components.some(c => c.type === 'BODY')) {
      components.unshift({ type: 'BODY', add_security_recommendation: true });
    }
  } else {
    components = generateExample ? generateComponentExamples(rawComponents) : rawComponents;
  }

  const payload = {
    name,
    language,
    category,
    components
  };

  if (category === 'AUTHENTICATION') {
    if (templateData.messageSendTtlSeconds || templateData.message_send_ttl_seconds) {
      payload.message_send_ttl_seconds = Number(templateData.messageSendTtlSeconds || templateData.message_send_ttl_seconds);
    }
  } else if (allowCategoryChange) {
    payload.allow_category_change = true;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
  const response = await apiCall(() => axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  }));

  invalidateTemplateCache(sessionId);
  return response.data;
}

/**
 * تعديل قالب موجود في ميتا.
 * الـ endpoint الصحيح (حسب وثائق ميتا 2026) هو POST مباشرة على الـ template ID:
 *   POST /{apiVersion}/{message-template-id}   body: { components, category, message_send_ttl_seconds }
 * (وليس /{wabaId}/message_templates/{id} ولا ?name= — تلك تُفسَّر كإنشاء وترفض).
 * القوالب APPROVED/REJECTED/PAUSED قابلة للتعديل، وميتا تعيد الموافقة تلقائياً بعد التعديل.
 * لا يمكن تعديل category لقالب APPROVED — أرسل components فقط في هذه الحالة.
 *
 * @param {string} sessionId
 * @param {string} templateId  الرقمي لقالب ميتا (message-template-id)
 * @param {object} templateData  { components?, category?, messageSendTtlSeconds? }
 */
async function updateTemplate(sessionId, templateId, templateData) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  if (!templateId) throw new Error('Missing Meta message template ID for update');

  const components = templateData.components
    ? generateComponentExamples(templateData.components)
    : undefined;

  const payload = {};
  if (components) payload.components = components;
  if (templateData.category) payload.category = templateData.category;
  if (templateData.messageSendTtlSeconds != null) payload.message_send_ttl_seconds = templateData.messageSendTtlSeconds;

  console.log(`☁️ [META-UPDATE] Updating Meta template id=${templateId}`, JSON.stringify({ components: payload.components?.length, category: payload.category, message_send_ttl_seconds: payload.message_send_ttl_seconds }));

  const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(templateId)}`;
  const response = await apiCall(() => axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  }));

  const data = response.data;
  if (data?.error) {
    const metaErr = new Error(data.error.message || 'Meta API rejected template update');
    metaErr.code = data.error.code;
    metaErr.metaError = data.error;
    throw metaErr;
  }

  invalidateTemplateCache(sessionId);
  console.log(`☁️ [META-UPDATE] Response:`, JSON.stringify({ success: data?.success, id: data?.id, status: data?.status }));
  return data;
}

async function deleteTemplate(sessionId, templateName) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) throw new Error('Missing Meta WABA ID for session');

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;
  const response = await apiCall(() => axios.delete(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 30000
  }));

  invalidateTemplateCache(sessionId);
  return response.data;
}

module.exports = {
  resolveConfig,
  resolveBaseConfig,
  sendText,
  sendMedia,
  uploadMediaFile,
  uploadTemplateMedia,
  sendLocation,
  sendContacts,
  sendReaction,
  sendTemplate,
  sendInteractive,
  sendRaw,
  listTemplates,
  invalidateTemplateCache,
  getTemplateById,
  checkContact,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
