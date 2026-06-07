/**
 * @module agentConversationBroker
 * @description Manages multi-turn conversation sessions between CEOAgent and
 * specialist agents. Enables the CEO to open a discussion, send messages,
 * await responses, and review full conversation history before synthesizing
 * a final answer for the merchant.
 */

const crypto = require('crypto');
const redisCacheService = require('../../services/redisCacheService');
const agentProvisioningService = require('./agentProvisioningService');
const aiRuntimeService = require('../aiRuntimeService');

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_TURNS = 8;

function _makeSessionId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function _key(sessionId) {
  return `agent:broker:${sessionId}`;
}

class AgentConversationBroker {
  constructor() {
    this._local = new Map();
  }

  /**
   * Opens a new conversation session between a parent agent (CEO) and a specialist.
   */
  async openSession({
    companyId,
    parentAgentId,
    specialistAgentId,
    topic,
    context = {},
    maxTurns = MAX_TURNS,
  }) {
    if (!companyId || !parentAgentId || !specialistAgentId) {
      throw new Error('COMPANY_ID_AND_AGENT_IDS_REQUIRED');
    }

    const sessionId = _makeSessionId();
    const session = {
      id: sessionId,
      companyId,
      parentAgentId,
      specialistAgentId,
      topic: topic || 'general',
      context,
      turns: [],
      status: 'OPEN',
      maxTurns,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this._save(session);
    return session;
  }

  /**
   * Sends a message from one agent to another within a session.
   * The recipient agent processes the message and a reply is generated.
   */
  async sendMessage(sessionId, { fromAgentId, content, role = 'user' }) {
    const session = await this._load(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.status !== 'OPEN') throw new Error(`SESSION_${session.status}`);
    if (session.turns.length >= session.maxTurns) {
      session.status = 'EXHAUSTED';
      await this._save(session);
      throw new Error('MAX_TURNS_REACHED');
    }

    const turn = {
      from: fromAgentId,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    session.turns.push(turn);
    session.updatedAt = new Date().toISOString();
    await this._save(session);

    return { sessionId, turnNumber: session.turns.length };
  }

  /**
   * Runs the specialist agent to generate a response to the latest message(s).
   * This is the key method that turns a one-shot tool into a conversation.
   */
  async awaitResponse(sessionId, { specialistAgentId, taskDescription, metadata = {} } = {}) {
    const session = await this._load(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const companyId = session.companyId;
    const agent = agentProvisioningService.getAgent(companyId, specialistAgentId);
    if (!agent) throw new Error('AGENT_NOT_FOUND');

    // Build a prompt that includes the full conversation history
    const conversationHistory = this._buildConversationPrompt(session);

    agent.setModelManager(aiRuntimeService.getModelManager());

    const result = await agent.processTask({
      title: session.topic,
      description: conversationHistory,
      metadata: {
        ...metadata,
        sessionId,
        conversationType: 'multi_agent_discussion',
      },
    });

    const replyContent = result?.result?.summary || result?.result?.reply || JSON.stringify(result);

    const responseTurn = {
      from: specialistAgentId,
      role: 'assistant',
      content: replyContent,
      timestamp: new Date().toISOString(),
    };
    session.turns.push(responseTurn);
    session.updatedAt = new Date().toISOString();
    await this._save(session);

    return {
      sessionId,
      reply: replyContent,
      turnNumber: session.turns.length,
      status: session.status,
    };
  }

  /**
   * CEOAgent uses this to send feedback and request a revision.
   */
  async requestRevision(sessionId, { feedback, fromAgentId }) {
    const session = await this._load(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const revisionTurn = {
      from: fromAgentId,
      role: 'user',
      content: `[Revision Request] ${feedback}`,
      timestamp: new Date().toISOString(),
    };
    session.turns.push(revisionTurn);
    session.updatedAt = new Date().toISOString();
    await this._save(session);

    return { sessionId, turnNumber: session.turns.length };
  }

  /**
   * Returns the full conversation history for a session.
   */
  async getHistory(sessionId) {
    const session = await this._load(sessionId);
    if (!session) return null;
    return {
      sessionId: session.id,
      topic: session.topic,
      status: session.status,
      turns: session.turns,
      context: session.context,
      finalSummary: session.finalSummary || null,
    };
  }

  /**
   * Closes a session. Optionally records a final summary.
   */
  async closeSession(sessionId, { finalSummary = null } = {}) {
    const session = await this._load(sessionId);
    if (!session) return false;

    session.status = 'CLOSED';
    session.closedAt = new Date().toISOString();
    if (finalSummary) {
      session.finalSummary = finalSummary;
    }
    await this._save(session);
    return true;
  }

  _reset() {
    this._local.clear();
  }

  /**
   * Lists all open sessions for a company.
   */
  async listOpenSessions(companyId) {
    // Note: This scans Redis keys. In production with many sessions,
    // consider indexing open sessions in a set.
    const allSessions = [];
    for (const [key, session] of this._local.entries()) {
      if (session.companyId === companyId && session.status === 'OPEN') {
        allSessions.push({
          id: session.id,
          topic: session.topic,
          parentAgentId: session.parentAgentId,
          specialistAgentId: session.specialistAgentId,
          turnCount: session.turns.length,
          updatedAt: session.updatedAt,
        });
      }
    }
    return allSessions;
  }

  // --- Private helpers ---

  async _save(session) {
    const key = _key(session.id);
    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._local.set(key, session);
  }

  async _load(sessionId) {
    const key = _key(sessionId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._local.get(key) || null;
    }
    if (session) {
      this._local.set(key, session);
    }
    return session;
  }

  _buildConversationPrompt(session) {
    const lines = [
      `Topic: ${session.topic}`,
      `Context: ${JSON.stringify(session.context)}`,
      '',
      'Conversation history:',
    ];

    for (const turn of session.turns) {
      const label = turn.role === 'assistant' ? `Agent (${turn.from})` : `CEO (${turn.from})`;
      lines.push(`${label}: ${turn.content}`);
    }

    lines.push('', 'Please respond to the latest message in your role as the specialist agent.');
    return lines.join('\n');
  }
}

module.exports = new AgentConversationBroker();
