/**
 * @module facebookTools
 * @description Facebook Messenger sending and management tools.
 */

const { sendFacebookMessage } = require('../../../utils/allFunctions');

const TOOLS = {
  'facebook.reply': {
    description: 'Send a direct Facebook Messenger message reply to a customer.',
    params: {
      recipientId: 'The Facebook Page-Scoped ID (PSID) of the customer recipient.',
      message: 'The text message content to send.',
      pageId: 'The Facebook Page ID representing the sending page.'
    },
    requiredParams: ['recipientId', 'message', 'pageId'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['recipientId', 'message', 'pageId'],
      properties: {
        recipientId: { type: 'string', description: 'The Facebook Page-Scoped ID (PSID) of the customer recipient.' },
        message: { type: 'string', description: 'The text message content to send.' },
        pageId: { type: 'string', description: 'The Facebook Page ID representing the sending page.' },
      },
    },
    handler: async (companyId, { recipientId, message, pageId }) => {
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
  }
};

module.exports = TOOLS;
