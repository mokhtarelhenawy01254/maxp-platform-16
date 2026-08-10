const cron = require('node-cron');
const { convertExpiredVouchers, backfillMissingVouchers, getSettings } = require('../services/autoDiscountService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * تحويل كوبونات الخصم التلقائي المنتهية إلى كاش باك (كل ساعة)
 * + إصدار أي كوبون ناقص للأوردرات المسلّمة القديمة (self-healing)
 */
function startAutoDiscountVoucherCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const res = await convertExpiredVouchers();
      if (res.converted > 0) {
        console.log(`✅ [AUTO-DISCOUNT-CRON] Converted ${res.converted}/${res.expiredCount} expired vouchers to cashback`);
      }
    } catch (error) {
      console.error('❌ [AUTO-DISCOUNT-CRON] Error:', error.message);
    }
  });
  console.log('✅ [AUTO-DISCOUNT-CRON] Voucher expiry → cashback cron started (runs every hour)');

  // 🛠️ Self-healing: كل ساعة نفحص كل الشركات اللي نظام الخصم مفعّل عندها
  // ونصدر أي كوبون ناقص لأوردر مسلّم قديم (لو النظام كان موقوف أو حصل خطأ قبلاً)
  cron.schedule('15 * * * *', async () => {
    try {
      const prisma = getSharedPrismaClient();
      const companies = await prisma.company.findMany({
        where: { loyaltySystem: 'AUTO_DISCOUNT' },
        select: { id: true }
      });
      for (const c of companies) {
        try {
          await backfillMissingVouchers(c.id, { limit: 50 });
        } catch (e) {
          console.error(`❌ [AUTO-DISCOUNT-BACKFILL] Company ${c.id}:`, e.message);
        }
      }
    } catch (error) {
      console.error('❌ [AUTO-DISCOUNT-BACKFILL-CRON] Error:', error.message);
    }
  });
  console.log('✅ [AUTO-DISCOUNT-CRON] Missing voucher backfill cron started (runs every hour)');
}

module.exports = { startAutoDiscountVoucherCron };
