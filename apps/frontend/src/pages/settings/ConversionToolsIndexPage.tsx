import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ALL_CONVERSION_TOOLS } from "./conversionToolMeta";
import { ConversionToolPreviewProvider } from "./conversionToolPreviews";
import { renderConversionToolMiniPreview } from "./conversionToolPreviews";
import {
  isAppOperational,
  useConversionTools,
} from "./useConversionTools";
import {
  STORE_CONVERSION_APP_LABELS,
  STORE_CONVERSION_PAGES,
  type ManagedMarketplaceAppSlug,
  type StoreConversionToolConfig,
} from "./storeConversionSettingsConfig";

const ToolCard = ({
  tool,
  toolLabel,
  toolBenefit,
  enabledLabel,
  disabledLabel,
  enabled,
  available,
  preview,
}: {
  tool: StoreConversionToolConfig;
  toolLabel: string;
  toolBenefit: string;
  enabledLabel: string;
  disabledLabel: string;
  enabled: boolean;
  available: boolean;
  preview: ReactNode;
}) => (
  <Link
    to={`/settings/store/tools/${tool.key}`}
    className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700"
  >
    <div className="relative h-32 overflow-hidden border-b border-gray-100 bg-stone-50 dark:border-gray-900 dark:bg-stone-900/40">
      <div className="absolute right-0 top-0 w-[139%] origin-top-right scale-[0.72] p-3">
        {preview}
      </div>
      {!available ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] dark:bg-gray-950/60">
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-700 shadow-sm dark:bg-gray-900 dark:text-amber-300">
            {STORE_CONVERSION_APP_LABELS[tool.appSlug]}
          </span>
        </div>
      ) : null}
    </div>
    <div className="space-y-1.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-black text-gray-900 dark:text-white">{toolLabel}</h3>
        <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-900 dark:group-hover:text-white" />
      </div>
      <p className="line-clamp-2 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
        {toolBenefit}
      </p>
      <div className="flex items-center gap-1.5 pt-1">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            !available
              ? "bg-amber-400"
              : enabled
                ? "bg-emerald-500"
                : "bg-gray-300 dark:bg-gray-700"
          }`}
        />
        <span
          className={`text-[10px] font-black ${
            !available
              ? "text-amber-700 dark:text-amber-300"
              : enabled
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {!available
            ? STORE_CONVERSION_APP_LABELS[tool.appSlug]
            : enabled
              ? enabledLabel
              : disabledLabel}
        </span>
      </div>
    </div>
  </Link>
);

export default function ConversionToolsIndexPage() {
  const { t } = useTranslation();


  const appSlugs = useMemo(
    () =>
      Array.from(
        new Set(ALL_CONVERSION_TOOLS.map((entry) => entry.tool.appSlug)),
      ) as ManagedMarketplaceAppSlug[],
    [],
  );
  const { loading, managedApps, getToolEnabled } = useConversionTools(appSlugs);

  const isToolAvailable = (tool: StoreConversionToolConfig) => {
    const appState = managedApps[tool.appSlug];
    return Boolean(appState?.app && isAppOperational(appState.app));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10" dir={getDirection()}>
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          {t("storeConversionSettings.toolsIndexTitle")}
        </h1>
        <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
          {t("storeConversionSettings.toolsIndexDesc")}
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
            />
          ))}
        </div>
      ) : (
        <ConversionToolPreviewProvider>
        {STORE_CONVERSION_PAGES.map((page) => {
          const pageTools = ALL_CONVERSION_TOOLS.filter(
            (entry) => entry.page.id === page.id,
          );

          return (
            <section key={page.id} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  {t(page.navLabel)}
                </h2>
                <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                  {t(page.description)}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pageTools.map(({ tool, meta }) => {
                  const available = isToolAvailable(tool);
                  return (
                    <ToolCard
                      key={tool.key}
                      tool={tool}
                      toolLabel={t(`storeConversionSettings.tool.${tool.key}.label`, {
                        defaultValue: tool.label,
                      })}
                      toolBenefit={t(
                        `storeConversionSettings.tool.${tool.key}.benefit`,
                        { defaultValue: tool.description },
                      )}
                      enabled={available && getToolEnabled(tool)}
                      enabledLabel={t("storeConversionSettings.enabled")}
                      disabledLabel={t("storeConversionSettings.disabledLabel")}
                      available={available}
                      preview={renderConversionToolMiniPreview(tool.key)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
        </ConversionToolPreviewProvider>
      )}
    </div>
  );
}
