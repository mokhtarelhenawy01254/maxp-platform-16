const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');

const DEBOUNCE_MS = parseInt(process.env.FACEBOOK_DEBOUNCE_MS, 10) || 5000;
const buckets = new Map();

async function senderAction(recipientId, action, pageAccessToken) {
  if (!recipientId || !pageAccessToken) return;
  try {
    await axios.post(
      `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/messages`,
      { recipient: { id: recipientId }, sender_action: action },
      { params: { access_token: pageAccessToken }, timeout: 5000 }
    );
  } catch { /* best-effort */ }
}

function accumulate(k, entry, onFire, onExtend, onFlush) {
  let bucket = buckets.get(k);
  if (bucket) {
    clearTimeout(bucket.timer);
    bucket.entries.push(entry);
    bucket.timer = setTimeout(() => flush(k, onFire, onFlush), DEBOUNCE_MS);
    if (onExtend) onExtend();
    return true;
  }
  bucket = { entries: [entry], timer: null };
  bucket.timer = setTimeout(() => flush(k, onFire, onFlush), DEBOUNCE_MS);
  buckets.set(k, bucket);
  if (onExtend) onExtend();
  return false;
}

async function flush(k, onFire, onFlush) {
  const bucket = buckets.get(k);
  if (!bucket) return;
  buckets.delete(k);
  if (onFlush) onFlush();
  try { await onFire(bucket.entries); } catch (e) { console.error('[DEBOUNCE]', e); }
}

function accumulateFB(senderId, pageId, companyId, pageAccessToken, entry, onFire) {
  const k = `${companyId}:fb:${senderId}:${pageId}`;
  return accumulate(k, entry, onFire,
    () => senderAction(senderId, 'typing_on', pageAccessToken),
    () => senderAction(senderId, 'typing_off', pageAccessToken)
  );
}

function accumulateWA(companyId, sessionId, remoteJid, entry, onFire) {
  const k = `${companyId}:wa:${sessionId}:${remoteJid}`;
  return accumulate(k, entry, onFire);
}

module.exports = { accumulate, accumulateFB, accumulateWA, senderAction, DEBOUNCE_MS };
