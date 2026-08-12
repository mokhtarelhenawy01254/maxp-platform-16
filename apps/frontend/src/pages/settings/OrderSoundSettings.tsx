import React, { useEffect, useState } from "react";
import { BellRing, Check, Play, Save, Volume2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import api from "../../services/api";
import { socketService } from "../../services/socketService";
import {
  ORDER_SOUND_PATTERNS,
  type OrderSoundPattern,
} from "../../services/orderSoundPatterns";
import {
  cacheNotificationSettings,
  type NotificationSettingsData,
} from "../../utils/notificationSettings";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

const createLocalSettings = (
  raw?: Partial<NotificationSettingsData> | null,
): NotificationSettingsData => ({
  userId: String(raw?.userId || ""),
  companyId: String(raw?.companyId || ""),
  globalEnabled: raw?.globalEnabled ?? true,
  quietHours: raw?.quietHours || {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    timezone: "Africa/Cairo",
  },
  channels: {
    push: raw?.channels?.push || {
      enabled: true,
      sound: true,
      vibration: true,
      badge: true,
    },
    email: raw?.channels?.email || {
      enabled: true,
      address: "",
      frequency: "immediate",
      format: "html",
    },
    sms: raw?.channels?.sms || {
      enabled: false,
      phoneNumber: "",
      frequency: "immediate",
    },
    inApp: raw?.channels?.inApp || {
      enabled: true,
      showBadge: true,
      autoMarkRead: false,
    },
    browser: raw?.channels?.browser || {
      enabled: false,
      showPreview: true,
      requireInteraction: false,
    },
    sound: raw?.channels?.sound || {
      enabled: true,
      volume: 100,
      pattern: "cash",
    },
  },
  typeSettings: raw?.typeSettings || {},
});

const OrderSoundSettings: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    api
      .get(`/notifications/settings/${userId}`)
      .then((response) => {
        if (!cancelled) {
          setSettings(createLocalSettings(response.data?.data));
        }
      })
      .catch((error) => {
        console.error("Error loading order sound settings:", error);
        if (!cancelled) {
          setFeedback({
            type: "error",
            message: "تعذر تحميل إعدادات الصوت الآن.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const updateSound = (path: "enabled" | "volume" | "pattern", value: unknown) => {
    setSettings((previous) => {
      if (!previous) {
        return previous;
      }
      const next = JSON.parse(JSON.stringify(previous)) as NotificationSettingsData;
      next.channels.sound = {
        ...next.channels.sound,
        [path]: value,
      };
      return next;
    });
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!settings || !userId) {
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const response = await api.put(
        `/notifications/settings/${userId}`,
        settings,
      );
      const savedSettings = createLocalSettings(response.data?.data);
      setSettings(savedSettings);
      cacheNotificationSettings(savedSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving order sound settings:", error);
      setFeedback({
        type: "error",
        message: "فشل حفظ الإعدادات. حاول مرة أخرى.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          جاري تحميل إعدادات الصوت...
        </p>
      </div>
    );
  }

  const sound = settings?.channels.sound || {
    enabled: true,
    volume: 100,
    pattern: "cash",
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-6 dark:border-amber-900/40 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start">
          <Volume2 className="ml-3 h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              صوت الطلبات (إنذار عالي)
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              صفّارة عالية تُطلق تلقائياً بمجرد وصول أي طلب جديد من المتجر
              لتنبيه الموظفين في المكان — وليس مجرد إشعار صامت.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateSound("enabled", !sound.enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            sound.enabled ? "bg-amber-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
          aria-pressed={sound.enabled}
          aria-label="تفعيل صوت الطلبات"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              sound.enabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {sound.enabled ? (
        <div className="mt-5 space-y-4 border-t border-amber-100 pt-4 dark:border-amber-900/20">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                مستوى الصوت
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sound.volume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sound.volume}
              onChange={(event) =>
                updateSound("volume", Number(event.target.value))
              }
              className="w-full accent-amber-600"
              aria-label="مستوى صوت الطلبات"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                النغمة
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ORDER_SOUND_PATTERNS.map((pattern) => {
                const isSelected = sound.pattern === pattern.id;
                return (
                  <button
                    key={pattern.id}
                    type="button"
                    onClick={() =>
                      updateSound("pattern", pattern.id as OrderSoundPattern)
                    }
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      isSelected
                        ? "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100"
                        : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-amber-800"
                    }`}
                  >
                    <span className="flex flex-col items-start">
                      <span className="font-medium">{pattern.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {pattern.description}
                      </span>
                    </span>
                    {isSelected ? (
                      <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                socketService.testOrderSound(
                  (sound.volume ?? 100) / 100,
                  (sound.pattern || "cash") as OrderSoundPattern,
                );
              }}
              className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              <Play className="ml-2 h-4 w-4" />
              تجربة الصوت
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              اضغط للاستماع إلى النغمة المختارة قبل الحفظ.
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saved ? (
            <Check className="ml-2 h-4 w-4" />
          ) : (
            <Save className="ml-2 h-4 w-4" />
          )}
          {saved ? "تم الحفظ" : saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>

        {feedback ? (
          <span
            className={`text-sm ${
              feedback.type === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {feedback.message}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default OrderSoundSettings;
