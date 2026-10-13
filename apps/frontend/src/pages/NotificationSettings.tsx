import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BellIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CogIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../hooks/useAuthSimple";
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermissionState,
} from "../utils/browserNotifications";
import {
  cacheNotificationSettings,
  type NotificationChannelId,
  type NotificationSettingsData,
  type NotificationTypePreference,
} from "../utils/notificationSettings";

interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  defaultEnabled: boolean;
  channels: NotificationChannelId[];
  canDisable: boolean;
}

interface NotificationStats {
  delivered: {
    total: number;
    byChannel: Record<string, number>;
  };
  engagement: {
    openRate: number;
    clickRate: number;
    responseTime: number;
  };
  preferences: {
    mostUsedChannel: string;
    quietHoursActive: boolean;
  };
  trends: Array<{
    period: string;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

type SettingsTab = "general" | "types" | "stats";

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

const buildDefaultTypePreference = (
  type: NotificationType,
): NotificationTypePreference => ({
  enabled: type.defaultEnabled,
  channels: [...type.channels],
  priority: type.priority,
  customSound: null,
});

const createNormalizedSettings = ({
  rawSettings,
  notificationTypes,
  userId,
  companyId,
  email,
  timezone,
}: {
  rawSettings?: Partial<NotificationSettingsData> | null;
  notificationTypes: NotificationType[];
  userId: string;
  companyId: string;
  email: string;
  timezone?: string;
}): NotificationSettingsData => {
  const baseTypeSettings = notificationTypes.reduce<
    Record<string, NotificationTypePreference>
  >((acc, type) => {
    const existing = rawSettings?.typeSettings?.[type.id];
    const defaults = buildDefaultTypePreference(type);
    const mergedChannels = Array.isArray(existing?.channels)
      ? existing.channels.filter((channel) => type.channels.includes(channel))
      : defaults.channels;

    acc[type.id] = {
      ...defaults,
      ...existing,
      channels: mergedChannels.length > 0 ? mergedChannels : defaults.channels,
    };
    return acc;
  }, {});

  return {
    userId: String(rawSettings?.userId || userId),
    companyId: String(rawSettings?.companyId || companyId || "1"),
    globalEnabled: rawSettings?.globalEnabled ?? true,
    quietHours: {
      enabled: rawSettings?.quietHours?.enabled ?? false,
      startTime: rawSettings?.quietHours?.startTime || "22:00",
      endTime: rawSettings?.quietHours?.endTime || "08:00",
      timezone:
        rawSettings?.quietHours?.timezone || timezone || "Africa/Cairo",
    },
    channels: {
      push: {
        enabled: rawSettings?.channels?.push?.enabled ?? true,
        sound: rawSettings?.channels?.push?.sound ?? true,
        vibration: rawSettings?.channels?.push?.vibration ?? true,
        badge: rawSettings?.channels?.push?.badge ?? true,
      },
      email: {
        enabled: rawSettings?.channels?.email?.enabled ?? true,
        address: rawSettings?.channels?.email?.address || email,
        frequency: rawSettings?.channels?.email?.frequency || "immediate",
        format: rawSettings?.channels?.email?.format || "html",
      },
      sms: {
        enabled: rawSettings?.channels?.sms?.enabled ?? false,
        phoneNumber: rawSettings?.channels?.sms?.phoneNumber || "",
        frequency: rawSettings?.channels?.sms?.frequency || "immediate",
      },
      inApp: {
        enabled: rawSettings?.channels?.inApp?.enabled ?? true,
        showBadge: rawSettings?.channels?.inApp?.showBadge ?? true,
        autoMarkRead: rawSettings?.channels?.inApp?.autoMarkRead ?? false,
      },
      browser: {
        enabled: rawSettings?.channels?.browser?.enabled ?? false,
        showPreview: rawSettings?.channels?.browser?.showPreview ?? true,
        requireInteraction:
          rawSettings?.channels?.browser?.requireInteraction ?? false,
      },
      sound: {
        enabled: rawSettings?.channels?.sound?.enabled ?? true,
        volume:
          typeof rawSettings?.channels?.sound?.volume === "number"
            ? rawSettings.channels.sound.volume
            : 100,
        pattern: rawSettings?.channels?.sound?.pattern || "cash",
      },
      incompleteSound: {
        enabled: rawSettings?.channels?.incompleteSound?.enabled ?? true,
        volume:
          typeof rawSettings?.channels?.incompleteSound?.volume === "number"
            ? rawSettings.channels.incompleteSound.volume
            : 100,
        pattern: rawSettings?.channels?.incompleteSound?.pattern || "coins",
      },
    },
    typeSettings: baseTypeSettings,
  };
};

const cloneSettings = (settings: NotificationSettingsData) =>
  JSON.parse(JSON.stringify(settings)) as NotificationSettingsData;

const ToggleSwitch: React.FC<{
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, label, disabled = false, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.checked)}
      className="sr-only peer"
    />
    <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
  </label>
);

const NotificationSettings: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [savedSettings, setSavedSettings] =
    useState<NotificationSettingsData | null>(null);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>(
    [],
  );
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [browserPermission, setBrowserPermission] =
    useState<BrowserNotificationPermissionState>(
      getBrowserNotificationPermission(),
    );
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const userId = user?.id ? String(user.id) : "";
  const companyId = user?.companyId || user?.company?.id || "1";
  const userEmail = user?.email || "";
  const userTimezone = user?.timezone || "Africa/Cairo";

  const hasUnsavedChanges = useMemo(() => {
    if (!settings || !savedSettings) {
      return false;
    }

    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [savedSettings, settings]);

  useEffect(() => {
    setBrowserPermission(getBrowserNotificationPermission());
  }, []);

  const refreshBrowserPermissionState = () => {
    const nextPermission = getBrowserNotificationPermission();
    setBrowserPermission(nextPermission);
    return nextPermission;
  };


  useEffect(() => {
    if (authLoading || !userId) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const [settingsResponse, typesResponse, statsResponse] =
          await Promise.all([
            api.get(`/notifications/settings/${userId}`),
            api.get(`/notifications/types`, {
              params: { companyId },
            }),
            api.get(`/notifications/stats/${userId}`),
          ]);

        const fetchedTypes = Array.isArray(typesResponse.data?.data)
          ? (typesResponse.data.data as NotificationType[])
          : [];
        const normalizedSettings = createNormalizedSettings({
          rawSettings: settingsResponse.data?.data,
          notificationTypes: fetchedTypes,
          userId,
          companyId,
          email: userEmail,
          timezone: userTimezone,
        });

        setNotificationTypes(fetchedTypes);
        setSettings(normalizedSettings);
        setSavedSettings(cloneSettings(normalizedSettings));
        cacheNotificationSettings(normalizedSettings);
        setStats((statsResponse.data?.data as NotificationStats) || null);
      } catch (error) {
        console.error("Error loading notification settings page:", error);
        setLoadError("تعذر تحميل إعدادات الإشعارات الآن. حاول مرة أخرى.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, companyId, userEmail, userId, userTimezone]);


  const updateSettings = (path: string, value: unknown) => {
    setSettings((previousSettings) => {
      if (!previousSettings) {
        return previousSettings;
      }

      const nextSettings = cloneSettings(previousSettings);
      const keys = path.split(".");
      let current: Record<string, unknown> = nextSettings as Record<
        string,
        unknown
      >;

      for (let index = 0; index < keys.length - 1; index += 1) {
        current = current[keys[index]] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
      return nextSettings;
    });
  };

  const getTypePreference = (type: NotificationType) =>
    settings?.typeSettings[type.id] || buildDefaultTypePreference(type);

  const handleToggleTypeEnabled = (type: NotificationType, enabled: boolean) => {
    updateSettings(`typeSettings.${type.id}.enabled`, enabled);
  };

  const handleToggleTypeChannel = (
    type: NotificationType,
    channel: NotificationChannelId,
    checked: boolean,
  ) => {
    const currentChannels = getTypePreference(type).channels;
    const nextChannels = checked
      ? Array.from(new Set([...currentChannels, channel]))
      : currentChannels.filter((currentChannel) => currentChannel !== channel);

    updateSettings(`typeSettings.${type.id}.channels`, nextChannels);
  };

  const handleBrowserChannelToggle = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings("channels.browser.enabled", false);
      setFeedback({
        type: "info",
        message: "تم إيقاف إشعارات المتصفح.",
      });
      return;
    }

    if (!isBrowserNotificationSupported()) {
      setBrowserPermission("unsupported");
      setFeedback({
        type: "error",
        message: "هذا المتصفح لا يدعم إشعارات النظام.",
      });
      return;
    }

    let permission = getBrowserNotificationPermission();
    if (permission === "default") {
      permission = await requestBrowserNotificationPermission();
    }

    setBrowserPermission(permission);

    if (permission !== "granted") {
      setFeedback({
        type: "error",
        message:
          permission === "denied"
            ? "تم رفض إذن إشعارات المتصفح. فعّله من إعدادات المتصفح أولاً."
            : "لا يمكن تفعيل إشعارات المتصفح قبل منح الإذن.",
      });
      return;
    }

    updateSettings("channels.browser.enabled", true);

    setFeedback({
      type: "success",
      message: "تم تفعيل إشعارات المتصفح بنجاح.",
    });
  };

  const handleRequestBrowserPermission = async () => {
    const currentPermission = refreshBrowserPermissionState();

    if (currentPermission === "unsupported") {
      setFeedback({
        type: "error",
        message: "هذا المتصفح لا يدعم إشعارات النظام.",
      });
      return;
    }

    if (currentPermission === "granted") {
      setFeedback({
        type: "success",
        message: "إذن إشعارات المتصفح مفعّل بالفعل.",
      });
      return;
    }

    if (currentPermission === "denied") {
      setFeedback({
        type: "info",
        message:
          "الإذن مرفوض لهذا الموقع. اسمح بالإشعارات من إعدادات المتصفح أو إعدادات الموقع، ثم اضغط تحديث الحالة وبعدها احفظ الإعدادات.",
      });
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    setBrowserPermission(permission);

    setFeedback({
      type: permission === "granted" ? "success" : "info",
      message:
        permission === "granted"
            ? "تم منح إذن إشعارات المتصفح."
            : permission === "denied"
            ? "تم رفض إذن إشعارات المتصفح. فعّله من إعدادات المتصفح ثم حدّث الحالة."
            : "إذن إشعارات المتصفح لم يتغير.",
    });
  };

  const handleSaveSettings = async () => {
    if (!settings || !userId) {
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const response = await api.put(`/notifications/settings/${userId}`, settings);
      const normalizedResponse = createNormalizedSettings({
        rawSettings: response.data?.data,
        notificationTypes,
        userId,
        companyId,
        email: userEmail,
        timezone: userTimezone,
      });

      setSettings(normalizedResponse);
      setSavedSettings(cloneSettings(normalizedResponse));
      cacheNotificationSettings(normalizedResponse);
      setFeedback({
        type: "success",
        message: "تم حفظ إعدادات الإشعارات بنجاح.",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      setFeedback({
        type: "error",
        message: "فشل حفظ الإعدادات. حاول مرة أخرى.",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPreferredTestChannel = (type: NotificationType) => {
    const channels = getTypePreference(type).channels;
    const canUseBrowserForTest =
      settings?.channels.browser.enabled && browserPermission === "granted";

    if (channels.includes("browser") && canUseBrowserForTest) {
      return "browser";
    }

    const nonBrowserChannel = channels.find((channel) => channel !== "browser");
    return nonBrowserChannel || channels[0] || type.channels[0] || "inApp";
  };

  const handleTestNotification = async (type: NotificationType) => {
    const channel = getPreferredTestChannel(type);

    try {
      await api.post("/notifications/test", {
        userId,
        testConfig: {
          type: type.id,
          channel,
          message: "هذا إشعار تجريبي",
        },
      });

      if (channel === "browser") {
        const shown = showBrowserNotification({
          title: "تجربة إشعار المتصفح",
          body: `تم اختبار إشعار ${type.name} بنجاح`,
          tag: "notification-settings-test",
          requireInteraction:
            settings?.channels.browser.requireInteraction ?? false,
        });

        if (!shown) {
          setFeedback({
            type: "info",
            message:
              "تم إرسال الطلب التجريبي لكن إشعار المتصفح لم يظهر لأن الإذن غير مُفعّل.",
          });
          return;
        }
      }

      setFeedback({
        type: "success",
        message: `تم إرسال اختبار ${type.name} بنجاح.`,
      });
    } catch (error) {
      console.error("Error testing notification:", error);
      setFeedback({
        type: "error",
        message:
          (error as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "فشل إرسال الإشعار التجريبي.",
      });
    }
  };


  const getChannelIcon = (channel: NotificationChannelId) => {
    switch (channel) {
      case "push":
        return <DevicePhoneMobileIcon className="h-5 w-5" />;
      case "email":
        return <EnvelopeIcon className="h-5 w-5" />;
      case "sms":
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
      case "browser":
        return <ComputerDesktopIcon className="h-5 w-5" />;
      case "inApp":
      default:
        return <BellIcon className="h-5 w-5" />;
    }
  };

  const getChannelName = (channel: NotificationChannelId | string) => {
    const names: Record<string, string> = {
      push: "الإشعارات المنبثقة",
      email: "البريد الإلكتروني",
      sms: "الرسائل النصية",
      inApp: "داخل التطبيق",
      browser: "إشعار المتصفح",
    };

    return names[channel] || channel;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-700 bg-red-50 border-red-100";
      case "medium":
        return "text-amber-700 bg-amber-50 border-amber-100";
      case "low":
        return "text-green-700 bg-green-50 border-green-100";
      default:
        return "text-gray-700 bg-gray-50 border-gray-100";
    }
  };

  const browserPermissionLabel = useMemo(() => {
    switch (browserPermission) {
      case "granted":
        return {
          label: "مفعل",
          className: "bg-green-50 text-green-700 border-green-100",
        };
      case "denied":
        return {
          label: "مرفوض",
          className: "bg-red-50 text-red-700 border-red-100",
        };
      case "default":
        return {
          label: "بانتظار الإذن",
          className: "bg-amber-50 text-amber-700 border-amber-100",
        };
      default:
        return {
          label: "غير مدعوم",
          className: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  }, [browserPermission]);

  const browserNotificationStatusLabel = useMemo(() => {
    if (!isBrowserNotificationSupported()) {
      return {
        label: "غير مدعوم",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      };
    }

    if (!settings?.channels.browser.enabled) {
      return {
        label: "متوقف",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      };
    }

    if (browserPermission === "granted") {
      return {
        label: "مفعّل",
        className: "bg-green-50 text-green-700 border-green-100",
      };
    }

    if (browserPermission === "denied") {
      return {
        label: "محظور بالمتصفح",
        className: "bg-red-50 text-red-700 border-red-100",
      };
    }

    return {
      label: "بانتظار منح الإذن",
      className: "bg-amber-50 text-amber-700 border-amber-100",
    };
  }, [browserPermission, settings?.channels.browser.enabled]);

  const browserPermissionAction = useMemo(() => {
    if (browserPermission === "granted") {
      return null;
    }

    if (browserPermission === "denied") {
      return {
        label: "تحديث حالة الإذن",
        helper:
          "الإذن مرفوض الآن. افتح إعدادات الموقع في المتصفح وغيّر Notifications إلى Allow، ثم ارجع واضغط تحديث الحالة.",
      };
    }

    if (browserPermission === "unsupported") {
      return {
        label: "التحقق من الدعم",
        helper: "هذا المتصفح لا يدعم إشعارات النظام المباشرة.",
      };
    }

    return {
      label: "طلب إذن المتصفح",
      helper:
        "إذا لم تمنح إذن المتصفح بعد، اطلب الإذن أولًا لتصلك تنبيهات الطلبات والرسائل الجديدة فوراً.",
    };
  }, [browserPermission]);

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          جاري تحميل إعدادات الإشعارات...
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/30 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 text-red-500" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تعذر تحميل الصفحة
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {loadError || "لا يمكن عرض إعدادات الإشعارات الآن."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 w-full">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CogIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
            إعدادات التنبيهات والإشعارات
          </h1>
          <p className="text-xs text-muted-foreground">
            تخصيص قنوات التنبيه اللحظية وإشعارات المتصفح
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${
                hasUnsavedChanges ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className="text-[11px] font-medium">
              {hasUnsavedChanges ? "تغييرات غير محفوظة" : "الإعدادات متزامنة"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving || !hasUnsavedChanges}
            className="h-8.5 px-3 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <ArrowPathIcon className="size-3.5 animate-spin" />
            ) : (
              <CheckCircleIcon className="size-3.5" />
            )}
            حفظ التغييرات
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-lg border px-3.5 py-2 text-xs font-medium flex items-center gap-2 ${
            feedback.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : feedback.type === "error"
                ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-lg w-fit">
        {[
          { id: "general", label: "الإعدادات العامة", icon: CogIcon },
          { id: "types", label: "أنواع الإشعارات", icon: BellIcon },
          { id: "stats", label: "الإحصائيات", icon: ClockIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "general" ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              الإعدادات العامة
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    تفعيل الإشعارات
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    إيقاف أو تشغيل كل الإشعارات دفعة واحدة.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings.globalEnabled}
                  label="تفعيل الإشعارات"
                  onChange={(checked) => updateSettings("globalEnabled", checked)}
                />
              </div>

              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      ساعات الهدوء
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      منع التنبيهات في أوقات معينة.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.quietHours.enabled}
                    label="تفعيل ساعات الهدوء"
                    onChange={(checked) =>
                      updateSettings("quietHours.enabled", checked)
                    }
                  />
                </div>

                {settings.quietHours.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        من الساعة
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.startTime}
                        onChange={(event) =>
                          updateSettings(
                            "quietHours.startTime",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        إلى الساعة
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.endTime}
                        onChange={(event) =>
                          updateSettings("quietHours.endTime", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        المنطقة الزمنية
                      </label>
                      <input
                        type="text"
                        value={settings.quietHours.timezone}
                        onChange={(event) =>
                          updateSettings("quietHours.timezone", event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              قنوات الإشعارات
            </h2>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start">
                    <DevicePhoneMobileIcon className="ml-3 h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        الإشعارات المنبثقة
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        تنبيه سريع داخل الواجهة الحالية.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.channels.push.enabled}
                    label="تفعيل الإشعارات المنبثقة"
                    onChange={(checked) =>
                      updateSettings("channels.push.enabled", checked)
                    }
                  />
                </div>

                {settings.channels.push.enabled ? (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                    {[
                      {
                        label: "الصوت",
                        path: "channels.push.sound",
                        value: settings.channels.push.sound,
                      },
                      {
                        label: "الاهتزاز",
                        path: "channels.push.vibration",
                        value: settings.channels.push.vibration,
                      },
                      {
                        label: "شارة العدد",
                        path: "channels.push.badge",
                        value: settings.channels.push.badge,
                      },
                    ].map((option) => (
                      <div
                        key={option.path}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                        <ToggleSwitch
                          checked={option.value}
                          label={option.label}
                          onChange={(checked) =>
                            updateSettings(option.path, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start">
                    <ComputerDesktopIcon className="ml-3 h-6 w-6 text-indigo-600" />
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            إشعار المتصفح
                          </h3>
                          <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${browserPermissionLabel.className}`}
                          >
                            {browserPermissionLabel.label}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${browserNotificationStatusLabel.className}`}
                          >
                            {browserNotificationStatusLabel.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          تنبيهات فورية تظهر في نظام التشغيل عند ورود طلبات أو رسائل جديدة للمنشأة.
                        </p>
                      </div>
                    </div>
                  <ToggleSwitch
                    checked={settings.channels.browser.enabled}
                    label="تفعيل إشعارات المتصفح"
                    onChange={handleBrowserChannelToggle}
                  />
                </div>

                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                      <div
                        className={`flex items-start gap-2 text-sm ${
                          browserPermission === "denied"
                            ? "text-red-600 dark:text-red-300"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        <InformationCircleIcon
                          className={`mt-0.5 h-5 w-5 ${
                            browserPermission === "denied"
                              ? "text-red-500"
                              : "text-blue-500"
                          }`}
                        />
                        <span>
                          {browserPermissionAction?.helper ||
                            "إشعارات المتصفح مفعلة وجاهزة للمزامنة."}
                        </span>
                      </div>
                    {browserPermissionAction ? (
                      <button
                        type="button"
                        onClick={handleRequestBrowserPermission}
                        className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                      >
                        {browserPermissionAction.label}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      إبقاء الإشعار ظاهرًا حتى يتم إغلاقه
                    </span>
                    <ToggleSwitch
                      checked={settings.channels.browser.requireInteraction}
                      label="إبقاء إشعار المتصفح ظاهرًا"
                      onChange={(checked) =>
                        updateSettings(
                          "channels.browser.requireInteraction",
                          checked,
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      عرض معاينة مختصرة داخل التنبيه
                    </span>
                    <ToggleSwitch
                      checked={settings.channels.browser.showPreview}
                      label="عرض معاينة إشعار المتصفح"
                      onChange={(checked) =>
                        updateSettings("channels.browser.showPreview", checked)
                      }
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/40">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                        تجربة إشعار المتصفح
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        اختبار فوري لظهور إشعار سطح المكتب والنظام على هذا الجهاز.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const shown = showBrowserNotification({
                          title: "تجربة إشعار المتصفح - منصة ماكس بي",
                          body: "هذا إشعار تجريبي للتأكد من وصول التنبيهات المباشرة إلى جهازك بنجاح.",
                          tag: "browser-test-instant",
                          requireInteraction: settings.channels.browser.requireInteraction,
                        });
                        if (shown) {
                          setFeedback({
                            type: "success",
                            message: "تم إظهار الإشعار التجريبي بنجاح.",
                          });
                        } else {
                          setFeedback({
                            type: "info",
                            message:
                              browserPermission === "denied"
                                ? "الإشعارات محظورة في متصفحك. اسمح بها من شريط العنوان."
                                : "اضغط على زر 'طلب إذن المتصفح' أولاً للسماح بالإشعارات.",
                          });
                        }
                      }}
                      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <PlayIcon className="ml-1.5 h-3.5 w-3.5 text-primary" />
                      إرسال إشعار تجريبي الآن
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start">
                    <EnvelopeIcon className="ml-3 h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        البريد الإلكتروني
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ملخصات أو تنبيهات فورية عبر البريد.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.channels.email.enabled}
                    label="تفعيل البريد الإلكتروني"
                    onChange={(checked) =>
                      updateSettings("channels.email.enabled", checked)
                    }
                  />
                </div>

                {settings.channels.email.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2 dark:border-gray-700">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        عنوان البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={settings.channels.email.address}
                        onChange={(event) =>
                          updateSettings(
                            "channels.email.address",
                            event.target.value,
                          )
                        }
                        placeholder="example@domain.com"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        تكرار الإرسال
                      </label>
                      <select
                        value={settings.channels.email.frequency}
                        onChange={(event) =>
                          updateSettings(
                            "channels.email.frequency",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="immediate">فوري</option>
                        <option value="hourly">كل ساعة</option>
                        <option value="daily">يومي</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        تنسيق الرسالة
                      </label>
                      <select
                        value={settings.channels.email.format}
                        onChange={(event) =>
                          updateSettings(
                            "channels.email.format",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="html">HTML</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start">
                    <ChatBubbleLeftRightIcon className="ml-3 h-6 w-6 text-purple-600" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        الرسائل النصية
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        تنبيه مختصر على الجوال للحالات المهمة.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={settings.channels.sms.enabled}
                    label="تفعيل الرسائل النصية"
                    onChange={(checked) =>
                      updateSettings("channels.sms.enabled", checked)
                    }
                  />
                </div>

                {settings.channels.sms.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2 dark:border-gray-700">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={settings.channels.sms.phoneNumber}
                        onChange={(event) =>
                          updateSettings(
                            "channels.sms.phoneNumber",
                            event.target.value,
                          )
                        }
                        placeholder="+966501234567"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        تكرار الإرسال
                      </label>
                      <select
                        value={settings.channels.sms.frequency}
                        onChange={(event) =>
                          updateSettings(
                            "channels.sms.frequency",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="immediate">فوري</option>
                        <option value="hourly">كل ساعة</option>
                        <option value="daily">يومي</option>
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "types" ? (
        <div className="space-y-4">
          {notificationTypes.map((type) => {
            const typePreference = getTypePreference(type);
            const channelsVisible = typePreference.enabled || !type.canDisable;

            return (
              <div
                key={type.id}
                className="rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {type.name}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityColor(
                          type.priority,
                        )}`}
                      >
                        {type.priority === "high"
                          ? "عالية"
                          : type.priority === "medium"
                            ? "متوسطة"
                            : "منخفضة"}
                      </span>
                      {!type.canDisable ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          أساسي
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {type.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => handleTestNotification(type)}
                      className="rounded-lg border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50"
                      title="اختبار الإشعار"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                    <ToggleSwitch
                      checked={typePreference.enabled}
                      disabled={!type.canDisable}
                      label={`تفعيل ${type.name}`}
                      onChange={(checked) =>
                        handleToggleTypeEnabled(type, checked)
                      }
                    />
                  </div>
                </div>

                {channelsVisible ? (
                  <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          القنوات المفعلة
                        </span>
                        {type.channels.includes("browser") ? (
                          <span className="text-xs text-blue-600 dark:text-blue-300">
                            {!settings.channels.browser.enabled
                              ? "فعّل إشعار المتصفح من الإعدادات العامة أولًا"
                              : browserPermission !== "granted"
                                ? "اسمح بإذن المتصفح أولًا ليعمل إشعار المتصفح هنا"
                                : "يمكنك تشغيل إشعار المتصفح لهذا النوع تحديدًا"}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {type.channels.map((channel) => {
                          const checked = typePreference.channels.includes(channel);
                          const browserGloballyEnabled =
                            settings.channels.browser.enabled;
                          const isBrowserOption =
                            channel === "browser" &&
                            browserPermission !== "granted";
                          const displayChecked =
                            channel === "browser" && !browserGloballyEnabled
                              ? false
                              : checked;

                          return (
                            <label
                              key={channel}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                                displayChecked
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white text-gray-700"
                              } ${isBrowserOption ? "opacity-80" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={displayChecked}
                                aria-label={`${getChannelName(channel)} لـ ${type.name}`}
                                onChange={(event) =>
                                  handleToggleTypeChannel(
                                    type,
                                    channel,
                                    event.target.checked,
                                  )
                                }
                                disabled={channel === "browser" && !browserGloballyEnabled}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="flex items-center gap-2">
                                {getChannelIcon(channel)}
                                <span>{getChannelName(channel)}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {activeTab === "stats" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <BellIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    إجمالي المرسل
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.delivered.total ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    معدل الفتح
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {Math.round((stats?.engagement.openRate ?? 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <ClockIcon className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    وقت الاستجابة
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.engagement.responseTime ?? 0}ث
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <ComputerDesktopIcon className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    القناة المفضلة
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getChannelName(stats?.preferences.mostUsedChannel || "push")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              توزيع القنوات
            </h2>
            <div className="space-y-3">
              {Object.entries(stats?.delivered.byChannel || {}).map(
                ([channel, count]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-700/40"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      {getChannelIcon(channel as NotificationChannelId)}
                      <span>{getChannelName(channel)}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {count}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              الاتجاهات الأسبوعية
            </h2>

            {stats?.trends.length ? (
              <div className="space-y-3">
                {stats.trends.map((trend) => (
                  <div
                    key={trend.period}
                    className="flex flex-col gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-700/40 md:flex-row md:items-center md:justify-between"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trend.period}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-gray-600 dark:text-gray-300">
                      <span>مرسل: {trend.delivered}</span>
                      <span>مفتوح: {trend.opened}</span>
                      <span>نقرات: {trend.clicked}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                لا توجد بيانات كافية بعد لعرض اتجاهات الإشعارات.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationSettings;
