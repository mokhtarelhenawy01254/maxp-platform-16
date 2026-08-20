/**
 * ≡ƒÆí Loyalty Routes (╪╣╪º┘à - ┘ä┘ä┘ê╪º╪¼┘ç╪⌐ ╪º┘ä╪ú┘à╪º┘à┘è╪⌐)
 * ┘à╪│╪º╪▒ ┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ╪º┘ä╪»┘è┘å╪º┘à┘è┘â┘è ┘ä╪╡┘ü╪¡╪⌐ ╪º┘ä┘à┘å╪¬╪¼.
 */

const express = require('express');
const router = express.Router();
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const loyaltyCashbackPreviewController = require('../controller/loyaltyCashbackPreviewController');

// ╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘å ╪º┘ä╪│╪º╪¿ ╪»┘ê┘à┘è┘å (┘à╪½┘ä ╪¿╪º┘é┘è ╪º┘ä┘à╪│╪º╪▒╪º╪¬ ╪º┘ä╪╣╪º┘à╪⌐)
router.use(extractSubdomainMiddleware);
router.use(requireCompany);

/**
 * GET /api/v1/loyalty/cashback-preview?productId=&categoryId=&amount=
 * ┘è┘Å╪▒╪¼╪╣ ╪¬┘é╪»┘è╪▒ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ┘ä┘ä╪╣┘à┘è┘ä ┘ü┘è ╪º┘ä┘à╪¬╪¼╪▒ (ProductInfo).
 */
router.get('/cashback-preview', loyaltyCashbackPreviewController.previewCashback);

module.exports = router;
