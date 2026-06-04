/**
 * @module intentValidationService.test
 * @description Tests for intent validation service.
 */

const {
  CONFIDENCE_THRESHOLDS,
  validateClassification,
  validateBusinessRules,
  validateToolAllowlist,
  applyConfidencePolicy,
  handleValidationFailure,
} = require('../../services/aiAgent/intentValidationService');

describe('Intent Validation Service', () => {
  describe('CONFIDENCE_THRESHOLDS', () => {
    test('has correct thresholds', () => {
      expect(CONFIDENCE_THRESHOLDS.EXECUTE_TOOLS).toBe(0.75);
      expect(CONFIDENCE_THRESHOLDS.ASK_CLARIFICATION).toBe(0.55);
      expect(CONFIDENCE_THRESHOLDS.BLOCK_TOOLS).toBe(0.0);
    });
  });

  describe('validateClassification', () => {
    test('validates a correct classification', () => {
      const result = {
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        slots: {
          productName: 't-shirt',
          customerPhone: '01012345678',
        },
        missingSlots: [],
        toolEligibility: { status: 'allowed' },
        reasonCodes: ['PRODUCT_NAME_FOUND', 'PHONE_FOUND'],
      };

      const validation = validateClassification(result, {
        channel: 'FACEBOOK',
        availableTools: ['order.create_confirmed'],
      });

      expect(validation.valid).toBe(true);
      expect(validation.recommendation).toBe('EXECUTE_TOOLS');
    });

    test('rejects invalid schema', () => {
      const result = {
        intent: 'invalid.intent',
        confidence: 0.9,
      };

      const validation = validateClassification(result);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('SCHEMA_VALIDATION_FAILED');
    });

    test('rejects missing required slots', () => {
      const result = {
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        slots: {
          productName: 't-shirt',
          // Missing customerPhone
        },
        missingSlots: ['customerPhone'],
        toolEligibility: { status: 'needs_clarification' },
        reasonCodes: ['PHONE_MISSING'],
      };

      const validation = validateClassification(result);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('BUSINESS_VALIDATION_FAILED');
    });

    test('rejects tool not in allowlist', () => {
      const result = {
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        slots: {
          productName: 't-shirt',
          customerPhone: '01012345678',
        },
        missingSlots: [],
        toolEligibility: {
          status: 'allowed',
          requiredTool: 'order.create_confirmed',
        },
        reasonCodes: [],
      };

      const validation = validateClassification(result, {
        availableTools: ['product.search'], // order.create_confirmed not in list
      });

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('TOOL_NOT_ALLOWED');
    });
  });

  describe('validateBusinessRules', () => {
    test('validates orders.create_confirmed with all required slots', () => {
      const result = {
        intent: 'orders.create_confirmed',
        slots: {
          productName: 't-shirt',
          customerPhone: '01012345678',
        },
      };

      const validation = validateBusinessRules(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('fails when productName is missing', () => {
      const result = {
        intent: 'orders.create_confirmed',
        slots: {
          customerPhone: '01012345678',
        },
      };

      const validation = validateBusinessRules(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('PRODUCT_NAME_MISSING');
    });

    test('fails when customerPhone is missing', () => {
      const result = {
        intent: 'orders.create_confirmed',
        slots: {
          productName: 't-shirt',
        },
      };

      const validation = validateBusinessRules(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('PHONE_MISSING');
    });

    test('validates inventory.check with productName', () => {
      const result = {
        intent: 'inventory.check',
        slots: {
          productName: 't-shirt',
        },
      };

      const validation = validateBusinessRules(result);
      expect(validation.valid).toBe(true);
    });

    test('fails inventory.check without productName', () => {
      const result = {
        intent: 'inventory.check',
        slots: {},
      };

      const validation = validateBusinessRules(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('PRODUCT_NAME_MISSING');
    });
  });

  describe('validateToolAllowlist', () => {
    test('validates tool in allowlist', () => {
      const result = {
        toolEligibility: {
          status: 'allowed',
          requiredTool: 'order.create_confirmed',
        },
      };

      const validation = validateToolAllowlist(result, ['order.create_confirmed', 'product.search']);
      expect(validation.valid).toBe(true);
    });

    test('rejects tool not in allowlist', () => {
      const result = {
        toolEligibility: {
          status: 'allowed',
          requiredTool: 'order.create_confirmed',
        },
      };

      const validation = validateToolAllowlist(result, ['product.search']);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('validates when no required tool', () => {
      const result = {
        toolEligibility: {
          status: 'blocked',
        },
      };

      const validation = validateToolAllowlist(result, []);
      expect(validation.valid).toBe(true);
    });
  });

  describe('applyConfidencePolicy', () => {
    test('recommends EXECUTE_TOOLS for high confidence', () => {
      const result = { confidence: 0.9 };
      const decision = applyConfidencePolicy(result);
      expect(decision.recommendation).toBe('EXECUTE_TOOLS');
      expect(decision.level).toBe('high');
      expect(decision.requiresConfirmation).toBe(false);
    });

    test('recommends ASK_CLARIFICATION for medium confidence', () => {
      const result = { confidence: 0.65 };
      const decision = applyConfidencePolicy(result);
      expect(decision.recommendation).toBe('ASK_CLARIFICATION');
      expect(decision.level).toBe('medium');
      expect(decision.requiresConfirmation).toBe(true);
    });

    test('recommends BLOCK_TOOLS for low confidence', () => {
      const result = { confidence: 0.4 };
      const decision = applyConfidencePolicy(result);
      expect(decision.recommendation).toBe('BLOCK_TOOLS');
      expect(decision.level).toBe('low');
      expect(decision.requiresConfirmation).toBe(true);
    });
  });

  describe('handleValidationFailure', () => {
    test('creates fallback for BLOCK_TOOLS recommendation', () => {
      const validationResult = {
        reason: 'SCHEMA_VALIDATION_FAILED',
        errors: ['Invalid intent'],
        recommendation: 'BLOCK_TOOLS',
      };

      const response = handleValidationFailure(validationResult, {});
      expect(response.intent).toBe('general.chat');
      expect(response.toolEligibility.status).toBe('blocked');
    });

    test('preserves intent for ASK_CLARIFICATION recommendation', () => {
      const validationResult = {
        reason: 'PHONE_MISSING',
        errors: ['PHONE_MISSING'],
        recommendation: 'ASK_CLARIFICATION',
      };

      const originalResult = {
        intent: 'orders.create_confirmed',
        confidence: 0.7,
        slots: { productName: 't-shirt' },
      };

      const response = handleValidationFailure(validationResult, originalResult);
      expect(response.intent).toBe('orders.create_confirmed');
      expect(response.toolEligibility.status).toBe('needs_clarification');
      // missingSlots contains the error code with _MISSING stripped
      expect(response.missingSlots).toContain('PHONE');
    });
  });
});
