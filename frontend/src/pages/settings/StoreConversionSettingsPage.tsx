import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { toast } from "react-hot-toast";
import { normalizeMarketplaceAppSettings } from "../../config/marketplaceAppSettings";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import {
  type ManagedMarketplaceAppSlug,
  STORE_CONVERSION_APP_LABELS,
  STORE_CONVERSION_PAGE_MAP,
  STORE_CONVERSION_PAGES,
  type StoreConversionPageId,
  type StoreConversionToolConfig,
  type StoreConversionToolFieldConfig,
} from "./storeConversionSettingsConfig";

type JsonRecord = Record<string, unknown>;

type CompanyMarketplaceApp = {
  id: string;
  status?: string | null;
  settings?: Record<string, unknown> | null;
  app?: {
    slug?: string | null;
    name?: string | null;
  };
};

type ManagedAppState = {
  app: CompanyMarketplaceApp | null;
  settings: JsonRecord;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getDeepValue = (source: JsonRecord, path: string[]): unknown =>
  path.reduce<unknown>((currentValue, key) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }
    return currentValue[key];
  }, source);

const setDeepValue = (
  source: JsonRecord,
  path: string[],
  value: unknown,
): JsonRecord => {
  if (path.length === 0) {
    return source;
  }

  const [head, ...rest] = path;
  if (!head) {
    return source;
  }

  const current = isRecord(source[head]) ? source[head] : {};

  return {
    ...source,
    [head]: rest.length === 0 ? value : setDeepValue(current, rest, value),
  };
};

const isAppOperational = (app: CompanyMarketplaceApp | null) => {
  const status = String(app?.status || "").trim().toUpperCase();
  return Boolean(app) && !["DISABLED", "INACTIVE", "CANCELLED", "EXPIRED"].includes(status);
};

const getAppStatusLabel = (app: CompanyMarketplaceApp | null) => {
  if (!app) {
    return "غير مثبت";
  }

  return isAppOperational(app) ? "جاهز" : "متوقف";
};

const ToggleSwitch = ({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-label={label}
    aria-checked={checked}
    aria-disabled={disabled}
    disabled={disabled}
    onClick={onToggle}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
      checked
        ? "bg-emerald-600 dark:bg-emerald-500"
        : "bg-gray-300 dark:bg-gray-700"
    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
        checked ? "-translate-x-1" : "translate-x-1"
      }`}
    />
  </button>
);

export default function StoreConversionSettingsPage({
  pageId,
}: {
  pageId: StoreConversionPageId;
}) {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const page = STORE_CONVERSION_PAGE_MAP[pageId];

  const [loading, setLoading] = useState(true);
  const [savingToolKey, setSavingToolKey] = useState<string | null>(null);
  const [managedApps, setManagedApps] = useState<
    Record<ManagedMarketplaceAppSlug, ManagedAppState>
  >({} as Record<ManagedMarketplaceAppSlug, ManagedAppState>);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const loadManagedApps = useCallback(async () => {
    if (!isAuthenticated || !user?.companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get("/my-apps", { _skipErrorToast: true });
      const installedApps = Array.isArray(response?.data?.data)
        ? (response.data.data as CompanyMarketplaceApp[])
        : [];

      const nextManagedApps = page.appSlugs.reduce<
        Record<ManagedMarketplaceAppSlug, ManagedAppState>
      >((accumulator, appSlug) => {
        const matchedApp =
          installedApps.find((entry) => entry?.app?.slug === appSlug) || null;

        accumulator[appSlug] = {
          app: matchedApp,
          settings: normalizeMarketplaceAppSettings(appSlug, matchedApp?.settings || {}),
        };

        return accumulator;
      }, {} as Record<ManagedMarketplaceAppSlug, ManagedAppState>);

      setManagedApps(nextManagedApps);
    } catch (error) {
      console.error("Error loading grouped conversion settings:", error);
      toast.error("تعذر تحميل إعدادات الأدوات.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page.appSlugs, user?.companyId]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void loadManagedApps();
  }, [isAuthLoading, loadManagedApps]);

  const sourceSummary = useMemo(
    () =>
      page.appSlugs
        .map((appSlug) => {
          const label = STORE_CONVERSION_APP_LABELS[appSlug];
          const appState = managedApps[appSlug];
          return `${label}: ${getAppStatusLabel(appState?.app || null)}`;
        })
        .join(" • "),
    [managedApps, page.appSlugs],
  );

  const headerStatusLabel = loading
    ? "جارٍ تحميل الأدوات..."
    : savingToolKey
      ? "جاري حفظ التغيير..."
      : lastSavedAt
        ? "تم الحفظ تلقائيًا"
        : "كل تغيير هنا يُحفظ تلقائيًا";

  const getToolAvailability = useCallback(
    (tool: StoreConversionToolConfig) => {
      const appState = managedApps[tool.appSlug];
      if (!appState?.app) {
        return {
          available: false,
          note: `يتطلب تفعيل ${STORE_CONVERSION_APP_LABELS[tool.appSlug]}.`,
        };
      }

      if (!isAppOperational(appState.app)) {
        return {
          available: false,
          note: `${STORE_CONVERSION_APP_LABELS[tool.appSlug]} متوقف حاليًا.`,
        };
      }

      return {
        available: true,
        note: "",
      };
    },
    [managedApps],
  );

  const getToolEnabled = useCallback(
    (tool: StoreConversionToolConfig) => {
      const appState = managedApps[tool.appSlug];
      if (!appState?.app || !isAppOperational(appState.app)) {
        return false;
      }

      return tool.readPaths.every((path) =>
        Boolean(getDeepValue(appState.settings, path.split("."))),
      );
    },
    [managedApps],
  );

  const handleToolToggle = useCallback(
    async (tool: StoreConversionToolConfig, nextValue: boolean) => {
      const appState = managedApps[tool.appSlug];
      if (!appState?.app) {
        toast.error(`هذه الأداة تحتاج ${STORE_CONVERSION_APP_LABELS[tool.appSlug]}.`);
        return;
      }

      if (!isAppOperational(appState.app)) {
        toast.error("التطبيق المرتبط بهذه الأداة متوقف حاليًا.");
        return;
      }

      const writePaths = nextValue
        ? tool.writePathsOn || tool.readPaths
        : tool.writePathsOff || tool.readPaths;

      let nextSettings = appState.settings;
      writePaths.forEach((path) => {
        nextSettings = setDeepValue(nextSettings, path.split("."), nextValue);
      });

      const normalizedSettings = normalizeMarketplaceAppSettings(
        tool.appSlug,
        nextSettings,
      );

      setSavingToolKey(tool.key);
      setManagedApps((currentState) => ({
        ...currentState,
        [tool.appSlug]: {
          app: appState.app,
          settings: normalizedSettings,
        },
      }));

      try {
        await apiClient.put(`/my-apps/${appState.app.id}/settings`, {
          settings: normalizedSettings,
        });
        setLastSavedAt(Date.now());
      } catch (error) {
        console.error("Error saving grouped conversion setting:", error);
        toast.error("تعذر حفظ التغيير.");
        await loadManagedApps();
      } finally {
        setSavingToolKey(null);
      }
    },
    [loadManagedApps, managedApps],
  );

  const handleToolFieldSave = useCallback(
    async (
      tool: StoreConversionToolConfig,
      field: StoreConversionToolFieldConfig,
      rawValue: string,
    ) => {
      const appState = managedApps[tool.appSlug];
      if (!appState?.app) {
        toast.error(`هذه الأداة تحتاج ${STORE_CONVERSION_APP_LABELS[tool.appSlug]}.`);
        return;
      }

      if (!isAppOperational(appState.app)) {
        toast.error("التطبيق المرتبط بهذه الأداة متوقف حالياً.");
        return;
      }

      const currentValue = getDeepValue(appState.settings, field.path.split("."));
      const nextNumber = Math.max(
        field.min ?? 0,
        Number.isFinite(Number(rawValue)) ? Number(rawValue) : 0,
      );

      if (Number(currentValue || 0) === nextNumber) {
        return;
      }

      const nextSettings = setDeepValue(
        appState.settings,
        field.path.split("."),
        nextNumber,
      );
      const normalizedSettings = normalizeMarketplaceAppSettings(
        tool.appSlug,
        nextSettings,
      );
      const savingKey = `${tool.key}:${field.key}`;

      setSavingToolKey(savingKey);
      setManagedApps((currentState) => ({
        ...currentState,
        [tool.appSlug]: {
          app: appState.app,
          settings: normalizedSettings,
        },
      }));

      try {
        await apiClient.put(`/my-apps/${appState.app.id}/settings`, {
          settings: normalizedSettings,
        });
        setLastSavedAt(Date.now());
      } catch (error) {
        console.error("Error saving grouped conversion field:", error);
        toast.error("تعذر حفظ التغيير.");
        await loadManagedApps();
      } finally {
        setSavingToolKey(null);
      }
    },
    [loadManagedApps, managedApps],
  );

  return (
    <div className="max-w-5xl space-y-8" dir="rtl">
      <header className="space-y-4 border-b border-gray-200 pb-6 dark:border-gray-800">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
            إدارة أدوات المتجر
          </p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {page.title}
          </h1>
        </div>
        <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
          {page.description}
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
              {entry.navLabel}
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
              {section.title}
            </h2>
            {section.description ? (
              <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {section.description}
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

              return (
                <div
                  key={tool.key}
                  className="grid gap-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {tool.label}
                    </p>
                    <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                      {tool.description}
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
                                {field.label}
                              </span>
                              {field.description ? (
                                <span className="mt-1 block text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                                  {field.description}
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
                                    حفظ...
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
                      {saving
                        ? "جارٍ الحفظ"
                        : isToolFieldSaving
                          ? "جارٍ الحفظ"
                        : availability.available
                          ? enabled
                            ? "يعمل"
                            : "متوقف"
                          : "غير متاح"}
                    </span>
                    <ToggleSwitch
                      label={tool.label}
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
