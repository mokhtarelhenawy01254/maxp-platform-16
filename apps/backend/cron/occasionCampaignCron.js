const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

/**
 * 🎉 أتمتة حملات المناسبات المجدولة (Ramadan / عيد الأم / افتتاحات...)
 * كل ساعة: بتبعت أي حملة واتساب مجدولة (scheduledAt جاهز) لجمهورها.
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
      // حل الجمهور
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
        const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عزيزي العميل';
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
          console.error(`❌ [OCCASION-CRON] Send failed for ${phone}:`, sendErr.message);
        }
      }

      await prisma.broadcastCampaign.update({
        where: { id: campaign.id },
        data: { status: 'completed', sentAt: new Date(), sentCount: sent, failedCount: failed }
      });
      totalSent += sent;
      console.log(`✅ [OCCASION-CRON] Campaign "${campaign.name}" sent to ${sent} (failed ${failed})`);
    } catch (error) {
      console.error(`❌ [OCCASION-CRON] Failed processing campaign ${campaign.id}:`, error.message);
    }
  }

  if (campaigns.length > 0) {
    console.log(`✅ [OCCASION-CRON] Done. Total sent: ${totalSent}`);
  }
}

function startOccasionCampaignScheduler() {
  console.log('🎉 [OCCASION-CRON] Initializing occasion campaign scheduler...');
  cron.schedule('0 * * * *', async () => {
    try {
      await processDueOccasionCampaigns();
    } catch (error) {
      console.error('❌ [OCCASION-CRON] Error:', error.message);
    }
  });
  console.log('✅ [OCCASION-CRON] Started (runs every hour)');
}

module.exports = { startOccasionCampaignScheduler, processDueOccasionCampaigns };
