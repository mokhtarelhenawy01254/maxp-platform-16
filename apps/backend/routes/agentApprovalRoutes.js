/**
 * @module agentApprovalRoutes
 * @description API routes for managing AI agent tool approval requests.
 * All approval management goes through the Python ai-service.
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const aiSdkClient = require('../services/aiSdkClient');
const aiSessionService = require('../services/aiSessionService');
const agentStudioSessionService = require('../services/agentStudioSessionService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.use(verifyToken.authenticateToken);

function isAiServiceEnabled(companyId) {
  const mode = String(process.env.AI_SERVICE_MODE || '').trim().toLowerCase();
  if (mode === 'off') return false;
  if (mode === 'primary') return true;
  const enabled = (process.env.AI_SERVICE_ENABLED_COMPANIES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (enabled.length === 0 || enabled.includes(companyId)) return true;
  return false;
}

function extractToolFromDraftId(draftId) {
  const parts = String(draftId || '').split(':');
  return parts.length >= 3 ? parts[2] : String(draftId || '');
}

function buildApprovalNote({ approved, result, draftId }) {
  const tool = result?.action_type || extractToolFromDraftId(draftId);
  if (!approved) {
    return `[بوابة الموافقات] تم رفض الإجراء «${tool}» ولم يُنفَّذ.`;
  }
  if (result?.status === 'ok') {
    const summary = result?.result_summary ? ` — ${result.result_summary}` : '';
    return `[بوابة الموافقات] تم اعتماد وتنفيذ الإجراء «${tool}» بنجاح${summary}. الإجراء اتنفذ فعليًا في النظام.`;
  }
  return `[بوابة الموافقات] تم اعتماد «${tool}» لكن التنفيذ فشل (${result?.reply || 'خطأ غير متوقع'}) — يُرجى إعادة المحاولة أو مراجعة السبب.`;
}

async function mirrorApprovalOutcome(companyId, threadId, note) {
  if (!threadId || !note) return;
  try {
    // Only mirror into an existing chat session — approvals raised from
    // non-session threads (e.g. run-task traces) have no ledger to show the
    // note in, and appending would create an orphan session row.
    const existing = await agentStudioSessionService.getSession(companyId, threadId);
    if (!existing) {
      console.warn('[AgentApprovals] Skipping mirror: no chat session for thread', threadId);
      return;
    }
    await aiSessionService.appendMessage(companyId, threadId, {
      sender: 'assistant',
      text: note,
    });
  } catch (ledgerErr) {
    console.warn('[AgentApprovals] Failed to mirror approval outcome into session:', ledgerErr.message);
  }
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
    const decidedBy = req.user?.username || 'merchant';
    const resumeResult = await aiSdkClient.resumeWorkflow({
      companyId,
      threadId: req.body.threadId || null,
      draftId: req.params.id,
      approved: true,
      reason: req.body.reason,
      decidedBy,
    });

    // Mirror the outcome into the chat session ledger so the merchant and the
    // agent see the executed action instead of re-asking for approval.
    const approvedNote = buildApprovalNote({ approved: true, result: resumeResult, draftId: req.params.id });
    await mirrorApprovalOutcome(companyId, req.body.threadId || null, approvedNote);

    try {
      const prisma = getSharedPrismaClient();
      await prisma.activityLog.create({
        data: {
          companyId,
          userId: req.user?.id || null,
          category: 'GOVERNANCE',
          action: 'AGENT_APPROVAL_GRANTED',
          description: `Approval granted for draft ${req.params.id} by ${decidedBy}`,
          targetType: 'DRAFT',
          targetId: req.params.id,
          severity: 'MEDIUM',
          isSuccess: true,
          metadata: JSON.stringify({
            draftId: req.params.id,
            threadId: req.body.threadId || null,
            reason: req.body.reason || null,
            decidedBy,
            tool: req.body.tool || null,
            args: req.body.args || null,
          }),
        },
      });
    } catch (auditErr) {
      console.warn('[AgentApprovals] Failed to record activity log for approval:', auditErr.message);
    }

    return res.json({ success: true, message: 'Approved successfully', note: approvedNote, approvalStatus: resumeResult?.status || null });
  } catch (error) {
    console.error('[AgentApprovals] Error approving:', error.message);
    res.status(502).json({ error: 'AI service approval failed', detail: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.headers['x-company-id'] || req.body?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const decidedBy = req.user?.username || 'merchant';
    const rejectResult = await aiSdkClient.resumeWorkflow({
      companyId,
      threadId: req.body.threadId || null,
      draftId: req.params.id,
      approved: false,
      reason: req.body.reason || null,
      decidedBy,
    });

    const rejectedNote = buildApprovalNote({ approved: false, result: rejectResult, draftId: req.params.id });
    await mirrorApprovalOutcome(companyId, req.body.threadId || null, rejectedNote);

    try {
      const prisma = getSharedPrismaClient();
      await prisma.activityLog.create({
        data: {
          companyId,
          userId: req.user?.id || null,
          category: 'GOVERNANCE',
          action: 'AGENT_APPROVAL_REJECTED',
          description: `Approval rejected for draft ${req.params.id} by ${decidedBy}`,
          targetType: 'DRAFT',
          targetId: req.params.id,
          severity: 'MEDIUM',
          isSuccess: true,
          metadata: JSON.stringify({
            draftId: req.params.id,
            threadId: req.body.threadId || null,
            reason: req.body.reason || null,
            decidedBy,
          }),
        },
      });
    } catch (auditErr) {
      console.warn('[AgentApprovals] Failed to record activity log for rejection:', auditErr.message);
    }

    return res.json({ success: true, message: 'Rejected successfully', note: rejectedNote });
  } catch (error) {
    console.error('[AgentApprovals] Error rejecting:', error.message);
    res.status(502).json({ error: 'AI service rejection failed', detail: error.message });
  }
});

module.exports = router;
