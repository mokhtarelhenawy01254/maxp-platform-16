const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const socketService = require('../services/socketService');

/**
 * 🆕 Wave 1 — Lead CRM follow-up reminder cron.
 * nextFollowUpDate on Customer was scheduled manually by employees but nothing
 * ever surfaced it (no cron, no overdue list) — scheduled follow-ups died silently.
 * Now: every 30 minutes, notify the assigned employee (or company admins when
 * unassigned) about due/overdue lead follow-ups. Re-reminds after 24h if untouched.
 */

const ADMIN_ROLES = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'];
const RE_REMIND_AFTER_MS = 24 * 60 * 60 * 1000;

async function processDueLeadFollowUps() {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  const reRemindBefore = new Date(now.getTime() - RE_REMIND_AFTER_MS);

  const dueLeads = await prisma.customer.findMany({
    where: {
      status: 'LEAD',
      nextFollowUpDate: { lte: now },
      OR: [
        { followUpReminderSentAt: null },
        { followUpReminderSentAt: { lt: reRemindBefore } }
      ]
    },
    select: {
      id: true,
      companyId: true,
      assignedToId: true,
      firstName: true,
      lastName: true,
      phone: true,
      leadStage: true,
      nextFollowUpDate: true
    },
    take: 500,
    orderBy: { nextFollowUpDate: 'asc' }
  });

  if (dueLeads.length === 0) return { notified: 0 };

  const adminsByCompany = new Map();
  const companiesWithDue = new Set();
  let notified = 0;

  for (const lead of dueLeads) {
    companiesWithDue.add(lead.companyId);
    const dueAt = lead.nextFollowUpDate ? lead.nextFollowUpDate.toISOString() : '';
    const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'عميل محتمل';

    let recipients = [];
    if (lead.assignedToId) {
      recipients = [lead.assignedToId];
    } else {
      if (!adminsByCompany.has(lead.companyId)) {
        const admins = await prisma.userCompany.findMany({
          where: { companyId: lead.companyId, role: { in: ADMIN_ROLES }, isActive: true },
          select: { userId: true }
        });
        adminsByCompany.set(lead.companyId, admins.map((a) => a.userId));
      }
      recipients = adminsByCompany.get(lead.companyId) || [];
    }

    try {
      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map((userId) => ({
            companyId: lead.companyId,
            userId,
            title: 'متابعة ليد مستحقة الآن',
            message: `${name} — موعد المتابعة (${dueAt}). اتصل أو ابعت واتساب وسجل النتيجة.`,
            type: 'SYSTEM',
            data: { customerId: lead.id, dueAt, kind: 'lead_followup_due' }
          }))
        });
        notified += recipients.length;
      }
      // Stamp regardless of recipients so an unnotifiable lead doesn't retry every 30 min
      await prisma.customer.update({
        where: { id: lead.id },
        data: { followUpReminderSentAt: now }
      });
    } catch (notifyError) {
      console.error('[LEAD-REMINDER-CRON] Notify failed for', lead.id, notifyError.message);
    }
  }

  for (const companyId of companiesWithDue) {
    try {
      socketService.emitToCompany(companyId, 'lead:followup_due', {
        count: dueLeads.filter((l) => l.companyId === companyId).length
      });
    } catch (socketError) {
      console.error('[LEAD-REMINDER-CRON] Socket emit failed:', socketError.message);
    }
  }

  return { notified };
}

function startLeadFollowUpReminderScheduler() {
  console.log('[LEAD-REMINDER-CRON] Initializing lead follow-up reminder scheduler...');

  cron.schedule('*/30 * * * *', async () => {
    console.log('[LEAD-REMINDER-CRON] Checking for due lead follow-ups...');
    try {
      const result = await processDueLeadFollowUps();
      if (result && result.notified > 0) {
        console.log(`[LEAD-REMINDER-CRON] Sent ${result.notified} follow-up reminder(s)`);
      }
    } catch (error) {
      console.error('[LEAD-REMINDER-CRON] Error during processing:', error.message);
    }
  });

  console.log('[LEAD-REMINDER-CRON] Scheduler started (runs every 30 minutes)');
}

module.exports = { startLeadFollowUpReminderScheduler, processDueLeadFollowUps };
