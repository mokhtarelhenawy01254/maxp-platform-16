import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PhotoIcon,
  GlobeAltIcon,
  DocumentMagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import type { StorefrontPageSEOConfig, StorefrontPageStatus } from "../types/theme.types";
import { auditA11y } from "./utils/a11yAudit";
import { auditSeo } from "./utils/seoAudit";
import { auditLinks } from "./utils/linkAudit";

export interface PrepublishCheckResult {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  sectionKey?: string;
  category?: "general" | "a11y" | "seo" | "links";
}

export function runPrepublishChecks(params: {
  pageKey: string;
  pageTitle?: string;
  seo?: StorefrontPageSEOConfig;
  sections?: any[];
  availablePages?: string[];
}): PrepublishCheckResult[] {
  const { pageTitle, seo, sections = [], availablePages = [] } = params;
  const results: PrepublishCheckResult[] = [];

  // 1. Page Title & SEO Title
  const hasSeoTitle = Boolean(seo?.title?.trim());
  const hasPageTitle = Boolean(pageTitle?.trim());
  if (hasSeoTitle) {
    results.push({
      id: "title",
      label: "عنوان الصفحة ومحركات البحث",
      status: "pass",
      message: `عنوان SEO محدد بنجاح: "${seo!.title!.trim()}" (${seo!.title!.trim().length}/60 حرف)`,
    });
  } else if (hasPageTitle) {
    results.push({
      id: "title",
      label: "عنوان الصفحة ومحركات البحث",
      status: "warn",
      message: `يتم استخدام عنوان الصفحة الافتراضي "${pageTitle!.trim()}" — يُنصح بإضافة SEO Title مخصص`,
    });
  } else {
    results.push({
      id: "title",
      label: "عنوان الصفحة ومحركات البحث",
      status: "fail",
      message: "عنوان الصفحة مفقود بالكامل",
    });
  }

  // 2. SEO Description
  const hasSeoDesc = Boolean(seo?.description?.trim());
  if (hasSeoDesc) {
    results.push({
      id: "description",
      label: "وصف محركات البحث (Meta Description)",
      status: "pass",
      message: `وصف SEO متوفر بنجاح (${seo!.description!.trim().length}/160 حرف)`,
    });
  } else {
    results.push({
      id: "description",
      label: "وصف محركات البحث (Meta Description)",
      status: "warn",
      message: "وصف SEO مفقود — يُنصح بإضافته لتحسين نسبة النقر في نتائج البحث",
    });
  }

  // 3. Empty Sections
  if (!sections || sections.length === 0) {
    results.push({
      id: "sections",
      label: "أقسام الصفحة",
      status: "fail",
      message: "الصفحة لا تحتوي على أي أقسام بعد",
    });
  } else {
    const emptySections: string[] = [];
    sections.forEach((sec, idx) => {
      const type = typeof sec === "string" ? sec : sec?.type || `قسم ${idx + 1}`;
      const settings = typeof sec === "object" && sec !== null ? sec.settings || sec : {};
      const label = sec?.label || type;

      const hasTitle = Boolean(settings.title || settings.heading || settings.headline || settings.badge);
      const hasContent = Boolean(settings.content || settings.subtitle || settings.body || settings.description);
      const hasItems = Array.isArray(settings.items) && settings.items.length > 0;
      const hasProducts = Array.isArray(settings.products) && settings.products.length > 0;
      const hasImages = Boolean(
        settings.image || settings.imageUrl || settings.backgroundImage || (Array.isArray(settings.images) && settings.images.length > 0)
      );

      if (!hasTitle && !hasContent && !hasItems && !hasProducts && !hasImages) {
        emptySections.push(label);
      }
    });

    if (emptySections.length > 0) {
      results.push({
        id: "sections",
        label: "فحص الأقسام الفارغة",
        status: "fail",
        message: `تم رصد أقسام فارغة بدون عنوان أو محتوى: ${emptySections.join("، ")}`,
      });
    } else {
      results.push({
        id: "sections",
        label: "فحص الأقسام الفارغة",
        status: "pass",
        message: `جميع أقسام الصفحة (${sections.length}) تحتوي على محتوى وعناوين`,
      });
    }
  }

  // 4. Images Missing Alt
  const missingAltImages: string[] = [];
  sections.forEach((sec, idx) => {
    const type = typeof sec === "string" ? sec : sec?.type || `قسم ${idx + 1}`;
    const settings = typeof sec === "object" && sec !== null ? sec.settings || sec : {};
    const label = sec?.label || type;

    const directImage = settings.image || settings.imageUrl || settings.backgroundImage || settings.bannerUrl;
    if (directImage && typeof directImage === "string" && directImage.trim()) {
      const alt = settings.alt || settings.imageAlt || settings.altText;
      if (!alt || !String(alt).trim()) {
        missingAltImages.push(`صورة في "${label}"`);
      }
    }

    if (Array.isArray(settings.items)) {
      settings.items.forEach((item: any, itemIdx: number) => {
        if (item && (item.image || item.imageUrl || item.src)) {
          const itemAlt = item.alt || item.imageAlt || item.altText;
          if (!itemAlt || !String(itemAlt).trim()) {
            missingAltImages.push(`صورة ${itemIdx + 1} في "${label}"`);
          }
        }
      });
    }
  });

  if (missingAltImages.length > 0) {
    results.push({
      id: "alt",
      label: "النصوص البديلة للصور (Image Alt)",
      status: "fail",
      message: `تم رصد صور بدون نص بديل (alt text): ${missingAltImages.join("، ")}`,
    });
  } else {
    results.push({
      id: "alt",
      label: "النصوص البديلة للصور (Image Alt)",
      status: "pass",
      message: "جميع صور الصفحة تحتوي على نصوص بديلة ملائمة للـ SEO",
    });
  }

  // 5. Internal Links
  const brokenLinks: string[] = [];
  sections.forEach((sec, idx) => {
    const type = typeof sec === "string" ? sec : sec?.type || `قسم ${idx + 1}`;
    const settings = typeof sec === "object" && sec !== null ? sec.settings || sec : {};
    const label = sec?.label || type;

    const linksToCheck: string[] = [];
    if (settings.link && typeof settings.link === "string") linksToCheck.push(settings.link);
    if (settings.buttonLink && typeof settings.buttonLink === "string") linksToCheck.push(settings.buttonLink);
    if (settings.ctaLink && typeof settings.ctaLink === "string") linksToCheck.push(settings.ctaLink);
    if (settings.buttonUrl && typeof settings.buttonUrl === "string") linksToCheck.push(settings.buttonUrl);
    if (settings.url && typeof settings.url === "string") linksToCheck.push(settings.url);
    if (settings.href && typeof settings.href === "string") linksToCheck.push(settings.href);

    if (Array.isArray(settings.items)) {
      settings.items.forEach((it: any) => {
        if (it?.link && typeof it.link === "string") linksToCheck.push(it.link);
        if (it?.ctaLink && typeof it.ctaLink === "string") linksToCheck.push(it.ctaLink);
        if (it?.url && typeof it.url === "string") linksToCheck.push(it.url);
      });
    }

    linksToCheck.forEach((href) => {
      const trimmed = href.trim();
      if (!trimmed || trimmed === "#" || trimmed.startsWith("javascript:")) {
        brokenLinks.push(`رابط فارغ في "${label}"`);
        return;
      }

      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
        return;
      }

      // Internal route
      const cleanPath = trimmed.split("?")[0].split("#")[0].replace(/^\/+/, "");
      if (!cleanPath) return; // "/" is home

      const standardRoutes = ["shop", "products", "catalog", "cart", "checkout", "thank-you", "collections", "articles"];
      const isKnownStandard = standardRoutes.some((r) => cleanPath === r || cleanPath.startsWith(`${r}/`));
      const isAvailableCustom = availablePages.some(
        (p) => p === cleanPath || cleanPath === `pages/${p}` || cleanPath === `shop/page/${p}`
      );

      if (!isKnownStandard && !isAvailableCustom) {
        brokenLinks.push(`"${trimmed}" في "${label}"`);
      }
    });
  });

  if (brokenLinks.length > 0) {
    results.push({
      id: "links",
      label: "الروابط الداخلية",
      status: "fail",
      message: `تم رصد روابط داخلية قد تكون غير متوفرة أو معطلة: ${brokenLinks.join("، ")}`,
      category: "links",
    });
  } else {
    results.push({
      id: "links",
      label: "الروابط الداخلية",
      status: "pass",
      message: "جميع الروابط الداخلية تشير إلى صفحات متوفرة في المتجر",
      category: "links",
    });
  }

  // 6. Deep Accessibility (A11y) Audit
  const a11yResult = auditA11y({ sections });
  if (a11yResult.issues.length > 0) {
    a11yResult.issues.forEach((issue) => {
      results.push({
        id: `a11y-${issue.id}`,
        label: `سهولة الوصول: ${
          issue.type === "contrast"
            ? "تباين الألوان"
            : issue.type === "heading-order"
            ? "تسلسل العناوين"
            : issue.type === "button-label"
            ? "تسمية الأزرار"
            : issue.type === "touch-target"
            ? "حجم أهداف اللمس"
            : "النصوص البديلة"
        }`,
        status: issue.severity,
        message: issue.message,
        sectionKey: issue.sectionKey,
        category: "a11y",
      });
    });
  } else if (sections.length > 0) {
    results.push({
      id: "a11y-passed",
      label: "معايير سهولة الوصول (A11y)",
      status: "pass",
      message: "اجتازت الصفحة جميع معايير سهولة الوصول WCAG AA بنجاح (التباين، ترتيب العناوين، أزرار التحكم).",
      category: "a11y",
    });
  }

  // 7. Deep SEO Audit
  const seoResult = auditSeo({ pageTitle, seo, sections });
  seoResult.issues.forEach((issue) => {
    if (issue.type === "duplicate-heading" || issue.type === "missing-h1" || issue.type === "missing-og") {
      results.push({
        id: `seo-${issue.id}`,
        label: `تحسين محركات البحث: ${
          issue.type === "duplicate-heading"
            ? "عناوين مكررة"
            : issue.type === "missing-h1"
            ? "العنوان الرئيسي H1"
            : "صورة المشاركة OG"
        }`,
        status: issue.severity,
        message: issue.message,
        sectionKey: issue.sectionKey,
        category: "seo",
      });
    } else if (issue.type === "title" && (issue.id === "seo-title-short" || issue.id === "seo-title-long")) {
      results.push({
        id: `seo-${issue.id}`,
        label: "طول عنوان الصفحة (SEO Title)",
        status: issue.severity,
        message: issue.message,
        category: "seo",
      });
    } else if (issue.type === "description" && (issue.id === "seo-desc-short" || issue.id === "seo-desc-long")) {
      results.push({
        id: `seo-${issue.id}`,
        label: "طول وصف محركات البحث (Meta Description)",
        status: issue.severity,
        message: issue.message,
        category: "seo",
      });
    }
  });

  // 8. Deep Link Audit
  const linkResult = auditLinks({ sections, availablePages });
  if (linkResult.issues.length > 0) {
    linkResult.issues.forEach((issue) => {
      const alreadyReported = results.some((r) => r.id === `link-${issue.id}`);
      if (!alreadyReported) {
        results.push({
          id: `link-${issue.id}`,
          label: `فحص الروابط: ${
            issue.type === "unknown-route"
              ? "مسار غير معروف"
              : issue.type === "placeholder-hash"
              ? "رابط معطل (#)"
              : issue.type === "empty-link"
              ? "رابط فارغ"
              : "بروتوكول غير آمن"
          }`,
          status: issue.severity,
          message: issue.message,
          sectionKey: issue.sectionKey,
          category: "links",
        });
      }
    });
  }

  return results;
}

export interface StudioPageSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageKey: string;
  pageTitle?: string;
  storeName?: string;
  seo?: StorefrontPageSEOConfig;
  status?: StorefrontPageStatus;
  sections?: any[];
  availablePages?: string[];
  defaultTab?: "status" | "seo" | "prepublish";
  onUpdateSeo: (seo: Partial<StorefrontPageSEOConfig>) => void;
  onUpdateStatus: (status: StorefrontPageStatus) => void;
  onOpenImagePicker?: () => void;
  onSelectSection?: (sectionKey: string) => void;
}

export const StudioPageSettingsPanel: React.FC<StudioPageSettingsPanelProps> = ({
  isOpen,
  onClose,
  pageKey,
  pageTitle,
  storeName = "متجري",
  seo = {},
  status = "published",
  sections = [],
  availablePages = [],
  defaultTab = "status",
  onUpdateSeo,
  onUpdateStatus,
  onOpenImagePicker,
  onSelectSection,
}) => {
  const [activeTab, setActiveTab] = useState<"status" | "seo" | "prepublish">(defaultTab);

  React.useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
      const timer = setTimeout(() => {
        scrollToSection(`panel-section-${defaultTab}`);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultTab]);
  const [prepublishRan, setPrepublishRan] = useState(false);
  const [auditFilter, setAuditFilter] = useState<"all" | "fail" | "warn" | "pass">("all");

  const prepublishResults = useMemo(() => {
    return runPrepublishChecks({
      pageKey,
      pageTitle,
      seo,
      sections,
      availablePages,
    });
  }, [pageKey, pageTitle, seo, sections, availablePages]);

  const hasCriticalFails = prepublishResults.some((r) => r.status === "fail");

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer / Panel */}
      <aside
        data-testid="studio-page-settings-panel"
        dir="rtl"
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-lg flex-col border-s border-[#2a2d33] bg-[#17181c] text-[#e8eaee] shadow-2xl transition-transform"
      >
        {/* Panel Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#2a2d33] px-4 shrink-0">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-[#3b82f6]" />
            <span className="font-bold text-sm sm:text-base">إعدادات الصفحة ({pageTitle || pageKey})</span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                status === "draft"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {status === "draft" ? "مسودة" : "منشورة"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9ba0a8] hover:bg-[#202226] hover:text-white transition-colors"
            title="إغلاق"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs (Quick Scroll / Section Jump) */}
        <div className="flex border-b border-[#2a2d33] bg-[#1d1f24] p-1 gap-1 sticky top-0 z-10 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("status");
              scrollToSection("panel-section-status");
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "status"
                ? "bg-[#2b6cf6] text-white shadow-xs"
                : "text-[#9ba0a8] hover:text-white"
            }`}
          >
            حالة النشر
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("seo");
              scrollToSection("panel-section-seo");
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "seo"
                ? "bg-[#2b6cf6] text-white shadow-xs"
                : "text-[#9ba0a8] hover:text-white"
            }`}
          >
            SEO ومحركات البحث
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("prepublish");
              scrollToSection("panel-section-prepublish");
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "prepublish"
                ? "bg-[#2b6cf6] text-white shadow-xs"
                : "text-[#9ba0a8] hover:text-white"
            }`}
          >
            فحص قبل النشر
          </button>
        </div>

        {/* Panel Content Body — PAGE-1.2: All sections remain mounted & accessible in DOM */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-start">
          {/* SECTION 1: STATUS (Always in DOM) */}
          <div id="panel-section-status" className="space-y-3 pb-5 border-b border-[#2a2d33]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#c3c7cd] flex items-center gap-1.5">
                <EyeIcon className="h-4 w-4 text-[#3b82f6]" />
                <span>حالة نشر الصفحة للجمهور</span>
              </span>
              <span className="text-[11px] text-[#9ba0a8]">
                {status === "draft" ? "غير مرئية في القوائم" : "مرئية في المتجر"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="page-status-published"
                onClick={() => onUpdateStatus("published")}
                className={`flex flex-col items-center gap-2 rounded-xl p-3 sm:p-4 border transition-all text-center ${
                  status === "published"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold ring-1 ring-emerald-500/30"
                    : "border-[#2c2f35] bg-[#202226] text-[#9ba0a8] hover:border-[#3b3f46] hover:text-white"
                }`}
              >
                <EyeIcon className="h-6 w-6" />
                <span className="text-xs">منشورة (Published)</span>
                <span className="text-[10px] text-[#808791]">مرئية للجميع وفي قوائم المتجر</span>
              </button>

              <button
                type="button"
                data-testid="page-status-draft"
                onClick={() => onUpdateStatus("draft")}
                className={`flex flex-col items-center gap-2 rounded-xl p-3 sm:p-4 border transition-all text-center ${
                  status === "draft"
                    ? "border-amber-500 bg-amber-500/10 text-amber-300 font-bold ring-1 ring-amber-500/30"
                    : "border-[#2c2f35] bg-[#202226] text-[#9ba0a8] hover:border-[#3b3f46] hover:text-white"
                }`}
              >
                <EyeSlashIcon className="h-6 w-6" />
                <span className="text-xs">مسودة (Draft)</span>
                <span className="text-[10px] text-[#808791]">مستبعدة من المنيو وتظهر مع باچ معاينة</span>
              </button>
            </div>

            <div className="rounded-lg border border-[#2c2f35] bg-[#1d1f24] p-3 text-xs text-[#9ba0a8] leading-relaxed">
              💡 <span className="text-white font-medium">ملاحظة:</span> الصفحات في وضع المسودة لا تظهر في شريط التنقل
              للمتجر، وعند زيارتها يظهر شريط تنبيه يفيد بأنها قيد المعاينة وليست منشورة للعملاء.
            </div>
          </div>

          {/* SECTION 2: PREPUBLISH CHECKS (Always in DOM) */}
          <div id="panel-section-prepublish" className="space-y-3 pb-5 border-b border-[#2a2d33]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#c3c7cd] flex items-center gap-1.5">
                <DocumentMagnifyingGlassIcon className="h-4 w-4 text-[#3b82f6]" />
                <span>فحص الجودة والسلامة قبل النشر</span>
              </span>
              <button
                type="button"
                data-testid="run-prepublish-check-btn"
                onClick={() => setPrepublishRan(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#2b6cf6] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1d5ce6] transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                <span>إعادة الفحص</span>
              </button>
            </div>

            {/* Warning/Success Banner */}
            {hasCriticalFails ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold block">تنبيه قبل النشر</span>
                  <span>تم رصد بعض المشكلات التي قد تؤثر على ظهور متجرك أو تجربة العميل. يُفضل معالجتها قبل النشر.</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300 leading-relaxed flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-bold block">الصفحة جاهزة للنشر</span>
                  <span>جميع بنود الفحص اجتازت معايير الجودة ومحركات البحث بنجاح.</span>
                </div>
              </div>
            )}

            {/* Results Filter & Count */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px]">
              <button
                type="button"
                onClick={() => setAuditFilter("all")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  auditFilter === "all"
                    ? "bg-[#2b6cf6] text-white"
                    : "bg-[#202226] text-[#9ba0a8] hover:text-white"
                }`}
              >
                الكل ({prepublishResults.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("fail")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  auditFilter === "fail"
                    ? "bg-rose-500 text-white"
                    : "bg-[#202226] text-rose-400 hover:text-white"
                }`}
              >
                أخطاء ({prepublishResults.filter((r) => r.status === "fail").length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("warn")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  auditFilter === "warn"
                    ? "bg-amber-500 text-white"
                    : "bg-[#202226] text-amber-400 hover:text-white"
                }`}
              >
                تحذيرات ({prepublishResults.filter((r) => r.status === "warn").length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("pass")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  auditFilter === "pass"
                    ? "bg-emerald-600 text-white"
                    : "bg-[#202226] text-emerald-400 hover:text-white"
                }`}
              >
                ناجحة ({prepublishResults.filter((r) => r.status === "pass").length})
              </button>
            </div>

            {/* Results List */}
            <div data-testid="prepublish-results" className="space-y-2">
              {prepublishResults
                .filter((r) => (auditFilter === "all" ? true : r.status === auditFilter))
                .map((result) => (
                  <div
                    key={result.id}
                    className="flex items-start gap-2.5 rounded-lg border border-[#2c2f35] bg-[#202226] p-3 text-xs"
                  >
                    {result.status === "pass" && (
                      <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    )}
                    {result.status === "warn" && (
                      <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    )}
                    {result.status === "fail" && (
                      <XCircleIcon className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white block">{result.label}</span>
                        {result.category && (
                          <span className="rounded bg-[#2a2d33] px-1.5 py-0.2 text-[9px] font-mono text-[#9ba0a8]">
                            {result.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9ba0a8] leading-relaxed break-words">{result.message}</p>
                    </div>
                    {result.sectionKey && (
                      <button
                        type="button"
                        data-testid={`jump-to-problem-${result.sectionKey}`}
                        onClick={() => {
                          onSelectSection?.(result.sectionKey!);
                          scrollToSection(result.sectionKey!);
                        }}
                        className="shrink-0 mt-0.5 inline-flex items-center gap-1 rounded bg-[#2b6cf6]/15 hover:bg-[#2b6cf6]/25 border border-[#2b6cf6]/30 px-2 py-1 text-[11px] font-semibold text-[#60a5fa] transition-colors"
                      >
                        <span>انتقل للمشكلة</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* SECTION 3: SEO (Always in DOM) */}
          <div id="panel-section-seo" className="space-y-4">
            <span className="text-xs font-bold text-[#c3c7cd] flex items-center gap-1.5">
              <GlobeAltIcon className="h-4 w-4 text-[#3b82f6]" />
              <span>تحسين محركات البحث والظهور الاجتماعي (SEO)</span>
            </span>

            {/* Title Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#c3c7cd]">عنوان الصفحة في جوجل (SEO Title)</label>
                <span
                  data-testid="seo-title-counter"
                  className={`text-[11px] font-mono ${
                    (seo.title?.length || 0) > 60 ? "text-amber-400 font-bold" : "text-[#7e848d]"
                  }`}
                >
                  {seo.title?.length || 0}/60
                </span>
              </div>
              <input
                type="text"
                data-testid="seo-title-input"
                value={seo.title || ""}
                onChange={(e) => onUpdateSeo({ title: e.target.value })}
                placeholder="مثال: عروض الصيف — متجر max-p"
                className="w-full rounded-lg border border-[#2c2f35] bg-[#202226] px-3 py-2 text-xs text-white placeholder-[#60656e] focus:border-[#2b6cf6] focus:outline-none"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#c3c7cd]">وصف الصفحة (SEO Description)</label>
                <span
                  data-testid="seo-description-counter"
                  className={`text-[11px] font-mono ${
                    (seo.description?.length || 0) > 160 ? "text-amber-400 font-bold" : "text-[#7e848d]"
                  }`}
                >
                  {seo.description?.length || 0}/160
                </span>
              </div>
              <textarea
                rows={3}
                data-testid="seo-description-input"
                value={seo.description || ""}
                onChange={(e) => onUpdateSeo({ description: e.target.value })}
                placeholder="اكتب وصفاً جذاباً يشجع الزوار على النقر والشراء من متجرك..."
                className="w-full rounded-lg border border-[#2c2f35] bg-[#202226] px-3 py-2 text-xs text-white placeholder-[#60656e] focus:border-[#2b6cf6] focus:outline-none resize-none"
              />
            </div>

            {/* OG Image Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#c3c7cd]">صورة المشاركة على السوشيال ميديا (OG Image)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  data-testid="seo-ogimage-input"
                  value={seo.ogImage || ""}
                  onChange={(e) => onUpdateSeo({ ogImage: e.target.value })}
                  placeholder="رابط الصورة (URL) للمعاينة على فيسبوك وواتساب"
                  className="flex-1 rounded-lg border border-[#2c2f35] bg-[#202226] px-3 py-2 text-xs text-white placeholder-[#60656e] focus:border-[#2b6cf6] focus:outline-none"
                />
                {onOpenImagePicker && (
                  <button
                    type="button"
                    data-testid="seo-ogimage-picker-btn"
                    onClick={onOpenImagePicker}
                    className="flex h-8 items-center gap-1 rounded-lg border border-[#32353b] bg-[#202226] px-2.5 text-xs font-medium text-[#c3c7cd] hover:text-white hover:bg-[#282b30] transition-colors"
                  >
                    <PhotoIcon className="h-3.5 w-3.5" />
                    <span>اختر</span>
                  </button>
                )}
              </div>
              {seo.ogImage && (
                <div className="mt-2 h-24 w-full rounded-lg border border-[#2c2f35] overflow-hidden bg-black/40">
                  <img src={seo.ogImage} alt="OG Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Canonical URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#c3c7cd]">الرابط الأساسي (Canonical URL)</label>
              <input
                type="text"
                data-testid="seo-canonical-input"
                value={seo.canonical || ""}
                onChange={(e) => onUpdateSeo({ canonical: e.target.value })}
                placeholder="https://example.com/page-slug"
                className="w-full rounded-lg border border-[#2c2f35] bg-[#202226] px-3 py-2 text-xs text-white placeholder-[#60656e] focus:border-[#2b6cf6] focus:outline-none font-mono"
              />
            </div>

            {/* Noindex Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-[#2c2f35] bg-[#1d1f24] p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-white block">إخفاء من محركات البحث (noindex)</span>
                <span className="text-[11px] text-[#9ba0a8] block">منع عناكب جوجل من فهرسة هذه الصفحة في نتائج البحث</span>
              </div>
              <input
                type="checkbox"
                data-testid="seo-noindex-toggle"
                checked={Boolean(seo.noindex)}
                onChange={(e) => onUpdateSeo({ noindex: e.target.checked })}
                className="h-4 w-4 rounded accent-[#2b6cf6] cursor-pointer"
              />
            </div>

            {/* SERP Preview */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#c3c7cd] block">معاينة نتيجة بحث جوجل (SERP Preview)</span>
              <div
                data-testid="seo-serp-preview"
                className="rounded-xl border border-[#2c2f35] bg-white p-3.5 text-start font-sans shadow-sm select-none"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[#202124] mb-1">
                  <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                    G
                  </div>
                  <span className="text-[#4d5156] truncate max-w-[280px]">
                    https://mystore.com › {pageKey}
                  </span>
                </div>
                <h4 className="text-base font-normal text-[#1a0dab] hover:underline cursor-pointer truncate">
                  {seo.title?.trim() || pageTitle || "عنوان الصفحة"}
                  {storeName && !seo.title?.includes(storeName) ? ` | ${storeName}` : ""}
                </h4>
                <p className="text-xs text-[#4d5156] line-clamp-2 mt-1 leading-relaxed">
                  {seo.description?.trim() ||
                    "أضف وصف SEO للصفحة لمعاينة شكل المتجر في نتائج محركات بحث جوجل..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
