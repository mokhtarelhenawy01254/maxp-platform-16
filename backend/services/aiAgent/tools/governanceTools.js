/**
 * @module governanceTools
 * @description Governance, approval, and communication tools.
 * These tools exist as metadata-only definitions used by the tool orchestration layer.
 */

const TOOLS = {
  'discount.apply': {
    description: 'Propose applying a discount to a target.',
    params: {
      discountPercent: 'Discount percentage (0-100)',
      target: 'Target product, category, or customer',
      reason: 'Discount reason',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'discount.apply handler not yet implemented' };
    },
  },

  'discount.create_draft': {
    description: 'Create a discount draft for human approval.',
    params: {
      code: 'Discount code',
      discountPercent: 'Discount percentage (0-100)',
      reason: 'Discount reason',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'discount.create_draft handler not yet implemented' };
    },
  },

  'whatsapp.send': {
    description: 'Send or propose a WhatsApp message depending on company policy.',
    params: {
      recipient: 'Recipient phone number or identifier',
      message: 'Message content',
      conversationId: 'Optional conversation ID',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'whatsapp.send handler not yet implemented' };
    },
  },

  'knowledge.create_faq': {
    description: 'Create an approved FAQ entry from a reviewed Agentic RAG learning proposal.',
    params: {
      question: 'FAQ question',
      answer: 'FAQ answer',
      category: 'Optional category',
      tags: 'Optional tags',
      isActive: 'Whether the FAQ is active',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'knowledge.create_faq handler not yet implemented' };
    },
  },

  'knowledge.create_policy': {
    description: 'Create an approved policy entry from a reviewed Agentic RAG learning proposal.',
    params: {
      title: 'Policy title',
      content: 'Policy content',
      category: 'Optional category',
      tags: 'Optional tags',
      isActive: 'Whether the policy is active',
      effectiveAt: 'Effective date',
      expiresAt: 'Expiration date',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'knowledge.create_policy handler not yet implemented' };
    },
  },

  'scheduler.create_job': {
    description: 'Create a natural-language scheduled routine proposal.',
    params: {
      description: 'Natural language description of the scheduled task',
      taskType: 'Optional task type',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'scheduler.create_job handler not yet implemented' };
    },
  },

  'facebook_ad.create_draft': {
    description: 'Create a Facebook ad draft for merchant review.',
    params: {
      objective: 'Ad objective',
      primaryText: 'Primary ad text',
      budget: 'Optional budget',
    },
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
    handler: async (companyId, params = {}) => {
      return { status: 'NOT_IMPLEMENTED', message: 'facebook_ad.create_draft handler not yet implemented' };
    },
  },
};

module.exports = TOOLS;
