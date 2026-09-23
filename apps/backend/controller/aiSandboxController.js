const path = require('path');
const fs = require('fs');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');
const aiSandboxService = require('../services/aiSandboxService');
const { calculateCost, getModelCost } = require('../config/modelCosts');
const MAX_SANDBOX_MESSAGE_CHARS = 12000;
const MAX_SANDBOX_RESPONSE_CHARS = 12000;
const MAX_SANDBOX_SESSION_ID_CHARS = 120;
const MAX_SANDBOX_TOOL_CALLS = 20;
const MAX_SANDBOX_AGENT_INSTRUCTION_CHARS = 5000;
const MAX_SANDBOX_ATTACHMENTS = 5;
const MAX_SANDBOX_ATTACHMENT_DATA_CHARS = 12 * 1024 * 1024;

const sandboxRunStates = new Map();

function createHttpError(code, statusCode = 400) {
  const error = new Error(code);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function sendCodeError(res, statusCode, code) {
  return res.status(statusCode).json({ success: false, error: code, code });
}

function getAiRuntimeErrorStatus(code) {
  return code === 'llm_rate_limited' ? 429 : 502;
}

function validateRequiredText(value, code, maxChars) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(code, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxChars) {
    throw createHttpError(`${code}_TOO_LONG`, 413);
  }
  return trimmed;
}

function validateOptionalSessionId(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > MAX_SANDBOX_SESSION_ID_CHARS) {
    throw createHttpError('INVALID_SESSION_ID', 400);
  }
  return value;
}

function normalizeSandboxAttachments(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw createHttpError('INVALID_ATTACHMENTS', 400);
  }
  if (value.length > MAX_SANDBOX_ATTACHMENTS) {
    throw createHttpError('ATTACHMENTS_TOO_LONG', 413);
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw createHttpError('INVALID_ATTACHMENT', 400);
    }
    const type = String(item.type || item.kind || '').trim().toLowerCase() || 'image';
    const mimeType = String(item.mimeType || item.mime_type || item.contentType || item.content_type || '').trim();
    const url = String(item.url || item.imageUrl || item.image_url || item.fileUrl || item.file_url || '').trim();
    const dataUrl = String(item.dataUrl || item.data_url || '').trim();
    const base64Data = String(item.base64Data || item.base64_data || item.imageBytes || item.image_bytes || '').trim();
    if (dataUrl.length > MAX_SANDBOX_ATTACHMENT_DATA_CHARS || base64Data.length > MAX_SANDBOX_ATTACHMENT_DATA_CHARS) {
      throw createHttpError('ATTACHMENT_TOO_LARGE', 413);
    }
    if (!url && !dataUrl && !base64Data) {
      throw createHttpError('ATTACHMENT_SOURCE_REQUIRED', 400);
    }
    return {
      type,
      mime_type: mimeType || undefined,
      url: url || undefined,
      data_url: dataUrl || undefined,
      base64_data: base64Data || undefined,
      name: typeof item.name === 'string' ? item.name.slice(0, 255) : undefined,
      detail: ['low', 'high', 'auto', 'original'].includes(String(item.detail || '').toLowerCase())
        ? String(item.detail).toLowerCase()
        : undefined,
      metadata: item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? item.metadata
        : undefined,
    };
  });
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseSandboxMessageMetadata(value) {
  const metadata = parseJsonObject(value, null);
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : null;
}

function normalizeStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') {
    return Array.from(value).map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'object') {
    return Object.keys(value).map(item => String(item || '').trim()).filter(Boolean);
  }
  return [];
}

function compactPromptText(value, maxChars = MAX_SANDBOX_AGENT_INSTRUCTION_CHARS) {
  if (typeof value !== 'string') return '';
  const compacted = value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return compacted.length > maxChars ? compacted.slice(0, maxChars).trim() : compacted;
}

async function getAgentConfig(companyId, agentId) {
  try {
    return await aiServiceAdminClient.getAgent(companyId, agentId);
  } catch {
    return null;
  }
}

function createSandboxAgentMeta(templateSlug, companyId, config) {
  return {
    id: config.id || `${templateSlug}_${companyId}`,
    name: config.name || templateSlug,
    role: config.role || 'CUSTOMER_SALES',
    companyId,
    templateSlug,
    allowedTools: config.allowedTools || config.allowed_tools || [],
    allowedSkills: config.allowedSkills || config.allowed_skills || [],
    model: config.model || 'default',
    persona: config.persona || { soulInstructions: '' },
  };
}

function buildAiServiceAgentConfig(agent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    templateSlug: agent.templateSlug || agent.template_slug,
    version: agent.version || '1.0.0',
    model: agent.model,
    status: agent.status,
    parentId: agent.parentId,
    allowedTools: typeof agent.getTools === 'function'
      ? agent.getTools()
      : normalizeStringList(agent.allowedTools || agent.allowed_tools),
    allowedSkills: typeof agent.getSkills === 'function'
      ? agent.getSkills()
      : normalizeStringList(agent.allowedSkills || agent.allowed_skills),
    persona: agent.persona || {},
    policies: agent.policies || {},
  };
}

async function runSelectedAgentInPython({
  companyId,
  userId,
  agentBundle,
  agentId,
  messageText,
  threadId,
  conversationId,
  memoryContext,
  attachments = [],
  modelSelection,
  channel = 'FACEBOOK',
}) {
  // Route all sandbox AI to the Python ai-service (always, for all companies)
  const agentConfig = buildAiServiceAgentConfig(agentBundle.sandboxAgent);
  if (modelSelection?.model) {
    agentConfig.model = modelSelection.model;
    agentConfig.provider = modelSelection.provider || agentConfig.provider;
    agentConfig.keyId = modelSelection.key?.id || agentConfig.keyId;
  }
  const result = await aiServiceAdminClient.chatWithAgent({
    companyId,
    agentId,
    message: messageText,
    threadId,
    conversationId,
    customerId: userId || null,
    channel,
    agentConfig,
    memoryContext,
    attachments,
  });

  if (!result) {
    const error = createHttpError('AI_SERVICE_AGENT_CHAT_FAILED', 502);
    error.reason = 'ai-service unreachable';
    throw error;
  }

  const data = result.ok === true && result.data ? result.data : result;
  if (data.ok === false || data.success === false) {
    const error = createHttpError('AI_SERVICE_AGENT_CHAT_FAILED', data.status || 502);
    error.reason = data.error
      || data.reason
      || JSON.stringify(data).slice(0, 500)
      || 'ai-service returned an error';
    throw error;
  }

  const tools = Array.isArray(data.tool_calls) ? data.tool_calls : [];
  return {
    agentId: data.agent_id || agentId,
    role: data.agent_role || agentBundle.sandboxAgent.role,
    status: data.status === 'awaiting_approval'
      ? 'PAUSED'
      : (data.status === 'ok' ? 'SUCCESS' : 'ERROR'),
      error: data.error || null,
      errorCode: data.error_code || null,
      result: {
        reply: data.reply || '',
        summary: data.reply || '',
        responseAttachments: Array.isArray(data.response_attachments) ? data.response_attachments : [],
        error: data.error || null,
      errorCode: data.error_code || null,
      toolsUsed: tools.length > 0,
      toolRounds: tools.length > 0 ? 1 : 0,
      tools,
      repaired: false,
      presentedFromToolResults: false,
      goalRun: null,
      status: data.status,
      thread_id: data.thread_id || threadId,
      draft_id: data.draft_id || null,
      runtime: data.runtime || 'python-agent',
      pipelineTrace: data.pipeline_trace && typeof data.pipeline_trace === 'object'
        ? data.pipeline_trace
        : null,
      compiledSystemPrompt: data.compiled_system_prompt || null,
    },
    modelSelection: data.model_selection || null,
    usageMetadata: data.usage_metadata || data.usage || null,
    task: {
      currentMessage: messageText,
      sessionId: threadId,
      conversationId,
      channel,
    },
  };
}

function generateSandboxSessionId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildSandboxConversationId(companyId, userId, sessionId) {
  return `sandbox-chat:${companyId}:${userId || 'unknown'}:${sessionId}`;
}

function normalizeSandboxReply(text) {
  if (!text || typeof text !== 'string') return text || '';
  try {
    let cleaned = text;

    // Strip XML-like reasoning blocks: <thought>, <thinking>, <reason>, <analysis>, <reasoning>.
    cleaned = cleaned.replace(/<(thought|thinking|reason|analysis|reasoning)[^>]*>[\s\S]*?<\/\1>/gi, '');
    cleaned = cleaned.replace(/<\/?(?:thought|thinking|reason|analysis|reasoning)[^>]*>/gi, '');

    // Split into lines and filter reasoning/draft lines that should never reach users.
    const lines = cleaned.split('\n');
    const bulletRe = /^\s*[*\-]\s*\*?\s*/;
    const draftRe = /Draft\s+\d+/i;
    const reasoningKeywordRe = /^\s*[*\-]\s*\*?\s*(?:Option|Goal|Context|Constraint|User\s*Question|Agent\s*(?:Identity|Persona)|Persona|Knowledge\s*Base|Knowledge|Refined|Analysis|Reasoning|Input|Meaning|Language|Plan|Step|Note|Consideration|Evaluation|Draft|Final(?:\s*Answer)?|Response|Output)[\s\d]*:/i;
    const checklistRe = /\?\s*(?:Yes|No|Maybe|Y|N|true|false|✓|✗)\b/i;
    const bracketReasoningRe = /^\s*\[[^\]]+\]\s*(?:Yes|No|Maybe|Y|N|true|false|✓|✗)?\s*$/i;
    const monologueRe = /^\s*[*\-]\s*\*?\s*(?:The\s+user|I\s+(?:need|should|will|must|think|can|have)|Usually,|The\s+goal|The\s+persona|Agent\s+(?:Identity|Persona)|Knowledge\s*Base|Final(?:\s+answer)?|Response|Output)\b/i;

    const kept = [];
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      const isBullet = bulletRe.test(trimmed);
      if (isBullet && (draftRe.test(trimmed) || reasoningKeywordRe.test(trimmed) || checklistRe.test(trimmed) || monologueRe.test(trimmed))) continue;
      if (bracketReasoningRe.test(trimmed)) continue;
      kept.push(rawLine);
    }

    cleaned = kept.join('\n').trim();

    // Collapse more than two consecutive blank lines left by stripping reasoning.
    cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

    return cleaned || text;
  } catch (err) {
    console.error('[normalizeSandboxReply] error', err.message);
    return text;
  }
}

function extractSandboxReply(taskResult) {
  if (!taskResult) return '';
  if (typeof taskResult === 'string') return normalizeSandboxReply(taskResult);
  return normalizeSandboxReply(
    taskResult?.result?.reply ||
    taskResult?.result?.summary ||
    taskResult?.result?.response ||
    ''
  );
}

function extractResponseAttachments(taskResult) {
  const candidates = [
    taskResult?.responseAttachments,
    taskResult?.response_attachments,
    taskResult?.result?.responseAttachments,
    taskResult?.result?.response_attachments,
    taskResult?.raw?.response_attachments,
    taskResult?.result?.raw?.response_attachments,
  ];
  const found = candidates.find(Array.isArray);
  if (!Array.isArray(found)) return [];
  return found
    .filter(item => item && typeof item === 'object' && typeof item.url === 'string' && item.url.trim())
    .slice(0, MAX_SANDBOX_ATTACHMENTS)
    .map(item => ({
      type: String(item.type || 'image'),
      url: item.url.trim(),
      source: typeof item.source === 'string' ? item.source : undefined,
      tool: typeof item.tool === 'string' ? item.tool : undefined,
    }));
}

function extractSandboxModelSelection(taskResult, agentInfo = {}) {
  const selection = taskResult?.modelSelection || taskResult?.result?.modelSelection || agentInfo?.lastModelSelection || null;
  if (!selection || typeof selection !== 'object') {
    return agentInfo?.selectedModel || agentInfo?.selectedProvider
      ? {
        provider: agentInfo.selectedProvider || null,
        model: agentInfo.selectedModel || agentInfo.model || null,
      }
      : null;
  }

  return {
    provider: selection.provider || null,
    model: selection.model || null,
    keyId: selection.keyId || null,
    keyName: selection.keyName || null,
    selectedPool: selection.selectedPool || null,
    activeProvider: selection.activeProvider || null,
    manualOverride: selection.manualOverride || false,
    error: selection.error || null,
    message: selection.message || null,
    retryAfter: selection.retryAfter || null,
  };
}

function toNonNegativeInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
}

function normalizeSandboxUsage(taskResult) {
  const usageCandidates = [
    taskResult?.usageMetadata,
    taskResult?.usage,
    taskResult?.raw?.usageMetadata,
    taskResult?.raw?.usage,
    taskResult?.result?.usageMetadata,
    taskResult?.result?.usage,
    taskResult?.result?.raw?.usageMetadata,
    taskResult?.result?.raw?.usage,
  ];
  const usage = usageCandidates.find(candidate => candidate && typeof candidate === 'object') || {};
  const input = toNonNegativeInteger(
    usage.promptTokenCount
    ?? usage.prompt_tokens
    ?? usage.inputTokens
    ?? usage.input_tokens
    ?? usage.input
  );
  const output = toNonNegativeInteger(
    usage.candidatesTokenCount
    ?? usage.completion_tokens
    ?? usage.outputTokens
    ?? usage.output_tokens
    ?? usage.output
  );
  const explicitTotal = toNonNegativeInteger(
    usage.totalTokenCount
    ?? usage.total_tokens
    ?? usage.totalTokens
    ?? usage.total
  );
  return {
    input,
    output,
    total: explicitTotal || input + output,
  };
}

function mapSandboxToolsToToolCalls(tools = []) {
  if (!Array.isArray(tools)) return [];
  return tools.slice(0, MAX_SANDBOX_TOOL_CALLS).map((tool, index) => {
    const input = tool?.params && typeof tool.params === 'object'
      ? tool.params
      : (tool?.action_args && typeof tool.action_args === 'object' ? tool.action_args : {});
    const output = tool?.result && typeof tool.result === 'object'
      ? tool.result
      : (tool?.output && typeof tool.output === 'object' ? tool.output : {});
    const outputStatus = typeof output?.status === 'string' ? output.status.trim() : '';
    const structuredToolStatuses = new Set([
      'awaiting_approval',
      'success',
      'error',
      'failed',
      'pending',
      'completed',
      'blocked',
    ]);
    const status = typeof tool?.status === 'string' && tool.status.trim()
      ? tool.status.trim()
      : (structuredToolStatuses.has(outputStatus.toLowerCase())
        ? outputStatus
        : (tool?.success ? 'success' : 'error'));
    return {
      id: `${tool?.tool || tool?.name || 'tool'}-${index + 1}`,
      name: tool?.tool || tool?.name || 'unknown',
      input,
      output,
      status,
      latencyMs: tool?.latencyMs || undefined,
      timestamp: new Date().toISOString(),
      error: tool?.error || undefined,
    };
  });
}

function parseStoredJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getToolOutputProduct(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') return null;
  const output = getToolOutputPayload(toolCall);
  if (!output) return null;
  if (output.product && typeof output.product === 'object') return output.product;
  for (const key of ['products', 'items', 'matches', 'results']) {
    if (Array.isArray(output[key]) && output[key][0] && typeof output[key][0] === 'object') {
      return output[key][0];
    }
  }
  return output;
}

function normalizeSandboxToolName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/^agenttool__/, '').replace(/\./g, '_');
  const map = {
    product_search: 'product.search',
    inventory_check: 'inventory.check',
    shipping_rates: 'shipping.rates',
    order_create_draft: 'order.create_draft',
    order_create_confirmed: 'order.create_confirmed',
  };
  return map[compact] || raw;
}

function getToolInputPayload(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') return {};
  for (const key of ['input', 'params', 'arguments', 'action_args', 'actionArgs']) {
    const value = toolCall[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }
  return {};
}

function getToolOutputPayload(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') return null;
  for (const key of ['output', 'result']) {
    const value = toolCall[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.output && typeof value.output === 'object' && !Array.isArray(value.output)) {
        return value.output;
      }
      if (value.result && typeof value.result === 'object' && !Array.isArray(value.result)) {
        return value.result;
      }
      return value;
    }
  }
  return null;
}

function mergeIfObject(...values) {
  return values.reduce((acc, value) => (
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...acc, ...value }
      : acc
  ), {});
}

function extractPipelineTraceToolCalls(metadata) {
  const trace = metadata?.pipelineTrace && typeof metadata.pipelineTrace === 'object'
    ? metadata.pipelineTrace
    : null;
  const executions = Array.isArray(trace?.toolExecutions) ? trace.toolExecutions : [];
  return executions.map(execution => ({
    name: execution.name || execution.tool,
    input: execution.params || {},
    output: execution.output || {},
    status: execution.status,
    success: execution.success,
  }));
}

function applySandboxToolMemory(toolMemory, toolCall) {
  const toolName = normalizeSandboxToolName(toolCall?.name || toolCall?.tool);
  const input = getToolInputPayload(toolCall);
  const output = getToolOutputPayload(toolCall) || {};
  const product = getToolOutputProduct(toolCall);

  if (toolName === 'product.search') {
    toolMemory.lastProductResult = product || output;
    if (product) toolMemory.selectedProduct = product;
  } else if (toolName === 'inventory.check') {
    toolMemory.lastInventoryParams = input;
    toolMemory.lastInventoryResult = output;
    if (product) toolMemory.selectedProduct = product;
  } else if (toolName === 'shipping.rates') {
    toolMemory.lastShippingResult = mergeIfObject(input, output);
  } else if (toolName === 'order.create_draft' || toolName === 'order.create_confirmed') {
    toolMemory.lastOrderCandidate = mergeIfObject(input, output);
  }
}

function mergeSandboxToolMemory(baseContext, toolMemory) {
  const context = baseContext && typeof baseContext === 'object' ? baseContext : {};
  const memory = toolMemory && typeof toolMemory === 'object' ? toolMemory : {};
  return { ...context, ...memory };
}

function hydrateSandboxWorkingMemory(companyId, conversationId, sessionMessages = []) {
  const toolMemory = {};
  for (const message of sessionMessages) {
    if (!message || message.role !== 'assistant') continue;
    const toolCalls = parseStoredJson(message.toolCalls, []);
    const metadata = parseSandboxMessageMetadata(message.metadata);
    const combinedToolCalls = [
      ...(Array.isArray(toolCalls) ? toolCalls : []),
      ...extractPipelineTraceToolCalls(metadata),
    ];
    for (const toolCall of combinedToolCalls) {
      applySandboxToolMemory(toolMemory, toolCall);
    }
  }
  return toolMemory;
}

async function createSandboxRuntimeAgent(companyId, agentId, modelSelection) {
  const agentConfig = await getAgentConfig(companyId, agentId);
  let runtimeAgent = agentConfig;
  // 2026: ai-service API (AgentRead) is the single source of truth; no more Prisma fallback
  if (!runtimeAgent) {
    return null;
  }

  const modelPolicy = {
    ...(runtimeAgent.policies?.modelPolicy || {}),
    default: modelSelection.model,
    model: modelSelection.model,
    provider: modelSelection.provider,
    keyId: modelSelection.key.id,
  };

  const templateSlug = runtimeAgent.templateSlug || runtimeAgent.role.toLowerCase().replace(/_/g, '-');

  const sandboxConfig = {
    id: runtimeAgent.id,
    name: runtimeAgent.name,
    role: runtimeAgent.role,
    model: modelSelection.model,
    allowedTools: normalizeStringList(runtimeAgent.allowedTools || runtimeAgent.allowed_tools),
    allowedSkills: normalizeStringList(runtimeAgent.allowedSkills || runtimeAgent.allowed_skills),
    persona: {
      ...(runtimeAgent.persona || {}),
      modelPolicy,
    },
    policies: {
      ...(runtimeAgent.policies || {}),
      modelPolicy,
    },
  };

  const sandboxAgent = createSandboxAgentMeta(
    runtimeAgent.role === 'CEO' ? 'ceo' : templateSlug,
    companyId,
    sandboxConfig
  );

  if (sandboxAgent.allowedTools && runtimeAgent.allowedTools) {
    runtimeAgent.allowedTools = sandboxAgent.allowedTools;
  }

  return { runtimeAgent, sandboxAgent };
}

async function runSandboxChatTurn({
  companyId,
  userId,
  sessionId,
  messageText,
  agentId,
  modelSelection,
  attachments = [],
}) {
  const existingSession = sessionId
    ? await aiSandboxService.getSession(sessionId, companyId)
    : null;

  if (sessionId && !existingSession) {
    throw createHttpError('SESSION_NOT_FOUND', 404);
  }

  const reusableSession = existingSession?.agentId === agentId ? existingSession : null;
  const resolvedSessionId = reusableSession ? sessionId : generateSandboxSessionId();
  const conversationId = buildSandboxConversationId(companyId, userId, resolvedSessionId);
  const toolMemory = hydrateSandboxWorkingMemory(companyId, conversationId, reusableSession?.messages || []);
  const conversationHistory = (reusableSession?.messages || [])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));
  const promptCtx = mergeSandboxToolMemory({ messageText, sessionId: resolvedSessionId, recentMessages: conversationHistory }, toolMemory);
  const agentBundle = await createSandboxRuntimeAgent(companyId, agentId, modelSelection);
  if (!agentBundle) {
    throw createHttpError('AGENT_NOT_FOUND', 400);
  }

  const turnStartTime = Date.now();
  const taskResult = await runSelectedAgentInPython({
    companyId,
    userId,
    agentBundle,
    agentId,
    messageText,
    threadId: resolvedSessionId,
    conversationId,
    memoryContext: promptCtx,
    attachments,
    modelSelection,
    channel: 'FACEBOOK',
  });

  const reply = extractSandboxReply(taskResult);
  if (!reply) {
    const errorCode = taskResult?.errorCode || taskResult?.result?.errorCode || 'AI_SANDBOX_EMPTY_REPLY';
    const error = createHttpError(
      errorCode,
      getAiRuntimeErrorStatus(errorCode)
    );
    error.reason = taskResult?.error || taskResult?.result?.error || '';
    error.taskResult = taskResult;
    throw error;
  }

  const toolCalls = mapSandboxToolsToToolCalls(taskResult?.result?.tools || []);
  const responseAttachments = extractResponseAttachments(taskResult);
  const agentInfo = agentBundle.sandboxAgent;
  const modelSelectionFromTask = extractSandboxModelSelection(taskResult, agentInfo);
  const pipelineTrace = taskResult?.result?.pipelineTrace || null;
  const compiledSystemPrompt = taskResult?.result?.compiledSystemPrompt || null;

  if (!reusableSession) {
    await aiSandboxService.createSession({
      id: resolvedSessionId,
      companyId,
      userId: userId || 'unknown',
      title: `Test ${Date.now()}`,
      agentId,
      agentName: agentBundle.runtimeAgent?.name || null,
      agentRole: agentBundle.runtimeAgent?.role || null,
      model: modelSelection.model,
      provider: modelSelection.provider,
      keyId: modelSelection.key.id || null,
    });
  }

  const sessionTokens = normalizeSandboxUsage(taskResult);
  const sessionCost = calculateCost(modelSelection.model, sessionTokens.input, sessionTokens.output);
  const latencyMs = Date.now() - turnStartTime;
  const runtime = taskResult?.result?.runtime || 'unknown';

  await aiSandboxService.addMessage(resolvedSessionId, companyId, {
    role: 'user',
    content: messageText,
    model: modelSelection.model,
    provider: modelSelection.provider,
    keyId: modelSelection.key.id,
    keyName: modelSelection.key.name,
    latencyMs: 0,
    cost: 0,
    metadata: attachments.length ? { attachments } : null,
  });

  await aiSandboxService.addMessage(resolvedSessionId, companyId, {
    role: 'assistant',
    content: reply,
    model: modelSelection.model,
    provider: modelSelection.provider,
    keyId: modelSelection.key.id,
    keyName: modelSelection.key.name,
    tokensInput: sessionTokens.input,
    tokensOutput: sessionTokens.output,
    latencyMs,
    cost: sessionCost,
    toolCalls,
    toolCallCount: toolCalls.length,
    metadata: {
      ...(pipelineTrace ? { pipelineTrace } : {}),
      ...(runtime ? { runtime } : {}),
      ...(responseAttachments.length ? { responseAttachments } : {}),
    },
  });

  return {
    reply,
    responseAttachments,
    toolCalls,
    tokens: sessionTokens,
    latencyMs,
    model: modelSelection.model,
    provider: modelSelection.provider,
    keyId: modelSelection.key.id,
    keyName: modelSelection.key.name,
    keyScope: 'central',
    cost: sessionCost,
    agentId,
    sessionId: resolvedSessionId,
    conversationId,
    modelSelection: modelSelectionFromTask,
    taskResult,
    agentInfo,
    usedFallbackKey: modelSelection.usedFallbackKey ?? false,
    runtime,
    pipelineTrace,
    compiledSystemPrompt,
  };
}

async function getPreferredAiKeyIdForProvider(provider) {
  const providerName = String(provider || '').trim().toUpperCase();
  if (!providerName) return null;

  const getPreferredFromConfig = (config) => {
    const settings = parseJsonObject(config?.settings);
    const preferredAiKeyIds = parseJsonObject(settings.preferredAiKeyIds);
    const keyId = preferredAiKeyIds[providerName];
    return typeof keyId === 'string' && keyId.trim() ? keyId.trim() : null;
  };

  try {
    const prisma = getSharedPrismaClient();
    if (prisma.globalAiConfig?.findMany) {
      const configs = await prisma.globalAiConfig.findMany({
        select: { settings: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      });
      for (const config of Array.isArray(configs) ? configs : []) {
        const keyId = getPreferredFromConfig(config);
        if (keyId) return keyId;
      }
    }

    if (!prisma.globalAiConfig?.findFirst) return null;
    return getPreferredFromConfig(await prisma.globalAiConfig.findFirst({
      select: { settings: true },
      orderBy: { updatedAt: 'desc' },
    }));
  } catch {
    return null;
  }
}

async function loadAgentOrgMetadata(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    // 2026: Department/org metadata from ai-service AgentRead (no more company_agents reads)
    const agents = await aiServiceAdminClient.listAgents(companyId);
    return new Map((agents || []).map(a => [a.id, {
      id: a.id,
      departmentId: a.departmentId || a.department_id || null,
      departmentKey: a.departmentKey || a.department_key || null,
      departmentName: a.departmentName || a.department_name || null,
      departmentIcon: a.departmentIcon || a.department_icon || null,
      managerType: a.managerType || a.manager_type || null,
    }]));
  } catch (_) {
    return new Map();
  }
}

async function listTenantAIKeys(companyId, includeSecret = false, options = {}) {
  return tenantContext.bypass(async () => {
    const prisma = getSharedPrismaClient();
    const includeInactive = Boolean(options.includeInactive);
    const select = {
      id: true,
      name: true,
      provider: true,
      keyType: true,
      companyId: true,
      isActive: true,
      priority: true,
    };
    if (includeSecret) {
      select.apiKey = true;
      select.baseUrl = true;
    }
    const keys = await prisma.aiKey.findMany({
      where: {
        keyType: 'CENTRAL',
        ...(includeInactive ? {} : { isActive: true }),
      },
      select,
      orderBy: { priority: 'asc' },
    });
    return (keys || []).filter(key => key.keyType === 'CENTRAL' && (includeInactive || key.isActive === true));
  });
}

function getAgentModelHints(agentConfig) {
  const config = parseJsonObject(agentConfig?.config, {});
  let provider = String(
    config.provider || config.providerType || agentConfig?.provider || ''
  ).trim().toUpperCase();
  if (provider === 'GEMINI') provider = 'GOOGLE';
  const keyId = String(
    config.keyId || config.key_id || agentConfig?.keyId || agentConfig?.key_id || ''
  ).trim();
  const configuredModel = String(agentConfig?.model || config.model || '').trim();
  return { model: configuredModel, provider, keyId };
}

async function resolveRequestedSandboxModelSelection(companyId, { provider, model, keyId }) {
  return tenantContext.bypass(async () => {
    let requestedProvider = String(provider || '').trim().toUpperCase();
    if (requestedProvider === 'GEMINI') {
      requestedProvider = 'GOOGLE';
    }
    const requestedModel = String(model || '').trim();
    const requestedKeyId = typeof keyId === 'string' ? keyId.trim() : '';

    if (!requestedProvider || !requestedModel) {
      throw createHttpError('MODEL_NOT_ALLOWED', 400);
    }

    const aiKeys = await listTenantAIKeys(companyId, true);
    const providerKeys = aiKeys.filter(key => key.provider === requestedProvider);
    if (providerKeys.length === 0) {
      throw createHttpError('MODEL_NOT_ALLOWED', 400);
    }

    const modelConfigs = await getSharedPrismaClient().aiModelConfig.findMany({
      where: {
        isEnabled: true,
        keyId: { in: providerKeys.map(key => key.id) },
        modelName: requestedModel,
      },
      orderBy: { priority: 'asc' },
    });

    if (requestedKeyId) {
      const selectedKey = providerKeys.find(key => key.id === requestedKeyId);
      const selectedConfig = selectedKey
        ? modelConfigs.find(config => config.keyId === requestedKeyId && config.modelName === requestedModel)
        : null;
      if (!selectedKey || !selectedConfig) {
        throw createHttpError('MODEL_NOT_ALLOWED', 400);
      }
      return {
        provider: requestedProvider,
        model: requestedModel,
        key: selectedKey,
      };
    }

    const preferredKeyId = await getPreferredAiKeyIdForProvider(requestedProvider);
    const preferredConfig = modelConfigs.find(config => (
      preferredKeyId && config.keyId === preferredKeyId && config.modelName === requestedModel
    ));
    const selectedConfig = preferredConfig || modelConfigs.find(config => config.modelName === requestedModel);
    const selectedKey = selectedConfig
      ? providerKeys.find(key => key.id === selectedConfig.keyId)
      : null;

    if (!selectedKey) {
      throw createHttpError('MODEL_NOT_ALLOWED', 400);
    }

    const usedFallbackKey = !preferredConfig && !!preferredKeyId;

    return {
      provider: requestedProvider,
      model: requestedModel,
      key: selectedKey,
      usedFallbackKey,
    };
  });
}

async function resolveSandboxModelSelection(companyId, { provider, model, keyId, agentId }) {
  return tenantContext.bypass(async () => {
    const requestedProvider = String(provider || '').trim().toUpperCase();
    const requestedModel = String(model || '').trim();
    const requestedKeyId = typeof keyId === 'string' ? keyId.trim() : '';
    const agentConfig = agentId ? await getAgentConfig(companyId, agentId) : null;
    const agentModel = getAgentModelHints(agentConfig);

    if (agentModel.model && !requestedProvider && !requestedModel) {
        let resolveProvider = agentModel.provider || '';
        if (!resolveProvider) {
          const modelCfgs = await getSharedPrismaClient().aiModelConfig.findMany({
            where: { isEnabled: true, modelName: agentModel.model },
            select: { keyId: true },
          });
          if (modelCfgs.length > 0) {
            const keys = await getSharedPrismaClient().aiKey.findMany({
              where: { id: { in: modelCfgs.map(c => c.keyId) }, isActive: true },
              select: { provider: true },
            });
            resolveProvider = keys[0]?.provider || '';
          }
        }
        const selection = await resolveRequestedSandboxModelSelection(companyId, {
          provider: resolveProvider,
          model: agentModel.model,
          keyId: agentModel.keyId || '',
        });
        return {
          ...selection,
          source: 'agent',
          requestedModel: null,
          requestedProvider: null,
        };
    }

    return resolveRequestedSandboxModelSelection(companyId, { provider, model, keyId });
  });
}

async function resolveEffectiveCompanyId(req, agentId = null, sessionId = null) {
  let companyId = req.user?.companyId || req.companyId || req.headers?.['x-company-id'] || req.headers?.['X-Company-Id'] || req.query?.companyId || req.body?.companyId;

  if (!companyId && agentId) {
    try {
      const prisma = getSharedPrismaClient();
      const rows = await prisma.$queryRawUnsafe(`SELECT company_id FROM ai.agents WHERE id = $1 LIMIT 1`, agentId);
      if (rows && rows[0]?.company_id) {
        companyId = rows[0].company_id;
      }
    } catch (err) {
      console.warn('[AI-SANDBOX] Failed to resolve company from agentId:', err.message);
    }
  }

  if (!companyId && sessionId) {
    try {
      const prisma = getSharedPrismaClient();
      const session = await prisma.aiSandboxSession.findUnique({
        where: { id: sessionId },
        select: { companyId: true, agentId: true },
      });
      if (session?.companyId) {
        companyId = session.companyId;
      } else if (session?.agentId) {
        const rows = await prisma.$queryRawUnsafe(`SELECT company_id FROM ai.agents WHERE id = $1 LIMIT 1`, session.agentId);
        if (rows && rows[0]?.company_id) {
          companyId = rows[0].company_id;
        }
      }
    } catch (err) {
      console.warn('[AI-SANDBOX] Failed to resolve company from sessionId:', err.message);
    }
  }

  if (!companyId && req.user?.role === 'SUPER_ADMIN') {
    try {
      const prisma = getSharedPrismaClient();
      const rows = await prisma.$queryRawUnsafe(`SELECT company_id FROM ai.agents WHERE company_id IS NOT NULL AND status != 'ARCHIVED' ORDER BY created_at DESC LIMIT 1`);
      if (rows && rows[0]?.company_id) {
        companyId = rows[0].company_id;
      } else {
        const firstCompany = await prisma.company.findFirst({ select: { id: true }, orderBy: { createdAt: 'desc' } });
        if (firstCompany?.id) {
          companyId = firstCompany.id;
        }
      }
    } catch (err) {
      console.warn('[AI-SANDBOX] Failed to resolve fallback company for SUPER_ADMIN:', err.message);
    }
  }

  return companyId || null;
}

async function listAgents(req, res) {
  try {
    const targetAgent = req.query?.agent || req.query?.agentId;
    let companyId = await resolveEffectiveCompanyId(req, targetAgent);
    if (!companyId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    // 2026: All agent data from ai-service API — no more Prisma companyAgent reads
    const apiAgents = await aiServiceAdminClient.listAgents(companyId || undefined);
    const activeAgents = (apiAgents || []).filter(a => a.status !== 'ARCHIVED');

    const agents = activeAgents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      icon: a.icon || '🤖',
      description: a.description || '',
      companyId: a.company_id || a.companyId || companyId || null,
      skills: (() => { try { return typeof a.skillsRaw === 'string' ? JSON.parse(a.skillsRaw || '[]') : (a.allowedSkills || a.allowed_skills || []); } catch { return []; } })(),
      allowedTools: a.allowedTools || a.allowed_tools || [],
      model: a.model || null,
      status: a.status,
      parentId: a.parentId || a.parent_id || null,
      templateSlug: a.templateSlug || a.template_slug || null,
      createdAt: a.created_at || a.createdAt,
      departmentId: a.departmentId || a.department_id || null,
      departmentKey: a.departmentKey || a.department_key || null,
      departmentName: a.departmentName || a.department_name || null,
      departmentIcon: a.departmentIcon || a.department_icon || null,
      managerType: a.managerType || a.manager_type || (a.role === 'CEO' ? 'AGENT' : 'DEPARTMENT_MANAGER'),
    }));

    return res.json({ success: true, agents, count: agents.length });
  } catch (error) {
    console.error('[AI-SANDBOX] listAgents error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getAgentProfile(req, res) {
  try {
    const { agentId } = req.params;
    if (!agentId) return res.status(400).json({ success: false, error: 'agentId required' });
    let companyId = await resolveEffectiveCompanyId(req, agentId);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId required' });

    // 2026: Agent data from ai-service API — no more Prisma companyAgent reads
    const agentData = await aiServiceAdminClient.getAgent(companyId, agentId);
    if (!agentData) return res.status(404).json({ success: false, error: 'AGENT_NOT_FOUND' });

    let templateFiles = {};
    let agentJson = {};
    const slug = agentData.templateSlug || agentData.template_slug;
    if (slug) {
      const templateDir = path.join(__dirname, '..', 'agents', slug);
      if (fs.existsSync(templateDir)) {
        const agentJsonPath = path.join(templateDir, 'agent.json');
        if (fs.existsSync(agentJsonPath)) {
          try { agentJson = JSON.parse(fs.readFileSync(agentJsonPath, 'utf8')); } catch {}
        }
        for (const file of ['SOUL.md', 'AGENTS.md', 'TOOLS.md', 'PERSONA.md']) {
          const filePath = path.join(templateDir, file);
          if (fs.existsSync(filePath)) {
            try { templateFiles[file] = fs.readFileSync(filePath, 'utf8'); } catch {}
          }
        }
      }
    }

    let skillIds = [];
    if (Array.isArray(agentData.allowed_skills) && agentData.allowed_skills.length) {
      skillIds = agentData.allowed_skills;
    } else {
      try { skillIds = JSON.parse(agentData.skillsRaw || agentData.skills || '[]'); } catch {}
      if (!skillIds.length && Array.isArray(agentJson.allowedSkills)) skillIds = agentJson.allowedSkills;
    }

    const allowedTools = Array.isArray(agentJson.allowedTools) ? agentJson.allowedTools : [];

    // Load skill.json files from ai-service (works both locally and on server)
    const aiServiceSkillsDir = path.join(__dirname, '..', '..', 'ai-service', 'skills');
    const loadSkillJson = (id) => {
      try {
        const p = path.join(aiServiceSkillsDir, id, 'skill.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {}
      return null;
    };

    const prisma = getSharedPrismaClient();
    let skillDetails = [];
    if (skillIds.length) {
      const dbSkillsById = new Map();
      try {
        const aiSkills = await prisma.$queryRawUnsafe(
          `SELECT id, name, description, instructions, allowed_tools, enabled, requires_human_approval, version
           FROM ai.skills
           WHERE (company_id = $1 OR company_id IS NULL)`,
          companyId
        );
        for (const s of (aiSkills || [])) {
          dbSkillsById.set(s.id, s);
        }
      } catch (err) {
        console.warn('[AI-SANDBOX] Could not query ai.skills:', err.message);
      }

      let dbSkillsByName = new Map();
      try {
        const rows = await prisma.companySkill.findMany({ where: { companyId, name: { in: skillIds } } });
        dbSkillsByName = new Map(rows.map(r => [r.name, r]));
      } catch {}

      skillDetails = skillIds.map(id => {
        const aiSkill = dbSkillsById.get(id);
        const db = dbSkillsByName.get(id);
        const sf = loadSkillJson(id);
        return {
          id,
          displayName: aiSkill?.name || sf?.displayName || db?.name || id,
          description: aiSkill?.description || sf?.description || db?.description || '',
          instructions: aiSkill?.instructions || db?.instructions || '',
          allowedTools: (aiSkill?.allowed_tools && Array.isArray(aiSkill.allowed_tools))
            ? aiSkill.allowed_tools
            : (sf?.allowedTools || (db ? (() => { try { return JSON.parse(db.tools || '[]'); } catch { return []; } })() : [])),
          enabled: aiSkill ? (aiSkill.enabled !== false) : (db ? db.enabled : true),
          version: aiSkill?.version || sf?.version || null,
          requiresHumanApproval: aiSkill?.requires_human_approval ?? (sf?.requiresHumanApproval ?? false),
        };
      });
    }

    // Fetch all live files from Python service (source of truth after saves)
    let pyLiveFiles = {};
    try {
      const pyResult = await aiServiceAdminClient.getAgentFiles(agentId, companyId);
      if (pyResult && pyResult.files && typeof pyResult.files === 'object') {
        pyLiveFiles = pyResult.files;
      }
    } catch (_e) {}

    const resolveFile = (key) => {
      const pyVal = pyLiveFiles[key];
      if (typeof pyVal === 'string' && pyVal.trim()) return pyVal;
      return templateFiles[key] || '';
    };

    return res.json({
      success: true,
      agent: {
        id: agentData.id,
        name: agentData.name,
        role: agentData.role,
        icon: agentData.icon || '🤖',
        description: agentData.description || '',
        model: agentData.model || agentJson.modelPolicy?.default || null,
        status: agentData.status,
        templateSlug: agentData.templateSlug || agentData.template_slug || null,
        config: agentData.config || {},
      },
      files: {
        'SOUL.md': resolveFile('SOUL.md') || agentData.soul || agentData.persona?.soulInstructions || '',
        'AGENTS.md': resolveFile('AGENTS.md'),
        'TOOLS.md': resolveFile('TOOLS.md'),
        'PERSONA.md': resolveFile('PERSONA.md'),
      },
      allowedTools,
      skills: skillDetails,
      skillIds,
      modelPolicy: agentJson.modelPolicy || null,
    });
  } catch (error) {
    console.error('[AI-SANDBOX] getAgentProfile error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function listModels(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;

    return await tenantContext.bypass(async () => {
      let providersMap = {};

      const aiKeys = await listTenantAIKeys(companyId, false, { includeInactive: true });
      const centralKeys = aiKeys.map(key => ({
        id: key.id,
        name: key.name,
        provider: key.provider,
        keyType: 'CENTRAL',
        scope: 'central',
        isActive: Boolean(key.isActive),
        priority: key.priority,
      }));

      for (const key of aiKeys) {
        if (!providersMap[key.provider]) {
          providersMap[key.provider] = {
            name: key.provider,
            label: getProviderLabel(key.provider),
            models: [],
          };
        }
      }

      const modelConfigs = await getSharedPrismaClient().aiModelConfig.findMany({
        where: {
          isEnabled: true,
          keyId: { in: aiKeys.map(k => k.id) },
        },
        orderBy: { priority: 'asc' },
      });

      const preferredByProvider = {};
      for (const pName of Object.keys(providersMap)) {
        preferredByProvider[pName] = await getPreferredAiKeyIdForProvider(pName);
      }

      for (const modelConfig of modelConfigs) {
        const key = aiKeys.find(k => k.id === modelConfig.keyId);
        if (key && providersMap[key.provider]) {
          const preferredKeyId = preferredByProvider[key.provider];
          providersMap[key.provider].models.push({
            id: modelConfig.modelName,
            label: getModelLabel(key.provider, modelConfig.modelName),
            keyId: key.id,
            keyName: key.name,
            keyType: 'CENTRAL',
            scope: 'central',
            keyIsActive: Boolean(key.isActive),
            isPreferred: preferredKeyId === key.id,
            isEnabled: modelConfig.isEnabled,
            isSelectable: Boolean(key.isActive) && Boolean(modelConfig.isEnabled),
            priority: modelConfig.priority,
            costPer1kInput: getModelCost(modelConfig.modelName).input,
            costPer1kOutput: getModelCost(modelConfig.modelName).output,
          });
        }
      }

      const providers = Object.values(providersMap).filter(p => p.models.length > 0);

      return res.json({ success: true, providers, centralKeys, count: providers.length });
    });
  } catch (error) {
    console.error('[AI-SANDBOX] listModels error:', error);
    return res.json({ success: true, providers: [], centralKeys: [], count: 0 });
  }
}

function getProviderLabel(provider) {
  const labels = {
    OPENAI: 'OpenAI',
    ANTHROPIC: 'Anthropic',
    GOOGLE: 'Google Gemini',
    DEEPSEEK: 'DeepSeek',
    GROQ: 'Groq',
    MISTRAL: 'Mistral',
    OLLAMA: 'Ollama',
    OPENROUTER: 'OpenRouter',
  };
  return labels[provider] || provider;
}

function getModelLabel(provider, modelName) {
  const labels = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
    'claude-3-opus': 'Claude 3 Opus',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'deepseek-flash': 'DeepSeek V4.1 Flash',
    'deepseek-v4-flash': 'DeepSeek V4 Flash (legacy alias)',
    'deepseek-v4-pro': 'DeepSeek V4 Pro (rerouted to V4.1)',
    'llama-3.3-70b': 'Llama 3.3 70B',
    'llama-3.1-70b': 'Llama 3.1 70B',
    'mistral-large': 'Mistral Large',
    'mistral-7b': 'Mistral 7B',
  };
  return labels[modelName] || modelName;
}

async function getAgentInfo(companyId, agentId) {
  if (!agentId) return null;
  if (!companyId) return null;

  const agentConfig = await getAgentConfig(companyId, agentId);
  if (agentConfig) {
    return {
      name: agentConfig.name,
      role: agentConfig.role,
      description: compactPromptText(agentConfig.persona?.soulInstructions, 400) || agentConfig.role,
      allowedTools: normalizeStringList(agentConfig.allowedTools),
      instructions: {
        agent: compactPromptText(agentConfig.persona?.agentInstructions),
        soul: compactPromptText(agentConfig.persona?.soulInstructions),
        tools: compactPromptText(agentConfig.persona?.toolsInstructions),
      },
    };
  }

  return null;
}

async function listSessions(req, res) {
  try {
    const companyId = await resolveEffectiveCompanyId(req);
    const userId = req.user?.id;
    if (!userId) {
      return sendCodeError(res, 400, 'USER_OR_COMPANY_REQUIRED');
    }
    const sessions = await aiSandboxService.listSessions(companyId || undefined, req.user?.role === 'SUPER_ADMIN' ? undefined : userId);
    const mapped = sessions.map(s => ({
      id: s.id,
      title: s.title,
      agentId: s.agentId,
      agentName: s.agentName,
      agentRole: s.agentRole,
      model: s.model,
      provider: s.provider,
      messageCount: s.messageCount,
      toolCallCount: s.toolCallCount,
      totalCost: s.totalCost,
      totalTokens: s.totalTokens,
      avgLatency: s.avgLatency,
      score: s.score,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    return res.json({ success: true, sessions: mapped, count: mapped.length });
  } catch (error) {
    console.error('[AI-SANDBOX] listSessions error:', error);
    return sendCodeError(res, 500, 'LIST_SESSIONS_FAILED');
  }
}

async function getSession(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const companyId = await resolveEffectiveCompanyId(req, null, sessionId);
    const session = await aiSandboxService.getSession(sessionId, req.user?.role === 'SUPER_ADMIN' ? undefined : companyId);
    if (!session) {
      return sendCodeError(res, 404, 'SESSION_NOT_FOUND');
    }
    const messages = session.messages.map((m) => {
      const metadata = parseSandboxMessageMetadata(m.metadata);
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        provider: m.provider,
        keyId: m.keyId,
        keyName: m.keyName,
        tokens: { input: m.tokensInput, output: m.tokensOutput, total: m.tokensTotal },
        latencyMs: m.latencyMs,
        cost: m.cost,
        toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : [],
        timestamp: m.createdAt,
        metadata,
        responseAttachments: Array.isArray(metadata?.responseAttachments) ? metadata.responseAttachments : [],
        runtime: metadata?.runtime || (metadata?.pipelineTrace ? 'python-agent' : undefined),
      };
    });
    return res.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        agentId: session.agentId,
        agentName: session.agentName,
        agentRole: session.agentRole,
        model: session.model,
        provider: session.provider,
        messageCount: session.messageCount,
        toolCallCount: session.toolCallCount,
        totalCost: session.totalCost,
        totalTokens: session.totalTokens,
        avgLatency: session.avgLatency,
        score: session.score,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages,
      },
    });
  } catch (error) {
    console.error('[AI-SANDBOX] getSession error:', error);
    return sendCodeError(res, 500, 'GET_SESSION_FAILED');
  }
}

async function createSession(req, res) {
  try {
    const { title, agentId, agentName, agentRole, model, provider, keyId } = req.body;
    let companyId = await resolveEffectiveCompanyId(req, agentId);
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return sendCodeError(res, 400, 'USER_OR_COMPANY_REQUIRED');
    }

    const session = await aiSandboxService.createSession({
      companyId,
      userId,
      title: title || 'New Session',
      agentId: agentId || 'ceo',
      agentName: agentName || null,
      agentRole: agentRole || null,
      model: model || '',
      provider: provider || '',
      keyId: keyId || null,
    });

    return res.json({ success: true, session: { id: session.id, title: session.title, createdAt: session.createdAt } });
  } catch (error) {
    console.error('[AI-SANDBOX] createSession error:', error);
    return sendCodeError(res, 500, 'CREATE_SESSION_FAILED');
  }
}

async function updateSessionTitle(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const companyId = await resolveEffectiveCompanyId(req, null, sessionId);
    const { title } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendCodeError(res, 400, 'TITLE_REQUIRED');
    }

    await aiSandboxService.updateSessionTitle(sessionId, title.trim(), req.user?.role === 'SUPER_ADMIN' ? undefined : companyId);
    return res.json({ success: true });
  } catch (error) {
    console.error('[AI-SANDBOX] updateSessionTitle error:', error);
    return sendCodeError(res, 500, 'UPDATE_SESSION_FAILED');
  }
}

async function deleteSession(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const companyId = await resolveEffectiveCompanyId(req, null, sessionId);
    await aiSandboxService.deleteSession(sessionId, req.user?.role === 'SUPER_ADMIN' ? undefined : companyId);
    return res.json({ success: true });
  } catch (error) {
    console.error('[AI-SANDBOX] deleteSession error:', error);
    return sendCodeError(res, 500, 'DELETE_SESSION_FAILED');
  }
}

async function sendChatMessage(req, res) {
  try {
    const { sessionId, message, agentId, model, provider, keyId, attachments } = req.body;
    const safeSessionId = validateOptionalSessionId(sessionId);
    const companyId = await resolveEffectiveCompanyId(req, agentId, safeSessionId);
    const userId = req.user?.id;
    if (!companyId) {
      return sendCodeError(res, 400, 'COMPANY_ID_REQUIRED');
    }

    const messageText = validateRequiredText(message, 'MESSAGE_REQUIRED', MAX_SANDBOX_MESSAGE_CHARS);
    const safeAttachments = normalizeSandboxAttachments(attachments);
    const modelSelection = await resolveSandboxModelSelection(companyId, { provider, model, keyId, agentId });
    const startTime = Date.now();
    const turnResult = await runSandboxChatTurn({
      companyId,
      userId,
      sessionId: safeSessionId,
      messageText,
      agentId,
      attachments: safeAttachments,
      modelSelection,
    });
    const latencyMs = Date.now() - startTime;
    const tokens = turnResult.tokens;
    const cost = turnResult.cost;

    return res.json({
      success: true,
      reply: turnResult.reply,
      responseAttachments: turnResult.responseAttachments,
      toolCalls: turnResult.toolCalls,
      tokens,
      latencyMs,
      model: turnResult.model,
      provider: turnResult.provider,
      keyId: turnResult.keyId,
      keyName: turnResult.keyName,
      keyScope: turnResult.keyScope,
      cost,
      agentId,
      sessionId: turnResult.sessionId,
      pipelineTrace: turnResult.pipelineTrace || null,
      usedFallbackKey: turnResult.usedFallbackKey ?? false,
      runtime: turnResult.runtime || 'unknown',
      compiledSystemPrompt: turnResult.compiledSystemPrompt || null,
    });
  } catch (error) {
    console.error('[sendChatMessage] error', error);
    return sendCodeError(res, error.statusCode || 500, error.code || 'AI_SANDBOX_CHAT_FAILED');
  }
}

async function streamChatMessage(req, res) {
  let sseTimer;
  try {
    const { sessionId, message, agentId, model, provider, keyId, attachments } = req.body;
    const safeSessionId = validateOptionalSessionId(sessionId);
    const companyId = await resolveEffectiveCompanyId(req, agentId, safeSessionId);
    const userId = req.user?.id;
    if (!companyId) {
      return sendCodeError(res, 400, 'COMPANY_ID_REQUIRED');
    }

    const messageText = validateRequiredText(message, 'MESSAGE_REQUIRED', MAX_SANDBOX_MESSAGE_CHARS);
    const safeAttachments = normalizeSandboxAttachments(attachments);
    const modelSelection = await resolveSandboxModelSelection(companyId, { provider, model, keyId, agentId });

    const existingSession = safeSessionId
      ? await aiSandboxService.getSession(safeSessionId, req.user?.role === 'SUPER_ADMIN' ? undefined : companyId)
      : null;
    if (safeSessionId && !existingSession) {
      return sendCodeError(res, 404, 'SESSION_NOT_FOUND');
    }

    const SSE_TIMEOUT_MS = parseInt(process.env.AI_SANDBOX_SSE_TIMEOUT || '180000', 10);
    sseTimer = setTimeout(() => {
      if (!res.headersSent) {
        return sendCodeError(res, 504, 'AI_SANDBOX_SSE_TIMEOUT');
      }
      res.write(`data: ${JSON.stringify({
        type: 'run_error',
        error: 'AI_SANDBOX_SSE_TIMEOUT',
        reason: 'Response timed out',
        done: true,
      })}\n\n`);
      res.end();
    }, SSE_TIMEOUT_MS);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reusableSession = existingSession?.agentId === agentId ? existingSession : null;
    const resolvedSessionId = reusableSession ? safeSessionId : generateSandboxSessionId();
    const conversationId = buildSandboxConversationId(companyId, userId, resolvedSessionId);
    const toolMemory = hydrateSandboxWorkingMemory(companyId, conversationId, reusableSession?.messages || []);
    const conversationHistory = (reusableSession?.messages || [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));
    const agentBundle = await createSandboxRuntimeAgent(companyId, agentId, modelSelection);
    if (!agentBundle) {
      throw createHttpError('AGENT_NOT_FOUND', 400);
    }

    const turnStartTime = Date.now();
    res.write(`data: ${JSON.stringify({
      type: 'agent_start',
      agentId,
      agentName: agentBundle.sandboxAgent.name,
      message: 'Starting Python agent runtime...',
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'agent_thinking',
      stage: 'python_agent_runtime',
      message: 'Running selected agent in ai-service...',
    })}\n\n`);

    const taskResult = await runSelectedAgentInPython({
      companyId,
      userId,
      agentBundle,
      agentId,
      messageText,
      threadId: resolvedSessionId,
      conversationId,
      memoryContext: mergeSandboxToolMemory({ messageText, sessionId: resolvedSessionId, recentMessages: conversationHistory }, toolMemory),
      attachments: safeAttachments,
      modelSelection,
      channel: 'FACEBOOK',
    });

    const finalReply = extractSandboxReply(taskResult);
    const toolCalls = mapSandboxToolsToToolCalls(taskResult?.result?.tools || []);
    const responseAttachments = extractResponseAttachments(taskResult);
    const pipelineTrace = taskResult?.result?.pipelineTrace || null;
    const compiledSystemPrompt = taskResult?.result?.compiledSystemPrompt || null;

    const latencyMs = Date.now() - turnStartTime;
    const sessionTokens = normalizeSandboxUsage(taskResult);
    const sessionCost = calculateCost(modelSelection.model, sessionTokens.input, sessionTokens.output);

    if (!finalReply) {
      const errorCode = taskResult?.errorCode || taskResult?.result?.errorCode || 'AI_SANDBOX_EMPTY_REPLY';
      res.write(`data: ${JSON.stringify({
        done: true,
        error: errorCode,
        reason: taskResult?.error || taskResult?.result?.error || '',
      })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify({
      type: 'agent_reply',
      reply: finalReply,
      responseAttachments,
      isIncremental: false,
      modelUsed: modelSelection.model,
      usedFallbackKey: modelSelection.usedFallbackKey ?? false,
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'run_complete',
      runId: resolvedSessionId,
      reply: finalReply,
      responseAttachments,
      toolCalls,
    })}\n\n`);

    // Persist session and messages
    if (!reusableSession) {
      await aiSandboxService.createSession({
        id: resolvedSessionId,
        companyId,
        userId: userId || 'unknown',
        title: `Test ${Date.now()}`,
        agentId,
        agentName: agentBundle.runtimeAgent?.name || null,
        agentRole: agentBundle.runtimeAgent?.role || null,
        model: modelSelection.model,
        provider: modelSelection.provider,
        keyId: modelSelection.key.id || null,
      });
    }

    await aiSandboxService.addMessage(resolvedSessionId, companyId, {
      role: 'user',
      content: messageText,
      model: modelSelection.model,
      provider: modelSelection.provider,
      keyId: modelSelection.key.id,
      keyName: modelSelection.key.name,
      latencyMs: 0,
      cost: 0,
      metadata: safeAttachments.length ? { attachments: safeAttachments } : null,
    });

    const streamRuntime = taskResult?.result?.runtime || 'unknown';

    await aiSandboxService.addMessage(resolvedSessionId, companyId, {
      role: 'assistant',
      content: finalReply,
      model: modelSelection.model,
      provider: modelSelection.provider,
      keyId: modelSelection.key.id,
      keyName: modelSelection.key.name,
      tokensInput: sessionTokens.input,
      tokensOutput: sessionTokens.output,
      latencyMs,
      cost: sessionCost,
      toolCalls,
      toolCallCount: toolCalls.length,
      metadata: {
        ...(pipelineTrace ? { pipelineTrace } : {}),
        ...(streamRuntime ? { runtime: streamRuntime } : {}),
        ...(responseAttachments.length ? { responseAttachments } : {}),
      },
    });

    res.write(`data: ${JSON.stringify({
      done: true,
      tokens: sessionTokens,
      latencyMs,
      model: modelSelection.model,
      provider: modelSelection.provider,
      keyId: modelSelection.key.id,
      keyName: modelSelection.key.name,
      cost: sessionCost,
      sessionId: resolvedSessionId,
      runtime: streamRuntime,
      responseAttachments,
      pipelineTrace,
      compiledSystemPrompt,
    })}\n\n`);

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      return sendCodeError(res, error.statusCode || 500, error.code || 'AI_SANDBOX_STREAM_FAILED');
    }
    res.write(`data: ${JSON.stringify({
      type: 'run_error',
      error: error.code || 'AI_SANDBOX_STREAM_FAILED',
      reason: error.reason || error.message || 'Sandbox stream failed',
      done: true,
    })}\n\n`);
    res.end();
  } finally {
    if (sseTimer) clearTimeout(sseTimer);
  }
}

async function evaluateResponse(req, res) {
  try {
    const { message, response, toolCalls, criteria, provider, model, keyId } = req.body;
    const companyId = req.user?.companyId || req.companyId;

    const messageText = validateRequiredText(message, 'MESSAGE_REQUIRED', MAX_SANDBOX_MESSAGE_CHARS);
    const responseText = validateRequiredText(response, 'RESPONSE_REQUIRED', MAX_SANDBOX_RESPONSE_CHARS);
    const safeToolCalls = Array.isArray(toolCalls) ? toolCalls.slice(0, MAX_SANDBOX_TOOL_CALLS) : [];

    if (Array.isArray(toolCalls) && toolCalls.length > MAX_SANDBOX_TOOL_CALLS) {
      return sendCodeError(res, 413, 'TOOL_CALLS_TOO_LONG');
    }

    const evaluation = await aiServiceAdminClient.evaluateSandboxResponse({
      companyId,
      message: messageText,
      response: responseText,
      toolCalls: safeToolCalls,
      criteria,
      provider,
      model,
      keyId,
    });

    if (!evaluation?.scores) {
      return res.json({
        success: true,
        scores: { accuracy: 75, helpfulness: 75, relevance: 75, completeness: 75, safety: 85, overall: 77 },
        overall: 77,
        comment: 'EVALUATION_UNAVAILABLE',
        commentCode: 'EVALUATION_UNAVAILABLE',
      });
    }

    const overall = Number(evaluation.overall ?? evaluation.scores.overall ?? 0);

    return res.json({
      success: true,
      scores: { ...evaluation.scores, overall },
      overall,
      comment: evaluation.comment || 'Evaluation complete',
    });
  } catch (error) {
    return sendCodeError(res, error.statusCode || 500, error.code || 'AI_SANDBOX_EVALUATE_FAILED');
  }
}

async function exportSession(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const sessionId = validateRequiredText(req.params.sessionId, 'SESSION_ID_REQUIRED', MAX_SANDBOX_SESSION_ID_CHARS);
    const format = req.query.format === 'markdown' ? 'markdown' : 'json';

    const session = await aiSandboxService.getSession(sessionId, companyId);
    if (!session) {
      return sendCodeError(res, 404, 'SESSION_NOT_FOUND');
    }

    if (format === 'markdown') {
      let md = `# AI Agent Sandbox Session: ${session.title}\n\n`;
      md += `**Agent:** ${session.agentName || session.agentId} (${session.agentRole || 'N/A'})\n`;
      md += `**Model:** ${session.model} / ${session.provider}\n`;
      md += `**Messages:** ${session.messageCount} | **Tools:** ${session.toolCallCount}\n`;
      md += `**Total Cost:** $${session.totalCost.toFixed(4)} | **Total Tokens:** ${session.totalTokens}\n`;
      md += `**Exported:** ${new Date().toISOString()}\n\n---\n\n`;

      for (const msg of session.messages) {
        const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
        md += `### ${role}\n`;
        if (msg.cost > 0 || msg.tokensTotal > 0) {
          md += `*${msg.tokensTotal} tokens | $${msg.cost.toFixed(4)}${msg.latencyMs ? ` | ${msg.latencyMs}ms` : ''}*\n\n`;
        }
        md += `${msg.content}\n\n`;
        if (msg.toolCalls) {
          try {
            const calls = JSON.parse(msg.toolCalls);
            if (calls.length > 0) {
              md += `**Tools called:** ${calls.map(tc => tc.name).join(', ')}\n\n`;
            }
          } catch {}
        }
        md += `---\n\n`;
      }

      return res.json({ success: true, content: md });
    }

    const exportData = {
      sessionId: session.id,
      title: session.title,
      agent: { id: session.agentId, name: session.agentName, role: session.agentRole },
      model: { id: session.model, provider: session.provider },
      stats: {
        messageCount: session.messageCount,
        toolCallCount: session.toolCallCount,
        totalCost: session.totalCost,
        totalTokens: session.totalTokens,
        avgLatency: session.avgLatency,
      },
      exportedAt: new Date().toISOString(),
      messages: session.messages.map(m => ({
        role: m.role,
        content: m.content,
        tokens: { input: m.tokensInput, output: m.tokensOutput, total: m.tokensTotal },
        cost: m.cost,
        latencyMs: m.latencyMs,
        model: m.model,
        toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : [],
        timestamp: m.createdAt,
      })),
    };

    return res.json({ success: true, content: JSON.stringify(exportData, null, 2) });
  } catch (error) {
    return sendCodeError(res, error.statusCode || 500, error.code || 'AI_SANDBOX_EXPORT_FAILED');
  }
}

async function listSandboxTools(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const tools = await aiServiceAdminClient.listTools(companyId);
    return res.json({ success: true, tools });
  } catch (error) {
    console.error('[AI-SANDBOX] listSandboxTools error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function saveAgentFiles(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const { agentId } = req.params;
    const data = req.body;
    const result = await aiServiceAdminClient.saveAgentFiles(agentId, companyId, data);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[AI-SANDBOX] saveAgentFiles error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function listRuns(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const { agentId, state } = req.query;

    const runs = [];
    for (const run of sandboxRunStates.values()) {
      if (run.companyId !== companyId) continue;
      if (agentId && run.agentId !== agentId) continue;
      if (state && run.state !== state) continue;
      runs.push({
        id: run.id,
        agentId: run.agentId,
        state: run.state,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        pendingApprovals: run.pendingApprovals,
      });
    }

    return res.json({ success: true, runs, count: runs.length });
  } catch (error) {
    console.error('[AI-SANDBOX] listRuns error:', error);
    return res.status(500).json({ success: false, error: 'LIST_RUNS_FAILED' });
  }
}

async function getRun(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const { runId } = req.params;

    const run = sandboxRunStates.get(runId);
    if (!run) {
      return res.status(404).json({ success: false, error: 'RUN_NOT_FOUND' });
    }
    if (run.companyId !== companyId) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED' });
    }

    return res.json({
      success: true,
      run: {
        id: run.id,
        agentId: run.agentId,
        state: run.state,
        task: run.task,
        context: run.context,
        events: run.events,
        pendingApprovals: run.pendingApprovals,
        pendingInput: run.pendingInput,
        result: run.result,
        error: run.error,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        resumedAt: run.resumedAt,
        completedAt: run.completedAt,
      },
    });
  } catch (error) {
    console.error('[AI-SANDBOX] getRun error:', error);
    return res.status(500).json({ success: false, error: 'GET_RUN_FAILED' });
  }
}

async function resumeRun(req, res) {
  try {
    const { runId, decision } = req.body;
    const companyId = req.user?.companyId || req.companyId;

    const run = sandboxRunStates.get(runId);
    if (!run) {
      return res.status(404).json({ success: false, error: 'RUN_NOT_FOUND' });
    }
    if (run.companyId !== companyId) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED' });
    }

    if (decision?.approved && run.pendingApprovals?.length > 0) {
      const pendingApproval = run.pendingApprovals.find(a => a.status === 'PENDING');
      if (pendingApproval) {
        pendingApproval.status = 'APPROVED';
        pendingApproval.decision = decision;
      }
    } else if (decision?.approved === false) {
      const pendingApproval = run.pendingApprovals?.find(a => a.status === 'PENDING');
      if (pendingApproval) {
        pendingApproval.status = 'REJECTED';
        pendingApproval.decision = decision;
      }
    }

    run.state = 'completed';
    run.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      run: {
        id: run.id,
        state: run.state,
        pendingApprovals: run.pendingApprovals,
        result: run.result,
      },
    });
  } catch (error) {
    console.error('[AI-SANDBOX] resumeRun error:', error);
    return res.status(500).json({ success: false, error: 'RESUME_RUN_FAILED' });
  }
}

module.exports = {
  listAgents,
  getAgentProfile,
  listModels,
  listSessions,
  getSession,
  createSession,
  updateSessionTitle,
  deleteSession,
  sendChatMessage,
  streamChatMessage,
  evaluateResponse,
  exportSession,
  listSandboxTools,
  saveAgentFiles,
  listRuns,
  getRun,
  resumeRun,
};

// restart 09:53:24
