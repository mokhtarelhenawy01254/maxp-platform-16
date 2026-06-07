/**
 * @module agentApprovalRoutes
 * @description API routes for managing AI agent tool approval requests.
 * Merchants can list pending approvals, approve, or reject them.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const draftProposalService = require('../legacy-ai-agent/aiAgent/draftProposalService');
const humanApprovalService = require('../legacy-ai-agent/aiAgent/humanApprovalService');
const aiSdkClient = require('../services/aiSdkClient');
const { isAiServiceEnabled } = require('../legacy-ai-agent/aiAgent/aiServiceRouter');

router.use(verifyToken.authenticateToken);

/**
 * GET /api/v1/agent/approvals
 * List pending approval requests for the merchant's company.
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const status = req.query.status || 'PENDING';
    const drafts = await draftProposalService.listDrafts(companyId, status);
    res.json({ success: true, approvals: drafts, count: drafts.length });
  } catch (error) {
    console.error('[AgentApprovals] Error listing approvals:', error.message);
    res.status(500).json({ error: 'Failed to list approvals' });
  }
});

/**
 * POST /api/v1/agent/approvals/:id/approve
 * Approve a pending request with a 4-digit approval code.
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const { approvalCode } = req.body;
    if (!approvalCode) return res.status(400).json({ error: 'approvalCode is required' });

    const draft = await draftProposalService.getDraft(companyId, req.params.id);
    const result = await humanApprovalService.processApprovalResponse(companyId, req.params.id, approvalCode);
    if (result.approved) {
      if (draft && isAiServiceEnabled(companyId)) {
        aiSdkClient.resumeWorkflow({
          companyId,
          threadId: draft.conversationId,
          draftId: draft.id,
          approved: true,
          reason: req.body.reason,
          decidedBy: req.user?.username || 'merchant',
        }).catch(err => {
          console.error(`Failed to notify AI service of approval: ${err.message}`);
        });
      }
      return res.json({ success: true, message: 'Approved successfully', result });
    }
    return res.status(400).json({ success: false, ...result });
  } catch (error) {
    console.error('[AgentApprovals] Error approving:', error.message);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

/**
 * POST /api/v1/agent/approvals/:id/reject
 * Reject a pending request with an optional reason.
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const draft = await draftProposalService.getDraft(companyId, req.params.id);
    const { reason } = req.body || {};
    const result = await humanApprovalService.processRejectionResponse(companyId, req.params.id, reason || '');
    if (draft && isAiServiceEnabled(companyId)) {
      aiSdkClient.resumeWorkflow({
        companyId,
        threadId: draft.conversationId,
        draftId: draft.id,
        approved: false,
        reason: reason || null,
        decidedBy: req.user?.username || 'merchant',
      }).catch(err => {
        console.error(`Failed to notify AI service of rejection: ${err.message}`);
      });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[AgentApprovals] Error rejecting:', error.message);
    res.status(500).json({ error: 'Failed to process rejection' });
  }
});

module.exports = router;
