/**
 * @module agentApprovalRoutes
 * @description API routes for managing AI agent tool approval requests.
 * Merchants can list pending approvals, approve, or reject them.
 *
 * Unified HITL flow:
 * - When Python AI service is enabled for the company, approval drafts live in
 *   ai.approvals (Python table) and all listing/decision flows go through Python.
 * - The legacy Node.js table (ai_tool_approval_requests) is used as fallback for
 *   companies not yet routed through the Python AI service.
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

    const status = req.query.status || 'pending';

    if (isAiServiceEnabled(companyId)) {
      try {
        const result = await aiSdkClient.listApprovals({ companyId, status });
        return res.json({ success: true, approvals: result.approvals, count: result.count });
      } catch (err) {
        console.error('[AgentApprovals] Python listApprovals failed, falling back to legacy:', err.message);
      }
    }

    const drafts = await draftProposalService.listDrafts(companyId, status.toUpperCase());
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

    const pythonEnabled = isAiServiceEnabled(companyId);

    if (pythonEnabled) {
      try {
        await aiSdkClient.resumeWorkflow({
          companyId,
          threadId: req.body.threadId || null,
          draftId: req.params.id,
          approved: true,
          reason: req.body.reason,
          decidedBy: req.user?.username || 'merchant',
        });
        return res.json({ success: true, message: 'Approved successfully' });
      } catch (err) {
        console.error('[AgentApprovals] Python resumeWorkflow (approve) failed:', err.message);
        return res.status(502).json({ error: 'AI service approval failed', detail: err.message });
      }
    }

    const { approvalCode } = req.body;
    if (!approvalCode) return res.status(400).json({ error: 'approvalCode is required' });

    const draft = await draftProposalService.getDraft(companyId, req.params.id);
    const result = await humanApprovalService.processApprovalResponse(companyId, req.params.id, approvalCode);
    if (result.approved) {
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

    const pythonEnabled = isAiServiceEnabled(companyId);

    if (pythonEnabled) {
      try {
        await aiSdkClient.resumeWorkflow({
          companyId,
          threadId: req.body.threadId || null,
          draftId: req.params.id,
          approved: false,
          reason: req.body.reason || null,
          decidedBy: req.user?.username || 'merchant',
        });
        return res.json({ success: true, message: 'Rejected successfully' });
      } catch (err) {
        console.error('[AgentApprovals] Python resumeWorkflow (reject) failed:', err.message);
        return res.status(502).json({ error: 'AI service rejection failed', detail: err.message });
      }
    }

    const draft = await draftProposalService.getDraft(companyId, req.params.id);
    const { reason } = req.body || {};
    const result = await humanApprovalService.processRejectionResponse(companyId, req.params.id, reason || '');
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[AgentApprovals] Error rejecting:', error.message);
    res.status(500).json({ error: 'Failed to process rejection' });
  }
});

module.exports = router;
