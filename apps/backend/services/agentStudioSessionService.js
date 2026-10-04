/**
 * Agent Studio Session Service
 * 
 * Manages Cloud Database persistence for multi-domain Agent Studios (Inventory, Marketing, Orders, etc.).
 * Persists chat sessions and messages in PostgreSQL for instant cross-device synchronization.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

let _tablesEnsured = false;
let _ensuringPromise = null;

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
   * Safe execution wrapper with automatic self-healing retry on missing relations (42P01).
   */
  async _executeWithRetry(operation) {
    await this.ensureTables();
    try {
      return await operation();
    } catch (err) {
      const isRelationMissing =
        err?.code === '42P01' ||
        err?.meta?.code === '42P01' ||
        (typeof err?.message === 'string' && (err.message.includes('does not exist') || err.message.includes('42P01')));

      if (isRelationMissing) {
        console.warn('⚠️ [AgentStudioSessionService] Relation missing, re-ensuring tables and retrying query...');
        _tablesEnsured = false;
        await this.ensureTables();
        return await operation();
      }
      throw err;
    }
  }

  /**
   * Ensure tables exist for general agent studio sessions (safe, idempotent, concurrency-locked).
   */
  async ensureTables() {
    if (_tablesEnsured) return;
    if (_ensuringPromise) return _ensuringPromise;

    _ensuringPromise = (async () => {
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

        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE public.agent_studio_messages ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE;
        `);

        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE public.agent_studio_messages ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
        `);

        _tablesEnsured = true;
      } catch (err) {
        if (err.message && (err.message.includes('already exists') || err.message.includes('23505'))) {
          _tablesEnsured = true;
        } else {
          _tablesEnsured = false;
          console.error('❌ [AgentStudioSessionService] ensureTables error:', err.message);
          throw err;
        }
      } finally {
        _ensuringPromise = null;
      }
    })();

    return _ensuringPromise;
  }

  /**
   * List sessions for a company and domain with their active messages.
   */
  async listSessions(companyId, domain = 'inventory', limit = 50) {
    if (!companyId) return [];

    return this._executeWithRetry(async () => {
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
          AND ("isDeleted" IS FALSE OR "isDeleted" IS NULL)
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
    });
  }

  /**
   * Get single session by ID, optionally validating domain.
   */
  async getSession(companyId, sessionId, domain = null) {
    if (!companyId || !sessionId) return null;

    return this._executeWithRetry(async () => {
      let rows;
      if (domain) {
        rows = await this.prisma.$queryRawUnsafe(`
          SELECT id, "companyId", domain, "userId", title, status, context, "createdAt", "updatedAt"
          FROM public.agent_studio_sessions
          WHERE "companyId" = $1 AND id = $2 AND domain = $3 AND status != 'DELETED'
          LIMIT 1
        `, companyId, sessionId, domain);
      } else {
        rows = await this.prisma.$queryRawUnsafe(`
          SELECT id, "companyId", domain, "userId", title, status, context, "createdAt", "updatedAt"
          FROM public.agent_studio_sessions
          WHERE "companyId" = $1 AND id = $2 AND status != 'DELETED'
          LIMIT 1
        `, companyId, sessionId);
      }

      if (!rows || rows.length === 0) return null;
      const s = rows[0];

      const messages = await this.prisma.$queryRawUnsafe(`
        SELECT id, role, content, images, "toolCalls", "toolResults", "createdAt"
        FROM public.agent_studio_messages
        WHERE "sessionId" = $1 AND ("isDeleted" IS FALSE OR "isDeleted" IS NULL)
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
    });
  }

  /**
   * Get single session by ID with tenant isolation verification.
   * Distinguishes between not found / deleted vs. forbidden (session belongs to another tenant).
   */
  async getSessionWithSecurityCheck(companyId, sessionId, domain = null) {
    if (!companyId || !sessionId) {
      return { status: 'NOT_FOUND', session: null };
    }

    return this._executeWithRetry(async () => {
      // 1. Check if session exists in DB at all (across any company)
      const existing = await this.prisma.$queryRawUnsafe(`
        SELECT id, "companyId", domain, status
        FROM public.agent_studio_sessions
        WHERE id = $1
        LIMIT 1
      `, sessionId);

      if (!existing || existing.length === 0) {
        return { status: 'NOT_FOUND', session: null };
      }

      const row = existing[0];
      const rowCompanyId = row.companyId || row.companyid;
      if (rowCompanyId !== companyId) {
        return { status: 'FORBIDDEN', session: null };
      }

      if (row.status === 'DELETED') {
        return { status: 'DELETED', session: null };
      }

      if (domain && row.domain !== domain) {
        return { status: 'NOT_FOUND', session: null };
      }

      // Valid and belongs to company: fetch full session and messages
      const session = await this.getSession(companyId, sessionId, domain);
      return { status: 'OK', session };
    });
  }

  /**
   * Save or upsert a session and its messages.
   */
  async saveSession(companyId, userId, domain = 'inventory', sessionData) {
    if (!companyId || !sessionData?.id) return null;

    return this._executeWithRetry(async () => {
      const { id, title, messages, context } = sessionData;
      const safeTitle = typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : 'جلسة جديدة';
      const now = new Date();

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
    });
  }

  /**
   * Append a single message directly to a session.
   */
  async appendMessage(companyId, sessionId, messageData, domain = 'inventory') {
    if (!companyId || !sessionId || !messageData) {
      throw new Error('companyId, sessionId, and messageData are required');
    }

    return this._executeWithRetry(async () => {
      const now = new Date();
      const msgId = messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const role = messageData.sender === 'user' || messageData.role === 'user' ? 'user' : 'assistant';
      const content = messageData.text || messageData.content || '';
      const toolCallsJson = messageData.toolCalls ? JSON.stringify(messageData.toolCalls) : null;
      const rawImages = messageData.images || messageData.attachments;
      const imagesJson = rawImages && Array.isArray(rawImages) && rawImages.length > 0 ? JSON.stringify(rawImages) : null;

      // Ensure parent session exists
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.agent_studio_sessions (id, "companyId", domain, title, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'جلسة جديدة', 'ACTIVE', $4, $4)
        ON CONFLICT (id) DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt"
      `, sessionId, companyId, domain, now);

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO public.agent_studio_messages (id, "sessionId", role, content, "toolCalls", images, "createdAt", "isDeleted")
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, FALSE)
        ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            images = COALESCE(EXCLUDED.images, agent_studio_messages.images),
            "isDeleted" = FALSE,
            "deletedAt" = NULL
      `, msgId, sessionId, role, content, toolCallsJson, imagesJson, now);

      return true;
    });
  }

  /**
   * Soft-delete a session and its associated messages.
   */
  async deleteSession(companyId, sessionId, domain = null) {
    if (!companyId || !sessionId) return false;

    return this._executeWithRetry(async () => {
      if (domain) {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public.agent_studio_sessions
          SET status = 'DELETED', "updatedAt" = CURRENT_TIMESTAMP
          WHERE "companyId" = $1 AND id = $2 AND domain = $3
        `, companyId, sessionId, domain);
      } else {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public.agent_studio_sessions
          SET status = 'DELETED', "updatedAt" = CURRENT_TIMESTAMP
          WHERE "companyId" = $1 AND id = $2
        `, companyId, sessionId);
      }

      await this.prisma.$executeRawUnsafe(`
        UPDATE public.agent_studio_messages
        SET "isDeleted" = TRUE, "deletedAt" = CURRENT_TIMESTAMP
        WHERE "sessionId" = $1
      `, sessionId);

      return true;
    });
  }

  /**
   * SOTA 2026 Session State Rewind: Rolls back the last turn (user + assistant) using soft delete.
   */
  async rewindSession(companyId, sessionId, domain = null) {
    if (!companyId || !sessionId) throw new Error('companyId and sessionId are required');

    return this._executeWithRetry(async () => {
      const lastMessages = await this.prisma.$queryRawUnsafe(`
        SELECT id, role, content FROM public.agent_studio_messages
        WHERE "sessionId" = $1 AND ("isDeleted" IS FALSE OR "isDeleted" IS NULL)
        ORDER BY "createdAt" DESC
        LIMIT 2
      `, sessionId);

      if (!lastMessages || lastMessages.length === 0) {
        return { success: false, message: 'لا توجد رسائل سابقة للتراجع عنها في هذه الجلسة' };
      }

      const msgIds = lastMessages.map(m => m.id);
      await this.prisma.$executeRawUnsafe(`
        UPDATE public.agent_studio_messages
        SET "isDeleted" = TRUE, "deletedAt" = CURRENT_TIMESTAMP
        WHERE id = ANY($1::text[])
      `, msgIds);

      if (domain) {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public.agent_studio_sessions
          SET "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = $1 AND "companyId" = $2 AND domain = $3
        `, sessionId, companyId, domain);
      } else {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public.agent_studio_sessions
          SET "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = $1 AND "companyId" = $2
        `, sessionId, companyId);
      }

      const remainingMessages = await this.prisma.$queryRawUnsafe(`
        SELECT id, "sessionId", role, content, images, "toolCalls", "createdAt"
        FROM public.agent_studio_messages
        WHERE "sessionId" = $1 AND ("isDeleted" IS FALSE OR "isDeleted" IS NULL)
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
    });
  }

  /**
   * Merge updates into the session's context JSONB safely without overwriting other keys.
   */
  async updateSessionContext(companyId, sessionId, contextUpdates = {}, domain = 'copilot') {
    if (!companyId || !sessionId || !contextUpdates) return;

    return this._executeWithRetry(async () => {
      try {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public.agent_studio_sessions
          SET context = COALESCE(context, '{}'::jsonb) || $1::jsonb,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "companyId" = $2 AND id = $3 AND domain = $4
        `, JSON.stringify(contextUpdates), companyId, sessionId, domain);
      } catch (err) {
        console.warn('⚠️ [AgentStudioSessionService] updateSessionContext warning:', err.message);
      }
    });
  }

  /**
   * Soft-delete empty sessions (0 non-deleted messages) older than a given threshold.
   */
  async cleanupEmptySessions(companyId, domain = 'copilot', olderThanMinutes = 30) {
    if (!companyId) return 0;

    return this._executeWithRetry(async () => {
      try {
        const result = await this.prisma.$executeRawUnsafe(`
          UPDATE public.agent_studio_sessions s
          SET status = 'DELETED', "updatedAt" = CURRENT_TIMESTAMP
          WHERE s."companyId" = $1
            AND s.domain = $2
            AND s.status = 'ACTIVE'
            AND s."createdAt" < NOW() - ($3 || ' minutes')::interval
            AND NOT EXISTS (
              SELECT 1 FROM public.agent_studio_messages m
              WHERE m."sessionId" = s.id
                AND (m."isDeleted" IS FALSE OR m."isDeleted" IS NULL)
            )
        `, companyId, domain, String(olderThanMinutes));

        return result;
      } catch (err) {
        console.error('❌ [AgentStudioSessionService] cleanupEmptySessions error:', err.message);
        return 0;
      }
    });
  }
}

module.exports = new AgentStudioSessionService();

