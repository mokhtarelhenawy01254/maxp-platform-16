/**
 * @module intentValidationService
 * @description Validation service for intent classification results.
 * Separates validation from classification and implements confidence policy.
 */

const {
  validateClassificationResult,
  INTENT_ENUM,
  TOOL_ELIGIBILITY_ENUM,
  createFallbackResult,
} = require('./intentClassificationSchema');

/**
 * Confidence thresholds for different actions.
 */
const CONFIDENCE_THRESHOLDS = {
  EXECUTE_TOOLS: 0.75,
  ASK_CLARIFICATION: 0.55,
  BLOCK_TOOLS: 0.0,
};

/**
 * Business validation rules for specific intents.
 */
const INTENT_VALIDATION_RULES = {
  'orders.create_confirmed': {
    requiredSlots: ['productName', 'customerPhone'],
    optionalSlots: ['customerName', 'productPrice', 'city', 'productSize', 'productColor', 'quantity', 'confirmedByCustomer'],
    validate: (slots) => {
      const errors = [];
      if (!slots.productName) errors.push('PRODUCT_NAME_MISSING');
      if (!slots.customerPhone) errors.push('PHONE_MISSING');
      if (slots.customerPhone && !/^01[0-9]{9}$/.test(slots.customerPhone.replace(/\s/g, ''))) {
        errors.push('PHONE_INVALID_FORMAT');
      }
      return errors;
    },
  },
  'orders.create_draft': {
    requiredSlots: ['productName', 'customerPhone'],
    optionalSlots: ['customerName', 'productPrice', 'city', 'productSize', 'productColor', 'quantity'],
    validate: (slots) => {
      const errors = [];
      if (!slots.productName) errors.push('PRODUCT_NAME_MISSING');
      if (!slots.customerPhone) errors.push('PHONE_MISSING');
      return errors;
    },
  },
  'inventory.check': {
    requiredSlots: ['productName'],
    optionalSlots: ['productSize', 'productColor', 'sku'],
    validate: (slots) => {
      const errors = [];
      if (!slots.productName) errors.push('PRODUCT_NAME_MISSING');
      return errors;
    },
  },
  'shipping.rates': {
    requiredSlots: ['city'],
    optionalSlots: ['governorate'],
    validate: (slots) => {
      const errors = [];
      if (!slots.city) errors.push('CITY_MISSING');
      return errors;
    },
  },
  'skills.manage': {
    requiredSlots: ['skillName', 'skillDescription'],
    optionalSlots: [],
    validate: (slots) => {
      const errors = [];
      if (!slots.skillName) errors.push('SKILL_NAME_MISSING');
      if (!slots.skillDescription) errors.push('SKILL_DESCRIPTION_MISSING');
      return errors;
    },
  },
  'agents.manage': {
    requiredSlots: ['agentRole'],
    optionalSlots: ['agentName'],
    validate: (slots) => {
      const errors = [];
      if (!slots.agentRole) errors.push('AGENT_ROLE_MISSING');
      return errors;
    },
  },
};

/**
 * Validate a classification result.
 * @param {Object} result - Classification result to validate
 * @param {Object} context - Validation context
 * @returns {Object} Validation result
 */
function validateClassification(result, context = {}) {
  const { channel, availableTools = [] } = context;

  // Step 1: Schema validation
  const schemaValidation = validateClassificationResult(result);
  if (!schemaValidation.valid) {
    return {
      valid: false,
      reason: 'SCHEMA_VALIDATION_FAILED',
      errors: schemaValidation.errors,
      recommendation: 'BLOCK_TOOLS',
    };
  }

  // Step 2: Business validation
  const businessValidation = validateBusinessRules(result);
  if (!businessValidation.valid) {
    return {
      valid: false,
      reason: 'BUSINESS_VALIDATION_FAILED',
      errors: businessValidation.errors,
      recommendation: 'ASK_CLARIFICATION',
    };
  }

  // Step 3: Tool allowlist validation
  const toolValidation = validateToolAllowlist(result, availableTools);
  if (!toolValidation.valid) {
    return {
      valid: false,
      reason: 'TOOL_NOT_ALLOWED',
      errors: toolValidation.errors,
      recommendation: 'BLOCK_TOOLS',
    };
  }

  // Step 4: Confidence policy
  const confidenceDecision = applyConfidencePolicy(result);
  
  return {
    valid: true,
    reason: 'VALIDATION_PASSED',
    errors: [],
    recommendation: confidenceDecision.recommendation,
    confidenceLevel: confidenceDecision.level,
    requiresConfirmation: confidenceDecision.requiresConfirmation,
  };
}

/**
 * Validate business rules for the classified intent.
 * @param {Object} result - Classification result
 * @returns {Object} Business validation result
 */
function validateBusinessRules(result) {
  const { intent, slots = {} } = result;
  const rules = INTENT_VALIDATION_RULES[intent];

  if (!rules) {
    return { valid: true, errors: [] };
  }

  const errors = rules.validate(slots);
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that the required tool is in the allowlist.
 * @param {Object} result - Classification result
 * @param {string[]} availableTools - Available tools
 * @returns {Object} Tool allowlist validation result
 */
function validateToolAllowlist(result, availableTools) {
  const { toolEligibility = {} } = result;
  const requiredTool = toolEligibility.requiredTool;

  if (!requiredTool) {
    return { valid: true, errors: [] };
  }

  if (!availableTools.includes(requiredTool)) {
    return {
      valid: false,
      errors: [`Tool ${requiredTool} is not in the allowlist`],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Apply confidence policy to determine action.
 * @param {Object} result - Classification result
 * @returns {Object} Confidence decision
 */
function applyConfidencePolicy(result) {
  const { confidence = 0 } = result;

  if (confidence >= CONFIDENCE_THRESHOLDS.EXECUTE_TOOLS) {
    return {
      recommendation: 'EXECUTE_TOOLS',
      level: 'high',
      requiresConfirmation: false,
    };
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.ASK_CLARIFICATION) {
    return {
      recommendation: 'ASK_CLARIFICATION',
      level: 'medium',
      requiresConfirmation: true,
    };
  }

  return {
    recommendation: 'BLOCK_TOOLS',
    level: 'low',
    requiresConfirmation: true,
  };
}

/**
 * Handle validation failure with appropriate response.
 * @param {Object} validationResult - Validation result
 * @param {Object} originalResult - Original classification result
 * @returns {Object} Failure response
 */
function handleValidationFailure(validationResult, originalResult) {
  const { reason, errors, recommendation } = validationResult;

  // Log the failure for observability
  console.error(`[INTENT-VALIDATION] Failed: ${reason}`, errors);

  // Create appropriate fallback based on recommendation
  if (recommendation === 'BLOCK_TOOLS') {
    return createFallbackResult(reason);
  }

  // For ASK_CLARIFICATION, preserve the intent but block tools
  return {
    ...originalResult,
    toolEligibility: {
      status: 'needs_clarification',
      blockedReason: reason,
      requiredTool: null,
    },
    missingSlots: errors.filter(e => e.endsWith('_MISSING')).map(e => e.replace('_MISSING', '')),
  };
}

module.exports = {
  CONFIDENCE_THRESHOLDS,
  INTENT_VALIDATION_RULES,
  validateClassification,
  validateBusinessRules,
  validateToolAllowlist,
  applyConfidencePolicy,
  handleValidationFailure,
};
