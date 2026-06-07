/**
 * @module intentClassificationSchema.test
 * @description Tests for intent classification schema and provider adapters.
 */

const {
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
} = require('../../legacy-ai-agent/aiAgent/intentClassificationSchema');

const {
  OpenAIStructuredOutputAdapter,
  GeminiStructuredOutputAdapter,
  AnthropicStructuredOutputAdapter,
  createStructuredOutputAdapter,
} = require('../../legacy-ai-agent/aiAgent/structuredOutputProviderAdapter');

describe('Intent Classification Schema', () => {
  describe('Schema Constants', () => {
    test('SCHEMA_VERSION is defined', () => {
      expect(SCHEMA_VERSION).toBe('1.0.0');
    });

    test('INTENT_ENUM contains all required intents', () => {
      expect(INTENT_ENUM).toContain('general.chat');
      expect(INTENT_ENUM).toContain('orders.create_confirmed');
      expect(INTENT_ENUM).toContain('orders.create_draft');
      expect(INTENT_ENUM).toContain('inventory');
      expect(INTENT_ENUM).toContain('products');
      expect(INTENT_ENUM).toContain('support.exchange');
      expect(INTENT_ENUM).toContain('support.refund');
      expect(INTENT_ENUM).toContain('support.complaint');
      expect(INTENT_ENUM).toContain('agents.manage');
      expect(INTENT_ENUM).toContain('skills.manage');
    });

    test('CONFIDENCE_ENUM contains high, medium, low', () => {
      expect(CONFIDENCE_ENUM).toEqual(['high', 'medium', 'low']);
    });

    test('TOOL_ELIGIBILITY_ENUM contains required values', () => {
      expect(TOOL_ELIGIBILITY_ENUM).toContain('allowed');
      expect(TOOL_ELIGIBILITY_ENUM).toContain('blocked');
      expect(TOOL_ELIGIBILITY_ENUM).toContain('needs_clarification');
    });

    test('REASON_CODE_ENUM contains all reason codes', () => {
      expect(REASON_CODE_ENUM).toContain('PRODUCT_NAME_FOUND');
      expect(REASON_CODE_ENUM).toContain('PHONE_FOUND');
      expect(REASON_CODE_ENUM).toContain('SLOTS_COMPLETE');
      expect(REASON_CODE_ENUM).toContain('INTENT_AMBIGUOUS');
    });
  });

  describe('INTENT_CLASSIFICATION_SCHEMA', () => {
    test('schema has required fields', () => {
      expect(INTENT_CLASSIFICATION_SCHEMA.required).toEqual([
        'intent',
        'confidence',
        'slots',
        'missingSlots',
        'toolEligibility',
        'reasonCodes',
      ]);
    });

    test('schema has all intent enum values', () => {
      expect(INTENT_CLASSIFICATION_SCHEMA.properties.intent.enum).toEqual(INTENT_ENUM);
    });

    test('schema slots has all required slot properties', () => {
      const slotProperties = INTENT_CLASSIFICATION_SCHEMA.properties.slots.properties;
      expect(slotProperties).toHaveProperty('productName');
      expect(slotProperties).toHaveProperty('productPrice');
      expect(slotProperties).toHaveProperty('productSize');
      expect(slotProperties).toHaveProperty('productColor');
      expect(slotProperties).toHaveProperty('quantity');
      expect(slotProperties).toHaveProperty('customerName');
      expect(slotProperties).toHaveProperty('customerPhone');
      expect(slotProperties).toHaveProperty('city');
      expect(slotProperties).toHaveProperty('orderNumber');
      expect(slotProperties).toHaveProperty('confirmedByCustomer');
      expect(slotProperties).toHaveProperty('referencesPreviousProduct');
    });
  });

  describe('getProviderSchema', () => {
    test('returns OpenAI schema for openai provider', () => {
      const schema = getProviderSchema('openai');
      expect(schema.type).toBe('json_schema');
      expect(schema.json_schema.name).toBe('intent_classification');
      expect(schema.json_schema.strict).toBe(true);
    });

    test('returns Gemini schema for gemini provider', () => {
      const schema = getProviderSchema('gemini');
      expect(schema.responseMimeType).toBe('application/json');
      expect(schema.responseSchema).toBeDefined();
    });

    test('returns Anthropic schema for anthropic provider', () => {
      const schema = getProviderSchema('anthropic');
      expect(schema.name).toBe('classify_intent');
      expect(schema.input_schema).toBeDefined();
    });

    test('returns canonical schema for unknown provider', () => {
      const schema = getProviderSchema('unknown');
      expect(schema).toEqual(INTENT_CLASSIFICATION_SCHEMA);
    });
  });

  describe('validateClassificationResult', () => {
    test('validates a correct result', () => {
      const result = {
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        slots: { productName: 't-shirt', customerPhone: '01012345678' },
        missingSlots: ['productPrice'],
        toolEligibility: { status: 'needs_clarification' },
        reasonCodes: ['PRODUCT_NAME_FOUND', 'PHONE_FOUND', 'PRICE_MISSING'],
      };

      const validation = validateClassificationResult(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('rejects result with missing required fields', () => {
      const result = {
        intent: 'orders.create_confirmed',
        // Missing confidence, slots, etc.
      };

      const validation = validateClassificationResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('rejects result with invalid intent', () => {
      const result = {
        intent: 'invalid.intent',
        confidence: 0.9,
        slots: {},
        missingSlots: [],
        toolEligibility: { status: 'allowed' },
        reasonCodes: [],
      };

      const validation = validateClassificationResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid intent: invalid.intent');
    });

    test('rejects result with invalid confidence', () => {
      const result = {
        intent: 'general.chat',
        confidence: 1.5, // Invalid: > 1
        slots: {},
        missingSlots: [],
        toolEligibility: { status: 'allowed' },
        reasonCodes: [],
      };

      const validation = validateClassificationResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid confidence: 1.5');
    });

    test('rejects result with invalid toolEligibility status', () => {
      const result = {
        intent: 'general.chat',
        confidence: 0.9,
        slots: {},
        missingSlots: [],
        toolEligibility: { status: 'invalid_status' },
        reasonCodes: [],
      };

      const validation = validateClassificationResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('createFallbackResult', () => {
    test('creates a valid fallback result', () => {
      const fallback = createFallbackResult('TEST_REASON');
      expect(fallback.schemaVersion).toBe(SCHEMA_VERSION);
      expect(fallback.intent).toBe('general.chat');
      expect(fallback.confidence).toBe(0.1);
      expect(fallback.confidenceLevel).toBe('low');
      expect(fallback.toolEligibility.status).toBe('blocked');
      expect(fallback.toolEligibility.blockedReason).toBe('TEST_REASON');
      expect(fallback.ambiguity).toBe(true);
    });

    test('creates fallback with default reason', () => {
      const fallback = createFallbackResult();
      expect(fallback.toolEligibility.blockedReason).toBe('CLASSIFIER_UNAVAILABLE');
    });
  });
});

describe('Structured Output Provider Adapters', () => {
  describe('createStructuredOutputAdapter', () => {
    test('creates OpenAI adapter', () => {
      const adapter = createStructuredOutputAdapter('openai', { apiKey: 'test-key' });
      expect(adapter).toBeInstanceOf(OpenAIStructuredOutputAdapter);
      expect(adapter.provider).toBe('openai');
    });

    test('creates Gemini adapter', () => {
      const adapter = createStructuredOutputAdapter('gemini', { apiKey: 'test-key' });
      expect(adapter).toBeInstanceOf(GeminiStructuredOutputAdapter);
      expect(adapter.provider).toBe('gemini');
    });

    test('creates Anthropic adapter', () => {
      const adapter = createStructuredOutputAdapter('anthropic', { apiKey: 'test-key' });
      expect(adapter).toBeInstanceOf(AnthropicStructuredOutputAdapter);
      expect(adapter.provider).toBe('anthropic');
    });

    test('throws for unsupported provider', () => {
      expect(() => createStructuredOutputAdapter('unsupported')).toThrow('Unsupported provider: unsupported');
    });
  });

  describe('BaseStructuredOutputAdapter', () => {
    test('buildMessages creates correct message structure', () => {
      const adapter = createStructuredOutputAdapter('openai', { apiKey: 'test' });
      const messages = adapter.buildMessages({
        message: 'I want to order a t-shirt',
        channel: 'FACEBOOK',
        companyId: 'company-123',
        availableTools: ['order.create_draft', 'product.search'],
        exemplars: [
          { query: 'I want shoes', output: { intent: 'orders.create_draft' } },
        ],
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[0].content).toContain('FACEBOOK');
      expect(messages[0].content).toContain('order.create_draft');
      expect(messages[1].content).toContain('I want to order a t-shirt');
    });

    test('parseResponse parses valid JSON', () => {
      const adapter = createStructuredOutputAdapter('openai', { apiKey: 'test' });
      const validResult = {
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        slots: { productName: 't-shirt' },
        missingSlots: [],
        toolEligibility: { status: 'allowed' },
        reasonCodes: ['PRODUCT_NAME_FOUND'],
      };

      const parsed = adapter.parseResponse(JSON.stringify(validResult));
      expect(parsed.intent).toBe('orders.create_confirmed');
      expect(parsed.confidence).toBe(0.9);
    });

    test('parseResponse returns fallback for invalid JSON', () => {
      const adapter = createStructuredOutputAdapter('openai', { apiKey: 'test' });
      const parsed = adapter.parseResponse('invalid json');
      expect(parsed.intent).toBe('general.chat');
      expect(parsed.toolEligibility.status).toBe('blocked');
    });

    test('parseResponse returns fallback for schema validation failure', () => {
      const adapter = createStructuredOutputAdapter('openai', { apiKey: 'test' });
      const invalidResult = { intent: 'invalid_intent' };
      const parsed = adapter.parseResponse(JSON.stringify(invalidResult));
      expect(parsed.intent).toBe('general.chat');
      expect(parsed.toolEligibility.blockedReason).toBe('SCHEMA_VALIDATION_FAILED');
    });
  });
});
