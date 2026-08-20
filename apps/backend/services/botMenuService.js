const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');

function buildMenuItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && it.title && String(it.title).trim())
    .map((it) => {
      const title = String(it.title).trim();
      if (it.type === 'web_url') {
        return {
          type: 'web_url',
          title,
          url: String(it.url || '').trim(),
          webview_height_ratio: it.webviewHeightRatio || 'full',
        };
      }
      return { type: 'postback', title, payload: String(it.payload || `MENU_${title}`) };
    });
}

async function pushPersistentMenu({ pageId, pageAccessToken, items }) {
  if (!pageId || !pageAccessToken) {
    return { success: false, reason: 'NO_PAGE', message: 'No connected Facebook page' };
  }
  const persistentMenu = buildMenuItems(items);
  if (persistentMenu.length === 0) {
    return { success: false, reason: 'EMPTY_MENU', message: 'Menu has no items' };
  }
  try {
    const url = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}/messenger_profile`;
    const response = await axios.post(
      url,
      {
        access_token: pageAccessToken,
        persistent_menu: [
          {
            locale: 'default',
            composer_input_disabled: false,
            call_to_actions: persistentMenu,
          },
        ],
      },
      { timeout: 15000 }
    );
    return { success: true, data: response.data };
  } catch (e) {
    return {
      success: false,
      reason: 'FACEBOOK_ERROR',
      error: e.response?.data?.error || e.message,
    };
  }
}

module.exports = {
  buildMenuItems,
  pushPersistentMenu,
};
