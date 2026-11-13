import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Settings,
  RotateCcw,
  Save,
  GraduationCap,
  Layers,
  Wand2,
  Presentation,
  Type,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { api, fetchJson } from "./api";
import { useSidebarSettings } from "../../../contexts/SidebarSettingsContext";
import { PortalInviteAndPushCard } from "./PortalInviteAndPushCard";
import { Switch } from "../../../components/ui/switch";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { PRESETS } from "./educationSettingsPresets";
import { EducationModeSelector, type EducationMode } from "./EducationModeSelector";
import { EducationSectionRow } from "./EducationSectionRow";
import type { EducationTabConfig, EducationSettingsData } from "./types";

interface EducationSettingsTabProps {
  onSaved?: (newSettings: EducationSettingsData) => void;
}

const sbTheme = {
  panel: "var(--sb-bg-panel, #0f172a)",
  border: "var(--sb-border, rgba(255,255,255,0.08))",
  text: "var(--sb-text-main, #e2e8f0)",
  muted: "var(--sb-text-muted, #94a3b8)",
  accent: "var(--sb-accent, #3b82f6)",
  accentSoft: "var(--sb-accent-soft, rgba(59,130,246,0.15))",
} as const;

function SectionHeader({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-bold text-foreground">
      <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      {children}
    </h4>
  );
}

export function EducationSettingsTab({ onSaved }: EducationSettingsTabProps) {
  const { t, i18n } = useTranslation();
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

  const applyData = (data: EducationSettingsData) => {
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
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(api("settings"));
      if (data) applyData(data);
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to load education system settings" : "تعذر جلب إعدادات النظام التعليمي"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single source of truth for the settings PUT payload
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
    // enableDemoDay is only sent by its own toggle handler (matches previous payloads exactly)
    return o.enableDemoDay !== undefined ? { ...payload, enableDemoDay: o.enableDemoDay } : payload;
  };

  const emitUpdated = async (payload: object, saved: EducationSettingsData) => {
    if (refreshSettings) await refreshSettings();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("education-settings-updated", { detail: payload }));
    }
    if (onSaved) onSaved(saved);
  };

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
    toast.success(
      isEn
        ? `Applied "${presetName}" preset — click Save to apply changes`
        : `تم تطبيق قالب "${presetName}" — اضغط حفظ لتطبيق التغييرات`,
    );
  };

  const moveTab = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(index, 1);
    if (!moved) return;
    newTabs.splice(targetIndex, 0, moved);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">
          {t("education.settingsTab.loading", isEn ? "Loading education settings..." : "جاري تحميل إعدادات النظام التعليمي...")}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      {/* Slim header: title + visible count + factory reset (single surface, no banner) */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground min-w-0">
          <Settings className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <span className="truncate">
            {t("education.settingsTab.title", isEn ? "Labels & Sections" : "مسميات وسكاشن النظام التعليمي")}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
            {isEn ? `${visibleCount}/${tabs.length} visible` : `${visibleCount}/${tabs.length} ظاهر`}
          </span>
        </h3>
        <button
          type="button"
          onClick={resetAllToDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {t("education.settingsTab.resetDefaults", isEn ? "Reset Defaults" : "استعادة الافتراضي")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: single-surface chassis + portal card */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card border border-border rounded-2xl">
            {/* 1. Operation mode */}
            <section className="p-4 sm:p-5 border-b border-border/60 space-y-3">
              <SectionHeader icon={GraduationCap}>
                {t("education.settingsTab.modeTitle", isEn ? "Operation Mode" : "نمط تشغيل المنظومة")}
              </SectionHeader>
              <EducationModeSelector mode={educationMode} isEn={isEn} disabled={anySaving} onChange={handleModeChange} />
            </section>

            {/* 2. Terminology presets */}
            <section className="p-4 sm:p-5 border-b border-border/60 space-y-3">
              <SectionHeader icon={Wand2}>
                {t("education.settingsTab.presetsTitle", isEn ? "Quick Presets" : "قوالب تسميات جاهزة")}
              </SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      title={isEn ? preset.descEn || preset.desc : preset.desc}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-all active:scale-[0.98]"
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${preset.iconColor}`} aria-hidden="true" />
                      <span className="truncate">{isEn ? preset.nameEn || preset.name : preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Demo Day toggle */}
            <section className="p-4 sm:p-5 border-b border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Presentation className="w-4 h-4 text-purple-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground">
                      {isEn ? "Demo Day & Trial Sessions" : "سيكشن الديمو داي والفعاليات التجريبية"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {isEn
                        ? "Open days & trial sessions captured as CRM leads"
                        : "أيام مفتوحة وحصص تجربة — الحاضرون يتحولون Leads في CRM"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {savingDemoDay && (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  <Switch
                    checked={enableDemoDay}
                    disabled={anySaving}
                    onCheckedChange={(v) => handleToggleDemoDay(Boolean(v))}
                    aria-label={isEn ? "Toggle Demo Day section" : "تبديل تفعيل سيكشن الديمو داي"}
                  />
                </div>
              </div>
            </section>

            {/* 4. System title */}
            <section className="p-4 sm:p-5 border-b border-border/60 space-y-3">
              <SectionHeader icon={Type}>
                {t("education.settingsTab.systemNameTitle", isEn ? "Main System Title" : "المسمى الرئيسي للنظام")}
              </SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    {isEn ? "Arabic Name" : "الاسم بالعربية"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={systemTitle}
                    onChange={(e) => setSystemTitle(e.target.value)}
                    placeholder={isEn ? "e.g. النظام التعليمي" : "مثال: النظام التعليمي أو أكاديمية التدريب"}
                    maxLength={60}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    {isEn ? "English Name (Optional)" : "الاسم بالإنجليزية (اختياري)"}
                  </label>
                  <input
                    type="text"
                    value={systemTitleEn}
                    onChange={(e) => setSystemTitleEn(e.target.value)}
                    placeholder="e.g. Education System"
                    maxLength={60}
                    dir="ltr"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>
            </section>

            {/* 5. Sections list */}
            <section className="p-4 sm:p-5 space-y-1">
              <SectionHeader icon={Layers}>
                {t("education.settingsTab.sectionsTitle", isEn ? "System Sections" : "سكاشن النظام والقائمة الجانبية")}
              </SectionHeader>
              <div className="divide-y divide-border/60">
                {tabs.map((tab, index) => (
                  <EducationSectionRow
                    key={tab.id}
                    tab={tab}
                    index={index}
                    total={tabs.length}
                    isEn={isEn}
                    onMove={moveTab}
                    onToggleVisibility={toggleVisibility}
                    onLabel={updateLabel}
                    onReset={resetTabToDefault}
                  />
                ))}
              </div>
            </section>
          </div>

          <PortalInviteAndPushCard
            companySlug={companySlug}
            publicCode={publicCode}
            customDomain={customDomain}
            pushFirstSaveWhatsApp={pushFirstSaveWhatsApp}
            onTogglePushFirst={handleTogglePushFirst}
            savingPushFirst={savingPushFirst}
            isEn={isEn}
          />
        </div>

        {/* Right: sidebar preview themed from real sidebar CSS variables */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Eye className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
            {t("education.settingsTab.previewTitle", isEn ? "Sidebar Preview" : "معاينة القائمة الجانبية")}
          </h3>
          <div
            className="w-full rounded-xl border overflow-hidden select-none"
            style={{ background: sbTheme.panel, borderColor: sbTheme.border, color: sbTheme.text }}
            dir={isEn ? "ltr" : "rtl"}
          >
            <div
              className="flex items-center gap-2.5 px-3.5 py-3 border-b"
              style={{ borderColor: sbTheme.border }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: sbTheme.accentSoft, color: sbTheme.accent }}
              >
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">
                  {isEn ? systemTitleEn || systemTitle : systemTitle || "النظام التعليمي"}
                </div>
                <div className="text-[10px] truncate" style={{ color: sbTheme.muted }}>
                  {isEn ? systemTitle : systemTitleEn || "Education System"}
                </div>
              </div>
            </div>
            <div className="p-1.5 space-y-0.5">
              {tabs
                .filter((tb) => tb.visible)
                .map((tab, idx) => {
                  const active = idx === 0;
                  return (
                    <div
                      key={tab.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium truncate"
                      style={
                        active
                          ? { background: sbTheme.accentSoft, color: sbTheme.accent }
                          : { color: sbTheme.text }
                      }
                    >
                      <span className="w-6 text-center text-[9px] tabular-nums shrink-0" style={{ color: active ? undefined : sbTheme.muted }}>
                        #{idx + 1}
                      </span>
                      <span className="truncate">{isEn ? tab.labelEn || tab.defaultLabelEn || tab.labelAr : tab.labelAr || tab.defaultLabelAr}</span>
                    </div>
                  );
                })}
              {visibleCount === 0 && (
                <div className="px-2.5 py-3 text-[11px] text-center" style={{ color: sbTheme.muted }}>
                  {isEn ? "No visible sections" : "لا توجد سكاشن ظاهرة"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar — appears only with unsaved changes */}
      {isDirty && (
        <div className="sticky bottom-3 z-20">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 backdrop-blur px-3.5 py-2 shadow-lg">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {isEn ? "Unsaved changes" : "تعديلات غير محفوظة"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardChanges}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {isEn ? "Discard" : "تجاهل"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {t("education.settingsTab.saveChanges", isEn ? "Save Changes" : "حفظ التعديلات")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingMode !== null}
        title={isEn ? "Switch operation mode?" : "تغيير نمط التشغيل؟"}
        content={
          isEn
            ? "You have unsaved label edits. Switching the mode saves them together with the mode change."
            : "لديك تعديلات مسميات غير محفوظة — سيتم حفظها معًا مع تغيير النمط."
        }
        confirmLabel={isEn ? "Save & Switch" : "حفظ وتغيير"}
        cancelLabel={isEn ? "Cancel" : "إلغاء"}
        confirmColor="primary"
        onConfirm={() => {
          const mode = pendingMode;
          setPendingMode(null);
          if (mode) doModeChange(mode);
        }}
        onCancel={() => setPendingMode(null)}
      />
    </div>
  );
}

export default EducationSettingsTab;
