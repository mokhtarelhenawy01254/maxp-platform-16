const cron = require('node-cron');
const { convertExpiredVouchers } = require('../services/autoDiscountService');

/**
 * تحويل كوبونات الخصم التلقائي المنتهية إلى كاش باك (كل ساعة)
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
}

module.exports = { startAutoDiscountVoucherCron };
