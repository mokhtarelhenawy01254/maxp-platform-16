/**
 * @module facebookTools
 * @description Facebook Messenger sending and management tools.
 */

const { sendFacebookMessage } = require('../../../utils/allFunctions');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

async function facebookReplyHandler(companyId, {
  recipientId,
  message,
  pageId,
  messageType = 'TEXT',
  imageUrl,
  mediaUrl,
}) {
  /**
   * Send a direct Facebook Messenger text or image reply to a customer.
   * @param {string} recipientId - The Facebook Page-Scoped ID (PSID) of the customer recipient.
   * @param {string} [message] - The text message content to send, or an image URL when messageType is IMAGE.
   * @param {string} pageId - The Facebook Page ID representing the sending page.
   * @param {'TEXT'|'IMAGE'} [messageType] - The Facebook message type to send.
   * @param {string} [imageUrl] - Image URL to send as a Messenger image attachment.
   * @param {string} [mediaUrl] - Media URL to send as a Messenger image attachment.
   */
  if (!recipientId) throw new Error('recipientId is required');
  if (!pageId) throw new Error('pageId is required');

  const normalizedType = String(messageType || 'TEXT').toUpperCase();
  if (!['TEXT', 'IMAGE'].includes(normalizedType)) {
    throw new Error('messageType must be TEXT or IMAGE');
  }

  const hasMediaUrl = Boolean(imageUrl || mediaUrl);
  const resolvedMessageType = hasMediaUrl || normalizedType === 'IMAGE' ? 'IMAGE' : 'TEXT';
  const messageContent = resolvedMessageType === 'IMAGE'
    ? imageUrl || mediaUrl || message
    : message;

  if (!messageContent || String(messageContent).trim() === '') {
    throw new Error(
      resolvedMessageType === 'IMAGE'
        ? 'imageUrl, mediaUrl, or message URL is required for IMAGE message'
        : 'message is required for TEXT message'
    );
  }

  const result = await sendFacebookMessage(recipientId, messageContent, resolvedMessageType, pageId);
  if (!result.success) {
    throw new Error(result.error || result.message || 'Failed to send Facebook message');
  }

  return {
    success: true,
    messageId: result.messageId || null,
    recipientId,
    pageId,
    messageType: resolvedMessageType,
    status: 'SENT'
  };
}

const TOOLS = {
  'facebook.reply': createToolFromFunction('facebook.reply', facebookReplyHandler, {
    description: 'Send a direct Facebook Messenger text or image reply to a customer.',
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    requiredParams: ['recipientId', 'pageId'],
  }),
};

module.exports = TOOLS;
