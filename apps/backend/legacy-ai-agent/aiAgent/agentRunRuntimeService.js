/**
 * @module agentRunRuntimeService
 * @description Generic durable run runtime for agent goals.
 *
 * The LLM can help understand intent, but it must not own workflow state.
 * This service owns run identity, checkpoints, audit persistence, public
 * snapshots, and deterministic step idempotency keys that goal-specific
 * services can reuse.
 */

const crypto = require('crypto');
const redisCacheService = require('../../services/redisCacheService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

function nowIso() {
  return new Date().toISOString();
}

function makeRunId(prefix = 'run') {
  if (typeof crypto.randomUUID === 'function') return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashShort(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function buildExecutionFingerprint(run = {}) {
  if (!run.executionParams && !Array.isArray(run.plan)) return null;
  return hashShort(stableStringify({
    type: run.type || null,
    plan: run.plan || [],
    executionParams: run.executionParams || null,
  }));
}

function appendEvent(run = {}, event = {}, at = nowIso()) {
  const nextEvent = {
    at,
    type: event.type || 'updated',
    ...event,
  };
  return [...(run.events || []), nextEvent].slice(-50);
}

function buildCheckpoint(run = {}, eventType = 'updated', at = nowIso()) {
  return {
    sequence: Number(run.checkpoint?.sequence || 0) + 1,
    at,
    eventType,
    status: run.status || 'collecting',
    nextStep: run.nextStep || null,
    plan: Array.isArray(run.plan) ? run.plan : [],
    executionFingerprint: run.executionFingerprint || buildExecutionFingerprint(run),
  };
}

function publicSnapshot(run = null) {
  if (!run) return null;
  return {
    id: run.id,
    type: run.type,
    status: run.status,
    title: run.title,
    collected: run.collected || {},
    missingFields: run.missingFields || [],
    nextStep: run.nextStep || null,
    executionParams: run.executionParams || null,
    plan: run.plan || null,
    checkpoint: run.checkpoint || null,
    executionFingerprint: run.executionFingerprint || null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

class AgentRunRuntimeService {
  constructor(options = {}) {
    this.namespace = options.namespace || 'agent:goal-run';
    this.provider = options.provider || 'AGENT_GOAL';
    this.scope = options.scope || 'agent_goal';
    this.action = options.action || 'GOAL_RUN_STATE';
    this.ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;
    this.runPrefix = options.runPrefix || 'goal';
  }

  _cacheKey(companyId, conversationId) {
    return `${this.namespace}:${companyId}:${conversationId}`;
  }

  isActive(run = null) {
    return Boolean(run?.status && !['completed', 'cancelled'].includes(run.status));
  }

  createRun({
    type,
    title,
    companyId,
    userId,
    sessionId,
    conversationId,
    message,
    collected = {},
    missingFields = [],
    nextStep = 'collect_missing_fields',
    status = 'collecting',
  }) {
    const at = nowIso();
    const run = {
      id: makeRunId(this.runPrefix),
      type,
      title,
      status,
      companyId,
      userId,
      sessionId,
      conversationId,
      collected,
      missingFields,
      nextStep,
      plan: [],
      executionParams: null,
      events: [{ at, type: 'created', message }],
      createdAt: at,
      updatedAt: at,
    };
    run.executionFingerprint = buildExecutionFingerprint(run);
    run.checkpoint = buildCheckpoint(run, 'created', at);
    return run;
  }

  transitionRun(run = {}, patch = {}, event = {}) {
    const at = nowIso();
    const nextRun = {
      ...run,
      ...patch,
      updatedAt: at,
    };
    nextRun.executionFingerprint = buildExecutionFingerprint(nextRun);
    nextRun.events = appendEvent(run, event, at);
    nextRun.checkpoint = buildCheckpoint(nextRun, event.type || 'updated', at);
    return nextRun;
  }

  buildStepIdempotencyKey(run = {}, tool = 'unknown', index = 0) {
    const fingerprint = run.executionFingerprint || buildExecutionFingerprint(run) || 'no-fingerprint';
    return `${run.id || 'run'}:${index}:${tool}:${fingerprint}`;
  }

  prepareExecutionSteps(run = {}, steps = []) {
    return steps.map((step, index) => ({
      ...step,
      goalRunId: step.goalRunId || run.id || null,
      stepIndex: index,
      idempotencyKey: step.idempotencyKey || this.buildStepIdempotencyKey(run, step.tool, index),
      executionFingerprint: run.executionFingerprint || buildExecutionFingerprint(run),
    }));
  }

  publicSnapshot(run = null) {
    return publicSnapshot(run);
  }

  async loadActiveRun(companyId, conversationId) {
    if (!companyId || !conversationId) return null;
    const cached = await redisCacheService.get(this._cacheKey(companyId, conversationId));
    if (this.isActive(cached)) return cached;

    if (process.env.NODE_ENV === 'test') return null;

    try {
      const prisma = getSharedPrismaClient();
      const row = await prisma.aiProviderLog.findFirst({
        where: {
          companyId,
          provider: this.provider,
          scope: this.scope,
          action: this.action,
          message: conversationId,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!row?.metadata) return null;
      const parsed = JSON.parse(row.metadata);
      const run = parsed?.run || null;
      if (this.isActive(run)) {
        await redisCacheService.set(this._cacheKey(companyId, conversationId), run, this.ttlSeconds);
        return run;
      }
    } catch (error) {
      console.warn('[AGENT-RUN] Audit load skipped:', error.message);
    }
    return null;
  }

  async saveRun(companyId, conversationId, run) {
    if (!companyId || !conversationId || !run) return null;
    await redisCacheService.set(this._cacheKey(companyId, conversationId), run, this.ttlSeconds);
    if (process.env.NODE_ENV === 'test') return run;
    try {
      const prisma = getSharedPrismaClient();
      await prisma.aiProviderLog.create({
        data: {
          provider: this.provider,
          companyId,
          scope: this.scope,
          action: this.action,
          status: run.status || 'LOGGED',
          model: run.id,
          message: conversationId,
          metadata: JSON.stringify({ run }),
        },
      });
    } catch (error) {
      console.warn('[AGENT-RUN] Audit save skipped:', error.message);
    }
    return run;
  }

  async clearConversation(companyId, conversationId) {
    if (!companyId || !conversationId) return false;
    await redisCacheService.del(this._cacheKey(companyId, conversationId));
    return true;
  }
}

const defaultRuntime = new AgentRunRuntimeService();

module.exports = defaultRuntime;
module.exports.AgentRunRuntimeService = AgentRunRuntimeService;
module.exports._private = {
  makeRunId,
  stableStringify,
  buildExecutionFingerprint,
  buildCheckpoint,
  publicSnapshot,
};
