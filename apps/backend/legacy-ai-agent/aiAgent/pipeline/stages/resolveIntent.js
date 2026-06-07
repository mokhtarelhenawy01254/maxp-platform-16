/**
 * @module resolveIntent
 * @description Stage 1: Extracts task fields, loads system prompt, resolves intent relevance plan,
 * and determines the customer reply channel.
 */

const agentIntentRelevanceService = require('../../agentIntentRelevanceService');
const agentToolGatewayService = require('../../agentToolGatewayService');
const { getNativeToolDefinitions } = require('../../agentToolRegistry');
const customerReplyEngine = require('../../executors/customerReplyEngine');

const CUSTOMER_CHANNELS = ['FACEBOOK', 'MESSENGER', 'FB', 'WHATSAPP', 'WA'];
const SALES_SUPPORT_ROLES = ['FACEBOOK_SALES_SUPPORT', 'SALES', 'SUPPORT'];

/**
 * Extract message strings from a task object.
 */
function extractMessages(task) {
  const isStructuredTask = task && typeof task === 'object';
  const userMessage = typeof task === 'string' ? task : (task.description || JSON.stringify(task));
  const intentMessage = isStructuredTask
    ? (task.intentMessage || task.currentMessage || task.message || task.description || JSON.stringify(task))
    : userMessage;
  const executionMessage = isStructuredTask
    ? (task.executionMessage || task.description || intentMessage)
    : userMessage;
  return { userMessage, intentMessage, executionMessage, isStructuredTask };
}

/**
 * Extract context fields from a task object.
 */
function extractContext(task) {
  const isStructuredTask = task && typeof task === 'object';
  const intentContext = isStructuredTask && task.intentContext && typeof task.intentContext === 'object'
    ? task.intentContext
    : {};
  const conversationHistory = isStructuredTask && Array.isArray(task.conversationHistory)
    ? task.conversationHistory
    : [];
  const formattedHistory = conversationHistory.length > 1
    ? conversationHistory
      .slice(0, -1)
      .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
      .join('\n')
    : '';
  const conversationId = isStructuredTask ? task.conversationId : null;
  const sessionId = isStructuredTask ? task.sessionId : null;
  return { intentContext, conversationHistory, formattedHistory, conversationId, sessionId, isStructuredTask };
}

/**
 * Detect whether the current channel is a customer-facing channel.
 */
function detectCustomerChannel(intentContext) {
  const channel = String(intentContext?.channel || '').trim().toUpperCase();
  return CUSTOMER_CHANNELS.includes(channel);
}

/**
 * Stage 1: Resolve intent and build initial context.
 */
async function resolveIntent(context) {
  const { task, agent } = context;

  if (!agent._modelManager) {
    return {
      ...context,
      earlyReturn: agent._failedReply('AI_AGENT_LLM_UNAVAILABLE', 'No model manager is available for CEOAgent'),
    };
  }

  const messages = extractMessages(task);
  const ctx = extractContext(task);
  const systemPrompt = await agent._getSystemPrompt();
  const customerVoiceProfile = agent._customerVoiceProfile || '';
  const isCustomerReplyChannel = detectCustomerChannel(ctx.intentContext);

  // Run input guardrails
  const guardrailResult = await agent.runInputGuardrails(context, messages.intentMessage);
  if (!guardrailResult.allowed) {
    const reasons = guardrailResult.violations.map(v => v.message).join('; ');
    return {
      ...context,
      earlyReturn: {
        status: 'GUARDRAIL_BLOCKED',
        result: { 
          reply: 'I cannot process this request.',
          replyReason: 'GUARDRAIL_BLOCKED',
          violations: guardrailResult.violations,
        },
        guardrailViolations: guardrailResult.violations,
      },
    };
  }

  const activeTools = Array.from(agent.allowedTools || []);
  const relevancePlan = await agentIntentRelevanceService.resolveToolPlan({
    message: messages.intentMessage,
    availableTools: activeTools,
    context: { ...ctx.intentContext, companyId: agent.companyId, slotMessage: messages.executionMessage },
  });

  await agentToolGatewayService.logIntentPlan(agent.companyId, {
    traceId: context.traceId,
    agentId: agent.id,
    relevancePlan,
    intentMessage: messages.intentMessage,
    context: ctx.intentContext,
    sessionId: ctx.isStructuredTask ? task.sessionId : null,
    conversationId: ctx.isStructuredTask ? task.conversationId : null,
  });

  const nativeTools = getNativeToolDefinitions(relevancePlan.allowedTools, {
    includeAliases: isCustomerReplyChannel,
  });

  const canRepairCustomerReply = isCustomerReplyChannel
    || SALES_SUPPORT_ROLES.includes(String(agent.role || '').trim().toUpperCase());

  const customerReplySourceMessage = isCustomerReplyChannel ? messages.intentMessage : messages.userMessage;

  return {
    ...context,
    ...messages,
    ...ctx,
    systemPrompt,
    customerVoiceProfile,
    relevancePlan,
    nativeTools,
    isCustomerReplyChannel,
    canRepairCustomerReply,
    customerReplySourceMessage,
  };
}

module.exports = resolveIntent;
module.exports.extractMessages = extractMessages;
module.exports.extractContext = extractContext;
module.exports.detectCustomerChannel = detectCustomerChannel;
