const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const { buildEffectiveCustomerListWhere } = require('../utils/customerListCriteria');

/**
 * ≡ƒÄë ╪ú╪¬┘à╪¬╪⌐ ╪¡┘à┘ä╪º╪¬ ╪º┘ä┘à┘å╪º╪│╪¿╪º╪¬ ╪º┘ä┘à╪¼╪»┘ê┘ä╪⌐ (Ramadan / ╪╣┘è╪» ╪º┘ä╪ú┘à / ╪º┘ü╪¬╪¬╪º╪¡╪º╪¬...)
 * ┘â┘ä ╪│╪º╪╣╪⌐: ╪¿╪¬╪¿╪╣╪¬ ╪ú┘è ╪¡┘à┘ä╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ┘à╪¼╪»┘ê┘ä╪⌐ (scheduledAt ╪¼╪º┘ç╪▓) ┘ä╪¼┘à┘ç┘ê╪▒┘ç╪º.
 */
async function processDueOccasionCampaigns() {
  const prisma = getSharedPrismaClient();
  const now = new Date();

  const campaigns = await prisma.broadcastCampaign.findMany({
    where: { channel: 'whatsapp', status: 'scheduled', scheduledAt: { lte: now } },
    take: 50
  });

  let totalSent = 0;
  for (const campaign of campaigns) {
    try {
      // ╪¡┘ä ╪º┘ä╪¼┘à┘ç┘ê╪▒
      let audience = [];
      if (campaign.targetAudience === 'all' || !campaign.targetAudience) {
        const customers = await prisma.customer.findMany({
          where: { companyId: campaign.companyId, status: 'ACTIVE', phone: { not: null } },
          select: { phone: true, firstName: true, lastName: true },
          take: 2000
        });
        audience = customers;
      } else {
        try {
          const parsed = JSON.parse(campaign.targetAudience);
          if (Array.isArray(parsed)) {
            audience = parsed.map((phone) => ({ phone }));
          }
        } catch (e) {
          audience = [];
        }
      }

      if (audience.length === 0) {
        await prisma.broadcastCampaign.update({
          where: { id: campaign.id },
          data: { status: 'completed', sentAt: new Date(), sentCount: 0, failedCount: 0 }
        });
        continue;
      }

      let sent = 0;
      let failed = 0;
      for (const customer of audience) {
        const phone = customer.phone;
        if (!phone) continue;
        const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '╪╣╪▓┘è╪▓┘è ╪º┘ä╪╣┘à┘è┘ä';
        try {
          const result = await WhatsAppNotificationService.sendNotification({
            companyId: campaign.companyId,
            recipientPhone: phone,
            recipientName: name,
            recipientType: 'CUSTOMER',
            category: 'MARKETING',
            eventType: 'OCCASION_CAMPAIGN',
            contentOverride: campaign.message,
            variables: { customerName: name, firstName: customer.firstName || '' },
            priority: 2
          });
          if (result.success) sent++; else failed++;
        } catch (sendErr) {
          failed++;
          console.error(`Γ¥î [OCCASION-CRON] Send failed for ${phone}:`, sendErr.message);
        }
      }

      await prisma.broadcastCampaign.update({
        where: { id: campaign.id },
        data: { status: 'completed', sentAt: new Date(), sentCount: sent, failedCount: failed }
      });
      totalSent += sent;
      console.log(`Γ£à [OCCASION-CRON] Campaign "${campaign.name}" sent to ${sent} (failed ${failed})`);
    } catch (error) {
      console.error(`Γ¥î [OCCASION-CRON] Failed processing campaign ${campaign.id}:`, error.message);
    }
  }

  if (campaigns.length > 0) {
    console.log(`Γ£à [OCCASION-CRON] Done. Total sent: ${totalSent}`);
  }
}

function parseListIds(raw) {
  if (Array.isArray(raw)) return raw.filter(x => typeof x === 'string' && x);
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ┘è╪¡┘ä ╪¼┘à┘ç┘ê╪▒ ╪º┘ä┘à┘å╪º╪│╪¿╪⌐ ┘à┘å ┘é┘ê╪º╪ª┘à ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘à╪«╪¬╪º╪▒╪⌐ (┘è╪»┘à╪¼ ╪º┘ä╪ú╪╣╪╢╪º╪í ┘ê┘è┘à┘å╪╣ ╪º┘ä╪¬┘â╪▒╪º╪▒)
const DEFAULT_LIST_CRITERIA = {
  all: { type: 'all' },
  'active-24h': { type: 'active', lastActivity: '24' },
};
async function resolveOccasionAudience(prisma, companyId, listIds) {
  if (!Array.isArray(listIds) || listIds.length === 0) return [];
  const dbLists = await prisma.customerList.findMany({ where: { id: { in: listIds }, companyId } });
  const customerMap = new Map();
  for (const listId of listIds) {
    let criteria = null;
    const dbList = dbLists.find(l => l.id === listId);
    if (dbList) criteria = dbList.criteria;
    else if (DEFAULT_LIST_CRITERIA[listId]) criteria = JSON.stringify(DEFAULT_LIST_CRITERIA[listId]);
    if (!criteria) continue;
    try {
      const { where } = await buildEffectiveCustomerListWhere(prisma, companyId, criteria);
      const customers = await prisma.customer.findMany({
        where,
        select: { id: true, phone: true, firstName: true, lastName: true },
        take: 5000,
      });
      for (const c of customers) {
        if (c.phone && !customerMap.has(c.id)) customerMap.set(c.id, c);
      }
    } catch (e) {
      console.error(`Γ¥î [OCCASION-CRON] list ${listId} resolve error:`, e.message);
    }
  }
  return Array.from(customerMap.values());
}

// ┘è╪╣╪º┘ä╪¼ ╪º┘ä┘à┘å╪º╪│╪¿╪º╪¬ ╪º┘ä┘à╪¼╪»┘ê┘ä╪⌐ ┘ê┘è╪¿╪╣╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä╪¼┘à┘ç┘ê╪▒┘ç╪º╪î ┘à╪╣ ╪»╪╣┘à ╪º┘ä╪¬┘â╪▒╪º╪▒ (╪┤┘ç╪▒┘è/╪│┘å┘ê┘è)
async function processDueOccasions() {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  const occasions = await prisma.occasion.findMany({
    where: { status: 'scheduled', nextRunAt: { lte: now } },
    take: 50,
  });

  // ╪▒╪¿╪╖ ╪¡┘è: ┘ä┘ê ╪º┘ä┘à┘å╪º╪│╪¿╪⌐ ┘à╪¬╪▒╪¿╪╖╪⌐ ╪¿┘é╪º┘ä╪¿╪î ╪º╪│╪¬╪«╪»┘à ┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪¡╪º┘ä┘è ┘â╪▒╪│╪º┘ä╪⌐
  const templateIds = occasions.map(o => o.templateId).filter(Boolean);
  const templateMap = new Map();
  if (templateIds.length > 0) {
    const templates = await prisma.whatsAppNotificationTemplate.findMany({
      where: { id: { in: templateIds } },
    });
    templates.forEach(t => templateMap.set(t.id, t));
  }

  for (const occ of occasions) {
    try {
      const tpl = occ.templateId ? templateMap.get(occ.templateId) : null;
      const message = tpl && tpl.content ? tpl.content : occ.message;
      const listIds = parseListIds(occ.customerListIds);
      const audience = await resolveOccasionAudience(prisma, occ.companyId, listIds);

      // ╪¬╪╖╪¿┘è┘é ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪Ñ╪▒╪│╪º┘ä: ╪¡╪» ╪ú┘é╪╡┘ë ┘ä┘ä╪╣┘à┘ä╪º╪í + ┘à╪╣╪»┘ä ╪ú┘é╪╡┘ë ┘ä┘â┘ä ╪¼┘ê┘ä╪⌐ (┘â┘ä ╪│╪º╪╣╪⌐)
      const limit = occ.sendLimit > 0 ? occ.sendLimit : audience.length;
      const recipients = audience.slice(0, limit);
      const already = Math.min(occ.totalSent || 0, recipients.length);

      if (already >= recipients.length) {
        // ╪«┘ä╪╡┘å╪º ┘â┘ä ╪º┘ä┘à╪╖┘ä┘ê╪¿ ΓÇö ╪«╪º┘ä╪╡ ┘ä┘à╪▒╪¡┘ä╪⌐ ╪º┘ä╪¬┘â╪▒╪º╪▒/╪º┘ä╪Ñ╪¬┘à╪º┘à
        let doneNextRunAt = null;
        let doneStatus = 'sent';
        if (occ.recurrence === 'yearly') {
          const next = new Date(occ.nextRunAt || occ.scheduledAt);
          next.setFullYear(next.getFullYear() + 1);
          doneNextRunAt = next;
          doneStatus = 'scheduled';
        } else if (occ.recurrence === 'monthly') {
          const next = new Date(occ.nextRunAt || occ.scheduledAt);
          next.setMonth(next.getMonth() + 1);
          doneNextRunAt = next;
          doneStatus = 'scheduled';
        }
        await prisma.occasion.update({
          where: { id: occ.id },
          data: { status: doneStatus, nextRunAt: doneNextRunAt, lastSentAt: new Date(), lastSentCount: 0 },
        });
        console.log(`Γ£à [OCCASION-CRON] "${occ.name}" reached limit (${already}/${limit}) - ${doneStatus}`);
        continue;
      }

      const batchSize = occ.throttlePerRun > 0 ? occ.throttlePerRun : recipients.length - already;
      const batch = recipients.slice(already, already + batchSize);
      let sent = 0;
      let failed = 0;

      if (batch.length > 0) {
        for (const customer of batch) {
          const phone = customer.phone;
          if (!phone) continue;
          const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '╪╣╪▓┘è╪▓┘è ╪º┘ä╪╣┘à┘è┘ä';
          try {
            const result = await WhatsAppNotificationService.sendNotification({
              companyId: occ.companyId,
              recipientPhone: phone,
              recipientName: name,
              recipientType: 'CUSTOMER',
              category: 'MARKETING',
              eventType: 'OCCASION_CAMPAIGN',
              contentOverride: message,
              variables: {
                customerName: name,
                firstName: customer.firstName || '',
                occasionName: occ.name,
              },
              priority: 2,
            });
            if (result && result.success) sent++;
            else failed++;
          } catch (sendErr) {
            failed++;
          }
        }
      }

      const totalSent = already + sent;

      // ┘ç┘ä ┘ä╪│┘ç ╪¿╪º┘é┘è ┘à╪│╪¬┘ä┘à┘è┘å ┘ü┘è ╪º┘ä╪¼┘ê┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐╪ƒ (╪¿╪│╪¿╪¿ ┘à╪╣╪»┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ä┘â┘ä ╪│╪º╪╣╪⌐)
      const stillRemaining = already + batch.length < recipients.length;

      let nextRunAt = null;
      let status = 'sent';
      if (stillRemaining) {
        nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
        status = 'scheduled';
      } else if (occ.recurrence === 'yearly') {
        const next = new Date(occ.nextRunAt || occ.scheduledAt);
        next.setFullYear(next.getFullYear() + 1);
        nextRunAt = next;
        status = 'scheduled';
      } else if (occ.recurrence === 'monthly') {
        const next = new Date(occ.nextRunAt || occ.scheduledAt);
        next.setMonth(next.getMonth() + 1);
        nextRunAt = next;
        status = 'scheduled';
      }

      await prisma.occasion.update({
        where: { id: occ.id },
        data: { status, nextRunAt, lastSentAt: new Date(), lastSentCount: sent, totalSent },
      });
      console.log(`Γ£à [OCCASION-CRON] "${occ.name}" sent ${sent} this run (total ${totalSent}/${limit}, failed ${failed}) recurrence=${occ.recurrence}${stillRemaining ? ' -> continuing next hour' : ''}`);
    } catch (error) {
      console.error(`Γ¥î [OCCASION-CRON] Failed processing occasion ${occ.id}:`, error.message);
    }
  }
}

function startOccasionCampaignScheduler() {
  console.log('≡ƒÄë [OCCASION-CRON] Initializing occasion campaign scheduler...');
  cron.schedule('0 * * * *', async () => {
    try {
      await processDueOccasionCampaigns();
    } catch (error) {
      console.error('Γ¥î [OCCASION-CRON] Error:', error.message);
    }
    try {
      await processDueOccasions();
    } catch (error) {
      console.error('Γ¥î [OCCASION-CRON] processDueOccasions Error:', error.message);
    }
  });
  console.log('Γ£à [OCCASION-CRON] Started (runs every hour)');
}

module.exports = { startOccasionCampaignScheduler, processDueOccasionCampaigns, processDueOccasions };
