/**
 * @module routeToTools
 * @description Stage 2: Determines which tools to execute based on the relevance plan.
 * Routes to planned executions, deterministic reads/actions, or order draft context.
 */

const { TOOLS: CEO_TOOLS } = require('../../agentToolRegistry');
const intentExecutionRouter = require('../../executors/intentExecutionRouter');
const orderDraftEngine = require('../../executors/orderDraftEngine');
const toolExecutionEngine = require('../../executors/toolExecutionEngine');
const customerReplyEngine = require('../../executors/customerReplyEngine');

/**
 * Build system prompt with relevance plan appended.
 */
function buildSystemPromptForTurn(systemPrompt, relevancePlan) {
  const { _formatRelevancePrompt } = require('../../CEOAgent');
  return `${systemPrompt}\n\n${_formatRelevancePrompt(relevancePlan)}`;
}

/**
 * Build LLM messages based on channel type.
 */
function buildMessages({ isCustomerReplyChannel, customerReplySourceMessage, userMessage, systemPromptForTurn, relevancePlan, formattedHistory, customerVoiceProfile, agent }) {
  if (isCustomerReplyChannel) {
    return customerReplyEngine._buildCompactCustomerToolMessages({
      agentName: agent.name,
      role: agent.role,
      userMessage: customerReplySourceMessage,
      relevancePlan,
      conversationHistory: formattedHistory,
      voiceProfile: customerVoiceProfile,
    });
  }
  return [
    { role: 'system', content: systemPromptForTurn },
    { role: 'user', content: userMessage },
  ];
}

/**
 * Stage 2: Route to the appropriate tool execution path.
 */
async function routeToTools(context) {
  const {
    relevancePlan,
    isCustomerReplyChannel,
    intentMessage,
    executionMessage,
    nativeTools,
    intentContext,
    task,
    isStructuredTask,
    agent,
    systemPrompt,
    customerReplySourceMessage,
    formattedHistory,
    customerVoiceProfile,
  } = context;

  const systemPromptForTurn = buildSystemPromptForTurn(systemPrompt, relevancePlan);
  const messages = buildMessages({
    isCustomerReplyChannel,
    customerReplySourceMessage,
    userMessage: context.userMessage,
    systemPromptForTurn,
    relevancePlan,
    formattedHistory,
    customerVoiceProfile,
    agent,
  });

  // Determine execution plan
  const plannedExecutions = intentExecutionRouter._getPlannedToolExecutions(relevancePlan, intentContext);

  const deterministicReadExecution = plannedExecutions.length === 0
    && !isCustomerReplyChannel
    ? intentExecutionRouter._getDeterministicReadToolExecution(relevancePlan, intentMessage, nativeTools, {
      isCustomerReplyChannel,
      intentContext,
    })
    : null;

  const deterministicActionExecution = plannedExecutions.length === 0 && !deterministicReadExecution
    && !isCustomerReplyChannel
    ? intentExecutionRouter._getDeterministicActionToolExecution(relevancePlan, intentMessage, nativeTools, {
      ...intentContext,
      isCustomerReplyChannel,
      conversationId: isStructuredTask ? task.conversationId : null,
    })
    : null;

  // Order draft context (non-customer channels only)
  const contextOrderDraftParams = !isCustomerReplyChannel
    && relevancePlan.intent === 'orders.create_draft'
    && agent.canUseTool('order.create_draft')
    ? orderDraftEngine._parseOrderDraftParams(executionMessage, {
      requirePrice: false,
      isCustomerReplyChannel,
      intentContext,
    })
    : null;

  const executionPlan = {
    plannedExecutions,
    deterministicReadExecution,
    deterministicActionExecution,
    contextOrderDraftParams,
  };

  return {
    ...context,
    systemPromptForTurn,
    messages,
    executionPlan,
    toolContext: '',
    executedTools: [],
    toolEvidence: [],
    rounds: 0,
    repaired: false,
    llmResult: null,
    llmResponse: '',
  };
}

module.exports = routeToTools;
module.exports.buildSystemPromptForTurn = buildSystemPromptForTurn;
module.exports.buildMessages = buildMessages;
