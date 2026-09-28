import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Info,
  Monitor,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildStorefrontPreviewPath } from "../../storefront/utils/paths";
import { STORE_CONVERSION_APP_LABELS } from "./storeConversionSettingsConfig";
import {
  findToolById,
  type ConversionToolDisplayKind,
} from "./conversionToolMeta";
import {
  ConversionToolPreviewProvider,
  renderConversionToolPreview,
} from "./conversionToolPreviews";
import type { StorefrontThemeInput } from "../../storefront/engine/themeResolver";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import {
  getDeepValue,
  ToggleSwitch,
  useConversionTools,
} from "./useConversionTools";

type CanvasView = "mobile" | "desktop";

const StoreCanvasFrame = ({
  view,
  displayKind,
  children,
}: {
  view: CanvasView;
  displayKind: ConversionToolDisplayKind;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-[240px] items-start justify-center rounded-2xl border border-stone-200/80 bg-stone-100/70 p-3 dark:border-stone-800 dark:bg-stone-900/60 sm:min-h-[420px] sm:p-6">
    <div
      className={`w-full transition-[max-width] duration-200 ease-out ${
        view === "mobile" ? "max-w-[420px]" : "max-w-full"
      }`}
    >
      {/* شريط متصفح رمزي يفصل "عالم المتجر" عن "عالم اللوحة" */}
      <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        </span>
        <span className="mx-auto rounded-md bg-white px-3 py-0.5 text-[10px] font-bold text-gray-400 dark:bg-gray-800">
          متجر-التاجر.maxp.online
        </span>
      </div>
      {/* عالم المتجر فاتح دائمًا — النافذة لا تتبع وضع اللوحة */}
      <div className="space-y-4 rounded-b-xl border border-t-0 border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
        {displayKind === "pdp" ? (
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-900">
            <span className="text-xs font-black text-gray-900 dark:text-white">
              متجر التاجر
            </span>
            <ShoppingBag className="h-4 w-4 text-gray-300" />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  </div>
);

export default function ConversionToolPage() {
  const { toolId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [canvasView, setCanvasView] = useState<CanvasView>("mobile");
  const [merchantTheme, setMerchantTheme] = useState<StorefrontThemeInput | undefined>();

  useEffect(() => {
    let active = true;
    storefrontSettingsService
      .getSettings()
      .then((response) => {
        if (!active) return;
        const settings = response?.data as Record<string, unknown> | undefined;
        const themeId =
          (typeof settings?.themeId === "string" && settings.themeId.trim()) ||
          (() => {
            const tokens = settings?.designTokens as Record<string, unknown> | undefined;
            return typeof tokens?.themeId === "string" ? tokens.themeId.trim() : "";
          })();
        if (themeId) {
          setMerchantTheme({ themeId } as StorefrontThemeInput);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const entry = findToolById(toolId);
  const tool = entry?.tool;
  const meta = entry?.meta;

  const appSlugs = useMemo(
    () => (tool ? [tool.appSlug] : []),
    [tool?.appSlug],
  );
  const {
    loading,
    savingToolKey,
    lastSavedAt,
    managedApps,
    getToolAvailability,
    getToolEnabled,
    handleToolToggle,
    handleToolFieldSave,
  } = useConversionTools(appSlugs);

  const toolLabel = tool
    ? t(`storeConversionSettings.tool.${tool.key}.label`, { defaultValue: tool.label })
    : "";
  const toolBenefit = tool
    ? t(`storeConversionSettings.tool.${tool.key}.benefit`, {
        defaultValue: tool.description,
      })
    : "";

  if (!entry || !tool || !meta) {
    return <Navigate to="/settings/store/tools" replace />;
  }

  const availability = getToolAvailability(tool);
  const enabled = getToolEnabled(tool);
  const saving = savingToolKey === tool.key;
  const isFieldSaving =
    typeof savingToolKey === "string" && savingToolKey.includes(":");
  const appState = tool ? managedApps[tool.appSlug] : undefined;
  const settings = appState?.settings || {};

  // لينك المتجر: اسم المتجر (slug) هو الصح — companyId cuid مش سب دومين حقيقي
  const storeSlug = user?.company?.slug?.trim();
  const storePreviewUrl =
    storeSlug || user?.companyId
      ? buildStorefrontPreviewPath("/", {
          companySlug: storeSlug || undefined,
          companyId: storeSlug ? undefined : user?.companyId || undefined,
        })
      : "";

  const saveIndicator = saving || isFieldSaving ? (
    <span className="flex items-center gap-1.5 text-[11px] font-black text-indigo-700 dark:text-indigo-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
      {t("storeConversionSettings.savingIndicator")}
    </span>
  ) : lastSavedAt ? (
    <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
      <Check className="h-3.5 w-3.5" />
      {t("storeConversionSettings.savedIndicator")}
    </span>
  ) : (
    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
      {t("storeConversionSettings.autoSaveLabel")}
    </span>
  );

  return (
    <div className="conversion-admin-scope mx-auto max-w-7xl space-y-6" dir={getDirection()}>
      {/* الرأس: مسار رجوع + فتح المتجر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate("/settings/store/tools")}
            className="flex items-center gap-1.5 font-bold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowRight className="h-4 w-4" />
            {t("storeConversionSettings.backToTools")}
          </button>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="font-black text-gray-900 dark:text-white">{toolLabel}</span>
        </div>
        {storePreviewUrl ? (
          <a
            href={storePreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-black text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("storeConversionSettings.viewOnStore")}
          </a>
        ) : null}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── ريل الإعدادات ── */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <meta.icon className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                {toolLabel}
              </h1>
              <p className="text-xs leading-6 text-gray-600 dark:text-gray-300">
                {toolBenefit}
              </p>
            </div>
            <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-900 dark:text-gray-300">
              {STORE_CONVERSION_APP_LABELS[tool.appSlug]}
            </span>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  {t("storeConversionSettings.toolState")}
                </p>
                <p
                  className={`text-[11px] font-black ${
                    !availability.available
                      ? "text-amber-700 dark:text-amber-300"
                      : enabled
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {availability.available
                    ? enabled
                      ? t("storeConversionSettings.enabled")
                      : t("storeConversionSettings.disabledLabel")
                    : availability.note}
                </p>
              </div>
              <ToggleSwitch
                label={toolLabel}
                checked={enabled}
                disabled={!availability.available || saving || loading}
                onToggle={() => void handleToolToggle(tool, !enabled)}
              />
            </div>
            {!enabled && availability.available ? (
              <p className="flex items-start gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-5 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("storeConversionSettings.generalEnabledNote", {
                  app: STORE_CONVERSION_APP_LABELS[tool.appSlug],
                })}
              </p>
            ) : null}

            {tool.key === "freeShippingBar" ? (
              <div className="rounded-lg bg-emerald-50/70 p-3 text-[11px] leading-5 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200">
                <span className="font-bold">ملاحظة التزامن: </span>
                الحد المالي وحالة التفعيل هنا متزامنة تلقائيًا مع صفحة{" "}
                <Link
                  to="/settings/store?tab=promotion"
                  className="font-black underline underline-offset-2 hover:text-emerald-800"
                >
                  إعدادات الترويج والشحن
                </Link>
                . أي تعديل في أي من المكانين يُطبَّق فورًا على المتجر.
              </div>
            ) : null}
          </div>

          {tool.fields?.length ? (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm font-black text-gray-900 dark:text-white">
                {t("storeConversionSettings.fieldsTitle")}
              </p>
              {tool.fields.map((field) => {
                const fieldValue = getDeepValue(settings, field.path.split("."));
                const fieldSaving = savingToolKey === `${tool.key}:${field.key}`;

                return (
                  <label key={field.key} className="block space-y-1.5">
                    <span className="block text-xs font-black text-gray-800 dark:text-gray-100">
                      {t(`storeConversionSettings.field.${field.key}.label`, {
                        defaultValue: field.label,
                      })}
                    </span>
                    {field.description ? (
                      <span className="block text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                        {t(`storeConversionSettings.field.${field.key}.description`, {
                          defaultValue: field.description,
                        })}
                      </span>
                    ) : null}
                    <span className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={field.min}
                        defaultValue={Number(fieldValue || 0)}
                        disabled={!availability.available || loading || saving || fieldSaving}
                        onBlur={(event) =>
                          void handleToolFieldSave(tool, field, event.currentTarget.value)
                        }
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                      {field.suffix ? (
                        <span className="text-xs font-black text-gray-500 dark:text-gray-400">
                          {field.suffix}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </aside>

        {/* ── مسرح المعاينة ── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-950">
              {(
                [
                  { id: "mobile", label: t("storeConversionSettings.viewMobile"), icon: Smartphone },
                  { id: "desktop", label: t("storeConversionSettings.viewDesktop"), icon: Monitor },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCanvasView(option.id)}
                  aria-pressed={canvasView === option.id}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-black transition-colors ${
                    canvasView === option.id
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {saveIndicator}
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {t("storeConversionSettings.livePreviewBadge")}
              </span>
            </div>
          </div>

          {!enabled && availability.available && !loading ? (
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {t("storeConversionSettings.expectedLookCaption")}
            </p>
          ) : null}

          {loading ? (
            <div className="min-h-[420px] animate-pulse space-y-4 rounded-2xl border border-stone-200/80 bg-stone-100/70 p-6 dark:border-stone-800 dark:bg-stone-900/60">
              <div className="h-8 w-1/3 rounded-lg bg-stone-200 dark:bg-stone-800" />
              <div className="h-24 rounded-xl bg-stone-200 dark:bg-stone-800" />
              <div className="h-12 w-2/3 rounded-lg bg-stone-200 dark:bg-stone-800" />
            </div>
          ) : (
            <StoreCanvasFrame view={canvasView} displayKind={meta.displayKind}>
              <ConversionToolPreviewProvider initialTheme={merchantTheme}>
                {renderConversionToolPreview(tool.key, { settings })}
              </ConversionToolPreviewProvider>
            </StoreCanvasFrame>
          )}

          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
            {t(
            merchantTheme
              ? "storeConversionSettings.previewRealThemeCaption"
              : "storeConversionSettings.previewMockCaption"
          )}
          </p>
        </section>
      </div>
    </div>
  );
}
