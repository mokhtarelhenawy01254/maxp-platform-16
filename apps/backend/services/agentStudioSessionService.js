/**
 * Agent Studio Session Service
 * 
 * Manages Cloud Database persistence for multi-domain Agent Studios (Inventory, Marketing, Orders, etc.).
 * Persists chat sessions and messages in PostgreSQL for instant cross-device synchronization.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

let _tablesEnsured = false;

class AgentStudioSessionService {
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
   * Ensure tables exist for general agent studio sessions (safe, idempotent).
   */
  async ensureTables() {
    if (_tablesEnsured) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.agent_studio_sessions (
            id TEXT NOT NULL PRIMARY KEY,
            "companyId" TEXT NOT NULL,
            domain TEXT NOT NULL DEFAULT 'inventory',
            "userId" TEXT,
            title TEXT DEFAULT 'جلسة جديدة',
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            context JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS agent_studio_sessions_company_domain_idx
            ON public.agent_studio_sessions ("companyId", domain, "updatedAt" DESC);
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.agent_studio_messages (
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
        CREATE INDEX IF NOT EXISTS agent_studio_messages_session_idx
            ON public.agent_studio_messages ("sessionId", "createdAt" ASC);
      `);

      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE public.agent_studio_messages ADD COLUMN IF NOT EXISTS images JSONB;
      `);

      _tablesEnsured = true;
    } catch (err) {
      console.warn('⚠️ [AgentStudioSessionService] ensureTables warning:', err.message);
    }
  }

  /**
   * List sessions for a company and domain with their messages.
   */
  async listSessions(companyId, domain = 'inventory', limit = 50) {
    if (!companyId) return [];
    await this.ensureTables();

    try {
      const sessions = await this.prisma.$queryRawUnsafe(`
        SELECT id, "companyId", domain, "userId", title, status, context, "createdAt", "updatedAt"
        FROM public.agent_studio_sessions
        WHERE "companyId" = $1 AND domain = $2 AND status != 'DELETED'
        ORDER BY "updatedAt" DESC
        LIMIT $3
      `, companyId, domain, limit);

      if (!sessions || sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map(s => s.id);
      const messages = await this.prisma.$queryRawUnsafe(`
        SELECT id, "sessionId", role, content, images, "toolCalls", "toolResults", "createdAt"
        FROM public.agent_studio_messages
        WHERE "sessionId" = ANY($1::text[])
        ORDER BY "createdAt" ASC
      `, sessionIds);

      const msgMap = {};
      for (const m of (messages || [])) {
        if (!msgMap[m.sessionId]) msgMap[m.sessionId] = [];
        const isAssistant = m.role === 'assistant' || m.role === 'agent';
        msgMap[m.sessionId].push({
          id: m.id,
          role: isAssistant ? 'assistant' : 'user',
          sender: isAssistant ? 'agent' : 'user',
          content: m.content || '',
          text: m.content || '',
          images: Array.isArray(m.images) ? m.images : undefined,
          toolCalls: m.toolCalls || undefined,
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        });
      }

      return sessions.map(s => ({
        id: s.id,
        title: s.title || 'جلسة جديدة',
        domain: s.domain,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
        context: s.context || {},
        messages: msgMap[s.id] || [],
      }));
    } catch (err) {
      console.error('[AgentStudioSessionService] listSessions error:', err.message);
      return [];
    }
  }

  /**
   * Get single session by ID.
   */
  async getSession(companyId, sessionId) {
    if (!companyId || !sessionId) return null;
    await this.ensureTables();

    try {
      const rows = await this.prisma.$queryRawUnsafe(`
        SELECT id, "companyId", domain, "userId", title, status, context, "createdAt", "updatedAt"
        FROM public.agent_studio_sessions
        WHERE "companyId" = $1 AND id = $2 AND status != 'DELETED'
        LIMIT 1
      `, companyId, sessionId);

      if (!rows || rows.length === 0) return null;
      const s = rows[0];

      const messages = await this.prisma.$queryRawUnsafe(`
        SELECT id, role, content, images, "toolCalls", "toolResults", "createdAt"
        FROM public.agent_studio_messages
        WHERE "sessionId" = $1
        ORDER BY "createdAt" ASC
      `, sessionId);

      return {
        id: s.id,
        title: s.title || 'جلسة جديدة',
        domain: s.domain,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
        context: s.context || {},
        messages: (messages || []).map(m => {
          const isAssistant = m.role === 'assistant' || m.role === 'agent';
          return {
            id: m.id,
            role: isAssistant ? 'assistant' : 'user',
            sender: isAssistant ? 'agent' : 'user',
            content: m.content || '',
            text: m.content || '',
            images: Array.isArray(m.images) ? m.images : undefined,
            toolCalls: m.toolCalls || undefined,
            timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          };
        }),
      };
    } catch (err) {
      console.error('[AgentStudioSessionService] getSession error:', err.message);
      return null;
    }
  }

  /**
   * Save or upsert a session and its messages.
   */
  async saveSession(companyId, userId, domain = 'inventory', sessionData) {
    if (!companyId || !sessionData?.id) return null;
    await this.ensureTables();

    const { id, title, messages, context } = sessionData;
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : 'جلسة جديدة';
    const now = new Date();

    try {
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.agent_studio_sessions (id, "companyId", domain, "userId", title, status, context, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6::jsonb, $7, $7)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            context = COALESCE(EXCLUDED.context, agent_studio_sessions.context),
            "updatedAt" = EXCLUDED."updatedAt"
      `, id, companyId, domain, userId || null, safeTitle, JSON.stringify(context || {}), now);

      if (Array.isArray(messages) && messages.length > 0) {
        for (const msg of messages) {
          const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const role = msg.sender === 'user' ? 'user' : 'assistant';
          const content = msg.text || '';
          const toolCallsJson = msg.toolCalls ? JSON.stringify(msg.toolCalls) : null;
          const imagesJson = msg.images && Array.isArray(msg.images) && msg.images.length > 0 ? JSON.stringify(msg.images) : null;
          const msgCreated = msg.timestamp ? new Date(msg.timestamp) : now;

          await this.prisma.$executeRawUnsafe(`
            INSERT INTO public.agent_studio_messages (id, "sessionId", role, content, "toolCalls", images, "createdAt")
            VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                "toolCalls" = EXCLUDED."toolCalls",
                images = COALESCE(EXCLUDED.images, agent_studio_messages.images)
          `, msgId, id, role, content, toolCallsJson, imagesJson, msgCreated);
        }
      }

      return { id, title: safeTitle, domain, updatedAt: now.toISOString() };
    } catch (err) {
      console.error('[AgentStudioSessionService] saveSession error:', err.message);
      return null;
    }
  }

  /**
   * Append a single message directly to a session.
   */
  async appendMessage(companyId, sessionId, messageData, domain = 'inventory') {
    if (!companyId || !sessionId || !messageData) return false;
    await this.ensureTables();

    const now = new Date();
    const msgId = messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const role = messageData.sender === 'user' || messageData.role === 'user' ? 'user' : 'assistant';
    const content = messageData.text || messageData.content || '';
    const toolCallsJson = messageData.toolCalls ? JSON.stringify(messageData.toolCalls) : null;
    const rawImages = messageData.images || messageData.attachments;
    const imagesJson = rawImages && Array.isArray(rawImages) && rawImages.length > 0 ? JSON.stringify(rawImages) : null;

    try {
      // Ensure parent session exists
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.agent_studio_sessions (id, "companyId", domain, title, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'جلسة جديدة', 'ACTIVE', $4, $4)
        ON CONFLICT (id) DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt"
      `, sessionId, companyId, domain, now);

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.agent_studio_messages (id, "sessionId", role, content, "toolCalls", images, "createdAt")
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
        ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            images = COALESCE(EXCLUDED.images, agent_studio_messages.images)
      `, msgId, sessionId, role, content, toolCallsJson, imagesJson, now);

      return true;
    } catch (err) {
      console.warn('[AgentStudioSessionService] appendMessage warning:', err.message);
      return false;
    }
  }

  /**
   * Soft-delete a session.
   */
  async deleteSession(companyId, sessionId) {
    if (!companyId || !sessionId) return false;
    await this.ensureTables();

    try {
      await this.prisma.$executeRawUnsafe(`
        UPDATE public.agent_studio_sessions
        SET status = 'DELETED', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" = $1 AND id = $2
      `, companyId, sessionId);
      return true;
    } catch (err) {
      console.error('[AgentStudioSessionService] deleteSession error:', err.message);
      return false;
    }
  }

  /**
   * SOTA 2026 Session State Rewind: Rolls back the last turn (user + assistant) from database.
   */
  async rewindSession(companyId, sessionId) {
    if (!companyId || !sessionId) throw new Error('companyId and sessionId are required');
    await this.ensureTables();

    try {
      const lastMessages = await this.prisma.$queryRawUnsafe(`
        SELECT id, role, content FROM public.agent_studio_messages
        WHERE "sessionId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 2
      `, sessionId);

      if (!lastMessages || lastMessages.length === 0) {
        return { success: false, message: 'لا توجد رسائل سابقة للتراجع عنها في هذه الجلسة' };
      }

      for (const m of lastMessages) {
        await this.prisma.$executeRawUnsafe(`
          DELETE FROM public.agent_studio_messages
          WHERE id = $1
        `, m.id);
      }

      await this.prisma.$executeRawUnsafe(`
        UPDATE public.agent_studio_sessions
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $1 AND "companyId" = $2
      `, sessionId, companyId);

      const remainingMessages = await this.prisma.$queryRawUnsafe(`
        SELECT id, "sessionId", role, content, images, "toolCalls", "createdAt"
        FROM public.agent_studio_messages
        WHERE "sessionId" = $1
        ORDER BY "createdAt" ASC
      `, sessionId);

      const formatted = (remainingMessages || []).map(m => {
        const isAssistant = m.role === 'assistant' || m.role === 'agent';
        return {
          id: m.id,
          role: isAssistant ? 'assistant' : 'user',
          sender: isAssistant ? 'agent' : 'user',
          content: m.content || '',
          text: m.content || '',
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          toolCalls: m.toolCalls || [],
        };
      });

      return {
        success: true,
        undoneCount: lastMessages.length,
        undoneMessages: lastMessages,
        messages: formatted,
        message: 'تم التراجع عن آخر خطوة بنجاح واستعادة حالة المحادثة السابقة ↩️',
      };
    } catch (err) {
      console.error('❌ [AgentStudioSessionService] rewindSession error:', err);
      throw err;
    }
  }
}

module.exports = new AgentStudioSessionService();

