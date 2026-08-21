const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../services/sharedDatabase");

const SYSTEM_NAME = "platform_default_sidebar";
const DEFAULT_LAYOUT = "three-tier";
const ALLOWED_LAYOUTS = ["classic", "three-tier", "horizontal", "floating", "minimal", "app-dashboard"];

const DEFAULT_SETTINGS = Object.freeze({
  systemName: SYSTEM_NAME,
  displayName: "Platform Default Sidebar",
  description: "Default sidebar settings for new companies",
  category: "platform-site",
  isEnabled: true,
  layout: DEFAULT_LAYOUT,
  sections: {},
  createdAt: null,
  updatedAt: null,
});

const normalizeLayout = (value) => {
  const layout = typeof value === "string" ? value.trim() : "";
  return ALLOWED_LAYOUTS.includes(layout) ? layout : DEFAULT_LAYOUT;
};

const parseConfig = (rawConfig) => {
  if (!rawConfig) return {};
  if (typeof rawConfig === "object") return rawConfig;
  if (typeof rawConfig !== "string") return {};
  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    console.warn(
      "⚠️ [PLATFORM-DEFAULT-SIDEBAR] Failed to parse stored config JSON. Falling back to defaults.",
      error,
    );
    return {};
  }
};

const normalizeRecord = (record) => {
  const parsedConfig = parseConfig(record?.config);
  const layout = normalizeLayout(parsedConfig.layout);

  return {
    ...DEFAULT_SETTINGS,
    displayName: DEFAULT_SETTINGS.displayName,
    description: DEFAULT_SETTINGS.description,
    category: DEFAULT_SETTINGS.category,
    isEnabled: record?.isEnabled !== false,
    layout,
    sections: parsedConfig.sections || {},
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
      "Error fetching platform default sidebar settings for super admin:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "فشل في جلب إعدادات الشريط الجانبي الافتراضية",
    });
  }
};

exports.updateAdminSettings = async (req, res) => {
  try {
    const current = normalizeRecord(await getSettingsRecord());
    const body = req.body || {};

    const requestedLayout = body.layout;
    if (
      requestedLayout !== undefined &&
      !ALLOWED_LAYOUTS.includes(normalizeLayout(requestedLayout))
    ) {
      return res.status(400).json({
        success: false,
        message: "Layout غير صالح للشريط الجانبي",
      });
    }

    const layout = normalizeLayout(requestedLayout ?? current.layout);
    const sections = body.sections && typeof body.sections === "object" ? body.sections : current.sections;

    const saved = await executeWithRetry(async () =>
      getSharedPrismaClient().systemSettings.upsert({
        where: { systemName: SYSTEM_NAME },
        update: {
          displayName: DEFAULT_SETTINGS.displayName,
          description: DEFAULT_SETTINGS.description,
          category: DEFAULT_SETTINGS.category,
          isEnabled: true,
          config: JSON.stringify({
            layout,
            sections,
          }),
        },
        create: {
          systemName: SYSTEM_NAME,
          displayName: DEFAULT_SETTINGS.displayName,
          description: DEFAULT_SETTINGS.description,
          category: DEFAULT_SETTINGS.category,
          isEnabled: true,
          config: JSON.stringify({
            layout,
            sections,
          }),
        },
      }),
    );

    const normalized = normalizeRecord(saved);

    res.json({
      success: true,
      message: "تم حفظ إعدادات الشريط الجانبي الافتراضية بنجاح",
      data: normalized,
    });
  } catch (error) {
    console.error("Error updating platform default sidebar settings:", error);
    res.status(500).json({
      success: false,
      message: "فشل في حفظ إعدادات الشريط الجانبي الافتراضية",
    });
  }
};

exports.getPublicSettings = async (_req, res) => {
  try {
    const record = await getSettingsRecord();
    const settings = normalizeRecord(record);

    res.json({
      success: true,
      data: {
        layout: settings.layout,
        sections: settings.sections,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching public platform default sidebar settings:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "فشل في جلب إعدادات الشريط الجانبي الافتراضية",
    });
  }
};