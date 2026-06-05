/**
 * @module temporalReasoningService
 * @description Phase 8: Temporal Memory Layer - time-aware reasoning for
 * seasonal preferences, promotion expiry, and temporal fact filtering.
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

class TemporalReasoningService {
  constructor() {
    this.prisma = null;
  }

  _getPrisma() {
    if (!this.prisma) this.prisma = getSharedPrismaClient();
    return this.prisma;
  }

  /**
   * Returns only facts valid at the given reference date.
   */
  async getActiveFactsAtTime(companyId, customerId, referenceDate = new Date()) {
    const prisma = this._getPrisma();
    return prisma.agenticMemoryFact.findMany({
      where: {
        companyId,
        customerId,
        OR: [
          { validFrom: null, validTo: null },
          { validFrom: null, validTo: { gt: referenceDate } },
          { validFrom: { lte: referenceDate }, validTo: null },
          { validFrom: { lte: referenceDate }, validTo: { gt: referenceDate } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Checks if a fact has expired at the given time.
   */
  isFactExpired(fact, referenceDate = new Date()) {
    if (!fact.validTo) return false;
    return new Date(fact.validTo) <= referenceDate;
  }

  /**
   * Detects seasonal patterns in customer facts.
   */
  async detectSeasonalPattern(companyId, customerId, factType = 'PREFERENCE') {
    const prisma = this._getPrisma();
    const facts = await prisma.agenticMemoryFact.findMany({
      where: { companyId, customerId, type: factType },
      orderBy: { createdAt: 'asc' },
    });
    if (facts.length < 3) return { pattern: 'UNKNOWN', peakMonths: [], data: {} };

    const monthCounts = {};
    for (const f of facts) {
      const month = new Date(f.createdAt).getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    const months = Object.keys(monthCounts).map(Number);
    const values = Object.values(monthCounts);
    const max = Math.max(...values);
    const min = Math.min(...values);

    if (max - min >= 2 && months.length >= 2) {
      const peakMonths = months.filter(m => monthCounts[m] === max);
      return { pattern: 'SEASONAL', peakMonths, data: monthCounts };
    }
    return { pattern: 'CONSTANT', peakMonths: [], data: monthCounts };
  }

  /**
   * Expires all TEMPORAL facts past their validTo date.
   */
  async expirePromotionFacts(companyId, referenceDate = new Date()) {
    const prisma = this._getPrisma();
    const result = await prisma.agenticMemoryFact.updateMany({
      where: {
        companyId,
        type: 'TEMPORAL',
        validTo: { lte: referenceDate },
        metadata: { not: { contains: '"expired":true' } },
      },
      data: { metadata: JSON.stringify({ expired: true, expiredAt: referenceDate.toISOString() }) },
    });
    return result.count;
  }

  /**
   * Creates a temporal fact with validity window.
   */
  async createTemporalFact(companyId, customerId, content, validFrom, validTo, metadata = {}) {
    const prisma = this._getPrisma();
    return prisma.agenticMemoryFact.create({
      data: {
        companyId,
        customerId,
        type: 'TEMPORAL',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        confidence: 1.0,
        importance: 3,
        validFrom: validFrom || new Date(),
        validTo: validTo || null,
        metadata: JSON.stringify(metadata),
      },
    });
  }

  /**
   * Returns facts expiring within the next N days.
   */
  async getUpcomingExpirations(companyId, daysAhead = 7) {
    const prisma = this._getPrisma();
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return prisma.agenticMemoryFact.findMany({
      where: {
        companyId,
        validTo: { gt: now, lte: futureDate },
      },
      orderBy: { validTo: 'asc' },
    });
  }
}

module.exports = new TemporalReasoningService();
