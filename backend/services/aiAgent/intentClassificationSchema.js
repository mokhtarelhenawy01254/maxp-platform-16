/**
 * @module intentClassificationSchema
 * @description Canonical intent classification schema for LLM structured output.
 * Defines the unified contract for intent + slot extraction across all providers.
 * All enum values are English. No customer-facing text in schema.
 */

const SCHEMA_VERSION = '1.0.0';

/**
 * Intent enum - all possible intents the classifier can return.
 * Must match INTENT_POLICIES keys in agentIntentPlannerService.js
 */
const INTENT_ENUM = [
  'general.chat',
  'implementation.advice',
  'goals.create_product',
  'goals.create_agent_with_skill',
  'agents.run_task',
  'agents.manage',
  'agents.read',
  'audit.read',
  'skills.manage',
  'skills.read',
  'products.manage',
  'orders.create_draft',
  'orders.create_confirmed',
  'orders',
  'inventory',
  'products',
  'shipping.rates',
  'support.exchange',
  'support.refund',
  'support.complaint',
  'customers',
  'sales',
  'company.snapshot',
  'hr.attendance.today',
];

/**
 * Confidence levels
 */
const CONFIDENCE_ENUM = ['high', 'medium', 'low'];

/**
 * Tool eligibility status
 */
const TOOL_ELIGIBILITY_ENUM = ['allowed', 'blocked', 'needs_clarification'];

/**
 * Reason codes for classification decisions
 */
const REASON_CODE_ENUM = [
  'PRODUCT_NAME_FOUND',
  'PRODUCT_NAME_AMBIGUOUS',
  'PRODUCT_NAME_MISSING',
  'CUSTOMER_NAME_FOUND',
  'CUSTOMER_NAME_MISSING',
  'PHONE_FOUND',
  'PHONE_INVALID_FORMAT',
  'PHONE_MISSING',
  'PRICE_FOUND',
  'PRICE_MISSING',
  'CITY_FOUND',
  'CITY_MISSING',
  'QUANTITY_FOUND',
  'QUANTITY_DEFAULT',
  'SIZE_FOUND',
  'SIZE_MISSING',
  'COLOR_FOUND',
  'COLOR_MISSING',
  'CONFIRMATION_FOUND',
  'CONFIRMATION_MISSING',
  'ORDER_NUMBER_FOUND',
  'ORDER_NUMBER_MISSING',
  'SKILL_NAME_FOUND',
  'SKILL_NAME_MISSING',
  'AGENT_NAME_FOUND',
  'AGENT_NAME_MISSING',
  'AGENT_ROLE_FOUND',
  'AGENT_ROLE_MISSING',
  'INTENT_AMBIGUOUS',
  'INTENT_CLEAR',
  'SLOTS_COMPLETE',
  'SLOTS_INCOMPLETE',
  'CONVERSATION_CONTEXT_USED',
  'EXEMPLAR_MATCH_FOUND',
];

/**
 * Canonical JSON Schema for intent classification.
 * This schema is the source of truth for all providers.
 */
const INTENT_CLASSIFICATION_SCHEMA = {
  type: 'object',
  required: ['intent', 'confidence', 'slots', 'missingSlots', 'toolEligibility', 'reasonCodes'],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: 'string',
      const: SCHEMA_VERSION,
    },
    intent: {
      type: 'string',
      enum: INTENT_ENUM,
      description: 'The classified intent of the user message',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Classification confidence score between 0 and 1',
    },
    confidenceLevel: {
      type: 'string',
      enum: CONFIDENCE_ENUM,
      description: 'Human-readable confidence level',
    },
    slots: {
      type: 'object',
      description: 'Extracted slot values from the message',
      properties: {
        productName: { type: ['string', 'null'], description: 'Product name mentioned in message' },
        productPrice: { type: ['number', 'null'], description: 'Product price mentioned in message' },
        productSize: { type: ['string', 'null'], description: 'Product size mentioned in message' },
        productColor: { type: ['string', 'null'], description: 'Product color mentioned in message' },
        quantity: { type: ['number', 'null'], description: 'Quantity mentioned in message (default: 1)' },
        customerName: { type: ['string', 'null'], description: 'Customer name mentioned in message' },
        customerPhone: { type: ['string', 'null'], description: 'Customer phone number mentioned in message' },
        city: { type: ['string', 'null'], description: 'City/governorate mentioned in message' },
        address: { type: ['string', 'null'], description: 'Full address mentioned in message' },
        orderNumber: { type: ['string', 'null'], description: 'Order number mentioned in message' },
        confirmedByCustomer: { type: ['boolean', 'null'], description: 'Whether customer explicitly confirmed the order' },
        skillName: { type: ['string', 'null'], description: 'Skill name mentioned in message' },
        skillDescription: { type: ['string', 'null'], description: 'Skill description mentioned in message' },
        agentName: { type: ['string', 'null'], description: 'Agent name mentioned in message' },
        agentRole: { type: ['string', 'null'], description: 'Agent role mentioned in message (sales, support, inventory, etc.)' },
        taskDescription: { type: ['string', 'null'], description: 'Task description mentioned in message' },
        requestedProductImage: { type: ['boolean', 'null'], description: 'Whether customer is asking for product images' },
        referencesPreviousProduct: { type: ['boolean', 'null'], description: 'Whether the message refers to the previous product context instead of naming a product' },
        shippingDestination: { type: ['string', 'null'], description: 'Shipping destination mentioned in message' },
        exchangeReason: { type: ['string', 'null'], description: 'Reason for exchange request' },
        refundReason: { type: ['string', 'null'], description: 'Reason for refund request' },
        complaintDetails: { type: ['string', 'null'], description: 'Complaint details mentioned in message' },
      },
    },
    missingSlots: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of required slot names that are missing for the classified intent',
    },
    ambiguity: {
      type: 'boolean',
      description: 'Whether the intent is ambiguous and needs clarification',
    },
    clarificationQuestion: {
      type: ['string', 'null'],
      description: 'Natural language question to ask for clarification (in customer language)',
    },
    toolEligibility: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: TOOL_ELIGIBILITY_ENUM,
          description: 'Whether tool execution is allowed for this intent',
        },
        blockedReason: {
          type: ['string', 'null'],
          description: 'Reason why tool execution is blocked',
        },
        requiredTool: {
          type: ['string', 'null'],
          description: 'The primary tool that should be executed',
        },
      },
    },
    reasonCodes: {
      type: 'array',
      items: { type: 'string', enum: REASON_CODE_ENUM },
      description: 'Machine-readable reason codes for the classification decision',
    },
    alternativeIntents: {
      type: 'array',
      items: {
        type: 'object',
        required: ['intent', 'confidence'],
        properties: {
          intent: { type: 'string', enum: INTENT_ENUM },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
      description: 'Alternative intents if primary is ambiguous',
    },
  },
};

/**
 * Get the JSON Schema for a specific provider.
 * @param {'openai' | 'gemini' | 'anthropic'} provider
 * @returns {Object} Provider-specific schema
 */
function getProviderSchema(provider) {
  switch (provider) {
    case 'openai':
      return getOpenAISchema();
    case 'gemini':
      return getGeminiSchema();
    case 'anthropic':
      return getAnthropicSchema();
    default:
      return INTENT_CLASSIFICATION_SCHEMA;
  }
}

/**
 * OpenAI structured output schema.
 * Uses json_schema response format.
 */
function getOpenAISchema() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'intent_classification',
      strict: true,
      schema: INTENT_CLASSIFICATION_SCHEMA,
    },
  };
}

/**
 * Gemini response schema.
 * Uses response_schema with application/json mime type.
 * Note: Gemini supports a subset of JSON Schema.
 */
function getGeminiSchema() {
  return {
    responseMimeType: 'application/json',
    responseSchema: convertToGeminiSchema(INTENT_CLASSIFICATION_SCHEMA),
  };
}

/**
 * Convert canonical schema to Gemini-compatible format.
 * Gemini has some limitations on JSON Schema support.
 */
function convertToGeminiSchema(schema) {
  const geminiSchema = { ...schema };

  // Convert null types to just the primary type (Gemini doesn't support oneOf well)
  if (geminiSchema.properties) {
    for (const [key, prop] of Object.entries(geminiSchema.properties)) {
      if (prop.type && Array.isArray(prop.type)) {
        // For nullable fields, just use the primary type
        const nonNullType = prop.type.find(t => t !== 'null');
        geminiSchema.properties[key] = {
          ...prop,
          type: nonNullType || 'string',
        };
      }
      if (prop.properties) {
        geminiSchema.properties[key] = convertToGeminiSchema(prop);
      }
    }
  }

  return geminiSchema;
}

/**
 * Anthropic tool use schema.
 * Uses input_schema for tool definition.
 */
function getAnthropicSchema() {
  return {
    name: 'classify_intent',
    description: 'Classify user intent and extract slots from the message',
    input_schema: INTENT_CLASSIFICATION_SCHEMA,
  };
}

/**
 * Validate a classification result against the schema.
 * @param {Object} result - Classification result to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateClassificationResult(result) {
  const errors = [];

  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['Result is not an object'] };
  }

  // Check required fields
  const required = ['intent', 'confidence', 'slots', 'missingSlots', 'toolEligibility', 'reasonCodes'];
  for (const field of required) {
    if (result[field] === undefined || result[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate intent
  if (result.intent && !INTENT_ENUM.includes(result.intent)) {
    errors.push(`Invalid intent: ${result.intent}`);
  }

  // Validate confidence
  if (result.confidence !== undefined) {
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      errors.push(`Invalid confidence: ${result.confidence}`);
    }
  }

  // Validate slots
  if (result.slots && typeof result.slots !== 'object') {
    errors.push('slots must be an object');
  }

  // Validate missingSlots
  if (result.missingSlots && !Array.isArray(result.missingSlots)) {
    errors.push('missingSlots must be an array');
  }

  // Validate toolEligibility
  if (result.toolEligibility) {
    if (!result.toolEligibility.status || !TOOL_ELIGIBILITY_ENUM.includes(result.toolEligibility.status)) {
      errors.push(`Invalid toolEligibility.status: ${result.toolEligibility.status}`);
    }
  }

  // Validate reasonCodes
  if (result.reasonCodes && !Array.isArray(result.reasonCodes)) {
    errors.push('reasonCodes must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a default classification result for fallback.
 * @param {string} reason - Reason for fallback
 * @returns {Object} Default classification result
 */
function createFallbackResult(reason = 'CLASSIFIER_UNAVAILABLE') {
  return {
    schemaVersion: SCHEMA_VERSION,
    intent: 'general.chat',
    confidence: 0.1,
    confidenceLevel: 'low',
    slots: {},
    missingSlots: [],
    ambiguity: true,
    clarificationQuestion: null,
    toolEligibility: {
      status: 'blocked',
      blockedReason: reason,
      requiredTool: null,
    },
    reasonCodes: ['INTENT_AMBIGUOUS'],
    alternativeIntents: [],
  };
}

module.exports = {
  SCHEMA_VERSION,
  INTENT_ENUM,
  CONFIDENCE_ENUM,
  TOOL_ELIGIBILITY_ENUM,
  REASON_CODE_ENUM,
  INTENT_CLASSIFICATION_SCHEMA,
  getProviderSchema,
  getOpenAISchema,
  getGeminiSchema,
  getAnthropicSchema,
  validateClassificationResult,
  createFallbackResult,
};
