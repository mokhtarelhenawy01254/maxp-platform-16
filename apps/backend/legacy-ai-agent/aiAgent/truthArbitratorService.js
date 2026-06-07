/**
 * @module truthArbitratorService
 * @description Phase 7: Truth Arbitration Engine - resolves conflicts between
 * contradictory customer facts using weighted scoring.
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

const ARBITRATION_WEIGHTS = { RECENCY: 0.3, FREQUENCY: 0.3, CONFIDENCE: 0.1, SOURCE_RELIABILITY: 0.3 };

const SOURCE_SCORES = {
  PURCHASE: 1.0,
  EXPLICIT_CHAT: 0.7,
  INFERRED: 0.4,
  THIRD_PARTY: 0.3,
};

class TruthArbitratorService {
  constructor() {
    this.prisma = null;
  }

  _getPrisma() {
    if (!this.prisma) this.prisma = getSharedPrismaClient();
    return this.prisma;
  }

  /**
   * Calculates the arbitration score for a fact.
   * @param {Object} fact - { observedAt, frequency, confidence, source }
   * @param {Date} [now] - Reference time
   * @returns {number} Score between 0 and 1
   */
  calculateArbitrationScore(fact, now = new Date()) {
    let meta = {};
    if (fact.metadata) {
      try {
        meta = typeof fact.metadata === 'string' ? JSON.parse(fact.metadata) : fact.metadata;
      } catch (e) {
        // ignore parsing error
      }
    }
    if (!meta || typeof meta !== 'object') {
      meta = {};
    }

    const observedAtVal = fact.observedAt || meta.observedAt;
    const observedAt = observedAtVal ? new Date(observedAtVal) : new Date(fact.createdAt || now);
    const daysSince = Math.max(0, (now.getTime() - observedAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = 1 / (1 + daysSince / 30);

    const freqVal = fact.frequency !== undefined ? fact.frequency : meta.frequency;
    const frequencyScore = Math.min(1, (freqVal || 1) / 10);

    const confidence = Math.min(1, Math.max(0, fact.confidence || 0.5));

    const sourceVal = fact.source || meta.source;
    const sourceReliability = SOURCE_SCORES[sourceVal] || SOURCE_SCORES.INFERRED;

    return (
      recencyScore * ARBITRATION_WEIGHTS.RECENCY +
      frequencyScore * ARBITRATION_WEIGHTS.FREQUENCY +
      confidence * ARBITRATION_WEIGHTS.CONFIDENCE +
      sourceReliability * ARBITRATION_WEIGHTS.SOURCE_RELIABILITY
    );
  }

  /**
   * Resolves conflict between contradictory facts.
   * @param {string} companyId
   * @param {Array<Object>} facts - Array of conflicting facts
   * @param {Date} [now]
   * @returns {{ winner: Object, archived: Object[] }}
   */
  async resolveConflict(companyId, facts, now = new Date()) {
    if (!facts || facts.length === 0) return { winner: null, archived: [] };
    if (facts.length === 1) return { winner: facts[0], archived: [] };

    const scored = facts.map(f => ({
      fact: f,
      score: this.calculateArbitrationScore(f, now),
    }));
    scored.sort((a, b) => b.score - a.score);

    const winner = scored[0].fact;
    const losers = scored.slice(1).map(s => s.fact);

    // Archive losing facts in DB
    for (const loser of losers) {
      if (loser.id) {
        try { await this.archiveFact(loser.id); } catch (e) { /* best-effort */ }
      }
    }

    return { winner, archived: losers };
  }

  /**
   * Archives a fact by setting validTo to now.
   */
  async archiveFact(factId) {
    const prisma = this._getPrisma();
    return prisma.agenticMemoryFact.update({
      where: { id: factId },
      data: { validTo: new Date() },
    });
  }

  /**
   * Returns only active (non-expired) facts from DB.
   */
  async getActiveFacts(companyId, customerId, type = null) {
    const prisma = this._getPrisma();
    const where = {
      companyId,
      customerId,
      OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
    };
    if (type) where.type = type;
    return prisma.agenticMemoryFact.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Adds a new fact to the database.
   */
  async addFact(companyId, customerId, factData) {
    const prisma = this._getPrisma();
    return prisma.agenticMemoryFact.create({
      data: {
        companyId,
        customerId,
        type: factData.type || 'FACT',
        content: typeof factData.content === 'string' ? factData.content : JSON.stringify(factData.content),
        confidence: factData.confidence || 1.0,
        importance: factData.importance || 3,
        validFrom: factData.validFrom || new Date(),
        validTo: factData.validTo || null,
        metadata: factData.metadata ? JSON.stringify(factData.metadata) : null,
      },
    });
  }
}

module.exports = new TruthArbitratorService();
