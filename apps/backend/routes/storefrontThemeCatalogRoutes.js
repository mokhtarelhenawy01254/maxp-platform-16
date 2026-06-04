const express = require('express');
const router = express.Router();
const storefrontThemeCatalogController = require('../controller/storefrontThemeCatalogController');
const {
  authenticateToken,
  requireSuperAdmin,
} = require('../middleware/superAdminMiddleware');

router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/', storefrontThemeCatalogController.getAdminCatalog);
router.post('/:themeId/default', storefrontThemeCatalogController.setDefaultTheme);
router.put('/:themeId', storefrontThemeCatalogController.updateTheme);

module.exports = router;
