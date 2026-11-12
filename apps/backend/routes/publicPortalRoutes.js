const express = require('express');
const router = express.Router();
const publicPortalPwaController = require('../controller/publicPortalPwaController');
const { extractSubdomainMiddleware } = require('../middleware/subdomainMiddleware');

/**
 * Unified Public Portal PWA & Branding Endpoints
 * Base path: /api/v1/public/portal
 */

router.use(extractSubdomainMiddleware);

router.get('/lookup', publicPortalPwaController.lookupPortalCompanies);
router.get('/branding', publicPortalPwaController.getPortalBranding);
router.get(
  ['/manifest.webmanifest', '/manifest.json'],
  publicPortalPwaController.getPortalManifest,
);
router.get('/icon-:size.png', publicPortalPwaController.getPortalIcon);

module.exports = router;
