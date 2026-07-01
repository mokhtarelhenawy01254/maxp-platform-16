const express = require("express");
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const orderStatusRuleController = require("../controller/orderStatusRuleController");

// Ensure token verification on all routes
router.use(verifyToken);

// CRUD operations
router.get("/", orderStatusRuleController.getRules);
router.post("/", orderStatusRuleController.createRule);
router.delete("/:id", orderStatusRuleController.deleteRule);

module.exports = router;
