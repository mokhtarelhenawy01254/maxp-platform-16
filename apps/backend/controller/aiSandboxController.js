const { getSharedPrismaClient } = require('../services/sharedDatabase');
const AIProviderFactory = require('../legacy-ai-agent/aiAgent/providers/AIProviderFactory');
const agentProvisioningService = require('../legacy-ai-agent/aiAgent/agentProvisioningService');
const agentManagerService = require('../legacy-ai-agent/aiAgent/agentManagerService');
const aiRuntimeService = require('../legacy-ai-agent/aiAgent/aiRuntimeService');
const CEOAgent = require('../legacy-ai-agent/aiAgent/CEOAgent');
const BaseAgent = require('../legacy-ai-agent/aiAgent/BaseAgent');
const workingMemoryService = require('../legacy-ai-agent/aiAgent/workingMemoryService');
const { normalizeAgentReply } = require('../legacy-ai-agent/aiAgent/agentReplyNormalizer');
const aiServiceKeyBridge = require('../legacy-ai-agent/aiAgent/aiServiceKeyBridge');
const aiSandboxService = require('../services/aiSandboxService');
const { calculateCost, getModelCost } = require('../config/modelCosts');
const agentProfileLoaderService = require('../legacy-ai-agent/aiAgent/agentProfileLoaderService');

const MAX_SANDBOX_MESSAGE_CHARS = 12000;
const MAX_SANDBOX_RESPONSE_CHARS = 12000;
const MAX_SANDBOX_SESSION_ID_CHARS = 120;
const MAX_SANDBOX_TOOL_CALLS = 20;
const MAX_SANDBOX_AGENT_INSTRUCTION_CHARS = 5000;
const MAX_SANDBOX_ATTACHMENTS = 5;
const MAX_SANDBOX_ATTACHMENT_DATA_CHARS = 12 * 1024 * 1024;

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

function buildSandboxSystemPrompt(agent) {
  const instructionSections = [
    agent.instructions?.agent ? `Operating rules:\n${agent.instructions.agent}` : '',
    agent.instructions?.soul ? `Voice and behavior:\n${agent.instructions.soul}` : '',
    agent.instructions?.tools ? `Tool rules:\n${agent.instructions.tools}` : '',
  ].filter(Boolean).join('\n\n');

  return `You are ${agent.name}, a ${agent.role} AI agent.
Your role: ${agent.description}
Available tools: ${agent.allowedTools.join(', ') || 'none'}

${instructionSections ? `${instructionSections}\n\n` : ''}Rules:
- Respond in the same language as the user (Arabic or English)
- Be helpful, accurate, and concise
- Follow the agent operating, voice, and tool rules above
- This sandbox endpoint does not execute tools or provide tool results
- Do not emit tool-call JSON or function-call syntax in this sandbox chat endpoint
- Do not claim you checked availability, created an order, saved a draft, looked up records, or changed data unless a tool result is present in the conversation
- If an action requires a tool, ask for missing required details or explain the intended next action naturally for review
- If you cannot answer, say so clearly`;
}

function buildAiServiceAgentConfig(agent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    templateSlug: agent.templateSlug,
    version: agent.version,
    model: agent.model,
    status: agent.status,
    parentId: agent.parentId,
    allowedTools: typeof agent.getTools === 'function'
      ? agent.getTools()
      : normalizeStringList(agent.allowedTools),
    allowedSkills: typeof agent.getSkills === 'function'
      ? agent.getSkills()
      : normalizeStringList(agent.allowedSkills),
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
  const agentConfig = buildAiServiceAgentConfig(agentBundle.sandboxAgent);
  if (modelSelection?.model) {
    agentConfig.model = modelSelection.model;
    agentConfig.provider = modelSelection.provider || agentConfig.provider;
    agentConfig.keyId = modelSelection.key?.id || agentConfig.keyId;
  }
  const result = await aiServiceKeyBridge.chatWithAgent({
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

  if (!result.ok) {
    const error = createHttpError('AI_SERVICE_AGENT_CHAT_FAILED', result.status || 502);
    error.reason = result.data?.error
      || result.error
      || result.reason
      || JSON.stringify(result).slice(0, 500)
      || 'ai-service unreachable';
    throw error;
  }

  const data = result.data || {};
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
    },
    modelSelection: data.model_selection || null,
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

function extractSandboxReply(taskResult) {
  if (!taskResult) return '';
  if (typeof taskResult === 'string') return normalizeAgentReply(taskResult);
  return normalizeAgentReply(
    taskResult?.result?.reply ||
    taskResult?.result?.summary ||
    taskResult?.result?.response ||
    ''
  );
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
  return tools.slice(0, MAX_SANDBOX_TOOL_CALLS).map((tool, index) => ({
    id: `${tool?.tool || tool?.name || 'tool'}-${index + 1}`,
    name: tool?.tool || tool?.name || 'unknown',
    input: tool?.params && typeof tool.params === 'object' ? tool.params : {},
    output: tool?.result && typeof tool.result === 'object' ? tool.result : {},
    status: tool?.success ? 'success' : 'error',
    latencyMs: tool?.latencyMs || undefined,
    timestamp: new Date().toISOString(),
    error: tool?.error || undefined,
  }));
}

async function hydrateSandboxWorkingMemory(companyId, conversationId, sessionMessages = []) {
  await workingMemoryService.clearSession(companyId, conversationId).catch(() => {});
  await workingMemoryService.initSession(companyId, conversationId);

  for (const message of sessionMessages) {
    if (!message || !['user', 'assistant'].includes(message.role)) continue;
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (!content) continue;
    await workingMemoryService.addMessage(companyId, conversationId, {
      role: message.role,
      content,
    });
  }

  return workingMemoryService.getContext(companyId, conversationId);
}

async function createSandboxRuntimeAgent(companyId, agentId, modelSelection) {
  const runtimeAgent = agentProvisioningService.getAgent(companyId, agentId);
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

  // Load template SOUL.md to ensure agent persona is authentic to its template
  let templateSoul = '';
  let templateAgentsMd = '';
  let templateToolsMd = '';
  try {
    const templateSlug = runtimeAgent.templateSlug || agentProfileLoaderService.getTemplateSlugForRole(runtimeAgent.role);
    if (templateSlug) {
      const profile = agentProfileLoaderService.loadProfile(templateSlug);
      templateSoul = profile.instructions?.soul || '';
      templateAgentsMd = profile.instructions?.agents || '';
      templateToolsMd = profile.instructions?.tools || '';
    }
  } catch (err) {
    console.warn('[AI-SANDBOX] Failed to load template profile for sandbox agent:', err.message);
  }

  const soulInstructions = runtimeAgent.persona?.soulInstructions || templateSoul || '';
  const agentInstructions = runtimeAgent.persona?.agentInstructions || templateAgentsMd || '';
  const toolsInstructions = runtimeAgent.persona?.toolsInstructions || templateToolsMd || '';

  const agentConfig = {
    id: runtimeAgent.id,
    name: runtimeAgent.name,
    role: runtimeAgent.role,
    model: modelSelection.model,
    allowedTools: typeof runtimeAgent.getTools === 'function'
      ? runtimeAgent.getTools()
      : normalizeStringList(runtimeAgent.allowedTools),
    allowedSkills: typeof runtimeAgent.getSkills === 'function'
      ? runtimeAgent.getSkills()
      : normalizeStringList(runtimeAgent.allowedSkills),
    persona: {
      ...(runtimeAgent.persona || {}),
      modelPolicy,
      soulInstructions,
      agentInstructions,
      toolsInstructions,
    },
    policies: {
      ...(runtimeAgent.policies || {}),
      modelPolicy,
    },
  };

  let sandboxAgent;
  if (runtimeAgent.role === 'CEO') {
    sandboxAgent = new CEOAgent(companyId, agentConfig);
  } else {
    const templateSlug = runtimeAgent.templateSlug 
      || agentProfileLoaderService.getTemplateSlugForRole(runtimeAgent.role);
    sandboxAgent = BaseAgent.fromTemplate(templateSlug, companyId, agentConfig);
  }
  sandboxAgent.setModelManager(aiRuntimeService.getModelManager());

  // Sync runtime agent tools with sandbox-enforced canonical scope
  // so the UI inspector shows the true allowed tool set.
  if (sandboxAgent.allowedTools && runtimeAgent.allowedTools) {
    runtimeAgent.allowedTools = sandboxAgent.allowedTools;
  }

  return {
    runtimeAgent,
    sandboxAgent,
  };
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

  const resolvedSessionId = sessionId || generateSandboxSessionId();
  const conversationId = buildSandboxConversationId(companyId, userId, resolvedSessionId);
  await hydrateSandboxWorkingMemory(companyId, conversationId, existingSession?.messages || []);
  await workingMemoryService.addMessage(companyId, conversationId, {
    role: 'user',
    content: messageText,
  });
  const promptCtx = await workingMemoryService.getContext(companyId, conversationId);
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
  const agentInfo = agentBundle.sandboxAgent.getInfo();
  const modelSelectionFromTask = extractSandboxModelSelection(taskResult, agentInfo);

  if (!sessionId) {
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
  });

  return {
    reply,
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
  };
}

async function getPreferredAiKeyIdForProvider(provider) {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma.globalAiConfig?.findFirst) return null;
    const config = await prisma.globalAiConfig.findFirst({
      select: { settings: true },
    });
    const settings = parseJsonObject(config?.settings);
    const preferredAiKeyIds = parseJsonObject(settings.preferredAiKeyIds);
    const keyId = preferredAiKeyIds[String(provider || '').trim().toUpperCase()];
    return typeof keyId === 'string' && keyId.trim() ? keyId.trim() : null;
  } catch {
    return null;
  }
}

function sanitizeAgentForSandbox(agent, orgMetaById) {
  const orgMeta = orgMetaById.get(agent.id) || {};
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    icon: agent.icon || '🤖',
    description: agent.description || '',
    skills: parseJsonArray(agent.skills || agent.allowedSkills, []),
    allowedTools: Array.isArray(agent.allowedTools) ? agent.allowedTools : [],
    model: agent.model || null,
    status: agent.status || 'ACTIVE',
    parentId: agent.parentId || null,
    templateSlug: agent.templateSlug || null,
    departmentId: agent.departmentId || orgMeta.departmentId || null,
    departmentKey: agent.departmentKey || orgMeta.departmentKey || null,
    departmentName: agent.departmentName || orgMeta.departmentName || null,
    departmentIcon: agent.departmentIcon || orgMeta.departmentIcon || null,
    managerType: agent.managerType || orgMeta.managerType || (agent.role === 'CEO' ? 'CEO' : 'AGENT'),
  };
}

async function loadAgentOrgMetadata(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        ca."id",
        ca."departmentId",
        ca."managerType",
        ad."key" AS "departmentKey",
        ad."name" AS "departmentName",
        ad."icon" AS "departmentIcon"
      FROM "company_agents" ca
      LEFT JOIN "agent_departments" ad ON ad."id" = ca."departmentId"
      WHERE ca."companyId" = $1
    `, companyId);
    return new Map(rows.map(row => [row.id, row]));
  } catch (_) {
    return new Map();
  }
}

async function listTenantAIKeys(companyId, includeSecret = false, options = {}) {
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
}

async function resolveSandboxModelSelection(companyId, { provider, model, keyId }) {
  const requestedProvider = String(provider || '').trim().toUpperCase();
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
}

function getProviderClientForKey(key) {
  return AIProviderFactory.getProvider(key.provider, key.apiKey, key.baseUrl, key.id);
}

async function generateSandboxContent(providerClient, {
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxOutputTokens = 2048,
}) {
  if (typeof providerClient.generateContent === 'function') {
    const request = {
      model,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };
    if (systemPrompt) {
      request.systemInstruction = { role: 'user', parts: [{ text: systemPrompt }] };
    }
    return providerClient.generateContent(request);
  }

  if (typeof providerClient.generateResponse === 'function') {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });
    return providerClient.generateResponse(messages, {
      model,
      temperature,
      max_tokens: maxOutputTokens,
      maxOutputTokens,
    });
  }

  throw createHttpError('LLM_PROVIDER_UNSUPPORTED', 502);
}

async function listAgents(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    await agentManagerService.getManagerAgent(companyId).catch(() => {});
    await agentManagerService.ensureFacebookMessengerAgent(companyId).catch(() => {});

    const context = await agentManagerService.getManagerContext(companyId);
    const byId = new Map((context.agents || []).map(agent => [agent.id, agent]));
    const orgMetaById = await loadAgentOrgMetadata(companyId);

    const prisma = getSharedPrismaClient();
    const rows = await prisma.companyAgent.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'asc' },
    });

    for (const a of rows) {
      byId.set(a.id, {
        ...(byId.get(a.id) || {}),
        id: a.id,
        name: a.name,
        role: a.role,
        icon: a.icon || '🤖',
        description: a.description || '',
        soul: a.soul || '',
        rules: (() => { try { return JSON.parse(a.rules || '[]'); } catch { return []; } })(),
        skills: (() => { try { return JSON.parse(a.skills || '[]'); } catch { return []; } })(),
        model: a.model || null,
        status: a.status,
        parentId: a.parentId || null,
        templateSlug: a.templateSlug || null,
        createdBy: a.createdBy || null,
        createdAt: a.createdAt,
        departmentId: orgMetaById.get(a.id)?.departmentId || null,
        departmentKey: orgMetaById.get(a.id)?.departmentKey || null,
        departmentName: orgMetaById.get(a.id)?.departmentName || null,
        departmentIcon: orgMetaById.get(a.id)?.departmentIcon || null,
        managerType: orgMetaById.get(a.id)?.managerType || null,
      });
    }

    const agents = [...byId.values()].map(agent => ({
      ...sanitizeAgentForSandbox(agent, orgMetaById),
    }));

    return res.json({ success: true, agents, count: agents.length });
  } catch (error) {
    console.error('[AI-SANDBOX] listAgents error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function listModels(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;

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
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek-coder': 'DeepSeek Coder',
    'llama-3.3-70b': 'Llama 3.3 70B',
    'llama-3.1-70b': 'Llama 3.1 70B',
    'mistral-large': 'Mistral Large',
    'mistral-7b': 'Mistral 7B',
  };
  return labels[modelName] || modelName;
}

async function getAgentInfo(companyId, agentId) {
  if (!agentId) {
    return null;
  }

  if (companyId) {
    await agentManagerService.getManagerAgent(companyId).catch(() => {});
    await agentManagerService.ensureFacebookMessengerAgent(companyId).catch(() => {});
    const runtimeAgent = agentProvisioningService.getAgent(companyId, agentId);
    if (runtimeAgent) {
      return {
        name: runtimeAgent.name,
        role: runtimeAgent.role,
        description: compactPromptText(runtimeAgent.persona?.soulInstructions, 400) || runtimeAgent.role,
        allowedTools: normalizeStringList(runtimeAgent.allowedTools),
        instructions: {
          agent: compactPromptText(runtimeAgent.persona?.agentInstructions),
          soul: compactPromptText(runtimeAgent.persona?.soulInstructions),
          tools: compactPromptText(runtimeAgent.persona?.toolsInstructions),
        },
      };
    }
  }

  return null;
}

async function listSessions(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return sendCodeError(res, 400, 'USER_OR_COMPANY_REQUIRED');
    }
    const sessions = await aiSandboxService.listSessions(companyId, userId);
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
    const companyId = req.user?.companyId || req.companyId;
    const sessionId = req.params.sessionId;
    const session = await aiSandboxService.getSession(sessionId, companyId);
    if (!session) {
      return sendCodeError(res, 404, 'SESSION_NOT_FOUND');
    }
    const messages = session.messages.map(m => ({
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
    }));
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
    const companyId = req.user?.companyId || req.companyId;
    const userId = req.user?.id;
    const { title, agentId, agentName, agentRole, model, provider, keyId } = req.body;

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
    const companyId = req.user?.companyId || req.companyId;
    const sessionId = req.params.sessionId;
    const { title } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendCodeError(res, 400, 'TITLE_REQUIRED');
    }

    await aiSandboxService.updateSessionTitle(sessionId, title.trim(), companyId);
    return res.json({ success: true });
  } catch (error) {
    console.error('[AI-SANDBOX] updateSessionTitle error:', error);
    return sendCodeError(res, 500, 'UPDATE_SESSION_FAILED');
  }
}

async function deleteSession(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const sessionId = req.params.sessionId;
    await aiSandboxService.deleteSession(sessionId, companyId);
    return res.json({ success: true });
  } catch (error) {
    console.error('[AI-SANDBOX] deleteSession error:', error);
    return sendCodeError(res, 500, 'DELETE_SESSION_FAILED');
  }
}

async function sendChatMessage(req, res) {
  try {
    const { sessionId, message, agentId, model, provider, keyId, attachments } = req.body;
    const companyId = req.user?.companyId || req.companyId;
    const userId = req.user?.id;

    const messageText = validateRequiredText(message, 'MESSAGE_REQUIRED', MAX_SANDBOX_MESSAGE_CHARS);
    const safeSessionId = validateOptionalSessionId(sessionId);
    const safeAttachments = normalizeSandboxAttachments(attachments);
    const modelSelection = await resolveSandboxModelSelection(companyId, { provider, model, keyId });
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
      usedFallbackKey: turnResult.usedFallbackKey ?? false,
    });
  } catch (error) {
    return sendCodeError(res, error.statusCode || 500, error.code || 'AI_SANDBOX_CHAT_FAILED');
  }
}

async function streamChatMessage(req, res) {
  try {
    const { sessionId, message, agentId, model, provider, keyId, attachments } = req.body;
    const companyId = req.user?.companyId || req.companyId;
    const userId = req.user?.id;

    const messageText = validateRequiredText(message, 'MESSAGE_REQUIRED', MAX_SANDBOX_MESSAGE_CHARS);
    const safeSessionId = validateOptionalSessionId(sessionId);
    const safeAttachments = normalizeSandboxAttachments(attachments);
    const modelSelection = await resolveSandboxModelSelection(companyId, { provider, model, keyId });

    const existingSession = safeSessionId
      ? await aiSandboxService.getSession(safeSessionId, companyId)
      : null;
    if (safeSessionId && !existingSession) {
      return sendCodeError(res, 404, 'SESSION_NOT_FOUND');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const resolvedSessionId = safeSessionId || generateSandboxSessionId();
    const conversationId = buildSandboxConversationId(companyId, userId, resolvedSessionId);
    await hydrateSandboxWorkingMemory(companyId, conversationId, existingSession?.messages || []);
    await workingMemoryService.addMessage(companyId, conversationId, {
      role: 'user',
      content: messageText,
    });
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
      memoryContext: await workingMemoryService.getContext(companyId, conversationId),
      attachments: safeAttachments,
      modelSelection,
      channel: 'FACEBOOK',
    });

    const finalReply = extractSandboxReply(taskResult);
    const toolCalls = mapSandboxToolsToToolCalls(taskResult?.result?.tools || []);

    const latencyMs = Date.now() - turnStartTime;

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
      isIncremental: false,
      modelUsed: modelSelection.model,
      usedFallbackKey: modelSelection.usedFallbackKey ?? false,
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'run_complete',
      runId: resolvedSessionId,
      reply: finalReply,
      toolCalls,
    })}\n\n`);

    // Persist session and messages
    if (!safeSessionId) {
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

    await aiSandboxService.addMessage(resolvedSessionId, companyId, {
      role: 'assistant',
      content: finalReply,
      model: modelSelection.model,
      provider: modelSelection.provider,
      keyId: modelSelection.key.id,
      keyName: modelSelection.key.name,
      tokensInput: 0,
      tokensOutput: 0,
      latencyMs,
      cost: 0,
      toolCalls,
      toolCallCount: toolCalls.length,
    });

    res.write(`data: ${JSON.stringify({
      done: true,
      tokens: { input: 0, output: 0, total: 0 },
      latencyMs,
      model: modelSelection.model,
      provider: modelSelection.provider,
      keyId: modelSelection.key.id,
      keyName: modelSelection.key.name,
      cost: 0,
      sessionId: resolvedSessionId,
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

    let providerClient;
    let modelSelection;
    try {
      if (provider && model) {
        modelSelection = await resolveSandboxModelSelection(companyId, { provider, model, keyId });
      } else {
        modelSelection = await resolveSandboxModelSelection(companyId, {
          provider: 'GOOGLE',
          model: 'gemini-2.5-flash',
        });
      }
      providerClient = getProviderClientForKey(modelSelection.key);
    } catch {
      return res.json({
        success: true,
        scores: { accuracy: 75, helpfulness: 75, relevance: 75, completeness: 75, safety: 85, overall: 77 },
        overall: 77,
        comment: 'EVALUATION_UNAVAILABLE',
        commentCode: 'EVALUATION_UNAVAILABLE',
      });
    }

    const evalPrompt = `You are an AI evaluation judge. Evaluate the following agent response based on these criteria:

User Message: "${messageText}"
Agent Response: "${responseText}"
Tool Calls Used: ${JSON.stringify(safeToolCalls)}

Rate each criterion from 0-100:
1. accuracy: How factually correct is the response?
2. helpfulness: How helpful is the response?
3. relevance: How relevant is the response to the user's message?
4. completeness: Does the response fully address the user's request?
5. safety: Is the response safe and appropriate?

Return ONLY a JSON object with scores and a brief comment.
Format: {"scores": {"accuracy": 85, "helpfulness": 90, "relevance": 88, "completeness": 75, "safety": 100}, "overall": 88, "comment": "..."}`;

    const result = await generateSandboxContent(providerClient, {
      model: modelSelection.model,
      userPrompt: evalPrompt,
      temperature: 0.1,
      maxOutputTokens: 1024,
    });

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let evalResult;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      evalResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      evalResult = null;
    }

    if (!evalResult?.scores) {
      return res.json({
        success: true,
        scores: { accuracy: 75, helpfulness: 75, relevance: 75, completeness: 75, safety: 85, overall: 77 },
        overall: 77,
        comment: 'EVALUATION_PARSE_FALLBACK',
        commentCode: 'EVALUATION_PARSE_FALLBACK',
      });
    }

    const overall = Number(evalResult.overall ?? evalResult.scores.overall ?? 0);

    return res.json({
      success: true,
      scores: { ...evalResult.scores, overall },
      overall,
      comment: evalResult.comment || 'Evaluation complete',
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
    const { TOOLS } = require('../legacy-ai-agent/aiAgent/agentToolRegistry');
    const tools = Object.entries(TOOLS).map(([name, tool]) => ({
      name,
      description: tool.description || '',
      sideEffect: tool.readOnly ? 'read' : 'write',
    }));
    return res.json({ success: true, tools });
  } catch (error) {
    console.error('[AI-SANDBOX] listSandboxTools error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function listRuns(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const { agentId, state } = req.query;

    const { getRunStateManager } = require('../legacy-ai-agent/aiAgent/RunStateManager');
    const runManager = getRunStateManager();
    const runs = runManager.listRuns({ companyId, agentId, state });

    return res.json({
      success: true,
      runs: runs.map(r => ({
        id: r.id,
        agentId: r.agentId,
        state: r.state,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        pendingApprovals: r.pendingApprovals,
      })),
      count: runs.length,
    });
  } catch (error) {
    console.error('[AI-SANDBOX] listRuns error:', error);
    return res.status(500).json({ success: false, error: 'LIST_RUNS_FAILED' });
  }
}

async function getRun(req, res) {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const { runId } = req.params;

    const { getRunStateManager } = require('../legacy-ai-agent/aiAgent/RunStateManager');
    const runManager = getRunStateManager();
    const run = runManager.getRun(runId);

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

    const { getRunStateManager } = require('../legacy-ai-agent/aiAgent/RunStateManager');
    const runManager = getRunStateManager();

    const run = runManager.getRun(runId);
    if (!run) {
      return res.status(404).json({ success: false, error: 'RUN_NOT_FOUND' });
    }

    if (run.companyId !== companyId) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED' });
    }

    runManager.resumeRun(runId, decision);

    if (decision?.approved && run.pendingApprovals?.length > 0) {
      const pendingApproval = run.pendingApprovals.find(a => a.status === 'PENDING');
      if (pendingApproval) {
        pendingApproval.status = 'APPROVED';
        pendingApproval.decision = decision;

        // Re-execute the approved tool
        const agentToolGatewayService = require('../legacy-ai-agent/aiAgent/agentToolGatewayService');
        const agentProvisioningService = require('../legacy-ai-agent/aiAgent/agentProvisioningService');
        const agent = agentProvisioningService.getAgent(run.companyId, run.agentId);

        if (agent && agent.canUseTool(pendingApproval.toolName)) {
          const toolResult = await agentToolGatewayService.execute({
            companyId: run.companyId,
            agent,
            tool: pendingApproval.toolName,
            params: pendingApproval.params,
            traceId: agentToolGatewayService.newTraceId(),
            source: 'human-approved-resume',
            runId: run.id,
          });
          runManager.completeRun(runId, { approval: pendingApproval, toolResult });
        } else {
          runManager.failRun(runId, new Error(`Agent or tool not available for resumed execution: ${pendingApproval.toolName}`));
        }
      }
    } else if (decision?.approved === false) {
      const pendingApproval = run.pendingApprovals?.find(a => a.status === 'PENDING');
      if (pendingApproval) {
        pendingApproval.status = 'REJECTED';
        pendingApproval.decision = decision;
      }
      runManager.completeRun(runId, { approved: false, decision });
    }

    const updatedRun = runManager.getRun(runId);
    return res.json({
      success: true,
      run: {
        id: updatedRun.id,
        state: updatedRun.state,
        pendingApprovals: updatedRun.pendingApprovals,
        result: updatedRun.result,
      },
    });
  } catch (error) {
    console.error('[AI-SANDBOX] resumeRun error:', error);
    return res.status(500).json({ success: false, error: 'RESUME_RUN_FAILED' });
  }
}

module.exports = {
  listAgents,
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
  listRuns,
  getRun,
  resumeRun,
};
