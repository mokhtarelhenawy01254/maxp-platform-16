const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const fs = require('fs');
const path = require('path');

// Candidate paths for maxp.apk on production or local disk
const APK_CANDIDATE_PATHS = [
  '/var/www/frontend2/dist/download/maxp.apk',
  '/var/www/frontend2/dist/downloads/maxp.apk',
  path.join(__dirname, '../../frontend/public/download/maxp.apk'),
  path.join(__dirname, '../../frontend/dist/download/maxp.apk')
];

function getActualApkStats() {
  for (const apkPath of APK_CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(apkPath)) {
        const stat = fs.statSync(apkPath);
        if (stat.size > 1000000) { // Valid APK > 1MB
          const sizeMB = Math.round(stat.size / (1024 * 1024));
          return {
            fileSizeBytes: stat.size,
            fileSizeFormatted: `${sizeMB} MB`,
            releaseDate: stat.mtime.toISOString().split('T')[0]
          };
        }
      }
    } catch {}
  }
  return null;
}

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
  releaseDate: '2026-10-01',
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
  const dynamicStats = getActualApkStats();

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
          ...(dynamicStats || {}),
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
    ...(dynamicStats || {}),
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
