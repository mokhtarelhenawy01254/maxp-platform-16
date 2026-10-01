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

// ── Internal: draft-created notification (called by the AI service) ──────────
// The Python pipeline fires this fire-and-forget right after persisting a NEW
// pending draft; we push a WhatsApp heads-up to the merchant's owners/admins so
// drafts stop dying unseen in a queue (the Sep-2026 incident: 13 stale drafts).

const APPROVAL_ACTION_LABELS = {
  conversion_tool_toggle: 'تشغيل/إيقاف أداة تحويل',
  conversion_tool_set_threshold: 'ضبط عتبة أداة تحويل',
  product_configure_conversion: 'إعداد أداة تحويل لمنتج',
  product_create: 'إنشاء منتج جديد',
  inventory_adjust: 'تعديل مخزون',
  record_learned_rule: 'تسجيل قاعدة تعلّم في الذاكرة',
  unlock_advanced_tools: 'فتح أدوات متقدمة',
};

function normalizeOwnerPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.length === 11 && digits.startsWith('0')) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('1')) return `2${digits}`;
  return digits;
}

function summarizeApprovalArgs(actionType, args = {}) {
  if (actionType === 'conversion_tool_toggle') {
    return `${args.enable ? 'تفعيل' : 'إيقاف'} «${args.tool_key || args.toolKey || ''}»`;
  }
  if (actionType === 'product_create') return args.name ? `«${args.name}»` : '';
  if (actionType === 'record_learned_rule') return args.rule_title ? `«${args.rule_title}»` : '';
  if (actionType === 'inventory_adjust' || actionType === 'product_configure_conversion') {
    return args.product_id || args.productId || '';
  }
  return '';
}

router.post('/internal/notify', async (req, res) => {
  try {
    if (!req.user?.service) {
      return res.status(403).json({ error: 'Service access only' });
    }
    const companyId = req.user?.companyId || req.headers['x-company-id'];
    const { draftId, actionType, actionArgs } = req.body || {};
    if (!companyId || !draftId) {
      return res.status(400).json({ error: 'companyId and draftId are required' });
    }

    const prisma = getSharedPrismaClient();
    const staff = await prisma.userCompany.findMany({
      where: { companyId, role: { in: ['OWNER', 'COMPANY_ADMIN'] } },
      select: { role: true, user: { select: { phone: true, firstName: true } } },
    });
    const phones = [...new Set(staff.map((s) => normalizeOwnerPhone(s.user?.phone)).filter(Boolean))];
    if (phones.length === 0) {
      return res.json({ success: true, notified: 0, reason: 'no owner/admin phone on file' });
    }

    const label = APPROVAL_ACTION_LABELS[actionType] || actionType;
    const detail = summarizeApprovalArgs(actionType, actionArgs || {});
    const message = [
      '🔔 *طلب اعتماد جديد من مساعدك الذكي*',
      `الإجراء: ${label}${detail ? ` — ${detail}` : ''}`,
      '',
      'اعتماده أو رفضه من مركز الموافقات في الداشبورد:',
      'https://maxp.online/dashboard',
    ].join('\n');

    const whatsappNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
    let notified = 0;
    for (const phone of phones) {
      try {
        const sendResult = await whatsappNotificationService.sendViaLocalWhatsApp({
          companyId,
          phone,
          message,
          eventType: 'AGENT_APPROVAL_REQUEST',
        });
        if (sendResult?.success) notified++;
      } catch (sendErr) {
        console.warn('[AgentApprovals] WhatsApp notify failed for', phone, sendErr.message);
      }
    }

    return res.json({ success: true, notified, recipients: phones.length });
  } catch (error) {
    console.error('[AgentApprovals] Error notifying draft created:', error.message);
    res.status(500).json({ error: 'Failed to notify draft created' });
  }
});

module.exports = router;
