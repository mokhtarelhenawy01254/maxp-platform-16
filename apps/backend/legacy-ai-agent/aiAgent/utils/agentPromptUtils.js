/**
 * @module agentPromptUtils
 * @description Shared utilities for agent system prompt construction and text formatting.
 * Extracted from CEOAgent to be used by BaseAgent and all specialist agents.
 */

const toolExecutionEngine = require('../executors/toolExecutionEngine');

function _stripToolCalls(text) {
  const prefix = 'CALL_TOOL:';
  let result = '';
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(prefix, i);
    if (idx === -1) { result += text.slice(i); break; }
    result += text.slice(i, idx);
    const jsonStart = text.indexOf('{', idx + prefix.length);
    if (jsonStart === -1) break;
    let depth = 0;
    let j = jsonStart;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') { depth--; if (depth === 0) break; }
    }
    i = j + 1;
  }
  return result;
}

function _cleanBlock(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function _formatSkillInstructions(skills = []) {
  if (!Array.isArray(skills) || skills.length === 0) return '';
  return skills
    .map(skill => {
      const title = skill.displayName || skill.id || 'Skill';
      const body = _cleanBlock(skill.skillMd);
      return body ? `## ${title}\n${body}` : `## ${title}`;
    })
    .join('\n\n');
}

function _formatPoliciesForPrompt(policies = {}) {
  const promptPolicies = toolExecutionEngine._safeJsonClone(policies);
  const runtimeLimits = {};
  if (promptPolicies.budget && typeof promptPolicies.budget === 'object') {
    if (promptPolicies.budget.maxToolCallsPerRun !== undefined) {
      runtimeLimits.maxToolCallsPerRun = promptPolicies.budget.maxToolCallsPerRun;
    }
    delete promptPolicies.budget;
  }
  if (Object.keys(runtimeLimits).length > 0) {
    promptPolicies.runtimeLimits = runtimeLimits;
  }
  promptPolicies.policyNotes = [
    'Runtime limits are internal safety controls, not the merchant advertising or spending budget.',
    'Do not mention a daily budget unless the user explicitly provided it in the conversation or a company setting explicitly provides it.',
  ];
  return Object.keys(promptPolicies).length > 0
    ? JSON.stringify(promptPolicies, null, 2)
    : '';
}

function _formatRelevancePrompt(plan) {
  const allowedTools = plan?.allowedTools?.length ? plan.allowedTools.join(', ') : 'none';
  const primaryTool = plan?.primaryTool || 'none';
  const requiredSlots = plan?.requiredSlots?.length ? plan.requiredSlots.join(', ') : 'none';
  const missingSlots = plan?.missingSlots?.length ? plan.missingSlots.join(', ') : 'none';
  const guardrails = plan?.guardrails?.length ? plan.guardrails.join(', ') : 'none';
  const slots = plan?.classification?.slots || plan?.slots || {};
  const slotsText = Object.keys(slots).length ? JSON.stringify(slots).slice(0, 1000) : '{}';
  const ambiguityInstruction = plan?.ambiguous
    ? '\nThis message has low confidence and is ambiguous. Do not continue with any saved goal or previous writing context, and do not assume the customer is asking for a product, order, or agent. Ask a specific clarification question before any execution.'
    : '';
  return `
[INTENT_GATE_AND_TOOL_FIT]
contract_version: ${plan?.schemaVersion || 'legacy'}
intent: ${plan?.intent || 'general.chat'}
source: ${plan?.source || 'unknown'}
decision: ${plan?.decision || 'answer'}
confidence: ${Number.isFinite(plan?.confidence) ? plan.confidence : 'unknown'}
risk_level: ${plan?.riskLevel || 'low'}
requires_tool: ${Boolean(plan?.requiresTool)}
primary_tool: ${primaryTool}
allowed_tools: ${allowedTools}
required_slots: ${requiredSlots}
missing_slots: ${missingSlots}
guardrails: ${guardrails}
classification_slots: ${slotsText}
reason: ${plan?.reason || 'No current system data required'}

If allowed_tools = none, respond with text only and do not invent any live data. If you need real data, use the appropriate tool from the available tools listed in the SOUL instructions.
Tool calls are internal to the system only. Do not write any visible reply format like CALL_TOOL, tool_calls, DSML, or agenttool__.
${ambiguityInstruction}
[/INTENT_GATE_AND_TOOL_FIT]
`.trim();
}

module.exports = {
  _stripToolCalls,
  _cleanBlock,
  _formatSkillInstructions,
  _formatPoliciesForPrompt,
  _formatRelevancePrompt,
};
