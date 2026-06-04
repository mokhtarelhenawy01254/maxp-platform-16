/**
 * Meta WhatsApp Cloud API Provider
 * Sends messages via Graph API for official WhatsApp.
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../../sharedDatabase');

const DEFAULT_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';

async function getSession(sessionId) {
  return await getSharedPrismaClient().whatsAppSession.findUnique({
    where: { id: sessionId }
  });
}

function resolveBaseConfig(session) {
  const apiVersion = session?.metaApiVersion || process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const accessToken = session?.metaAccessToken || process.env.META_WA_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Missing Meta Cloud access token');
  }
  return { apiVersion, accessToken };
}

function resolveConfig(session) {
  const base = resolveBaseConfig(session);
  const phoneNumberId = session?.metaPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;

  if (!phoneNumberId) {
    throw new Error('Missing Meta Cloud phone number ID');
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
  const wabaId = session?.metaWabaId || process.env.META_WA_WABA_ID;
  if (!wabaId) {
    throw new Error('Missing Meta WABA ID');
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

async function sendMedia(sessionId, to, media, kind, options = {}) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const mediaPayload = {};
  if (media?.id || media?.mediaId) {
    mediaPayload.id = media.id || media.mediaId;
  } else if (media?.url || media?.link) {
    mediaPayload.link = media.url || media.link;
  }

  const caption = options.caption || media?.caption;
  if (caption) {
    mediaPayload.caption = caption;
  }

  const filename = options.fileName || media?.fileName;
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
