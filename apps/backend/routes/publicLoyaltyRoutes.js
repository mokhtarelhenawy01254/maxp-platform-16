const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const { findCustomerByPhone } = require('../utils/customerIdentity');

// تطبيق استخراج الشركة من الساب دومين
router.use(extractSubdomainMiddleware);
router.use(requireCompany);

/**
 * GET /api/v1/public/loyalty/tier-progress?phone=...
 * مستوى العميل + المزايا + التقدم للمستوى التالي (للعرض في المتجر)
 */
router.get('/tier-progress', async (req, res) => {
  try {
    const companyId = req.company?.id || req.companyId;
    const { phone } = req.query;

    if (!companyId || !phone) {
      return res.status(400).json({ success: false, error: 'phone مطلوب' });
    }

    const customer = await findCustomerByPhone(getSharedPrismaClient(), String(phone), companyId);
    if (!customer) {
      return res.json({ success: true, data: null });
    }

    const progress = await customerLoyaltyService.getCustomerTierProgress(companyId, customer.id);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('❌ Error in public tier-progress:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب مستوى العميل' });
  }
});

module.exports = router;
