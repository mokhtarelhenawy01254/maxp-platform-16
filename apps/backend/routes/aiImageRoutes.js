const express = require("express");
const router = express.Router();
const aiImageController = require("../controller/aiImageController");
const { authenticateToken } = require("../utils/verifyToken");

router.post("/generate", authenticateToken, aiImageController.generateImage);
router.get("/models", authenticateToken, aiImageController.getModels);
router.get("/model-config", authenticateToken, aiImageController.getModelConfig);

module.exports = router;
