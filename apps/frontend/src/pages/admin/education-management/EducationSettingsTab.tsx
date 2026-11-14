import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  Building2,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { PortalInviteAndPushCard } from "./PortalInviteAndPushCard";
import { Switch } from "../../../components/ui/switch";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { PRESETS } from "./educationSettingsPresets";
import { EducationModeSelector } from "./EducationModeSelector";
import { EducationSectionRow } from "./EducationSectionRow";
import { useEducationSettingsController } from "./useEducationSettingsController";
import type { EducationSettingsData } from "./types";

interface EducationSettingsTabProps {
  onSaved?: (newSettings: EducationSettingsData) => void;
  /** Notifies the page shell so it can guard tab switches while dirty (additive, optional). */
  onDirtyChange?: (dirty: boolean) => void;
}

function SectionHeader({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-bold text-foreground">
      <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      {children}
    </h4>
  );
}

export function EducationSettingsTab({ onSaved, onDirtyChange }: EducationSettingsTabProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const c = useEducationSettingsController(onSaved);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const moveRef = useRef(c.moveTabTo);
  moveRef.current = c.moveTabTo;

  useEffect(() => {
    onDirtyChange?.(c.isDirty);
  }, [c.isDirty, onDirtyChange]);

  const beginDrag = (index: number) => {
    dragIndexRef.current = index;
    overIndexRef.current = index;
    setDragIndex(index);
    setOverIndex(index);
  };

  // Pointer-based reorder tracking (works for mouse and touch)
  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e: PointerEvent) => {
      const rows = Array.from(document.querySelectorAll("[data-testid^='education-section-row-']"));
      let idx: number | null = null;
      rows.forEach((r, i) => {
        const rect = r.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) idx = i;
      });
      overIndexRef.current = idx;
      setOverIndex(idx);
    };
    const onUp = () => {
      const from = dragIndexRef.current;
      const to = overIndexRef.current;
      if (from !== null && to !== null && from !== to) moveRef.current(from, to);
      dragIndexRef.current = null;
      overIndexRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragIndex]);

  if (c.loading) {
    return (
      <div className="space-y-4 animate-pulse" dir={isEn ? "ltr" : "rtl"} aria-busy="true">
        <div className="flex items-center justify-between gap-3">
          <div className="h-5 w-64 rounded-lg bg-muted" />
          <div className="h-5 w-28 rounded-lg bg-muted" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2.5">
              <div className="h-4 w-40 rounded-md bg-muted" />
              {i === 4 ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="h-9 rounded-lg bg-muted/70" />
                  ))}
                </div>
              ) : (
                <div className="h-16 rounded-xl bg-muted/70" />
              )}
            </div>
          ))}
        </div>
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
            {isEn ? `${c.visibleCount}/${c.tabs.length} visible` : `${c.visibleCount}/${c.tabs.length} ظاهر`}
          </span>
        </h3>
        <button
          type="button"
          onClick={c.resetAllToDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {t("education.settingsTab.resetDefaults", isEn ? "Reset Defaults" : "استعادة الافتراضي")}
        </button>
      </div>

      <div className="space-y-4">
        {/* Single-surface chassis + portal card */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl">
            {/* 1. Operation mode */}
            <section className="p-4 sm:p-5 border-b border-border/60 space-y-3">
              <SectionHeader icon={GraduationCap}>
                {t("education.settingsTab.modeTitle", isEn ? "Operation Mode" : "نمط تشغيل المنظومة")}
              </SectionHeader>
              <EducationModeSelector
                mode={c.educationMode}
                isEn={isEn}
                disabled={c.anySaving}
                onChange={c.handleModeChange}
              />
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
                      onClick={() => c.applyPreset(preset)}
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
                  {c.savingDemoDay && (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  <Switch
                    checked={c.enableDemoDay}
                    disabled={c.anySaving}
                    onCheckedChange={(v) => c.handleToggleDemoDay(Boolean(v))}
                    aria-label={isEn ? "Toggle Demo Day section" : "تبديل تفعيل سيكشن الديمو داي"}
                  />
                </div>
              </div>
            </section>

            {/* 4. Branches & Classrooms Management */}
            <section className="p-4 sm:p-5 border-b border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground">
                      {isEn ? "Branches & Training Classrooms" : "فروع ومقرات المركز والقاعات التدريبية"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {isEn
                        ? "Manage physical locations, classroom capacities, and Google Maps links"
                        : "إدارة الفروع الميدانية، سعة المعامل والقاعات، وروابط خرائط Google المباشرة"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/admin/education/branches"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground transition-all active:scale-[0.98]"
                  >
                    <span>{isEn ? "Manage Branches" : "إدارة الفروع والقاعات"}</span>
                    <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
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
                    value={c.systemTitle}
                    onChange={(e) => c.setSystemTitle(e.target.value)}
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
                    value={c.systemTitleEn}
                    onChange={(e) => c.setSystemTitleEn(e.target.value)}
                    placeholder="e.g. Education System"
                    maxLength={60}
                    dir="ltr"
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>
            </section>

            {/* 5. Sections list (drag & drop reorder) */}
            <section className="p-4 sm:p-5 space-y-1">
              <SectionHeader icon={Layers}>
                {t("education.settingsTab.sectionsTitle", isEn ? "System Sections" : "سكاشن النظام والقائمة الجانبية")}
              </SectionHeader>
              <div className="divide-y divide-border/60">
                {c.tabs.map((tab, index) => (
                  <EducationSectionRow
                    key={tab.id}
                    tab={tab}
                    index={index}
                    total={c.tabs.length}
                    isEn={isEn}
                    dragging={dragIndex === index}
                    over={dragIndex !== null && overIndex === index && dragIndex !== index}
                    onMove={c.moveTab}
                    onToggleVisibility={c.toggleVisibility}
                    onLabel={c.updateLabel}
                    onReset={c.resetTabToDefault}
                    onDragStart={beginDrag}
                  />
                ))}
              </div>
            </section>
          </div>

          <PortalInviteAndPushCard
            companySlug={c.companySlug}
            publicCode={c.publicCode}
            customDomain={c.customDomain}
            pushFirstSaveWhatsApp={c.pushFirstSaveWhatsApp}
            onTogglePushFirst={c.handleTogglePushFirst}
            savingPushFirst={c.savingPushFirst}
            isEn={isEn}
          />
        </div>

      </div>

      {/* Sticky save bar — appears only with unsaved changes */}
      {c.isDirty && (
        <div className="sticky bottom-3 z-20">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 backdrop-blur px-3.5 py-2 shadow-lg">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {isEn ? "Unsaved changes — Ctrl+S to save" : "تعديلات غير محفوظة — Ctrl+S للحفظ"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={c.discardChanges}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {isEn ? "Discard" : "تجاهل"}
              </button>
              <button
                type="button"
                onClick={c.handleSave}
                disabled={c.saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {c.saving ? (
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
        open={c.pendingMode !== null}
        title={isEn ? "Switch operation mode?" : "تغيير نمط التشغيل؟"}
        content={
          isEn
            ? "You have unsaved label edits. Switching the mode saves them together with the mode change."
            : "لديك تعديلات مسميات غير محفوظة — سيتم حفظها معًا مع تغيير النمط."
        }
        confirmLabel={isEn ? "Save & Switch" : "حفظ وتغيير"}
        cancelLabel={isEn ? "Cancel" : "إلغاء"}
        confirmColor="primary"
        onConfirm={() => void c.confirmPendingMode()}
        onCancel={() => c.setPendingMode(null)}
      />
    </div>
  );
}

export default EducationSettingsTab;
