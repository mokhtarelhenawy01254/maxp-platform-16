/**
 * @module draftProposalService
 * @description Phase 11: Draft Proposals - prevents AI agents from directly modifying
 * critical store data, creating human-approval drafts persisted to AiToolApprovalRequest.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const toolRegistryService = require('./toolRegistryService');
const agentConflictGuardService = require('./agentConflictGuardService');

const LEGACY_TOOL_CLASSIFICATIONS = {
  READ_ONLY: ['product.search', 'order.lookup', 'customer.info', 'inventory.check', 'shipping.rates'],
  WRITE_ACTIONS: ['product.updatePrice', 'order.confirm', 'order.cancel', 'discount.apply', 'inventory.adjust', 'shipping.update', 'product.delete', 'order.refund'],
};

class DraftProposalService {
  isWriteAction(toolName) {
    return toolRegistryService.isWriteAction(toolName) || LEGACY_TOOL_CLASSIFICATIONS.WRITE_ACTIONS.includes(toolName);
  }

  isReadOnly(toolName) {
    return toolRegistryService.isReadOnly(toolName) || LEGACY_TOOL_CLASSIFICATIONS.READ_ONLY.includes(toolName);
  }

  generateApprovalCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  _parseMetadata(value) {
    try {
      return JSON.parse(value || '{}');
    } catch (_) {
      return {};
    }
  }

  async createDraft(companyId, { agentId, toolName, params, reasoning, estimatedImpact, conversationId, customerId, traceId }) {
    if (!this.isWriteAction(toolName)) {
      return { success: false, error: 'NOT_WRITE_ACTION', message: `${toolName} is read-only and does not need a draft` };
    }

    const prisma = getSharedPrismaClient();
    const approvalCode = this.generateApprovalCode();
    const requestKey = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const conflict = agentConflictGuardService.buildToolConflict(toolName, params || {});
    const pendingConflict = await agentConflictGuardService.findPendingToolConflict(companyId, conflict);
    if (pendingConflict) {
      if (pendingConflict.existingAction === pendingConflict.requestedAction) {
        const existing = await prisma.aiToolApprovalRequest.findFirst({
          where: {
            id: pendingConflict.draftId,
            companyId,
            status: 'PENDING',
          },
        });
        if (existing) {
          const metadata = this._parseMetadata(existing.metadata);
          return {
            success: true,
            draftId: existing.id,
            approvalCode: metadata.approvalCode || null,
            status: existing.status,
            createdAt: existing.createdAt,
            expiresAt: existing.expiresAt,
            toolName: existing.toolName,
            deduplicated: true,
            conflict: pendingConflict,
          };
        }
      }

      if (!agentConflictGuardService.canSupersedePendingToolConflict(toolName, pendingConflict)) {
        return {
          success: false,
          error: 'CONFLICTING_PENDING_ACTION',
          message: 'A pending write proposal already targets this resource',
          conflict: pendingConflict,
        };
      }
    }

    let superseded = null;
    if (pendingConflict && agentConflictGuardService.canSupersedePendingToolConflict(toolName, pendingConflict)) {
      superseded = await agentConflictGuardService.supersedePendingToolConflict(companyId, pendingConflict, {
        supersededByTraceId: traceId || null,
        supersededByAgentId: agentId || null,
      });
    }

    const draft = await prisma.aiToolApprovalRequest.create({
      data: {
        companyId,
        requestKey,
        toolName,
        status: 'PENDING',
        channel: 'DASHBOARD',
        source: 'agent',
        sideEffects: 'write',
        approvalMode: toolRegistryService.requiresApproval(toolName) ? 'required' : 'optional',
        reason: reasoning || '',
        conversationId: conversationId || null,
        customerId: customerId || null,
        traceId: traceId || null,
        expiresAt,
        inputSnapshot: JSON.stringify(params || {}),
        metadata: JSON.stringify({
          approvalCode,
          attempts: 0,
          agentId: agentId || null,
          reasoning: reasoning || '',
          estimatedImpact: estimatedImpact || 'Unknown',
          supersedesDraftId: superseded?.draftId || null,
          ...(conflict || {}),
        }),
      },
    });

    return {
      success: true,
      draftId: draft.id,
      approvalCode,
      status: draft.status,
      createdAt: draft.createdAt,
      expiresAt: draft.expiresAt,
      toolName: draft.toolName,
      supersedesDraftId: superseded?.draftId || null,
    };
  }

  async getDraft(companyId, draftId) {
    const prisma = getSharedPrismaClient();
    const draft = await prisma.aiToolApprovalRequest.findFirst({
      where: { id: draftId, companyId },
    });
    if (!draft) return null;
    return this._toSafeDraft(draft);
  }

  async listDrafts(companyId, status = null) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (status) where.status = status;

    const drafts = await prisma.aiToolApprovalRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return drafts.map(d => this._toSafeDraft(d));
  }

  async approveDraft(companyId, draftId, approvalCode) {
    const prisma = getSharedPrismaClient();
    const draft = await prisma.aiToolApprovalRequest.findFirst({
      where: { id: draftId, companyId },
    });
    if (!draft) return { success: false, error: 'DRAFT_NOT_FOUND' };
    if (draft.status !== 'PENDING') return { success: false, error: 'DRAFT_NOT_PENDING', currentStatus: draft.status };

    let meta = {};
    try { meta = JSON.parse(draft.metadata || '{}'); } catch (_) {}
    if (meta.approvalCode !== approvalCode) return { success: false, error: 'INVALID_CODE' };

    const updated = await prisma.aiToolApprovalRequest.update({
      where: { id: draftId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        metadata: JSON.stringify({ ...meta, approvedAt: new Date().toISOString() }),
      },
    });

    return { success: true, draft: this._toSafeDraft(updated) };
  }

  async rejectDraft(companyId, draftId, reason = '') {
    const prisma = getSharedPrismaClient();
    const draft = await prisma.aiToolApprovalRequest.findFirst({
      where: { id: draftId, companyId },
    });
    if (!draft) return { success: false, error: 'DRAFT_NOT_FOUND' };

    let meta = {};
    try { meta = JSON.parse(draft.metadata || '{}'); } catch (_) {}

    await prisma.aiToolApprovalRequest.update({
      where: { id: draftId },
      data: {
        status: 'REJECTED',
        reason: reason || draft.reason,
        reviewedAt: new Date(),
        metadata: JSON.stringify({ ...meta, rejectionReason: reason, rejectedAt: new Date().toISOString() }),
      },
    });

    return { success: true };
  }

  async expireOldDrafts(companyId) {
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const result = await prisma.aiToolApprovalRequest.updateMany({
      where: {
        companyId,
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }

  /** Returns a safe draft shape without the approval code. */
  _toSafeDraft(draft) {
    let meta = {};
    try { meta = JSON.parse(draft.metadata || '{}'); } catch (_) {}
    const { approvalCode, ...safeMeta } = meta;
    return {
      id: draft.id,
      companyId: draft.companyId,
      agentId: meta.agentId || null,
      toolName: draft.toolName,
      params: JSON.parse(draft.inputSnapshot || '{}'),
      reasoning: draft.reason || meta.reasoning || '',
      estimatedImpact: meta.estimatedImpact || 'Unknown',
      status: draft.status,
      createdAt: draft.createdAt,
      expiresAt: draft.expiresAt,
      rejectionReason: meta.rejectionReason || null,
    };
  }

  async _reset() {
    const prisma = getSharedPrismaClient();
    await prisma.aiToolApprovalRequest.deleteMany({});
  }
}

module.exports = new DraftProposalService();
