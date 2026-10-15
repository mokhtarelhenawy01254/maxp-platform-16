const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../services/sharedDatabase");

const SYSTEM_NAME = "platform_public_landing";
const DEFAULT_ACTIVE_LANDING_ID = "enterprise-os";
const ALLOWED_LANDING_IDS = [
  "enterprise-os",
  "sales-flow",
  "executive-atlas",
  "business-os",
  "merchant-daylight",
  "merchant-dossier",
  "merchant-performs",
  "merchant-annual",
  "merchant-poster",
];

const DEFAULT_SETTINGS = Object.freeze({
  systemName: SYSTEM_NAME,
  displayName: "Platform Public Landing",
  description: "Controls which public landing page variant appears on the root route.",
  category: "platform-site",
  isEnabled: true,
  activeLandingId: DEFAULT_ACTIVE_LANDING_ID,
  availableLandingIds: ALLOWED_LANDING_IDS,
  createdAt: null,
  updatedAt: null,
});

const normalizeText = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const parseConfig = (rawConfig) => {
  if (!rawConfig) {
    return {};
  }

  if (typeof rawConfig === "object") {
    return rawConfig;
  }

  if (typeof rawConfig !== "string") {
    return {};
  }

  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    console.warn(
      "⚠️ [PLATFORM-HOMEPAGE] Failed to parse stored config JSON. Falling back to defaults.",
      error,
    );
    return {};
  }
};

const normalizeLandingId = (value) => {
  const landingId = normalizeText(value);
  return ALLOWED_LANDING_IDS.includes(landingId)
    ? landingId
    : DEFAULT_ACTIVE_LANDING_ID;
};

const normalizeRecord = (record) => {
  const parsedConfig = parseConfig(record?.config);
  const activeLandingId = normalizeLandingId(parsedConfig.activeLandingId);

  return {
    ...DEFAULT_SETTINGS,
    displayName:
      normalizeText(record?.displayName) || DEFAULT_SETTINGS.displayName,
    description:
      normalizeText(record?.description) || DEFAULT_SETTINGS.description,
    category: normalizeText(record?.category) || DEFAULT_SETTINGS.category,
    isEnabled: record?.isEnabled !== false,
    activeLandingId,
    availableLandingIds: [...ALLOWED_LANDING_IDS],
    createdAt: record?.createdAt ?? null,
    updatedAt: record?.updatedAt ?? null,
  };
};

const getSettingsRecord = async () =>
  executeWithRetry(async () =>
    getSharedPrismaClient().systemSettings.findUnique({
      where: { systemName: SYSTEM_NAME },
    }),
  );

const sanitizePublicSettings = (settings) => ({
  activeLandingId: normalizeLandingId(settings?.activeLandingId),
  updatedAt: settings?.updatedAt ?? null,
});

exports.getAdminSettings = async (_req, res) => {
  try {
    const record = await getSettingsRecord();
    const settings = normalizeRecord(record);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error(
      "Error fetching platform homepage settings for super admin:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "فشل في جلب إعدادات الصفحة الرئيسية العامة",
    });
  }
};

exports.updateAdminSettings = async (req, res) => {
  try {
    const current = normalizeRecord(await getSettingsRecord());
    const body = req.body || {};
    const requestedActiveLandingId = body.activeLandingId;

    if (
      requestedActiveLandingId !== undefined &&
      !ALLOWED_LANDING_IDS.includes(normalizeText(requestedActiveLandingId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Variant غير صالح للصفحة الرئيسية العامة",
      });
    }

    const activeLandingId = normalizeLandingId(
      requestedActiveLandingId ?? current.activeLandingId,
    );

    const saved = await executeWithRetry(async () =>
      getSharedPrismaClient().systemSettings.upsert({
        where: { systemName: SYSTEM_NAME },
        update: {
          displayName: DEFAULT_SETTINGS.displayName,
          description: DEFAULT_SETTINGS.description,
          category: DEFAULT_SETTINGS.category,
          isEnabled: true,
          config: JSON.stringify({
            activeLandingId,
          }),
        },
        create: {
          systemName: SYSTEM_NAME,
          displayName: DEFAULT_SETTINGS.displayName,
          description: DEFAULT_SETTINGS.description,
          category: DEFAULT_SETTINGS.category,
          isEnabled: true,
          config: JSON.stringify({
            activeLandingId,
          }),
        },
      }),
    );

    const normalized = normalizeRecord(saved);

    res.json({
      success: true,
      message: "تم حفظ اللاندنج الرئيسية العامة بنجاح",
      data: normalized,
      publicData: sanitizePublicSettings(normalized),
    });
  } catch (error) {
    console.error("Error updating platform homepage settings:", error);
    res.status(500).json({
      success: false,
      message: "فشل في حفظ إعدادات الصفحة الرئيسية العامة",
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
    console.error(
      "Error fetching public platform homepage settings:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "فشل في جلب إعدادات الصفحة الرئيسية العامة",
    });
  }
};
