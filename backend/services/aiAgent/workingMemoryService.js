/**
 * @module workingMemoryService
 * @description Phase 5: Session Working Memory - sliding window management
 * for conversation context to prevent token bloat with Redis-backed durability.
 */

const redisCacheService = require('../redisCacheService');

const MAX_WINDOW_SIZE = 15;
const SESSION_TTL_SECONDS = 2 * 60 * 60; // 2 hours

class WorkingMemoryService {
  constructor() {
    /** @type {Map<string, Object>} Local fallback cache */
    this._sessions = new Map();
  }

  _key(companyId, conversationId) { 
    return `agent:session:${companyId}:${conversationId}`; 
  }

  /**
   * Creates or resets a session.
   */
  async initSession(companyId, conversationId) {
    const key = this._key(companyId, conversationId);
    const session = {
      companyId, 
      conversationId,
      messages: [],
      summary: null,
      cart: {},
      queriedProducts: [],
      lastShownProductIds: [],
      activeSearchFilters: {},
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
    };
    
    // Save to Redis
    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    // Save to local memory fallback
    this._sessions.set(key, session);
    
    return session;
  }

  /**
   * Adds a message to the session. Triggers compression if window exceeded.
   */
  async addMessage(companyId, conversationId, message) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) {
      session = await this.initSession(companyId, conversationId);
    }

    // Ensure array structures
    if (!session.messages) session.messages = [];
    if (!session.cart) session.cart = {};
    if (!session.queriedProducts) session.queriedProducts = [];
    if (!session.lastShownProductIds) session.lastShownProductIds = [];
    if (!session.activeSearchFilters) session.activeSearchFilters = {};

    const nextMessage = {
      role: message.role || 'user',
      content: message.content || message,
      timestamp: new Date().toISOString(),
    };
    if (message.modelSelection && typeof message.modelSelection === 'object') {
      nextMessage.modelSelection = message.modelSelection;
    }
    if (message.intentTrace && typeof message.intentTrace === 'object') {
      nextMessage.intentTrace = message.intentTrace;
    }
    session.messages.push(nextMessage);
    session.lastAccess = new Date().toISOString();

    if (session.messages.length > MAX_WINDOW_SIZE) {
      this._compressOldMessages(session);
    }

    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._sessions.set(key, session);
    return session;
  }

  /**
   * Compresses older messages into a summary string.
   */
  _compressOldMessages(session) {
    const overflow = session.messages.length - MAX_WINDOW_SIZE;
    const oldMessages = session.messages.splice(0, overflow);

    const oldSummaryText = session.summary ? session.summary + ' | ' : '';
    const compressed = oldMessages.map(m => `[${m.role}]: ${typeof m.content === 'string' ? m.content.substring(0, 80) : ''}`).join('; ');
    session.summary = oldSummaryText + `Compressed ${oldMessages.length} msgs: ${compressed}`;
  }

  /**
   * Returns the context window for a conversation.
   */
  async getContext(companyId, conversationId) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) return null;
    
    session.lastAccess = new Date().toISOString();
    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._sessions.set(key, session);
    
    return {
      summary: session.summary,
      recentMessages: session.messages || [],
      cart: session.cart || {},
      queriedProducts: session.queriedProducts || [],
      lastShownProductIds: session.lastShownProductIds || [],
      activeSearchFilters: session.activeSearchFilters || {},
    };
  }

  async updateCart(companyId, conversationId, cartData) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) return null;
    
    session.cart = { ...(session.cart || {}), ...cartData };
    session.lastAccess = new Date().toISOString();
    
    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._sessions.set(key, session);
    
    return session.cart;
  }

  async addQueriedProduct(companyId, conversationId, product) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) return null;
    
    if (!session.queriedProducts) session.queriedProducts = [];
    session.queriedProducts.push(product);
    session.lastAccess = new Date().toISOString();
    
    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._sessions.set(key, session);
    
    return session.queriedProducts;
  }

  /**
   * Update the search context: last shown product IDs and active filters.
   * Merges filters from successive turns unless explicitly cleared.
   */
  async updateSearchContext(companyId, conversationId, { productIds, filters } = {}) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) return null;

    if (Array.isArray(productIds) && productIds.length > 0) {
      session.lastShownProductIds = productIds.slice(0, 20);
    }

    if (filters && typeof filters === 'object') {
      // Merge new filters into existing (successive refinement)
      const current = session.activeSearchFilters || {};
      session.activeSearchFilters = { ...current };
      for (const [k, v] of Object.entries(filters)) {
        if (v === null || v === undefined || v === '') {
          delete session.activeSearchFilters[k];
        } else {
          session.activeSearchFilters[k] = v;
        }
      }
    }

    session.lastAccess = new Date().toISOString();
    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._sessions.set(key, session);

    return {
      lastShownProductIds: session.lastShownProductIds,
      activeSearchFilters: session.activeSearchFilters,
    };
  }

  /**
   * Clear search context (called after checkout/order completion).
   */
  async clearSearchContext(companyId, conversationId) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) return null;

    session.lastShownProductIds = [];
    session.activeSearchFilters = {};
    session.lastAccess = new Date().toISOString();

    await redisCacheService.set(key, session, SESSION_TTL_SECONDS);
    this._sessions.set(key, session);
    return true;
  }

  async clearSession(companyId, conversationId) {
    const key = this._key(companyId, conversationId);
    this._sessions.delete(key);
    await redisCacheService.del(key);
    return true;
  }

  async getSessionStats(companyId, conversationId) {
    const key = this._key(companyId, conversationId);
    let session = await redisCacheService.get(key);
    if (!session) {
      session = this._sessions.get(key);
    }
    if (!session) return null;
    
    const createdAtTime = new Date(session.createdAt).getTime();
    return {
      messageCount: (session.messages || []).length,
      hasSummary: !!session.summary,
      cartItemCount: Object.keys(session.cart || {}).length,
      queriedProductCount: (session.queriedProducts || []).length,
      ageMs: Date.now() - createdAtTime,
    };
  }

  /**
   * Removes sessions older than SESSION_TTL_SECONDS from the local Map fallback.
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    const ttlMs = SESSION_TTL_SECONDS * 1000;
    for (const [key, session] of this._sessions) {
      const lastAccessTime = new Date(session.lastAccess).getTime();
      if (now - lastAccessTime > ttlMs) {
        this._sessions.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  /** Returns total active sessions count in local fallback cache */
  getActiveSessionCount() { 
    return this._sessions.size; 
  }
}

module.exports = new WorkingMemoryService();
