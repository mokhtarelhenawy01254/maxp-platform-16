const express = require("express");
const router = express.Router();
const membershipController = require("../controller/membershipController");

// POST /api/membership/register
router.post("/register", membershipController.registerMember);

module.exports = router;
