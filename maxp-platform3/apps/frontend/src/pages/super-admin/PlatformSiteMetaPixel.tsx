import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS,
  platformSiteMetaPixelService,
  type PlatformSiteMetaPixelSettings,
} from "../../services/platformSiteMetaPixelService";

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
      toast.error("فشل تحميل إعدادات Meta Pixel للموقع العام");
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
        title: "مفعّل",
        tone: "text-emerald-500",
        helper: "سيتم تحميل الـ Pixel وإرسال الأحداث العامة على الموقع.",
      };
    }

    if (!settings.isEnabled && hasValidPixelId) {
      return {
        title: "جاهز للتفعيل",
        tone: "text-amber-500",
        helper: "تم حفظ Pixel ID لكن التتبع لن يعمل حتى تفعيل المفتاح الرئيسي.",
      };
    }

    if (trimmedPixelId.length > 0 && !hasValidPixelId) {
      return {
        title: "Pixel غير صالح",
        tone: "text-rose-500",
        helper: "الرقم الحالي غير صالح، لذلك لن يتم تشغيل التتبع العام.",
      };
    }

    return {
      title: "غير مفعّل",
      tone: "text-slate-500 dark:text-slate-400",
      helper: "أضف Pixel ID صالحًا ثم فعّل المفتاح الرئيسي لبدء التتبع.",
    };
  }, [hasValidPixelId, settings.isEnabled, trimmedPixelId.length]);

  const handleSave = async () => {
    const pixelId = trimmedPixelId;

    if (settings.isEnabled && !PIXEL_ID_REGEX.test(pixelId)) {
      toast.error("Pixel ID يجب أن يكون 15 أو 16 رقمًا");
      return;
    }

    try {
      setSaving(true);
      const savedSettings = await platformSiteMetaPixelService.updateSettings({
        ...settings,
        pixelId,
      });
      setSettings(savedSettings);
      toast.success("تم حفظ إعدادات Meta Pixel للموقع العام");
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
      <div className="bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>جاري تحميل إعدادات Meta Pixel للموقع العام...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              <MegaphoneIcon className="h-4 w-4" />
              Platform Growth Stack
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Meta Pixel للموقع العام
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              هذه الأداة مخصصة لـ <span dir="ltr">maxp.online</span> نفسه كـ
              landing page، وليست لإعدادات المتجر. أي تعديل هنا سينعكس على
              الزيارات والتسجيلات العامة فقط.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {saving ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-5 w-5" />
            )}
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-lg font-semibold ${statusMeta.tone}`}>
                {statusMeta.title}
              </p>
              <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {statusMeta.helper}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                {liveEventsCount}
              </span>{" "}
              حدثًا يعمل فعليًا الآن على اللايف.
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  حالة التفعيل
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {settings.isEnabled ? "مفعّل" : "غير مفعّل"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  الأحداث النشطة
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeEvents.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-violet-500" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pixel ID الحالي
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {settings.pixelId || "غير محدد"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  الإعدادات الأساسية
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  فعّل Meta Pixel للموقع العام وحدد الأحداث التي نرسلها من
                  اللاندنج وصفحات التسجيل والدخول.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={settings.isEnabled}
                  onChange={(event) =>
                    updateSetting("isEnabled", event.target.checked)
                  }
                />
                تفعيل الـ Pixel
              </label>
            </div>

            <div className="space-y-6">
              {hasValidPixelId && !settings.isEnabled ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  تم حفظ Pixel ID بشكل صحيح، لكن التتبع العام لن يبدأ إلا بعد تفعيل
                  خيار <span className="mx-1 font-semibold">تفعيل الـ Pixel</span>
                  أعلى النموذج، ثم الضغط على حفظ الإعدادات.
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="platform-site-pixel-id"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Meta Pixel ID
                </label>
                <input
                  id="platform-site-pixel-id"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  value={settings.pixelId}
                  onChange={(event) =>
                    updateSetting("pixelId", event.target.value)
                  }
                  placeholder="123456789012345"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  يدعم 15 أو 16 رقمًا. لن يتم تفعيل التتبع العام إذا كان الرقم غير
                  صالح.
                </p>
              </div>

              <div className="grid gap-4">
                {trackingOptions.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {option.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {option.description}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={Boolean(settings[option.key])}
                      onChange={(event) =>
                        updateSetting(option.key, event.target.checked)
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/60">
                <label
                  htmlFor="platform-site-login-event-name"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  اسم حدث تسجيل الدخول
                </label>
                <input
                  id="platform-site-login-event-name"
                  type="text"
                  dir="ltr"
                  value={settings.loginEventName}
                  onChange={(event) =>
                    updateSetting("loginEventName", event.target.value)
                  }
                  placeholder="PlatformLogin"
                  disabled={!settings.trackLogin}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  يستخدم فقط عند تفعيل تتبع تسجيل الدخول، ويفضل أن يظل اسمًا واضحًا
                  وثابتًا داخل Meta Events Manager.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                أين يعمل هذا الـ Pixel؟
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                التتبع هنا مخصص للموقع العام فقط، وليس صفحات المتجر أو إعدادات
                الـ storefront.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {trackedRoutes.map((route) => (
                  <span
                    key={route}
                    className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                  >
                    <span dir="ltr">{route}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Funnel الحالي بعد التفعيل
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <li>العميل يدخل اللاندنج الرئيسية ويُرسل <span dir="ltr">PageView</span>.</li>
                <li>الضغط على CTA أساسي مثل إنشاء حساب أو طلب ديمو يرسل <span dir="ltr">Lead</span>.</li>
                <li>نجاح التسجيل يرسل <span dir="ltr">CompleteRegistration</span>.</li>
                <li>نجاح تسجيل الدخول يرسل custom event فقط لو فعّلت خياره هنا.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                ملاحظة تشغيلية
              </h2>
              <p className="mt-2 text-sm leading-7 text-amber-800 dark:text-amber-200">
                هذه الصفحة لا تضبط Conversions API ولا GTM حاليًا. الـ MVP هنا
                يجهز Meta Pixel للزيارات والتسجيلات العامة على الموقع نفسه.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSiteMetaPixel;
