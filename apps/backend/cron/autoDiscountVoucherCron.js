const cron = require('node-cron');
const { convertExpiredVouchers, backfillMissingVouchers, getSettings, sendExpiryWarnings } = require('../services/autoDiscountService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * تحويل كوبونات الخصم التلقائي المنتهية إلى كاش باك (كل ساعة)
 * + إصدار أي كوبون ناقص للأوردرات المسلّمة القديمة (self-healing)
 * + تنبيه العملاء قبل انتهاء صلاحية كوبوناتهم (كل ساعة — نفس قيد hoursBefore)
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

  // ⏰ تنبيه العملاء قبل انتهاء كوبوناتهم (كل ساعة — لو حصل فشل مرة بيُعاد المحاولة)
  cron.schedule('30 * * * *', async () => {
    try {
      const res = await sendExpiryWarnings({ hoursBefore: 24 });
      if (res.warned > 0) {
        console.log(`✅ [AUTO-DISCOUNT-CRON] Sent ${res.warned} expiry warnings`);
      }
    } catch (error) {
      console.error('❌ [AUTO-DISCOUNT-CRON] Expiry warning error:', error.message);
    }
  });
  console.log('✅ [AUTO-DISCOUNT-CRON] Voucher expiry warning cron started (runs every hour)');

  // 🛠️ Self-healing: كل ساعة نفحص كل الشركات اللي نظام الخصم مفعّل عندها
  // ونصدر أي كوبون ناقص لأوردر مسلّم قديم (لو النظام كان موقوف أو حصل خطأ قبلاً)
  cron.schedule('15 * * * *', async () => {
    try {
      const prisma = getSharedPrismaClient();
      // 🆕 نفلتر الشركات اللي الخصم التلقائي مفعّل عندها عبر autoDiscountEnabled (مستقل)
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
