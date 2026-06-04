/**
 * @module humanApprovalService
 * @description Phase 12: Human-in-the-Loop Integration - bridges draft proposals
 * with human notification and approval workflows, persisted to AiNotification.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const draftProposalService = require('./draftProposalService');

class HumanApprovalService {
  constructor() {
    this.MAX_ATTEMPTS = 3;
  }

  /**
   * Sends notification to merchant about a pending draft.
   */
  async notifyMerchant(companyId, draft, channels = ['DASHBOARD']) {
    const prisma = getSharedPrismaClient();
    const notif = await prisma.aiNotification.create({
      data: {
        companyId,
        type: 'approval_request',
        severity: 'medium',
        title: 'Action Requires Approval',
        message: `Action "${draft.toolName || 'unknown'}" requires your approval. Code sent to: ${channels.join(', ')}`,
        metadata: JSON.stringify({ draftId: draft.draftId || draft.id, channels }),
      },
    });

    return { notified: true, channels: [...channels], notificationId: notif.id };
  }

  /**
   * Processes an approval response with code validation and attempt tracking.
   */
  async processApprovalResponse(companyId, draftId, approvalCode) {
    const prisma = getSharedPrismaClient();

    // Get the request to check attempts
    const request = await prisma.aiToolApprovalRequest.findFirst({
      where: { id: draftId, companyId },
    });
    if (!request) return { approved: false, error: 'DRAFT_NOT_FOUND' };

    let meta = {};
    try { meta = JSON.parse(request.metadata || '{}'); } catch (_) {}
    const attempts = meta.attempts || 0;

    if (attempts >= this.MAX_ATTEMPTS) {
      await draftProposalService.rejectDraft(companyId, draftId, 'MAX_ATTEMPTS_EXCEEDED');
      return { approved: false, error: 'MAX_ATTEMPTS_EXCEEDED', attemptsRemaining: 0 };
    }

    const result = await draftProposalService.approveDraft(companyId, draftId, approvalCode);

    if (result.success) {
      // Reset attempts on success
      return { approved: true, executionResult: result.draft };
    }

    // Increment attempts
    const newAttempts = attempts + 1;
    await prisma.aiToolApprovalRequest.update({
      where: { id: draftId },
      data: {
        metadata: JSON.stringify({ ...meta, attempts: newAttempts }),
      },
    });

    const remaining = this.MAX_ATTEMPTS - newAttempts;

    if (remaining <= 0) {
      await draftProposalService.rejectDraft(companyId, draftId, 'MAX_ATTEMPTS_EXCEEDED');
      return { approved: false, error: 'MAX_ATTEMPTS_EXCEEDED', attemptsRemaining: 0 };
    }

    return { approved: false, error: 'INVALID_APPROVAL_CODE', attemptsRemaining: remaining };
  }

  async processRejectionResponse(companyId, draftId, reason = '') {
    const result = await draftProposalService.rejectDraft(companyId, draftId, reason);
    return { rejected: result.success, reason };
  }

  async getPendingApprovals(companyId) {
    return draftProposalService.listDrafts(companyId, 'PENDING');
  }

  async getApprovalHistory(companyId, limit = 50) {
    const all = await draftProposalService.listDrafts(companyId);
    return all.filter(d => d.status === 'APPROVED' || d.status === 'REJECTED').slice(-limit);
  }

  async getNotificationLog(companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.aiNotification.findMany({
      where: { companyId, type: 'approval_request' },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Sends notification to merchant about a pending run approval.
   */
  async notifyRunApproval(companyId, { runId, approvalId, toolName, reason, channels = ['DASHBOARD'] }) {
    const prisma = getSharedPrismaClient();
    const notif = await prisma.aiNotification.create({
      data: {
        companyId,
        type: 'approval_request',
        severity: 'medium',
        title: 'Action Requires Approval',
        message: `Tool "${toolName || 'unknown'}" requires your approval. Run: ${runId}`,
        metadata: JSON.stringify({ runId, approvalId, toolName, channels }),
      },
    });

    return { notified: true, channels: [...channels], notificationId: notif.id };
  }

  async _reset() {
    const prisma = getSharedPrismaClient();
    await prisma.aiNotification.deleteMany({ where: { type: 'approval_request' } }).catch(() => {});
  }
}

module.exports = new HumanApprovalService();
