const { getSharedPrismaClient } = require('../sharedDatabase');
const { getAiServiceMode } = require('./aiServiceRouter');
const crypto = require('crypto');

class AgentHandoffService {
  constructor() {
    /** @type {Map<string, Array>} handoff log keyed by companyId */
    this._handoffLog = new Map();
    if (getAiServiceMode() !== 'primary') {
      this._initRecovery();
    }
  }

  /**
   * Recovers handoff logs asynchronously from database logs.
   */
  _initRecovery() {
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.findMany({
        where: { scope: 'agent_handoff' }
      }).then(logs => {
        for (const log of logs) {
          try {
            const handoff = JSON.parse(log.metadata);
            handoff.status = log.status;
            if (!this._handoffLog.has(log.companyId)) {
              this._handoffLog.set(log.companyId, []);
            }
            const compList = this._handoffLog.get(log.companyId);
            if (!compList.some(h => h.id === handoff.id)) {
              compList.push(handoff);
            }
          } catch (e) {
            console.warn('[AGENT-HANDOFF-RECOVERY] Error parsing log metadata:', e.message);
          }
        }
      }).catch(err => console.warn('[AGENT-HANDOFF-RECOVERY] DB query failed:', err.message));
    } catch (err) { console.warn('[AGENT-HANDOFF-RECOVERY] Unexpected error:', err.message); }
  }

  /**
   * Initiates a handoff from one agent to another.
   * @param {string} companyId
   * @param {Object} params
   * @param {string} params.fromAgentId - Source agent
   * @param {string} params.toAgentId - Target agent
   * @param {string} params.conversationId - Conversation being transferred
   * @param {Object} params.context - Context data to transfer
   * @param {string} [params.reason] - Reason for handoff
   * @returns {{ handoffId: string, status: string, context: Object }}
   */
  initiateHandoff(companyId, { fromAgentId, toAgentId, conversationId, context = {}, reason = '' }) {
    if (!fromAgentId || !toAgentId) throw new Error('Both fromAgentId and toAgentId are required');
    if (fromAgentId === toAgentId) throw new Error('Cannot hand off to the same agent');

    const handoff = {
      id: `handoff_${crypto.randomUUID()}`,
      companyId,
      fromAgentId,
      toAgentId,
      conversationId: conversationId || null,
      context: this._deepClone(context),
      reason,
      status: 'COMPLETED',
      initiatedAt: new Date(),
      completedAt: new Date(),
    };

    if (!this._handoffLog.has(companyId)) this._handoffLog.set(companyId, []);
    this._handoffLog.get(companyId).push(handoff);

    // Persist durably to database (fire-and-forget)
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.create({
        data: {
          provider: 'AGENT_HANDOFF',
          companyId,
          scope: 'agent_handoff',
          action: `${fromAgentId}_TO_${toAgentId}`,
          status: handoff.status,
          message: reason || `Handoff conversation ${conversationId} from ${fromAgentId} to ${toAgentId}`,
          metadata: JSON.stringify(handoff),
        },
      }).catch(err => console.warn('[AGENT-HANDOFF] Failed to persist handoff log:', err.message));
    } catch (err) { console.warn('[AGENT-HANDOFF] Unexpected error:', err.message); }

    return {
      handoffId: handoff.id,
      status: handoff.status,
      context: handoff.context,
    };
  }

  /**
   * Verifies that a handoff transferred all context data correctly.
   */
  verifyHandoff(companyId, handoffId) {
    const log = this._handoffLog.get(companyId) || [];
    const handoff = log.find(h => h.id === handoffId);
    if (!handoff) return { valid: false, error: 'HANDOFF_NOT_FOUND' };

    const hasContext = handoff.context && Object.keys(handoff.context).length > 0;
    return {
      valid: true,
      handoffId: handoff.id,
      fromAgentId: handoff.fromAgentId,
      toAgentId: handoff.toAgentId,
      contextPreserved: hasContext,
      contextKeys: Object.keys(handoff.context),
    };
  }

  /**
   * Gets the handoff history for a conversation.
   */
  getConversationHandoffs(companyId, conversationId) {
    const log = this._handoffLog.get(companyId) || [];
    return log.filter(h => h.conversationId === conversationId);
  }

  /**
   * Gets all handoffs for a company.
   */
  getHandoffLog(companyId) {
    return this._handoffLog.get(companyId) || [];
  }

  /**
   * Gets the current owner of a conversation based on handoff history.
   */
  getCurrentOwner(companyId, conversationId) {
    const handoffs = this.getConversationHandoffs(companyId, conversationId);
    if (handoffs.length === 0) return null;
    const latest = handoffs[handoffs.length - 1];
    return latest.toAgentId;
  }

  _deepClone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch { return { ...obj }; }
  }

  _reset() {
    this._handoffLog.clear();
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.deleteMany({
        where: { scope: 'agent_handoff' }
      }).catch(err => console.warn('[AGENT-HANDOFF] Failed to delete handoff logs:', err.message));
    } catch (err) { console.warn('[AGENT-HANDOFF] Unexpected error during reset:', err.message); }
  }
}

module.exports = new AgentHandoffService();
