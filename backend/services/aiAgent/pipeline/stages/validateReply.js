/**
 * @module validateReply
 * @description Stage 5: Validates the final reply, strips internal syntax,
 * checks grounding against tool evidence, and finalizes the response.
 */

const { normalizeAgentReply } = require('../../agentReplyNormalizer');
const { stripInternalToolSyntax, containsInternalToolSyntax } = require('../../agentToolCallParser');
const agentToolGatewayService = require('../../agentToolGatewayService');
const toolExecutionEngine = require('../../executors/toolExecutionEngine');
const customerReplyEngine = require('../../executors/customerReplyEngine');

/**
 * Strip CALL_TOOL: syntax from reply text.
 */
function stripToolCalls(text) {
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

/**
 * Regenerate a customer reply when the draft is invalid.
 */
async function regenerateCustomerReply(context, reason) {
  const { agent, canRepairCustomerReply, customerReplySourceMessage, toolContext,
    toolEvidence, relevancePlan, formattedHistory, customerVoiceProfile } = context;

  if (!canRepairCustomerReply) return '';

  const isCatalogGroundingFailure = /catalog|availability|price|inventory/i.test(String(reason || ''))
    && (toolEvidence || []).some(entry => (
      !entry.success
      && ['product.search', 'inventory.check', 'googlesheets.searchProducts', 'googlesheets.readProducts'].includes(entry.tool)
    ));
  const taskInstruction = [
    `The previous assistant draft was rejected by the runtime. Reason: ${reason}.`,
    'Write one final customer-facing Messenger reply only.',
    isCatalogGroundingFailure
      ? 'A catalog or Google Sheets lookup failed. Do not state that a product is available, unavailable, in stock, out of stock, priced, discounted, or has any specific variant. Briefly say you cannot confirm the current catalog details from the sheet right now and ask for a retry or merchant check.'
      : 'If evidence is missing, ask for the missing customer detail naturally.',
    'If the customer asked for product images and evidence contains image URLs, include the most relevant URL(s) exactly.',
    'Do not claim that an order, refund, exchange, or shipping update was completed unless the evidence confirms it.',
  ].join(' ');

  const repairResult = await agent.generateWithLLMResult(customerReplyEngine._buildCompactCustomerReplyMessages({
    agentName: agent.name, role: agent.role, userMessage: customerReplySourceMessage,
    toolContext, toolEvidence, relevancePlan, conversationHistory: formattedHistory,
    voiceProfile: customerVoiceProfile,
    taskInstruction,
  }), { temperature: 0.5, maxTokens: 1024, estimatedTokens: 1800 });

  const repairedText = repairResult?.text || '';
  return normalizeAgentReply(stripInternalToolSyntax(stripToolCalls(repairedText)));
}

/**
 * Stage 5: Validate and finalize the reply.
 */
async function validateReply(context) {
  const { llmResponse, toolEvidence, relevancePlan, isCustomerReplyChannel,
    canRepairCustomerReply, agent, traceId, executedTools, repaired, toolRounds,
    loopDetectedToolCallLeak } = context;

  const cleanedReply = stripInternalToolSyntax(stripToolCalls(llmResponse));
  let finalReply = normalizeAgentReply(cleanedReply);
  let finalRepaired = Boolean(repaired);
  const hasInternalToolSyntax = containsInternalToolSyntax(llmResponse) || loopDetectedToolCallLeak;

  // Handle internal tool syntax leak
  if (hasInternalToolSyntax) {
    if (!isCustomerReplyChannel) {
      await agentToolGatewayService.logReplyBlocked(agent.companyId, {
        traceId, agentId: agent.id,
        reason: 'Model emitted internal tool-call syntax instead of a user-facing answer',
        metadata: { toolRounds, tools: executedTools, leakedSample: String(llmResponse || '').slice(0, 500) },
      });
      return {
        ...context,
        earlyReturn: agent._failedReply('AI_AGENT_TOOL_CALL_LEAK', 'The selected model emitted internal tool-call syntax', {
          task: context.intentMessage, toolRounds, tools: executedTools, repaired,
        }),
      };
    }
    if (finalReply) {
      console.warn('[CEO-AGENT] Model leaked tool-call syntax but a clean reply was recovered; using cleaned reply');
    } else {
      finalReply = await regenerateCustomerReply(context, 'internal tool syntax leaked into the draft');
      finalRepaired = true;
      if (!finalReply) {
        await agentToolGatewayService.logReplyBlocked(agent.companyId, {
          traceId, agentId: agent.id,
          reason: 'Model emitted internal tool-call syntax instead of a user-facing answer',
          metadata: { toolRounds, tools: executedTools, leakedSample: String(llmResponse || '').slice(0, 500) },
        });
        return {
          ...context,
          earlyReturn: agent._failedReply('AI_AGENT_TOOL_CALL_LEAK', 'The selected model emitted internal tool-call syntax', {
            task: context.intentMessage, toolRounds, tools: executedTools, repaired,
          }),
        };
      }
    }
  }

  // Handle empty reply
  if (!finalReply) {
    finalReply = await regenerateCustomerReply(context, 'empty or non-customer-facing draft');
    finalRepaired = true;
    if (!finalReply) {
      return {
        ...context,
        earlyReturn: agent._failedReply('AI_AGENT_EMPTY_REPLY', 'The selected model returned no assistant text', {
          task: context.intentMessage, toolRounds, tools: executedTools, repaired,
        }),
      };
    }
  }

  // Validate grounding
  let grounding = toolExecutionEngine._validateGroundedReply({ reply: finalReply, toolEvidence, relevancePlan });
  if (!grounding.valid && canRepairCustomerReply) {
    const repairedReply = await regenerateCustomerReply(context, grounding.reason || 'grounding validation failed');
    if (repairedReply) {
      finalReply = repairedReply;
      finalRepaired = true;
      grounding = toolExecutionEngine._validateGroundedReply({ reply: finalReply, toolEvidence, relevancePlan });
    }
  }
  if (!grounding.valid) {
    await agentToolGatewayService.logReplyBlocked(agent.companyId, {
      traceId, agentId: agent.id, reason: grounding.reason,
      metadata: { task: context.intentMessage, toolRounds, tools: executedTools, grounding },
    });
    return {
      ...context,
      earlyReturn: agent._failedReply('AI_AGENT_UNGROUNDED_REPLY', grounding.reason, {
        task: context.intentMessage, toolRounds, tools: executedTools, grounding, repaired,
      }),
    };
  }

  return { ...context, finalReply, grounding, repaired: finalRepaired };
}

module.exports = validateReply;
