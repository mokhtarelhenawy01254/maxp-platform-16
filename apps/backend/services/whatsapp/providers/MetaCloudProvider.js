/**
 * Meta WhatsApp Cloud API Provider
 * Sends messages via Graph API for official WhatsApp.
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../../sharedDatabase');
const { getMetaGraphApiVersion } = require('../../../config/metaApi');

async function getSession(sessionId) {
  return await getSharedPrismaClient().whatsAppSession.findUnique({
    where: { id: sessionId }
  });
}

function resolveBaseConfig(session) {
  const apiVersion = session?.metaApiVersion || getMetaGraphApiVersion();
  const accessToken = session?.metaAccessToken;
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
  if (!to) return to;
  return to.replace(/\D/g, '');
}

async function postMessage(session, payload) {
  const { apiVersion, accessToken, phoneNumberId } = resolveConfig(session);
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const messageId = response.data?.messages?.[0]?.id || response.data?.message_id || null;
  return {
    messageId,
    raw: response.data
  };
}

async function listTemplates(sessionId) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) {
    throw new Error('Missing Meta WABA ID for session');
  }

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 30000
  });

  return response.data?.data || [];
}

async function sendText(sessionId, to, text, options = {}) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
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

  const response = await axios.post(url, form, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...form.getHeaders()
    },
    timeout: 30000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  return response.data?.id || null;
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
    const mediaId = await uploadMediaFile(
      sessionId,
      mediaObj.buffer,
      mediaObj.mimetype || 'audio/ogg',
      mediaObj.fileName || `voice_note.${mediaObj.mimetype?.split('/')[1] || 'ogg'}`
    );
    if (mediaId) {
      mediaPayload.id = mediaId;
    } else {
      throw new Error('فشل رفع الملف إلى خوادم Meta');
    }
  } else {
    const rawUrl = mediaObj?.url || mediaObj?.link;
    if (rawUrl) {
      mediaPayload.link = makeUrlAbsolute(rawUrl);
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

async function sendTemplate(sessionId, to, templateName, languageCode, components = []) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components
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
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      contacts: normalizedNumbers
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data?.contacts || [];
  } catch (err) {
    console.error('❌ MetaCloud checkContact error:', {
      status: err.response?.status,
      data: JSON.stringify(err.response?.data),
      url,
      phoneNumberId,
    });
    throw err;
  }
}

async function createTemplate(sessionId, templateData) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) throw new Error('Missing Meta WABA ID for session');

  const { name, language, category, components, allowCategoryChange } = templateData;
  if (!name || !language || !category) {
    throw new Error('Missing required fields: name, language, category');
  }

  const payload = {
    name,
    language,
    category,
    components
  };

  if (allowCategoryChange) {
    payload.allow_category_change = true;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  return response.data;
}

async function updateTemplate(sessionId, templateName, templateData) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) throw new Error('Missing Meta WABA ID for session');

  const payload = {};
  if (templateData.components) payload.components = templateData.components;
  if (templateData.language) payload.language = templateData.language;
  if (templateData.category) payload.category = templateData.category;

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;
  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  return response.data;
}

async function deleteTemplate(sessionId, templateName) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { apiVersion, accessToken } = resolveBaseConfig(session);
  const wabaId = session?.metaWabaId;
  if (!wabaId) throw new Error('Missing Meta WABA ID for session');

  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`;
  const response = await axios.delete(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 30000
  });

  return response.data;
}

module.exports = {
  resolveConfig,
  resolveBaseConfig,
  sendText,
  sendMedia,
  uploadMediaFile,
  sendLocation,
  sendContacts,
  sendReaction,
  sendTemplate,
  sendInteractive,
  sendRaw,
  listTemplates,
  checkContact,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
