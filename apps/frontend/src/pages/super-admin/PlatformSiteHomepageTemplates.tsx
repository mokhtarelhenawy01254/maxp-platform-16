import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  EyeIcon,
  LinkIcon,
  MegaphoneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS,
  platformSiteHomepageService,
  type PlatformSiteHomepageSettings,
} from "../../services/platformSiteHomepageService";
import {
  PLATFORM_LANDING_VARIANTS,
  getPlatformLandingPreviewPath,
  type PlatformLandingVariantDefinition,
} from "../landing/platformLandingRegistry";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "لم يتم الحفظ بعد";
  }

  try {
    return new Date(value).toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (error) {
    return "لم يتم الحفظ بعد";
  }
};

const formatVariantIndex = (index: number) =>
  `${index + 1}`.padStart(2, "0");

const resolveAvailableVariants = (
  settings: PlatformSiteHomepageSettings,
): PlatformLandingVariantDefinition[] => {
  const allowedIds = new Set(settings.availableLandingIds);
  const registryAligned = PLATFORM_LANDING_VARIANTS.filter((variant) =>
    allowedIds.has(variant.id),
  );

  if (registryAligned.length === PLATFORM_LANDING_VARIANTS.length) {
    return registryAligned;
  }

  // Keep new shipped variants visible even if a stale admin API response
  // still returns an older availableLandingIds list.
  const missingRegistryVariants = PLATFORM_LANDING_VARIANTS.filter(
    (variant) => !allowedIds.has(variant.id),
  );

  return [...registryAligned, ...missingRegistryVariants];
};

const PlatformSiteHomepageTemplates: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSiteHomepageSettings>(
    DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS,
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS.activeLandingId,
  );
  const [loading, setLoading] = useState(true);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const nextSettings = await platformSiteHomepageService.getSettings();
      setSettings(nextSettings);
      setSelectedVariantId(nextSettings.activeLandingId);
    } catch (error) {
      console.error("Failed to load platform homepage variants", error);
      toast.error("فشل تحميل إعدادات لاندنج المنصة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const availableVariants = useMemo(
    () => resolveAvailableVariants(settings),
    [settings],
  );

  useEffect(() => {
    if (!availableVariants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(settings.activeLandingId);
    }
  }, [availableVariants, selectedVariantId, settings.activeLandingId]);

  const activeVariant = useMemo(
    () =>
      availableVariants.find(
        (variant) => variant.id === settings.activeLandingId,
      ) || availableVariants[0],
    [availableVariants, settings.activeLandingId],
  );

  const selectedVariant = useMemo(
    () =>
      availableVariants.find((variant) => variant.id === selectedVariantId) ||
      activeVariant ||
      availableVariants[0],
    [activeVariant, availableVariants, selectedVariantId],
  );

  const previewHref = getPlatformLandingPreviewPath(selectedVariant.id);
  const isSelectionActive = selectedVariant.id === settings.activeLandingId;
  const isSavingSelection = savingVariantId === selectedVariant.id;

  const selectedVariantIndex = availableVariants.findIndex(
    (variant) => variant.id === selectedVariant.id,
  );

  const handleActivateVariant = async (
    nextVariantId: PlatformSiteHomepageSettings["activeLandingId"],
  ) => {
    try {
      setSavingVariantId(nextVariantId);
      const saved = await platformSiteHomepageService.updateSettings({
        activeLandingId: nextVariantId,
      });
      setSettings(saved);
      setSelectedVariantId(saved.activeLandingId);
      toast.success("تم تحديث الصفحة الرئيسية العامة");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "فشل تحديث الصفحة الرئيسية العامة";
      console.error("Failed to update platform homepage variant", error);
      toast.error(message);
    } finally {
      setSavingVariantId(null);
    }
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900"
      >
        <div className="mx-auto flex h-[60vh] max-w-7xl items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
            <span className="text-sm font-semibold">جاري تحميل النسخ...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Platform Homepage Release Control
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                غرفة تحرير اللاندنج الأساسية للمنصة
              </h1>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                الهدف هنا واضح: تعرف النسخة المنشورة الآن، تراجع نسخة أخرى إذا
                لزم، ثم تقرر هل تنشرها على{" "}
                <span dir="ltr" className="font-bold">
                  /
                </span>
                . المتجر على{" "}
                <span dir="ltr" className="font-bold">
                  /store
                </span>{" "}
                لا يتأثر بهذه الصفحة.
              </p>
            </div>

            <div className="min-w-0 max-w-md rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">
                النسخة المنشورة الآن
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {activeVariant.label}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                آخر تحديث: {formatDateTime(settings.updatedAt)}
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <MegaphoneIcon className="h-5 w-5 text-indigo-500" />
                قرار النشر
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                استخدم هذه المنطقة عندما تكون حسمت ما سيظهر على{" "}
                <span dir="ltr" className="font-bold">
                  /
                </span>
                . التحديد من القائمة لا ينشر وحده.
              </p>

              <div className="mt-5 space-y-4 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    النسخة المختارة الآن
                  </p>
                  <p className="mt-2 font-bold text-slate-900 dark:text-white">
                    {selectedVariant.label}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    نتيجة النشر
                  </p>
                  <p className="mt-2 leading-7 text-slate-700 dark:text-slate-300">
                    {isSelectionActive
                      ? "هذه النسخة هي الظاهرة بالفعل على الجذر العام."
                      : "إذا ضغطت نشر الآن، ستصبح هذه النسخة هي الظاهرة على الجذر العام."}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <EyeIcon className="h-5 w-5" />
                  فتح المعاينة العامة
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>

                <button
                  type="button"
                  disabled={isSelectionActive || isSavingSelection}
                  onClick={() => void handleActivateVariant(selectedVariant.id)}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                    isSelectionActive
                      ? "cursor-default bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  } ${isSavingSelection ? "opacity-75" : ""}`}
                >
                  {isSelectionActive ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      هذه النسخة منشورة الآن
                    </>
                  ) : isSavingSelection ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      جاري اعتماد النسخة...
                    </>
                  ) : (
                    <>
                      <BoltIcon className="h-5 w-5" />
                      اعتماد هذه النسخة للنشر
                    </>
                  )}
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                النسخ المتاحة
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                اختر نسخة لعرضها في مساحة المراجعة. التحديد هنا لا يغيّر النشر.
              </p>

              <div className="mt-4 space-y-2">
                {availableVariants.map((variant, index) => {
                  const isSelected = variant.id === selectedVariant.id;
                  const isActive = variant.id === settings.activeLandingId;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`w-full rounded-xl border p-4 text-right transition ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-slate-900 dark:text-white">
                              {variant.label}
                            </span>
                            {isActive ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                LIVE
                              </span>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 text-xs leading-6 text-slate-600 dark:text-slate-400">
                            {variant.summary}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-slate-400 dark:text-slate-500">
                          {formatVariantIndex(index)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                ماذا يحدث هنا؟
              </h3>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <li>التبديل بين النسخ يعرض التفاصيل فقط.</li>
                <li>المعاينة تفتح النسخة المختارة في مسار مستقل.</li>
                <li>النشر يغيّر ما يظهر على الجذر العام فقط.</li>
              </ul>
            </article>
          </aside>

          <main className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {formatVariantIndex(
                      selectedVariantIndex >= 0 ? selectedVariantIndex : 0,
                    )}{" "}
                    {selectedVariant.badge}
                  </p>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {selectedVariant.label}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isSelectionActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {isSelectionActive ? "منشورة حاليًا" : "قيد المراجعة"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="space-y-6 xl:col-span-2">
                  <section>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      لماذا قد تختار هذه النسخة؟
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                      {selectedVariant.summary}
                    </p>
                  </section>

                  <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        النبرة
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedVariant.tone}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        المستهدف
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedVariant.audience}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        <LinkIcon className="h-3.5 w-3.5" />
                        مسار المعاينة
                      </p>
                      <p
                        dir="ltr"
                        className="mt-2 break-all text-sm font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {previewHref}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <SparklesIcon className="h-4 w-4 text-indigo-500" />
                      ما الذي يميزها؟
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedVariant.focusPoints.map((point, index) => (
                        <span
                          key={`${selectedVariant.id}-${point}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: selectedVariant.accent }}
                          />
                          {formatVariantIndex(index)} {point}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </article>
          </main>
        </section>
      </div>
    </div>
  );
};

export default PlatformSiteHomepageTemplates;
