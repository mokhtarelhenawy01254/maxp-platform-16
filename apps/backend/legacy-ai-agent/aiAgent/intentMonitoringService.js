/**
 * @module intentMonitoringService
 * @description Monitoring service for intent classification metrics.
 * Tracks accuracy, latency, errors, and cost for observability.
 */

const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');

function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * In-memory metrics store for real-time monitoring.
 */
const metricsStore = {
  classifications: [],
  maxBufferSize: 1000,
};

/**
 * Record a classification event.
 * @param {Object} params
 * @param {string} params.companyId - Company ID
 * @param {string} params.intent - Classified intent
 * @param {number} params.confidence - Classification confidence
 * @param {string} params.provider - Provider used
 * @param {string} params.model - Model used
 * @param {number} params.latencyMs - Latency in milliseconds
 * @param {boolean} params.success - Whether classification succeeded
 * @param {string} params.channel - Channel (FACEBOOK, WHATSAPP, etc.)
 * @param {string[]} params.missingSlots - Missing slots
 * @param {string} params.error - Error message if failed
 */
function recordClassification({
  companyId,
  intent,
  confidence,
  provider,
  model,
  latencyMs,
  success,
  channel,
  missingSlots = [],
  error = null,
}) {
  const event = {
    timestamp: new Date(),
    companyId,
    intent,
    confidence,
    provider,
    model,
    latencyMs,
    success,
    channel,
    missingSlots,
    error,
  };

  // Add to in-memory buffer
  metricsStore.classifications.push(event);
  if (metricsStore.classifications.length > metricsStore.maxBufferSize) {
    metricsStore.classifications.shift();
  }

  // Log to console for observability
  if (!success) {
    console.warn(`[INTENT-MONITOR] Classification failed: ${error}`, {
      companyId,
      intent,
      provider,
      model,
      latencyMs,
    });
  }
}

/**
 * Get real-time metrics from in-memory buffer.
 * @param {Object} params
 * @param {string} [params.companyId] - Filter by company
 * @param {number} [params.windowMinutes=5] - Time window in minutes
 * @returns {Object} Metrics summary
 */
function getRealTimeMetrics({ companyId = null, windowMinutes = 5 } = {}) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  const events = metricsStore.classifications.filter(event => {
    if (event.timestamp < cutoff) return false;
    if (companyId && event.companyId !== companyId) return false;
    return true;
  });

  if (events.length === 0) {
    return {
      total: 0,
      successRate: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      byIntent: {},
      byProvider: {},
      errorRate: 0,
    };
  }

  const successful = events.filter(e => e.success);
  const failed = events.filter(e => !e.success);
  const latencies = events.map(e => e.latencyMs).sort((a, b) => a - b);

  // Group by intent
  const byIntent = {};
  for (const event of events) {
    if (!byIntent[event.intent]) {
      byIntent[event.intent] = { total: 0, success: 0, avgConfidence: 0 };
    }
    byIntent[event.intent].total++;
    if (event.success) byIntent[event.intent].success++;
    byIntent[event.intent].avgConfidence += event.confidence;
  }
  for (const intent of Object.keys(byIntent)) {
    byIntent[intent].avgConfidence /= byIntent[intent].total;
    byIntent[intent].successRate = byIntent[intent].success / byIntent[intent].total;
  }

  // Group by provider
  const byProvider = {};
  for (const event of events) {
    if (!byProvider[event.provider]) {
      byProvider[event.provider] = { total: 0, success: 0, avgLatencyMs: 0 };
    }
    byProvider[event.provider].total++;
    if (event.success) byProvider[event.provider].success++;
    byProvider[event.provider].avgLatencyMs += event.latencyMs;
  }
  for (const provider of Object.keys(byProvider)) {
    byProvider[provider].avgLatencyMs /= byProvider[provider].total;
    byProvider[provider].successRate = byProvider[provider].success / byProvider[provider].total;
  }

  return {
    total: events.length,
    successRate: successful.length / events.length,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] || 0,
    byIntent,
    byProvider,
    errorRate: failed.length / events.length,
    errors: failed.map(e => ({
      error: e.error,
      intent: e.intent,
      provider: e.provider,
      timestamp: e.timestamp,
    })).slice(-10), // Last 10 errors
  };
}

/**
 * Get top missing slots across classifications.
 * @param {Object} params
 * @param {string} [params.companyId] - Filter by company
 * @param {number} [params.limit=10] - Number of top slots to return
 * @returns {Object[]} Top missing slots
 */
function getTopMissingSlots({ companyId = null, limit = 10 } = {}) {
  const slotCounts = {};
  const events = metricsStore.classifications.filter(event => {
    if (companyId && event.companyId !== companyId) return false;
    return true;
  });

  for (const event of events) {
    for (const slot of event.missingSlots) {
      if (!slotCounts[slot]) {
        slotCounts[slot] = { slot, count: 0, intents: new Set() };
      }
      slotCounts[slot].count++;
      slotCounts[slot].intents.add(event.intent);
    }
  }

  return Object.values(slotCounts)
    .map(item => ({ ...item, intents: [...item.intents] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get cost estimation for classifications.
 * @param {Object} params
 * @param {string} [params.companyId] - Filter by company
 * @param {number} [params.windowHours=24] - Time window in hours
 * @returns {Object} Cost estimation
 */
function getCostEstimation({ companyId = null, windowHours = 24 } = {}) {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const events = metricsStore.classifications.filter(event => {
    if (event.timestamp < cutoff) return false;
    if (companyId && event.companyId !== companyId) return false;
    return true;
  });

  // Approximate cost per 1000 messages based on provider
  const costPer1000 = {
    google: 0.015, // gemini-3-flash-preview
    openai: 0.15,  // gpt-4o-mini
    anthropic: 0.25,
    groq: 0.05,
  };

  const byProvider = {};
  for (const event of events) {
    const provider = event.provider?.toLowerCase() || 'google';
    if (!byProvider[provider]) {
      byProvider[provider] = { count: 0, estimatedCost: 0 };
    }
    byProvider[provider].count++;
    byProvider[provider].estimatedCost += (costPer1000[provider] || 0.015) / 1000;
  }

  const totalEstimatedCost = Object.values(byProvider).reduce((sum, p) => sum + p.estimatedCost, 0);

  return {
    windowHours,
    totalClassifications: events.length,
    byProvider,
    totalEstimatedCost,
    costPerMessage: events.length > 0 ? totalEstimatedCost / events.length : 0,
  };
}

/**
 * Flush metrics to database for persistence.
 * Call this periodically (e.g., every 5 minutes).
 */
async function flushMetricsToDatabase() {
  if (metricsStore.classifications.length === 0) return;

  const prisma = getPrisma();
  const events = [...metricsStore.classifications];
  metricsStore.classifications = [];

  try {
    // Group by company and intent for aggregation
    const aggregated = {};
    for (const event of events) {
      const key = `${event.companyId}:${event.intent}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          companyId: event.companyId,
          intent: event.intent,
          total: 0,
          success: 0,
          totalLatencyMs: 0,
          totalConfidence: 0,
        };
      }
      aggregated[key].total++;
      if (event.success) aggregated[key].success++;
      aggregated[key].totalLatencyMs += event.latencyMs;
      aggregated[key].totalConfidence += event.confidence;
    }

    // Log aggregated metrics
    for (const [key, data] of Object.entries(aggregated)) {
      console.log(`[INTENT-MONITOR] Aggregated: ${key} - Total: ${data.total}, Success: ${data.success}, AvgLatency: ${Math.round(data.totalLatencyMs / data.total)}ms`);
    }
  } catch (error) {
    console.error('[INTENT-MONITOR] Failed to flush metrics:', error.message);
  }
}

// Flush metrics every 5 minutes
setInterval(flushMetricsToDatabase, 5 * 60 * 1000);

module.exports = {
  recordClassification,
  getRealTimeMetrics,
  getTopMissingSlots,
  getCostEstimation,
  flushMetricsToDatabase,
  metricsStore,
};
