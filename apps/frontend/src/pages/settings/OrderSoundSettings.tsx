import React, { useEffect, useState } from "react";
import {
  BellRing,
  Volume2,
  Save,
  Check,
  Loader2,
  Radio,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import api from "../../services/api";
import {
  cacheNotificationSettings,
  type NotificationSettingsData,
} from "../../utils/notificationSettings";
import { OrderSoundChannelCard } from "./OrderSoundChannelCard";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

const createLocalSettings = (
  raw?: Partial<NotificationSettingsData> | null
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
    incompleteSound: raw?.channels?.incompleteSound || {
      enabled: true,
      volume: 100,
      pattern: "coins",
    },
  },
  typeSettings: raw?.typeSettings || {},
});

export const OrderSoundSettings: React.FC = () => {
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
      if (!previous) return previous;
      const next = JSON.parse(JSON.stringify(previous)) as NotificationSettingsData;
      next.channels.sound = {
        ...next.channels.sound,
        [path]: value,
      };
      return next;
    });
    setFeedback(null);
  };

  const updateIncompleteSound = (
    path: "enabled" | "volume" | "pattern",
    value: unknown
  ) => {
    setSettings((previous) => {
      if (!previous) return previous;
      const next = JSON.parse(JSON.stringify(previous)) as NotificationSettingsData;
      next.channels.incompleteSound = {
        ...next.channels.incompleteSound,
        [path]: value,
      };
      return next;
    });
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!settings || !userId) return;

    try {
      setSaving(true);
      setFeedback(null);

      const response = await api.put(
        `/notifications/settings/${userId}`,
        settings
      );
      const savedSettings = createLocalSettings(response.data?.data);
      setSettings(savedSettings);
      cacheNotificationSettings(savedSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل إعدادات الصوت...</span>
      </div>
    );
  }

  const sound = settings?.channels.sound || {
    enabled: true,
    volume: 100,
    pattern: "cash",
  };

  const incompleteSound = settings?.channels.incompleteSound || {
    enabled: true,
    volume: 100,
    pattern: "coins",
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">تنبيهات الأصوات المباشرة</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            منظومة تنبيهات الأصوات المباشرة (Live Audio Alerts)
          </h2>
          <p className="text-xs text-muted-foreground">
            تخصيص النغمات الصوتية وارتفاع الصوت للطلبات الجديدة والسلات غير المكتملة للتنبيه الفوري داخل المكتب
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {feedback && (
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                feedback.type === "error"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {feedback.message}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>تم الحفظ</span>
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التفضيلات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>صوت الطلبات المكتملة</span>
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {sound.enabled ? `${sound.volume}%` : "معطل"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${
              sound.enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              {sound.enabled ? sound.pattern : "Muted"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>صوت السلات غير المكتملة</span>
            <BellRing className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {incompleteSound.enabled ? `${incompleteSound.volume}%` : "معطل"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${
              incompleteSound.enabled ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-muted text-muted-foreground"
            }`}>
              {incompleteSound.enabled ? incompleteSound.pattern : "Muted"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>قناة البث اللحظي (WebSockets)</span>
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">متصل ومباشر</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Live Socket
            </span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Audio Channels */}
      <div className="space-y-4">
        {/* Channel 1: High alert order sound */}
        <OrderSoundChannelCard
          title="صوت الطلبات الجديدة (صفارة عالية)"
          description="تنبيه صوتي مسموع يطلق فورياً عبر المتصفح بمجرد اكتمال طلب جديد من العميل لتنبيه فريق التأكيد والشحن دون الحاجة للجلوس أمام الشاشة."
          badge="High Alert"
          icon={Volume2}
          sound={sound}
          onUpdate={updateSound}
          accentColor="amber"
        />

        {/* Channel 2: Incomplete order soft sound */}
        <OrderSoundChannelCard
          title="صوت الطلبات والسلات غير المكتملة"
          description="نغمة صوتية هادئة تعمل تلقائياً عندما يبدأ عميل إدخال بياناته بالمتجر ويتوقف قبل إتمام الطلب، لتنبيه فريق الدعم والمبيعات للمتابعة الفورية."
          badge="Soft Ping"
          icon={BellRing}
          sound={incompleteSound}
          onUpdate={updateIncompleteSound}
          accentColor="teal"
        />
      </div>
    </div>
  );
};

export default OrderSoundSettings;
