/**
 * @module toolExecutionEngine
 * @description Extracts and manages multi-round tool execution loops, tool call normalization, and validation rules.
 */

const { getModelCapabilities } = require('../agentModelCapabilityService');
const {
  parseTextToolCalls,
  containsInternalToolSyntax,
} = require('../agentToolCallParser');
const agentToolGatewayService = require('../agentToolGatewayService');
const { fromNativeToolName } = require('../agentToolRegistry');
const intentExecutionRouter = require('./intentExecutionRouter');
const customerReplyEngine = require('./customerReplyEngine');
const customerKnowledgeEvidence = require('./customerKnowledgeEvidence');

const MAX_TOOL_ROUNDS = 6;

function _safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function _safeJsonClone(value) {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function _redactSensitiveCustomerToolResult(value = '') {
  return String(value || '')
    .replace(/"?(?:approvalCode|requestKey|draftId|traceId|agentId|adminReviewPath|id)"?\s*:\s*("[^"]*"|[0-9]+|null),?/gi, '"internalField": "[redacted]",')
    .replace(/\b(?:approvalCode|approval code|request key|draft id|trace id|agent id)\b\s*[:=]\s*\S+/gi, '[redacted internal id]');
}

function _normalizeNativeToolCalls(toolCalls = []) {
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls
    .map((call, index) => {
      const fn = call.function || call.functionCall || {};
      const name = fn.name || call.name;
      if (!name) return null;
      return {
        id: call.id || `${name}-${index + 1}`,
        nativeName: name,
        tool: fromNativeToolName(name),
        params: _safeJsonParse(fn.arguments ?? fn.args ?? call.arguments ?? call.args, {}),
        raw: call,
      };
    })
    .filter(Boolean);
}

function _modelSupportsNativeToolCalling(llmResult = {}) {
  const selection = llmResult.modelSelection || {};
  const provider = selection.provider || llmResult.provider || llmResult.keyInfo?.provider;
  const model = selection.model || llmResult.model || llmResult.keyInfo?.model;
  if (!provider && !model) return false;
  return Boolean(getModelCapabilities(provider, model).nativeToolCalling);
}

function _normalizeLegacyToolCalls(text = '') {
  return parseTextToolCalls(String(text || '')).map((call, index) => ({
    id: call.id || `legacy-${index + 1}`,
    nativeName: call.nativeName || call.tool,
    tool: call.tool,
    params: call.params || {},
    legacy: true,
    textDialect: call.textDialect || 'text',
  }));
}

function _mergeCustomerActionContext(tool, params = {}, { task = {}, intentContext = {} } = {}) {
  if (!['order.create_draft', 'order.create_confirmed'].includes(tool)) {
    return params || {};
  }

  const merged = { ...(params || {}) };
  if (!merged.conversationId && task?.conversationId) {
    merged.conversationId = task.conversationId;
  }
  if (!merged.customerId && (intentContext?.customerId || task?.customerId)) {
    merged.customerId = intentContext?.customerId || task?.customerId;
  }
  return merged;
}

function _hasExplicitPreviousProductReference(params = {}) {
  const referencesPreviousProduct = params.referencesPreviousProduct === true
    || String(params.referencesPreviousProduct || '').toLowerCase() === 'true';
  return referencesPreviousProduct && String(params.conversationId || '').trim();
}

function _validateCustomerToolCallParams(tool, params = {}) {
  if (tool === 'product.search') {
    // empty query is valid — lists all products
    return { valid: true };
  }

  if (tool === 'inventory.check') {
    return String(params.productNameOrSku || params.productName || params.query || '').trim()
      || _hasExplicitPreviousProductReference(params)
      || params.listAll === true
      ? { valid: true }
      : { valid: false, error: 'CUSTOMER_TOOL_ARGS_MISSING_PRODUCT_NAME' };
  }

  if (tool === 'order.create_draft' || tool === 'order.create_confirmed') {
    const hasProduct = String(params.productName || params.productNameOrSku || '').trim();
    const hasPhone = String(params.customerPhone || params.phone || '').trim();
    return hasProduct && hasPhone
      ? { valid: true }
      : { valid: false, error: 'CUSTOMER_TOOL_ARGS_MISSING_REQUIRED_ORDER_SLOTS' };
  }

  return { valid: true };
}

function _formatToolResultForPrompt(tool, result) {
  return result.success
    ? JSON.stringify({ tool, ok: true, result: result.result }, null, 2)
    : JSON.stringify({ tool, ok: false, error: result.error }, null, 2);
}

function _normalizeEvidenceText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ji') // note: let's match exact normalize in CEOAgent
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function _containsSuccessClaim(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(تم|نجاح|نجحت|انشات|انشاء|اضفت|اضافه|اتضاف|اتعمل|جاهز|كلفت|تكليف|created|success|done)/i.test(text);
}

function _containsFailureAcknowledgement(reply = '') {
  const text = _normalizeEvidenceText(reply);
  // arabic-strings: internal-signal-start
  const boundary = '(?:^|[\\s،,.!؟:;()\\[\\]{}"\'`-])';
  const end = '(?=$|[\\s،,.!؟:;()\\[\\]{}"\'`-])';
  const phrasePattern = new RegExp(`${boundary}(?:لا\\s+يمكن|ماقدرش|مقدرش|غير\\s+متاح|غير\\s+موجود|لا\\s+يوجد|تعذر|لا\\s+املك|مش\\s+عنده|missing|failed|cannot|not\\s+available)${end}`, 'i');
  const tokenPattern = new RegExp(`${boundary}(?:لم|فشل|محتاج)${end}`, 'i');
  // arabic-strings: internal-signal-end
  return phrasePattern.test(text) || tokenPattern.test(text);
}

function _containsCatalogFailureAcknowledgement(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(تعذر|فشل|مش\s+قادر|غير\s+قادر|ماقدرش|مقدرش|لا\s+اقدر|لا\s+استطيع|لا\s+يمكن|cannot|failed).{0,80}(الشيت|sheet|google|الكتالوج|catalog|المخزون|inventory|البيانات|data|الوصول|access)|(?:الشيت|sheet|google|الكتالوج|catalog|المخزون|inventory|البيانات|data).{0,80}(تعذر|فشل|مش\s+قادر|غير\s+قادر|ماقدرش|مقدرش|لا\s+اقدر|لا\s+استطيع|غير\s+متاح|unavailable|failed)/i.test(text);
}

function _containsToolProcessOnlyReply(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(مش ظاهر.{0,20}(اداه|tool)|لا املك.{0,30}(اداه|وصول|tool|access)|لا امتلك.{0,30}(اداه|وصول|tool|access)|لا يمكنني الوصول|تم منع.{0,40}اداه|اداه غير مناسبه|اداه غير مناسبه|tool unavailable|no tool|blocked tool|irrelevant tool)/i.test(text);
}

function _containsProductCreateClaim(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(?:تم\s+(?:انشاء|اضافه|عمل|تجهيز)\s+(?:مسوده\s+)?(?:منتج|product))|(?:انشات|اضفت|اتضاف|عملت|جهزت).{0,60}(?:منتج|product)|(?:منتج|product).{0,60}(?:انشات|اضفت|اتضاف|تم\s+(?:انشاؤه|اضافته|عمله|تجهيزه))/i.test(text);
}

function _containsAgentSpawnClaim(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(?:انشات|عينت|وظفت|قمت\s+(?:ب)?انشاء|لقد\s+(?:انشات|عينت)|اضفت|تم\s+اضافه).{0,40}(وكيل|ايجنت|agent)|تم\s+(?:انشاء|تعيين|توظيف|تجهيز|اضافه)\s+(?:ال|وكيل|)?(وكيل|ايجنت|agent)|(?:وكيل|ايجنت|agent).{0,40}(?:انشات|عينت|وظفت|اتعمل|اتجهز|جاهز|تم\s+(?:انشاؤه|تعيينه|توظيفه|تجهيزه|اضافته))|(?:اسمه|اسمها|جاهز|اتعمل|اتنشا).{0,25}(?:وكيل|ايجنت)/i.test(text);
}

function _containsSkillCreateClaim(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(تم|انشات|اضفت|عملت).{0,60}(مهاره|skill)|(?:مهاره|skill).{0,60}(تم|انشات|اضفت|عملت)/i.test(text);
}

function _containsOrderDraftCreateClaim(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(تم\s+(?:تجهيز|انشاء|عمل)|جهزت|انشات|عملت).{0,45}(مسوده\s+(?:طلب|اوردر)|اوردر|order draft)|(?:مسوده\s+(?:طلب|اوردر)|اوردر|order draft).{0,45}(?:جاهزه|معلقه|للموافقه|اتجهزت|اتعملت|created|ready)/i.test(text);
}

function _containsCurrentCatalogClaim(reply = '') {
  const text = _normalizeEvidenceText(reply);
  return /(?:متاح|متوفر|موجود|في\s+المخزون|available|in\s+stock|سعره|السعر|بكام|price|egp|جنيه|\b\d+(?:[.,]\d+)?\s*(?:جنيه|egp)?)/i.test(text);
}

function _parseAgentCountClaim(reply = '') {
  const text = _normalizeEvidenceText(reply)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  // arabic-strings: internal-signal-start
  const words = {
    واحد: 1,
    وكيل: 1,
    اتنين: 2,
    اثنين: 2,
    ثلاثه: 3,
    اربعه: 4,
    خمسه: 5,
    سته: 6,
    سبعه: 7,
    ثمانيه: 8,
    تسعه: 9,
    عشره: 10,
  };
  // arabic-strings: internal-signal-end
  const numeric = text.match(/(?:عندنا|لدينا|فيه|يوجد)?\s*(\d{1,2})\s*(?:وكلاء|وكيل|agents?)/i);
  if (numeric) return Number(numeric[1]);
  const wordMatch = text.match(/(?:عندنا|لدينا|فيه|يوجد)?\s*(واحد|اتنين|اثنين|ثلاثه|اربعه|خمسه|سته|سبعه|ثمانيه|تسعه|عشره)\s*(?:وكلاء|وكيل)/i);
  return wordMatch ? words[wordMatch[1]] : null;
}

function _extractAgentEvidence(toolEvidence = []) {
  for (const entry of toolEvidence) {
    if (!entry.success) continue;
    if (entry.tool === 'agent.list_agents' && Array.isArray(entry.result)) {
      return entry.result;
    }
    if (entry.tool === 'agent.read_state' && Array.isArray(entry.result?.agents)) {
      return entry.result.agents;
    }
  }
  return null;
}

function _hasSuccessfulOrderDraftEvidence(toolEvidence = []) {
  return toolEvidence.some((entry) => {
    if (!entry.success) return false;
    if (entry.tool === 'order.create_draft') return true;
    if (entry.tool === 'order.create_confirmed') return true;
    if (entry.tool !== 'agent.run_task') return false;
    const runResult = entry.result || {};
    const nestedToolResult = runResult.result || {};
    const nestedPayload = nestedToolResult.result || {};
    return nestedPayload.toolName === 'order.create_draft'
      || nestedPayload.toolName === 'order.create_confirmed'
      || Boolean(nestedPayload.orderCreated)
      || Boolean(nestedPayload.orderDraft)
      || Boolean(nestedPayload.draftId);
  });
}

function _relevancePlanRequestsProductImage(relevancePlan = {}) {
  const slots = {
    ..._safeJsonClone(relevancePlan?.classification?.slots || {}),
    ..._safeJsonClone(relevancePlan?.slots || {}),
  };
  return slots.requestedProductImage === true
    || slots.wantsProductImage === true
    || slots.productImageRequested === true;
}

function _collectImageUrls(value, urls = new Set()) {
  if (!value) return urls;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) urls.add(value);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach(item => _collectImageUrls(item, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach(item => _collectImageUrls(item, urls));
  }
  return urls;
}

function _extractImageUrlsFromEvidence(toolEvidence = []) {
  const urls = new Set();
  for (const entry of toolEvidence || []) {
    if (!entry?.success) continue;
    _collectImageUrls(entry.result, urls);
  }
  return [...urls];
}

function _replyContainsImageUrl(reply = '', imageUrls = []) {
  const text = String(reply || '');
  return imageUrls.some(url => text.includes(url)) || /https?:\/\/\S+/i.test(text);
}

function _validateGroundedReply({ reply, toolEvidence = [], relevancePlan = null }) {
  const failedTools = toolEvidence.filter(entry => !entry.success);
  const hasSuccessfulEvidence = toolEvidence.some(entry => entry.success);
  const acknowledgesFailure = _containsFailureAcknowledgement(reply);
  const requestedProductImage = _relevancePlanRequestsProductImage(relevancePlan);
  const evidenceImageUrls = requestedProductImage ? _extractImageUrlsFromEvidence(toolEvidence) : [];
  if (requestedProductImage && evidenceImageUrls.length > 0 && !_replyContainsImageUrl(reply, evidenceImageUrls)) {
    return {
      valid: false,
      reason: 'Model omitted requested product image URL despite successful image evidence',
      imageUrlCount: evidenceImageUrls.length,
    };
  }
  if (hasSuccessfulEvidence && _containsToolProcessOnlyReply(reply)) {
    return {
      valid: false,
      reason: 'Model described tool access/blocking instead of the successful tool result',
      intent: relevancePlan?.intent || null,
    };
  }
  if (failedTools.length > 0 && _containsSuccessClaim(reply) && !acknowledgesFailure) {
    return {
      valid: false,
      reason: 'Model claimed success after a failed tool execution',
      failedTools: failedTools.map(entry => ({ tool: entry.tool, error: entry.error })),
    };
  }
  const failedCatalogTools = failedTools.filter(entry => ['product.search', 'inventory.check', 'googlesheets.searchProducts', 'googlesheets.readProducts'].includes(entry.tool));
  if (failedCatalogTools.length > 0 && _containsCurrentCatalogClaim(reply) && !_containsCatalogFailureAcknowledgement(reply)) {
    return {
      valid: false,
      reason: 'Model claimed current catalog, price, or availability after a failed catalog tool execution',
      failedTools: failedCatalogTools.map(entry => ({ tool: entry.tool, error: entry.error })),
    };
  }

  const successfulTools = new Set(toolEvidence.filter(entry => entry.success).map(entry => entry.tool));
  if (_containsProductCreateClaim(reply) && !acknowledgesFailure && !successfulTools.has('product.create')) {
    return {
      valid: false,
      reason: 'Model claimed product creation without successful product.create evidence',
      intent: relevancePlan?.intent || null,
    };
  }
  if (_containsAgentSpawnClaim(reply) && !acknowledgesFailure && !successfulTools.has('agent.spawn')) {
    return {
      valid: false,
      reason: 'Model claimed agent creation without successful agent.spawn evidence',
      intent: relevancePlan?.intent || null,
    };
  }
  if (_containsSkillCreateClaim(reply) && !acknowledgesFailure && !successfulTools.has('skill.create')) {
    return {
      valid: false,
      reason: 'Model claimed skill creation without successful skill.create evidence',
      intent: relevancePlan?.intent || null,
    };
  }
  if (_containsOrderDraftCreateClaim(reply) && !acknowledgesFailure && !_hasSuccessfulOrderDraftEvidence(toolEvidence)) {
    return {
      valid: false,
      reason: 'Model claimed order draft creation without successful order.create_draft evidence',
      intent: relevancePlan?.intent || null,
    };
  }

  const agents = _extractAgentEvidence(toolEvidence);
  const claimedAgentCount = _parseAgentCountClaim(reply);
  if (Array.isArray(agents) && claimedAgentCount !== null && claimedAgentCount !== agents.length) {
    return {
      valid: false,
      reason: `Model claimed ${claimedAgentCount} agent(s), but tool evidence has ${agents.length}`,
      claimedAgentCount,
      actualAgentCount: agents.length,
    };
  }

  return { valid: true };
}

function _formatFinalReplyRepairEvidence({ toolContext = '', toolEvidence = [], relevancePlan = null } = {}) {
  const requestedProductImage = _relevancePlanRequestsProductImage(relevancePlan);
  const imageUrls = requestedProductImage
    ? _extractImageUrlsFromEvidence(toolEvidence).slice(0, 5)
    : [];
  const evidence = {
    intent: relevancePlan?.intent || null,
    primaryTool: relevancePlan?.primaryTool || null,
    requestedProductImage,
    imageUrls,
    toolResultsText: String(toolContext || '').slice(0, 5000),
    tools: (toolEvidence || []).map(entry => ({
      tool: entry.tool,
      success: Boolean(entry.success),
      readOnly: entry.readOnly !== false,
      result: entry.result || null,
      error: entry.error || null,
    })),
  };
  return JSON.stringify(evidence, null, 2);
}

async function executeToolLoop({
  agent,
  llmResult,
  llmResponse,
  messages,
  relevancePlan,
  intentMessage,
  nativeTools,
  intentContext,
  task,
  isCustomerReplyChannel,
  customerReplySourceMessage,
  formattedHistory,
  traceId,
  followUpGenerationOptions,
  executedTools,
  toolEvidence,
  canRepairCustomerReply,
  customerVoiceProfile = '',
  runId,
}) {
  let rounds = 0;
  let currentLlmResult = llmResult;
  let currentLlmResponse = llmResponse;
  let hasToolCallLeak = false;

  while (rounds < MAX_TOOL_ROUNDS) {
    const nativeCalls = _normalizeNativeToolCalls(currentLlmResult.toolCalls);
    const legacyCalls = nativeCalls.length > 0
      ? []
      : _normalizeLegacyToolCalls(currentLlmResponse);
    const toolCalls = nativeCalls.length > 0 ? nativeCalls : legacyCalls;
    if (toolCalls.length === 0) break;

    // Track if any round contains leaked internal tool syntax
    if (legacyCalls.length > 0 || containsInternalToolSyntax(currentLlmResponse)) {
      hasToolCallLeak = true;
    }

    rounds++;
    const toolResults = [];

    for (const call of toolCalls) {
      const handoffExecution = isCustomerReplyChannel && call.tool === 'agent.handoff'
        ? intentExecutionRouter._getModelClassifiedHandoffExecution(relevancePlan, intentMessage, nativeTools, {
          ...intentContext,
          conversationId: task.conversationId || null,
        })
        : null;
      const tool = handoffExecution?.tool || call.tool;
      const nativeName = handoffExecution?.nativeName || call.nativeName;
      const params = _mergeCustomerActionContext(
        tool,
        handoffExecution?.params || call.params,
        { task, intentContext }
      );
      const legacy = call.legacy;
      const customerParamValidation = isCustomerReplyChannel && !handoffExecution
        ? _validateCustomerToolCallParams(tool, params)
        : { valid: true };

      let result;
      if (!customerParamValidation.valid) {
        result = {
          success: false,
          readOnly: true,
          error: customerParamValidation.error,
          result: {
            blocked: true,
            reason: customerParamValidation.error,
          },
        };
      } else if (tool.startsWith('mcp_')) {
        const { getMcpRegistry } = require('../McpServerRegistry');
        const mcpRegistry = getMcpRegistry();
        const mcpTools = mcpRegistry.getAllAgentTools();
        const mcpTool = mcpTools.find(t => t.name === tool);
        if (mcpTool) {
          result = await mcpTool.handler(agent.companyId, params);
        } else {
          result = { success: false, readOnly: true, error: `MCP_TOOL_NOT_FOUND:${tool}` };
        }
      } else {
        result = await agentToolGatewayService.execute({
          companyId: agent.companyId,
          agent,
          tool,
          nativeName,
          params,
          traceId,
          source: handoffExecution ? 'model-classified-action' : (legacy ? 'text-tool-call' : 'native-tool-call'),
          relevancePlan,
          userMessage: intentMessage,
          runId,
        });
      }
      const resultText = _formatToolResultForPrompt(tool, result);
      const promptResultText = isCustomerReplyChannel
        ? _redactSensitiveCustomerToolResult(resultText)
        : resultText;
      toolResults.push(`• Tool result for ${tool}:\n${promptResultText}`);
      executedTools.push({
        tool,
        success: Boolean(result.success),
        readOnly: result.readOnly !== false,
        error: result.error || null,
        result: result.result || null,
        ...(handoffExecution ? { modelClassified: true } : {}),
      });
      toolEvidence.push({
        tool,
        success: Boolean(result.success),
        readOnly: result.readOnly !== false,
        result: result.result,
        error: result.error || null,
        ...(handoffExecution ? { modelClassified: true } : {}),
      });
    }

    const toolContext = toolResults.join('\n\n');
    const executedHandoffToolThisRound = toolCalls.some(call => call.tool === 'agent.handoff');
    if (isCustomerReplyChannel && executedHandoffToolThisRound) {
      const enrichedToolContext = await customerKnowledgeEvidence.appendSupportKnowledgeEvidence({
        companyId: agent.companyId,
        customerId: intentContext?.customerId || null,
        message: customerReplySourceMessage,
        relevancePlan,
        isCustomerReplyChannel,
        toolContext,
        executedTools,
        toolEvidence,
      });
      currentLlmResult = await agent.generateWithLLMResult(
        customerReplyEngine._buildCompactCustomerReplyMessages({
          agentName: agent.name,
          role: agent.role,
          userMessage: customerReplySourceMessage,
          toolContext: enrichedToolContext,
          toolEvidence,
          relevancePlan,
          conversationHistory: formattedHistory,
          voiceProfile: customerVoiceProfile,
          taskInstruction: 'Write one natural customer-facing reply. Confirm support review for the actionable request, and also address any other latest-message ask using history/evidence. If evidence is missing for another ask, acknowledge it briefly and request the minimum missing detail without promises.',
        }),
        {
          temperature: 0.55,
          maxTokens: 1024,
          estimatedTokens: 1800,
        }
      );

      if (currentLlmResult) {
        currentLlmResponse = currentLlmResult.text || '';
      }
      break;
    }

    if (isCustomerReplyChannel) {
      currentLlmResult = await agent.generateWithLLMResult(
        customerReplyEngine._buildCompactCustomerReplyMessages({
          agentName: agent.name,
          role: agent.role,
          userMessage: customerReplySourceMessage,
          toolContext,
          toolEvidence,
          relevancePlan,
          conversationHistory: formattedHistory,
          voiceProfile: customerVoiceProfile,
          taskInstruction: 'Write one final natural customer-facing reply. Use ONLY the structured tool evidence as trusted current data — never use your training knowledge for product names, prices, colors, or sizes. If product.search succeeded: list each product by name and price. For colors and sizes, use ONLY the exact values from the variantSummary field in the tool result — do not rename, substitute, or invent any color or size. Do not redirect to any store URL or catalog link. If a tool failed, briefly explain the failure and ask for the minimum next step.',
        }),
        {
          temperature: 0.55,
          maxTokens: 1024,
          estimatedTokens: 1800,
        }
      );
      currentLlmResponse = currentLlmResult?.text || '';
      break;
    }

    if (nativeCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: currentLlmResponse || null,
        tool_calls: nativeCalls.map(call => call.raw).filter(Boolean),
      });
      for (const call of nativeCalls) {
        const rendered = String(toolResults[nativeCalls.indexOf(call)] || '').slice(0, 3500);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.nativeName,
          content: rendered,
        });
      }
    } else {
      messages.push({
        role: 'user',
        content: `[نتائج الأدوات]\n${toolContext}\n[/نتائج الأدوات]\n\nبناءً على البيانات أعلاه، أجب على سؤال المستخدم بالعربية ولا تكرر أي صيغة أدوات داخلية مثل CALL_TOOL أو tool_calls أو DSML.`,
      });
    }

    currentLlmResult = await agent.generateWithLLMResult(messages, {
      temperature: 0.55,
      maxTokens: 1024,
      ...followUpGenerationOptions,
    });

    if (!currentLlmResult) break;
    currentLlmResponse = currentLlmResult.text || '';

    if (_normalizeNativeToolCalls(currentLlmResult.toolCalls).length === 0 && _normalizeLegacyToolCalls(currentLlmResponse).length === 0) break;
  }

  return {
    llmResult: currentLlmResult,
    llmResponse: currentLlmResponse,
    toolRounds: rounds,
    hasToolCallLeak,
  };
}

module.exports = {
  _safeJsonParse,
  _safeJsonClone,
  _normalizeNativeToolCalls,
  _mergeCustomerActionContext,
  _validateCustomerToolCallParams,
  _modelSupportsNativeToolCalling,
  _normalizeLegacyToolCalls,
  _formatToolResultForPrompt,
  _normalizeEvidenceText,
  _containsSuccessClaim,
  _containsFailureAcknowledgement,
  _containsCatalogFailureAcknowledgement,
  _containsToolProcessOnlyReply,
  _containsProductCreateClaim,
  _containsAgentSpawnClaim,
  _containsSkillCreateClaim,
  _containsOrderDraftCreateClaim,
  _containsCurrentCatalogClaim,
  _parseAgentCountClaim,
  _extractAgentEvidence,
  _hasSuccessfulOrderDraftEvidence,
  _relevancePlanRequestsProductImage,
  _extractImageUrlsFromEvidence,
  _replyContainsImageUrl,
  _validateGroundedReply,
  _formatFinalReplyRepairEvidence,
  executeToolLoop,
};
