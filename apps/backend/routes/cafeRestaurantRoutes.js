const express = require('express');
const router = express.Router();
const controller = require('../controller/cafeRestaurantController');
const { authenticateToken, requireCompanyAccess } = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// All routes require authentication and company scope
router.use(authenticateToken);
router.use(requireCompanyAccess);
router.use(checkAppAccess('cafe-restaurant-pro'));

// -----------------------------
// 1. Recipes & BOM
// -----------------------------
router.get('/recipes', controller.listRecipes);
router.get('/recipes/product/:productId', controller.getRecipeByProductId);
router.post('/recipes', controller.upsertRecipe);
router.delete('/recipes/:id', controller.deleteRecipe);

// -----------------------------
// 2. Physical Stock Audits
// -----------------------------
router.get('/audits', controller.listAuditSessions);
router.get('/audits/:id', controller.getAuditSession);
router.post('/audits', controller.startAuditSession);
router.put('/audits/:id/counts', controller.updateAuditCounts);
router.post('/audits/:id/approve', controller.approveAndReconcileAudit);

// -----------------------------
// 3. Modifiers (Milks, Shots, Flavors)
// -----------------------------
router.get('/modifiers', controller.listModifierGroups);
router.post('/modifiers', controller.createModifierGroup);
router.put('/modifiers/:id', controller.updateModifierGroup);
router.delete('/modifiers/:id', controller.deleteModifierGroup);

// -----------------------------
// 4. Cloud Table Tabs
// -----------------------------
router.get('/tables', controller.listTableTabs);
router.post('/tables', controller.saveTableTab);
router.post('/tables/:id/fire-kot', controller.fireTableKot);
router.post('/tables/:id/close', controller.closeTableTab);
router.delete('/tables/:id', controller.deleteTableTab);

// -----------------------------
// 5. Operational Waste & Spoilage
// -----------------------------
router.get('/waste', controller.listOperationalWaste);
router.post('/waste', controller.recordOperationalWaste);

module.exports = router;

