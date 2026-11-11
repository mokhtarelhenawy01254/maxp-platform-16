/**
 * @file metaAppRegistryService.js
 * @description خدمة إدارة وسجل تطبيقات Meta (Primary + Growth)
 * تدعم جلب الإعدادات من قاعدة البيانات أو البيئة، مع تخزين مراجع الأسرار فقط (Ref)
 * وحظر طباعة أو تخزين أسرار التطبيقات كنص خام في قاعدة البيانات أو اللوج.
 */

const sharedDatabase = require('./sharedDatabase');
const {
  DEFAULT_FACEBOOK_APP_ID,
  FACEBOOK_LOGIN_CONFIG_ID,
  getFacebookOAuthConfig,
  isPlaceholderFacebookCredential
} = require('../config/facebookAppConfig');

const PRIMARY_APP_KEY = 'primary';
const GROWTH_APP_KEY = 'growth';

function getPrismaClient() {
  try {
    return sharedDatabase.getSharedPrismaClient();
  } catch {
    return null;
  }
}

/**
 * جلب السر الخاص بالتطبيق من متغيرات البيئة عبر المرجع
 * @param {string} secretRef
 * @returns {string}
 */
function resolveSecretFromRef(secretRef) {
  if (!secretRef || typeof secretRef !== 'string') return '';
  const ref = secretRef.trim();
  const val = process.env[ref];
  if (typeof val === 'string' && val.trim()) return val.trim();
  if (ref === 'FB_GROWTH_APP_SECRET') return (process.env.FACEBOOK_GROWTH_APP_SECRET || '').trim();
  if (ref === 'FACEBOOK_GROWTH_APP_SECRET') return (process.env.FB_GROWTH_APP_SECRET || '').trim();
  if (ref === 'FB_APP_SECRET') return (process.env.FACEBOOK_APP_SECRET || '').trim();
  if (ref === 'FACEBOOK_APP_SECRET') return (process.env.FB_APP_SECRET || '').trim();
  return '';
}

/**
 * جلب رمز تحقق الويب هوك الخاص بالتطبيق من متغيرات البيئة عبر المرجع
 * @param {string} tokenRef
 * @returns {string}
 */
function resolveVerifyTokenFromRef(tokenRef) {
  if (!tokenRef || typeof tokenRef !== 'string') return '';
  const ref = tokenRef.trim();
  const val = process.env[ref];
  if (typeof val === 'string' && val.trim()) return val.trim();
  if (ref === 'FB_GROWTH_VERIFY_TOKEN' || ref === 'FB_GROWTH_WEBHOOK_VERIFY_TOKEN') {
    return (process.env.FACEBOOK_GROWTH_WEBHOOK_VERIFY_TOKEN || process.env.FACEBOOK_GROWTH_VERIFY_TOKEN || '').trim();
  }
  if (ref === 'FACEBOOK_GROWTH_WEBHOOK_VERIFY_TOKEN' || ref === 'FACEBOOK_GROWTH_VERIFY_TOKEN') {
    return (process.env.FB_GROWTH_VERIFY_TOKEN || process.env.FB_GROWTH_WEBHOOK_VERIFY_TOKEN || '').trim();
  }
  return '';
}

/**
 * جلب قائمة التطبيقات الافتراضية المبنية على متغيرات البيئة والإعدادات الحالية
 * تُستخدم كـ fallback عندما لا تحتوي قاعدة البيانات على صفوف أو عند عدم توفرها.
 * @returns {Array<Object>}
 */
function getDefaultAppsDefinition() {
  const primaryOAuth = getFacebookOAuthConfig();

  const growthAppId = (process.env.FB_GROWTH_APP_ID || process.env.FACEBOOK_GROWTH_APP_ID || '').trim();
  const growthConfigId = (process.env.FB_GROWTH_LOGIN_CONFIG_ID || process.env.FACEBOOK_GROWTH_LOGIN_CONFIG_ID || process.env.FB_GROWTH_CONFIG_ID || '').trim();

  return [
    {
      key: PRIMARY_APP_KEY,
      appId: primaryOAuth.appId || DEFAULT_FACEBOOK_APP_ID,
      appSecretRef: 'FACEBOOK_APP_SECRET',
      configId: primaryOAuth.configId || FACEBOOK_LOGIN_CONFIG_ID,
      webhookVerifyTokenRef: 'FACEBOOK_WEBHOOK_VERIFY_TOKEN',
      isActive: true,
      label: 'Primary App',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      key: GROWTH_APP_KEY,
      appId: growthAppId || 'growth-facebook-app-id',
      appSecretRef: 'FB_GROWTH_APP_SECRET',
      configId: growthConfigId || '',
      webhookVerifyTokenRef: 'FB_GROWTH_VERIFY_TOKEN',
      isActive: process.env.META_GROWTH_ACTIVE !== 'false',
      label: 'Growth App',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}

/**
 * جلب جميع تطبيقات Meta المسجلة (من قاعدة البيانات مع الرجوع للبيئة)
 * @returns {Promise<Array<Object>>}
 */
async function getAllApps() {
  const defaultApps = getDefaultAppsDefinition();

  try {
    const prisma = getPrismaClient();
    if (prisma?.facebookApp?.findMany) {
      const dbApps = await prisma.facebookApp.findMany({
        orderBy: { createdAt: 'asc' }
      });

      if (Array.isArray(dbApps) && dbApps.length > 0) {
        return dbApps.map((dbApp) => {
          const key = String(dbApp.key || PRIMARY_APP_KEY).trim().toLowerCase();
          const secretRef = dbApp.appSecretRef || (key === GROWTH_APP_KEY ? 'FB_GROWTH_APP_SECRET' : 'FACEBOOK_APP_SECRET');
          const tokenRef = dbApp.webhookVerifyTokenRef || (key === GROWTH_APP_KEY ? 'FB_GROWTH_VERIFY_TOKEN' : 'FACEBOOK_WEBHOOK_VERIFY_TOKEN');

          const resolvedSecret = resolveSecretFromRef(secretRef) || (key === PRIMARY_APP_KEY ? getFacebookOAuthConfig().appSecret : '');
          const resolvedVerifyToken = resolveVerifyTokenFromRef(tokenRef) || (key === PRIMARY_APP_KEY ? getFacebookOAuthConfig().facebookWebhookVerifyToken : '');

          return {
            id: dbApp.id,
            key,
            appId: dbApp.appId,
            appSecretRef: secretRef,
            appSecret: resolvedSecret,
            configId: dbApp.configId || (key === PRIMARY_APP_KEY ? FACEBOOK_LOGIN_CONFIG_ID : ''),
            webhookVerifyTokenRef: tokenRef,
            webhookVerifyToken: resolvedVerifyToken,
            isActive: Boolean(dbApp.isActive),
            createdAt: dbApp.createdAt,
            updatedAt: dbApp.updatedAt
          };
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ [META-APP-REGISTRY] تعذر قراءة facebook_apps من قاعدة البيانات، استخدام الافتراضي:', err.message);
  }

  // استخدام الافتراضي مع حل الأسرار
  return defaultApps.map((def) => {
    const resolvedSecret = resolveSecretFromRef(def.appSecretRef) || (def.key === PRIMARY_APP_KEY ? getFacebookOAuthConfig().appSecret : '');
    const resolvedVerifyToken = resolveVerifyTokenFromRef(def.webhookVerifyTokenRef) || (def.key === PRIMARY_APP_KEY ? getFacebookOAuthConfig().facebookWebhookVerifyToken : '');

    return {
      ...def,
      appSecret: resolvedSecret,
      webhookVerifyToken: resolvedVerifyToken
    };
  });
}

/**
 * جلب تطبيق محدد بواسطة المفتاح ('primary' أو 'growth')
 * في حال كان التطبيق غير مفعل أو غير موجود، يرجع fallback للتطبيق الأساسي
 * @param {string} [key='primary']
 * @returns {Promise<Object>}
 */
async function getAppByKey(key = PRIMARY_APP_KEY) {
  const normalizedKey = String(key || PRIMARY_APP_KEY).trim().toLowerCase();
  const apps = await getAllApps();

  const found = apps.find((a) => a.key === normalizedKey);
  if (found) {
    // إذا كان التطبيق معطلاً (isActive === false) وتطلب growth، ارجع fallback الأساسي
    if (!found.isActive && normalizedKey === GROWTH_APP_KEY) {
      console.warn('⚠️ [META-APP-REGISTRY] تطبيق Growth معطّل، الرجوع للتطبيق الأساسي Primary');
      const primary = apps.find((a) => a.key === PRIMARY_APP_KEY);
      return primary || found;
    }
    return found;
  }

  // التراجع للتطبيق الأساسي
  const primary = apps.find((a) => a.key === PRIMARY_APP_KEY);
  return primary || apps[0] || null;
}

/**
 * جلب قائمة التطبيقات الآمنة لشاشة الأدمن بدون كشف الأسرار
 * @returns {Promise<Array<Object>>}
 */
async function getSafeAppsList() {
  const apps = await getAllApps();

  // التطبيق الافتراضي للتسجيل يُقرأ بـ SQL خام حتى لا نعتمد على إعادة توليد Prisma Client
  let defaultSignupKey = null;
  try {
    await ensureSchema();
    const prisma = getPrismaClient();
    if (prisma?.$queryRawUnsafe) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "key" FROM "facebook_apps" WHERE "isDefaultForSignup" = true LIMIT 1`
      );
      const key = Array.isArray(rows) ? rows[0]?.key : null;
      defaultSignupKey = key ? String(key).trim().toLowerCase() : null;
    }
  } catch (_) {
    defaultSignupKey = null;
  }

  return apps.map((app) => ({
    id: app.id || `app-${app.key}`,
    key: app.key,
    appId: app.appId,
    configId: app.configId || '',
    appSecretRef: app.appSecretRef,
    webhookVerifyTokenRef: app.webhookVerifyTokenRef,
    isActive: Boolean(app.isActive),
    isDefaultForSignup: defaultSignupKey ? String(app.key).toLowerCase() === defaultSignupKey : false,
    hasSecretConfigured: Boolean(app.appSecret && !isPlaceholderFacebookCredential(app.appSecret)),
    hasVerifyTokenConfigured: Boolean(app.webhookVerifyToken),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt
  }));
}

/**
 * حفظ أو تحديث تطبيق في السجل
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function upsertApp({ key, appId, appSecretRef, configId, webhookVerifyTokenRef, isActive = true }) {
  const normalizedKey = String(key || PRIMARY_APP_KEY).trim().toLowerCase();
  const normalizedAppId = String(appId || '').trim();
  const normalizedSecretRef = String(appSecretRef || '').trim();
  const normalizedConfigId = configId ? String(configId).trim() : null;
  const normalizedTokenRef = webhookVerifyTokenRef ? String(webhookVerifyTokenRef).trim() : null;

  const prisma = getPrismaClient();
  if (!prisma?.facebookApp?.upsert) {
    throw new Error('قاعدة البيانات غير مهيأة لسجل التطبيقات');
  }

  const result = await prisma.facebookApp.upsert({
    where: { key: normalizedKey },
    create: {
      key: normalizedKey,
      appId: normalizedAppId,
      appSecretRef: normalizedSecretRef,
      configId: normalizedConfigId,
      webhookVerifyTokenRef: normalizedTokenRef,
      isActive: Boolean(isActive)
    },
    update: {
      appId: normalizedAppId,
      appSecretRef: normalizedSecretRef,
      configId: normalizedConfigId,
      webhookVerifyTokenRef: normalizedTokenRef,
      isActive: Boolean(isActive)
    }
  });

  return result;
}

/**
 * تفعيل أو تعطيل تطبيق
 * @param {string} key
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
async function toggleAppStatus(key, isActive) {
  const normalizedKey = String(key || PRIMARY_APP_KEY).trim().toLowerCase();
  if (normalizedKey === PRIMARY_APP_KEY && !isActive) {
    throw new Error('لا يمكن تعطيل تطبيق Primary لأنه التطبيق الأساسي للمنصة');
  }
  const prisma = getPrismaClient();

  if (prisma?.facebookApp?.update) {
    // The registry falls back to env defaults when the table is empty, so a toggle on a
    // fresh install used to 500 ("No record was found for an update"). Seed first.
    await ensureDefaultAppsSeeded();
    const updated = await prisma.facebookApp.update({
      where: { key: normalizedKey },
      data: { isActive: Boolean(isActive) }
    });
    return updated;
  }

  throw new Error('قاعدة البيانات غير متوفرة لتعديل حالة التطبيق');
}

/**
 * جلب مفتاح التطبيق الافتراضي المستخدم عند تسجيل/ربط عملاء جدد
 * يرجع 'primary' كافتراضي آمن عندما لا يوجد تطبيق مُعلَّم أو عند فشل القراءة.
 * @returns {Promise<string>}
 */
async function getDefaultSignupAppKey() {
  try {
    await ensureSchema();
    const prisma = getPrismaClient();
    if (!prisma?.$queryRawUnsafe) return PRIMARY_APP_KEY;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT "key" FROM "facebook_apps" WHERE "isDefaultForSignup" = true AND "isActive" = true LIMIT 1`
    );
    const key = Array.isArray(rows) ? rows[0]?.key : null;
    return key ? String(key).trim().toLowerCase() : PRIMARY_APP_KEY;
  } catch (err) {
    console.warn('[META-APP-REGISTRY] تعذر قراءة التطبيق الافتراضي للتسجيل:', err?.message || err);
    return PRIMARY_APP_KEY;
  }
}

/**
 * تعيين التطبيق الافتراضي للتسجيل (يُستخدم في مسار OAuth عند عدم تمرير app صريح)
 * @param {string} key
 * @returns {Promise<{key: string}>}
 */
async function setDefaultSignupAppKey(key) {
  const normalizedKey = String(key || PRIMARY_APP_KEY).trim().toLowerCase();
  const prisma = getPrismaClient();
  if (!prisma?.$executeRawUnsafe) {
    throw new Error('قاعدة البيانات غير متوفرة لتعيين التطبيق الافتراضي');
  }

  await ensureSchema();

  const app = await prisma.facebookApp.findUnique({ where: { key: normalizedKey } });
  if (!app) throw new Error('التطبيق غير مسجّل في سجل التطبيقات');
  if (!app.isActive) throw new Error('لا يمكن تعيين تطبيق معطّل كتطبيق افتراضي للتسجيل');

  await prisma.$executeRawUnsafe(
    `UPDATE "facebook_apps" SET "isDefaultForSignup" = false WHERE "isDefaultForSignup" = true`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "facebook_apps" SET "isDefaultForSignup" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = $1`,
    normalizedKey
  );

  return { key: normalizedKey };
}

/**
 * التأكد من وجود التطبيقات الافتراضية في قاعدة البيانات (Seeding)
 */
async function ensureDefaultAppsSeeded() {
  try {
    await ensureSchema();
    const prisma = getPrismaClient();
    if (!prisma?.facebookApp?.findUnique) return;

    const existingPrimary = await prisma.facebookApp.findUnique({
      where: { key: PRIMARY_APP_KEY }
    });

    if (!existingPrimary) {
      const defaults = getDefaultAppsDefinition();
      for (const def of defaults) {
        await prisma.facebookApp.upsert({
          where: { key: def.key },
          create: {
            key: def.key,
            appId: def.appId,
            appSecretRef: def.appSecretRef,
            configId: def.configId,
            webhookVerifyTokenRef: def.webhookVerifyTokenRef,
            isActive: def.isActive
          },
          update: {}
        });
      }
      console.log('✅ [META-APP-REGISTRY] تم تسجيل التطبيقات الافتراضية (Primary + Growth) بنجاح');
    }
  } catch (err) {
    console.warn('⚠️ [META-APP-REGISTRY] خطأ أثناء فحص/زرع التطبيقات الافتراضية:', err.message);
  }
}

let schemaEnsured = false;
/**
 * إنشاء جداول وأعمدة بنية التطبيقات المزدوجة ومنع التكرار بصورة idempotent
 */
async function ensureSchema() {
  if (schemaEnsured) return;
  try {
    const prisma = getPrismaClient();
    if (!prisma?.$executeRawUnsafe) return;

    const ddlStatements = [
      `CREATE TABLE IF NOT EXISTS "facebook_apps" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "appId" TEXT NOT NULL,
        "appSecretRef" TEXT NOT NULL,
        "configId" TEXT,
        "webhookVerifyTokenRef" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isDefaultForSignup" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `ALTER TABLE "facebook_apps" ADD COLUMN IF NOT EXISTS "isDefaultForSignup" BOOLEAN NOT NULL DEFAULT false;`,
      `CREATE TABLE IF NOT EXISTS "webhook_event_dedupe" (
        "id" TEXT PRIMARY KEY,
        "channel" TEXT NOT NULL DEFAULT 'facebook',
        "externalMessageId" TEXT NOT NULL,
        "appKey" TEXT DEFAULT 'primary',
        "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "webhook_event_dedupe_channel_externalMessageId_key" ON "webhook_event_dedupe"("channel", "externalMessageId");`,
      `CREATE INDEX IF NOT EXISTS "webhook_event_dedupe_receivedAt_idx" ON "webhook_event_dedupe"("receivedAt");`,
      `ALTER TABLE "facebook_pages" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "facebook_pages" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`,
      `ALTER TABLE "facebook_account_connections" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "facebook_account_connections" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`,
      `ALTER TABLE "facebook_ad_accounts" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "facebook_ad_accounts" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`,
      `ALTER TABLE "facebook_ads_connection_sources" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "facebook_ads_connection_sources" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`,
      `ALTER TABLE "facebook_pixel_configs" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "facebook_pixel_configs" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`,
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`,
      `ALTER TABLE "whatsapp_sessions" ADD COLUMN IF NOT EXISTS "facebookAppKey" TEXT DEFAULT 'primary';`,
      `ALTER TABLE "whatsapp_sessions" ADD COLUMN IF NOT EXISTS "fbAppKey" TEXT;`
    ];

    for (const sql of ddlStatements) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (_) {}
    }
    schemaEnsured = true;
  } catch (err) {
    console.warn('⚠️ [META-APP-REGISTRY] ensureSchema note:', err.message);
  }
}

function getKnownScopesCatalog() {
  return [
    {
      permission: 'public_profile',
      category: 'Authentication',
      description: 'الملف الشخصي العام لحساب فيسبوك للمصادقة وتحديد هوية المستخدم',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'email',
      category: 'Authentication',
      description: 'البريد الإلكتروني الأساسي للمستخدم للتواصل وتأكيد الحساب',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_show_list',
      category: 'Pages',
      description: 'عرض قائمة الصفحات التي يديرها المستخدم لربطها بالمنصة',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_messaging',
      category: 'Messenger',
      description: 'إرسال واستقبال الرسائل عبر بوت الماسنجر ودعم العملاء الفوري',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_manage_metadata',
      category: 'Pages',
      description: 'إدارة وتحديث بيانات واشتراكات ويب هوك الصفحة تلقائياً',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_read_engagement',
      category: 'Pages',
      description: 'قراءة التفاعل على المنشورات',
      defaultAccessLevel: 'standard',
      defaultStatus: 'standard_only',
      note: 'Advanced Access غير معتمد حاليًا — لا يُطلب بالـ OAuth تجنبًا لحجب ظهور الصفحات'
    },
    {
      permission: 'pages_manage_engagement',
      category: 'Pages',
      description: 'التفاعل مع التعليقات والمنشورات والردود التلقائية',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_read_user_content',
      category: 'Pages',
      description: 'قراءة محتوى وتفاعل المستخدمين على الصفحة وتحليل الاستفسارات',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_manage_posts',
      category: 'Pages',
      description: 'إنشاء وتعديل وحذف منشورات الصفحة ومزامنة منتجات المتجر',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'ads_read',
      category: 'Ads',
      description: 'قراءة نتائج وإحصائيات الحسابات والحملات الإعلانية',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'ads_management',
      category: 'Ads',
      description: 'إنشاء وإدارة الحملات الإعلانية والمجموعات الإعلانية تلقائياً',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'pages_manage_ads',
      category: 'Ads',
      description: 'ربط الإعلانات بالصفحات كـ Ad Identity ونشر إعلانات الرسائل',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'business_management',
      category: 'Business',
      description: 'الوصول إلى محافظ الأعمال (Business Portfolios) وصفحات NPE',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'read_insights',
      category: 'Insights',
      description: 'قراءة إحصائيات وصول الصفحات والمنشورات وتقارير الأداء',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'leads_retrieval',
      category: 'Leads',
      description: 'استرجاع بيانات نماذج العملاء المحتملين (Lead Gen) ومزامنتها فورياً',
      defaultAccessLevel: 'standard',
      defaultStatus: 'pending_review',
      note: 'يتطلب مراجعة Meta App Review لتفعيل الاسترجاع الفوري'
    },
    {
      permission: 'catalog_management',
      category: 'Catalog',
      description: 'إدارة كتالوج المنتجات ومزامنتها مع فيسبوك وإنستجرام شوب',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'instagram_basic',
      category: 'Instagram',
      description: 'قراءة الملف التجاري لحساب إنستجرام والمنشورات والوسائط',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'instagram_manage_messages',
      category: 'Instagram',
      description: 'إدارة واستقبال والرد على رسائل الدايركت (IG Direct Messages)',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'instagram_manage_comments',
      category: 'Instagram',
      description: 'إدارة والرد على تعليقات منشورات إنستجرام تلقائياً',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'instagram_content_publish',
      category: 'Instagram',
      description: 'نشر الصور والفيديوهات والريلز على إنستجرام من لوحة التحكم',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'whatsapp_business_messaging',
      category: 'WhatsApp',
      description: 'إرسال واستقبال رسائل واتساب عبر Meta Cloud API الرسمية',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    },
    {
      permission: 'whatsapp_business_management',
      category: 'WhatsApp',
      description: 'إدارة أرقام واتساب وحسابات WABA وقوالب الرسائل ورصيد المحفظة',
      defaultAccessLevel: 'advanced',
      defaultStatus: 'approved'
    }
  ];
}

/**
 * اختبار الاتصال بتطبيق فيسبوك وفحص حالة اعتماد الصلاحيات
 * @param {string} key
 */
async function testAppConnection(key = PRIMARY_APP_KEY) {
  const normalizedKey = String(key || PRIMARY_APP_KEY).trim().toLowerCase();
  const app = await getAppByKey(normalizedKey);

  if (!app) {
    return {
      success: false,
      connected: false,
      key: normalizedKey,
      appId: '',
      checkedAt: new Date().toISOString(),
      message: `تطبيق ${normalizedKey} غير مسجل في النظام`,
      permissions: []
    };
  }

  const secret = app.appSecret || resolveSecretFromRef(app.appSecretRef);
  if (!secret || isPlaceholderFacebookCredential(secret)) {
    return {
      success: false,
      connected: false,
      key: normalizedKey,
      appId: app.appId,
      appName: normalizedKey === 'growth' ? 'MaxPerformance Growth' : 'MaxPerformance Primary',
      checkedAt: new Date().toISOString(),
      message: `السر الخاص بالتطبيق (${app.appSecretRef}) غير مهيأ في متغيرات البيئة`,
      permissions: getKnownScopesCatalog().map((c) => ({
        permission: c.permission,
        category: c.category,
        description: c.description,
        status: c.defaultStatus,
        accessLevel: c.defaultAccessLevel,
        note: c.note || null
      }))
    };
  }

  const SCOPES_CATALOG = getKnownScopesCatalog();
  const axios = require('axios');
  const appAccessToken = `${app.appId}|${secret}`;

  try {
    const appInfoRes = await axios.get(`https://graph.facebook.com/v19.0/${app.appId}`, {
      params: {
        access_token: appAccessToken,
        fields: 'id,name,link'
      },
      timeout: 8000
    });

    const appData = appInfoRes.data || {};
    let livePermissionsMap = new Map();

    try {
      const permRes = await axios.get(`https://graph.facebook.com/v19.0/${app.appId}/permissions`, {
        params: { access_token: appAccessToken },
        timeout: 6000
      });
      if (Array.isArray(permRes?.data?.data)) {
        for (const item of permRes.data.data) {
          if (item?.permission) {
            livePermissionsMap.set(item.permission, item);
          }
        }
      }
    } catch (_) {}

    const permissions = SCOPES_CATALOG.map((cat) => {
      const live = livePermissionsMap.get(cat.permission);
      let status = cat.defaultStatus;
      let accessLevel = cat.defaultAccessLevel;

      if (live) {
        if (live.status === 'granted') {
          status = 'approved';
          accessLevel = 'advanced';
        } else if (live.status === 'declined') {
          status = 'not_requested';
          accessLevel = 'none';
        }
      }

      return {
        permission: cat.permission,
        category: cat.category,
        description: cat.description,
        status,
        accessLevel,
        note: cat.note || null
      };
    });

    return {
      success: true,
      connected: true,
      key: normalizedKey,
      appId: appData.id || app.appId,
      appName: appData.name || (normalizedKey === 'growth' ? 'MaxPerformance Growth' : 'MaxPerformance Primary'),
      checkedAt: new Date().toISOString(),
      message: 'تم الاتصال بـ Meta Graph API بنجاح واختبار صلاحيات التطبيق',
      permissions
    };
  } catch (error) {
    // CRITICAL: NEVER leak the appSecret in error log or response
    const rawSecretRegex = new RegExp(String(secret).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const safeErrorMsg = (error.response?.data?.error?.message || error.message || 'فشل الاتصال بـ Meta API')
      .replace(rawSecretRegex, '***');

    const isNetworkErr = error.code === 'ENOTFOUND' || error.message?.includes('connect ECONNREFUSED') || error.message?.includes('proxy');

    return {
      success: !isNetworkErr,
      connected: false,
      key: normalizedKey,
      appId: app.appId,
      appName: normalizedKey === 'growth' ? 'MaxPerformance Growth' : 'MaxPerformance Primary',
      checkedAt: new Date().toISOString(),
      message: isNetworkErr
        ? `تعذر الوصول المباشر لخوادم Meta (بيئة معزولة / Sandbox): ${safeErrorMsg}`
        : `فشل الاتصال بـ Meta API: ${safeErrorMsg}`,
      permissions: SCOPES_CATALOG.map((c) => ({
        permission: c.permission,
        category: c.category,
        description: c.description,
        status: c.defaultStatus,
        accessLevel: c.defaultAccessLevel,
        note: c.note || null
      }))
    };
  }
}

/**
 * فحص البوابة (Feature Gating) للميزات التي تتطلب تطبيق Growth
 * إذا كان الاتصال على Primary يرجع كود REAUTH_REQUIRED ورسالة عربية واضحة
 * @param {string} featureName
 * @param {string} currentAppKey
 * @returns {{ allowed: boolean, code?: string, message?: string }}
 */
function featureRequiresGrowth(featureName, currentAppKey = 'primary') {
  const GROWTH_FEATURES = new Set([
    'advanced_messaging_insights',
    'growth_ad_management',
    'wa_cross_copilot',
    'growth_feed_automation',
    'custom_creative_optimization'
  ]);

  if (!GROWTH_FEATURES.has(featureName)) {
    return { allowed: true };
  }

  const normalizedKey = String(currentAppKey || 'primary').trim().toLowerCase();
  if (normalizedKey === GROWTH_APP_KEY) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: 'REAUTH_REQUIRED',
    message: 'اربط الصفحة تاني لتفعيل الميزة'
  };
}

module.exports = {
  PRIMARY_APP_KEY,
  GROWTH_APP_KEY,
  getAllApps,
  getAppByKey,
  getSafeAppsList,
  upsertApp,
  toggleAppStatus,
  getDefaultSignupAppKey,
  setDefaultSignupAppKey,
  ensureDefaultAppsSeeded,
  ensureSchema,
  testAppConnection,
  getKnownScopesCatalog,
  featureRequiresGrowth,
  resolveSecretFromRef,
  resolveVerifyTokenFromRef
};
