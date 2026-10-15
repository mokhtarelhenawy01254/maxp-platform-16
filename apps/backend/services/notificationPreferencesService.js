const { getSharedPrismaClient } = require("./sharedDatabase");

const DEFAULT_NOTIFICATION_TYPES = [
  {
    id: "order_created",
    name: "طلب جديد",
    description: "إشعار عند إنشاء طلب جديد",
    category: "orders",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "email", "inApp", "browser"],
    canDisable: false,
  },
  {
    id: "order_status_changed",
    name: "تغيير حالة الطلب",
    description: "إشعار عند تغيير حالة الطلب",
    category: "orders",
    priority: "medium",
    defaultEnabled: true,
    channels: ["push", "email", "inApp"],
    canDisable: true,
  },
  {
    id: "customer_message",
    name: "رسالة من عميل",
    description: "إشعار عند استلام رسالة من عميل",
    category: "messages",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser"],
    canDisable: true,
  },
  {
    id: "follow_up_reminder",
    name: "تذكير متابعة شركة",
    description: "إشعار عند تسجيل تذكير متابعة جديد على شركة تحتاج متابعة",
    category: "operations",
    priority: "medium",
    defaultEnabled: true,
    channels: ["inApp", "browser"],
    canDisable: true,
  },
  {
    id: "follow_up_escalation",
    name: "تصعيد متابعة شركة",
    description: "إشعار عند تصعيد متابعة شركة لتحتاج تدخلًا أسرع",
    category: "operations",
    priority: "high",
    defaultEnabled: true,
    channels: ["inApp", "browser"],
    canDisable: true,
  },
  {
    id: "low_stock",
    name: "مخزون منخفض",
    description: "إشعار عند انخفاض المخزون",
    category: "inventory",
    priority: "medium",
    defaultEnabled: true,
    channels: ["email", "inApp"],
    canDisable: true,
  },
  {
    id: "support_ticket",
    name: "تذاكر الدعم والاقتراحات",
    description: "إشعار عند الرد على تذكرتك أو تحديث حالتها من فريق الدعم",
    category: "support",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser"],
    canDisable: true,
  },
  // ==================== تنبيهات السيستم والحوادث الحرجة ====================
  {
    id: "system_incident",
    name: "مشاكل وأعطال السيستم الحرجة",
    description: "إشعار فوري عند انقطاع الواتساب أو حدوث عطل تقني طارئ في السيستم",
    category: "system",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: false,
  },
  {
    id: "order_sync_stoppage",
    name: "توقف أو فشل استيراد الأوردرات",
    description: "إشعار فوري عند فشل مزامنة WooCommerce أو EasyOrders أو ركود الطلبات المفاجئ",
    category: "orders",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: false,
  },
  {
    id: "ad_campaign_stoppage",
    name: "توقف الإعلانات أو تعطل الحساب الإعلاني",
    description: "إشعار فوري عند توقف حملة إعلانية، نفاد الميزانية، أو مشاكل في فواتير/حساب Meta Ads",
    category: "marketing",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: false,
  },
  {
    id: "automation_lifecycle",
    name: "انتهاء أو تعثر خطوات الأتمتة",
    description: "إشعار فوري عند اكتمال رحلة المتابعة بالكامل لعميل أو فشل تسليم إحدى خطوات الأتمتة",
    category: "automation",
    priority: "medium",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  // ==================== إشعارات المهام ====================
  {
    id: "task_assigned",
    name: "تكليف بمهمة جديدة",
    description: "إشعار عند إسناد مهمة جديدة لك",
    category: "tasks",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_updated",
    name: "تحديث مهمة",
    description: "إشعار عند تحديث مهمة أنت مسؤول عنها أو تتابعها",
    category: "tasks",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_status_changed",
    name: "تغيير حالة مهمة",
    description: "إشعار عند تغيير حالة مهمة تتابعها",
    category: "tasks",
    priority: "medium",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_commented",
    name: "تعليق على مهمة",
    description: "إشعار عند إضافة تعليق على مهمة تتابعها",
    category: "tasks",
    priority: "medium",
    defaultEnabled: true,
    channels: ["push", "inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_attachment_added",
    name: "مرفق جديد على مهمة",
    description: "إشعار عند إضافة مرفق إلى مهمة تتابعها",
    category: "tasks",
    priority: "low",
    defaultEnabled: true,
    channels: ["inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_deleted",
    name: "حذف مهمة",
    description: "إشعار عند حذف مهمة كنت مسؤولاً عنها أو تتابعها",
    category: "tasks",
    priority: "low",
    defaultEnabled: true,
    channels: ["inApp", "browser", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_watcher_added",
    name: "إضافة مراقب",
    description: "إشعار عند إضافتك كمراقب على مهمة",
    category: "tasks",
    priority: "low",
    defaultEnabled: true,
    channels: ["inApp", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_execution_check",
    name: "سؤال تنفيذ مهمة",
    description: "إشعار عند سؤالك عن تنفيذ مهمة عبر واتساب",
    category: "tasks",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_deadline_reminder",
    name: "تذكير باقتراب الموعد",
    description: "إشعار باقتراب موعد تسليم مهمة أنت مسؤول عنها",
    category: "tasks",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "whatsapp"],
    canDisable: true,
  },
  {
    id: "task_overdue",
    name: "مهمة متأخرة",
    description: "إشعار عند تأخر مهمة عن موعد استحقاقها",
    category: "tasks",
    priority: "high",
    defaultEnabled: true,
    channels: ["push", "inApp", "whatsapp"],
    canDisable: true,
  },
];

const NOTIFICATION_TYPE_MAP = new Map(
  DEFAULT_NOTIFICATION_TYPES.map((type) => [type.id, type]),
);

const getMinutesFromTime = (value) => {
  if (!value || typeof value !== "string" || !value.includes(":")) {
    return null;
  }

  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const getCurrentMinutesInTimezone = (timezone) => {
  if (!timezone) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(
      parts.find((part) => part.type === "minute")?.value ?? 0,
    );

    return hour * 60 + minute;
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
};

const buildDefaultTypeSettings = () =>
  DEFAULT_NOTIFICATION_TYPES.reduce((accumulator, type) => {
    accumulator[type.id] = {
      enabled: type.defaultEnabled,
      channels: [...type.channels],
      priority: type.priority,
      customSound: null,
    };
    return accumulator;
  }, {});

const buildDefaultSettings = ({
  userId,
  companyId,
  email,
  timezone,
} = {}) => ({
  userId: String(userId || ""),
  companyId: String(companyId || ""),
  globalEnabled: true,
  quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    timezone: timezone || "Africa/Cairo",
  },
  channels: {
    push: {
      enabled: true,
      sound: true,
      vibration: true,
      badge: true,
    },
    email: {
      enabled: true,
      address: email || "",
      frequency: "immediate",
      format: "html",
    },
    sms: {
      enabled: false,
      phoneNumber: "",
      frequency: "immediate",
    },
    inApp: {
      enabled: true,
      showBadge: true,
      autoMarkRead: false,
    },
    browser: {
      enabled: false,
      showPreview: true,
      requireInteraction: false,
    },
    sound: {
      enabled: true,
      volume: 100,
      pattern: "cash",
    },
    incompleteSound: {
      enabled: true,
      volume: 100,
      pattern: "coins",
    },
  },
  typeSettings: buildDefaultTypeSettings(),
});

const mergeSettingsWithDefaults = (incomingSettings = {}, defaults) => {
  const nextTypeSettings = { ...defaults.typeSettings };

  for (const type of DEFAULT_NOTIFICATION_TYPES) {
    const existingTypeSettings = incomingSettings.typeSettings?.[type.id] || {};
    const defaultTypeSettings = defaults.typeSettings[type.id];
    const allowedChannels = type.channels;

    const mergedChannels = Array.isArray(existingTypeSettings.channels)
      ? existingTypeSettings.channels.filter((channel) =>
          allowedChannels.includes(channel),
        )
      : defaultTypeSettings.channels;

    nextTypeSettings[type.id] = {
      ...defaultTypeSettings,
      ...existingTypeSettings,
      channels:
        mergedChannels.length > 0 ? mergedChannels : defaultTypeSettings.channels,
    };
  }

  return {
    ...defaults,
    ...incomingSettings,
    quietHours: {
      ...defaults.quietHours,
      ...(incomingSettings.quietHours || {}),
    },
    channels: {
      ...defaults.channels,
      ...(incomingSettings.channels || {}),
      push: {
        ...defaults.channels.push,
        ...(incomingSettings.channels?.push || {}),
      },
      email: {
        ...defaults.channels.email,
        ...(incomingSettings.channels?.email || {}),
      },
      sms: {
        ...defaults.channels.sms,
        ...(incomingSettings.channels?.sms || {}),
      },
      inApp: {
        ...defaults.channels.inApp,
        ...(incomingSettings.channels?.inApp || {}),
      },
      browser: {
        ...defaults.channels.browser,
        ...(incomingSettings.channels?.browser || {}),
      },
      sound: {
        ...defaults.channels.sound,
        ...(incomingSettings.channels?.sound || {}),
      },
      incompleteSound: {
        ...defaults.channels.incompleteSound,
        ...(incomingSettings.channels?.incompleteSound || {}),
      },
    },
    typeSettings: nextTypeSettings,
  };
};

const isQuietHoursActive = (settings) => {
  if (!settings?.quietHours?.enabled) {
    return false;
  }

  const startMinutes = getMinutesFromTime(settings.quietHours.startTime);
  const endMinutes = getMinutesFromTime(settings.quietHours.endTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes === endMinutes
  ) {
    return false;
  }

  const currentMinutes = getCurrentMinutesInTimezone(
    settings.quietHours.timezone,
  );

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const shouldDeliverBrowserNotificationForType = (settings, typeId) => {
  if (!settings?.globalEnabled || !settings?.channels?.browser?.enabled) {
    return false;
  }

  const typeSettings = settings.typeSettings?.[typeId];
  if (!typeSettings?.enabled) {
    return false;
  }

  return Array.isArray(typeSettings.channels)
    ? typeSettings.channels.includes("browser")
    : false;
};

const getNotificationType = (typeId) => NOTIFICATION_TYPE_MAP.get(typeId) || null;

const isNotificationPreferencesStorageUnavailable = (error) => {
  if (!error) {
    return false;
  }

  if (error.code === "P2021" || error.code === "P2022") {
    return true;
  }

  const message = String(error.message || "");
  return message.includes("notification_preferences");
};

const getNotificationSettingsForUser = async ({
  userId,
  companyId,
  email,
  timezone,
}) => {
  const prisma = getSharedPrismaClient();
  let record = null;

  try {
    record = await prisma.notificationPreference.findUnique({
      where: {
        companyId_userId: {
          companyId: String(companyId),
          userId: String(userId),
        },
      },
    });
  } catch (error) {
    console.warn(
      `[NOTIFICATIONS] Falling back to default settings: ${error.message}`,
    );
    record = null;
  }

  const defaults = buildDefaultSettings({
    userId,
    companyId,
    email,
    timezone,
  });
  const mergedSettings = mergeSettingsWithDefaults(record?.settings || {}, defaults);

  return {
    ...mergedSettings,
    userId: String(userId),
    companyId: String(companyId),
  };
};

const saveNotificationSettingsForUser = async ({
  userId,
  companyId,
  email,
  timezone,
  incomingSettings,
}) => {
  const currentSettings = await getNotificationSettingsForUser({
    userId,
    companyId,
    email,
    timezone,
  });

  const mergedSettings = {
    ...mergeSettingsWithDefaults(incomingSettings || {}, currentSettings),
    userId: String(userId),
    companyId: String(companyId),
  };

  const prisma = getSharedPrismaClient();

  try {
    await prisma.notificationPreference.upsert({
      where: {
        companyId_userId: {
          companyId: String(companyId),
          userId: String(userId),
        },
      },
      update: {
        settings: mergedSettings,
      },
      create: {
        companyId: String(companyId),
        userId: String(userId),
        settings: mergedSettings,
      },
    });
  } catch (error) {
    if (!isNotificationPreferencesStorageUnavailable(error)) {
      throw error;
    }

    console.warn(
      `[NOTIFICATIONS] Could not persist settings, returning in-memory defaults: ${error.message}`,
    );
  }

  return mergedSettings;
};

module.exports = {
  DEFAULT_NOTIFICATION_TYPES,
  buildDefaultSettings,
  getNotificationSettingsForUser,
  getNotificationType,
  isQuietHoursActive,
  mergeSettingsWithDefaults,
  saveNotificationSettingsForUser,
  shouldDeliverBrowserNotificationForType,
};
