/**
 * @module agentModelCapabilityService
 * @description Heuristic model capability classifier for agent runtime routing.
 *
 * The database stores arbitrary provider/model names. Providers expose model
 * metadata inconsistently, so this service gives the runtime and admin UI one
 * conservative answer about whether a model is suitable for tool-using agents.
 */

const TOOL_CAPABLE_PROVIDERS = new Set(['GOOGLE', 'OPENROUTER', 'NVIDIA', 'GROQ', 'DEEPSEEK']);
const OPENAI_COMPATIBLE_TOOL_PROVIDERS = new Set(['OPENROUTER', 'NVIDIA', 'GROQ', 'DEEPSEEK']);

function normalizeProvider(provider) {
  return String(provider || '').trim().toUpperCase();
}

function normalizeModel(modelName) {
  return String(modelName || '').trim().toLowerCase();
}

function includesAny(value, needles = []) {
  return needles.some(needle => value.includes(needle));
}

function getModelCapabilities(provider, modelName) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedModel = normalizeModel(modelName);
  const warnings = [];
  const strengths = [];

  let tools = TOOL_CAPABLE_PROVIDERS.has(normalizedProvider);
  let toolChoice = OPENAI_COMPATIBLE_TOOL_PROVIDERS.has(normalizedProvider);
  let structuredOutputs = ['GOOGLE', 'OPENROUTER', 'NVIDIA', 'GROQ'].includes(normalizedProvider);
  let confidence = tools ? 'medium' : 'low';

  if (!normalizedModel) {
    warnings.push('No active model is configured.');
    tools = false;
    toolChoice = false;
    structuredOutputs = false;
    confidence = 'low';
  }

  if (normalizedProvider === 'GOOGLE') {
    tools = includesAny(normalizedModel, ['gemini']);
    toolChoice = tools;
    structuredOutputs = tools;
    confidence = tools ? 'high' : 'low';
    if (tools) strengths.push('Gemini function declarations are supported by the provider adapter.');
    if (!tools && includesAny(normalizedModel, ['gemma'])) {
      warnings.push('Gemma can pass direct chat diagnostics, but this runtime only treats Gemini API function declarations as agent-ready for Google tool routing.');
      warnings.push('Use a Gemini model for Google-hosted tool-using agents, or add a dedicated Gemma tool-call parser before enabling it for agents.');
    }
  }

  if (normalizedProvider === 'OPENROUTER') {
    if (includesAny(normalizedModel, ['openrouter/auto', 'openrouter/free'])) {
      tools = false;
      toolChoice = false;
      structuredOutputs = false;
      confidence = 'low';
      warnings.push('OpenRouter auto/free routing can switch to a model without tool support.');
    } else {
      tools = true;
      toolChoice = true;
      structuredOutputs = true;
      confidence = 'medium';
      strengths.push('OpenRouter exposes OpenAI-compatible tool_calls for capable models.');
    }
  }

  if (normalizedProvider === 'NVIDIA') {
    const weakOrUnverifiedToolModel = includesAny(normalizedModel, [
      'meta/llama-3.1-8b',
      'llama-3.1-8b',
      'llama3-8b',
      'llama-3-8b',
    ]);
    const likelyAgentModel = includesAny(normalizedModel, [
      'gpt-oss',
      'minimax-m2',
      'nemotron',
      'llama-3.1-70b',
      'llama-3.1-405b',
      'llama-3.3',
    ]);
    tools = likelyAgentModel && !weakOrUnverifiedToolModel;
    toolChoice = tools;
    structuredOutputs = tools;
    confidence = tools ? 'medium' : 'low';
    strengths.push('NVIDIA NIM is routed through an OpenAI-compatible chat adapter.');
    if (!tools) {
      warnings.push('NVIDIA is the runtime provider, but this model is not in the verified agent-ready set for tool routing.');
      warnings.push('NIM tool calling also depends on auto tool choice and the correct model parser being enabled.');
    }
  }

  if (normalizedProvider === 'GROQ') {
    const likelyToolModel = includesAny(normalizedModel, [
      'llama-3.1',
      'llama-3.3',
      'llama3-groq',
      'gpt-oss',
      'moonshotai/kimi',
    ]);
    tools = likelyToolModel;
    toolChoice = likelyToolModel;
    structuredOutputs = likelyToolModel;
    confidence = likelyToolModel ? 'medium' : 'low';
    if (!likelyToolModel) warnings.push('This Groq model is not in the known tool-capable set.');
  }

  if (
    ['NVIDIA', 'OPENROUTER'].includes(normalizedProvider)
    && includesAny(normalizedModel, ['minimax-m2.7', 'minimaxai/minimax-m2.7', 'minimax/minimax-m2.7'])
  ) {
    tools = true;
    toolChoice = true;
    structuredOutputs = ['NVIDIA', 'OPENROUTER'].includes(normalizedProvider) || structuredOutputs;
    confidence = ['NVIDIA', 'OPENROUTER'].includes(normalizedProvider) ? 'medium' : confidence;
    strengths.push('MiniMax M2.7 is documented for agentic workflows and tool use.');
  }

  if (normalizedProvider === 'DEEPSEEK') {
    const isReasoner = includesAny(normalizedModel, ['reasoner', 'r1']);
    tools = !isReasoner && includesAny(normalizedModel, ['deepseek-chat', 'deepseek-v3', 'chat']);
    toolChoice = tools;
    structuredOutputs = false;
    confidence = tools ? 'medium' : 'low';
    if (isReasoner) warnings.push('Reasoning models are not used as write-capable agent tool routers.');
  }

  if (['HUGGINGFACE', 'OLLAMA'].includes(normalizedProvider)) {
    warnings.push('This provider adapter is chat-only in the current runtime.');
  }

  const nativeToolCalling = Boolean(tools);
  const agentReady = Boolean(nativeToolCalling && toolChoice);
  if (!agentReady && tools) {
    warnings.push('Tool calls may work, but explicit tool_choice is not guaranteed.');
  }

  return {
    provider: normalizedProvider || null,
    modelName: modelName || null,
    tools: Boolean(tools),
    toolChoice: Boolean(toolChoice),
    structuredOutputs: Boolean(structuredOutputs),
    nativeToolCalling,
    agentReady,
    confidence,
    label: agentReady ? 'Agent ready' : nativeToolCalling ? 'Tool-capable' : 'Chat only',
    warnings,
    strengths,
  };
}

function decorateModel(provider, model = {}) {
  return {
    ...model,
    agentSuitability: getModelCapabilities(provider, model?.modelName),
  };
}

module.exports = {
  getModelCapabilities,
  decorateModel,
};
