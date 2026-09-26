/**
 * @module agentApprovalRoutes
 * @description API routes for managing AI agent tool approval requests.
 * All approval management goes through the Python ai-service.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const aiSdkClient = require('../services/aiSdkClient');

router.use(verifyToken.authenticateToken);

function isAiServiceEnabled(companyId) {
  const mode = String(process.env.AI_SERVICE_MODE || '').trim().toLowerCase();
  if (mode === 'off') return false;
  if (mode === 'primary') return true;
  const enabled = (process.env.AI_SERVICE_ENABLED_COMPANIES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (enabled.length === 0 || enabled.includes(companyId)) return true;
  return false;
}

router.get('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.headers['x-company-id'] || req.query.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const status = req.query.status || 'pending';
    const result = await aiSdkClient.listApprovals({ companyId, status });
    return res.json({ success: true, approvals: result.approvals, count: result.count });
  } catch (error) {
    console.error('[AgentApprovals] Error listing approvals:', error.message);
    res.status(500).json({ error: 'Failed to list approvals' });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.headers['x-company-id'] || req.body?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    await aiSdkClient.resumeWorkflow({
      companyId,
      threadId: req.body.threadId || null,
      draftId: req.params.id,
      approved: true,
      reason: req.body.reason,
      decidedBy: req.user?.username || 'merchant',
    });
    return res.json({ success: true, message: 'Approved successfully' });
  } catch (error) {
    console.error('[AgentApprovals] Error approving:', error.message);
    res.status(502).json({ error: 'AI service approval failed', detail: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.headers['x-company-id'] || req.body?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    await aiSdkClient.resumeWorkflow({
      companyId,
      threadId: req.body.threadId || null,
      draftId: req.params.id,
      approved: false,
      reason: req.body.reason || null,
      decidedBy: req.user?.username || 'merchant',
    });
    return res.json({ success: true, message: 'Rejected successfully' });
  } catch (error) {
    console.error('[AgentApprovals] Error rejecting:', error.message);
    res.status(502).json({ error: 'AI service rejection failed', detail: error.message });
  }
});

module.exports = router;
