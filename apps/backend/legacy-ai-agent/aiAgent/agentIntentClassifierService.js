/**
 * @module agentIntentClassifierService
 * @description SOTA 2026 Tool-Based Intent Classification.
 *
 * Utilizes LLM function calling to classify user messages into structured intents
 * and extract slot values with high accuracy across Arabic dialects.
 */

const BaseAgent = require('./BaseAgent');
const aiRuntimeService = require('../aiRuntimeService');
const agentIntentPlannerService = require('./agentIntentPlannerService');

function normalizeClassifierResult(args = {}) {
  if (!args || typeof args !== 'object') return null;
  if (!agentIntentPlannerService.INTENT_POLICIES[args.intent]) return null;
  return {
    intent: args.intent,
    confidence: typeof args.confidence === 'number' ? args.confidence : 0.8,
    ambiguous: Boolean(args.ambiguous),
    clarificationQuestion: args.clarificationQuestion || null,
    slots: args.slots && typeof args.slots === 'object' ? args.slots : {},
  };
}

function parseJsonObject(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch (err) {
      return null;
    }
  }
}

function parseClassifierToolCall(funcCall = {}) {
  let args = {};
  if (typeof funcCall.arguments === 'string') {
    try {
      args = JSON.parse(funcCall.arguments);
    } catch (jsonErr) {
      console.error('[AGENT-INTENT-CLASSIFIER] JSON parse arguments failed:', jsonErr.message);
      return null;
    }
  } else {
    args = funcCall.arguments || {};
  }
  return normalizeClassifierResult(args);
}

async function classifyIntentWithJsonFallback({ classifierAgent, message, availableTools = [] }) {
  const intentEnum = Object.keys(agentIntentPlannerService.INTENT_POLICIES);
  const fallbackMessages = [
    {
      role: 'system',
      content: [
        'You are a schema-only intent classifier for customer and merchant operations.',
        'Return exactly one JSON object and no markdown, comments, or customer-facing answer.',
        `Allowed intents: ${intentEnum.join(', ')}`,
        'JSON shape: {"intent": string, "confidence": number, "ambiguous": boolean, "clarificationQuestion": string|null, "slots": object}.',
        `Available tools: ${(availableTools || []).join(', ') || 'none'}.`,
        'For customer read-only catalog questions about price, availability, stock, images, size, color, SKU, or variants, choose inventory when a current stock/variant fact is requested; choose products only for broad catalog browsing.',
        'Set slots.requestedProductImage to true when the latest message asks for product photos, an image, or an image link.',
        'If the customer says they are not ordering yet, that is still a read-only catalog/inventory question, not an order draft and not a support handoff.',
        'Use support exchange/refund/complaint only when the latest message asks for after-sale service such as replacement, return, refund, damage, complaint, or policy exception.',
        'Extract only values present in the latest message. Do not invent customer name, phone, address, price, or order number.',
        'Do not classify by lexical shortcuts. Interpret the latest message semantically, including negation and corrections.',
      ].join('\n'),
    },
    { role: 'user', content: `Latest message to classify:\n${String(message || '')}` },
  ];

  const fallbackResult = await classifierAgent.generateWithLLMResult(fallbackMessages, {
    temperature: 0,
    maxTokens: 500,
    timeoutMs: 15000,
    allowModelFallback: true,
  });
  return normalizeClassifierResult(parseJsonObject(fallbackResult?.text || ''));
}

/**
 * Classifies user intent using LLM function calling with forced tool execution.
 * Returns null on any failure. Runtime callers must treat that as
 * "no schema-bound tool route" rather than falling back to keyword execution.
 *
 * @param {Object} params
 * @param {string} params.message - Message to classify
 * @param {string} params.companyId - Tenant company context
 * @param {string[]} [params.availableTools] - Allowed tool identifiers
 * @param {Object} [params.context] - Goal and memory context
 * @returns {Promise<{intent: string, confidence: number, ambiguous: boolean, clarificationQuestion: string|null, slots: Object}|null>}
 */
async function classifyIntentFromLLM({ message, companyId, availableTools = [], context = {} }) {
  try {
    const modelManager = aiRuntimeService.getModelManager();
    if (!modelManager) {
      console.warn('[AGENT-INTENT-CLASSIFIER] Model manager not initialized');
      return null;
    }

    const classifierAgent = new BaseAgent({
      id: 'system_intent_classifier',
      name: 'Intent Classifier',
      role: 'SYSTEM',
      companyId,
      allowedTools: ['classify_intent'],
    });
    classifierAgent.setModelManager(modelManager);

    // Schema mapping MaxP intents to structured enum & slots
    const classifyIntentTool = {
      type: 'function',
      function: {
        name: 'classify_intent',
        description: 'Classify user intent and extract slots from the Arabic or English message.',
        parameters: {
          type: 'object',
          required: ['intent', 'confidence', 'ambiguous'],
          properties: {
            intent: {
              type: 'string',
              enum: Object.keys(agentIntentPlannerService.INTENT_POLICIES),
              description: 'The classified user intent',
            },
            confidence: {
              type: 'number',
              description: 'Model confidence score between 0.0 and 1.0',
            },
            ambiguous: {
              type: 'boolean',
              description: 'True if user message is ambiguous, unclear, or conflicts with active goals',
            },
            clarificationQuestion: {
              type: 'string',
              description: ' Arabic question to ask if ambiguous is true or slots are missing',
            },
            slots: {
              type: 'object',
              description: 'Extracted slot values from message',
              properties: {
                name: { type: ['string', 'null'], description: 'Product or agent name' },
                price: { type: ['number', 'null'], description: 'Product or agent budget/price' },
                agent: { type: ['string', 'null'], description: 'Agent identifier or role name' },
                skill: { type: ['string', 'null'], description: 'Skill name or code description' },
                task: { type: ['string', 'null'], description: 'Delegated task details' },
                displayName: { type: ['string', 'null'], description: 'Skill display name' },
                description: { type: ['string', 'null'], description: 'Skill or task description' },
                productName: { type: ['string', 'null'], description: 'Catalog/order product name, SKU, or product phrase from the customer message' },
                productNameOrSku: { type: ['string', 'null'], description: 'Product name or SKU for inventory checks' },
                sku: { type: ['string', 'null'], description: 'Product SKU if explicitly present' },
                query: { type: ['string', 'null'], description: 'Product/catalog search query if a product is described but not exact' },
                productSize: { type: ['string', 'null'], description: 'Requested product size, variant, or shoe size' },
                productColor: { type: ['string', 'null'], description: 'Requested product color' },
                requestedProductImage: { type: ['boolean', 'null'], description: 'True when the customer asks for product photos, an image, or an image link' },
                size: { type: ['string', 'null'], description: 'Requested size when not using productSize' },
                color: { type: ['string', 'null'], description: 'Requested color when not using productColor' },
                productPrice: { type: ['number', 'null'], description: 'Order draft product price' },
                quantity: { type: ['number', 'null'], description: 'Requested quantity if present' },
                customerName: { type: ['string', 'null'], description: 'Order customer name' },
                customerPhone: { type: ['string', 'null'], description: 'Order customer phone number' },
                orderNumber: { type: ['string', 'null'], description: 'Order number or tracking reference' },
                city: { type: ['string', 'null'], description: 'Shipping city or area' },
                governorate: { type: ['string', 'null'], description: 'Shipping governorate or province' },
              },
            },
          },
        },
      },
    };

    const systemPrompt = `You are the primary intent classification service for the MaxP Agentic AI system.
Your only job is to analyze the user's message and call the function "classify_intent" with the correct classification, confidence, ambiguity flag, and parameters (slots) extracted from the message.

Here are the details for each intent:
- general.chat: Conversational greetings (e.g. "ازيك", "صباح الخير", "يا عباس" without business instructions), thank you, or general chat that doesn't request database actions/reports.
- hr.attendance.today: Questions about employee attendance or checking who came today.
- orders.create_draft: Creating a draft order/sales order. Required slots: productName, productPrice, customerName, customerPhone.
- products.manage: Creating or adding a product. Required slots: name, price.
- shipping.rates: Asking about delivery cost, delivery time, or shipping coverage.
- support.exchange: Asking to exchange or replace an item, including size/color replacement.
- support.refund: Asking to return an item, cancel after receipt, refund money, or stop an exchange and return instead.
- support.complaint: Complaints, damaged items, angry customers, abuse, payment disputes, or policy exceptions.
- goals.create_product: Continuing product creation goal.
- goals.create_agent_with_skill: Continuing agent and skill goal.
- agents.run_task: Assigning a task to a specialist agent (e.g. "كلف الوكيل..."). Required slot: task.
- agents.manage: Hiring or creating a new agent.
- agents.read: Listing or checking the roster/state of agents.
- audit.read: Reading the agent audit log trail (logs, decisions, actions).
- skills.manage: Creating/saving a skill. Required slots: displayName, description.
- skills.read: Checking/reading the skill registry.
- orders: Fetching orders/sales data or summaries.
- inventory: Checking stock, availability, current price, variants, sizes, colors, or SKU-level product facts.
- products: Searching or browsing the product catalog when no current stock/variant check is requested.
- customers: Customer information or data.
- sales: Sales reports or revenue.
- company.snapshot: General company health or dashboard overview.

Rules:
1. Always call the "classify_intent" function.
2. If the user's message is a greeting or small talk (e.g. "ازيك يا عباس", "السلام عليكم", "صباح الخير"), classify it as "general.chat" with ambiguous: false.
3. If the message is ambiguous (e.g., "اعمل واحد جديد" without context, or "كم عندنا اليوم" without specifying if they mean sales or attendance), set ambiguous: true, intent: "general.chat", and write a polite clarification question in Arabic.
4. Extract slots carefully. Do not invent values; only extract what is present in the message.
5. For read-only catalog, price, availability, size, color, image, and shipping questions, extract product/location slots only. Do not request or extract customerName/customerPhone unless the customer is clearly creating or confirming an order.
6. Set slots.requestedProductImage to true when the customer asks for product photos, an image, or an image link.
7. Do not classify by keyword matching. Interpret the full sentence, negation, corrections, and conversation context semantically.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Message to classify: "${message}"` },
    ];

    // Force function calling mode
    const toolChoiceOpenAI = {
      type: 'function',
      function: { name: 'classify_intent' },
    };
    const toolConfigGemini = {
      functionCallingConfig: {
        mode: 'ANY',
        allowedFunctionNames: ['classify_intent'],
      },
    };

    const result = await classifierAgent.generateWithLLMResult(messages, {
      tools: [classifyIntentTool],
      tool_choice: toolChoiceOpenAI,
      toolConfig: toolConfigGemini,
      temperature: 0.1, // High precision
      maxTokens: 500,
      timeoutMs: 15000, // 15 seconds limit
      allowModelFallback: true,
    });

    if (!result || !result.toolCalls || result.toolCalls.length === 0) {
      const fallbackClassification = await classifyIntentWithJsonFallback({
        classifierAgent,
        message,
        availableTools,
      });
      if (fallbackClassification) {
        return fallbackClassification;
      }
      console.warn('[AGENT-INTENT-CLASSIFIER] Model returned no schema-bound classification; tool routing remains disabled for this turn');
      return null;
    }

    const funcCall = result.toolCalls[0].function;
    return parseClassifierToolCall(funcCall);
  } catch (err) {
    console.error('[AGENT-INTENT-CLASSIFIER] Intent classification LLM turn failed; tool routing remains disabled:', err.message);
    return null;
  }
}

module.exports = {
  classifyIntentFromLLM,
  _private: {
    normalizeClassifierResult,
    parseJsonObject,
  },
};
