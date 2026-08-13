/**
 * tiktokEventsController.js
 *
 * Company-scoped CRUD + test + track handlers for TikTok Events (Pixel) configs.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const tiktokEventsManager = require('../services/tiktok/tiktokEventsManager');

const LOG_PREFIX = '[TikTok Events]';

function sanitizePixelConfig(config) {
  if (!config) return config;
  const { accessToken, ...safe } = config;
  return safe;
}

async function listConfigs(req, res) {
  const companyId = req.user?.companyId;
  try {
    const prisma = getSharedPrismaClient();
    const configs = await prisma.tiktokPixelConfig.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: configs.map(sanitizePixelConfig) });
  } catch (error) {
    console.error(LOG_PREFIX, 'listConfigs failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب إعدادات بيكسل TikTok' });
  }
}

async function createConfig(req, res) {
  const companyId = req.user?.companyId;
  const { pixelId, pixelName, accessToken, apiEndpoint, testEventCode, isActive } = req.body || {};

  if (!pixelId || typeof pixelId !== 'string' || !pixelId.trim()) {
    return res.status(400).json({ success: false, error: 'pixelId مطلوب' });
  }

  try {
    const prisma = getSharedPrismaClient();
    const config = await prisma.tiktokPixelConfig.create({
      data: {
        companyId,
        pixelId: pixelId.trim(),
        pixelName: pixelName ? String(pixelName).trim() : null,
        accessToken: accessToken ? String(accessToken) : null,
        apiEndpoint: apiEndpoint ? String(apiEndpoint).trim() : null,
        testEventCode: testEventCode ? String(testEventCode).trim() : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });
    return res.json({ success: true, data: sanitizePixelConfig(config) });
  } catch (error) {
    console.error(LOG_PREFIX, 'createConfig failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء بيكسل TikTok' });
  }
}

async function updateConfig(req, res) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  const body = req.body || {};

  try {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.tiktokPixelConfig.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'إعداد البيكسل غير موجود' });
    }

    const data = {};
    if (body.pixelId !== undefined) data.pixelId = String(body.pixelId).trim();
    if (body.pixelName !== undefined) {
      data.pixelName = body.pixelName ? String(body.pixelName).trim() : null;
    }
    if (body.accessToken !== undefined) {
      data.accessToken = body.accessToken ? String(body.accessToken) : null;
    }
    if (body.apiEndpoint !== undefined) {
      data.apiEndpoint = body.apiEndpoint ? String(body.apiEndpoint).trim() : null;
    }
    if (body.testEventCode !== undefined) {
      data.testEventCode = body.testEventCode ? String(body.testEventCode).trim() : null;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const config = await prisma.tiktokPixelConfig.update({
      where: { id: existing.id },
      data,
    });
    return res.json({ success: true, data: sanitizePixelConfig(config) });
  } catch (error) {
    console.error(LOG_PREFIX, 'updateConfig failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في تحديث بيكسل TikTok' });
  }
}

async function deleteConfig(req, res) {
  const companyId = req.user?.companyId;
  const { id } = req.params;

  try {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.tiktokPixelConfig.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'إعداد البيكسل غير موجود' });
    }

    const config = await prisma.tiktokPixelConfig.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    return res.json({ success: true, data: sanitizePixelConfig(config) });
  } catch (error) {
    console.error(LOG_PREFIX, 'deleteConfig failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في حذف بيكسل TikTok' });
  }
}

async function testConfig(req, res) {
  const companyId = req.user?.companyId;
  const { id } = req.params;

  try {
    const prisma = getSharedPrismaClient();
    const config = await prisma.tiktokPixelConfig.findFirst({
      where: { id, companyId },
    });
    if (!config) {
      return res.status(404).json({ success: false, error: 'إعداد البيكسل غير موجود' });
    }

    const service = tiktokEventsManager.buildService(config);
    const userData = { ip: '127.0.0.1', userAgent: 'MaxP Test' };
    const payload = service.buildPayload('PageView', userData, { test: true }, `test-${Date.now()}`);
    const result = await service.sendEvent(payload);

    const updated = await prisma.tiktokPixelConfig.update({
      where: { id: config.id },
      data: { lastTestAt: new Date() },
    });

    return res.json({ success: true, data: { result, config: sanitizePixelConfig(updated) } });
  } catch (error) {
    console.error(LOG_PREFIX, 'testConfig failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في اختبار بيكسل TikTok' });
  }
}

async function trackEvent(req, res) {
  const companyId = req.user?.companyId;
  const { eventName, userData, properties, eventId } = req.body || {};

  if (!eventName || typeof eventName !== 'string' || !eventName.trim()) {
    return res.status(400).json({ success: false, error: 'eventName مطلوب' });
  }

  try {
    const result = await tiktokEventsManager.sendEvent(
      companyId,
      eventName.trim(),
      userData,
      properties,
      eventId,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error(LOG_PREFIX, 'trackEvent failed:', error);
    return res.status(500).json({ success: false, error: 'فشل في إرسال حدث TikTok' });
  }
}

module.exports = {
  listConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  testConfig,
  trackEvent,
};
