/**
 * tiktokEventsManager.js
 *
 * Orchestrates TikTok Events API (Pixel) tracking for a company.
 * Used both by admin endpoints and by internal order flows (best effort,
 * never throws).
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

const LOG_PREFIX = '[TikTok Events Manager]';

async function getActiveConfig(companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.tikTokPixelConfig.findFirst({
    where: { companyId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
}

function buildService(config) {
  // Lazily require the low-level service to avoid startup coupling.
  const TikTokEventsService = require('../tiktokEventsService');
  return new TikTokEventsService(
    config.pixelId,
    config.accessToken,
    config.testEventCode,
    config.apiEndpoint || process.env.TIKTOK_EVENTS_API_ENDPOINT || null,
  );
}

function buildEnvFallbackService() {
  const endpoint = process.env.TIKTOK_EVENTS_API_ENDPOINT;
  const accessToken = process.env.TIKTOK_EVENTS_ACCESS_TOKEN;
  if (!endpoint || !accessToken) return null;
  return buildService({
    pixelId: process.env.TIKTOK_EVENTS_PIXEL_ID || '',
    accessToken,
    testEventCode: process.env.TIKTOK_EVENTS_TEST_EVENT_CODE || null,
    apiEndpoint: endpoint,
  });
}

async function resolveService(companyId) {
  try {
    const config = await getActiveConfig(companyId);
    if (config) return buildService(config);
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed loading active config, falling back to env:', error.message);
  }
  return buildEnvFallbackService();
}

async function sendEvent(companyId, eventName, userData, properties, eventId) {
  let service = null;
  try {
    service = await resolveService(companyId);
  } catch (error) {
    console.error(LOG_PREFIX, 'Failed resolving service:', error.message);
    return { success: false, error: error.message };
  }

  if (!service) {
    console.warn(LOG_PREFIX, `No config or env fallback for company ${companyId}. Skipping.`);
    return { success: false, skipped: true, reason: 'no_config' };
  }

  try {
    const payload = service.buildPayload(eventName, userData || {}, properties || {}, eventId);
    return await service.sendEvent(payload);
  } catch (error) {
    console.error(LOG_PREFIX, `sendEvent(${eventName}) failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function trackPurchaseForCompany(companyId, userData, order, eventId) {
  try {
    const config = await getActiveConfig(companyId);
    if (!config) {
      return { success: false, skipped: true, reason: 'no_config' };
    }
    if (config.trackPurchase === false) {
      return { success: false, skipped: true, reason: 'track_purchase_disabled' };
    }
    const service = buildService(config);
    return await service.trackPurchase(userData, order, eventId);
  } catch (error) {
    console.error(LOG_PREFIX, 'trackPurchaseForCompany failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function trackPageViewForCompany(companyId, userData, eventId) {
  try {
    const config = await getActiveConfig(companyId);
    if (!config) {
      return { success: false, skipped: true, reason: 'no_config' };
    }
    if (config.trackPageView === false) {
      return { success: false, skipped: true, reason: 'track_page_view_disabled' };
    }
    const service = buildService(config);
    const payload = service.buildPayload('PageView', userData || {}, {}, eventId);
    return await service.sendEvent(payload);
  } catch (error) {
    console.error(LOG_PREFIX, 'trackPageViewForCompany failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getActiveConfig,
  buildService,
  sendEvent,
  trackPurchaseForCompany,
  trackPageViewForCompany,
};
