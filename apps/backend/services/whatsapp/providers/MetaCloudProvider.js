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

module.exports = {
  resolveConfig,
  resolveBaseConfig,
  sendText,
  sendMedia,
  sendLocation,
  sendContacts,
  sendReaction,
  sendTemplate,
  sendInteractive,
  sendRaw,
  listTemplates
};
