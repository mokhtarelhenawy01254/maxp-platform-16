const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const fs = require('fs');
const path = require('path');

function buildApkCandidatePaths(apkFileName = 'maxp.apk') {
  const paths = [];
  if (process.env.MAXP_DOWNLOADS_DIR) {
    paths.push(path.join(process.env.MAXP_DOWNLOADS_DIR, apkFileName));
  }
  paths.push(
    `/var/www/maxp-downloads/${apkFileName}`,
    `/var/www/frontend2/dist/download/${apkFileName}`,
    `/var/www/frontend2/dist/downloads/${apkFileName}`,
    path.join(__dirname, '../../frontend/public/download', apkFileName),
    path.join(__dirname, '../../frontend/public/downloads', apkFileName),
    path.join(__dirname, '../../frontend/dist/download', apkFileName),
    path.join(__dirname, '../../frontend/dist/downloads', apkFileName)
  );
  return paths;
}

function getActualApkStats(apkFileName = 'maxp.apk') {
  const candidates = buildApkCandidatePaths(apkFileName);
  for (const apkPath of candidates) {
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
// CRITICAL: Keep this as the FIRST occurrence of `latestVersion:` and `latestVersionCode:`
// for scripts/verify-android-version-sync.sh compatibility!
const DEFAULT_ANDROID_VERSION_CONFIG = {
  platform: 'android',
  appName: 'MaxP',
  appId: 'online.maxp.app',
  latestVersion: '1.2.1',
  latestVersionCode: 13,
  minRequiredVersion: '1.0.8',
  minRequiredVersionCode: 8,
  forceUpdate: false,
  downloadUrl: 'https://maxp.online/download/maxp.apk',
  directApkUrl: 'https://maxp.online/download/maxp.apk',
  storeUrl: 'https://maxp.online/download/maxp.apk',
  releaseNotesAr: 'تحديث رئيسي: خدمة المكالمات في الخلفية، تحسينات شاملة في الأداء والاستقرار.',
  releaseNotesEn: 'Major update: background telephony service, performance and stability improvements.',
  releaseDate: '2026-10-20',
  fileSizeBytes: 179121520,
  fileSizeFormatted: '171 MB',
  featuresAr: [
    'الاتصال الصادر السحابي بنقرة واحدة عبر هاتف الموظف',
    'توثيق مدة المكالمة الرسمية تلقائياً وربطها بسجل الطلب',
    'نافذة التوثيق السريع وتحديث حالات الطلبات بعد كل مكالمة',
    'مزامنة فورية لحالة اتصال الهاتف بدون استهلاك للبطارية'
  ],
  featuresEn: [
    'Outbound click-to-call via paired employee phone',
    'Official call duration recording and order log linking',
    'Quick disposition modal with one-click order transitions',
    'Real-time socket-aware presence with zero battery drain'
  ]
};

// Catalog defaults for portal / thin-shell Android flavors (kept BELOW DEFAULT_ANDROID_VERSION_CONFIG)
const APP_CATALOG_DEFAULTS = {
  maxp: DEFAULT_ANDROID_VERSION_CONFIG,
  parent: {
    platform: 'android',
    app: 'parent',
    appName: 'بوابة ولي الأمر - MaxP',
    appId: 'online.maxp.parent',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-parent.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-parent.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-parent.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف الموحد لبوابة ولي الأمر والطالب مع إشعارات فورية.',
    releaseNotesEn: 'Lightweight unified Parent & Student portal shell with instant notifications.'
  },
  portal: {
    platform: 'android',
    app: 'portal',
    appName: 'بوابات MaxP',
    appId: 'online.maxp.portal',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'التطبيق الخفيف الموحد لبوابات MaxP مع إشعارات فورية.',
    releaseNotesEn: 'Lightweight unified MaxP Portals shell with instant notifications.'
  },
  courier: {
    platform: 'android',
    app: 'courier',
    appName: 'مندوب ماكس بي',
    appId: 'online.maxp.courier',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-courier.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-courier.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-courier.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف لتطبيق مندوب ماكس بي لمتابعة الشحنات والتحصيلات.',
    releaseNotesEn: 'Lightweight MaxP Courier app for real-time delivery and COD tracking.'
  },
  customer: {
    platform: 'android',
    app: 'customer',
    appName: 'ماكس بي للشحن والعملاء',
    appId: 'online.maxp.customer',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-customer.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-customer.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-customer.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف لتطبيق عملاء الشحن لمتابعة الطلبات والشحنات.',
    releaseNotesEn: 'Lightweight MaxP Customer & Shipping portal app for order and shipment tracking.'
  },
  student: {
    platform: 'android',
    app: 'student',
    appName: 'بوابة الطالب - MaxP',
    appId: 'online.maxp.student',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-parent.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-parent.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-parent.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف لبوابة الطالب والأكاديمية مع إشعارات الدروس الفورية.',
    releaseNotesEn: 'Lightweight Student & Academy portal app with instant course notifications.'
  },
  doctor: {
    platform: 'android',
    app: 'doctor',
    appName: 'بوابة الطبيب - MaxP',
    appId: 'online.maxp.doctor',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف لبوابة الطبيب والعيادات لمتابعة الحجوزات والمواعيد.',
    releaseNotesEn: 'Lightweight Doctor & Clinic portal app for appointments and schedule tracking.'
  },
  patient: {
    platform: 'android',
    app: 'patient',
    appName: 'بوابة المريض - MaxP',
    appId: 'online.maxp.patient',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف لبوابة المرضى لمتابعة الحجوزات والملف الطبي.',
    releaseNotesEn: 'Lightweight Patient portal app for medical appointments and lab results.'
  },
  dental: {
    platform: 'android',
    app: 'dental',
    appName: 'بوابة معامل الأسنان - MaxP',
    appId: 'online.maxp.dental',
    latestVersion: '1.0.0',
    latestVersionCode: 1,
    minRequiredVersion: '1.0.0',
    minRequiredVersionCode: 1,
    forceUpdate: false,
    downloadUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    directApkUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    storeUrl: 'https://maxp.online/downloads/maxp-portal.apk',
    fileSizeBytes: 5242880,
    fileSizeFormatted: '5 MB',
    releaseNotesAr: 'الإصدار الخفيف لمعامل وأطباء الأسنان لمتابعة استلام وتسليم الحالات.',
    releaseNotesEn: 'Lightweight Dental Lab portal app for case receipt and delivery tracking.'
  }
};

const APP_APK_FILENAMES = {
  maxp: 'maxp.apk',
  parent: 'maxp-parent.apk',
  student: 'maxp-parent.apk',
  portal: 'maxp-portal.apk',
  doctor: 'maxp-portal.apk',
  patient: 'maxp-portal.apk',
  dental: 'maxp-portal.apk',
  courier: 'maxp-courier.apk',
  customer: 'maxp-customer.apk'
};

const FLAVOR_SOURCE_FALLBACK = {
  student: 'parent',
  doctor: 'portal',
  patient: 'portal',
  dental: 'portal'
};

function resolveAppFlavorKey(rawApp) {
  const normalized = String(rawApp || '').trim().toLowerCase();
  if (normalized && Object.prototype.hasOwnProperty.call(APP_CATALOG_DEFAULTS, normalized)) {
    return normalized;
  }
  return 'maxp';
}

function readPublishedAndroidMetadata(appKey) {
  const fallbackKey = FLAVOR_SOURCE_FALLBACK[appKey] || null;
  const keysToTry = [appKey];
  if (fallbackKey && !keysToTry.includes(fallbackKey)) {
    keysToTry.push(fallbackKey);
  }

  for (const k of keysToTry) {
    const metadataFileName = k === 'maxp' ? 'latest-android.json' : `latest-android-${k}.json`;
    const candidates = [];
    if (process.env.MAXP_DOWNLOADS_DIR) {
      candidates.push(path.join(process.env.MAXP_DOWNLOADS_DIR, metadataFileName));
    }
    candidates.push(`/var/www/maxp-downloads/${metadataFileName}`);

    for (const metadataPath of candidates) {
      try {
        if (fs.existsSync(metadataPath)) {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`⚠️ [APP-VERSION] Failed to read ${metadataPath}:`, err.message);
      }
    }
  }
  return null;
}

/**
 * Helper to fetch android version config from DB, CI-published JSON metadata, or fallback
 */
async function getAndroidVersionConfig(rawApp) {
  const appKey = resolveAppFlavorKey(rawApp);
  const baseConfig = APP_CATALOG_DEFAULTS[appKey] || DEFAULT_ANDROID_VERSION_CONFIG;
  const apkFileName = APP_APK_FILENAMES[appKey] || 'maxp.apk';
  const dbSettingKey = appKey === 'maxp' ? 'android_app_version' : `android_app_version_${appKey}`;

  const diskMetadata = readPublishedAndroidMetadata(appKey);
  const dynamicStats = getActualApkStats(apkFileName);

  try {
    const prisma = getSharedPrismaClient();
    if (prisma?.systemSettings) {
      const dbSetting = await prisma.systemSettings.findUnique({
        where: { systemName: dbSettingKey }
      });

      if (dbSetting?.config) {
        let parsed = {};
        try {
          parsed = typeof dbSetting.config === 'string' ? JSON.parse(dbSetting.config) : dbSetting.config;
        } catch (e) {
          console.warn('⚠️ [APP-VERSION] Failed to parse config JSON:', e.message);
        }
        return {
          config: {
            ...baseConfig,
            ...(diskMetadata || {}),
            ...parsed,
            ...(dynamicStats || {}),
            isEnabled: dbSetting.isEnabled ?? true,
            updatedAt: dbSetting.updatedAt || new Date().toISOString()
          },
          source: 'db'
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [APP-VERSION] Failed to read from system_settings, using defaults:', err.message);
  }

  return {
    config: {
      ...baseConfig,
      ...(diskMetadata || {}),
      ...(dynamicStats || {}),
      isEnabled: true,
      updatedAt: new Date().toISOString()
    },
    source: 'default'
  };
}

function getRequestedAppFlavor(req) {
  return req.query?.app ?? req.query?.flavor;
}

async function handleAndroidVersionRequest(req, res) {
  const requestedApp = getRequestedAppFlavor(req);
  const appKey = resolveAppFlavorKey(requestedApp);
  try {
    const { config, source } = await getAndroidVersionConfig(appKey);
    return res.status(200).json({
      success: true,
      source,
      data: config
    });
  } catch (error) {
    console.error('❌ [APP-VERSION] Error fetching android version:', error);
    return res.status(200).json({
      success: true,
      source: 'default',
      data: APP_CATALOG_DEFAULTS[appKey] || DEFAULT_ANDROID_VERSION_CONFIG
    });
  }
}

/**
 * GET /api/v1/app/version/android
 * Public endpoint: Checks the latest Android application version and update requirements.
 */
router.get('/android', handleAndroidVersionRequest);

/**
 * GET /api/v1/app/version/latest
 * Public endpoint: Alias supporting ?platform=android&app=<flavor>
 */
router.get('/latest', async (req, res) => {
  const platform = (req.query.platform || 'android').toString().toLowerCase();
  if (platform === 'android') {
    return handleAndroidVersionRequest(req, res);
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

/**
 * GET /api/v1/app/version
 * Query parameter or general query: ?platform=android&app=<flavor>
 */
router.get('/', async (req, res) => {
  const platform = (req.query.platform || 'android').toString().toLowerCase();

  if (platform === 'android') {
    return handleAndroidVersionRequest(req, res);
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

