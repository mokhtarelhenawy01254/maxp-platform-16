import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Target,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Package,
  TrendingUp,
  Percent,
  Clock,
  Send,
  Database,
} from "lucide-react";
import { tryApiFetch } from "../types";

export interface GoalsStockSettings {
  enabled: boolean;
  daily_orders: number;
  weekly_orders: number;
  monthly_orders: number;
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue?: number;
  min_stock_threshold: number;
  report_time: string;
  alert_phone: string | null;
  notify_whatsapp: boolean;
  milestones: number[];
  last_notified_target_date?: string | null;
  last_notified_weekly_target_date?: string | null;
  last_stock_alert_date?: string | null;
  last_daily_report_date?: string | null;
}

const AVAILABLE_MILESTONES = [50, 80, 100, 120];

export const GoalsStockSection: React.FC<{ slug?: string }> = ({
  slug = "stock-target-monitor-agent",
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual dispatch state
  const [testingReport, setTestingReport] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const [settings, setSettings] = useState<GoalsStockSettings>({
    enabled: false,
    daily_orders: 0,
    weekly_orders: 0,
    monthly_orders: 0,
    daily_revenue: 0,
    weekly_revenue: 0,
    monthly_revenue: 0,
    min_stock_threshold: 5,
    report_time: "09:00",
    alert_phone: "",
    notify_whatsapp: true,
    milestones: [50, 80, 100],
  });

  const loadSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await tryApiFetch<{ success: boolean; settings: GoalsStockSettings }>(
        `/api/v1/agent-automation/${slug}`
      );
      if (data?.success && data.settings) {
        setSettings({
          ...data.settings,
          monthly_orders: Number(data.settings.monthly_orders) || 0,
          report_time: data.settings.report_time || "09:00",
          alert_phone: data.settings.alert_phone || "",
          milestones:
            Array.isArray(data.settings.milestones) && data.settings.milestones.length > 0
              ? data.settings.milestones
              : [50, 80, 100],
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "فشل تحميل إعدادات الأهداف والمخزون");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [slug]);

  const toggleMilestone = (m: number) => {
    const exists = settings.milestones.includes(m);
    let updated: number[];
    if (exists) {
      if (settings.milestones.length === 1) {
        return; // Don't allow empty milestones
      }
      updated = settings.milestones.filter((item) => item !== m);
    } else {
      updated = [...settings.milestones, m].sort((a, b) => a - b);
    }
    setSettings({ ...settings, milestones: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    if (settings.min_stock_threshold <= 0) {
      setErrorMessage("الحد الأدنى لرصيد المخزون يجب أن يكون أكبر من صفر");
      setSaving(false);
      return;
    }

    if (settings.report_time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(settings.report_time.trim())) {
      setErrorMessage("يرجى إدخال وقت صحيح للتقرير المجدول بصيغة HH:mm (مثال: 09:00)");
      setSaving(false);
      return;
    }

    if (!Array.isArray(settings.milestones) || settings.milestones.length === 0) {
      setErrorMessage("يجب تحديد مرحلة إنجاز واحدة على الأقل للتنبيهات");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        enabled: settings.enabled,
        daily_orders: Math.max(0, Number(settings.daily_orders) || 0),
        weekly_orders: Math.max(0, Number(settings.weekly_orders) || 0),
        monthly_orders: Math.max(0, Number(settings.monthly_orders) || 0),
        daily_revenue: Math.max(0, Number(settings.daily_revenue) || 0),
        weekly_revenue: Math.max(0, Number(settings.weekly_revenue) || 0),
        monthly_revenue: Math.max(0, Number(settings.monthly_revenue) || 0),
        min_stock_threshold: Math.max(1, Number(settings.min_stock_threshold) || 5),
        report_time: settings.report_time ? settings.report_time.trim() : "09:00",
        alert_phone: settings.alert_phone ? String(settings.alert_phone).trim() : null,
        notify_whatsapp: settings.notify_whatsapp,
        milestones: settings.milestones,
      };

      const res = await tryApiFetch<{ success: boolean; settings: GoalsStockSettings }>(
        `/api/v1/agent-automation/${slug}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      if (res?.success) {
        setSaveSuccess(true);
        if (res.settings) {
          setSettings({
            ...res.settings,
            monthly_orders: Number(res.settings.monthly_orders) || 0,
            report_time: res.settings.report_time || "09:00",
            alert_phone: res.settings.alert_phone || "",
          });
        }
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage("فشل حفظ إعدادات الأهداف والمخزون");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleTestReportNow = async () => {
    setTestingReport(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const res = await tryApiFetch<{ success: boolean; summary?: any; error?: string }>(
        `/api/v1/agent-automation/${slug}/run`,
        {
          method: "POST",
          body: JSON.stringify({ force: true }),
        }
      );

      if (res?.success) {
        setTestResult(res.summary);
      } else {
        setErrorMessage(res?.error || "فشل تنفيذ وإرسال التقرير اليومي");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر تشغيل التقرير اليومي");
    } finally {
      setTestingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
        <RefreshCw className="size-4 animate-spin" />
        <span>جاري تحميل إعدادات الأهداف والمخزون...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>تم حفظ إعدادات الأهداف والمخزون وتحديث جدول التشغيل اليومي بنجاح.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Target className="size-5 text-primary" />
              مساعد المتابعة والأهداف (الاستوكات وتارجت الأوردرات)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تنبيهات مجدولة يومياً مبنية على أرقام قاعدة البيانات مباشرة: استوك قرب يخلص + تارجت أوردرات الشهر ونسبة التحقيق.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestReportNow}
              disabled={testingReport || saving}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium rounded-lg transition-colors disabled:opacity-50 border border-border"
              title="تشغيل التقرير وحساب الأرقام من الداتابيز فوراً"
            >
              {testingReport ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              تشغيل التقرير الآن
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ التغييرات
            </button>
          </div>
        </div>

        {/* System Mandates & Rules Info Badge */}
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground/90 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5 text-primary">
            <Database className="size-4" />
            <span>قواعد وضمانات تقرير المتابعة اليومي:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>أرقام فعلية من الداتابيز:</b> استعلام مباشر للأوردرات والمخزون دون أي كاش.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>منع التكرار الصارم:</b> كل صنف تحت الحد يظهر مرة واحدة فقط في اليوم.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><b>جدولة في الموعد:</b> تقرير صباحي مجدول يرسل إلى واتساب وشاشة الإشعارات.</span>
            </div>
          </div>
        </div>

        {/* Master Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium text-foreground block">
                تفعيل متابعة الأهداف والمخزون
              </span>
              <span className="text-xs text-muted-foreground">
                تشغيل الجدولة التلقائية والفحص الدوري لمستويات المخزون ومستهدفات الأوردرات.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.notify_whatsapp}
              onChange={(e) => setSettings({ ...settings, notify_whatsapp: e.target.checked })}
              className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium text-foreground block">
                إرسال تنبيهات عبر واتساب الفريق
              </span>
              <span className="text-xs text-muted-foreground">
                إرسال التقرير اليومي وتنبيهات النواقص إلى رقم واتساب الإدارة وفريق العمل.
              </span>
            </div>
          </label>
        </div>

        {/* Primary Requirement: Monthly Target Orders */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <span>تارجت أوردرات الشهر والمستهدفات الدورية</span>
            </div>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-primary/10 text-primary">
              الهدف الأساسي للوكيل
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 p-3 rounded-lg border-2 border-primary/40 bg-primary/5">
              <label className="block text-xs font-semibold text-primary mb-1">
                تارجت أوردرات الشهر (شهرياً) *
              </label>
              <input
                type="number"
                min={0}
                value={settings.monthly_orders}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    monthly_orders: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-primary/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                إجمالي الأوردرات المستهدفة للشهر الحالي لاحتساب نسبة الإنجاز اليومية.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تارجت الأوردرات اليومي (اختياري)
              </label>
              <input
                type="number"
                min={0}
                value={settings.daily_orders}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    daily_orders: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                الهدف اليومي للمتابعة المرحلية (0 = معطل).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تارجت الأوردرات الأسبوعي (اختياري)
              </label>
              <input
                type="number"
                min={0}
                value={settings.weekly_orders}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weekly_orders: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                يبدأ الأسبوع السبت تلقائياً (0 = معطل).
              </p>
            </div>
          </div>
        </div>

        {/* Stock Threshold & Schedule Time (Core Requirements) */}
        <div className="space-y-4 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package className="size-4 text-primary" />
            <span>حد أدنى للاستوك + وقت التقرير المجدول + هاتف الواتساب</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center justify-between">
                <span>عتبة انخفاض المخزون (قطع) *</span>
                <span className="text-[10px] text-muted-foreground">افتراضي: 5</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.min_stock_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_stock_threshold: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                يتم التنبيه عند وصول رصيد أي منتج أو مقاس/لون لهذا الرقم أو أقل.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>وقت إرسال التقرير اليومي *</span>
              </label>
              <input
                type="time"
                value={settings.report_time || "09:00"}
                onChange={(e) => setSettings({ ...settings, report_time: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                موعد إرسال التقرير الصباحي يومياً بتوقيت مصر (مثال: 09:00).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Phone className="size-3.5 text-primary" />
                <span>رقم واتساب الإدارة والفريق</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="افتراضي: هاتف المتجر المسجل"
                  value={settings.alert_phone || ""}
                  onChange={(e) => setSettings({ ...settings, alert_phone: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                الرقم الذي يستلم رسائل التارجت وأصناف الاستوك الناقصة.
              </p>
            </div>
          </div>
        </div>

        {/* Optional Revenue Targets */}
        <div className="space-y-4 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Percent className="size-4 text-primary" />
            <span>مستهدفات الإيرادات المالية (اختياري)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تارجت الإيراد الشهري
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.monthly_revenue || 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    monthly_revenue: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                القيمة المالية المستهدفة بالعملة المحلية للشهر.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                تارجت الإيراد اليومي
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.daily_revenue}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    daily_revenue: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                القيمة المالية المستهدفة بالعملة المحلية لليوم.
              </p>
            </div>
          </div>
        </div>

        {/* Milestones Selection */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <label className="block text-xs font-medium text-foreground">
            مراحل تحقيق الهدف التي يُرسل عندها تنبيه مرحلي (%):
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_MILESTONES.map((m) => {
              const active = settings.milestones.includes(m);
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => toggleMilestone(m)}
                  className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {m}%
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            يُرسل التنبيه مرة واحدة فقط لكل مرحلة متحققة دون تكرار.
          </p>
        </div>

        {/* Live Test Run Summary */}
        {testResult && (
          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3 pt-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                نتيجة تنفيذ التقرير المباشر من قاعدة البيانات:
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date().toLocaleTimeString("ar-EG")}
              </span>
            </div>

            {testResult.dailyReport?.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-background border border-border/70">
                  <span className="text-muted-foreground block text-[11px]">أوردرات الشهر:</span>
                  <span className="text-base font-bold text-foreground">
                    {testResult.dailyReport.metrics.monthOrdersCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {" "}من {testResult.dailyReport.metrics.monthlyTarget}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-background border border-border/70">
                  <span className="text-muted-foreground block text-[11px]">نسبة التحقيق:</span>
                  <span className="text-base font-bold text-primary">
                    {testResult.dailyReport.metrics.achievementPct}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-background border border-border/70">
                  <span className="text-muted-foreground block text-[11px]">أصناف تحت الحد (جديدة):</span>
                  <span className="text-base font-bold text-amber-500">
                    {testResult.dailyReport.metrics.newLowItemsCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground"> صنف</span>
                </div>

                <div className="p-2.5 rounded-lg bg-background border border-border/70">
                  <span className="text-muted-foreground block text-[11px]">أوردرات اليوم:</span>
                  <span className="text-base font-bold text-foreground">
                    {testResult.dailyReport.metrics.todayOrdersCount}
                  </span>
                </div>
              </div>
            )}

            {testResult.dailyReport?.messageText && (
              <div className="p-3 bg-background border border-border rounded-lg text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {testResult.dailyReport.messageText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
