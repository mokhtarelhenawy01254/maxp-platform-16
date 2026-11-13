import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api, fetchJson } from "./api";
import { useSidebarSettings } from "../../../contexts/SidebarSettingsContext";
import { PRESETS } from "./educationSettingsPresets";
import type { EducationMode } from "./EducationModeSelector";
import type { EducationTabConfig, EducationSettingsData } from "./types";

/**
 * Controller for the education settings screen: state, legacy-parity payload
 * building, dirty tracking (savedSnap), save handlers and guards.
 * Presentation lives in EducationSettingsTab.tsx.
 */
export function useEducationSettingsController(onSaved?: (newSettings: EducationSettingsData) => void) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const { refreshSettings } = useSidebarSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemTitle, setSystemTitle] = useState("النظام التعليمي");
  const [systemTitleEn, setSystemTitleEn] = useState("Education System");
  const [educationMode, setEducationMode] = useState<EducationMode>("COURSES");
  const [enableSubjects, setEnableSubjects] = useState<boolean>(false);
  const [enableDemoDay, setEnableDemoDay] = useState<boolean>(false);
  const [pushFirstSaveWhatsApp, setPushFirstSaveWhatsApp] = useState<boolean>(true);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [tabs, setTabs] = useState<EducationTabConfig[]>([]);
  const [initialData, setInitialData] = useState<EducationSettingsData | null>(null);
  const [savedSnap, setSavedSnap] = useState<string | null>(null);

  const [savingMode, setSavingMode] = useState<EducationMode | null>(null);
  const [savingPushFirst, setSavingPushFirst] = useState<boolean>(false);
  const [savingDemoDay, setSavingDemoDay] = useState<boolean>(false);
  const [pendingMode, setPendingMode] = useState<EducationMode | null>(null);

  const anySaving = saving || savingMode !== null || savingPushFirst || savingDemoDay;

  const snapshotOf = (title: string, titleEn: string, tabsList: EducationTabConfig[]) =>
    JSON.stringify([title, titleEn, tabsList.map((tb) => [tb.id, tb.labelAr, tb.labelEn, tb.visible, tb.order])]);

  const applyData = useCallback((data: EducationSettingsData) => {
    const mode = data.educationMode || (data.enableSubjects ? "ACADEMIC" : "COURSES");
    setSystemTitle(data.systemTitle || "النظام التعليمي");
    setSystemTitleEn(data.systemTitleEn || "Education System");
    setEducationMode(mode);
    setEnableSubjects(data.enableSubjects !== undefined ? Boolean(data.enableSubjects) : mode === "ACADEMIC");
    setEnableDemoDay(
      data.enableDemoDay !== undefined
        ? Boolean(data.enableDemoDay)
        : Boolean(data.tabs?.find((tb: any) => tb.id === "demo-day")?.visible),
    );
    setPushFirstSaveWhatsApp(
      data.pushFirstSaveWhatsApp !== undefined ? Boolean(data.pushFirstSaveWhatsApp) : true,
    );
    setCompanySlug(data.companySlug ?? null);
    setPublicCode(data.publicCode ?? null);
    setCustomDomain(data.customDomain ?? null);
    setTabs(data.tabs || []);
    setInitialData(data);
    setSavedSnap(snapshotOf(data.systemTitle || "", data.systemTitleEn || "", data.tabs || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson(api("settings"));
      if (data) applyData(data);
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to load education system settings" : "تعذر جلب إعدادات النظام التعليمي"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Single source of truth for the settings PUT payload.
  // Parity notes vs legacy handlers: enableDemoDay key is only sent by its own
  // toggle; subjects visibility follows enableSubjects; locked tabs stay visible.
  const buildPayload = (
    o: Partial<{
      educationMode: EducationMode;
      enableSubjects: boolean;
      enableDemoDay: boolean;
      pushFirstSaveWhatsApp: boolean;
      tabsOverride: EducationTabConfig[];
      demoVisible: boolean;
    }> = {},
  ) => {
    const mode = o.educationMode ?? educationMode;
    const subjects = o.enableSubjects ?? enableSubjects;
    const source = o.tabsOverride ?? tabs;
    const payload = {
      systemTitle: systemTitle.trim(),
      systemTitleEn: systemTitleEn.trim(),
      educationMode: mode,
      enableSubjects: subjects,
      pushFirstSaveWhatsApp: o.pushFirstSaveWhatsApp ?? pushFirstSaveWhatsApp,
      tabs: source.map((tb, idx) => {
        const id = tb.id.toLowerCase();
        return {
          id: tb.id,
          key: tb.key,
          labelAr: tb.labelAr.trim() || tb.defaultLabelAr,
          labelEn: tb.labelEn.trim() || tb.defaultLabelEn,
          order: idx,
          visible:
            id === "subjects"
              ? subjects
              : id === "demo-day" && o.demoVisible !== undefined
                ? o.demoVisible
                : tb.locked
                  ? true
                  : tb.visible,
        };
      }),
    };
    return o.enableDemoDay !== undefined ? { ...payload, enableDemoDay: o.enableDemoDay } : payload;
  };

  const emitUpdated = useCallback(
    async (payload: object, saved: EducationSettingsData) => {
      if (refreshSettings) await refreshSettings();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("education-settings-updated", { detail: payload }));
      }
      if (onSaved) onSaved(saved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshSettings, onSaved],
  );

  const doModeChange = async (mode: EducationMode) => {
    if (anySaving) return;
    const subjectsOn = mode === "ACADEMIC";
    setEducationMode(mode);
    setEnableSubjects(subjectsOn);
    const updatedTabs = tabs.map((tb) =>
      tb.id.toLowerCase() === "subjects" ? { ...tb, visible: subjectsOn } : tb,
    );
    setTabs(updatedTabs);

    setSavingMode(mode);
    try {
      const payload = buildPayload({
        educationMode: mode,
        enableSubjects: subjectsOn,
        tabsOverride: updatedTabs,
      });
      await fetchJson(api("settings"), { method: "PUT", body: JSON.stringify(payload) });
      setSavedSnap(snapshotOf(payload.systemTitle, payload.systemTitleEn, updatedTabs));
      toast.success(
        mode === "COURSES"
          ? isEn
            ? "Courses & packages mode activated (subjects hidden)"
            : "تم تفعيل نمط الأكاديمية والكورسات بنجاح (المواد مخفية)"
          : isEn
            ? "Academic center mode activated (subjects enabled)"
            : "تم تفعيل نمط السنتر والمواد الدراسية بنجاح (المواد مفعلة)",
      );
      await emitUpdated(payload, {
        systemTitle: payload.systemTitle,
        systemTitleEn: payload.systemTitleEn,
        educationMode: mode,
        enableSubjects: subjectsOn,
        pushFirstSaveWhatsApp,
        companySlug,
        publicCode,
        customDomain,
        tabs: payload.tabs as EducationTabConfig[],
      });
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to apply mode change" : "فشل تطبيق وحفظ نمط النظام"));
    } finally {
      setSavingMode(null);
    }
  };

  const handleModeChange = (mode: EducationMode) => {
    if (anySaving || mode === educationMode) return;
    if (isDirty) {
      setPendingMode(mode);
      return;
    }
    doModeChange(mode);
  };

  const confirmPendingMode = async () => {
    const mode = pendingMode;
    setPendingMode(null);
    if (mode) await doModeChange(mode);
  };

  const handleTogglePushFirst = async (next: boolean) => {
    if (anySaving) return;
    const prev = pushFirstSaveWhatsApp;
    setPushFirstSaveWhatsApp(next);
    setSavingPushFirst(true);
    try {
      const payload = buildPayload({ pushFirstSaveWhatsApp: next });
      await fetchJson(api("settings"), { method: "PUT", body: JSON.stringify(payload) });
      setSavedSnap(snapshotOf(payload.systemTitle, payload.systemTitleEn, tabs));
      toast.success(
        next
          ? isEn
            ? "Portal push-first notifications enabled"
            : "تم تفعيل إشعارات البوابة أولاً"
          : isEn
            ? "Portal push-first notifications disabled"
            : "تم إيقاف إشعارات البوابة أولاً",
      );
      await emitUpdated(payload, {
        systemTitle: payload.systemTitle,
        systemTitleEn: payload.systemTitleEn,
        educationMode,
        enableSubjects,
        pushFirstSaveWhatsApp: next,
        companySlug,
        publicCode,
        customDomain,
        tabs: payload.tabs as EducationTabConfig[],
      });
    } catch (err: any) {
      setPushFirstSaveWhatsApp(prev);
      toast.error(err.message || (isEn ? "Failed to update notification setting" : "فشل تحديث إعداد الإشعارات"));
    } finally {
      setSavingPushFirst(false);
    }
  };

  const handleToggleDemoDay = async (next: boolean) => {
    if (anySaving) return;
    const prev = enableDemoDay;
    setEnableDemoDay(next);
    setSavingDemoDay(true);
    const updatedTabs = tabs.map((tb) =>
      tb.id.toLowerCase() === "demo-day" ? { ...tb, visible: next } : tb,
    );
    setTabs(updatedTabs);
    try {
      const payload = buildPayload({
        enableDemoDay: next,
        demoVisible: next,
        tabsOverride: updatedTabs,
      });
      await fetchJson(api("settings"), { method: "PUT", body: JSON.stringify(payload) });
      setSavedSnap(snapshotOf(payload.systemTitle, payload.systemTitleEn, updatedTabs));
      toast.success(
        next
          ? isEn
            ? "Demo Day section activated (visible in sidebar & education menu)"
            : "تم تفعيل قسم الديمو داي بنجاح (ظاهر بالقائمة الجانبية)"
          : isEn
            ? "Demo Day section hidden"
            : "تم تعطيل وإخفاء قسم الديمو داي",
      );
      await emitUpdated(payload, {
        systemTitle: payload.systemTitle,
        systemTitleEn: payload.systemTitleEn,
        educationMode,
        enableSubjects,
        enableDemoDay: next,
        pushFirstSaveWhatsApp,
        companySlug,
        publicCode,
        customDomain,
        tabs: payload.tabs as EducationTabConfig[],
      });
    } catch (err: any) {
      setEnableDemoDay(prev);
      toast.error(err.message || (isEn ? "Failed to toggle Demo Day section" : "فشل تعديل حالة سيكشن الديمو داي"));
    } finally {
      setSavingDemoDay(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSystemTitle(preset.systemTitle);
    setSystemTitleEn(preset.systemTitleEn);
    setTabs((prev) =>
      prev.map((tab) => {
        const replacement = (preset.labels as any)[tab.id];
        return replacement ? { ...tab, labelAr: replacement.ar, labelEn: replacement.en } : tab;
      }),
    );
    const presetName = isEn ? preset.nameEn || preset.name : preset.name;
    const modeHint =
      preset.mode && preset.mode !== educationMode
        ? isEn
          ? " — mode switch needs your confirmation"
          : " — تبديل النمط يحتاج تأكيدك"
        : "";
    toast.success(
      isEn
        ? `Applied "${presetName}" preset — click Save to apply changes${modeHint}`
        : `تم تطبيق قالب "${presetName}" — اضغط حفظ لتطبيق التغييرات${modeHint}`,
    );
    // Always gate the implied mode switch behind the confirm dialog: the preset
    // labels are fresh unsaved state and must be saved together with the mode
    // (a direct call here would read stale closures and save old labels).
    if (preset.mode && preset.mode !== educationMode) {
      setPendingMode(preset.mode);
    }
  };

  const moveTab = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    moveTabTo(index, targetIndex);
  };

  const moveTabTo = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= tabs.length || to >= tabs.length) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(from, 1);
    if (!moved) return;
    newTabs.splice(to, 0, moved);
    setTabs(newTabs.map((tb, idx) => ({ ...tb, order: idx })));
  };

  const toggleVisibility = (index: number) => {
    setTabs((prev) => prev.map((tb, i) => (i === index ? { ...tb, visible: !tb.visible } : tb)));
  };

  const updateLabel = (index: number, lang: "ar" | "en", value: string) => {
    setTabs((prev) =>
      prev.map((tb, i) => (i === index ? (lang === "ar" ? { ...tb, labelAr: value } : { ...tb, labelEn: value }) : tb)),
    );
  };

  const resetTabToDefault = (index: number) => {
    setTabs((prev) =>
      prev.map((tb, i) =>
        i === index ? { ...tb, labelAr: tb.defaultLabelAr, labelEn: tb.defaultLabelEn } : tb,
      ),
    );
    toast.info(isEn ? "Restored default label for this item" : "تمت استعادة الاسم الافتراضي لهذا العنصر");
  };

  const resetAllToDefaults = () => {
    setSystemTitle("النظام التعليمي");
    setSystemTitleEn("Education System");
    setTabs((prev) =>
      prev.map((tb, i) => ({ ...tb, labelAr: tb.defaultLabelAr, labelEn: tb.defaultLabelEn, visible: true, order: i })),
    );
    toast.info(isEn ? "All labels and tabs restored to system defaults" : "تمت استعادة كافة المسميات والتابات الافتراضية");
  };

  const discardChanges = () => {
    if (initialData) applyData(initialData);
    toast.info(isEn ? "Unsaved changes discarded" : "تم تجاهل التعديلات غير المحفوظة");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      await fetchJson(api("settings"), { method: "PUT", body: JSON.stringify(payload) });
      setSavedSnap(snapshotOf(payload.systemTitle, payload.systemTitleEn, tabs));
      toast.success(
        isEn
          ? "Education settings saved and sidebar updated successfully"
          : "تم حفظ إعدادات النظام التعليمي وتحديث القائمة الجانبية بنجاح",
      );
      await emitUpdated(payload, {
        systemTitle: payload.systemTitle,
        systemTitleEn: payload.systemTitleEn,
        educationMode,
        enableSubjects,
        pushFirstSaveWhatsApp,
        companySlug,
        publicCode,
        customDomain,
        tabs: payload.tabs as EducationTabConfig[],
      });
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to save education settings" : "فشل حفظ إعدادات النظام التعليمي"));
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = useMemo(() => tabs.filter((tb) => tb.visible).length, [tabs]);

  const isDirty = useMemo(() => {
    if (savedSnap === null) return false;
    return snapshotOf(systemTitle, systemTitleEn, tabs) !== savedSnap;
  }, [savedSnap, systemTitle, systemTitleEn, tabs]);

  // Warn before losing unsaved edits on refresh/close
  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Ctrl/Cmd+S saves when dirty
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isDirty && !anySaving) void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, anySaving]);

  return {
    // state
    loading,
    saving,
    savingMode,
    savingPushFirst,
    savingDemoDay,
    anySaving,
    systemTitle,
    systemTitleEn,
    educationMode,
    enableSubjects,
    enableDemoDay,
    pushFirstSaveWhatsApp,
    companySlug,
    publicCode,
    customDomain,
    tabs,
    visibleCount,
    isDirty,
    pendingMode,
    // setters
    setSystemTitle,
    setSystemTitleEn,
    // handlers
    handleModeChange,
    confirmPendingMode,
    setPendingMode,
    handleTogglePushFirst,
    handleToggleDemoDay,
    applyPreset,
    moveTab,
    moveTabTo,
    toggleVisibility,
    updateLabel,
    resetTabToDefault,
    resetAllToDefaults,
    discardChanges,
    handleSave,
  };
}

export type EducationSettingsController = ReturnType<typeof useEducationSettingsController>;

export default useEducationSettingsController;
