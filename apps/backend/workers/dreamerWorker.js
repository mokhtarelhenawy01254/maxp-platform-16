/**
 * @module dreamerWorker
 * @description Phase 9: Dreamer Worker Engine - async background worker that
 * consolidates memories overnight by extracting facts from raw conversations.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const aiSdkClient = require('../services/aiSdkClient');

class DreamerWorker {
  constructor({ batchSize = 10 } = {}) {
    this.batchSize = batchSize;
    this.prisma = null;
    this.interval = null;
  }

  _getPrisma() {
    if (!this.prisma) this.prisma = getSharedPrismaClient();
    return this.prisma;
  }

  /**
   * Gets unprocessed conversations from the last 24 hours.
   */
  async getUnprocessedConversations(companyId, limit = null) {
    const prisma = this._getPrisma();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          companyId,
          updatedAt: { gte: since },
        },
        take: limit || this.batchSize,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, metadata: true, updatedAt: true, customerId: true },
      });
      // Filter out already processed ones
      return conversations.filter(c => {
        try {
          const meta = c.metadata ? (typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata) : {};
          return !meta.dreamerProcessed;
        } catch { return true; }
      });
    } catch (error) {
      console.error('[DreamerWorker] Failed to fetch conversations:', error.message);
      return [];
    }
  }

  /**
   * Deterministic fact extractor from conversation messages.
   * Used as fallback or validation.
   * @param {{ messages: Array<{role:string, content:string}> }} conversation
   * @returns {Array<{type:string, content:string, confidence:number, metadata:Object}>}
   */
  extractFactsFromConversation(conversation) {
    const facts = [];
    const messages = conversation.messages || [];

    for (const msg of messages) {
      const text = (typeof msg === 'string' ? msg : msg.content || '').toLowerCase();
      if (!text) continue;

      // Name detection
      const nameMatch = text.match(/(?:اسمي|my name is|انا)\s+([^\s,.!?]+)/i);
      if (nameMatch) {
        facts.push({ type: 'FACT', content: `Customer name: ${nameMatch[1]}`, confidence: 0.8, metadata: { source: 'EXPLICIT_CHAT', field: 'name' } });
      }

      // Size preference
      const sizeMatch = text.match(/(?:مقاس|size|مقاسي)\s*(\d{2,3})/i);
      if (sizeMatch) {
        facts.push({ type: 'PREFERENCE', content: `Preferred size: ${sizeMatch[1]}`, confidence: 0.7, metadata: { source: 'EXPLICIT_CHAT', field: 'size' } });
      }

      // Color preference
      const colorMatch = text.match(/(?:لون|color|اللون)\s+([^\s,.!?]+)/i);
      if (colorMatch) {
        facts.push({ type: 'PREFERENCE', content: `Preferred color: ${colorMatch[1]}`, confidence: 0.7, metadata: { source: 'EXPLICIT_CHAT', field: 'color' } });
      }

      // Product interest
      const productMatch = text.match(/(?:عايز|ابغى|want|looking for|interested in)\s+(.{3,30})/i);
      if (productMatch) {
        facts.push({ type: 'PREFERENCE', content: `Interest: ${productMatch[1].trim()}`, confidence: 0.6, metadata: { source: 'INFERRED', field: 'interest' } });
      }
    }

    return facts;
  }

  /**
   * Generates a deterministic summary of conversation messages (fallback).
   */
  generateConversationSummary(messages) {
    if (!messages || messages.length === 0) {
      return { summary: 'Empty conversation', keyTopics: [], sentiment: 'NEUTRAL' };
    }

    const allText = messages.map(m => typeof m === 'string' ? m : m.content || '').join(' ');
    const words = allText.split(/\s+/).filter(w => w.length > 2);
    const wordFreq = {};
    for (const w of words) {
      const key = w.toLowerCase();
      wordFreq[key] = (wordFreq[key] || 0) + 1;
    }

    const keyTopics = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    const positiveWords = /شكر|thanks|great|ممتاز|حلو|excellent|good/i;
    const negativeWords = /مشكل|problem|bad|سيء|غضب|angry|disappointed/i;
    let sentiment = 'NEUTRAL';
    if (positiveWords.test(allText)) sentiment = 'POSITIVE';
    if (negativeWords.test(allText)) sentiment = 'NEGATIVE';

    return {
      summary: `Conversation with ${messages.length} messages discussing: ${keyTopics.slice(0, 3).join(', ')}`,
      keyTopics,
      sentiment,
    };
  }

  /**
   * Main orchestration: processes unprocessed conversations and extracts facts.
   */
  async consolidateMemory(companyId) {
    const conversations = await this.getUnprocessedConversations(companyId);
    const result = { processed: 0, factsCreated: 0, errors: [] };

    if (conversations.length === 0) return result;

    const prisma = this._getPrisma();

    // 1. Fetch messages for all conversations, filter empties
    const payloads = [];
    for (const conv of conversations) {
      try {
        const messages = await prisma.message.findMany({
          where: { conversationId: conv.id },
          orderBy: { createdAt: 'asc' },
          select: { content: true, isFromCustomer: true, createdAt: true }
        });

        if (messages.length === 0) {
          const existingMeta = conv.metadata ? (typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : conv.metadata) : {};
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { metadata: JSON.stringify({ ...existingMeta, dreamerProcessed: true, dreamerAt: new Date().toISOString(), summary: 'Empty conversation' }) },
          });
          result.processed++;
          continue;
        }

        payloads.push({
          conv,
          messages,
          conversation_id: conv.id,
          messages_payload: messages.map(m => ({
            content: m.content,
            is_from_customer: m.isFromCustomer,
          })),
        });
      } catch (error) {
        result.errors.push(`Conv ${conv.id}: ${error.message}`);
      }
    }

    if (payloads.length === 0) return result;

    // 2. Send all non-empty conversations to Python ai-service for LLM consolidation
    let pythonResultsMap = new Map();
    try {
      const pyResponse = await aiSdkClient.consolidateDreamer({
        companyId,
        conversations: payloads.map(p => ({
          conversation_id: p.conversation_id,
          messages: p.messages_payload,
        })),
        consolidationType: 'fact_extraction',
      });
      if (pyResponse.results) {
        for (const r of pyResponse.results) {
          pythonResultsMap.set(r.conversation_id, r);
        }
      }
    } catch (pyError) {
      console.warn('[DreamerWorker] AI consolidation failed, falling back to heuristics:', pyError.message);
    }

    // 3. Process each conversation with Python results or deterministic fallback
    for (const { conv, messages } of payloads) {
      try {
        let facts = [];
        let summaryData = null;
        let usedLLM = false;

        const pyResult = pythonResultsMap.get(conv.id);
        if (pyResult && pyResult.facts) {
          facts = pyResult.facts || [];
          summaryData = {
            summary: pyResult.summary || '',
            keyTopics: pyResult.keyTopics || [],
            sentiment: pyResult.sentiment || 'NEUTRAL'
          };
          usedLLM = true;
        }

        if (!usedLLM) {
          facts = this.extractFactsFromConversation({ messages });
          summaryData = this.generateConversationSummary(messages);
        }

        // Store extracted facts
        for (const fact of facts) {
          try {
            await prisma.agenticMemoryFact.create({
              data: {
                companyId,
                customerId: conv.customerId || null,
                type: fact.type || 'FACT',
                content: fact.content,
                confidence: fact.confidence || 0.8,
                importance: 3,
                metadata: JSON.stringify({
                  ...fact.metadata,
                  conversationId: conv.id,
                  consolidatedAt: new Date().toISOString()
                }),
              },
            });
            result.factsCreated++;
          } catch (e) {
            result.errors.push(`Fact save error: ${e.message}`);
          }
        }

        // Mark conversation as processed & store summary
        try {
          const existingMeta = conv.metadata ? (typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : conv.metadata) : {};
          const newMeta = {
            ...existingMeta,
            dreamerProcessed: true,
            dreamerAt: new Date().toISOString(),
            summary: summaryData?.summary || null,
            keyTopics: summaryData?.keyTopics || [],
            sentiment: summaryData?.sentiment || 'NEUTRAL'
          };
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { metadata: JSON.stringify(newMeta) },
          });
        } catch (e) {
          result.errors.push(`Metadata update error: ${e.message}`);
        }

        result.processed++;
      } catch (error) {
        result.errors.push(`Conv ${conv.id}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Entry point.
   */
  async run(companyId) {
    if (!companyId) {
      throw new Error('companyId is required for DreamerWorker.run');
    }
    console.log(`[DreamerWorker] Starting memory consolidation for company ${companyId}`);
    const result = await this.consolidateMemory(companyId);
    console.log(`[DreamerWorker] Complete: ${result.processed} conversations, ${result.factsCreated} facts, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Starts the background scheduler, running consolidateMemory for each companyId.
   */
  start({ intervalMs = 6 * 60 * 60 * 1000, runOnStart = false, companyIds = [] } = {}) {
    if (this.interval) return this.interval;

    const runScheduled = async () => {
      if (companyIds.length === 0) {
        console.warn('[DreamerWorker] No companyIds provided — scheduler skipping');
        return;
      }
      for (const companyId of companyIds) {
        try {
          await this.run(companyId);
        } catch (error) {
          console.error(`[DreamerWorker] Failed to consolidate company ${companyId}: ${error.message}`);
        }
      }
    };

    if (runOnStart) {
      setTimeout(runScheduled, 0);
    }

    this.interval = setInterval(runScheduled, intervalMs);
    if (typeof this.interval.unref === 'function') {
      this.interval.unref();
    }

    return this.interval;
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

module.exports = DreamerWorker;
