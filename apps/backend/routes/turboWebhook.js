/**
 * Turbo Webhook Routes
 * استقبال تحديثات من Turbo
 */

const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { addTurboWebhook } = require('../services/turboWebhookQueue');

/**
 * POST /api/turbo/webhook
 * استقبال webhooks من Turbo
 */
router.post(['/webhook', '/'], async (req, res) => {
  try {
    const webhookData = req.body;
    const authHeader = req.headers.authorization || req.headers['authorization'] || req.headers['Authorization'] || req.headers['x-webhook-token'];
    const webhookToken = authHeader
      ? authHeader.replace(/^Bearer\s+/i, '').trim()
      : (req.query.token || req.query.secret || null);
    
    console.log('📨 [TURBO-WEBHOOK] Received webhook:', JSON.stringify(webhookData, null, 2));
    console.log('🔑 [TURBO-WEBHOOK] Webhook token:', webhookToken ? `Token: ${webhookToken.substring(0, 4)}...` : 'No token');

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

    // التحقق من TOKEN وتحديد companyId
    const prisma = getSharedPrismaClient();
    let companyId = null;

    // 🎯 Resolve companyId directly from the matched Order / GuestOrder first.
    // This is critical when multiple tenants share a single Turbo account / token
    // (e.g. Flora and Swan), preventing findFirst from misrouting all webhooks to one tenant.
    const lookupCandidates = [
      webhookData.remote_order_id,
      webhookData.order_number,
      webhookData.bar_code
    ].filter(v => v !== null && v !== undefined && v !== '' && v !== '0' && v !== 0 && v !== 'undefined');

    let matchedOrder = null;
    if (lookupCandidates.length > 0) {
      const orClauses = lookupCandidates.flatMap(val => [
        { orderNumber: String(val) },
        { turboTrackingNumber: String(val) },
        { turboShipmentId: String(val) },
        { id: String(val) }
      ]);
      matchedOrder = await safeQuery(() => prisma.order.findFirst({
        where: { OR: orClauses },
        select: { id: true, companyId: true }
      }), 3);

      if (!matchedOrder) {
        matchedOrder = await safeQuery(() => prisma.guestOrder.findFirst({
          where: { OR: orClauses },
          select: { id: true, companyId: true }
        }), 3);
      }
    }

    if (matchedOrder?.companyId) {
      companyId = matchedOrder.companyId;
      console.log(`✅ [TURBO-WEBHOOK] Company resolved directly from order: ${companyId}`);
    } else if (webhookToken) {
      console.log('🔍 [TURBO-WEBHOOK] Validating webhook token fallback...');
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
      console.log('ℹ️ [TURBO-WEBHOOK] No token provided with webhook');
    }

    // Security Gate: Reject untrusted payloads that match neither an existing tenant order nor a valid company token
    if (!matchedOrder && !companyId) {
      console.warn(`🔒 [TURBO-WEBHOOK] Dropping untrusted webhook for order "${searchOrderNumber}": no matching order and no valid tenant token.`);
      return;
    }

    console.log(`📦 [TURBO-WEBHOOK] Processing webhook for order: ${searchOrderNumber}, Turbo order: ${turboOrderNumber}, Status: ${statusCode}`);

    // إضافة الـ webhook إلى Queue مع Retry (يحاول 3 مرات لو فشل)
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
      console.log(`✅ [TURBO-WEBHOOK] Queued job ${job.id} for order ${searchOrderNumber}`);
    } else {
      console.warn(`⚠️ [TURBO-WEBHOOK] Queue not available, processing synchronously`);
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
        console.log(`✅ [TURBO-WEBHOOK] Successfully synced order ${searchOrderNumber}`);
      } else {
        console.warn(`⚠️ [TURBO-WEBHOOK] Could not find order to sync: ${searchOrderNumber}`);
      }
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
