const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');
const aiSdkClient = require('../services/aiSdkClient');

/**
 * Public Widget Chat Routes
 * No authentication required - for guest website visitors.
 * Company isolation through subdomain middleware (store.slug.DOMAIN or custom domain).
 */

// The widget script lives here (tracked) instead of backend/public (git-ignored).
const WIDGET_SCRIPT_PATH = path.join(__dirname, '..', 'utils', 'widgetScript.js');
let widgetScriptCache = null;

function loadWidgetScript() {
  if (widgetScriptCache !== null) return widgetScriptCache;
  try {
    widgetScriptCache = fs.readFileSync(WIDGET_SCRIPT_PATH, 'utf8');
  } catch (error) {
    console.error('❌ [PUBLIC-WIDGET-CHAT] cannot read widget script:', error.message);
    widgetScriptCache = '';
  }
  return widgetScriptCache;
}

router.use((req, res, next) => {
  console.log(`🌐 [PUBLIC-WIDGET-CHAT] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /script.js — serve the embeddable widget script.
 */
router.get('/script.js', (req, res) => {
  const script = loadWidgetScript();
  if (!script) return res.status(500).json({ success: false, error: 'widget script unavailable' });
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(script);
});

router.use(extractSubdomainMiddleware);
router.use(requireCompany);

const widgetChatLimiter = createRateLimiter({
  customKey: (req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.ip
      || 'unknown';
    return `widget_chat_${req.company?.id || 'none'}_${ip}`;
  },
});

/**
 * POST /chat — send a guest chat message to the company's AI agent.
 * Body: { message: string, visitorId?: string, threadId?: string }
 * Uses channel 'web_chat' so routing/admin can target it like other channels.
 * The visitorId (minted client-side and persisted in localStorage) becomes the
 * stable customer id so each visitor keeps ONE conversation thread.
 */
router.post('/chat', widgetChatLimiter, async (req, res) => {
  try {
    const { message, threadId } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ success: false, error: 'message too long' });
    }

    const companyId = req.company.id;
    const visitorId = req.body?.visitorId
      ? String(req.body.visitorId).slice(0, 120)
      : `widget_guest_${randomUUID()}`;
    // Keep backwards-compat with any client sending customerId.
    const customerId = req.body?.customerId
      ? String(req.body.customerId).slice(0, 120)
      : visitorId;

    const result = await aiSdkClient.sendChatMessage({
      companyId,
      customerId,
      message,
      threadId: threadId || null,
      channel: 'web_chat',
    });

    return res.json({
      success: true,
      reply: result.reply || '',
      threadId: result.threadId || threadId || null,
      visitorId,
      status: result.status || 'ok',
    });
  } catch (error) {
    console.error('❌ [PUBLIC-WIDGET-CHAT] error:', error.message);
    return res.status(500).json({ success: false, error: 'فشل في معالجة الرسالة' });
  }
});

module.exports = router;
