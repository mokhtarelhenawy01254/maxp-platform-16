const cron = require('node-cron');
const { convertExpiredVouchers, backfillMissingVouchers, getSettings, sendExpiryWarnings } = require('../services/autoDiscountService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * ╪¬╪¡┘ê┘è┘ä ┘â┘ê╪¿┘ê┘å╪º╪¬ ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ╪º┘ä┘à┘å╪¬┘ç┘è╪⌐ ╪Ñ┘ä┘ë ┘â╪º╪┤ ╪¿╪º┘â (┘â┘ä ╪│╪º╪╣╪⌐)
 * + ╪Ñ╪╡╪»╪º╪▒ ╪ú┘è ┘â┘ê╪¿┘ê┘å ┘å╪º┘é╪╡ ┘ä┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘à╪│┘ä┘æ┘à╪⌐ ╪º┘ä┘é╪»┘è┘à╪⌐ (self-healing)
 * + ╪¬┘å╪¿┘è┘ç ╪º┘ä╪╣┘à┘ä╪º╪í ┘é╪¿┘ä ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ┘â┘ê╪¿┘ê┘å╪º╪¬┘ç┘à (┘â┘ä ╪│╪º╪╣╪⌐ ΓÇö ┘å┘ü╪│ ┘é┘è╪» hoursBefore)
 */
function startAutoDiscountVoucherCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const res = await convertExpiredVouchers();
      if (res.converted > 0) {
        console.log(`Γ£à [AUTO-DISCOUNT-CRON] Converted ${res.converted}/${res.expiredCount} expired vouchers to cashback`);
      }
    } catch (error) {
      console.error('Γ¥î [AUTO-DISCOUNT-CRON] Error:', error.message);
    }
  });
  console.log('Γ£à [AUTO-DISCOUNT-CRON] Voucher expiry ΓåÆ cashback cron started (runs every hour)');

  // ΓÅ░ ╪¬┘å╪¿┘è┘ç ╪º┘ä╪╣┘à┘ä╪º╪í ┘é╪¿┘ä ╪º┘å╪¬┘ç╪º╪í ┘â┘ê╪¿┘ê┘å╪º╪¬┘ç┘à (┘â┘ä ╪│╪º╪╣╪⌐ ΓÇö ┘ä┘ê ╪¡╪╡┘ä ┘ü╪┤┘ä ┘à╪▒╪⌐ ╪¿┘è┘Å╪╣╪º╪» ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐)
  cron.schedule('30 * * * *', async () => {
    try {
      const res = await sendExpiryWarnings({ hoursBefore: 24 });
      if (res.warned > 0) {
        console.log(`Γ£à [AUTO-DISCOUNT-CRON] Sent ${res.warned} expiry warnings`);
      }
    } catch (error) {
      console.error('Γ¥î [AUTO-DISCOUNT-CRON] Expiry warning error:', error.message);
    }
  });
  console.log('Γ£à [AUTO-DISCOUNT-CRON] Voucher expiry warning cron started (runs every hour)');

  // ≡ƒ¢á∩╕Å Self-healing: ┘â┘ä ╪│╪º╪╣╪⌐ ┘å┘ü╪¡╪╡ ┘â┘ä ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä┘ä┘è ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ┘à┘ü╪╣┘æ┘ä ╪╣┘å╪»┘ç╪º
  // ┘ê┘å╪╡╪»╪▒ ╪ú┘è ┘â┘ê╪¿┘ê┘å ┘å╪º┘é╪╡ ┘ä╪ú┘ê╪▒╪»╪▒ ┘à╪│┘ä┘æ┘à ┘é╪»┘è┘à (┘ä┘ê ╪º┘ä┘å╪╕╪º┘à ┘â╪º┘å ┘à┘ê┘é┘ê┘ü ╪ú┘ê ╪¡╪╡┘ä ╪«╪╖╪ú ┘é╪¿┘ä╪º┘ï)
  cron.schedule('15 * * * *', async () => {
    try {
      const prisma = getSharedPrismaClient();
      // ≡ƒåò ┘å┘ü┘ä╪¬╪▒ ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä┘ä┘è ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à┘ü╪╣┘æ┘ä ╪╣┘å╪»┘ç╪º ╪╣╪¿╪▒ autoDiscountEnabled (┘à╪│╪¬┘é┘ä)
      const companies = await prisma.company.findMany({
        select: { id: true, loyaltySettings: true }
      });
      const enabledCompanies = companies.filter((c) => {
        try {
          const s = JSON.parse(c.loyaltySettings || '{}');
          return s.autoDiscountEnabled === true && s.enabled !== false;
        } catch (e) {
          return false;
        }
      });
      for (const c of enabledCompanies) {
        try {
          await backfillMissingVouchers(c.id, { limit: 50 });
        } catch (e) {
          console.error(`Γ¥î [AUTO-DISCOUNT-BACKFILL] Company ${c.id}:`, e.message);
        }
      }
    } catch (error) {
      console.error('Γ¥î [AUTO-DISCOUNT-BACKFILL-CRON] Error:', error.message);
    }
  });
  console.log('Γ£à [AUTO-DISCOUNT-CRON] Missing voucher backfill cron started (runs every hour)');
}

module.exports = { startAutoDiscountVoucherCron };
