const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const BostaService = require('../services/bostaService');

router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    const webhookToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

    const prisma = getSharedPrismaClient();
    let companyId = null;

    if (webhookToken) {
      const company = await safeQuery(() =>
        prisma.company.findFirst({ where: { bostaWebhookToken: webhookToken }, select: { id: true, name: true } })
      , 3);

      if (!company) {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      }
      companyId = company.id;
    }

    res.status(200).json({ success: true, received: true });

    const trackingNumber = webhookData.trackingNumber;
    const status = webhookData.status;

    if (!trackingNumber || !status) {
      console.warn('[BOSTA-WEBHOOK] Missing trackingNumber or status');
      return;
    }

    const bostaService = new BostaService(null, companyId);
    const mappedStatus = bostaService.mapStatus(status);

    const where = { trackingNumber };
    if (companyId) where['companyId'] = companyId;

    const shipment = await safeQuery(() =>
      prisma.shipment.findFirst({ where })
    , 2);

    if (!shipment) {
      console.warn(`[BOSTA-WEBHOOK] Shipment not found for tracking: ${trackingNumber}`);
      return;
    }

    await safeQuery(() =>
      prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: mappedStatus.toUpperCase(),
          metadata: JSON.stringify({
            ...JSON.parse(shipment.metadata || '{}'),
            bostaStatus: status,
            bostaUpdatedAt: new Date().toISOString(),
          }),
        },
      })
    , 2);

    console.log(`[BOSTA-WEBHOOK] Updated shipment ${shipment.id} to ${mappedStatus}`);
  } catch (error) {
    console.error('[BOSTA-WEBHOOK] Error:', error);
  }
});

module.exports = router;
