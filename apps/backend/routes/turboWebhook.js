/**
 * Turbo Webhook Routes
 * ╪º╪│╪¬┘é╪¿╪º┘ä ╪¬╪¡╪»┘è╪½╪º╪¬ ┘à┘å Turbo
 */

const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { addTurboWebhook } = require('../services/turboWebhookQueue');

/**
 * POST /api/turbo/webhook
 * ╪º╪│╪¬┘é╪¿╪º┘ä webhooks ┘à┘å Turbo
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const authHeader = req.headers.authorization || req.headers['authorization'] || req.headers['Authorization'];
    const webhookToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;
    
    console.log('≡ƒô¿ [TURBO-WEBHOOK] Received webhook:', JSON.stringify(webhookData, null, 2));
    console.log('≡ƒöæ [TURBO-WEBHOOK] Webhook token:', webhookToken ? `Token: ${webhookToken.substring(0, 4)}...` : 'No token');

    // ╪º┘ä╪¬╪¡┘é┘é ┘à┘å TOKEN ╪Ñ╪░╪º ┘â╪º┘å ┘à┘ê╪¼┘ê╪»╪º┘ï
    const prisma = getSharedPrismaClient();
    let companyId = null;
    
    if (webhookToken) {
      console.log('≡ƒöì [TURBO-WEBHOOK] Validating webhook token...');
      const company = await safeQuery(async () => {
        return await prisma.company.findFirst({
          where: {
            OR: [
              { turboWebhookToken: webhookToken },
              { turboApiKey: webhookToken }
            ]
          },
          select: {
            id: true,
            name: true
          }
        });
      }, 3);

      if (company) {
        companyId = company.id;
        console.log(`Γ£à [TURBO-WEBHOOK] Token validated. Company: ${company.name} (${companyId})`);
      } else {
        console.warn(`ΓÜá∩╕Å [TURBO-WEBHOOK] Token ${webhookToken} not directly matched to company, will search order globally`);
      }
    } else {
      console.log('Γä╣∩╕Å [TURBO-WEBHOOK] No token provided, will search in all companies');
    }

    // ╪º┘ä╪▒╪» ┘ü┘ê╪▒╪º┘ï ┘ä┘Ç Turbo (┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ╪«┘ä╪º┘ä 5 ╪½┘ê╪º┘å)
    res.status(200).json({ success: true, received: true });

    const orderNumber = (webhookData.remote_order_id && webhookData.remote_order_id !== '0' && webhookData.remote_order_id !== 0)
      ? webhookData.remote_order_id
      : webhookData.order_number;
    const turboOrderNumber = webhookData.order_number;
    const statusCode = webhookData.status;

    if (!orderNumber && !turboOrderNumber) {
      console.warn('ΓÜá∩╕Å [TURBO-WEBHOOK] Missing order_number and remote_order_id in webhook');
      return;
    }

    const searchOrderNumber = orderNumber || turboOrderNumber;

    console.log(`≡ƒôª [TURBO-WEBHOOK] Processing webhook for order: ${searchOrderNumber}, Turbo order: ${turboOrderNumber}, Status: ${statusCode}`);

    // ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘Ç webhook ╪Ñ┘ä┘ë Queue ┘à╪╣ Retry (┘è╪¡╪º┘ê┘ä 3 ┘à╪▒╪º╪¬ ┘ä┘ê ┘ü╪┤┘ä)
    const job = await addTurboWebhook({
      orderId: searchOrderNumber,
      orderNumber: searchOrderNumber,
      companyId: companyId,
      turboShipmentId: turboOrderNumber,
      rawStatus: statusCode,
      payload: { ...webhookData, isWebhook: true, source: 'webhook' },
      isGuestOrder: false
    });

    if (job) {
      console.log(`Γ£à [TURBO-WEBHOOK] Queued job ${job.id} for order ${searchOrderNumber}`);
    } else {
      console.warn(`ΓÜá∩╕Å [TURBO-WEBHOOK] Queue not available, processing synchronously`);
      const { syncTurboStatusToOrder } = require('../services/turboStatusSyncService');
      const result = await syncTurboStatusToOrder({
        orderId: searchOrderNumber,
        orderNumber: searchOrderNumber,
        companyId: companyId,
        rawStatus: statusCode,
        payload: { ...webhookData, isWebhook: true, source: 'webhook' },
        isGuestOrder: false
      });
      if (result.success) {
        console.log(`Γ£à [TURBO-WEBHOOK] Successfully synced order ${searchOrderNumber}`);
      } else {
        console.warn(`ΓÜá∩╕Å [TURBO-WEBHOOK] Could not find order to sync: ${searchOrderNumber}`);
      }
    }

  } catch (error) {
    console.error('Γ¥î [TURBO-WEBHOOK] Error processing webhook:', error);
  }
});

/**
 * GET /api/turbo/webhook/verify
 * ╪º┘ä╪¬╪¡┘é┘é ┘à┘å webhook (┘ä┘Ç Turbo verification)
 */
router.get('/webhook/verify', (req, res) => {
  const challenge = req.query.challenge;

  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(200).json({ verified: true });
  }
});

module.exports = router;
