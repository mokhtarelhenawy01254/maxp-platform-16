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
import { tToast } from "../../utils/i18n-toast";
import {
  DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS,
  platformSiteHomepageService,
  type PlatformSiteHomepageSettings,
} from "../../services/platformSiteHomepageService";
import i18n from "../../i18n";
import {
  PLATFORM_LANDING_VARIANTS,
  getPlatformLandingPreviewPath,
  type PlatformLandingVariantDefinition,
} from "../landing/platformLandingRegistry";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

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
  } catch {
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
      tToast.error("PlatformSiteHomepageTemplates.failed_load_a341");
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
      tToast.success("PlatformSiteHomepageTemplates.success_update_b605");
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
        dir={i18n.dir()}
        className="w-full max-w-[1440px] mx-auto p-4 sm:p-6"
      >
        <div className="flex h-[50vh] items-center justify-center rounded-xl border border-border/70 bg-card/40">
          <div className="flex items-center gap-3 text-muted-foreground">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-mono">جاري تحميل النسخ والخيارات...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={i18n.dir()} className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4">
      {/* Linear Single-Surface Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <SparklesIcon className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                إدارة واجهة الصفحة الرئيسية للمنصة
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                تحكم النشر المباشر
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              اختيار واعتماد لاندنج المنصة الرئيسية (/) مع عزل تام لقوالب المتاجر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <ArrowPathIcon className="size-3.5" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">النسخة المنشورة الآن</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
            {activeVariant.label}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">الظاهرة على الجذر /</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">النسخ المتاحة</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {availableVariants.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">نماذج جاهزة للاختيار</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">النسخة المحددة للمعاينة</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
            {selectedVariant.label}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {isSelectionActive ? "منشورة حالياً" : "قيد المراجعة"}
          </p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">آخر تحديث واعتماد</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-xs font-semibold text-foreground font-mono truncate mt-1">
            {formatDateTime(settings.updatedAt)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تاريخ الحفظ الأخير</p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Sidebar: Release Controls & Variants List */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <MegaphoneIcon className="size-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">قرار النشر والاعتماد</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                <span className="text-[10px] font-mono text-muted-foreground block">النسخة المختارة:</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">{selectedVariant.label}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                <span className="text-[10px] font-mono text-muted-foreground block">حالة النشر:</span>
                <span className="text-xs text-muted-foreground mt-0.5 block leading-relaxed">
                  {isSelectionActive
                    ? "هذه النسخة هي الظاهرة بالفعل على الصفحة الرئيسية العامة."
                    : "بالضغط على اعتماد، ستصبح هذه النسخة هي الواجهة الأساسية."}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs font-mono text-foreground hover:bg-muted/40 transition-colors"
              >
                <EyeIcon className="size-3.5" />
                <span>فتح المعاينة في تبويب جديد</span>
                <ArrowTopRightOnSquareIcon className="size-3 text-muted-foreground" />
              </a>

              <Button
                type="button"
                disabled={isSelectionActive || isSavingSelection}
                onClick={() => void handleActivateVariant(selectedVariant.id)}
                className={cn(
                  "w-full h-9 text-xs font-mono gap-1.5 active:scale-[0.98] transition-transform",
                  isSelectionActive
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-default"
                    : ""
                )}
              >
                {isSelectionActive ? (
                  <>
                    <CheckCircleIcon className="size-4 text-emerald-600" />
                    <span>هذه النسخة منشورة الآن</span>
                  </>
                ) : isSavingSelection ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    <span>جاري اعتماد النسخة...</span>
                  </>
                ) : (
                  <>
                    <BoltIcon className="size-4" />
                    <span>اعتماد ونشر هذه النسخة</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Variants Selector */}
          <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-semibold text-foreground">قائمة النسخ المتاحة</h3>
              <Badge variant="outline" className="text-[10px] font-mono">{availableVariants.length}</Badge>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
              {availableVariants.map((variant, index) => {
                const isSelected = variant.id === selectedVariant.id;
                const isActive = variant.id === settings.activeLandingId;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={cn(
                      "w-full rounded-lg border p-2.5 text-right transition-colors text-xs",
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground truncate">{variant.label}</span>
                          {isActive && (
                            <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">
                          {variant.summary}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">
                        {formatVariantIndex(index)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Preview & Details Surface */}
        <main className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card/40 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {formatVariantIndex(selectedVariantIndex >= 0 ? selectedVariantIndex : 0)} · {selectedVariant.badge}
                </span>
                <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                  {selectedVariant.label}
                </h2>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-mono",
                  isSelectionActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                )}
              >
                {isSelectionActive ? "منشورة حالياً" : "قيد المراجعة"}
              </Badge>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-semibold text-foreground mb-1">لماذا قد تختار هذه النسخة؟</h3>
                <p className="text-muted-foreground leading-relaxed text-xs">
                  {selectedVariant.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <span className="text-[10px] font-mono text-muted-foreground block">النبرة التسويقية</span>
                  <span className="text-xs font-semibold text-foreground mt-1 block">{selectedVariant.tone}</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <span className="text-[10px] font-mono text-muted-foreground block">الجمهور المستهدف</span>
                  <span className="text-xs font-semibold text-foreground mt-1 block">{selectedVariant.audience}</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <span className="text-[10px] font-mono text-muted-foreground block flex items-center gap-1">
                    <LinkIcon className="size-3" />
                    مسار المعاينة
                  </span>
                  <span dir="ltr" className="text-xs font-mono text-primary truncate mt-1 block font-semibold">
                    {previewHref}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <SparklesIcon className="size-4 text-primary" />
                  <span>نقاط التميز والعناصر الأساسية في هذه النسخة:</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedVariant.focusPoints.map((point, idx) => (
                    <span
                      key={`${selectedVariant.id}-${point}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: selectedVariant.accent || "#3b82f6" }}
                      />
                      <span>{formatVariantIndex(idx)} {point}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlatformSiteHomepageTemplates;
