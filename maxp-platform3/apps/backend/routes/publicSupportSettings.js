const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { getSharedPrismaClient } = require("../services/sharedDatabase");
    const prisma = getSharedPrismaClient();
    const settings = await prisma.systemSettings.findUnique({
      where: { systemName: "support_whatsapp" },
    });
    const config = settings?.config ? JSON.parse(settings.config) : {};
    return res.json({ success: true, data: { phone: config.phone || "" } });
  } catch (error) {
    return res.json({ success: true, data: { phone: "" } });
  }
});

module.exports = router;
