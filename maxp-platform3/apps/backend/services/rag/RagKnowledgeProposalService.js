/**
 * @module RagKnowledgeProposalService
 * @description Human-approved learning loop for Agentic RAG failed questions.
 *
 * The service creates tenant-scoped knowledge proposals from failed RAG traces
 * and only writes FAQ/Policy records after an authenticated reviewer approves
 * the edited draft.
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../sharedDatabase');

const FEATURE = 'agentic-rag-knowledge-proposal';
const TOOL_CREATE_FAQ = 'knowledge.create_faq';
const TOOL_CREATE_POLICY = 'knowledge.create_policy';
const PROPOSAL_TOOLS = [TOOL_CREATE_FAQ, TOOL_CREATE_POLICY];

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || '');
  } catch (_) {
    return fallback;
  }
}

function normalizeText(value, maxLength = 2000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function tagsForWrite(tags) {
  const cleanTags = Array.isArray(tags)
    ? tags.map(tag => normalizeText(tag, 60)).filter(Boolean)
    : [];
  return JSON.stringify([...new Set(cleanTags)]);
}

class RagKnowledgeProposalService {
  _hasAny(text, terms) {
    const normalized = normalizeText(text, 1000).toLowerCase();
    return terms.some(term => normalized.includes(String(term).toLowerCase()));
  }

  inferIntent(query) {
    if (this._hasAny(query, ['شحن', 'توصيل', 'shipping', 'delivery'])) return 'shipping';
    if (this._hasAny(query, ['استبدال', 'ارجاع', 'إرجاع', 'مرتجع', 'return', 'exchange'])) return 'returns';
    if (this._hasAny(query, ['استرداد', 'استرجاع المبلغ', 'فلوس', 'refund'])) return 'refund';
    if (this._hasAny(query, ['خصم', 'كوبون', 'كود', 'discount', 'coupon'])) return 'discount';
    if (this._hasAny(query, ['فرع', 'استلام', 'عنوان', 'branch', 'pickup', 'location'])) return 'location';
    return 'general';
  }

  categoryForIntent(intent) {
    const map = {
      shipping: 'SHIPPING_POLICY',
      returns: 'RETURN_POLICY',
      refund: 'REFUND_POLICY',
      discount: 'DISCOUNT_POLICY',
      location: 'LOCATION_POLICY',
    };
    return map[intent] || 'general';
  }

  _buildDraftPayload(trace, metadata, options = {}) {
    const targetType = String(options.targetType || 'FAQ').toUpperCase() === 'POLICY' ? 'POLICY' : 'FAQ';
    const query = normalizeText(trace.query, 500);
    const intent = this.inferIntent(query);
    const category = normalizeText(options.category || metadata.category || this.categoryForIntent(intent), 80) || 'general';
    const baseTags = ['agentic-rag', 'failed-question', 'human-approved', intent].filter(Boolean);

    if (targetType === 'POLICY') {
      return {
        targetType,
        intent,
        toolName: TOOL_CREATE_POLICY,
        input: {
          title: normalizeText(options.title, 160) || `سياسة مقترحة: ${query.slice(0, 90)}`,
          content: normalizeText(options.content, 5000),
          category,
          tags: baseTags,
          isActive: true,
          effectiveAt: new Date().toISOString(),
          expiresAt: null,
        },
      };
    }

    return {
      targetType,
      intent,
      toolName: TOOL_CREATE_FAQ,
      input: {
        question: normalizeText(options.question || query, 500),
        answer: normalizeText(options.answer, 3000),
        category,
        tags: baseTags,
        isActive: true,
      },
    };
  }

  _toSafeProposal(record) {
    const input = parseJson(record.inputSnapshot, {});
    const preview = parseJson(record.previewSnapshot, {});
    const metadata = parseJson(record.metadata, {});
    const result = parseJson(record.executionResultSnapshot, null);
    return {
      id: record.id,
      toolName: record.toolName,
      targetType: metadata.targetType || (record.toolName === TOOL_CREATE_POLICY ? 'POLICY' : 'FAQ'),
      status: record.status,
      executionStatus: record.executionStatus || null,
      reason: record.reason || '',
      traceId: record.traceId || null,
      failureTraceId: metadata.failureTraceId || record.traceId || null,
      originalQuery: metadata.originalQuery || input.question || '',
      intent: metadata.intent || 'general',
      input,
      preview,
      executionResult: result,
      createdAt: record.createdAt,
      reviewedAt: record.reviewedAt || null,
      executedAt: record.executedAt || null,
      rejectionReason: metadata.rejectionReason || null,
    };
  }

  async createProposal(companyId, failureTraceId, options = {}, actor = {}) {
    const prisma = getSharedPrismaClient();
    const trace = await prisma.aiTrace.findFirst({
      where: { id: failureTraceId, companyId },
    });
    if (!trace) {
      return { success: false, error: 'TRACE_NOT_FOUND' };
    }

    const traceMetadata = parseJson(trace.metadata, {});
    if (traceMetadata.feature !== 'agentic-rag' || traceMetadata.ragStatus !== 'failed') {
      return { success: false, error: 'TRACE_NOT_FAILED_RAG' };
    }
    if (traceMetadata.blocked) {
      return { success: false, error: 'GUARDRAILED_TRACE_NOT_LEARNABLE' };
    }

    const draft = this._buildDraftPayload(trace, traceMetadata, options);
    const baseRequestKey = `rag_knowledge:${companyId}:${failureTraceId}:${draft.targetType}:${stableHash(JSON.stringify(draft.input))}`;
    const existing = await prisma.aiToolApprovalRequest.findFirst({
      where: {
        companyId,
        traceId: failureTraceId,
        toolName: draft.toolName,
        status: 'PENDING',
      },
    });
    if (existing) {
      return { success: true, proposal: this._toSafeProposal(existing), deduplicated: true };
    }

    let requestKey = baseRequestKey;
    const previousCycle = await prisma.aiToolApprovalRequest.findFirst({
      where: { requestKey: baseRequestKey },
    });
    if (previousCycle) {
      requestKey = `${baseRequestKey}:${Date.now().toString(36)}:${stableHash(`${actor.userId || 'system'}:${Math.random()}`)}`;
    }

    const record = await prisma.aiToolApprovalRequest.create({
      data: {
        companyId,
        requestKey,
        toolName: draft.toolName,
        status: 'PENDING',
        channel: 'DASHBOARD',
        source: 'agentic_rag',
        sideEffects: 'write',
        approvalMode: 'required',
        reason: 'RAG failed to answer this customer question; create reviewed knowledge before using it.',
        traceId: failureTraceId,
        requestedByType: 'dashboard_user',
        requestedByUserId: actor.userId || null,
        inputSnapshot: JSON.stringify(draft.input),
        previewSnapshot: JSON.stringify({
          originalQuery: trace.query,
          finalSource: traceMetadata.finalSource,
          avgRelevance: traceMetadata.avgRelevance,
          instruction: 'راجع وعدل النص قبل الاعتماد. لن يتم نشر المعرفة تلقائيا.',
        }),
        metadata: JSON.stringify({
          feature: FEATURE,
          failureTraceId,
          originalQuery: trace.query,
          intent: draft.intent,
          targetType: draft.targetType,
          sourceCategory: traceMetadata.category || null,
        }),
      },
    });

    return { success: true, proposal: this._toSafeProposal(record), deduplicated: false };
  }

  async listProposals(companyId, options = {}) {
    const prisma = getSharedPrismaClient();
    const status = normalizeText(options.status, 30);
    const where = {
      companyId,
      toolName: { in: PROPOSAL_TOOLS },
    };
    if (status && status !== 'ALL') where.status = status;
    const proposals = await prisma.aiToolApprovalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(options.limit) || 30, 1), 100),
    });
    return proposals.map(proposal => this._toSafeProposal(proposal));
  }

  _mergeEdits(proposal, edits = {}) {
    const original = parseJson(proposal.inputSnapshot, {});
    const targetType = proposal.toolName === TOOL_CREATE_POLICY ? 'POLICY' : 'FAQ';
    if (targetType === 'POLICY') {
      return {
        ...original,
        title: normalizeText(edits.title ?? original.title, 160),
        content: normalizeText(edits.content ?? original.content, 5000),
        category: normalizeText(edits.category ?? original.category, 80) || 'general',
        tags: Array.isArray(edits.tags) ? edits.tags : original.tags,
        isActive: edits.isActive !== undefined ? Boolean(edits.isActive) : original.isActive !== false,
        effectiveAt: edits.effectiveAt || original.effectiveAt || new Date().toISOString(),
        expiresAt: edits.expiresAt ?? original.expiresAt ?? null,
      };
    }

    return {
      ...original,
      question: normalizeText(edits.question ?? original.question, 500),
      answer: normalizeText(edits.answer ?? original.answer, 3000),
      category: normalizeText(edits.category ?? original.category, 80) || 'general',
      tags: Array.isArray(edits.tags) ? edits.tags : original.tags,
      isActive: edits.isActive !== undefined ? Boolean(edits.isActive) : original.isActive !== false,
    };
  }

  _validateApprovedInput(toolName, input) {
    if (toolName === TOOL_CREATE_POLICY) {
      if (!input.title || input.title.length < 5) return 'POLICY_TITLE_REQUIRED';
      if (!input.content || input.content.length < 20) return 'POLICY_CONTENT_REQUIRED';
      return null;
    }
    if (!input.question || input.question.length < 5) return 'FAQ_QUESTION_REQUIRED';
    if (!input.answer || input.answer.length < 10) return 'FAQ_ANSWER_REQUIRED';
    return null;
  }

  async approveProposal(companyId, proposalId, { edits = {} } = {}, actor = {}) {
    const prisma = getSharedPrismaClient();
    const proposal = await prisma.aiToolApprovalRequest.findFirst({
      where: { id: proposalId, companyId, toolName: { in: PROPOSAL_TOOLS } },
    });
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };
    if (proposal.status !== 'PENDING') return { success: false, error: 'PROPOSAL_NOT_PENDING', currentStatus: proposal.status };

    const input = this._mergeEdits(proposal, edits);
    const validationError = this._validateApprovedInput(proposal.toolName, input);
    if (validationError) return { success: false, error: validationError };

    const run = async (tx) => {
      let artifact;
      if (proposal.toolName === TOOL_CREATE_POLICY) {
        artifact = await tx.policy.create({
          data: {
            companyId,
            title: input.title,
            content: input.content,
            category: input.category || 'general',
            tags: tagsForWrite(input.tags),
            isActive: input.isActive !== false,
            effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : new Date(),
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            version: 1,
          },
        });
      } else {
        artifact = await tx.faq.create({
          data: {
            companyId,
            question: input.question,
            answer: input.answer,
            category: input.category || 'general',
            tags: tagsForWrite(input.tags),
            isActive: input.isActive !== false,
            order: 0,
            helpful: 0,
            notHelpful: 0,
            version: 1,
          },
        });
      }

      const metadata = parseJson(proposal.metadata, {});
      const updated = await tx.aiToolApprovalRequest.update({
        where: { id: proposal.id },
        data: {
          status: 'APPROVED',
          reviewedByUserId: actor.userId || null,
          reviewedAt: new Date(),
          executionStatus: 'EXECUTED',
          executionStartedAt: new Date(),
          executedAt: new Date(),
          executedByUserId: actor.userId || null,
          inputSnapshot: JSON.stringify(input),
          executionResultSnapshot: JSON.stringify({
            artifactType: proposal.toolName === TOOL_CREATE_POLICY ? 'policy' : 'faq',
            artifactId: artifact.id,
            category: artifact.category,
          }),
          metadata: JSON.stringify({
            ...metadata,
            approvedAt: new Date().toISOString(),
            artifactType: proposal.toolName === TOOL_CREATE_POLICY ? 'policy' : 'faq',
            artifactId: artifact.id,
          }),
        },
      });

      return { artifact, updated };
    };

    const result = typeof prisma.$transaction === 'function'
      ? await prisma.$transaction(run)
      : await run(prisma);

    return {
      success: true,
      proposal: this._toSafeProposal(result.updated),
      artifact: result.artifact,
    };
  }

  async rejectProposal(companyId, proposalId, reason = '', actor = {}) {
    const prisma = getSharedPrismaClient();
    const proposal = await prisma.aiToolApprovalRequest.findFirst({
      where: { id: proposalId, companyId, toolName: { in: PROPOSAL_TOOLS } },
    });
    if (!proposal) return { success: false, error: 'PROPOSAL_NOT_FOUND' };
    if (proposal.status !== 'PENDING') return { success: false, error: 'PROPOSAL_NOT_PENDING', currentStatus: proposal.status };

    const metadata = parseJson(proposal.metadata, {});
    const updated = await prisma.aiToolApprovalRequest.update({
      where: { id: proposal.id },
      data: {
        status: 'REJECTED',
        reason: normalizeText(reason, 500) || proposal.reason,
        reviewedByUserId: actor.userId || null,
        reviewedAt: new Date(),
        executionStatus: 'REJECTED',
        metadata: JSON.stringify({
          ...metadata,
          rejectionReason: normalizeText(reason, 500),
          rejectedAt: new Date().toISOString(),
        }),
      },
    });

    return { success: true, proposal: this._toSafeProposal(updated) };
  }
}

module.exports = new RagKnowledgeProposalService();
module.exports._private = {
  FEATURE,
  TOOL_CREATE_FAQ,
  TOOL_CREATE_POLICY,
  normalizeText,
  parseJson,
  tagsForWrite,
};
