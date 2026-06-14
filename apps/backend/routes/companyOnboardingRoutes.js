const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const { getOnboarding, saveOnboardingProgress, completeOnboarding, trackFunnelEvent } = require("../controller/companyOnboardingController");

router.get("/onboarding", verifyToken.authenticateToken, verifyToken.requireCompanyAccess, getOnboarding);
router.put("/onboarding", verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), saveOnboardingProgress);
router.post("/onboarding/complete", verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), completeOnboarding);
router.post("/funnel-events", verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), trackFunnelEvent);

module.exports = router;