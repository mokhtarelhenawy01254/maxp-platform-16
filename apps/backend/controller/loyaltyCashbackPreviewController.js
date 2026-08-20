/**
 * ≡ƒÆí Cashback Preview Controller (┘ä┘ä╪º╪│╪¬╪«╪»╪º┘à ┘ü┘è ╪╡┘ü╪¡╪⌐ ┘à┘å╪¬╪¼ ╪º┘ä┘à╪¬╪¼╪▒ - ProductInfo)
 * ┘è┘Å╪▒╪¼╪╣ ╪¬┘é╪»┘è╪▒ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ╪º┘ä╪»┘è┘å╪º┘à┘è┘â┘è ┘ä┘à┘å╪¬╪¼/┘ü╪ª╪⌐ ┘é╪¿┘ä ╪º┘ä╪┤╪▒╪º╪í.
 */

const customerLoyaltyService = require('../services/hr/customerLoyaltyService');

/**
 * GET /api/v1/loyalty/cashback-preview?companyId=&productId=&categoryId=&amount=
 * ┘è╪▒╪¼╪╣ { cashback, rate, isDynamic, currency }
 */
async function previewCashback(req, res) {
  try {
    const { companyId, productId, categoryId, amount } = req.query;

    // ╪º┘ä╪¬╪¡┘é┘é ╪º┘ä╪»┘ü╪º╪╣┘è ┘à┘å ╪º┘ä┘à╪»╪«┘ä╪º╪¬
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId ┘à╪╖┘ä┘ê╪¿' });
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
    console.error('Γ¥î Error in cashback preview:', error);
    return res.status(500).json({ success: false, error: '╪¬╪╣╪░┘æ╪▒ ╪¡╪│╪º╪¿ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â' });
  }
}

module.exports = { previewCashback };
