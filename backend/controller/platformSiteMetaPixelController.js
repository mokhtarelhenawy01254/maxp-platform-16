const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../services/sharedDatabase");

const SITE_KEY = "maxp.online";
const PIXEL_ID_REGEX = /^\d{15,16}$/;

const DEFAULT_SETTINGS = Object.freeze({
  siteKey: SITE_KEY,
  isEnabled: false,
  pixelId: "",
  trackPageView: true,
  trackLead: true,
  trackCompleteRegistration: true,
  trackLogin: false,
  loginEventName: "PlatformLogin",
});

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeRecord = (record) => ({
  ...DEFAULT_SETTINGS,
  isEnabled: Boolean(record?.isEnabled),
  pixelId: normalizeText(record?.pixelId),
  trackPageView: record?.trackPageView !== false,
  trackLead: record?.trackLead !== false,
  trackCompleteRegistration: record?.trackCompleteRegistration !== false,
  trackLogin: Boolean(record?.trackLogin),
  loginEventName:
    normalizeText(record?.loginEventName) || DEFAULT_SETTINGS.loginEventName,
  createdAt: record?.createdAt ?? null,
  updatedAt: record?.updatedAt ?? null,
});

const sanitizePublicSettings = (settings) => {
  const hasValidPixel =
    settings.isEnabled && PIXEL_ID_REGEX.test(settings.pixelId);

  return {
    enabled: hasValidPixel,
    pixelId: hasValidPixel ? settings.pixelId : "",
    trackPageView: hasValidPixel ? settings.trackPageView : false,
    trackLead: hasValidPixel ? settings.trackLead : false,
    trackCompleteRegistration: hasValidPixel
      ? settings.trackCompleteRegistration
      : false,
    trackLogin: hasValidPixel ? settings.trackLogin : false,
    loginEventName: settings.loginEventName,
    updatedAt: settings.updatedAt,
  };
};

const isMissingPlatformSiteMetaPixelTableError = (error) =>
  Boolean(
    error &&
      error.code === "P2021" &&
      error.meta?.table === "public.platform_site_meta_pixel_settings",
  );

const getSettingsRecord = async () =>
  executeWithRetry(async () =>
    getSharedPrismaClient().platformSiteMetaPixelSetting.findUnique({
      where: { siteKey: SITE_KEY },
    }),
  );

exports.getAdminSettings = async (_req, res) => {
  try {
    const record = await getSettingsRecord();
    const settings = normalizeRecord(record);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    if (isMissingPlatformSiteMetaPixelTableError(error)) {
      const fallbackSettings = normalizeRecord(null);
      console.warn(
        "[PlatformSiteMetaPixel] Missing platform_site_meta_pixel_settings table. Returning default admin settings.",
      );
      return res.json({
        success: true,
        data: fallbackSettings,
      });
    }

    console.error("Error fetching platform site Meta pixel settings:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب إعدادات Meta Pixel للموقع العام",
    });
  }
};

exports.updateAdminSettings = async (req, res) => {
  try {
    const current = normalizeRecord(await getSettingsRecord());
    const body = req.body || {};

    const nextSettings = {
      isEnabled:
        typeof body.isEnabled === "boolean" ? body.isEnabled : current.isEnabled,
      pixelId:
        body.pixelId !== undefined
          ? normalizeText(body.pixelId)
          : current.pixelId,
      trackPageView:
        typeof body.trackPageView === "boolean"
          ? body.trackPageView
          : current.trackPageView,
      trackLead:
        typeof body.trackLead === "boolean" ? body.trackLead : current.trackLead,
      trackCompleteRegistration:
        typeof body.trackCompleteRegistration === "boolean"
          ? body.trackCompleteRegistration
          : current.trackCompleteRegistration,
      trackLogin:
        typeof body.trackLogin === "boolean" ? body.trackLogin : current.trackLogin,
      loginEventName:
        body.loginEventName !== undefined
          ? normalizeText(body.loginEventName) || DEFAULT_SETTINGS.loginEventName
          : current.loginEventName,
    };

    if (nextSettings.isEnabled && !PIXEL_ID_REGEX.test(nextSettings.pixelId)) {
      return res.status(400).json({
        success: false,
        message: "Pixel ID غير صالح. يجب أن يكون 15 أو 16 رقمًا.",
      });
    }

    const saved = await executeWithRetry(async () =>
      getSharedPrismaClient().platformSiteMetaPixelSetting.upsert({
        where: { siteKey: SITE_KEY },
        update: {
          isEnabled: nextSettings.isEnabled,
          pixelId: nextSettings.pixelId || null,
          trackPageView: nextSettings.trackPageView,
          trackLead: nextSettings.trackLead,
          trackCompleteRegistration: nextSettings.trackCompleteRegistration,
          trackLogin: nextSettings.trackLogin,
          loginEventName: nextSettings.loginEventName,
        },
        create: {
          siteKey: SITE_KEY,
          isEnabled: nextSettings.isEnabled,
          pixelId: nextSettings.pixelId || null,
          trackPageView: nextSettings.trackPageView,
          trackLead: nextSettings.trackLead,
          trackCompleteRegistration: nextSettings.trackCompleteRegistration,
          trackLogin: nextSettings.trackLogin,
          loginEventName: nextSettings.loginEventName,
        },
      }),
    );

    const normalized = normalizeRecord(saved);

    res.json({
      success: true,
      message: "تم حفظ إعدادات Meta Pixel للموقع العام بنجاح",
      data: normalized,
      publicData: sanitizePublicSettings(normalized),
    });
  } catch (error) {
    console.error("Error updating platform site Meta pixel settings:", error);
    res.status(500).json({
      success: false,
      message: "فشل في حفظ إعدادات Meta Pixel للموقع العام",
    });
  }
};

exports.getPublicSettings = async (_req, res) => {
  try {
    const record = await getSettingsRecord();
    const settings = sanitizePublicSettings(normalizeRecord(record));

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    if (isMissingPlatformSiteMetaPixelTableError(error)) {
      const fallbackSettings = sanitizePublicSettings(normalizeRecord(null));
      console.warn(
        "[PlatformSiteMetaPixel] Missing platform_site_meta_pixel_settings table. Returning default public settings.",
      );
      return res.json({
        success: true,
        data: fallbackSettings,
      });
    }

    console.error(
      "Error fetching public platform site Meta pixel settings:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "فشل في جلب إعدادات Meta Pixel العامة",
    });
  }
};
