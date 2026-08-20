/**
 * tiktokMessagingRoutes.js
 *
 * TikTok Business Messaging routes, mounted at /api/v1/tiktok/messaging.
 * - GET/POST /webhook: TikTok Business Messaging webhook (public).
 * - GET/PUT /status: messaging status (authenticated).
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const tiktokMessagingService = require('../services/tiktok/tiktokMessagingService');
const { handleTikTokMessage } = require('../utils/allFunctions');

const LOG_PREFIX = '[TikTok Messaging]';

function getVerifyToken() {
  return (process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN || '').trim();
}

// ΓöÇΓöÇΓöÇ Webhook verification (GET) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === getVerifyToken()) {
    console.log(`Γ£à ${LOG_PREFIX} webhook verified`);
    return res.status(200).send(challenge || 'ok');
  }
  console.warn(`ΓÜá∩╕Å ${LOG_PREFIX} webhook verification failed`);
  return res.sendStatus(403);
});

// ΓöÇΓöÇΓöÇ Incoming messages (POST) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.post('/webhook', async (req, res) => {
  // Always ack quickly so TikTok doesn't retry forever.
  res.status(200).json({ success: true });

  try {
    const body = req.body || {};
    console.log(`${LOG_PREFIX} webhook payload received`, JSON.stringify(body).slice(0, 500));

    const events = Array.isArray(body?.event) ? body.event : [];
    for (const evt of events) {
      const eventType = evt?.event || evt?.type || '';
      if (eventType !== 'MESSAGE') continue;

      const fromOpenId = evt?.from?.open_id || evt?.from?.user?.id || evt?.sender?.open_id || null;
      const message = evt?.message || evt?.content || {};
      const messageId = message?.id || evt?.message_id || `tiktok_msg_${Date.now()}`;
      const text = message?.text || message?.content || (typeof message === 'string' ? message : '');
      const timestamp = evt?.timestamp ? new Date(evt.timestamp) : new Date();

      if (!fromOpenId) {
        console.warn(`ΓÜá∩╕Å ${LOG_PREFIX} message event without sender, skipping`);
        continue;
      }

      // Resolve company from the payload (company_id) or fall back to settings lookup.
      const companyId = evt?.company_id || evt?.to_app?.company_id || evt?.business?.company_id || null;
      if (!companyId) {
        console.warn(`ΓÜá∩╕Å ${LOG_PREFIX} message event without company_id, skipping`);
        continue;
      }

      await handleTikTokMessage({ fromOpenId, messageId, text, timestamp, attachments: null }, companyId);
    }
  } catch (err) {
    console.error(`Γ¥î ${LOG_PREFIX} error processing webhook:`, err.message);
  }
});

// ΓöÇΓöÇΓöÇ Status (authenticated) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
router.get('/status', verifyToken.authenticateToken, async (req, res) => {
  const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
  try {
    const status = await tiktokMessagingService.getStatus(companyId);
    return res.json({ success: true, data: status });
  } catch (err) {
    console.error(`Γ¥î ${LOG_PREFIX} getStatus failed:`, err.message);
    return res.status(500).json({ success: false, error: '┘ü╪┤┘ä ╪¼┘ä╪¿ ╪¡╪º┘ä╪⌐ ╪▒╪│╪º╪ª┘ä TikTok' });
  }
});

router.put('/status', verifyToken.authenticateToken, async (req, res) => {
  const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
  const { enabled } = req.body || {};
  try {
    const status = await tiktokMessagingService.saveStatus(companyId, { enabled });
    return res.json({ success: true, data: status });
  } catch (err) {
    console.error(`Γ¥î ${LOG_PREFIX} saveStatus failed:`, err.message);
    return res.status(500).json({ success: false, error: '┘ü╪┤┘ä ╪¡┘ü╪╕ ╪¡╪º┘ä╪⌐ ╪▒╪│╪º╪ª┘ä TikTok' });
  }
});

module.exports = router;
