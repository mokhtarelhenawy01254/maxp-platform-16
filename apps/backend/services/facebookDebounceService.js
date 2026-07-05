const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');

const DEBOUNCE_MS = parseInt(process.env.FACEBOOK_DEBOUNCE_MS, 10) || 5000;
const buckets = new Map();

function key(senderId, pageId, companyId) {
  return `${companyId}:${senderId}:${pageId}`;
}

async function senderAction(recipientId, action, pageAccessToken) {
  if (!recipientId || !pageAccessToken) return;
  try {
    await axios.post(
      `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/messages`,
      { recipient: { id: recipientId }, sender_action: action },
      { params: { access_token: pageAccessToken }, timeout: 5000 }
    );
  } catch {
    /* best-effort */
  }
}

function accumulate(senderId, pageId, companyId, pageAccessToken, entry, onFire) {
  const k = key(senderId, pageId, companyId);
  let bucket = buckets.get(k);

  if (bucket) {
    clearTimeout(bucket.timer);
    bucket.entries.push(entry);
    bucket.timer = setTimeout(() => flush(k, onFire), DEBOUNCE_MS);
    senderAction(senderId, 'typing_on', pageAccessToken);
    return true;
  }

  bucket = { entries: [entry], timer: null, senderId, pageAccessToken };
  bucket.timer = setTimeout(() => flush(k, onFire), DEBOUNCE_MS);
  buckets.set(k, bucket);
  senderAction(senderId, 'typing_on', pageAccessToken);
  return false;
}

async function flush(k, onFire) {
  const bucket = buckets.get(k);
  if (!bucket) return;
  buckets.delete(k);
  senderAction(bucket.senderId, 'typing_off', bucket.pageAccessToken);
  try { await onFire(bucket.entries); } catch (e) { console.error('[FB-DEBOUNCE]', e); }
}

module.exports = { accumulate, senderAction, DEBOUNCE_MS };
