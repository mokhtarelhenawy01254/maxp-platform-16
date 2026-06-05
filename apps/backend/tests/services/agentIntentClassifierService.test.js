/**
 * @module agentIntentClassifierService.test
 * @description Tests for intent classification service.
 */

const {
  _private: {
    normalizeClassifierResult,
    parseJsonObject,
  },
} = require('../../legacy-ai-agent/aiAgent/agentIntentClassifierService');

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
      expect(result.ambiguous).toBe(false);
      expect(result.slots.productName).toBe('t-shirt');
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
});
