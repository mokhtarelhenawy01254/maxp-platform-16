/**
 * @module governanceTools
 * @description Governance, approval, and communication tools.
 * These tools exist as metadata-only definitions used by the tool orchestration layer.
 */

const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

async function discountApplyHandler(companyId, params = {}) {
  /**
   * Propose applying a discount to a target.
   * @param {number} discountPercent - Discount percentage (0-100)
   * @param {string} target - Target product, category, or customer
   * @param {string} [reason] - Discount reason
   */
  return { status: 'NOT_IMPLEMENTED', message: 'discount.apply handler not yet implemented' };
}

async function discountCreateDraftHandler(companyId, params = {}) {
  /**
   * Create a discount draft for human approval.
   * @param {string} code - Discount code
   * @param {number} discountPercent - Discount percentage (0-100)
   * @param {string} [reason] - Discount reason
   */
  return { status: 'NOT_IMPLEMENTED', message: 'discount.create_draft handler not yet implemented' };
}

async function whatsappSendHandler(companyId, params = {}) {
  /**
   * Send or propose a WhatsApp message depending on company policy.
   * @param {string} recipient - Recipient phone number or identifier
   * @param {string} message - Message content
   * @param {string} [conversationId] - Optional conversation ID
   */
  return { status: 'NOT_IMPLEMENTED', message: 'whatsapp.send handler not yet implemented' };
}

async function knowledgeCreateFaqHandler(companyId, params = {}) {
  /**
   * Create an approved FAQ entry from a reviewed Agentic RAG learning proposal.
   * @param {string} question - FAQ question
   * @param {string} answer - FAQ answer
   * @param {string} [category] - Optional category
   * @param {string[]} [tags] - Optional tags
   * @param {boolean} [isActive] - Whether the FAQ is active
   */
  return { status: 'NOT_IMPLEMENTED', message: 'knowledge.create_faq handler not yet implemented' };
}

async function knowledgeCreatePolicyHandler(companyId, params = {}) {
  /**
   * Create an approved policy entry from a reviewed Agentic RAG learning proposal.
   * @param {string} title - Policy title
   * @param {string} content - Policy content
   * @param {string} [category] - Optional category
   * @param {string[]} [tags] - Optional tags
   * @param {boolean} [isActive] - Whether the policy is active
   * @param {string} [effectiveAt] - Effective date
   * @param {string} [expiresAt] - Expiration date
   */
  return { status: 'NOT_IMPLEMENTED', message: 'knowledge.create_policy handler not yet implemented' };
}

async function schedulerCreateJobHandler(companyId, params = {}) {
  /**
   * Create a natural-language scheduled routine proposal.
   * @param {string} description - Natural language description of the scheduled task
   * @param {string} [taskType] - Optional task type
   */
  return { status: 'NOT_IMPLEMENTED', message: 'scheduler.create_job handler not yet implemented' };
}

async function facebookAdCreateDraftHandler(companyId, params = {}) {
  /**
   * Create a Facebook ad draft for merchant review.
   * @param {string} objective - Ad objective
   * @param {string} primaryText - Primary ad text
   * @param {number} [budget] - Optional budget
   */
  return { status: 'NOT_IMPLEMENTED', message: 'facebook_ad.create_draft handler not yet implemented' };
}

async function messageBroadcastHandler(companyId, params = {}) {
  /**
   * Broadcast a message to a target audience. Always requires merchant approval.
   * @param {string} message - Broadcast message content
   * @param {string} audience - Target audience (e.g. 'all', 'vip', segment name)
   */
  return { status: 'NOT_IMPLEMENTED', message: 'message.broadcast handler not yet implemented' };
}

const TOOLS = {
  'discount.apply': createToolFromFunction('discount.apply', discountApplyHandler, {
    description: 'Propose applying a discount to a target.',
    requiredParams: ['discountPercent', 'target'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['discountPercent', 'target'],
      properties: {
        discountPercent: { type: 'number', minimum: 0, maximum: 100, description: 'Discount percentage (0-100).' },
        target: { type: 'string', description: 'Target product, category, or customer.' },
        reason: { type: 'string', description: 'Reason for the discount.' },
      },
    },
  }),

  'discount.create_draft': createToolFromFunction('discount.create_draft', discountCreateDraftHandler, {
    description: 'Create a discount draft for human approval.',
    requiredParams: ['code', 'discountPercent'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['code', 'discountPercent'],
      properties: {
        code: { type: 'string', description: 'Discount code.' },
        discountPercent: { type: 'number', minimum: 0, maximum: 100, description: 'Discount percentage (0-100).' },
        reason: { type: 'string', description: 'Reason for the discount.' },
      },
    },
  }),

  'whatsapp.send': createToolFromFunction('whatsapp.send', whatsappSendHandler, {
    description: 'Send or propose a WhatsApp message depending on company policy.',
    requiredParams: ['recipient', 'message'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['recipient', 'message'],
      properties: {
        recipient: { type: 'string', description: 'Recipient phone number or identifier.' },
        message: { type: 'string', description: 'Message content.' },
        conversationId: { type: 'string', description: 'Optional conversation ID.' },
      },
    },
  }),

  'knowledge.create_faq': createToolFromFunction('knowledge.create_faq', knowledgeCreateFaqHandler, {
    description: 'Create an approved FAQ entry from a reviewed Agentic RAG learning proposal.',
    requiredParams: ['question', 'answer'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['question', 'answer'],
      properties: {
        question: { type: 'string', description: 'FAQ question.' },
        answer: { type: 'string', description: 'FAQ answer.' },
        category: { type: 'string', description: 'Optional category.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags.' },
        isActive: { type: 'boolean', description: 'Whether the FAQ is active.' },
      },
    },
  }),

  'knowledge.create_policy': createToolFromFunction('knowledge.create_policy', knowledgeCreatePolicyHandler, {
    description: 'Create an approved policy entry from a reviewed Agentic RAG learning proposal.',
    requiredParams: ['title', 'content'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title: { type: 'string', description: 'Policy title.' },
        content: { type: 'string', description: 'Policy content.' },
        category: { type: 'string', description: 'Optional category.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags.' },
        isActive: { type: 'boolean', description: 'Whether the policy is active.' },
        effectiveAt: { type: 'string', description: 'Effective date.' },
        expiresAt: { type: 'string', description: 'Expiration date.' },
      },
    },
  }),

  'scheduler.create_job': createToolFromFunction('scheduler.create_job', schedulerCreateJobHandler, {
    description: 'Create a natural-language scheduled routine proposal.',
    requiredParams: ['description'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', description: 'Natural language description of the scheduled task.' },
        taskType: { type: 'string', description: 'Optional task type.' },
      },
    },
  }),

  'facebook_ad.create_draft': createToolFromFunction('facebook_ad.create_draft', facebookAdCreateDraftHandler, {
    description: 'Create a Facebook ad draft for merchant review.',
    requiredParams: ['objective', 'primaryText'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['objective', 'primaryText'],
      properties: {
        objective: { type: 'string', description: 'Ad objective.' },
        primaryText: { type: 'string', description: 'Primary ad text.' },
        budget: { type: 'number', minimum: 0, description: 'Optional budget.' },
      },
    },
  }),

  'message.broadcast': createToolFromFunction('message.broadcast', messageBroadcastHandler, {
    description: 'Broadcast a message to customers. Always requires merchant approval.',
    requiredParams: ['message', 'audience'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['message', 'audience'],
      properties: {
        message: { type: 'string', description: 'Broadcast message content.' },
        audience: { type: 'string', description: "Target audience (e.g. 'all', 'vip')." },
      },
    },
  }),
};

module.exports = TOOLS;
