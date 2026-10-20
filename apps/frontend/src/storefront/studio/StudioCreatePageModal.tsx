import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  STUDIO_PAGE_PRESETS,
  STUDIO_PAGE_PRESET_CATEGORIES,
  type StudioPagePreset,
  type StudioPagePresetCategory,
} from "./StudioPagePresets";

interface StudioCreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSlugs: string[];
  onCreatePage: (newPage: {
    title: string;
    slug: string;
    template: string;
    showInMenu: boolean;
  }) => Promise<void>;
}

export const StudioCreatePageModal: React.FC<StudioCreatePageModalProps> = ({
  isOpen,
  onClose,
  existingSlugs,
  onCreatePage,
}) => {
  const [title, setTitle] = useState("عن المتجر");
  const [slug, setSlug] = useState("about");
  const [slugEdited, setSlugEdited] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("about");
  const [selectedCategory, setSelectedCategory] = useState<"all" | StudioPagePresetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInMenu, setShowInMenu] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePreset = useMemo(() => {
    return (
      STUDIO_PAGE_PRESETS.find((p) => p.id === selectedPresetId) ||
      STUDIO_PAGE_PRESETS[0]
    );
  }, [selectedPresetId]);


  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultPreset =
        STUDIO_PAGE_PRESETS.find((p) => p.id === "about") || STUDIO_PAGE_PRESETS[0];
      setTitle(defaultPreset.label);
      setSlug(defaultPreset.suggestedSlug);
      setSlugEdited(false);
      setSelectedPresetId(defaultPreset.id);
      setSelectedCategory("all");
      setSearchQuery("");
      setShowInMenu(true);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const normalizedSlug = useMemo(() => {
    return slug
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }, [slug]);

  // Slug Validation & Uniqueness Check
  const slugValidation = useMemo(() => {
    if (!normalizedSlug) {
      return { isValid: false, message: "رابط الصفحة (Slug) مطلوب بالإنجليزية" };
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return {
        isValid: false,
        message: "يجب أن يحتوي الرابط على أحرف إنجليزية صغيرة وأرقام وشرطات فقط",
      };
    }
    const isTaken = existingSlugs.some(
      (s) => s.trim().toLowerCase() === normalizedSlug
    );
    if (isTaken) {
      return {
        isValid: false,
        message: `الرابط "${normalizedSlug}" مستخدم بالفعل، يرجى اختيار رابط آخر`,
      };
    }
    return { isValid: true, message: null };
  }, [normalizedSlug, existingSlugs]);

  // Filter presets based on category and search query
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return STUDIO_PAGE_PRESETS.filter((preset) => {
      const matchesCategory =
        selectedCategory === "all" || preset.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        preset.label.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.suggestedSlug.toLowerCase().includes(q) ||
        preset.id.toLowerCase().includes(q) ||
        preset.menuLabel.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  const canSubmit =
    title.trim().length > 0 &&
    slugValidation.isValid &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      await onCreatePage({
        title: title.trim(),
        slug: normalizedSlug,
        template: selectedPresetId,
        showInMenu,
      });
      onClose();
    } catch (err) {
      console.error("Error creating custom page:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const effectiveMenuLabel =
    activePreset.menuLabel && activePreset.menuLabel !== activePreset.label
      ? activePreset.menuLabel
      : activePreset.menuLabel || title || "الصفحة";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-page-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlusIcon className="h-4 w-4" />
            </span>
            <div>
              <h2
                id="create-page-title"
                className="text-sm font-black text-foreground"
              >
                إنشاء صفحة جديدة من قالب
              </h2>
              <p className="text-[11px] text-muted-foreground">
                اختر صفحة جاهزة من مكتبة البريستات العشرة وخصص العنوان والرابط
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="إغلاق"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
          {/* Inputs Row: Title and Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>عنوان الصفحة</span>
                <span className="text-[10px] text-muted-foreground">يظهر في الهيدر والتبويبات</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: هوم إديتوريال، عروض وفلاش سيل..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            {/* Slug Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>رابط الصفحة اللاتيني (Slug)</span>
                <span className="text-[10px] text-muted-foreground">أحرف لاتينية وشرطات</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute start-3 font-mono text-xs text-muted-foreground select-none">
                  /
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  dir="ltr"
                  placeholder="about"
                  className={`w-full rounded-xl border bg-background ps-6 pe-3 py-2 text-xs font-mono font-medium transition-all focus:outline-none ${
                    slugValidation.isValid
                      ? "border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      : "border-destructive text-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                  }`}
                />
              </div>
              {slugValidation.message && (
                <p className="flex items-center gap-1 text-[10.5px] font-semibold text-destructive mt-1">
                  <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{slugValidation.message}</span>
                </p>
              )}
              {slugValidation.isValid && normalizedSlug && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  الرابط النهائي: /{normalizedSlug}
                </p>
              )}
            </div>
          </div>

          {/* Presets Library Picker */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>مكتبة الصفحات الجاهزة (10 صفحات)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                  {filteredPresets.length} متاحة
                </span>
              </label>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في الصفحات الجاهزة..."
                  className="w-full rounded-lg border border-border bg-background ps-8 pe-3 py-1.5 text-[11px] font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              <button
                type="button"
                data-testid="category-tab-all"
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                الكل ({STUDIO_PAGE_PRESETS.length})
              </button>
              {STUDIO_PAGE_PRESET_CATEGORIES.map((cat) => {
                const count = STUDIO_PAGE_PRESETS.filter((p) => p.category === cat.id).length;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`category-tab-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto p-0.5 [scrollbar-width:thin]">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const categoryDef = STUDIO_PAGE_PRESET_CATEGORIES.find(
                  (c) => c.id === preset.category
                );

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      if (!slugEdited) {
                        setSlug(preset.suggestedSlug);
                        setTitle(preset.label);
                      }
                    }}
                    className={`text-start flex flex-col justify-between p-3 rounded-xl border transition-all text-xs active:scale-[0.98] ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{preset.icon}</span>
                          <span className="font-black text-foreground text-xs truncate">
                            {preset.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {categoryDef && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                              {categoryDef.label}
                            </span>
                          )}
                          {isSelected ? (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <CheckIcon className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-border" />
                          )}
                        </div>
                      </div>

                      <p className="text-[10.5px] text-muted-foreground leading-snug line-clamp-2 mt-1">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-border/50 flex items-center justify-between gap-1">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {preset.sections.slice(0, 3).map((sec, i) => (
                          <span
                            key={i}
                            className="font-mono text-[8.5px] px-1 py-0.2 rounded bg-muted text-muted-foreground truncate"
                          >
                            {sec.type}
                          </span>
                        ))}
                        {preset.sections.length > 3 && (
                          <span className="font-mono text-[8.5px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                            +{preset.sections.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-primary/80 font-bold shrink-0">
                        {preset.sections.length} أقسام
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredPresets.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  لا توجد صفحات جاهزة مطابقة لكلمة البحث
                </div>
              )}
            </div>
          </div>

          {/* Menu Option Checkbox */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInMenu}
                onChange={(e) => setShowInMenu(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-foreground">
                  أضف رابط الصفحة إلى القائمة الرئيسية (المنيو)
                </span>
                <p className="text-[10px] text-muted-foreground">
                  يضيف زر «{effectiveMenuLabel}» في شريط التنقل العلوي للمتجر
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                canSubmit
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              }`}
            >
              {isSubmitting ? (
                <span>جاري الإنشاء...</span>
              ) : (
                <>
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>إنشاء الصفحة وتجهيزها</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
