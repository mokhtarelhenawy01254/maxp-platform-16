/**
 * @module intentMonitoringService.test
 * @description Tests for intent monitoring service.
 */

const {
  recordClassification,
  getRealTimeMetrics,
  getTopMissingSlots,
  getCostEstimation,
  metricsStore,
} = require('../../services/aiAgent/intentMonitoringService');

describe('Intent Monitoring Service', () => {
  const originalMaxBufferSize = metricsStore.maxBufferSize;

  beforeEach(() => {
    metricsStore.classifications = [];
    metricsStore.maxBufferSize = originalMaxBufferSize;
  });

  describe('recordClassification', () => {
    test('records a successful classification', () => {
      recordClassification({
        companyId: 'company-123',
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        provider: 'google',
        model: 'gemini-3-flash-preview',
        latencyMs: 350,
        success: true,
        channel: 'FACEBOOK',
        missingSlots: [],
      });

      expect(metricsStore.classifications).toHaveLength(1);
      expect(metricsStore.classifications[0].intent).toBe('orders.create_confirmed');
      expect(metricsStore.classifications[0].success).toBe(true);
    });

    test('records a failed classification', () => {
      recordClassification({
        companyId: 'company-123',
        intent: 'general.chat',
        confidence: 0.1,
        provider: 'google',
        model: 'gemini-3-flash-preview',
        latencyMs: 500,
        success: false,
        channel: 'FACEBOOK',
        missingSlots: [],
        error: 'ALL_PROVIDERS_FAILED',
      });

      expect(metricsStore.classifications).toHaveLength(1);
      expect(metricsStore.classifications[0].success).toBe(false);
      expect(metricsStore.classifications[0].error).toBe('ALL_PROVIDERS_FAILED');
    });

    test('respects max buffer size', () => {
      metricsStore.maxBufferSize = 5;
      for (let i = 0; i < 10; i++) {
        recordClassification({
          companyId: 'company-123',
          intent: 'general.chat',
          confidence: 0.8,
          provider: 'google',
          model: 'gemini-3-flash-preview',
          latencyMs: 100,
          success: true,
          channel: 'FACEBOOK',
        });
      }

      expect(metricsStore.classifications).toHaveLength(5);
    });
  });

  describe('getRealTimeMetrics', () => {
    test('returns empty metrics when no data', () => {
      const metrics = getRealTimeMetrics();
      expect(metrics.total).toBe(0);
      expect(metrics.successRate).toBe(0);
    });

    test('calculates metrics correctly', () => {
      // Add some test events
      for (let i = 0; i < 10; i++) {
        recordClassification({
          companyId: 'company-123',
          intent: i < 7 ? 'orders.create_confirmed' : 'general.chat',
          confidence: 0.8,
          provider: 'google',
          model: 'gemini-3-flash-preview',
          latencyMs: 200 + i * 10,
          success: i < 8, // 80% success rate
          channel: 'FACEBOOK',
        });
      }

      const metrics = getRealTimeMetrics();
      expect(metrics.total).toBe(10);
      expect(metrics.successRate).toBe(0.8);
      expect(metrics.avgLatencyMs).toBeGreaterThan(200);
      expect(metrics.byIntent['orders.create_confirmed']).toBeDefined();
      expect(metrics.byIntent['general.chat']).toBeDefined();
    });

    test('filters by company', () => {
      recordClassification({
        companyId: 'company-123',
        intent: 'general.chat',
        confidence: 0.8,
        provider: 'google',
        model: 'gemini-3-flash-preview',
        latencyMs: 100,
        success: true,
        channel: 'FACEBOOK',
      });

      recordClassification({
        companyId: 'company-456',
        intent: 'orders.create_confirmed',
        confidence: 0.9,
        provider: 'openai',
        model: 'gpt-4o-mini',
        latencyMs: 200,
        success: true,
        channel: 'WHATSAPP',
      });

      const metrics123 = getRealTimeMetrics({ companyId: 'company-123' });
      expect(metrics123.total).toBe(1);

      const metrics456 = getRealTimeMetrics({ companyId: 'company-456' });
      expect(metrics456.total).toBe(1);
    });
  });

  describe('getTopMissingSlots', () => {
    test('returns top missing slots', () => {
      recordClassification({
        companyId: 'company-123',
        intent: 'orders.create_confirmed',
        confidence: 0.7,
        provider: 'google',
        model: 'gemini-3-flash-preview',
        latencyMs: 300,
        success: true,
        channel: 'FACEBOOK',
        missingSlots: ['productPrice', 'city'],
      });

      recordClassification({
        companyId: 'company-123',
        intent: 'orders.create_confirmed',
        confidence: 0.7,
        provider: 'google',
        model: 'gemini-3-flash-preview',
        latencyMs: 300,
        success: true,
        channel: 'FACEBOOK',
        missingSlots: ['productPrice', 'customerPhone'],
      });

      const topSlots = getTopMissingSlots();
      expect(topSlots.length).toBeGreaterThan(0);
      expect(topSlots[0].slot).toBe('productPrice');
      expect(topSlots[0].count).toBe(2);
    });
  });

  describe('getCostEstimation', () => {
    test('estimates cost correctly', () => {
      for (let i = 0; i < 100; i++) {
        recordClassification({
          companyId: 'company-123',
          intent: 'general.chat',
          confidence: 0.8,
          provider: 'google',
          model: 'gemini-3-flash-preview',
          latencyMs: 100,
          success: true,
          channel: 'FACEBOOK',
        });
      }

      const cost = getCostEstimation({ windowHours: 24 });
      expect(cost.totalClassifications).toBe(100);
      expect(cost.totalEstimatedCost).toBeGreaterThan(0);
      expect(cost.byProvider['google']).toBeDefined();
    });
  });
});
