const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Default fallback configuration for Android application
const DEFAULT_ANDROID_VERSION_CONFIG = {
  platform: 'android',
  appName: 'MaxP',
  appId: 'online.maxp.app',
  latestVersion: '1.0.8',
  latestVersionCode: 8,
  minRequiredVersion: '1.0.7',
  minRequiredVersionCode: 7,
  forceUpdate: false,
  downloadUrl: 'https://maxp.online/download/maxp.apk',
  directApkUrl: 'https://maxp.online/download/maxp.apk',
  storeUrl: 'https://maxp.online/download/maxp.apk',
  releaseNotesAr: 'تحسينات شاملة في الأداء وسرعة الاستجابة، وإصلاح مشكلات المزامنة مع تحسين تجربة المستخدم على الهواتف الذكية.',
  releaseNotesEn: 'Performance improvements, enhanced sync stability, and optimized mobile experience.',
  releaseDate: '2026-09-23',
  fileSizeBytes: 44040192,
  fileSizeFormatted: '42 MB',
  featuresAr: [
    'تسريع فتح الصفحات والمزامنة الفورية',
    'إصلاحات لاستقرار التنبيهات وإشعارات الدفع',
    'تحسين تجربة التصفح والطباعة المحمولة'
  ],
  featuresEn: [
    'Faster load times and real-time synchronization',
    'Push notifications and background sync stability fixes',
    'Optimized mobile navigation and portable receipt printing'
  ]
};

/**
 * Helper to fetch android version config from DB or fallback
 */
async function getAndroidVersionConfig() {
  try {
    const prisma = getSharedPrismaClient();
    if (prisma?.systemSettings) {
      const dbSetting = await prisma.systemSettings.findUnique({
        where: { systemName: 'android_app_version' }
      });

      if (dbSetting?.config) {
        const parsed = JSON.parse(dbSetting.config);
        return {
          ...DEFAULT_ANDROID_VERSION_CONFIG,
          ...parsed,
          isEnabled: dbSetting.isEnabled ?? true,
          updatedAt: dbSetting.updatedAt || new Date().toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [APP-VERSION] Failed to read from system_settings, using defaults:', err.message);
  }

  return {
    ...DEFAULT_ANDROID_VERSION_CONFIG,
    isEnabled: true,
    updatedAt: new Date().toISOString()
  };
}

/**
 * GET /api/v1/app/version/android
 * Public endpoint: Checks the latest Android application version and update requirements.
 */
router.get('/android', async (req, res) => {
  try {
    const config = await getAndroidVersionConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ [APP-VERSION] Error fetching android version:', error);
    return res.status(200).json({
      success: true,
      data: DEFAULT_ANDROID_VERSION_CONFIG
    });
  }
});

/**
 * GET /api/v1/app/version
 * Query parameter or general query: ?platform=android
 */
router.get('/', async (req, res) => {
  const platform = (req.query.platform || 'android').toString().toLowerCase();

  if (platform === 'android') {
    const config = await getAndroidVersionConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  }

  return res.status(200).json({
    success: true,
    platform,
    message: `No specific configuration found for platform ${platform}`,
    data: {
      platform,
      latestVersion: '1.0.0',
      minRequiredVersion: '1.0.0',
      forceUpdate: false
    }
  });
});

module.exports = router;
