import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  CogIcon,
  PaintBrushIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  platformDefaultSidebarService,
  type DefaultSidebarSettings,
} from "../../services/platformDefaultSidebarService";
import i18n from "../../i18n";
import { getSidebarConfig } from "../../config/sidebar";
import { useTranslation } from "react-i18next";

const LAYOUT_OPTIONS = [
  { value: "classic", labelKey: "sidebar.sidebarLayoutClassic", descKey: "sidebar.sidebarLayoutClassicDesc", icon: Squares2X2Icon },
  { value: "three-tier", labelKey: "sidebar.sidebarLayoutThreeTier", descKey: "sidebar.sidebarLayoutThreeTierDesc", icon: Cog6ToothIcon },
  { value: "horizontal", labelKey: "sidebar.sidebarLayoutHorizontal", descKey: "sidebar.sidebarLayoutHorizontalDesc", icon: PaintBrushIcon },
  { value: "floating", labelKey: "sidebar.sidebarLayoutFloating", descKey: "sidebar.sidebarLayoutFloatingDesc", icon: CogIcon },
  { value: "minimal", labelKey: "sidebar.sidebarLayoutMinimal", descKey: "sidebar.sidebarLayoutMinimalDesc", icon: Squares2X2Icon },
];

const SuperAdminDefaultSidebar: React.FC = () => {
  const { t } = useTranslation("superAdminDefaultSidebar");
  const [settings, setSettings] = useState<DefaultSidebarSettings>({
    layout: "three-tier",
    settings: {},
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const sidebarSections = getSidebarConfig(t, {});

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await platformDefaultSidebarService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load default sidebar settings:", error);
      tToast.error("superAdminDefaultSidebar.failed_load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleLayoutChange = (layout: string) => {
    setSettings((prev) => ({ ...prev, layout }));
  };

  const handleSectionToggle = (sectionId: string, visible: boolean) => {
    setSettings((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [sectionId]: {
          ...(prev.settings[sectionId] as Record<string, unknown> || {}),
          visible,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await platformDefaultSidebarService.updateSettings({
        layout: settings.layout,
        settings: settings.settings,
      });
      tToast.success("superAdminDefaultSidebar.success_save");
    } catch (error) {
      console.error("Failed to save default sidebar settings:", error);
      tToast.error("superAdminDefaultSidebar.failed_save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t("superAdminDefaultSidebar.confirm_reset"))) return;

    try {
      setSaving(true);
      await platformDefaultSidebarService.updateSettings({
        layout: "three-tier",
        settings: {},
      });
      setSettings({ layout: "three-tier", settings: {}, updatedAt: new Date().toISOString() });
      tToast.success("superAdminDefaultSidebar.reset_success");
    } catch (error) {
      console.error("Failed to reset default sidebar settings:", error);
      tToast.error("superAdminDefaultSidebar.failed_reset");
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return t("superAdminDefaultSidebar.never_saved");
    try {
      return new Date(value).toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return t("superAdminDefaultSidebar.never_saved");
    }
  };

  if (loading) {
    return (
      <div dir={i18n.dir()} className="bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto flex h-[60vh] max-w-6xl 2xl:max-w-7xl items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
            <span className="text-sm font-semibold">{t("superAdminDefaultSidebar.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={i18n.dir()} className="bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Platform Default Sidebar Settings
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t("superAdminDefaultSidebar.title")}
              </h1>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("superAdminDefaultSidebar.description")}
              </p>
            </div>

            <div className="min-w-0 max-w-md rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">
                {t("superAdminDefaultSidebar.current_default")}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {LAYOUT_OPTIONS.find((o) => o.value === settings.layout)?.labelKey ? t(LAYOUT_OPTIONS.find((o) => o.value === settings.layout)!.labelKey) : settings.layout}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("superAdminDefaultSidebar.last_updated")} {formatDateTime(settings.updatedAt)}
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <PaintBrushIcon className="h-5 w-5 text-indigo-500" />
                {t("superAdminDefaultSidebar.layout_section")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("superAdminDefaultSidebar.layout_description")}
              </p>

              <div className="mt-5 space-y-3">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleLayoutChange(opt.value)}
                    className={`w-full rounded-xl border p-4 text-right transition ${
                      settings.layout === opt.value
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <opt.icon className="h-6 w-6 text-indigo-500" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {t(opt.labelKey)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t(opt.descKey)}
                          </p>
                        </div>
                      </div>
                      {settings.layout === opt.value && (
                        <CheckCircleIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <Cog6ToothIcon className="h-5 w-5 text-indigo-500" />
                {t("superAdminDefaultSidebar.sections_section")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("superAdminDefaultSidebar.sections_description")}
              </p>

              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {sidebarSections
                  .filter((s) => !s.hidden)
                  .map((section) => {
                    const sectionSettings = settings.settings[section.id] as
                      | { visible?: boolean }
                      | undefined;
                    const isVisible = sectionSettings?.visible ?? true;

                    return (
                      <label
                        key={section.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => handleSectionToggle(section.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {section.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {section.items.length} {t("superAdminDefaultSidebar.items")}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("superAdminDefaultSidebar.actions")}
              </h3>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-75"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      {t("superAdminDefaultSidebar.saving")}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      {t("superAdminDefaultSidebar.save")}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-75"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  {t("superAdminDefaultSidebar.reset_defaults")}
                </button>
              </div>
            </article>
          </aside>

          <main className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t("superAdminDefaultSidebar.preview_title")}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t("superAdminDefaultSidebar.preview_description")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    previewMode
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {previewMode ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      {t("superAdminDefaultSidebar.hide_preview")}
                    </>
                  ) : (
                    <>
                      <Squares2X2Icon className="h-4 w-4" />
                      {t("superAdminDefaultSidebar.show_preview")}
                    </>
                  )}
                </button>
              </div>

              {previewMode && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <Squares2X2Icon className="h-5 w-5 text-indigo-500" />
                      {t("superAdminDefaultSidebar.preview_layout")}:{" "}
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded dark:bg-slate-800">
                        {settings.layout}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                        {t("superAdminDefaultSidebar.preview_visible_sections")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sidebarSections
                          .filter((s) => !s.hidden)
                          .map((section) => {
                            const sectionSettings = settings.settings[section.id] as
                              | { visible?: boolean }
                              | undefined;
                            const isVisible = sectionSettings?.visible ?? true;

                            return (
                              <span
                                key={section.id}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  isVisible
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {isVisible ? (
                                  <CheckCircleIcon className="h-3 w-3" />
                                ) : (
                                  <span className="h-3 w-3" />
                                )}
                                {section.title}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </main>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminDefaultSidebar;