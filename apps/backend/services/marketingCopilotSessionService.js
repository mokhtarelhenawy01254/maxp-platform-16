/**
 * Marketing Copilot Session Service
 * 
 * Manages Cloud Database persistence for Marketing AI Studio / Media Buyer Copilot.
 * Integrates directly with FacebookAdsAiChatSession & FacebookAdsAiChatMessage models
 * in PostgreSQL to provide instant cross-device synchronization (office, home, mobile).
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

let _tablesEnsured = false;

class MarketingCopilotSessionService {
  constructor() {
    this._prisma = null;
  }

  get prisma() {
    if (!this._prisma) {
      this._prisma = getSharedPrismaClient();
    }
    return this._prisma;
  }

  /**
   * Ensure the tables and indexes exist in PostgreSQL (safe, idempotent guard).
   */
  async ensureTables() {
    if (_tablesEnsured) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.facebook_ads_ai_chat_sessions (
            id TEXT NOT NULL PRIMARY KEY,
            "companyId" TEXT NOT NULL,
            "userId" TEXT,
            title TEXT DEFAULT 'جلسة جديدة',
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            context JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS facebook_ads_ai_chat_sessions_companyId_updatedAt_idx
            ON public.facebook_ads_ai_chat_sessions ("companyId", "updatedAt" DESC);
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS facebook_ads_ai_chat_sessions_companyId_status_updatedAt_idx
            ON public.facebook_ads_ai_chat_sessions ("companyId", status, "updatedAt" DESC);
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.facebook_ads_ai_chat_messages (
            id TEXT NOT NULL PRIMARY KEY,
            "sessionId" TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT,
            "toolCalls" JSONB,
            "toolResults" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS facebook_ads_ai_chat_messages_sessionId_createdAt_idx
            ON public.facebook_ads_ai_chat_messages ("sessionId", "createdAt" ASC);
      `);

      _tablesEnsured = true;
    } catch (err) {
      console.warn('⚠️ [MarketingCopilotSessionService] ensureTables warning:', err.message);
    }
  }

  /**
   * List all active sessions for a company with their messages.
   */
  async listSessions(companyId, limit = 100) {
    if (!companyId) return { sessions: [], totalCount: 0 };
    await this.ensureTables();

    try {
      // 1. Get real total non-deleted sessions count
      const countResult = await this.prisma.$queryRawUnsafe(`
        SELECT count(*)::int as total
        FROM public.facebook_ads_ai_chat_sessions
        WHERE "companyId" = $1 AND status != 'DELETED'
      `, companyId);
      const totalCount = countResult?.[0]?.total || 0;

      // 2. Fetch recent sessions
      const sessions = await this.prisma.$queryRawUnsafe(`
        SELECT id, "companyId", "userId", title, status, context, "createdAt", "updatedAt"
        FROM public.facebook_ads_ai_chat_sessions
        WHERE "companyId" = $1 AND status != 'DELETED'
        ORDER BY "updatedAt" DESC
        LIMIT $2
      `, companyId, limit);

      if (!sessions || sessions.length === 0) {
        return { sessions: [], totalCount };
      }

      const sessionIds = sessions.map(s => s.id);
      const messages = await this.prisma.$queryRawUnsafe(`
        SELECT id, "sessionId", role, content, "toolCalls", "toolResults", "createdAt"
        FROM public.facebook_ads_ai_chat_messages
        WHERE "sessionId" = ANY($1::text[])
        ORDER BY "createdAt" ASC
      `, sessionIds);

      // Group messages by sessionId
      const messagesBySession = {};
      for (const msg of messages) {
        if (!messagesBySession[msg.sessionId]) {
          messagesBySession[msg.sessionId] = [];
        }
        const sender = msg.role === 'user' ? 'user' : 'agent';
        messagesBySession[msg.sessionId].push({
          id: msg.id,
          sender,
          text: msg.content || '',
          toolCalls: msg.toolCalls || undefined,
          timestamp: msg.createdAt,
        });
      }

      const formattedSessions = sessions.map(s => ({
        id: s.id,
        title: s.title || 'جلسة جديدة',
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messages: messagesBySession[s.id] || [],
        context: s.context || {},
      }));

      return {
        sessions: formattedSessions,
        totalCount,
      };
    } catch (err) {
      console.error('❌ [MarketingCopilotSessionService] listSessions error:', err);
      return { sessions: [], totalCount: 0 };
    }
  }

  /**
   * Get single session with its full message history.
   */
  async getSession(companyId, sessionId) {
    if (!companyId || !sessionId) return null;
    await this.ensureTables();

    try {
      const sessions = await this.prisma.$queryRawUnsafe(`
        SELECT id, "companyId", "userId", title, status, context, "createdAt", "updatedAt"
        FROM public.facebook_ads_ai_chat_sessions
        WHERE "companyId" = $1 AND id = $2 AND status != 'DELETED'
        LIMIT 1
      `, companyId, sessionId);

      if (!sessions || sessions.length === 0) return null;
      const s = sessions[0];

      const messages = await this.prisma.$queryRawUnsafe(`
        SELECT id, "sessionId", role, content, "toolCalls", "toolResults", "createdAt"
        FROM public.facebook_ads_ai_chat_messages
        WHERE "sessionId" = $1
        ORDER BY "createdAt" ASC
      `, sessionId);

      return {
        id: s.id,
        title: s.title || 'جلسة جديدة',
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messages: (messages || []).map(m => ({
          id: m.id,
          sender: m.role === 'user' ? 'user' : 'agent',
          text: m.content || '',
          toolCalls: m.toolCalls || undefined,
          timestamp: m.createdAt,
        })),
        context: s.context || {},
      };
    } catch (err) {
      console.error('❌ [MarketingCopilotSessionService] getSession error:', err);
      return null;
    }
  }

  /**
   * Create or update a session with its messages.
   * Useful for batch saving or migrating from localStorage.
   */
  async saveSession(companyId, userId = null, sessionData = {}) {
    if (!companyId) throw new Error('companyId is required');
    await this.ensureTables();

    const { id, title, messages = [], context = {} } = sessionData;
    const sessionId = id || `mb_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'جلسة جديدة';

    try {
      // 1. Upsert session header
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.facebook_ads_ai_chat_sessions (id, "companyId", "userId", title, status, context, "updatedAt")
        VALUES ($1, $2, $3, $4, 'ACTIVE', $5::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            context = EXCLUDED.context,
            "updatedAt" = CURRENT_TIMESTAMP
      `, sessionId, companyId, userId, safeTitle, JSON.stringify(context));

      // 2. Insert messages if provided
      if (Array.isArray(messages) && messages.length > 0) {
        for (const msg of messages) {
          const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const role = msg.sender === 'user' ? 'user' : 'agent';
          const content = msg.text || '';
          const toolCalls = msg.toolCalls ? JSON.stringify(msg.toolCalls) : null;
          const createdAt = msg.timestamp ? new Date(msg.timestamp) : new Date();

          await this.prisma.$executeRawUnsafe(`
            INSERT INTO public.facebook_ads_ai_chat_messages (id, "sessionId", role, content, "toolCalls", "createdAt")
            VALUES ($1, $2, $3, $4, $5::jsonb, $6)
            ON CONFLICT (id) DO UPDATE
            SET content = EXCLUDED.content,
                "toolCalls" = EXCLUDED."toolCalls"
          `, msgId, sessionId, role, content, toolCalls, createdAt);
        }
      }

      return await this.getSession(companyId, sessionId);
    } catch (err) {
      console.error('❌ [MarketingCopilotSessionService] saveSession error:', err);
      throw err;
    }
  }

  /**
   * Append a single message to a session and auto-update timestamp and title.
   */
  async appendMessage(companyId, sessionId, msg = {}) {
    if (!companyId || !sessionId) throw new Error('companyId and sessionId are required');
    await this.ensureTables();

    try {
      // Ensure session exists
      const existing = await this.prisma.$queryRawUnsafe(`
        SELECT id, title FROM public.facebook_ads_ai_chat_sessions
        WHERE "companyId" = $1 AND id = $2
        LIMIT 1
      `, companyId, sessionId);

      let currentTitle = existing && existing[0]?.title ? existing[0].title : 'جلسة جديدة';
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.facebook_ads_ai_chat_sessions (id, "companyId", title, status, "updatedAt")
        VALUES ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP
      `, sessionId, companyId, currentTitle);

      const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const role = msg.sender === 'user' ? 'user' : 'agent';
      const content = msg.text || '';
      const toolCalls = msg.toolCalls ? JSON.stringify(msg.toolCalls) : null;
      const createdAt = msg.timestamp ? new Date(msg.timestamp) : new Date();

      // Auto-title from first user message if generic
      if (role === 'user' && (currentTitle === 'جلسة جديدة' || currentTitle === 'محادثة جديدة')) {
        const clean = content.replace(/\n+/g, ' ').trim();
        if (clean.length > 0) {
          currentTitle = clean.length > 35 ? `${clean.slice(0, 35)}...` : clean;
        }
      }

      // Insert message
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.facebook_ads_ai_chat_messages (id, "sessionId", role, content, "toolCalls", "createdAt")
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        ON CONFLICT (id) DO UPDATE
        SET content = EXCLUDED.content,
            "toolCalls" = EXCLUDED."toolCalls"
      `, msgId, sessionId, role, content, toolCalls, createdAt);

      // Update session timestamp & title
      await this.prisma.$executeRawUnsafe(`
        UPDATE public.facebook_ads_ai_chat_sessions
        SET title = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2 AND "companyId" = $3
      `, currentTitle, sessionId, companyId);

      return {
        id: msgId,
        sessionId,
        sender: role,
        text: content,
        toolCalls: msg.toolCalls,
        timestamp: createdAt,
      };
    } catch (err) {
      console.error('❌ [MarketingCopilotSessionService] appendMessage error:', err);
      throw err;
    }
  }

  /**
   * Delete a session and its messages.
   */
  async deleteSession(companyId, sessionId) {
    if (!companyId || !sessionId) return false;
    await this.ensureTables();

    try {
      await this.prisma.$executeRawUnsafe(`
        DELETE FROM public.facebook_ads_ai_chat_messages WHERE "sessionId" = $1
      `, sessionId);

      const res = await this.prisma.$executeRawUnsafe(`
        DELETE FROM public.facebook_ads_ai_chat_sessions WHERE id = $1 AND "companyId" = $2
      `, sessionId, companyId);

      return true;
    } catch (err) {
      console.error('❌ [MarketingCopilotSessionService] deleteSession error:', err);
      return false;
    }
  }

  /**
   * Merge updates into the session's context JSONB (e.g. activeProduct entity).
   */
  async updateContext(companyId, sessionId, newContext = {}) {
    if (!companyId || !sessionId) return;
    await this.ensureTables();
    try {
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.facebook_ads_ai_chat_sessions (id, "companyId", title, status, context, "updatedAt")
        VALUES ($1, $2, 'جلسة جديدة', 'ACTIVE', $3::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE
        SET context = coalesce(public.facebook_ads_ai_chat_sessions.context, '{}'::jsonb) || EXCLUDED.context,
            "updatedAt" = CURRENT_TIMESTAMP
      `, sessionId, companyId, JSON.stringify(newContext));
    } catch (err) {
      console.warn('⚠️ [MarketingCopilotSessionService] updateContext error:', err.message);
    }
  }

  /**
   * Hermes-Grade Session Rewind: Rolls back the last turn (user + assistant) from database.
   */
  async rewindSession(companyId, sessionId) {
    if (!companyId || !sessionId) throw new Error('companyId and sessionId are required');
    await this.ensureTables();

    try {
      const lastMessages = await this.prisma.$queryRawUnsafe(`
        SELECT id, role, content FROM public.facebook_ads_ai_chat_messages
        WHERE "sessionId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 2
      `, sessionId);

      if (!lastMessages || lastMessages.length === 0) {
        return { success: false, message: 'لا توجد رسائل سابقة للتراجع عنها في هذه الجلسة' };
      }

      for (const m of lastMessages) {
        await this.prisma.$executeRawUnsafe(`
          DELETE FROM public.facebook_ads_ai_chat_messages
          WHERE id = $1
        `, m.id);
      }

      await this.prisma.$executeRawUnsafe(`
        UPDATE public.facebook_ads_ai_chat_sessions
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $1 AND "companyId" = $2
      `, sessionId, companyId);

      const updated = await this.getSession(companyId, sessionId);
      return {
        success: true,
        undoneCount: lastMessages.length,
        undoneMessages: lastMessages,
        session: updated,
        message: 'تم التراجع عن آخر خطوة بنجاح واستعادة حالة المحادثة السابقة ↩️',
      };
    } catch (err) {
      console.error('❌ [MarketingCopilotSessionService] rewindSession error:', err);
      throw err;
    }
  }
}

module.exports = new MarketingCopilotSessionService();
