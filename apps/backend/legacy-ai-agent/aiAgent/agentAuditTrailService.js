/**
 * @module agentAuditTrailService
 * @description Phase 10: Audit Trail Logger - append-only decision logging
 * for AI agent decisions, persisted to AiProviderLog (scope: 'agent_audit').
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

const SCOPE = 'agent_audit';

class AgentAuditTrailService {
  /**
   * Logs an immutable decision entry to the database.
   */
  async logDecision(companyId, { traceId, agentId, action, decision, reasoning, cost = 0, metadata = {} }) {
    if (!companyId) throw new Error('companyId is required');
    if (!action) throw new Error('action is required');

    const prisma = getSharedPrismaClient();
    const entry = await prisma.aiProviderLog.create({
      data: {
        provider: 'AGENT_AUDIT',
        companyId,
        scope: SCOPE,
        action,
        status: 'LOGGED',
        model: agentId || null,
        message: decision || '',
        metadata: JSON.stringify({
          traceId: traceId || null,
          reasoning: reasoning || '',
          cost: parseFloat(cost) || 0,
          ...metadata,
        }),
      },
    });

    return this._toDecisionEntry(entry);
  }

  /**
   * Query decisions with filters.
   */
  async getDecisionLog(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    const where = { companyId, scope: SCOPE };

    if (filters.action) where.action = filters.action;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const logs = await prisma.aiProviderLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    let results = logs.map(e => this._toDecisionEntry(e));

    if (filters.traceId) results = results.filter(e => e.traceId === filters.traceId);
    if (filters.agentId) results = results.filter(e => e.agentId === filters.agentId);

    const limit = filters.limit || 50;
    return results.slice(-limit);
  }

  async getDecisionById(companyId, decisionId) {
    const prisma = getSharedPrismaClient();
    const e = await prisma.aiProviderLog.findFirst({
      where: { id: decisionId, companyId, scope: SCOPE },
    });
    if (!e) return null;
    return this._toDecisionEntry(e);
  }

  /**
   * Aggregate cost summary.
   */
  async getCostSummary(companyId, fromDate = null, toDate = null) {
    const prisma = getSharedPrismaClient();
    const where = { companyId, scope: SCOPE };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const logs = await prisma.aiProviderLog.findMany({ where });

    const costByAction = {};
    let totalCost = 0;
    for (const entry of logs) {
      let meta = {};
      try { meta = JSON.parse(entry.metadata || '{}'); } catch (_) {}
      const c = parseFloat(meta.cost) || 0;
      totalCost += c;
      costByAction[entry.action] = (costByAction[entry.action] || 0) + c;
    }
    return {
      totalCost,
      decisionCount: logs.length,
      avgCostPerDecision: logs.length ? totalCost / logs.length : 0,
      costByAction,
    };
  }

  async exportAuditLog(companyId, format = 'json') {
    const prisma = getSharedPrismaClient();
    const logs = await prisma.aiProviderLog.findMany({
      where: { companyId, scope: SCOPE },
      orderBy: { createdAt: 'asc' },
    });
    return logs.map(e => this._toDecisionEntry(e));
  }

  /** Converts a raw DB row into the decision entry shape. */
  _toDecisionEntry(e) {
    let meta = {};
    try { meta = JSON.parse(e.metadata || '{}'); } catch (_) {}
    return {
      id: e.id,
      companyId: e.companyId,
      traceId: meta.traceId || null,
      agentId: e.model || null,
      action: e.action,
      decision: e.message || '',
      reasoning: meta.reasoning || '',
      cost: parseFloat(meta.cost) || 0,
      metadata: meta,
      timestamp: e.createdAt,
      immutable: true,
    };
  }

  async _reset() {
    const prisma = getSharedPrismaClient();
    await prisma.aiProviderLog.deleteMany({ where: { scope: SCOPE } });
  }
}

module.exports = new AgentAuditTrailService();
