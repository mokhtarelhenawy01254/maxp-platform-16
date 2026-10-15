import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  PlayCircle,
} from "lucide-react";
import { config } from "../../config";
import tokenManager from "../../utils/tokenManager";
import {
  ScheduledOrderStatsStrip,
  ScheduledOrderStats,
} from "./ScheduledOrderStatsStrip";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

interface ScheduledOrderSettingsData {
  enabled: boolean;
  minScheduleDays: number;
  maxScheduleDays: number;
  autoTransitionDaysBefore: number;
  targetStatusAfterTransition: string;
  sendCustomerNotification: boolean;
  sendStaffNotification: boolean;
  allowTimeSelection: boolean;
}

export const ScheduledOrderSettings: React.FC = () => {
  const [settings, setSettings] = useState<ScheduledOrderSettingsData>({
    enabled: true,
    minScheduleDays: 1,
    maxScheduleDays: 90,
    autoTransitionDaysBefore: 0,
    targetStatusAfterTransition: "CONFIRMED",
    sendCustomerNotification: true,
    sendStaffNotification: true,
    allowTimeSelection: true,
  });

  const [stats, setStats] = useState<ScheduledOrderStats>({
    total: 0,
    pending: 0,
    upcoming: 0,
    overdue: 0,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/scheduled-orders/settings`, {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      showMessage("error", "فشل في تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/scheduled-orders/stats`, {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const data = await res.json();
      if (data?.success && data?.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${config.apiUrl}/scheduled-orders/settings`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data?.success) {
        showMessage("success", "تم حفظ إعدادات الطلبات المجدولة بنجاح");
        loadStats();
      } else {
        showMessage("error", "فشل في حفظ الإعدادات");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showMessage("error", "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const runManualTransition = async () => {
    try {
      setTransitioning(true);
      const res = await fetch(`${config.apiUrl}/scheduled-orders/transition`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await res.json();
      if (data?.success) {
        showMessage("success", `تمت معالجة ${data.processed ?? 0} طلب بنجاح`);
        loadStats();
      } else {
        showMessage("error", "فشل في تشغيل التحويل اليدوي");
      }
    } catch (error) {
      console.error("Error running transition:", error);
      showMessage("error", "فشل في تشغيل التحويل اليدوي");
    } finally {
      setTransitioning(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">جاري تحميل إعدادات الجدولة...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
            إعدادات الطلبات المجدولة
          </h1>
          <span className="hidden md:inline-block text-[10px] text-muted-foreground font-mono">
            Scheduled Orders
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={runManualTransition}
            disabled={transitioning}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-foreground bg-muted/60 hover:bg-muted border border-border/70 transition-all active:scale-[0.97] disabled:opacity-50"
            title="تشغيل محرك النقل للطلبات المستحقة الآن"
          >
            <PlayCircle className={`h-3.5 w-3.5 ${transitioning ? "animate-spin" : ""}`} />
            <span>{transitioning ? "جاري التحويل..." : "تشغيل التحويل يدوياً"}</span>
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
            <span>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
          </button>
        </div>
      </header>

      {/* Notification Toast Banner */}
      {message && (
        <div
          className={`p-2.5 border-b flex items-center gap-2 text-xs font-medium shrink-0 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        <ScheduledOrderStatsStrip stats={stats} />

        <section className="p-4 sm:p-5 max-w-4xl space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-md border border-border/70 bg-card">
            <div>
              <span className="text-xs font-semibold text-foreground">تفعيل نظام الطلبات المجدولة</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">إتاحة خيار الجدولة والتسليم المستقبلي عند إنشاء الطلبات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-card after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-1.5">
              <label htmlFor="min-days-input" className="text-xs font-semibold text-foreground">الحد الأدنى للجدولة (أيام)</label>
              <input
                id="min-days-input"
                type="number"
                min="0"
                value={settings.minScheduleDays}
                onChange={(e) => setSettings({ ...settings, minScheduleDays: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">أقل مهلة مسموحة للعميل قبل موعد التسليم</p>
            </div>

            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-1.5">
              <label htmlFor="max-days-input" className="text-xs font-semibold text-foreground">الحد الأقصى للجدولة (أيام)</label>
              <input
                id="max-days-input"
                type="number"
                min="1"
                value={settings.maxScheduleDays}
                onChange={(e) => setSettings({ ...settings, maxScheduleDays: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">أقصى مدى زمني متاح لاختيار تاريخ الاستلام</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-1.5">
              <label htmlFor="transition-days-input" className="text-xs font-semibold text-foreground">التحويل التلقائي قبل الموعد (أيام)</label>
              <input
                id="transition-days-input"
                type="number"
                min="0"
                value={settings.autoTransitionDaysBefore}
                onChange={(e) => setSettings({ ...settings, autoTransitionDaysBefore: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">0 = التحويل في نفس يوم الاستلام، 1 = قبل الموعد بيوم واحد</p>
            </div>

            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-1.5">
              <label htmlFor="target-status-select" className="text-xs font-semibold text-foreground">الحالة المستهدفة بعد التحويل</label>
              <select
                id="target-status-select"
                value={settings.targetStatusAfterTransition}
                onChange={(e) => setSettings({ ...settings, targetStatusAfterTransition: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="CONFIRMED">مؤكد (CONFIRMED)</option>
                <option value="PROCESSING">قيد التجهيز (PROCESSING)</option>
                <option value="PENDING">قيد الانتظار (PENDING)</option>
              </select>
              <p className="text-[10px] text-muted-foreground">الحالة التشغيلية التي يدخل إليها الطلب تلقائياً للتنفيذ</p>
            </div>
          </div>

          <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">خيارات التنبيهات والوقت</span>
            <div className="divide-y divide-border/50">
              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-foreground">إرسال إشعار للعميل عند التحويل</span>
                  <p className="text-[10px] text-muted-foreground">إشعار العميل بأن طلبه دخل مرحلة التأكيد والتجهيز</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sendCustomerNotification}
                  onChange={(e) => setSettings({ ...settings, sendCustomerNotification: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-foreground">إرسال إشعار لفريق العمل والمخزن</span>
                  <p className="text-[10px] text-muted-foreground">تنبيه مسؤولي التجهيز ببدء تجهيز الطلبات المستحقة</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sendStaffNotification}
                  onChange={(e) => setSettings({ ...settings, sendStaffNotification: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-foreground">إتاحة اختيار نافذة زمنية للتسليم (Time Slots)</span>
                  <p className="text-[10px] text-muted-foreground">السماح بتحديد فترة صباحية أو مسائية للاستلام</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowTimeSelection}
                  onChange={(e) => setSettings({ ...settings, allowTimeSelection: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </label>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ScheduledOrderSettings;
