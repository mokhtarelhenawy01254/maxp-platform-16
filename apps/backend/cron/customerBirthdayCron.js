const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const BIRTHDAY_KEY_PATTERN = /^(birthday|birthDate|birth_date|dateOfBirth|dob|╪¬╪º╪▒┘è╪«.*┘à┘è┘ä╪º╪»|╪¬╪º╪▒┘è╪«_╪º┘ä┘à┘è┘ä╪º╪»)$/i;

function findBirthdayValue(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const queue = [obj];
  const seen = new Set();
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    for (const [k, v] of Object.entries(cur)) {
      if (v == null) continue;
      if (BIRTHDAY_KEY_PATTERN.test(k) && (typeof v === 'string' || typeof v === 'number')) return String(v);
      if (typeof v === 'object') queue.push(v);
    }
  }
  return null;
}

function birthdayParts(customer) {
  if (!customer) return null;
  let meta = customer.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch (e) { meta = null; }
  }
  const raw = findBirthdayValue(meta);
  if (!raw) return null;
  const match = String(raw).match(/(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})/);
  if (!match) return null;
  return { day: parseInt(match[1], 10), month: parseInt(match[2], 10) };
}

/**
 * ≡ƒÄé ╪ú╪¬┘à╪¬╪⌐ ╪╣┘è╪» ┘à┘è┘ä╪º╪» ╪º┘ä╪╣┘à┘ä╪º╪í: ┘â┘ä ┘è┘ê┘à ╪º┘ä╪│╪º╪╣╪⌐ 10 ╪╡╪¿╪º╪¡╪º┘ï
 * ╪¿┘è╪¿╪╣╪¬ ╪¬┘ç┘å╪ª╪⌐ ┘ä┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘ä┘è ╪╣┘è╪» ┘à┘è┘ä╪º╪»┘ç┘à ╪º┘ä┘å┘ç╪º╪▒╪»┘ç (╪º┘ä┘à╪«╪▓┘æ┘å ┘ü┘è metadata)
 */
function startCustomerBirthdayScheduler() {
  console.log('≡ƒÄé [CUSTOMER-BIRTHDAY-CRON] Initializing...');

  cron.schedule('0 10 * * *', async () => {
    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();
      const todayMonth = now.getMonth() + 1;
      const todayDay = now.getDate();

      // ┘â┘ä ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐
      const companies = await prisma.company.findMany({ where: { isActive: true }, select: { id: true } });

      let totalSent = 0;
      for (const company of companies) {
        // ╪╣┘à┘ä╪º╪í ┘ä┘è┘ç┘à metadata
        const customers = await prisma.customer.findMany({
          where: { companyId: company.id, status: 'ACTIVE', metadata: { not: null } },
          select: { id: true, phone: true, firstName: true, lastName: true, metadata: true }
        });

        for (const customer of customers) {
          const bp = birthdayParts(customer);
          if (!bp || bp.month !== todayMonth || bp.day !== todayDay) continue;

          const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '╪╣╪▓┘è╪▓┘è ╪º┘ä╪╣┘à┘è┘ä';
          const phone = customer.phone;
          if (!phone) continue;

          try {
            const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
            const result = await WhatsAppNotificationService.sendNotification({
              companyId: company.id,
              recipientPhone: phone,
              recipientName: name,
              recipientType: 'CUSTOMER',
              category: 'MARKETING',
              eventType: 'BIRTHDAY_WISH',
              variables: { customerName: name, firstName: customer.firstName || '', discount: '', couponCode: '' },
              customerId: customer.id,
              priority: 3
            });

            if (result.success) totalSent++;
            else console.log(`ΓÜá∩╕Å [CUSTOMER-BIRTHDAY] ${name} skipped: ${result.reason}`);
          } catch (sendError) {
            console.error(`Γ¥î [CUSTOMER-BIRTHDAY] Failed for ${name}:`, sendError.message);
          }
        }
      }

      console.log(`Γ£à [CUSTOMER-BIRTHDAY-CRON] Done. Sent: ${totalSent}`);
    } catch (error) {
      console.error('Γ¥î [CUSTOMER-BIRTHDAY-CRON] Error:', error.message);
    }
  });

  console.log('Γ£à [CUSTOMER-BIRTHDAY-CRON] Started (runs daily at 10:00)');
}

module.exports = { startCustomerBirthdayScheduler };
