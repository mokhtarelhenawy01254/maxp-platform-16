const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function buildQuickReplies(buttons) {
  const list = parseJsonArray(buttons);
  if (list.length === 0) return undefined;
  return list.slice(0, 11).map((b) => ({
    content_type: 'text',
    title: String(b.title || '').slice(0, 20),
    payload: String(b.payload || b.title || ''),
  }));
}

function buildCarouselPayload(carousel) {
  const list = parseJsonArray(carousel);
  if (list.length === 0) return undefined;
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: list.slice(0, 10).map((el) => ({
          title: String(el.title || '').slice(0, 80),
          subtitle: el.subtitle ? String(el.subtitle).slice(0, 80) : undefined,
          image_url: el.imageUrl || undefined,
          default_action: el.url ? { type: 'web_url', url: String(el.url) } : undefined,
          buttons: Array.isArray(el.buttons)
            ? el.buttons.slice(0, 3).map((b) => ({
                type: b.type === 'web_url' ? 'web_url' : 'postback',
                title: String(b.title || '').slice(0, 20),
                ...(b.type === 'web_url' ? { url: String(b.url || '') } : { payload: String(b.payload || b.title || '') }),
              }))
            : [],
        })),
      },
    },
  };
}

function buildWhatsAppButtons(buttons) {
  const list = parseJsonArray(buttons);
  if (list.length === 0) return [];
  return list.slice(0, 3).map((b) => ({
    id: String(b.payload || b.title || ''),
    text: String(b.title || '').slice(0, 20),
  }));
}

async function sendFacebookRichMessage({ senderId, pageId, pageAccessToken, text, mediaUrl, buttons, carousel }) {
  if (!senderId || !pageId || !pageAccessToken) {
    return { success: false, reason: 'NO_PAGE', message: 'No connected Facebook page' };
  }

  const carouselPayload = buildCarouselPayload(carousel);
  const message = {};
  if (carouselPayload) {
    message.attachment = carouselPayload.attachment;
  } else if (mediaUrl) {
    message.attachment = { type: 'image', payload: { url: mediaUrl, is_reusable: true } };
  } else {
    message.text = text || '';
  }
  const quickReplies = buildQuickReplies(buttons);
  if (quickReplies) message.quick_replies = quickReplies;

  try {
    const url = `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/messages`;
    const response = await axios.post(
      url,
      { recipient: { id: senderId }, messaging_type: 'RESPONSE', message },
      {
        params: { access_token: pageAccessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );
    return { success: true, messageId: response.data?.message_id };
  } catch (e) {
    return { success: false, reason: 'FACEBOOK_ERROR', error: e.response?.data?.error || e.message };
  }
}

module.exports = {
  parseJsonArray,
  buildQuickReplies,
  buildCarouselPayload,
  buildWhatsAppButtons,
  sendFacebookRichMessage,
};
