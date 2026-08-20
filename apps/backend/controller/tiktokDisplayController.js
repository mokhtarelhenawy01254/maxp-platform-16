/**
 * tiktokDisplayController.js
 * HTTP handlers for the TikTok Embed + Display API.
 * Mounted behind verifyToken.authenticateToken.
 */

const tiktokDisplayService = require('../services/tiktok/tiktokDisplayService');
const { getAccount } = require('../services/tiktok/tiktokOAuthService');

const resolveCompanyId = (req) => req.user?.companyId || null;

const listVideos = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company context is required' });
    }

    const cursor =
      typeof req.query.cursor === 'string' && req.query.cursor.trim()
        ? req.query.cursor.trim()
        : null;

    const result = await tiktokDisplayService.getAccountVideos({ companyId, cursor });
    return res.json({
      success: true,
      data: {
        videos: result.videos,
        cursor: result.cursor,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    if (error?.code === 'NO_ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_ACCOUNT', message: error.message },
      });
    }
    console.error('❌ [TIKTOK-DISPLAY] Failed to list videos:', error?.response?.data || error);
    return res.status(502).json({
      success: false,
      error: {
        code: error?.code || 'TIKTOK_ERROR',
        message: error?.message || 'فشل جلب فيديوهات TikTok',
      },
    });
  }
};

const getEmbedInfo = async (req, res) => {
  try {
    const videoId = String(req.params.videoId || '');
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VIDEO_ID_REQUIRED', message: 'معرف الفيديو مطلوب' },
      });
    }
    const encodedId = encodeURIComponent(videoId);
    return res.json({
      success: true,
      data: {
        videoId,
        embedUrl: tiktokDisplayService.buildEmbedUrl(encodedId),
      },
    });
  } catch (error) {
    console.error('❌ [TIKTOK-DISPLAY] Failed to build embed url:', error);
    return res.status(500).json({ success: false, error: error?.message || 'فشل إنشاء مشغل الفيديو' });
  }
};

const getSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company context is required' });
    }

    const settings = await tiktokDisplayService.getSettings(companyId);
    return res.json({
      success: true,
      data: {
        storefrontUsername: settings?.storefrontUsername || null,
        storefrontEnabled: settings ? Boolean(settings.storefrontEnabled) : false,
      },
    });
  } catch (error) {
    console.error('❌ [TIKTOK-DISPLAY] Failed to load settings:', error);
    return res.status(500).json({ success: false, error: error?.message || 'فشل تحميل الإعدادات' });
  }
};

const saveSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company context is required' });
    }

    const body = req.body || {};
    const saved = await tiktokDisplayService.saveSettings(companyId, {
      storefrontUsername: body.storefrontUsername,
      storefrontEnabled: body.storefrontEnabled,
    });

    return res.json({
      success: true,
      data: {
        storefrontUsername: saved?.storefrontUsername || null,
        storefrontEnabled: Boolean(saved?.storefrontEnabled),
      },
    });
  } catch (error) {
    console.error('❌ [TIKTOK-DISPLAY] Failed to save settings:', error);
    return res.status(500).json({ success: false, error: error?.message || 'فشل حفظ الإعدادات' });
  }
};

const getAccountInfo = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company context is required' });
    }

    const account = await getAccount(companyId);
    if (!account) {
      return res.json({ success: true, data: { connected: false } });
    }

    const info = await tiktokDisplayService.getAccountInfo({ companyId });
    return res.json({ success: true, data: { connected: true, ...info } });
  } catch (error) {
    if (error?.code === 'NO_ACCOUNT') {
      return res.json({ success: true, data: { connected: false } });
    }
    console.error('❌ [TIKTOK-DISPLAY] Failed to load account info:', error?.response?.data || error);
    return res.status(502).json({
      success: false,
      error: {
        code: error?.code || 'TIKTOK_ERROR',
        message: error?.message || 'فشل جلب بيانات حساب TikTok',
      },
    });
  }
};

module.exports = {
  listVideos,
  getEmbedInfo,
  getSettings,
  saveSettings,
  getAccountInfo,
};
