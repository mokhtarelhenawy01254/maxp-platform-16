const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const socketService = require('../services/socketService');

/**
 * 🆕 Wave 2c — Lead SLA first-contact escalation.
 * A lead sitting untouched (NEW_LEAD, never contacted) past the SLA window
 * escalates to the assignee (or company admins). Runs every 5 minutes.
 * Guard rails: only leads created within the last 24h are considered, so the
 * ancient unassigned backlog never triggers a notification storm; each lead
 * escalates once (slaFirstContactEscalatedAt stamp). Responding within
 * 5 minutes ≈ 21x qualification odds (InsideSales/HBR) — default window 15 min.
 */

const ADMIN_ROLES = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'];

function getSlaMinutes() {
  const parsed = parseInt(process.env.LEAD_FIRST_CONTACT_SLA_MINUTES || '15', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
}

async function processSlaEscalations() {
  const prisma = getSharedPrismaClient();
  const slaMinutes = getSlaMinutes();
  const now = new Date();
  const slaCutoff = new Date(now.getTime() - slaMinutes * 60 * 1000);
  const freshnessCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const staleLeads = await prisma.customer.findMany({
    where: {
      status: 'LEAD',
      leadStage: 'NEW_LEAD',
      firstContactAt: null,
      slaFirstContactEscalatedAt: null,
      createdAt: { lte: slaCutoff, gte: freshnessCutoff }
    },
    select: {
      id: true,
      companyId: true,
      assignedToId: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      leadSource: true
    },
    take: 300,
    orderBy: { createdAt: 'asc' }
  });

  if (staleLeads.length === 0) return { escalated: 0 };

  const adminsByCompany = new Map();
  let escalated = 0;

  for (const lead of staleLeads) {
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
            title: `ليد محتاج تواصل — عدّى ${slaMinutes} دقيقة`,
            message: `${name} (منذ ${lead.createdAt.toISOString().slice(0, 16).replace('T', ' ')}) لسه مافيهش أول تواصل. اتصل أو ابعت الآن.`,
            type: 'SYSTEM',
            data: { customerId: lead.id, kind: 'lead_sla_escalation', slaMinutes }
          }))
        });
        escalated += recipients.length;
      }
      await prisma.customer.update({
        where: { id: lead.id },
        data: { slaFirstContactEscalatedAt: now }
      });
    } catch (escalationError) {
      console.error('[LEAD-SLA-CRON] Escalation failed for', lead.id, escalationError.message);
    }
  }

  for (const companyId of adminsByCompany.keys()) {
    try {
      socketService.emitToCompany(companyId, 'lead:sla_escalation', {
        count: staleLeads.filter((l) => l.companyId === companyId).length
      });
    } catch (socketError) {
      console.error('[LEAD-SLA-CRON] Socket emit failed:', socketError.message);
    }
  }

  return { escalated };
}

function startLeadSlaEscalationScheduler() {
  console.log('[LEAD-SLA-CRON] Initializing lead SLA escalation scheduler...');

  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await processSlaEscalations();
      if (result && result.escalated > 0) {
        console.log(`[LEAD-SLA-CRON] Escalated ${result.escalated} stale lead(s) past ${getSlaMinutes()}min SLA`);
      }
    } catch (error) {
      console.error('[LEAD-SLA-CRON] Error during escalation sweep:', error.message);
    }
  });

  console.log(`[LEAD-SLA-CRON] Scheduler started (runs every 5 minutes, SLA=${getSlaMinutes()}min)`);
}

module.exports = { startLeadSlaEscalationScheduler, processSlaEscalations };
