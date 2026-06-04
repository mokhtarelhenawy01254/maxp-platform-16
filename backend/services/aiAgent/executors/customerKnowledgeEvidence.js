const CorrectiveRAGEngine = require('../../rag/CorrectiveRAGEngine');

const KNOWLEDGE_TOOL = 'knowledge.retrieve';
const SUPPORT_HANDOFF_INTENTS = new Set([
  'support.exchange',
  'support.refund',
  'support.complaint',
]);
const SUPPORT_KNOWLEDGE_SOURCE_ORDER = ['HYBRID_KNOWLEDGE', 'FAQ_DB', 'POLICY_DB'];

function shouldRetrieveSupportKnowledge({ isCustomerReplyChannel, relevancePlan } = {}) {
  return Boolean(
    isCustomerReplyChannel
    && relevancePlan?.primaryTool === 'agent.handoff'
    && SUPPORT_HANDOFF_INTENTS.has(relevancePlan.intent)
  );
}

function compactSources(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .slice(0, 3)
    .map(source => ({
      content: String(source.content || '').slice(0, 1200),
      source: source.source || null,
      relevance: source.relevance || null,
      metadata: source.metadata || null,
    }));
}

function buildKnowledgeResult(ragResult) {
  const sources = compactSources(ragResult?.sources);
  const result = {
    answer: ragResult?.answer || null,
    finalSource: ragResult?.finalSource || null,
    retrievalMode: ragResult?.retrievalMode || null,
    grading: ragResult?.grading || null,
    sources,
  };
  const success = Boolean(result.answer || sources.length > 0);
  return success
    ? { success: true, readOnly: true, result }
    : { success: false, readOnly: true, error: 'KNOWLEDGE_NOT_FOUND', result };
}

function formatKnowledgeResult(result) {
  return result.success
    ? JSON.stringify({ tool: KNOWLEDGE_TOOL, ok: true, result: result.result }, null, 2)
    : JSON.stringify({ tool: KNOWLEDGE_TOOL, ok: false, error: result.error, result: result.result || null }, null, 2);
}

async function appendSupportKnowledgeEvidence({
  companyId,
  customerId = null,
  message = '',
  relevancePlan = null,
  isCustomerReplyChannel = false,
  toolContext = '',
  executedTools = [],
  toolEvidence = [],
} = {}) {
  if (!shouldRetrieveSupportKnowledge({ isCustomerReplyChannel, relevancePlan })) {
    return toolContext;
  }

  const alreadyAttached = toolEvidence.some(entry => (
    entry?.tool === KNOWLEDGE_TOOL
    && entry?.relevanceIntent === relevancePlan.intent
  ));
  if (alreadyAttached) return toolContext;

  let result;
  try {
    const options = {
      sourceOrder: SUPPORT_KNOWLEDGE_SOURCE_ORDER,
      maxIterations: SUPPORT_KNOWLEDGE_SOURCE_ORDER.length,
      bestEffortThreshold: 0.45,
      persistTrace: true,
      ...(customerId ? { customerId } : {}),
    };
    result = buildKnowledgeResult(await CorrectiveRAGEngine.query(companyId, message, options));
  } catch (error) {
    result = {
      success: false,
      readOnly: true,
      error: 'KNOWLEDGE_RETRIEVAL_FAILED',
      result: { message: error?.message || null },
    };
  }

  if (!result.success) return toolContext;

  const evidence = {
    tool: KNOWLEDGE_TOOL,
    success: Boolean(result.success),
    readOnly: true,
    result: result.result || null,
    error: result.error || null,
    modelClassified: true,
    relevanceIntent: relevancePlan.intent,
  };
  executedTools.push(evidence);
  toolEvidence.push(evidence);

  const knowledgeContext = `• Tool result for ${KNOWLEDGE_TOOL}:\n${formatKnowledgeResult(result)}`;
  return [toolContext, knowledgeContext].filter(Boolean).join('\n\n');
}

module.exports = {
  KNOWLEDGE_TOOL,
  SUPPORT_KNOWLEDGE_SOURCE_ORDER,
  shouldRetrieveSupportKnowledge,
  buildKnowledgeResult,
  formatKnowledgeResult,
  appendSupportKnowledgeEvidence,
};
