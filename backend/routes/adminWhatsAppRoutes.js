const express = require("express");

const router = express.Router();
const adminWhatsAppController = require("../controller/adminWhatsAppController");
const verifyToken = require("../utils/verifyToken");

router.get(
  "/overview",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  adminWhatsAppController.getOverview,
);

router.get(
  "/companies",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  adminWhatsAppController.getCompanies,
);

router.get(
  "/companies/:companyId/summary",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  adminWhatsAppController.getCompanySummary,
);

router.get(
  "/logs",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  adminWhatsAppController.getLogs,
);

router.get(
  "/automation-catalog",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  adminWhatsAppController.getAutomationCatalog,
);

module.exports = router;
