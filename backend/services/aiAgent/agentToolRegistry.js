/**
 * @module agentToolRegistry
 * @description Real database tools for the CEOAgent.
 * Decoupled and modularized into domain files under tools/.
 *
 * Tool structure:
 * {
 *   description: string   (shown in system prompt)
 *   params: Object        (param names + descriptions)
 *   readOnly: boolean     (false = requires policy check before execution)
 *   handler: async (companyId, params) => result
 * }
 */

const NATIVE_TOOL_PREFIX = 'agenttool__';

// Domain-scoped tools
const managerTools = require('./tools/managerTools');
const hrTools = require('./tools/hrTools');
const orderTools = require('./tools/orderTools');
const productTools = require('./tools/productTools');
const customerTools = require('./tools/customerTools');
const inventoryTools = require('./tools/inventoryTools');
const salesTools = require('./tools/salesTools');
const competitorTools = require('./tools/competitorTools');
const facebookTools = require('./tools/facebookTools');
const googleSheetsTools = require('./tools/googleSheetsTools');
const governanceTools = require('./tools/governanceTools');

// Dynamic aggregation of all tools
const TOOLS = {
  ...managerTools,
  ...hrTools,
  ...orderTools,
  ...productTools,
  ...customerTools,
  ...inventoryTools,
  ...salesTools,
  ...competitorTools,
  ...facebookTools,
  ...googleSheetsTools,
  ...governanceTools,
};

function toNativeToolName(toolName = '') {
  return `${NATIVE_TOOL_PREFIX}${String(toolName).replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

function toNativeToolAliasName(toolName = '') {
  return String(toolName).replace(/[^A-Za-z0-9_-]/g, '_');
}

function fromNativeToolName(nativeToolName = '') {
  const normalized = String(nativeToolName || '');
  if (!normalized.startsWith(NATIVE_TOOL_PREFIX)) {
    const aliasMatch = Object.keys(TOOLS).find(toolName => toNativeToolAliasName(toolName) === normalized);
    if (aliasMatch) return aliasMatch;
    const dotted = normalized.replace(/_/g, '.');
    return TOOLS[dotted] ? dotted : normalized;
  }
  const safe = normalized.slice(NATIVE_TOOL_PREFIX.length);
  const match = Object.keys(TOOLS).find(toolName => toNativeToolName(toolName) === normalized);
  return match || safe.replace(/_/g, '.');
}

function getToolMetadata(name) {
  const tool = TOOLS[name];
  if (!tool) return null;
  return {
    description: tool.description || '',
    sideEffects: tool.readOnly ? 'read' : 'write',
    requiresApproval: Boolean(tool.requiresApproval),
    companyScoped: Boolean(tool.companyScoped),
    handler: tool.handler || null,
  };
}

function getJsonTypeForParam(paramName = '') {
  const lower = String(paramName).toLowerCase();
  if (['limit', 'count', 'page', 'quantity', 'qty'].some(token => lower.includes(token))) return 'number';
  if (['price', 'amount', 'percent', 'stock', 'total'].some(token => lower.includes(token))) return 'number';
  if (lower.startsWith('is') || lower.startsWith('has') || lower.includes('enabled') || lower.includes('overwrite')) return 'boolean';
  if (
    lower.includes('tools') ||
    lower.includes('skills') ||
    ['colors', 'sizes', 'tags', 'images', 'triggerphrases', 'triggers', 'steps', 'workflow', 'constraints', 'rules', 'examples'].includes(lower)
  ) return 'array';
  return 'string';
}

function buildNativeParameters(params = {}, requiredParams = []) {
  const properties = {};
  for (const [name, description] of Object.entries(params || {})) {
    const type = getJsonTypeForParam(name);
    properties[name] = type === 'array'
      ? { type: 'array', items: { type: 'string' }, description: String(description || '') }
      : { type, description: String(description || '') };
  }
  return {
    type: 'object',
    properties,
    required: Array.isArray(requiredParams)
      ? requiredParams.filter(name => Object.prototype.hasOwnProperty.call(properties, name))
      : [],
    additionalProperties: false,
  };
}

function validateToolParams(toolName, tool, params = {}) {
  const errors = [];
  for (const requiredParam of tool.requiredParams || []) {
    const value = params?.[requiredParam];
    const missing = value === undefined
      || value === null
      || (typeof value === 'string' && value.trim() === '');
    if (missing) errors.push(`${requiredParam} is required`);
  }
  if (errors.length) {
    return { valid: false, error: `INVALID_TOOL_INPUT:${toolName}:${errors.join('; ')}` };
  }
  return { valid: true };
}

// ─── Tool descriptions for system prompt ──────────────────────────────────────

/**
 * Returns tool descriptions for the system prompt.
 * @param {string[]|null} filter - tool names to include; null = all
 */
function getToolDescriptions(filter = null, options = {}) {
  const includeParameters = options.includeParameters !== false;
  const entries = filter
    ? Object.entries(TOOLS).filter(([name]) => filter.includes(name))
    : Object.entries(TOOLS);

  return entries
    .map(([name, tool]) => {
      const paramsList = Object.entries(tool.params || {})
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');
      const type = tool.readOnly ? 'read only' : 'write/action';
      return `- ${name} [${type}]\n  ${tool.description}${includeParameters && paramsList ? '\n  parameters:\n' + paramsList : ''}`;
    })
    .join('\n\n');
}

function buildNativeToolDefinition(name, tool, nativeName, alias = false) {
  return {
    type: 'function',
    function: {
      name: nativeName,
      description: `${tool.description}${tool.readOnly ? ' (read only)' : ' (write/action tool; obey policy and audit rules)'}`,
      parameters: tool.inputSchema && tool.inputSchema.type === 'object'
        ? tool.inputSchema
        : buildNativeParameters(tool.params || {}, tool.requiredParams || []),
    },
    metadata: {
      internalName: name,
      readOnly: Boolean(tool.readOnly),
      alias,
    },
  };
}

function getNativeToolDefinitions(filter = null, options = {}) {
  const includeAliases = options.includeAliases === true;
  const entries = filter
    ? Object.entries(TOOLS).filter(([name]) => filter.includes(name))
    : Object.entries(TOOLS);

  return entries.flatMap(([name, tool]) => {
    const canonical = buildNativeToolDefinition(name, tool, toNativeToolName(name));
    if (!includeAliases) return [canonical];
    const aliasName = toNativeToolAliasName(name);
    if (!aliasName || aliasName === canonical.function.name) return [canonical];
    return [canonical, buildNativeToolDefinition(name, tool, aliasName, true)];
  });
}

// ─── Tool executor ────────────────────────────────────────────────────────────

/**
 * Execute a single tool call.
 *
 * @param {string} companyId
 * @param {string} toolName
 * @param {Object} params
 * @returns {Promise<{ success: boolean, result?: any, error?: string }>}
 */
async function executeTool(companyId, toolName, params = {}) {
  const tool = TOOLS[toolName];
  if (!tool) {
    return { success: false, error: `TOOL_NOT_FOUND:${toolName}` };
  }

  const inputValidation = validateToolParams(toolName, tool, params);
  if (!inputValidation.valid) {
    return { success: false, error: inputValidation.error, readOnly: tool.readOnly };
  }

  try {
    const result = await tool.handler(companyId, params);
    return { success: true, result, readOnly: tool.readOnly };
  } catch (error) {
    console.error(`[TOOL-REGISTRY] Error executing ${toolName}:`, error.message);
    return { success: false, error: `TOOL_EXECUTION_FAILED:${toolName}:${error.message}` };
  }
}

async function executeNativeTool(companyId, nativeToolName, params = {}) {
  return executeTool(companyId, fromNativeToolName(nativeToolName), params);
}

/**
 * Parse all CALL_TOOL directives from an LLM response string.
 *
 * @param {string} text
 * @returns {Array<{ tool: string, params: Object }>}
 */
function parseToolCalls(text) {
  const calls = [];
  const prefix = 'CALL_TOOL:';
  let searchFrom = 0;

  while (true) {
    const idx = text.indexOf(prefix, searchFrom);
    if (idx === -1) break;

    const jsonStart = text.indexOf('{', idx + prefix.length);
    if (jsonStart === -1) break;

    // Count brace depth to find the matching closing brace
    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { jsonEnd = i; break; }
      }
    }

    if (jsonEnd === -1) break;

    try {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      if (parsed.tool) calls.push({ tool: parsed.tool, params: parsed.params || {} });
    } catch {
      // ignore malformed JSON
    }

    searchFrom = jsonEnd + 1;
  }

  return calls;
}

module.exports = {
  TOOLS,
  executeTool,
  executeNativeTool,
  parseToolCalls,
  getToolDescriptions,
  getNativeToolDefinitions,
  getToolMetadata,
  toNativeToolName,
  toNativeToolAliasName,
  fromNativeToolName,
};
