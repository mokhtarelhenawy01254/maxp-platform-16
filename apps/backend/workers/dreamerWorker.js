/**
 * @module dreamerWorker
 * @description Phase 9: Dreamer Worker Engine - async background worker that
 * consolidates memories overnight by extracting facts from raw conversations.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const aiRuntimeService = require('../legacy-ai-agent/aiAgent/aiRuntimeService');

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
    const modelManager = aiRuntimeService.getModelManager();

    // 1. Get active AI Key info for routing consolidation LLM requests
    const keyInfo = await modelManager.getNextKeySimple(companyId).catch(() => null);

    for (const conv of conversations) {
      try {
        // Fetch raw messages from db
        const messages = await prisma.message.findMany({
          where: { conversationId: conv.id },
          orderBy: { createdAt: 'asc' },
          select: { content: true, isFromCustomer: true, createdAt: true }
        });

        if (messages.length === 0) {
          // Update metadata to show processed
          const existingMeta = conv.metadata ? (typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : conv.metadata) : {};
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { metadata: JSON.stringify({ ...existingMeta, dreamerProcessed: true, dreamerAt: new Date().toISOString(), summary: 'Empty conversation' }) },
          });
          result.processed++;
          continue;
        }

        let facts = [];
        let summaryData = null;
        let usedLLM = false;

        // Try utilizing AI Provider for memory consolidation
        if (keyInfo && !keyInfo.error) {
          try {
            const AIProviderFactory = require('../legacy-ai-agent/aiAgent/providers/AIProviderFactory');
            const providerClient = AIProviderFactory.getProvider(
              keyInfo.provider,
              keyInfo.apiKey,
              keyInfo.baseUrl,
              keyInfo.keyId
            );

            const messagesText = messages.map(m => `${m.isFromCustomer ? 'Customer' : 'Agent'}: ${m.content}`).join('\n');
            const prompt = `You are the Dreamer background consolidation worker for an AI storefront agent.
Review the following conversation history between the Customer and the Agent:
---
${messagesText}
---

Your task is to:
1. Extract any concrete, explicit facts or long-term preferences about the customer (e.g. name, location, sizing preferences, preferred colors, interests, allergies).
2. Generate a concise summary of the conversation (max 2 sentences).
3. Identify the key topics discussed.
4. Classify the customer's sentiment (POSITIVE, NEGATIVE, or NEUTRAL).

Provide your output in valid JSON format only, matching this schema:
{
  "facts": [
    {
      "type": "FACT" | "PREFERENCE",
      "content": "Specific factual detail (e.g. Customer name is Mokhtar)",
      "confidence": 0.0 to 1.0,
      "metadata": {
        "source": "EXPLICIT_CHAT",
        "field": "name" | "size" | "color" | "interest" | "other"
      }
    }
  ],
  "summary": "Short 1-2 sentence summary of interaction",
  "keyTopics": ["topic1", "topic2"],
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL"
}
Do not return any extra text, only the raw JSON.`;

            const startedAt = Date.now();
            const providerResult = await providerClient.generateResponse(prompt, {
              model: keyInfo.model,
              temperature: 0.2,
              max_tokens: 500,
              maxOutputTokens: 500
            });

            const reply = providerResult.text ? providerResult.text() : providerResult.content;
            const latencyMs = Date.now() - startedAt;

            // Extract JSON from reply
            let jsonText = reply.trim();
            if (jsonText.includes('```')) {
              const matches = jsonText.match(/```(?:json)?([\s\S]+?)```/);
              if (matches && matches[1]) {
                jsonText = matches[1].trim();
              }
            }

            const parsed = JSON.parse(jsonText);
            if (parsed) {
              facts = parsed.facts || [];
              summaryData = {
                summary: parsed.summary || '',
                keyTopics: parsed.keyTopics || [],
                sentiment: parsed.sentiment || 'NEUTRAL'
              };
              usedLLM = true;

              // Record routing success in system metrics
              await modelManager.recordRoutingSuccess(keyInfo, {
                companyId,
                model: keyInfo.model,
                tokens: providerResult.usage?.totalTokens || 0,
                latencyMs
              }).catch(() => {});
            }
          } catch (llmError) {
            console.warn('[DreamerWorker] AI consolidation failed, falling back to heuristics:', llmError.message);
          }
        }

        // Fallback to deterministic regex-based parser
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
   * Starts the background scheduler without running an unsafe all-tenant job on boot.
   */
  start({ intervalMs = 6 * 60 * 60 * 1000, runOnStart = false } = {}) {
    if (this.interval) return this.interval;

    const runScheduled = () => {
      console.log('[DreamerWorker] Scheduled consolidation is waiting for explicit company scope');
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
