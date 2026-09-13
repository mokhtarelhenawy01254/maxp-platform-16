const express = require("express");
const router = express.Router();
const aiImageController = require("../controller/aiImageController");
const { authenticateToken } = require("../utils/verifyToken");

router.post("/generate", authenticateToken, aiImageController.generateImage);
router.post("/chat", authenticateToken, aiImageController.chatWithCreativeDirector);
router.post("/caption", authenticateToken, aiImageController.generateCaption);
router.get("/history", authenticateToken, aiImageController.getHistory);
router.delete("/:filename", authenticateToken, aiImageController.deleteImage);
router.get("/models", authenticateToken, aiImageController.getModels);
router.get("/model-config", authenticateToken, aiImageController.getModelConfig);
router.put("/model-config", authenticateToken, aiImageController.saveModelConfig);
router.get("/tier-config", authenticateToken, aiImageController.getTierConfig);

module.exports = router;
