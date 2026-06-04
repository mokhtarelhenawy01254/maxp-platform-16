/**
 * @module agentIntentClassifierService.test
 * @description Tests for intent classification service.
 */

const {
  _private: {
    normalizeClassifierResult,
    parseJsonObject,
    buildSystemPrompt,
    buildUserContent,
  },
} = require('../../services/aiAgent/agentIntentClassifierService');

describe('Agent Intent Classifier Service', () => {
  describe('normalizeClassifierResult', () => {
    test('normalizes a valid result', () => {
      const result = normalizeClassifierResult({
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        ambiguous: false,
        clarificationQuestion: null,
        slots: { productName: 't-shirt' },
        missingSlots: ['productPrice'],
        toolEligibility: { status: 'needs_clarification' },
        reasonCodes: ['PRODUCT_NAME_FOUND', 'PRICE_MISSING'],
      });

      expect(result.intent).toBe('orders.create_confirmed');
      expect(result.confidence).toBe(0.9);
      expect(result.confidenceLevel).toBe('high');
      expect(result.ambiguous).toBe(false);
      expect(result.slots.productName).toBe('t-shirt');
      expect(result.missingSlots).toContain('productPrice');
    });

    test('returns null for invalid input', () => {
      expect(normalizeClassifierResult(null)).toBe(null);
      expect(normalizeClassifierResult(undefined)).toBe(null);
      expect(normalizeClassifierResult('string')).toBe(null);
    });

    test('returns null for invalid intent', () => {
      const result = normalizeClassifierResult({
        intent: 'invalid.intent',
        confidence: 0.9,
      });
      expect(result).toBe(null);
    });

    test('uses default values for missing fields', () => {
      const result = normalizeClassifierResult({
        intent: 'general.chat',
      });

      expect(result.intent).toBe('general.chat');
      expect(result.confidence).toBe(0.8);
      expect(result.ambiguous).toBe(false);
      expect(result.slots).toEqual({});
      expect(result.missingSlots).toEqual([]);
    });
  });

  describe('parseJsonObject', () => {
    test('parses valid JSON', () => {
      const json = '{"intent": "general.chat", "confidence": 0.9}';
      const result = parseJsonObject(json);
      expect(result.intent).toBe('general.chat');
      expect(result.confidence).toBe(0.9);
    });

    test('parses JSON wrapped in markdown code block', () => {
      const json = '```json\n{"intent": "general.chat"}\n```';
      const result = parseJsonObject(json);
      expect(result.intent).toBe('general.chat');
    });

    test('returns null for invalid JSON', () => {
      expect(parseJsonObject('invalid')).toBe(null);
      expect(parseJsonObject('')).toBe(null);
      expect(parseJsonObject(null)).toBe(null);
    });

    test('extracts JSON from mixed content', () => {
      const text = 'Here is the classification:\n{"intent": "orders.create_confirmed"}\nDone.';
      const result = parseJsonObject(text);
      expect(result.intent).toBe('orders.create_confirmed');
    });
  });

  describe('buildSystemPrompt', () => {
    test('includes intent list', () => {
      const prompt = buildSystemPrompt({
        channel: 'FACEBOOK',
        companyId: 'company-123',
        availableTools: ['order.create_draft', 'product.search'],
        exemplars: [],
      });

      expect(prompt).toContain('general.chat');
      expect(prompt).toContain('orders.create_confirmed');
      expect(prompt).toContain('inventory');
    });

    test('includes channel context', () => {
      const prompt = buildSystemPrompt({
        channel: 'FACEBOOK',
        companyId: 'company-123',
        availableTools: [],
        exemplars: [],
      });

      expect(prompt).toContain('FACEBOOK');
      expect(prompt).toContain('company-123');
    });

    test('includes available tools', () => {
      const prompt = buildSystemPrompt({
        channel: 'WHATSAPP',
        companyId: 'company-123',
        availableTools: ['order.create_draft', 'product.search', 'inventory.check'],
        exemplars: [],
      });

      expect(prompt).toContain('order.create_draft');
      expect(prompt).toContain('product.search');
      expect(prompt).toContain('inventory.check');
    });

    test('includes exemplars', () => {
      const prompt = buildSystemPrompt({
        channel: 'FACEBOOK',
        companyId: 'company-123',
        availableTools: [],
        exemplars: [
          { query: 'I want to order', intent: 'orders.create_draft', slots: { productName: 't-shirt' } },
        ],
      });

      expect(prompt).toContain('Examples');
      expect(prompt).toContain('I want to order');
      expect(prompt).toContain('orders.create_draft');
    });

    test('includes confidence scoring rules', () => {
      const prompt = buildSystemPrompt({
        channel: 'FACEBOOK',
        companyId: 'company-123',
        availableTools: [],
        exemplars: [],
      });

      expect(prompt).toContain('Confidence Scoring');
      expect(prompt).toContain('high (0.85-1.0)');
      expect(prompt).toContain('medium (0.6-0.84)');
      expect(prompt).toContain('low (0.0-0.59)');
    });
  });

  describe('buildUserContent', () => {
    test('builds content with message only', () => {
      const content = buildUserContent({
        message: 'I want to order a t-shirt',
        conversationContext: null,
      });

      expect(content).toContain('I want to order a t-shirt');
      expect(content).not.toContain('Conversation context');
    });

    test('builds content with conversation context', () => {
      const context = {
        previousMessages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
        ],
      };

      const content = buildUserContent({
        message: 'I want to order',
        conversationContext: context,
      });

      expect(content).toContain('I want to order');
      expect(content).toContain('Conversation context');
      expect(content).toContain('previousMessages');
    });
  });
});
