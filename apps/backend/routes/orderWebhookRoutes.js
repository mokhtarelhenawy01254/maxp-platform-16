const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderWebhookService = require('../services/orderWebhookService');

// Apply authentication to all webhook management endpoints
router.use(verifyToken.authenticateToken);

const getEffectiveCompanyId = (req) => {
  return req.user?.effectiveCompanyId || req.user?.companyId;
};

// ── GET /api/v1/order-webhooks ──────────────────────────────────────────
// List all webhook configurations for the current company
router.get('/', async (req, res) => {
  try {
    const companyId = getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    await orderWebhookService.ensureTablesExist();
    const prisma = getSharedPrismaClient();

    let webhooks = [];
    try {
      webhooks = await prisma.orderWebhookConfig.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (_) {
      webhooks = await prisma.$queryRawUnsafe(`
        SELECT * FROM "order_webhook_configs"
        WHERE "companyId" = $1
        ORDER BY "createdAt" DESC
      `, companyId);
    }

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('❌ [ORDER-WEBHOOK-ROUTES] GET / error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/v1/order-webhooks/generate-secret ────────────────────────
// Generate a new secure secret
router.post('/generate-secret', (req, res) => {
  try {
    const secret = orderWebhookService.generateSecret();
    res.json({ success: true, data: { secret } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/v1/order-webhooks ─────────────────────────────────────────
// Create a new webhook configuration
router.post('/', async (req, res) => {
  try {
    const companyId = getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    const { url, secret, name, events, isActive } = req.body;

    if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'رابط الويب هوك غير صالح، يجب أن يبدأ بـ http:// أو https://'
      });
    }

    const finalSecret = (secret && typeof secret === 'string' && secret.trim())
      ? secret.trim()
      : orderWebhookService.generateSecret();

    await orderWebhookService.ensureTablesExist();
    const prisma = getSharedPrismaClient();

    const webhookId = 'whk_' + crypto.randomBytes(12).toString('hex');
    const webhookName = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Webhook Endpoint';
    const webhookEvents = (events && typeof events === 'string' && events.trim()) ? events.trim() : 'order.created';
    const webhookIsActive = isActive !== undefined ? Boolean(isActive) : true;

    let createdWebhook = null;
    try {
      createdWebhook = await prisma.orderWebhookConfig.create({
        data: {
          id: webhookId,
          companyId,
          name: webhookName,
          url: url.trim(),
          secret: finalSecret,
          events: webhookEvents,
          isActive: webhookIsActive,
        },
      });
    } catch (_) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "order_webhook_configs"
        ("id", "companyId", "name", "url", "secret", "events", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, webhookId, companyId, webhookName, url.trim(), finalSecret, webhookEvents, webhookIsActive);

      const rows = await prisma.$queryRawUnsafe(`
        SELECT * FROM "order_webhook_configs" WHERE "id" = $1 LIMIT 1
      `, webhookId);
      createdWebhook = rows[0];
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة الويب هوك بنجاح',
      data: createdWebhook,
    });
  } catch (error) {
    console.error('❌ [ORDER-WEBHOOK-ROUTES] POST / error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PUT /api/v1/order-webhooks/:id ──────────────────────────────────────
// Update an existing webhook configuration
router.put('/:id', async (req, res) => {
  try {
    const companyId = getEffectiveCompanyId(req);
    const { id } = req.params;
    const { url, secret, name, events, isActive } = req.body;

    if (url && (!url.trim().startsWith('http://') && !url.trim().startsWith('https://'))) {
      return res.status(400).json({
        success: false,
        error: 'رابط الويب هوك غير صالح، يجب أن يبدأ بـ http:// أو https://'
      });
    }

    await orderWebhookService.ensureTablesExist();
    const prisma = getSharedPrismaClient();

    let updatedWebhook = null;
    try {
      updatedWebhook = await prisma.orderWebhookConfig.update({
        where: { id, companyId },
        data: {
          ...(url && { url: url.trim() }),
          ...(secret !== undefined && { secret: secret.trim() }),
          ...(name !== undefined && { name: name.trim() }),
          ...(events !== undefined && { events: events.trim() }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });
    } catch (_) {
      const updates = [];
      const values = [id, companyId];
      let pIdx = 3;

      if (url) { updates.push(`"url" = $${pIdx++}`); values.push(url.trim()); }
      if (secret !== undefined) { updates.push(`"secret" = $${pIdx++}`); values.push(secret.trim()); }
      if (name !== undefined) { updates.push(`"name" = $${pIdx++}`); values.push(name.trim()); }
      if (events !== undefined) { updates.push(`"events" = $${pIdx++}`); values.push(events.trim()); }
      if (isActive !== undefined) { updates.push(`"isActive" = $${pIdx++}`); values.push(Boolean(isActive)); }
      updates.push(`"updatedAt" = NOW()`);

      await prisma.$executeRawUnsafe(`
        UPDATE "order_webhook_configs"
        SET ${updates.join(', ')}
        WHERE "id" = $1 AND "companyId" = $2
      `, ...values);

      const rows = await prisma.$queryRawUnsafe(`
        SELECT * FROM "order_webhook_configs" WHERE "id" = $1 LIMIT 1
      `, id);
      updatedWebhook = rows[0];
    }

    res.json({
      success: true,
      message: 'تم تحديث الويب هوك بنجاح',
      data: updatedWebhook,
    });
  } catch (error) {
    console.error('❌ [ORDER-WEBHOOK-ROUTES] PUT /:id error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE /api/v1/order-webhooks/:id ───────────────────────────────────
// Delete a webhook configuration
router.delete('/:id', async (req, res) => {
  try {
    const companyId = getEffectiveCompanyId(req);
    const { id } = req.params;

    await orderWebhookService.ensureTablesExist();
    const prisma = getSharedPrismaClient();

    try {
      await prisma.orderWebhookConfig.deleteMany({
        where: { id, companyId },
      });
    } catch (_) {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "order_webhook_logs" WHERE "webhookId" = $1
      `, id);
      await prisma.$executeRawUnsafe(`
        DELETE FROM "order_webhook_configs" WHERE "id" = $1 AND "companyId" = $2
      `, id, companyId);
    }

    res.json({
      success: true,
      message: 'تم حذف الويب هوك بنجاح',
    });
  } catch (error) {
    console.error('❌ [ORDER-WEBHOOK-ROUTES] DELETE /:id error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/v1/order-webhooks/:id/test ────────────────────────────────
// Send a test ping payload to verify webhook endpoint and signature
router.post('/:id/test', async (req, res) => {
  try {
    const companyId = getEffectiveCompanyId(req);
    const { id } = req.params;

    const result = await orderWebhookService.testWebhook(id, companyId);

    res.json({
      success: true,
      message: result.isSuccess ? 'تم اختبار الويب هوك واستلام الرد بنجاح' : 'تم إرسال الطلب ولكن حدث خطأ في الرد',
      data: result,
    });
  } catch (error) {
    console.error('❌ [ORDER-WEBHOOK-ROUTES] POST /:id/test error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── GET /api/v1/order-webhooks/:id/logs ─────────────────────────────────
// Get recent delivery logs for a specific webhook
router.get('/:id/logs', async (req, res) => {
  try {
    const companyId = getEffectiveCompanyId(req);
    const { id } = req.params;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);

    await orderWebhookService.ensureTablesExist();
    const prisma = getSharedPrismaClient();

    let logs = [];
    try {
      logs = await prisma.orderWebhookLog.findMany({
        where: { webhookId: id, companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (_) {
      logs = await prisma.$queryRawUnsafe(`
        SELECT * FROM "order_webhook_logs"
        WHERE "webhookId" = $1 AND "companyId" = $2
        ORDER BY "createdAt" DESC
        LIMIT $3
      `, id, companyId, limit);
    }

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('❌ [ORDER-WEBHOOK-ROUTES] GET /:id/logs error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
