/**
 * @module intentExemplarService.test
 * @description Tests for intent exemplar service with pgvector.
 */

const {
  generateDeterministicEmbedding,
  cosineSimilarity,
} = require('../../legacy-ai-agent/aiAgent/intentExemplarService');

describe('Intent Exemplar Service', () => {
  describe('generateDeterministicEmbedding', () => {
    test('generates 768-dimensional embedding', () => {
      const embedding = generateDeterministicEmbedding('test query');
      expect(embedding).toHaveLength(768);
    });

    test('generates consistent embeddings for same input', () => {
      const emb1 = generateDeterministicEmbedding('hello world');
      const emb2 = generateDeterministicEmbedding('hello world');
      expect(emb1).toEqual(emb2);
    });

    test('generates different embeddings for different input', () => {
      const emb1 = generateDeterministicEmbedding('hello');
      const emb2 = generateDeterministicEmbedding('world');
      expect(emb1).not.toEqual(emb2);
    });

    test('embedding is normalized', () => {
      const embedding = generateDeterministicEmbedding('test');
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(norm).toBeCloseTo(1.0, 5);
    });
  });

  describe('cosineSimilarity', () => {
    test('returns 1 for identical vectors', () => {
      const vec = [1, 0, 0, 0];
      expect(cosineSimilarity(vec, vec)).toBe(1);
    });

    test('returns 0 for orthogonal vectors', () => {
      const a = [1, 0, 0, 0];
      const b = [0, 1, 0, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    test('returns 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    test('returns 0 for null vectors', () => {
      expect(cosineSimilarity(null, null)).toBe(0);
    });

    test('returns 0 for vectors with different lengths', () => {
      expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    });

    test('calculates correct similarity', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      const expected = (1 * 4 + 2 * 5 + 3 * 6) / (Math.sqrt(14) * Math.sqrt(77));
      expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 5);
    });
  });

  describe('DEFAULT_EXEMPLARS', () => {
    const { DEFAULT_EXEMPLARS } = require('../../scripts/seed-intent-exemplars');

    test('has exemplars for all main intents', () => {
      const intents = new Set(DEFAULT_EXEMPLARS.map(e => e.intent));
      expect(intents).toContain('orders.create_confirmed');
      expect(intents).toContain('orders.create_draft');
      expect(intents).toContain('inventory');
      expect(intents).toContain('products');
      expect(intents).toContain('shipping.rates');
      expect(intents).toContain('support.exchange');
      expect(intents).toContain('support.refund');
      expect(intents).toContain('support.complaint');
      expect(intents).toContain('general.chat');
    });

    test('has Arabic and English exemplars', () => {
      const locales = new Set(DEFAULT_EXEMPLARS.map(e => e.locale));
      expect(locales).toContain('ar');
      expect(locales).toContain('en');
    });

    test('has different difficulty levels', () => {
      const difficulties = new Set(DEFAULT_EXEMPLARS.map(e => e.difficulty));
      expect(difficulties).toContain('easy');
      expect(difficulties).toContain('medium');
      expect(difficulties).toContain('hard');
    });

    test('all exemplars have required fields', () => {
      for (const exemplar of DEFAULT_EXEMPLARS) {
        expect(exemplar.query).toBeDefined();
        expect(exemplar.intent).toBeDefined();
        expect(exemplar.slots).toBeDefined();
        expect(exemplar.difficulty).toBeDefined();
        expect(exemplar.locale).toBeDefined();
      }
    });
  });
});
