/**
 * Turbo Webhook Routes
 * استقبال تحديثات من Turbo
 */

const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { syncTurboStatusToOrder } = require('../services/turboStatusSyncService');

/**
 * POST /api/turbo/webhook
 * استقبال webhooks من Turbo
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const authHeader = req.headers.authorization || req.headers['authorization'] || req.headers['Authorization'];
    const webhookToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;
    
    console.log('📨 [TURBO-WEBHOOK] Received webhook:', JSON.stringify(webhookData, null, 2));
    console.log('🔑 [TURBO-WEBHOOK] Webhook token:', webhookToken ? `Token: ${webhookToken.substring(0, 4)}...` : 'No token');

    // التحقق من TOKEN إذا كان موجوداً
    const prisma = getSharedPrismaClient();
    let companyId = null;
    
    if (webhookToken) {
      console.log('🔍 [TURBO-WEBHOOK] Validating webhook token...');
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
        console.log(`✅ [TURBO-WEBHOOK] Token validated. Company: ${company.name} (${companyId})`);
      } else {
        console.warn(`⚠️ [TURBO-WEBHOOK] Token ${webhookToken} not directly matched to company, will search order globally`);
      }
    } else {
      console.log('ℹ️ [TURBO-WEBHOOK] No token provided, will search in all companies');
    }

    // الرد فوراً لـ Turbo (يجب أن يكون خلال 5 ثوان)
    res.status(200).json({ success: true, received: true });

    const orderNumber = (webhookData.remote_order_id && webhookData.remote_order_id !== '0' && webhookData.remote_order_id !== 0)
      ? webhookData.remote_order_id
      : webhookData.order_number;
    const turboOrderNumber = webhookData.order_number;
    const statusCode = webhookData.status;

    if (!orderNumber && !turboOrderNumber) {
      console.warn('⚠️ [TURBO-WEBHOOK] Missing order_number and remote_order_id in webhook');
      return;
    }

    const searchOrderNumber = orderNumber || turboOrderNumber;

    console.log(`📦 [TURBO-WEBHOOK] Processing webhook for order: ${searchOrderNumber}, Turbo order: ${turboOrderNumber}, Status: ${statusCode}`);

    // البحث والتحديث باستخدام الخدمة الموحدة syncTurboStatusToOrder
    const result = await syncTurboStatusToOrder({
      orderId: searchOrderNumber,
      orderNumber: searchOrderNumber,
      companyId: companyId,
      rawStatus: statusCode,
      payload: { ...webhookData, isWebhook: true, source: 'webhook' },
      isGuestOrder: false
    });

    if (result.success) {
      console.log(`✅ [TURBO-WEBHOOK] Successfully synced order ${searchOrderNumber}`);
    } else {
      console.warn(`⚠️ [TURBO-WEBHOOK] Could not find order to sync: ${searchOrderNumber}`);
    }

  } catch (error) {
    console.error('❌ [TURBO-WEBHOOK] Error processing webhook:', error);
  }
});

/**
 * GET /api/turbo/webhook/verify
 * التحقق من webhook (لـ Turbo verification)
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
