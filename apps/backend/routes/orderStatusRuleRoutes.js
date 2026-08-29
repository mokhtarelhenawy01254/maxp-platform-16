const express = require("express");
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require("../middleware/checkAppAccess");
const orderStatusRuleController = require("../controller/orderStatusRuleController");

// 🛡️ PRODUCTION-FIX (cron-validation-2026-08-23):
// 1. checkAppAccess('order-core') — بيمنع أي user من شركة مش مفعل عندها
//    الـ order-core app يعمل rule. بيـ bypass تلقائي للـ SUPER_ADMIN.
// 2. requireRole على create/delete — لإنشاء/حذف الـ rules مفيش سبب
//    يخلي الموظف العادي يعملها. الـ SUPER_ADMIN بيـ bypass تلقائي.
const RULE_ADMIN_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

// Ensure token verification on all routes
router.use(verifyToken.authenticateToken);

// 🚨 FIX: كان مفيش checkAppAccess → أي user معاه token يعمل rule
// دلوقتي بنتحقق إن الشركة مفعل لها الـ order-core app
router.use(checkAppAccess("order-core"));

// CRUD operations
// GET: أي user معاه app access يقدر يشوف الـ rules
router.get("/", orderStatusRuleController.getRules);

// POST/DELETE: مقصورين على الأدوار الإدارية (OWNER/MANAGER/...)
// لإنشاء/حذف rule بيعمل state changes على كل الـ orders
router.post(
  "/",
  verifyToken.requireRole(RULE_ADMIN_ROLES),
  orderStatusRuleController.createRule
);
router.delete(
  "/:id",
  verifyToken.requireRole(RULE_ADMIN_ROLES),
  orderStatusRuleController.deleteRule
);

module.exports = router;
