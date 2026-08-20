const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const { findCustomerByPhone } = require('../utils/customerIdentity');

// ╪¬╪╖╪¿┘è┘é ╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘å ╪º┘ä╪│╪º╪¿ ╪»┘ê┘à┘è┘å
router.use(extractSubdomainMiddleware);
router.use(requireCompany);

/**
 * GET /api/v1/public/loyalty/tier-progress?phone=...
 * ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä + ╪º┘ä┘à╪▓╪º┘è╪º + ╪º┘ä╪¬┘é╪»┘à ┘ä┘ä┘à╪│╪¬┘ê┘ë ╪º┘ä╪¬╪º┘ä┘è (┘ä┘ä╪╣╪▒╪╢ ┘ü┘è ╪º┘ä┘à╪¬╪¼╪▒)
 */
router.get('/tier-progress', async (req, res) => {
  try {
    const companyId = req.company?.id || req.companyId;
    const { phone } = req.query;

    if (!companyId || !phone) {
      return res.status(400).json({ success: false, error: 'phone ┘à╪╖┘ä┘ê╪¿' });
    }

    const customer = await findCustomerByPhone(getSharedPrismaClient(), String(phone), companyId);
    if (!customer) {
      return res.json({ success: true, data: null });
    }

    const progress = await customerLoyaltyService.getCustomerTierProgress(companyId, customer.id);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Γ¥î Error in public tier-progress:', error);
    res.status(500).json({ success: false, error: '╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä' });
  }
});

module.exports = router;
