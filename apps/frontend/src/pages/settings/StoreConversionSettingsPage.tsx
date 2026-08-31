import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { NavLink } from "react-router-dom";
import { STORE_CONVERSION_APP_LABELS, STORE_CONVERSION_PAGE_MAP, STORE_CONVERSION_PAGES, type StoreConversionPageId } from "./storeConversionSettingsConfig";
import {
  getDeepValue,
  ToggleSwitch,
  useConversionTools,
} from "./useConversionTools";

export default function StoreConversionSettingsPage({
  pageId,
}: {
  pageId: StoreConversionPageId;
}) {
  const { t } = useTranslation();
  const page = STORE_CONVERSION_PAGE_MAP[pageId];

  const {
    loading,
    savingToolKey,
    lastSavedAt,
    managedApps,
    getAppStatusLabel,
    getToolAvailability,
    getToolEnabled,
    handleToolToggle,
    handleToolFieldSave,
  } = useConversionTools(page.appSlugs);

  const sourceSummary = useMemo(
    () =>
      page.appSlugs
        .map((appSlug) => {
          const label = STORE_CONVERSION_APP_LABELS[appSlug];
          const appState = managedApps[appSlug];
          return `${label}: ${getAppStatusLabel(appState?.app || null)}`;
        })
        .join(" • "),
    [managedApps, page.appSlugs, getAppStatusLabel],
  );

  const headerStatusLabel = loading
    ? t("storeConversionSettings.loading")
    : savingToolKey
      ? t("storeConversionSettings.saving")
      : lastSavedAt
        ? t("storeConversionSettings.savedAuto")
        : t("storeConversionSettings.autoSaveLabel");

  return (
    <div className="max-w-5xl space-y-8" dir={getDirection()}>
      <header className="space-y-4 border-b border-gray-200 pb-6 dark:border-gray-800">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
            {t("storeConversionSettings.pageHeader")}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {t(page.title)}
          </h1>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
          {t(page.description)}
        </p>
        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <p>{headerStatusLabel}</p>
          {!loading ? <p>{sourceSummary}</p> : null}
        </div>
      </header>

      <nav
        aria-label="Store conversion navigation"
        className="border-b border-gray-200 pb-4 dark:border-gray-800"
      >
        <div className="flex gap-6 overflow-x-auto text-sm">
          {STORE_CONVERSION_PAGES.map((entry) => (
            <NavLink
              key={entry.id}
              to={entry.path}
              className={({ isActive }) =>
                `whitespace-nowrap border-b pb-2 font-bold transition-colors ${
                  isActive
                    ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`
              }
            >
              {t(entry.navLabel)}
            </NavLink>
          ))}
        </div>
      </nav>

      {page.sections.map((section) => (
        <section
          key={section.title}
          className="space-y-4 border-b border-gray-200 pb-8 dark:border-gray-800"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              {t(section.title)}
            </h2>
            {section.description ? (
              <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {t(section.description, { defaultValue: section.description })}
              </p>
            ) : null}
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {section.tools.map((tool) => {
              const availability = getToolAvailability(tool);
              const enabled = getToolEnabled(tool);
              const saving = savingToolKey === tool.key;
              const isToolFieldSaving =
                typeof savingToolKey === "string" &&
                savingToolKey.startsWith(`${tool.key}:`);
              const toolLabel = t(`storeConversionSettings.tool.${tool.key}.label`, {
                defaultValue: tool.label,
              });
              const toolDescription = t(
                `storeConversionSettings.tool.${tool.key}.benefit`,
                { defaultValue: tool.description },
              );

              return (
                <div
                  key={tool.key}
                  className="grid gap-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {toolLabel}
                    </p>
                    <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                      {toolDescription}
                    </p>
                    {!availability.available ? (
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        {availability.note}
                      </p>
                    ) : null}
                    {tool.fields?.length ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {tool.fields.map((field) => {
                          const fieldValue = getDeepValue(
                            managedApps[tool.appSlug]?.settings || {},
                            field.path.split("."),
                          );
                          const fieldSaving =
                            savingToolKey === `${tool.key}:${field.key}`;

                          return (
                            <label
                              key={`${field.key}-${String(fieldValue)}`}
                              className="block rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/60"
                            >
                              <span className="block text-xs font-black text-gray-800 dark:text-gray-100">
                                {t(`storeConversionSettings.field.${field.key}.label`, {
                                  defaultValue: field.label,
                                })}
                              </span>
                              {field.description ? (
                                <span className="mt-1 block text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                                  {t(
                                    `storeConversionSettings.field.${field.key}.description`,
                                    { defaultValue: field.description },
                                  )}
                                </span>
                              ) : null}
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="number"
                                  min={field.min}
                                  defaultValue={Number(fieldValue || 0)}
                                  disabled={
                                    !availability.available ||
                                    loading ||
                                    saving ||
                                    isToolFieldSaving
                                  }
                                  onBlur={(event) =>
                                    void handleToolFieldSave(
                                      tool,
                                      field,
                                      event.currentTarget.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                />
                                {field.suffix ? (
                                  <span className="text-xs font-black text-gray-500 dark:text-gray-400">
                                    {field.suffix}
                                  </span>
                                ) : null}
                                {fieldSaving ? (
                                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                    {t("storeConversionSettings.savingField")}
                                  </span>
                                ) : null}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-black ${
                        saving
                          ? "text-indigo-700 dark:text-indigo-300"
                          : isToolFieldSaving
                            ? "text-indigo-700 dark:text-indigo-300"
                          : enabled
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {saving || isToolFieldSaving
                        ? t("storeConversionSettings.savingField")
                        : availability.available
                          ? enabled
                            ? t("storeConversionSettings.enabled")
                            : t("storeConversionSettings.disabledLabel")
                          : t("storeConversionSettings.notAvailable")}
                    </span>
                    <ToggleSwitch
                      label={toolLabel}
                      checked={enabled}
                      disabled={!availability.available || saving || isToolFieldSaving || loading}
                      onToggle={() => void handleToolToggle(tool, !enabled)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
