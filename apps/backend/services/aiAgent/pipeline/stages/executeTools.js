/**
 * @module executeTools
 * @description Stage 3: Executes tools based on the execution plan.
 * Handles planned executions, deterministic reads/actions, order draft context, and LLM-only paths.
 */

const agentToolGatewayService = require('../../agentToolGatewayService');
const toolExecutionEngine = require('../../executors/toolExecutionEngine');
const orderDraftEngine = require('../../executors/orderDraftEngine');
const customerReplyEngine = require('../../executors/customerReplyEngine');
const customerKnowledgeEvidence = require('../../executors/customerKnowledgeEvidence');

/**
 * Execute a single tool and record results.
 */
async function executeSingleTool({ agent, tool, nativeName, params, traceId, source, relevancePlan, intentMessage, runId }) {
  const result = await agentToolGatewayService.execute({
    companyId: agent.companyId,
    agent,
    tool,
    nativeName,
    params,
    traceId,
    source,
    relevancePlan,
    userMessage: intentMessage,
    runId,
  });
  return result;
}

/**
 * Push tool results to executedTools and toolEvidence arrays.
 */
function recordToolExecution({ executedTools, toolEvidence, tool, result, extra = {} }) {
  executedTools.push({
    tool,
    success: Boolean(result.success),
    readOnly: result.readOnly !== false,
    error: result.error || null,
    result: result.result || null,
    ...extra,
  });
  toolEvidence.push({
    tool,
    success: Boolean(result.success),
    readOnly: result.readOnly !== false,
    result: result.result,
    error: result.error || null,
    ...extra,
  });
}

/**
 * Execute planned tool executions (goal-run-planner).
 */
async function executePlannedTools(context) {
  const { executionPlan, agent, traceId, relevancePlan, intentMessage, runId } = context;
  const { plannedExecutions } = executionPlan;

  if (plannedExecutions.length === 0) return null;

  const toolResults = [];
  let createdAgentId = null;

  for (const plannedExecution of plannedExecutions) {
    const params = toolExecutionEngine._safeJsonClone(plannedExecution.params);

    if (plannedExecution.tool === 'skill.create' && params.assignToAgentId === '$createdAgentId') {
      if (!createdAgentId) {
        const skipped = { success: false, readOnly: false, error: 'PREVIOUS_AGENT_NOT_CREATED' };
        toolResults.push(`Tool result for ${plannedExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(plannedExecution.tool, skipped)}`);
        context.executedTools.push({ tool: plannedExecution.tool, success: false, readOnly: false, planned: true, goalRunId: plannedExecution.goalRunId, idempotencyKey: plannedExecution.idempotencyKey || null, error: skipped.error });
        context.toolEvidence.push({ tool: plannedExecution.tool, success: false, readOnly: false, result: null, error: skipped.error, planned: true, goalRunId: plannedExecution.goalRunId, idempotencyKey: plannedExecution.idempotencyKey || null });
        break;
      }
      params.assignToAgentId = createdAgentId;
    }

    const result = await executeSingleTool({
      agent, tool: plannedExecution.tool, nativeName: plannedExecution.nativeName,
      params, traceId, source: 'goal-run-planner', relevancePlan, intentMessage, runId,
    });

    toolResults.push(`Tool result for ${plannedExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(plannedExecution.tool, result)}`);
    context.executedTools.push({
      tool: plannedExecution.tool, success: Boolean(result.success), readOnly: result.readOnly !== false,
      planned: true, goalRunId: plannedExecution.goalRunId, idempotencyKey: plannedExecution.idempotencyKey || null,
      error: result.error || null, result: result.result || null,
    });
    context.toolEvidence.push({
      tool: plannedExecution.tool, success: Boolean(result.success), readOnly: result.readOnly !== false,
      result: result.result, error: result.error || null, planned: true,
      goalRunId: plannedExecution.goalRunId, idempotencyKey: plannedExecution.idempotencyKey || null,
    });

    if (plannedExecution.tool === 'agent.spawn' && result.success && result.result?.id) {
      createdAgentId = result.result.id;
    }
    if (!result.success) break;
  }

  return toolResults.join('\n\n');
}

/**
 * Execute deterministic read tool.
 */
async function executeDeterministicRead(context) {
  const { executionPlan, agent, traceId, relevancePlan, intentMessage, nativeTools, runId } = context;
  const { deterministicReadExecution } = executionPlan;

  if (!deterministicReadExecution) return null;

  if (context.conversationId) {
    if (!deterministicReadExecution.params) deterministicReadExecution.params = {};
    deterministicReadExecution.params.conversationId = context.conversationId;
  }

  const result = await executeSingleTool({
    agent, tool: deterministicReadExecution.tool, nativeName: deterministicReadExecution.nativeName,
    params: deterministicReadExecution.params, traceId, source: 'intent-read-planner', relevancePlan, intentMessage, runId,
  });

  const toolContext = `Tool result for ${deterministicReadExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(deterministicReadExecution.tool, result)}`;
  recordToolExecution({
    executedTools: context.executedTools, toolEvidence: context.toolEvidence,
    tool: deterministicReadExecution.tool, result,
    extra: { deterministic: true, relevanceIntent: relevancePlan.intent },
  });

  return toolContext;
}

/**
 * Execute deterministic action tool.
 */
async function executeDeterministicAction(context) {
  const { executionPlan, agent, traceId, relevancePlan, intentMessage, runId } = context;
  const { deterministicActionExecution } = executionPlan;

  if (!deterministicActionExecution) return null;

  const result = await executeSingleTool({
    agent, tool: deterministicActionExecution.tool, nativeName: deterministicActionExecution.nativeName,
    params: deterministicActionExecution.params, traceId, source: 'intent-action-planner', relevancePlan, intentMessage, runId,
  });

  const toolContext = `Tool result for ${deterministicActionExecution.tool}:\n${toolExecutionEngine._formatToolResultForPrompt(deterministicActionExecution.tool, result)}`;
  recordToolExecution({
    executedTools: context.executedTools, toolEvidence: context.toolEvidence,
    tool: deterministicActionExecution.tool, result,
    extra: { deterministic: true, relevanceIntent: relevancePlan.intent },
  });

  return toolContext;
}

/**
 * Execute order draft context flow (product search + draft creation).
 */
async function executeOrderDraftContext(context) {
  const { executionPlan, agent, traceId, relevancePlan, intentMessage, nativeTools, task, isStructuredTask, intentContext, runId } = context;
  const { contextOrderDraftParams } = executionPlan;

  if (!contextOrderDraftParams) return null;

  const { missingSlots } = relevancePlan;
  const needsPriceLookup = contextOrderDraftParams.productPrice === undefined
    && agent.canUseTool('product.search')
    && Array.isArray(missingSlots)
    && missingSlots.includes('productPrice');

  if (!needsPriceLookup) return null;

  const slotRepairPlan = {
    ...relevancePlan,
    missingSlots: [],
    blockedTools: Array.isArray(relevancePlan.blockedTools)
      ? relevancePlan.blockedTools.filter(tool => !['product.search', 'order.create_draft'].includes(tool))
      : [],
    allowedTools: [...new Set([...(relevancePlan.allowedTools || []), 'product.search', 'order.create_draft'])],
  };

  // Step 1: Product search
  const lookupResult = await executeSingleTool({
    agent, tool: 'product.search',
    nativeName: nativeTools.find(tool => tool.metadata?.internalName === 'product.search')?.function?.name || 'agenttool__product_search',
    params: { query: contextOrderDraftParams.productName, limit: 3 },
    traceId, source: 'order-draft-price-lookup', relevancePlan: slotRepairPlan, intentMessage, runId,
  });

  context.executedTools.push({
    tool: 'product.search', success: Boolean(lookupResult.success), readOnly: lookupResult.readOnly !== false,
    deterministic: true, priceLookup: true, error: lookupResult.error || null, result: lookupResult.result || null,
  });
  context.toolEvidence.push({
    tool: 'product.search', success: Boolean(lookupResult.success), readOnly: lookupResult.readOnly !== false,
    result: lookupResult.result, error: lookupResult.error || null, deterministic: true, priceLookup: true,
  });

  const resolvedPrice = lookupResult.success
    ? orderDraftEngine._extractProductSearchPrice(lookupResult.result, contextOrderDraftParams.productName)
    : undefined;

  const parts = [`Tool result for product.search:\n${toolExecutionEngine._formatToolResultForPrompt('product.search', lookupResult)}`];

  // Step 2: Create draft if price found
  if (resolvedPrice !== undefined) {
    const draftParams = { ...contextOrderDraftParams, productPrice: resolvedPrice };
    if (isStructuredTask && task.conversationId && !draftParams.conversationId) draftParams.conversationId = task.conversationId;
    if (intentContext.customerId && !draftParams.customerId) draftParams.customerId = intentContext.customerId;

    const draftResult = await executeSingleTool({
      agent, tool: 'order.create_draft',
      nativeName: nativeTools.find(tool => tool.metadata?.internalName === 'order.create_draft')?.function?.name || 'agenttool__order_create_draft',
      params: draftParams, traceId, source: 'order-draft-context-repair', relevancePlan: slotRepairPlan, intentMessage, runId,
    });

    parts.push(`Tool result for order.create_draft:\n${toolExecutionEngine._formatToolResultForPrompt('order.create_draft', draftResult)}`);
    const draftCreated = orderDraftEngine._isSuccessfulOrderDraftResult(draftResult);
    context.executedTools.push({
      tool: 'order.create_draft', success: draftCreated, readOnly: draftResult.readOnly !== false,
      deterministic: true, repaired: true, error: draftCreated ? null : (draftResult.error || draftResult.result?.error || draftResult.result?.message || null),
      result: draftResult.result || null,
    });
    context.toolEvidence.push({
      tool: 'order.create_draft', success: draftCreated, readOnly: draftResult.readOnly !== false,
      result: draftResult.result, error: draftCreated ? null : (draftResult.error || draftResult.result?.error || draftResult.result?.message || null),
      deterministic: true, repaired: true,
    });
    context.repaired = true;
  }

  return parts.join('\n\n');
}

/**
 * Generate LLM reply for order draft results.
 */
async function generateOrderDraftReply(context, toolContext) {
  const { relevancePlan, agent, systemPromptForTurn, userMessage, messages } = context;

  const draftCreated = context.executedTools.some(t => t.tool === 'order.create_draft' && t.success);

  if (relevancePlan.intent === 'order.draft') {
    const instruction = draftCreated
      ? `[Order Draft Tool Results]\n${toolContext}\n[/Order Draft Tool Results]\n\nUsing only the structured tool results, write one natural concise customer-facing reply in the customer's language and tone. Tell the customer the order draft was prepared and is pending merchant approval. Do not expose internal IDs, approval codes, or fixed templates.`
      : `[Order Draft Tool Results]\n${toolContext}\n[/Order Draft Tool Results]\n\nUsing only the structured tool results, write one natural concise customer-facing reply in the customer's language and tone. Explain the actual failure reason from the evidence, ask for one needed clarification if appropriate, and do not use a fixed template.`;
    return agent.generateWithLLMResult([
      { role: 'system', content: systemPromptForTurn },
      { role: 'user', content: userMessage },
      { role: 'user', content: instruction },
    ], { temperature: 0.55, maxTokens: 1024 });
  }

  return agent.generateWithLLMResult([
    { role: 'system', content: systemPromptForTurn },
    { role: 'user', content: userMessage },
    {
      role: 'user',
      content: `[Price Lookup Tool Results]\n${toolContext}\n[/Price Lookup Tool Results]\n\nUsing only the structured tool results, write one natural customer-facing reply in the customer's language and tone. Explain that a confirmed product price is still needed before preparing the order draft, and ask for the price or the minimum missing detail.`,
    },
  ], { temperature: 0.55, maxTokens: 1024 });
}

/**
 * Generate LLM reply for deterministic action (handoff).
 */
async function generateActionReply(context, toolContext) {
  const { relevancePlan, agent, canRepairCustomerReply, customerReplySourceMessage, toolEvidence, formattedHistory, customerVoiceProfile, systemPromptForTurn, userMessage } = context;
  const enrichedToolContext = await customerKnowledgeEvidence.appendSupportKnowledgeEvidence({
    companyId: agent.companyId,
    customerId: context.intentContext?.customerId || null,
    message: customerReplySourceMessage,
    relevancePlan,
    isCustomerReplyChannel: context.isCustomerReplyChannel,
    toolContext,
    executedTools: context.executedTools,
    toolEvidence,
  });

  const messages = canRepairCustomerReply
    ? customerReplyEngine._buildCompactCustomerReplyMessages({
      agentName: agent.name, role: agent.role, userMessage: customerReplySourceMessage,
      toolContext: enrichedToolContext, toolEvidence, relevancePlan, conversationHistory: formattedHistory,
      voiceProfile: customerVoiceProfile,
      taskInstruction: 'Write one natural customer-facing reply. Confirm support review for the actionable request, and also address any other latest-message ask using history/evidence. If evidence is missing for another ask, acknowledge it briefly and request the minimum missing detail without promises.',
    })
    : [
      { role: 'system', content: systemPromptForTurn },
      { role: 'user', content: userMessage },
      { role: 'user', content: `[Support Handoff Tool Result]\n${enrichedToolContext}\n[/Support Handoff Tool Result]\n\nUsing only the structured tool result and the classified intent (${relevancePlan.intent}), write one natural dynamic customer-facing reply in the customer's language and tone. Confirm support review for the actionable request, address any other latest-message ask from history/evidence, avoid unverified promises, and ask only for missing details shown by the evidence.` },
    ];

  return agent.generateWithLLMResult(messages, { temperature: 0.55, maxTokens: 1024, estimatedTokens: 1800 });
}

/**
 * Generate LLM reply for deterministic read.
 */
async function generateReadReply(context, toolContext) {
  const { agent, systemPromptForTurn, userMessage } = context;

  return agent.generateWithLLMResult([
    { role: 'system', content: systemPromptForTurn },
    { role: 'user', content: userMessage },
    {
      role: 'user',
      content: `[Read Planner Tool Results]\n${toolContext}\n[/Read Planner Tool Results]\n\nUsing only the structured tool result as trusted evidence, write one natural concise reply in the user's language and tone. Mention current system data only when useful. If the tool failed, explain only the actual failure reason from the evidence.`,
    },
  ], { temperature: 0.55, maxTokens: 1024 });
}

/**
 * Stage 3: Execute tools based on the execution plan.
 */
async function executeTools(context) {
  const { executionPlan, agent, messages, isCustomerReplyChannel } = context;
  const { plannedExecutions, deterministicReadExecution, deterministicActionExecution, contextOrderDraftParams } = executionPlan;

  let llmResult = null;
  let toolContext = '';

  // Path 1: Order draft context
  if (contextOrderDraftParams) {
    const orderDraftToolContext = await executeOrderDraftContext(context);
    if (orderDraftToolContext) {
      toolContext = orderDraftToolContext;
      llmResult = await generateOrderDraftReply(context, toolContext);
      return { ...context, toolContext, llmResult, handledContextOrderDraft: true };
    }
  }

  // Path 2: Planned executions
  if (plannedExecutions.length > 0) {
    toolContext = await executePlannedTools(context) || '';
    llmResult = await context.agent.generateWithLLMResult([
      { role: 'system', content: context.systemPromptForTurn },
      { role: 'user', content: context.userMessage },
      { role: 'user', content: `[Goal Execution Result]\n${toolContext}\n[/Goal Execution Result]\n\nWrite one concise reply in the user's language and tone describing the execution result. Do not claim success if the tool result failed.` },
    ], { temperature: 0.55, maxTokens: 1024 });
    return { ...context, toolContext, llmResult };
  }

  // Path 3: Deterministic action
  if (deterministicActionExecution) {
    toolContext = await executeDeterministicAction(context) || '';
    llmResult = await generateActionReply(context, toolContext);
    return { ...context, toolContext, llmResult };
  }

  // Path 4: Deterministic read
  if (deterministicReadExecution) {
    toolContext = await executeDeterministicRead(context) || '';
    llmResult = await generateReadReply(context, toolContext);
    return { ...context, toolContext, llmResult };
  }

  // Path 5: LLM only (no tools)
  llmResult = await agent.generateWithLLMResult(messages, {
    temperature: 0.6, maxTokens: 1024,
    ...(context.nativeTools.length > 0 ? { tools: context.nativeTools, tool_choice: 'auto' } : {}),
  });

  return { ...context, toolContext, llmResult };
}

module.exports = executeTools;
