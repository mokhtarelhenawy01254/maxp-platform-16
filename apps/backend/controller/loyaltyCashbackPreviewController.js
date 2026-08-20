/**
 * 💡 Cashback Preview Controller (للاستخدام في صفحة منتج المتجر - ProductInfo)
 * يُرجع تقدير الكاش باك الديناميكي لمنتج/فئة قبل الشراء.
 */

const customerLoyaltyService = require('../services/hr/customerLoyaltyService');

/**
 * GET /api/v1/loyalty/cashback-preview?companyId=&productId=&categoryId=&amount=
 * يرجع { cashback, rate, isDynamic, currency }
 */
async function previewCashback(req, res) {
  try {
    const { companyId, productId, categoryId, amount } = req.query;

    // التحقق الدفاعي من المدخلات
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId مطلوب' });
    }

    const baseAmount = amount != null && amount !== '' ? Number(amount) : 0;

    const result = await customerLoyaltyService.calculateDynamicCashback({
      companyId: String(companyId),
      productId: productId ? String(productId) : undefined,
      categoryId: categoryId ? String(categoryId) : undefined,
      baseAmount: Number.isFinite(baseAmount) ? baseAmount : 0
    });

    return res.json({
      success: true,
      data: {
        cashback: result.cashback,
        rate: result.rate,
        isDynamic: result.isDynamic,
        currency: result.currency
      }
    });
  } catch (error) {
    console.error('❌ Error in cashback preview:', error);
    return res.status(500).json({ success: false, error: 'تعذّر حساب الكاش باك' });
  }
}

module.exports = { previewCashback };
