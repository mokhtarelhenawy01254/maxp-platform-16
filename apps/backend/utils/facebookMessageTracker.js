/**
 * facebookMessageTracker.js
 * Centralized in-memory tracker for Facebook messages sent by the MaxP backend system and AI agents.
 * 
 * Prevents Echo loops and stops the system from accidentally triggering the
 * "Human Handover Protocol" when the AI's own sent messages (text, image, audio, etc.)
 * are echoed back by Meta's Webhook.
 */

// Key: facebookMessageId (string) -> Value: { isAi: boolean, source: string, conversationId: string, timestamp: number }
const sentFacebookMessages = new Map();

// Recent image URLs sent by AI
const sentAiImageUrls = new Map();

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * Record a message sent by our system / AI agent
 */
function recordSystemSentFacebookMessage(messageId, { isAi = false, source = 'system', conversationId = null, url = null } = {}) {
  if (!messageId || typeof messageId !== 'string') return;
  
  sentFacebookMessages.set(messageId, {
    isAi: !!isAi,
    source,
    conversationId,
    url,
    timestamp: Date.now()
  });

  if (url && typeof url === 'string') {
    sentAiImageUrls.set(url, {
      messageId,
      conversationId,
      timestamp: Date.now()
    });
  }

  // Automatic cleanup
  setTimeout(() => {
    sentFacebookMessages.delete(messageId);
    if (url) sentAiImageUrls.delete(url);
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Check if a Facebook message ID was sent by our system
 */
function isSystemSentFacebookMessage(messageId) {
  if (!messageId) return false;
  return sentFacebookMessages.has(messageId);
}

/**
 * Check if a Facebook message ID was sent specifically by our AI agent
 */
function isAiSentFacebookMessage(messageId) {
  if (!messageId) return false;
  const entry = sentFacebookMessages.get(messageId);
  return entry ? entry.isAi === true : false;
}

/**
 * Get tracking details for a sent Facebook message
 */
function getSentFacebookMessage(messageId) {
  if (!messageId) return null;
  return sentFacebookMessages.get(messageId) || null;
}

/**
 * Check if an image URL was recently sent by our AI agent
 */
function isRecentAiSentImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return sentAiImageUrls.has(url);
}

module.exports = {
  recordSystemSentFacebookMessage,
  isSystemSentFacebookMessage,
  isAiSentFacebookMessage,
  getSentFacebookMessage,
  isRecentAiSentImageUrl
};
