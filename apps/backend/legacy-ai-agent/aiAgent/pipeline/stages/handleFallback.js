/**
 * @module handleFallback
 * @description Stage 4: Handles LLM fallback, tool repair, and multi-round tool execution.
 * When tools fail or LLM doesn't call tools, this stage attempts repair via
 * model-classified slots for customer channels and deterministic planners for
 * non-customer operational channels.
 */

const { TOOLS: CEO_TOOLS } = require('../../agentToolRegistry');
const agentToolGatewayService = require('../../agentToolGatewayService');
const toolExecutionEngine = require('../../executors/toolExecutionEngine');
const intentExecutionRouter = require('../../executors/intentExecutionRouter');
const orderDraftEngine = require('../../executors/orderDraftEngine');
const customerReplyEngine = require('../../executors/customerReplyEngine');
const customerKnowledgeEvidence = require('../../executors/customerKnowledgeEvidence');

const MAX_TOOL_ROUNDS = 6;


/**
 * Handle LLM failure by trying model-classified handoff repair for customer channels.
 */
async function handleLlmFailure(context) {
  const {
    isCustomerReplyChannel, relevancePlan, intentMessage, nativeTools, agent,
    traceId, intentContext, task, isStructuredTask, executedTools, toolEvidence,
    canRepairCustomerReply, customerReplySourceMessage, formattedHistory, customerVoiceProfile,
    runId,
  } = context;

  if (!isCustomerReplyChannel) return null;

  const handoffExecution = intentExecutionRouter._getModelClassifiedHandoffExecution(relevancePlan, intentMessage, nativeTools, {
    ...intentContext, conversationId: isStructuredTask ? task.conversationId : null,
  });

  if (!handoffExecution) return null;
  if (!agent.canUseTool(handoffExecution.tool)) return null;

  const result = await agentToolGatewayService.execute({
    companyId: agent.companyId, agent, tool: handoffExecution.tool,
    nativeName: handoffExecution.nativeName, params: handoffExecution.params,
    traceId, source: 'model-classified-action-repair', relevancePlan, userMessage: intentMessage,
    runId,
  });

  let toolContext = `• Tool result for ${handoffExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(handoffExecution.tool, result)}`;
  executedTools.push({
    tool: handoffExecution.tool, success: Boolean(result.success), readOnly: result.readOnly !== false,
    modelClassified: true, repaired: true, error: result.error || null, result: result.result || null,
  });
  toolEvidence.push({
    tool: handoffExecution.tool, success: Boolean(result.success), readOnly: result.readOnly !== false,
    result: result.result, error: result.error || null, modelClassified: true, repaired: true,
  });
  toolContext = await customerKnowledgeEvidence.appendSupportKnowledgeEvidence({
    companyId: agent.companyId,
    customerId: intentContext?.customerId || null,
    message: customerReplySourceMessage,
    relevancePlan,
    isCustomerReplyChannel,
    toolContext,
    executedTools,
    toolEvidence,
  });

  const llmResult = await agent.generateWithLLMResult(customerReplyEngine._buildCompactCustomerReplyMessages({
    agentName: agent.name, role: agent.role, userMessage: customerReplySourceMessage,
    toolContext, toolEvidence, relevancePlan, conversationHistory: formattedHistory,
    voiceProfile: customerVoiceProfile,
    taskInstruction: 'Write one natural customer-facing reply. Confirm support review for the actionable request, and also address any other latest-message ask using history/evidence. If evidence is missing for another ask, acknowledge it briefly and request the minimum missing detail without promises.',
  }), { temperature: 0.55, maxTokens: 1024, estimatedTokens: 1800 });

  return { toolContext, llmResult, repaired: true };
}

/**
 * Stage 4: Handle fallback, tool loop, and repair.
 */
async function handleFallback(context) {
  let { llmResult, executedTools, toolEvidence, isCustomerReplyChannel } = context;
  let repaired = context.repaired === true;
  const relevancePlan = context.relevancePlan || {};
  let toolContext = context.toolContext;

  // If no LLM result, try model-classified customer handoff repair
  if (!llmResult) {
    const fallback = await handleLlmFailure(context);
    if (fallback) {
      return {
        ...context,
        toolContext: fallback.toolContext,
        llmResult: fallback.llmResult,
        llmResponse: fallback.llmResult?.text || '',
        repaired: true,
      };
    }

    // No LLM result at all
    await agentToolGatewayService.logReplyBlocked(context.agent.companyId, {
      traceId: context.traceId, agentId: context.agent.id,
      reason: 'No agent-ready model returned a result',
      metadata: { task: context.intentMessage, toolRounds: 0, tools: executedTools, repaired, modelSelection: context.agent._lastModelSelection || null },
    });
    const failureMessage = isCustomerReplyChannel
      ? 'No agent-ready model returned a result for customer channel'
      : 'No agent-ready model returned a result';
    return {
      ...context,
      earlyReturn: context.agent._failedReply('AI_AGENT_LLM_UNAVAILABLE', failureMessage, {
        task: context.intentMessage, toolRounds: 0, tools: executedTools, repaired,
      }),
    };
  }

  let llmResponse = llmResult.text || '';

  // Execute multi-round tool loop
  const loopResult = await toolExecutionEngine.executeToolLoop({ ...context, llmResult, llmResponse });
  llmResult = loopResult.llmResult;
  llmResponse = loopResult.llmResponse;
  const rounds = loopResult.toolRounds;
  const loopDetectedToolCallLeak = loopResult.hasToolCallLeak;

  // Classifier read repair for customer channels
  const hasSuccessfulTool = executedTools.some(t => t.success);
  const attemptedPrimaryTool = executedTools.some(t => t.tool === relevancePlan.primaryTool);
  const primaryToolDefinition = CEO_TOOLS[relevancePlan.primaryTool];

  const classifierReadRepairExecution = isCustomerReplyChannel
    && !hasSuccessfulTool
    && relevancePlan.requiresTool
    && relevancePlan.primaryTool
    && !attemptedPrimaryTool
    && context.agent.canUseTool(relevancePlan.primaryTool)
    ? intentExecutionRouter._getModelClassifiedReadToolExecution(relevancePlan, context.nativeTools)
    : null;

  if (classifierReadRepairExecution) {
    repaired = true;
    const result = await agentToolGatewayService.execute({
      companyId: context.agent.companyId, agent: context.agent,
      tool: classifierReadRepairExecution.tool, nativeName: classifierReadRepairExecution.nativeName,
      params: toolExecutionEngine._safeJsonClone(classifierReadRepairExecution.params),
      traceId: context.traceId, source: 'model-classified-read-repair',
      relevancePlan: context.relevancePlan, userMessage: context.intentMessage,
      runId: context.runId,
    });
    toolContext = `• Tool result for ${classifierReadRepairExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(classifierReadRepairExecution.tool, result)}`;
    executedTools.push({
      tool: classifierReadRepairExecution.tool, success: Boolean(result.success), readOnly: result.readOnly !== false,
      modelClassified: true, repaired: true, relevanceIntent: context.relevancePlan.intent,
      error: result.error || null, result: result.result || null,
    });
    toolEvidence.push({
      tool: classifierReadRepairExecution.tool, success: Boolean(result.success), readOnly: result.readOnly !== false,
      result: result.result, error: result.error || null, modelClassified: true, repaired: true,
    });
    const repairedResult = await context.agent.generateWithLLMResult(customerReplyEngine._buildCompactCustomerReplyMessages({
      agentName: context.agent.name, role: context.agent.role, userMessage: context.customerReplySourceMessage,
      toolContext, toolEvidence, relevancePlan,
      conversationHistory: context.formattedHistory, voiceProfile: context.customerVoiceProfile,
      taskInstruction: 'The previous draft skipped required read-only grounding. Write one final customer-facing Messenger reply only. Answer from the structured evidence now.',
    }), { temperature: 0.5, maxTokens: 1024, estimatedTokens: 1800 });
    if (repairedResult?.text) llmResponse = repairedResult.text;
  }

  // General repair for non-customer channels
  let repairExecution = null;
  if (!executedTools.some(t => t.success) && relevancePlan.requiresTool && relevancePlan.primaryTool
    && !attemptedPrimaryTool && context.agent.canUseTool(relevancePlan.primaryTool)) {
    if (isCustomerReplyChannel) {
      repairExecution = primaryToolDefinition?.readOnly !== false
        ? intentExecutionRouter._getModelClassifiedReadToolExecution(relevancePlan, context.nativeTools)
        : intentExecutionRouter._getModelClassifiedWriteToolExecution(relevancePlan, context.nativeTools);
    } else {
      repairExecution = primaryToolDefinition?.readOnly !== false
        ? intentExecutionRouter._getDeterministicReadToolExecution(relevancePlan, context.intentMessage, context.nativeTools, {
          isCustomerReplyChannel,
          intentContext: context.intentContext,
        })
        : intentExecutionRouter._getDeterministicWriteToolExecution(relevancePlan, context.executionMessage, context.nativeTools, {
          isCustomerReplyChannel,
          intentContext: context.intentContext,
        });
    }
  }

  if (repairExecution) {
    if (!context.agent.canUseTool(repairExecution.tool)) {
      repairExecution = null;
    }
  }

  if (repairExecution) {
    repaired = true;
    const repairParams = toolExecutionEngine._safeJsonClone(repairExecution.params);
    if (repairExecution.tool === 'order.create_draft') {
      if (context.isStructuredTask && context.task.conversationId && !repairParams.conversationId) repairParams.conversationId = context.task.conversationId;
      if (context.intentContext.customerId && !repairParams.customerId) repairParams.customerId = context.intentContext.customerId;
    }
    const result = await agentToolGatewayService.execute({
      companyId: context.agent.companyId, agent: context.agent,
      tool: repairExecution.tool, nativeName: repairExecution.nativeName, params: repairParams,
      traceId: context.traceId,
      source: isCustomerReplyChannel ? 'model-classified-slot-repair'
        : (primaryToolDefinition?.readOnly !== false ? 'intent-relevance-gate' : 'intent-action-parser-post-llm'),
      relevancePlan, userMessage: context.intentMessage,
      runId: context.runId,
    });
    // arabic-strings: internal-signal-start
    toolContext = `Tool result for ${repairExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(repairExecution.tool, result)}`;
    // arabic-strings: internal-signal-end
    const repairSuccess = repairExecution.tool === 'order.create_draft'
      ? orderDraftEngine._isSuccessfulOrderDraftResult(result) : Boolean(result.success);
    const repairError = repairSuccess ? null : (result.error || result.result?.error || result.result?.message || null);
    executedTools.push({
      tool: repairExecution.tool, success: repairSuccess, readOnly: result.readOnly !== false,
      ...(isCustomerReplyChannel ? { modelClassified: true } : { deterministic: true }),
      repaired: true, relevanceIntent: relevancePlan.intent,
      error: repairError, result: result.result || null,
    });
    toolEvidence.push({
      tool: repairExecution.tool, success: repairSuccess, readOnly: result.readOnly !== false,
      result: result.result, error: repairError, repaired: true,
      ...(isCustomerReplyChannel ? { modelClassified: true } : { deterministic: true }),
    });
    toolContext = await customerKnowledgeEvidence.appendSupportKnowledgeEvidence({
      companyId: context.agent.companyId,
      customerId: context.intentContext?.customerId || null,
      message: context.customerReplySourceMessage,
      relevancePlan,
      isCustomerReplyChannel,
      toolContext,
      executedTools,
      toolEvidence,
    });
    const repairedResult = context.canRepairCustomerReply
      ? await context.agent.generateWithLLMResult(customerReplyEngine._buildCompactCustomerReplyMessages({
        agentName: context.agent.name, role: context.agent.role, userMessage: context.customerReplySourceMessage,
        toolContext, toolEvidence, relevancePlan,
        conversationHistory: context.formattedHistory, voiceProfile: context.customerVoiceProfile,
        taskInstruction: 'Write one natural customer-facing reply using the tool evidence. Address each distinct latest-message ask that can be handled from history/evidence; briefly acknowledge unsupported asks and request the minimum missing detail without promises.',
      }), { temperature: 0.55, maxTokens: 1024, estimatedTokens: 1800 })
      : await context.agent.generateWithLLMResult([
        { role: 'system', content: context.systemPromptForTurn },
        { role: 'user', content: context.userMessage },
        { role: 'user', content: `[Intent Gate Tool Results]\n${toolContext}\n[/Intent Gate Tool Results]\n\nUsing only the structured tool result as trusted evidence, write one natural concise reply in the user's language and tone.` },
      ], { temperature: 0.55, maxTokens: 1024 });
    if (repairedResult?.text) llmResponse = repairedResult.text;
  }

  return { ...context, toolContext, llmResult, llmResponse, repaired, toolRounds: rounds, loopDetectedToolCallLeak };
}

module.exports = handleFallback;
