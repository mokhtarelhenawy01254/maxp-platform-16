import React, { useState, useId, useEffect, useMemo } from "react";
import {
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  STUDIO_PAGE_TEMPLATES,
  type StudioPageTemplate,
} from "./utils/studioPageTemplates";

interface StudioCreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSlugs: string[];
  onCreatePage: (newPage: {
    title: string;
    slug: string;
    template: "about" | "contact" | "faq" | "article";
    showInMenu: boolean;
  }) => Promise<void>;
}

export const StudioCreatePageModal: React.FC<StudioCreatePageModalProps> = ({
  isOpen,
  onClose,
  existingSlugs,
  onCreatePage,
}) => {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    "about" | "contact" | "faq" | "article"
  >("about");
  const [showInMenu, setShowInMenu] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate suggested slug if user hasn't edited slug manually
  useEffect(() => {
    if (!slugEdited) {
      const template = STUDIO_PAGE_TEMPLATES.find((t) => t.id === selectedTemplate);
      if (template) {
        setSlug(template.defaultSlug);
      }
    }
  }, [selectedTemplate, slugEdited]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("عن المتجر");
      setSlug("about");
      setSlugEdited(false);
      setSelectedTemplate("about");
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
        template: selectedTemplate,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-page-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                اختر القالب وخصص العنوان والرابط اللاتيني لصفحتك
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
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
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                if (!slugEdited) {
                  // Derive slug hint from common words
                  if (/عن|من نحن|قصتنا/i.test(newTitle)) setSlug("about");
                  else if (/تواصل|اتصل|راسلنا/i.test(newTitle)) setSlug("contact");
                  else if (/سؤال|أسئلة|شائع/i.test(newTitle)) setSlug("faq");
                  else if (/مقال|مدونة|أخبار/i.test(newTitle)) setSlug("article");
                }
              }}
              placeholder="مثال: عن المتجر، تواصل معنا..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
            />
          </div>

          {/* Slug Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>رابط الصفحة اللاتيني (Slug)</span>
              <span className="text-[10px] text-muted-foreground">أحرف لاتينية وشرطات فقط</span>
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

          {/* Template Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>اختر قالب البداية</span>
              <span className="text-[10px] text-muted-foreground">4 قوالب مجهزة بأقسام جاهزة</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STUDIO_PAGE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(tmpl.id);
                      if (!slugEdited) {
                        setSlug(tmpl.defaultSlug);
                        setTitle(tmpl.name);
                      }
                    }}
                    className={`text-start flex flex-col justify-between p-2.5 rounded-xl border transition-all text-xs active:scale-[0.98] ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{tmpl.icon}</span>
                        <span className="font-black text-foreground text-xs">
                          {tmpl.name}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                      {tmpl.description}
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-border/50 flex flex-wrap gap-1">
                      {tmpl.sectionsSummary.map((sec) => (
                        <span
                          key={sec}
                          className="font-mono text-[8.5px] px-1 py-0.2 rounded bg-muted text-muted-foreground"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
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
                  يضيف زر «{title || "الصفحة"}» في شريط التنقل العلوي للمتجر
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
