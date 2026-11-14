import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Save,
  Send,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

interface OrderStatusItem {
  id?: string;
  code: string;
  name: string;
  color?: string;
  isTerminal?: boolean;
}

interface TeamUserItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
}

interface ChannelStatusMeta {
  inApp?: { available: boolean };
  whatsapp?: { available: boolean; phoneNumber?: string | null };
  telegram?: { available: boolean; mode?: string | null };
}

export interface StatusAlertSettings {
  enabled: boolean;
  statuses: string[];
  channels: {
    inApp: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  recipients: {
    roles: string[];
    userIds: string[];
    phones: string[];
    telegramChatIds: string[];
  };
  windowMinutes: number;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

interface TestAlertResult {
  inApp: boolean;
  whatsapp: {
    success: boolean;
    reason?: string | null;
  };
  telegram?: {
    success: boolean;
    reason?: string | null;
  };
}

interface StatusAlertsSettingsProps {
  isEmbedded?: boolean;
}

const FALLBACK_STATUSES: OrderStatusItem[] = [
  { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B", isTerminal: false },
  { code: "CONFIRMED", name: "مؤكد", color: "#3B82F6", isTerminal: false },
  { code: "PROCESSING", name: "قيد التجهيز", color: "#8B5CF6", isTerminal: false },
  { code: "READY_TO_SHIP", name: "جاهز للشحن", color: "#06B6D4", isTerminal: false },
  { code: "SHIPPED", name: "تم الشحن", color: "#6366F1", isTerminal: false },
  { code: "OUT_FOR_DELIVERY", name: "خرج للتوصيل", color: "#0EA5E9", isTerminal: false },
  { code: "DELIVERED", name: "تم التوصيل", color: "#10B981", isTerminal: true },
  { code: "CANCELLED", name: "ملغي", color: "#EF4444", isTerminal: true },
  { code: "RETURNED", name: "مرتجع", color: "#F97316", isTerminal: true },
];

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "OWNER", label: "المالك (OWNER)" },
  { value: "COMPANY_ADMIN", label: "مدير الشركة (COMPANY_ADMIN)" },
  { value: "MANAGER", label: "مدير (MANAGER)" },
  { value: "AGENT", label: "موظف (AGENT)" },
];

const WINDOW_PRESETS = [0, 5, 15, 30, 60];

const DEFAULT_SETTINGS: StatusAlertSettings = {
  enabled: true,
  statuses: ["SHIPPED"],
  channels: { inApp: true, whatsapp: true, telegram: false },
  recipients: {
    roles: ["OWNER", "COMPANY_ADMIN", "MANAGER"],
    userIds: [],
    phones: [],
    telegramChatIds: [],
  },
  windowMinutes: 5,
  updatedBy: null,
  updatedAt: null,
};

function normalizeClientSettings(raw?: Partial<StatusAlertSettings> | null): StatusAlertSettings {
  const source = raw || {};
  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : true,
    statuses: Array.isArray(source.statuses) ? source.statuses : ["SHIPPED"],
    channels: {
      inApp: source.channels?.inApp ?? true,
      whatsapp: source.channels?.whatsapp ?? true,
      telegram: source.channels?.telegram ?? false,
    },
    recipients: {
      roles: Array.isArray(source.recipients?.roles)
        ? source.recipients.roles
        : [...DEFAULT_SETTINGS.recipients.roles],
      userIds: Array.isArray(source.recipients?.userIds) ? source.recipients.userIds : [],
      phones: Array.isArray(source.recipients?.phones) ? source.recipients.phones : [],
      telegramChatIds: Array.isArray(source.recipients?.telegramChatIds)
        ? source.recipients.telegramChatIds
        : [],
    },
    windowMinutes:
      typeof source.windowMinutes === "number" && Number.isFinite(source.windowMinutes)
        ? source.windowMinutes
        : 5,
    updatedBy: source.updatedBy ?? null,
    updatedAt: source.updatedAt ?? null,
  };
}

function normalizePhoneCompareKey(phone: string): string {
  return String(phone || "")
    .trim()
    .replace(/[\s\-()]/g, "");
}

export const StatusAlertsSettings: React.FC<StatusAlertsSettingsProps> = ({
  isEmbedded = false,
}) => {
  const [settings, setSettings] = useState<StatusAlertSettings>(DEFAULT_SETTINGS);
  const [windowInput, setWindowInput] = useState<string>("5");
  const [statuses, setStatuses] = useState<OrderStatusItem[]>(FALLBACK_STATUSES);
  const [teamUsers, setTeamUsers] = useState<TeamUserItem[]>([]);
  const [channelStatus, setChannelStatus] = useState<ChannelStatusMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newTelegramChatId, setNewTelegramChatId] = useState("");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestAlertResult | null>(null);

  const saveSeqRef = useRef(0);
  const windowDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettingsContext = useCallback(async () => {
    try {
      const res = await apiClient.get("/order-status-alerts");
      if (res.data?.success && res.data?.data) {
        const normalized = normalizeClientSettings(res.data.data);
        setSettings(normalized);
        setWindowInput(String(normalized.windowMinutes));

        const meta = res.data?.meta;
        if (meta) {
          if (Array.isArray(meta.statuses) && meta.statuses.length > 0) {
            setStatuses(meta.statuses);
          }
          if (Array.isArray(meta.teamUsers)) {
            setTeamUsers(meta.teamUsers);
          }
          if (meta.channelStatus) {
            setChannelStatus(meta.channelStatus);
          }
        }
        return Boolean(meta?.statuses?.length);
      }
    } catch (error) {
      console.error("Error fetching status alert settings:", error);
      toast.error("تعذر تحميل إعدادات تنبيهات الحالات");
    }
    return false;
  }, []);

  const fetchFallbackStatuses = useCallback(async () => {
    try {
      const res = await apiClient.get("/order-workflow/statuses");
      const list = res.data?.data;
      if (res.data?.success && Array.isArray(list) && list.length > 0) {
        setStatuses(list);
      }
    } catch (error) {
      console.warn("Using fallback order statuses:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const gotMetaStatuses = await loadSettingsContext();
      if (!gotMetaStatuses) {
        await fetchFallbackStatuses();
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
      if (windowDebounceRef.current) {
        clearTimeout(windowDebounceRef.current);
      }
    };
  }, [loadSettingsContext, fetchFallbackStatuses]);

  const persistSettings = async (
    next: StatusAlertSettings,
    previous?: StatusAlertSettings,
  ) => {
    const seq = ++saveSeqRef.current;
    try {
      setSaving(true);
      const res = await apiClient.put("/order-status-alerts", {
        enabled: next.enabled,
        statuses: next.statuses,
        channels: next.channels,
        recipients: next.recipients,
        windowMinutes: next.windowMinutes,
      });

      if (seq !== saveSeqRef.current) return;

      if (res.data?.success) {
        if (res.data?.data) {
          const confirmed = normalizeClientSettings(res.data.data);
          setSettings(confirmed);
          setWindowInput(String(confirmed.windowMinutes));
        }
        const timestamp = new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setSavedNotice(`تم الحفظ (${timestamp})`);
        toast.success("تم حفظ إعدادات تنبيهات الحالات بنجاح");
      } else {
        if (previous) {
          setSettings(previous);
          setWindowInput(String(previous.windowMinutes));
        }
        toast.error(res.data?.message || "تعذر حفظ الإعدادات");
      }
    } catch (error: any) {
      if (seq !== saveSeqRef.current) return;
      if (previous) {
        setSettings(previous);
        setWindowInput(String(previous.windowMinutes));
      }
      console.error("Error saving status alert settings:", error);
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      if (seq === saveSeqRef.current) {
        setSaving(false);
      }
    }
  };

  const applyAndPersist = (updater: (prev: StatusAlertSettings) => StatusAlertSettings) => {
    if (saving) return;
    const previous = settings;
    const next = updater(settings);
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleToggleMaster = () => {
    applyAndPersist((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleStatus = (rawCode: string) => {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return;
    applyAndPersist((prev) => {
      const exists = prev.statuses.includes(code);
      return {
        ...prev,
        statuses: exists
          ? prev.statuses.filter((s) => s !== code)
          : [...prev.statuses, code],
      };
    });
  };

  const handleToggleChannel = (channel: "inApp" | "whatsapp" | "telegram") => {
    applyAndPersist((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleToggleRole = (role: string) => {
    applyAndPersist((prev) => {
      const exists = prev.recipients.roles.includes(role);
      return {
        ...prev,
        recipients: {
          ...prev.recipients,
          roles: exists
            ? prev.recipients.roles.filter((r) => r !== role)
            : [...prev.recipients.roles, role],
        },
      };
    });
  };

  const handleToggleUser = (userId: string) => {
    applyAndPersist((prev) => {
      const exists = prev.recipients.userIds.includes(userId);
      return {
        ...prev,
        recipients: {
          ...prev.recipients,
          userIds: exists
            ? prev.recipients.userIds.filter((id) => id !== userId)
            : [...prev.recipients.userIds, userId],
        },
      };
    });
  };

  const handleAddPhone = () => {
    if (saving) return;
    const trimmed = newPhone.trim();
    const compareKey = normalizePhoneCompareKey(trimmed);
    if (!compareKey) return;
    if (!/^\+?[0-9]{8,16}$/.test(compareKey)) {
      toast.error("صيغة رقم الواتساب غير صالحة (أدخل 8-16 رقماً)");
      return;
    }
    if (
      settings.recipients.phones.some((p) => normalizePhoneCompareKey(p) === compareKey)
    ) {
      toast.info("هذا الرقم مضاف بالفعل");
      return;
    }
    setNewPhone("");
    applyAndPersist((prev) => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        phones: [...prev.recipients.phones, trimmed],
      },
    }));
  };

  const handleRemovePhone = (phone: string) => {
    applyAndPersist((prev) => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        phones: prev.recipients.phones.filter((p) => p !== phone),
      },
    }));
  };

  const handleAddTelegramChatId = () => {
    if (saving) return;
    const trimmed = newTelegramChatId.trim();
    if (!trimmed) return;
    if (!/^-?[0-9]{4,20}$/.test(trimmed)) {
      toast.error("معرّف Telegram Chat ID غير صالح (أدخل أرقام فقط مثل 123456789 أو -100...)");
      return;
    }
    if (settings.recipients.telegramChatIds.includes(trimmed)) {
      toast.info("معرّف التيليجرام هذا مضاف بالفعل");
      return;
    }
    setNewTelegramChatId("");
    applyAndPersist((prev) => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        telegramChatIds: [...prev.recipients.telegramChatIds, trimmed],
      },
    }));
  };

  const handleRemoveTelegramChatId = (chatId: string) => {
    applyAndPersist((prev) => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        telegramChatIds: prev.recipients.telegramChatIds.filter((c) => c !== chatId),
      },
    }));
  };

  const handleWindowPreset = (minutes: number) => {
    if (windowDebounceRef.current) {
      clearTimeout(windowDebounceRef.current);
      windowDebounceRef.current = null;
    }
    setWindowInput(String(minutes));
    applyAndPersist((prev) => ({ ...prev, windowMinutes: minutes }));
  };

  const handleWindowInputChange = (rawValue: string) => {
    setWindowInput(rawValue);
    if (rawValue.trim() === "") return;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(1440, Math.round(parsed)));

    const previous = settings;
    const next: StatusAlertSettings = { ...settings, windowMinutes: clamped };
    setSettings(next);

    if (windowDebounceRef.current) {
      clearTimeout(windowDebounceRef.current);
    }
    windowDebounceRef.current = setTimeout(() => {
      void persistSettings(next, previous);
    }, 600);
  };

  const handleSendTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await apiClient.post("/order-status-alerts/test", {
        enabled: settings.enabled,
        statuses: settings.statuses,
        channels: settings.channels,
        recipients: settings.recipients,
        windowMinutes: settings.windowMinutes,
      });
      if (res.data?.success && res.data?.data) {
        const result: TestAlertResult = res.data.data;
        setTestResult(result);
        if (result.inApp || result.whatsapp?.success || result.telegram?.success) {
          toast.success("تم إرسال التنبيه التجريبي");
        } else {
          toast.warning("تمت محاولة الاختبار — راجع حالة القنوات أدناه");
        }
      } else {
        toast.error(res.data?.message || "فشل إرسال التنبيه التجريبي");
      }
    } catch (error: any) {
      console.error("Error sending test status alert:", error);
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء اختبار التنبيه");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2"
        dir="rtl"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium">
          جاري تحميل إعدادات تنبيهات حالات الطلبات...
        </span>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={isEmbedded ? "space-y-4" : "max-w-5xl mx-auto p-4 sm:p-6 space-y-4"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-2xs">
        <div className="space-y-1">
          {!isEmbedded && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                إعدادات الطلبات
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-semibold text-foreground">
                تنبيهات تغيير الحالة
              </span>
            </div>
          )}
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            إعدادات التنبيه الفوري لتغيير حالة الطلب
          </h1>
          <p className="text-xs text-muted-foreground">
            تنبيه فوري للفريق والمالك داخل التطبيق وعبر واتساب وتيليجرام عند انتقال الطلب لأي حالة مختارة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {savedNotice && (
            <span
              data-testid="status-alert-saved-badge"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {savedNotice}
            </span>
          )}
          <button
            type="button"
            data-testid="send-test-alert-btn"
            onClick={handleSendTest}
            disabled={testing || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-primary" />
            )}
            <span>جرّب التنبيه</span>
          </button>
          <button
            type="button"
            onClick={() => void persistSettings(settings)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Test result feedback banner */}
      {testResult && (
        <div
          data-testid="test-alert-result-banner"
          className="bg-card border border-border/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Bell className="w-4 h-4 text-primary" />
            <span>نتيجة اختبار التنبيه:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                testResult.inApp
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              إشعار داخلي: {testResult.inApp ? "تم الإرسال" : "معطل / فشل"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                testResult.whatsapp?.success
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              واتساب:{" "}
              {testResult.whatsapp?.success
                ? "تم الإرسال"
                : `متخطى (${testResult.whatsapp?.reason || "غير متاح"})`}
            </span>
            {testResult.telegram && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                  testResult.telegram.success
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                تيليجرام:{" "}
                {testResult.telegram.success
                  ? "تم الإرسال"
                  : `متخطى (${testResult.telegram.reason || "معطل"})`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Master enable toggle */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-foreground">
            تفعيل تنبيهات تغيير الحالة
          </div>
          <p className="text-xs text-muted-foreground">
            عند التعطيل لن يتم إرسال أي إشعار داخلي أو رسالة واتساب أو تيليجرام تلقائية عند تغيير حالة الطلب
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="تفعيل تنبيهات تغيير الحالة"
          onClick={handleToggleMaster}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            settings.enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              settings.enabled ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Status toggles */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              الحالات المُفعّل لها التنبيه
            </h2>
            <p className="text-xs text-muted-foreground">
              اختر الحالات التي تُطلق تنبيهاً فورياً عند دخول الطلب إليها (الافتراضي: تم الشحن SHIPPED)
            </p>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {settings.statuses.length} حالة مختارة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {statuses.map((status) => {
            const code = String(status.code || "").toUpperCase();
            const isChecked = settings.statuses.includes(code);
            return (
              <button
                key={code}
                type="button"
                role="checkbox"
                aria-checked={isChecked}
                data-status-code={code}
                onClick={() => handleToggleStatus(code)}
                disabled={saving}
                className={`flex items-center justify-between gap-2 p-3 rounded-lg border text-right transition-colors cursor-pointer ${
                  isChecked
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/70 bg-background hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: status.color || "#6B7280" }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {status.name || code}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <span>{code}</span>
                      {status.isTerminal && (
                        <span className="px-1 rounded bg-muted text-[9px]">نهائية</span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    isChecked ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isChecked ? "-translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channels & Dedup Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Channels */}
        <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            قنوات الإرسال
          </h2>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/20 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.channels.inApp}
              onChange={() => handleToggleChannel("inApp")}
              disabled={saving}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary disabled:opacity-50"
            />
            <div className="space-y-0.5 flex-1">
              <div className="text-xs font-semibold text-foreground">
                داخل التطبيق (In-App)
              </div>
              <div className="text-[11px] text-muted-foreground">
                يظهر فوراً في جرس الإشعارات وتوست صفحة الطلبات مع رابط مباشر للطلب
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/20 cursor-pointer">
            <input
              type="checkbox"
              data-testid="channel-whatsapp-checkbox"
              checked={settings.channels.whatsapp}
              onChange={() => handleToggleChannel("whatsapp")}
              disabled={saving}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary disabled:opacity-50"
            />
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  واتساب (WhatsApp)
                </span>
                {channelStatus?.whatsapp && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      channelStatus.whatsapp.available
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                    }`}
                  >
                    {channelStatus.whatsapp.available ? "متصل" : "غير متصل"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                إرسال رسالة فورية مباشرة لرقم المالك والأدوار/الأرقام المختارة
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/20 cursor-pointer">
            <input
              type="checkbox"
              data-testid="channel-telegram-checkbox"
              checked={settings.channels.telegram}
              onChange={() => handleToggleChannel("telegram")}
              disabled={saving}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary disabled:opacity-50"
            />
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  تيليجرام (Telegram)
                </span>
                {channelStatus?.telegram && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      channelStatus.telegram.available
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {channelStatus.telegram.available ? "مهيأ" : "غير مهيأ"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                إرسال تنبيه مباشر عبر بوت أو قناة تيليجرام المربوطة بالشركة
              </div>
            </div>
          </label>
        </div>

        {/* Dedup window */}
        <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            نافذة كتم التكرار (بالدقائق)
          </h2>
          <p className="text-xs text-muted-foreground">
            تمنع تكرار تنبيه نفس الطلب ونفس الحالة خلال هذه المدة (الافتراضي 5 دقائق)
          </p>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={1440}
              aria-label="نافذة كتم التكرار بالدقائق"
              value={windowInput}
              onChange={(e) => handleWindowInputChange(e.target.value)}
              onBlur={() => {
                if (windowInput.trim() === "") {
                  setWindowInput(String(settings.windowMinutes));
                }
              }}
              className="w-28 h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono tabular-nums"
            />
            <span className="text-xs text-muted-foreground">دقيقة</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {WINDOW_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleWindowPreset(m)}
                disabled={saving}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                  settings.windowMinutes === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {m === 0 ? "بدون كتم" : `${m} د`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            مستقبلو التنبيهات (المالك والفريق والأرقام)
          </h2>
          <p className="text-xs text-muted-foreground">
            يتم الإرسال افتراضياً للمالك والمديرين، ويمكنك تحديد مستخدمين بعينهم أو أرقام واتساب ومعرّفات تيليجرام إضافية
          </p>
        </div>

        {/* Roles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((role) => {
            const checked = settings.recipients.roles.includes(role.value);
            return (
              <label
                key={role.value}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/70 hover:bg-muted/20 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleRole(role.value)}
                  disabled={saving}
                  className="h-4 w-4 rounded border-border text-primary disabled:opacity-50"
                />
                <span className="text-xs font-medium text-foreground">{role.label}</span>
              </label>
            );
          })}
        </div>

        {/* Specific team users */}
        {teamUsers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>مستخدمون محددون من الفريق ({settings.recipients.userIds.length} مختار)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {teamUsers.map((u) => {
                const checked = settings.recipients.userIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                      checked
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/70 hover:bg-muted/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleUser(u.id)}
                      disabled={saving}
                      className="h-3.5 w-3.5 rounded border-border text-primary shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{u.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {u.role}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual WhatsApp phones */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-primary" />
            أرقام واتساب إضافية (يدوية)
          </label>
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPhone();
                }
              }}
              placeholder="مثال: 201012345678"
              dir="ltr"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleAddPhone}
              disabled={!newPhone.trim() || saving}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رقم</span>
            </button>
          </div>

          {settings.recipients.phones.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {settings.recipients.phones.map((phone) => (
                <span
                  key={phone}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border/70 text-xs font-mono"
                  dir="ltr"
                >
                  <span>{phone}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(phone)}
                    disabled={saving}
                    className="text-destructive hover:opacity-80 disabled:opacity-50 cursor-pointer"
                    aria-label={`حذف ${phone}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>
                لا توجد أرقام يدوية مضافة — سيتم الإرسال لأرقام المالك والأدوار المختارة تلقائياً
              </span>
            </div>
          )}
        </div>

        {/* Telegram Chat IDs */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-primary" />
            معرّفات تيليجرام (Telegram Chat IDs)
          </label>
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newTelegramChatId}
              onChange={(e) => setNewTelegramChatId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTelegramChatId();
                }
              }}
              placeholder="مثال: 123456789 أو -1001234567890"
              dir="ltr"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleAddTelegramChatId}
              disabled={!newTelegramChatId.trim() || saving}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة معرّف</span>
            </button>
          </div>

          {settings.recipients.telegramChatIds.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {settings.recipients.telegramChatIds.map((chatId) => (
                <span
                  key={chatId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border/70 text-xs font-mono"
                  dir="ltr"
                >
                  <span>{chatId}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTelegramChatId(chatId)}
                    disabled={saving}
                    className="text-destructive hover:opacity-80 disabled:opacity-50 cursor-pointer"
                    aria-label={`حذف ${chatId}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusAlertsSettings;
