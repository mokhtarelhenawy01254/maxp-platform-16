const express = require('express');
const router = express.Router();
const marketingReps = require('../controller/radiologyMarketingRepsController');
const referralSources = require('../controller/radiologyReferralSourcesController');
const externalPartners = require('../controller/radiologyExternalPartnersController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

// Marketing reps (مندوبي التسويق)
router.get('/marketing-reps', marketingReps.listMarketingReps);
router.post('/marketing-reps', verifyToken.requireRole(MANAGER_ROLES), marketingReps.createMarketingRep);
router.put('/marketing-reps/:id', verifyToken.requireRole(MANAGER_ROLES), marketingReps.updateMarketingRep);
router.delete('/marketing-reps/:id', verifyToken.requireRole(MANAGER_ROLES), marketingReps.deleteMarketingRep);
router.get('/marketing-reps/portfolio', marketingReps.repPortfolio);

// Referral sources (جهات الإحالة)
router.get('/referral-sources', referralSources.listSources);
router.post('/referral-sources', verifyToken.requireRole(MANAGER_ROLES), referralSources.createSource);
router.put('/referral-sources/:id', verifyToken.requireRole(MANAGER_ROLES), referralSources.updateSource);
router.delete('/referral-sources/:id', verifyToken.requireRole(MANAGER_ROLES), referralSources.deleteSource);
router.put('/referral-sources/:id/physicians', verifyToken.requireRole(MANAGER_ROLES), referralSources.setSourcePhysicians);
router.get('/referring-physicians/:id/sources', referralSources.getPhysicianSources);

// External partners (الشركاء الخارجيون)
router.get('/external-partners', externalPartners.listExternalPartners);
router.post('/external-partners', verifyToken.requireRole(MANAGER_ROLES), externalPartners.createExternalPartner);
router.put('/external-partners/:id', verifyToken.requireRole(MANAGER_ROLES), externalPartners.updateExternalPartner);
router.delete('/external-partners/:id', verifyToken.requireRole(MANAGER_ROLES), externalPartners.deleteExternalPartner);

module.exports = router;
