import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Save,
  Loader2,
  AlertTriangle,
  Route,
  Activity,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS,
  platformSiteMetaPixelService,
  type PlatformSiteMetaPixelSettings,
} from "../../services/platformSiteMetaPixelService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";

const PIXEL_ID_REGEX = /^\d{15,16}$/;

const trackingOptions: Array<{
  key: keyof Pick<
    PlatformSiteMetaPixelSettings,
    | "trackPageView"
    | "trackLead"
    | "trackCompleteRegistration"
    | "trackLogin"
  >;
  title: string;
  description: string;
}> = [
  {
    key: "trackPageView",
    title: "PageView",
    description: "تسجيل زيارة الصفحة على الهوم وصفحات الدخول والتسجيل العامة.",
  },
  {
    key: "trackLead",
    title: "Lead",
    description: "يتفعّل عند الضغط على CTA أساسي مثل إنشاء حساب أو طلب ديمو من اللاندنج.",
  },
  {
    key: "trackCompleteRegistration",
    title: "CompleteRegistration",
    description: "يتسجل بعد نجاح إنشاء الحساب في المسارات العامة للموقع.",
  },
  {
    key: "trackLogin",
    title: "Login (Custom)",
    description: "يرسل custom event بعد نجاح تسجيل الدخول لو محتاج تتابعه كحدث ثانوي.",
  },
];

const trackedRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/register/*",
  "/affiliate-register",
];

const PlatformSiteMetaPixel: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSiteMetaPixelSettings>(
    DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const trimmedPixelId = settings.pixelId.trim();
  const hasValidPixelId = PIXEL_ID_REGEX.test(trimmedPixelId);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const nextSettings = await platformSiteMetaPixelService.getSettings();
      setSettings(nextSettings);
    } catch (error) {
      console.error("Failed to load platform site Meta pixel settings", error);
      toast.error("فشل في تحميل إعدادات Meta Pixel للموقع العام");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSiteMetaPixelSettings>(
    key: K,
    value: PlatformSiteMetaPixelSettings[K],
  ) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const activeEvents = useMemo(
    () =>
      trackingOptions
        .filter((option) => settings[option.key])
        .map((option) => option.title),
    [settings],
  );

  const liveEventsCount =
    settings.isEnabled && hasValidPixelId ? activeEvents.length : 0;

  const statusMeta = useMemo(() => {
    if (settings.isEnabled && hasValidPixelId) {
      return {
        title: "مفعّل ونشط",
        tone: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
        helper: "يتم تحميل الـ Pixel وإرسال الأحداث العامة للموقع مباشرة.",
      };
    }

    if (!settings.isEnabled && hasValidPixelId) {
      return {
        title: "جاهز للتفعيل",
        tone: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
        helper: "تم حفظ Pixel ID لكن التتبع معطل حتى تفعيل المفتاح الرئيسي.",
      };
    }

    if (trimmedPixelId.length > 0 && !hasValidPixelId) {
      return {
        title: "Pixel غير صالح",
        tone: "text-rose-600 dark:text-rose-400",
        dot: "bg-rose-500",
        helper: "الرقم المدخل غير مطابق لتنسيق Meta المعتمد (15-16 رقماً).",
      };
    }

    return {
      title: "غير مفعّل",
      tone: "text-muted-foreground",
      dot: "bg-zinc-400",
      helper: "أدخل Pixel ID صالحاً ثم فعّل المفتاح الرئيسي لبدء التتبع.",
    };
  }, [hasValidPixelId, settings.isEnabled, trimmedPixelId.length]);

  const handleSave = async () => {
    const pixelId = trimmedPixelId;

    if (settings.isEnabled && !PIXEL_ID_REGEX.test(pixelId)) {
      toast.error("يرجى إدخال Meta Pixel ID صحيح مكون من 15 أو 16 رقماً");
      return;
    }

    try {
      setSaving(true);
      const savedSettings = await platformSiteMetaPixelService.updateSettings({
        ...settings,
        pixelId,
      });
      setSettings(savedSettings);
      toast.success("تم حفظ إعدادات Meta Pixel للموقع العام بنجاح");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "فشل حفظ إعدادات Meta Pixel للموقع العام";
      console.error("Failed to save platform site Meta pixel settings", error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تحميل إعدادات Meta Pixel للموقع العام...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Megaphone className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Meta Pixel للموقع العام
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Landing & Growth
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تتبع زيارات وتسجيلات maxp.online وصفحات الهبوط المركزية (منفصلة تماماً عن بكسلات المتاجر)
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-8.5 px-3 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs active:scale-[0.98] transition-transform gap-1.5 self-end sm:self-auto"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          <span>حفظ الإعدادات</span>
        </Button>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">حالة الـ Pixel</span>
              <span className={`size-1.5 rounded-full ${statusMeta.dot}`} />
            </div>
            <div className={`text-base sm:text-lg font-bold tracking-tight ${statusMeta.tone}`}>
              {statusMeta.title}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">Pixel ID الحالي</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono tabular-nums">
              {settings.pixelId || "غير محدد"}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الأحداث المحددة للتتبع</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {activeEvents.length} <span className="text-xs font-sans text-muted-foreground font-normal">أحداث</span>
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الأحداث الحية النشطة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {liveEventsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h2 className="text-sm font-bold text-foreground">بيانات التتبع والأحداث</h2>
              <p className="text-xs text-muted-foreground">
                تفعيل الـ Pixel واختيار الأحداث المعيارية المرسلة إلى Meta
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">تفعيل الـ Pixel:</span>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(checked) => updateSetting("isEnabled", checked)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Meta Pixel ID
            </label>
            <Input
              type="text"
              dir="ltr"
              inputMode="numeric"
              value={settings.pixelId}
              onChange={(e) => updateSetting("pixelId", e.target.value)}
              placeholder="123456789012345"
              className="h-8.5 text-xs font-mono max-w-md"
            />
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              يدعم 15 أو 16 رقماً. لن يتم تفعيل الإرسال في حال عدم صحة الرقم.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              الأحداث المعيارية للتتبع (Standard Events)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trackingOptions.map((option) => {
                const isChecked = Boolean(settings[option.key]);
                return (
                  <label
                    key={option.key}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary/[0.04] border-primary/30"
                        : "bg-muted/10 border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => updateSetting(option.key, e.target.checked)}
                      className="size-4 mt-0.5 rounded border-border/80 text-primary focus:ring-primary shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground font-mono">{option.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              اسم حدث تسجيل الدخول المخصص (Custom Login Event)
            </label>
            <Input
              type="text"
              dir="ltr"
              value={settings.loginEventName}
              onChange={(e) => updateSetting("loginEventName", e.target.value)}
              placeholder="PlatformLogin"
              disabled={!settings.trackLogin}
              className="h-8.5 text-xs font-mono max-w-xs"
            />
          </div>
        </div>

        {/* Funnel & Scope Guidance Box */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
                <Route className="size-3.5 text-primary" />
                <span>المسارات المشمولة بالتتبع</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                يعمل هذا الـ Pixel حصرياً على صفحات منصة maxp.online العامة:
              </p>
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {trackedRoutes.map((route) => (
                  <span
                    key={route}
                    className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40"
                  >
                    {route}
                  </span>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
                <Activity className="size-3.5 text-primary" />
                <span>مسار تحويل الزوار (Funnel)</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>زيارة اللاندنج ترسل حدث <strong>PageView</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>الضغط على زر التسجيل يرسل حدث <strong>Lead</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>إتمام الحساب يرسل <strong>CompleteRegistration</strong></span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground block mb-0.5">عزل البيانات:</span>
            أي بكسل يتم ضبطه هنا معزول تماماً عن بكسلات الحملات الإعلانية ومتاجر التجار، لضمان دقة إسناد إعلانات المنصة المركزية.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSiteMetaPixel;
