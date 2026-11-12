import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import {
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
  AlertTriangle,
} from "lucide-react";

interface OrderStatusItem {
  id?: string;
  code: string;
  name: string;
  color?: string;
  isTerminal?: boolean;
}

interface StatusAlertSettings {
  enabled: boolean;
  statuses: string[];
  channels: {
    inApp: boolean;
    whatsapp: boolean;
  };
  recipients: {
    roles: string[];
    phones: string[];
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
  { value: "COMPANY_ADMIN", label: "مدير الشركة (COMPANY_ADMIN)" },
  { value: "MANAGER", label: "مدير (MANAGER)" },
  { value: "OWNER", label: "المالك (OWNER)" },
  { value: "AGENT", label: "موظف (AGENT)" },
];

const WINDOW_PRESETS = [0, 5, 15, 30, 60];

const DEFAULT_SETTINGS: StatusAlertSettings = {
  enabled: true,
  statuses: ["SHIPPED"],
  channels: { inApp: true, whatsapp: true },
  recipients: { roles: ["COMPANY_ADMIN", "MANAGER"], phones: [] },
  windowMinutes: 5,
  updatedBy: null,
  updatedAt: null,
};

export const StatusAlertsSettings: React.FC = () => {
  const [settings, setSettings] = useState<StatusAlertSettings>(DEFAULT_SETTINGS);
  const [statuses, setStatuses] = useState<OrderStatusItem[]>(FALLBACK_STATUSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestAlertResult | null>(null);

  const fetchSettings = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await apiClient.get("/order-status-alerts");
      if (res.data?.success && res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching status alert settings:", error);
      toast.error("تعذر تحميل إعدادات تنبيهات الحالات");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
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
      await Promise.all([fetchSettings(false), fetchStatuses()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchSettings, fetchStatuses]);

  const persistSettings = async (
    next: StatusAlertSettings,
    previous?: StatusAlertSettings,
  ) => {
    try {
      setSaving(true);
      const res = await apiClient.put("/order-status-alerts", next);
      if (res.data?.success) {
        await fetchSettings(false);
        const timestamp = new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setSavedNotice(`تم الحفظ (${timestamp})`);
        toast.success("تم حفظ إعدادات تنبيهات الحالات بنجاح");
      } else {
        if (previous) setSettings(previous);
        toast.error(res.data?.message || "تعذر حفظ الإعدادات");
      }
    } catch (error: any) {
      if (previous) setSettings(previous);
      console.error("Error saving status alert settings:", error);
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaster = () => {
    if (saving) return;
    const previous = settings;
    const next: StatusAlertSettings = { ...settings, enabled: !settings.enabled };
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleToggleStatus = (rawCode: string) => {
    if (saving) return;
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return;
    const previous = settings;
    const exists = settings.statuses.includes(code);
    const nextStatuses = exists
      ? settings.statuses.filter((s) => s !== code)
      : [...settings.statuses, code];
    const next: StatusAlertSettings = { ...settings, statuses: nextStatuses };
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleToggleChannel = (channel: "inApp" | "whatsapp") => {
    if (saving) return;
    const previous = settings;
    const next: StatusAlertSettings = {
      ...settings,
      channels: {
        ...settings.channels,
        [channel]: !settings.channels[channel],
      },
    };
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleToggleRole = (role: string) => {
    if (saving) return;
    const previous = settings;
    const exists = settings.recipients.roles.includes(role);
    const nextRoles = exists
      ? settings.recipients.roles.filter((r) => r !== role)
      : [...settings.recipients.roles, role];
    const next: StatusAlertSettings = {
      ...settings,
      recipients: {
        ...settings.recipients,
        roles: nextRoles,
      },
    };
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleAddPhone = () => {
    if (saving) return;
    const trimmed = newPhone.trim();
    if (!trimmed) return;
    if (settings.recipients.phones.includes(trimmed)) {
      toast.info("هذا الرقم مضاف بالفعل");
      return;
    }
    const previous = settings;
    const next: StatusAlertSettings = {
      ...settings,
      recipients: {
        ...settings.recipients,
        phones: [...settings.recipients.phones, trimmed],
      },
    };
    setNewPhone("");
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleRemovePhone = (phone: string) => {
    if (saving) return;
    const previous = settings;
    const next: StatusAlertSettings = {
      ...settings,
      recipients: {
        ...settings.recipients,
        phones: settings.recipients.phones.filter((p) => p !== phone),
      },
    };
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleWindowPreset = (minutes: number) => {
    if (saving) return;
    const previous = settings;
    const next: StatusAlertSettings = { ...settings, windowMinutes: minutes };
    setSettings(next);
    void persistSettings(next, previous);
  };

  const handleSendTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await apiClient.post("/order-status-alerts/test");
      if (res.data?.success && res.data?.data) {
        const result: TestAlertResult = res.data.data;
        setTestResult(result);
        if (result.inApp || result.whatsapp?.success) {
          toast.success("تم تنفيذ اختبار التنبيه بنجاح");
        } else {
          toast.warning("تمت محاولة الاختبار — راجع تفاصيل القنوات أدناه");
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
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium">جاري تحميل إعدادات تنبيهات حالات الطلبات...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">تنبيهات تغيير الحالة</span>
          </div>
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            إعدادات التنبيه الفوري لحالات الطلبات (Quick Status)
          </h1>
          <p className="text-xs text-muted-foreground">
            تنبيه فوري للفريق والمالك داخل النظام وعبر واتساب عند انتقال الطلب لأي حالة مختارة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {savedNotice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {savedNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-primary" />}
            <span>جرّب التنبيه</span>
          </button>
          <button
            type="button"
            onClick={() => void persistSettings(settings)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Test result feedback banner */}
      {testResult && (
        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Bell className="w-4 h-4 text-primary" />
            <span>نتيجة اختبار التنبيه:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                testResult.inApp
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              إشعار داخلي: {testResult.inApp ? "تم الإرسال" : "لم يُرسل"}
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
          </div>
        </div>
      )}

      {/* Master enable toggle */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-foreground">تفعيل تنبيهات تغيير الحالة</div>
          <p className="text-xs text-muted-foreground">
            عند التعطيل لن يتم إرسال أي إشعار داخلي أو رسالة واتساب تلقائية عند تغيير حالة الطلب
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
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
            <h2 className="text-sm font-semibold text-foreground">الحالات المُفعّل لها التنبيه</h2>
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
                    <div className="text-xs font-semibold text-foreground truncate">{status.name || code}</div>
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
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">إشعار داخلي داخل النظام (In-App)</div>
              <div className="text-[11px] text-muted-foreground">
                يظهر فوراً في جرس الإشعارات وتوست المتصفح مع صوت التنبيه ورابط الطلب
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/20 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.channels.whatsapp}
              onChange={() => handleToggleChannel("whatsapp")}
              disabled={saving}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary disabled:opacity-50"
            />
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">واتساب للمالك / الفريق</div>
              <div className="text-[11px] text-muted-foreground">
                يُرسل عبر قالب ANNOUNCEMENT المعتمد بدون إرسال نص حر
              </div>
            </div>
          </label>
        </div>

        {/* Dedup window */}
        <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            نافذة منع التكرار (بالدقائق)
          </h2>
          <p className="text-xs text-muted-foreground">
            تمنع تكرار تنبيه نفس الطلب ونفس الحالة خلال هذه المدة (الافتراضي 5 دقائق)
          </p>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={1440}
              value={settings.windowMinutes}
              onChange={(e) => {
                const val = Math.max(0, Math.min(1440, Number(e.target.value) || 0));
                setSettings((prev) => ({ ...prev, windowMinutes: val }));
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
            مستقبلو تنبيهات الواتساب
          </h2>
          <p className="text-xs text-muted-foreground">
            يتم الإرسال لأرقام أصحاب الأدوار المختارة + الأرقام اليدوية، مع الرجوع لرقم واتساب المالك أو هاتف الشركة عند عدم وجود أرقام
          </p>
        </div>

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
              <span>إضافة</span>
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
              <span>لا توجد أرقام يدوية مضافة — سيتم الاعتماد على أرقام الأدوار المختارة ثم رقم المالك/الشركة</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusAlertsSettings;
