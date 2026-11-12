import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  Clock,
  Loader2,
  MessageSquare,
  Moon,
  Save,
  ShieldAlert,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";

interface EscalationSettingsState {
  enabled: boolean;
  level1Days: number;
  level2Days: number;
  level3Days: number;
  channels: {
    inApp: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  notifyManager: boolean;
  notifyOwner: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  updatedBy?: string | null;
  updatedAt?: string | null;
}

const DEFAULT_SETTINGS: EscalationSettingsState = {
  enabled: true,
  level1Days: 0,
  level2Days: 1,
  level3Days: 3,
  channels: {
    inApp: true,
    push: true,
    whatsapp: true,
  },
  notifyManager: true,
  notifyOwner: true,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone: "Africa/Cairo",
  },
  updatedBy: null,
  updatedAt: null,
};

export const TaskEscalationSettings: React.FC = () => {
  const [settings, setSettings] = useState<EscalationSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/tasks/escalation/settings");
      if (res.data?.success && res.data?.data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...res.data.data,
          channels: {
            ...DEFAULT_SETTINGS.channels,
            ...(res.data.data.channels || {}),
          },
          quietHours: {
            ...DEFAULT_SETTINGS.quietHours,
            ...(res.data.data.quietHours || {}),
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch task escalation settings:", error);
      toast.error("تعذر تحميل إعدادات تصعيد المهام");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const validateLocally = (next: EscalationSettingsState): string | null => {
    if (!Number.isInteger(next.level1Days) || next.level1Days < 0) {
      return "أيام المستوى الأول يجب أن تكون 0 أو أكثر";
    }
    if (!Number.isInteger(next.level2Days) || next.level2Days <= next.level1Days) {
      return "أيام المستوى الثاني يجب أن تكون أكبر من المستوى الأول";
    }
    if (!Number.isInteger(next.level3Days) || next.level3Days <= next.level2Days) {
      return "أيام المستوى الثالث يجب أن تكون أكبر من المستوى الثاني";
    }
    return null;
  };

  const handleSave = async () => {
    const localError = validateLocally(settings);
    if (localError) {
      setValidationError(localError);
      toast.error(localError);
      return;
    }

    setValidationError(null);
    setSaving(true);
    try {
      const res = await apiClient.put("/tasks/escalation/settings", {
        enabled: settings.enabled,
        level1Days: settings.level1Days,
        level2Days: settings.level2Days,
        level3Days: settings.level3Days,
        channels: settings.channels,
        notifyManager: settings.notifyManager,
        notifyOwner: settings.notifyOwner,
        quietHours: settings.quietHours,
      });

      if (res.data?.success && res.data?.data) {
        setSettings((prev) => ({ ...prev, ...res.data.data }));
        toast.success("تم حفظ إعدادات تصعيد المهام بنجاح");
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات";
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">تصعيد المهام المتأخرة</h1>
            <p className="text-xs text-muted-foreground mt-1">
              سلم تصعيد من 3 مستويات للمهام المتجاوزة لموعد التسليم (تذكير المكلَّف ← مدير المشروع ← المالك) يومياً الساعة 09:00 صباحاً.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>حفظ الإعدادات</span>
        </button>
      </div>

      {validationError ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      ) : null}

      {/* Master Enable Toggle */}
      <div className="p-5 rounded-xl bg-card border border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">تفعيل التصعيد التلقائي</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إيقاف هذا الخيار يمنع إرسال أي تذكيرات أو تصعيدات جديدة دون التأثير على المهام القائمة.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
            settings.enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
              settings.enabled ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 3-Level Thresholds */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">مستويات التصعيد (بالأيام بعد موعد الاستحقاق)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <UserCheck className="w-4 h-4" />
              <span>المستوى 1 — تذكير المكلَّف</span>
            </div>
            <label className="block text-[11px] text-muted-foreground">بعد (أيام)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={settings.level1Days}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, level1Days: Math.max(0, Number(e.target.value) || 0) }))
              }
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">القنوات: داخل التطبيق + إشعار دفع</p>
          </div>

          <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-orange-700 dark:text-orange-400">
                <Users className="w-4 h-4" />
                <span>المستوى 2 — مدير المشروع</span>
              </span>
              <input
                type="checkbox"
                checked={settings.notifyManager}
                onChange={(e) => setSettings((prev) => ({ ...prev, notifyManager: e.target.checked }))}
                aria-label="إشعار مدير المشروع"
              />
            </div>
            <label className="block text-[11px] text-muted-foreground">بعد (أيام)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={settings.level2Days}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, level2Days: Math.max(1, Number(e.target.value) || 1) }))
              }
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">القنوات: داخل التطبيق + دفع + واتساب</p>
          </div>

          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                <ShieldAlert className="w-4 h-4" />
                <span>المستوى 3 — المالك</span>
              </span>
              <input
                type="checkbox"
                checked={settings.notifyOwner}
                onChange={(e) => setSettings((prev) => ({ ...prev, notifyOwner: e.target.checked }))}
                aria-label="إشعار المالك"
              />
            </div>
            <label className="block text-[11px] text-muted-foreground">بعد (أيام)</label>
            <input
              type="number"
              min={2}
              max={365}
              value={settings.level3Days}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, level3Days: Math.max(2, Number(e.target.value) || 2) }))
              }
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">القنوات: داخل التطبيق + دفع + واتساب</p>
          </div>
        </div>
      </div>

      {/* Channels & Quiet Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">قنوات الإشعار</h2>
          </div>

          <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              إشعارات داخل التطبيق
            </span>
            <input
              type="checkbox"
              checked={settings.channels.inApp}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, inApp: e.target.checked },
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
            <span className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              إشعارات الدفع (Push / FCM)
            </span>
            <input
              type="checkbox"
              checked={settings.channels.push}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, push: e.target.checked },
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              رسائل واتساب (للمستويين 2 و3)
            </span>
            <input
              type="checkbox"
              checked={settings.channels.whatsapp}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  channels: { ...prev.channels, whatsapp: e.target.checked },
                }))
              }
            />
          </label>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">ساعات الهدوء</h2>
            </div>
            <input
              type="checkbox"
              checked={settings.quietHours.enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  quietHours: { ...prev.quietHours, enabled: e.target.checked },
                }))
              }
              aria-label="تفعيل ساعات الهدوء"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">من الساعة</label>
              <input
                type="time"
                value={settings.quietHours.start}
                disabled={!settings.quietHours.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, start: e.target.value },
                  }))
                }
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">إلى الساعة</label>
              <input
                type="time"
                value={settings.quietHours.end}
                disabled={!settings.quietHours.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, end: e.target.value },
                  }))
                }
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-mono disabled:opacity-50"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            المنطقة الزمنية: <span className="font-mono">{settings.quietHours.timezone}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskEscalationSettings;
