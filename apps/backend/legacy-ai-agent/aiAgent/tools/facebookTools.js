/**
 * @module facebookTools
 * @description Facebook Messenger sending and management tools.
 */

const { sendFacebookMessage } = require('../../../utils/allFunctions');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

async function facebookReplyHandler(companyId, { recipientId, message, pageId }) {
  /**
   * Send a direct Facebook Messenger message reply to a customer.
   * @param {string} recipientId - The Facebook Page-Scoped ID (PSID) of the customer recipient.
   * @param {string} message - The text message content to send.
   * @param {string} pageId - The Facebook Page ID representing the sending page.
   */
  if (!recipientId) throw new Error('recipientId is required');
  if (!message) throw new Error('message is required');
  if (!pageId) throw new Error('pageId is required');

  const result = await sendFacebookMessage(recipientId, message, 'TEXT', pageId);
  if (!result.success) {
    throw new Error(result.error || result.message || 'Failed to send Facebook message');
  }

  return {
    success: true,
    messageId: result.messageId || null,
    recipientId,
    pageId,
    status: 'SENT'
  };
}

const TOOLS = {
  'facebook.reply': createToolFromFunction('facebook.reply', facebookReplyHandler, {
    description: 'Send a direct Facebook Messenger message reply to a customer.',
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
  }),
};

module.exports = TOOLS;
