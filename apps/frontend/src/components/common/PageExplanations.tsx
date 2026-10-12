import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  PlayCircleIcon,
  XMarkIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import {
  getYouTubeEmbedUrl,
  getDirectVideoUrl,
} from "../../utils/explanationVideo";
import DOMPurify from "dompurify";

interface Explanation {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  /** نسخة الموبايل الرأسية (9:16) — تُعرض تلقائيًا على الموبايل */
  videoUrlMobile?: string | null;
  slug: string;
}

/**
 * هل الجهاز الحالي موبايل؟ نفس نقطة الكسر المستخدمة في الشل (lg = 1024px).
 * بنعتمد على matchMedia بدل الـCSS وحده عشان نختار الفيديو الصح فعلًا.
 */
const useIsMobileViewport = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
};

export interface PageExplanationsProps {
  className?: string;
  /**
   * icon  — زر أيقونة مضغوط لصف أدوات الهيدر (الافتراضي)
   * block — زر بعرض كامل لشريط جانبي (AppSidebar)
   */
  variant?: "icon" | "block";
}

/**
 * المدخل الموحّد لشروحات الصفحات: زر «؟» دائم يفتح popover فيه
 * شروحات الصفحة الحالية + رابط «كل الشروحات». يظهر حتى لو الصفحة
 * الحالية مكونلهاش شروحات — المدخل لازم يفضل موجود في كل مكان.
 */
const PageExplanations: React.FC<PageExplanationsProps> = ({
  className = "",
  variant = "icon",
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [selectedExp, setSelectedExp] = useState<Explanation | null>(null);
  const [open, setOpen] = useState(false);

  const fetchExplanations = useCallback(async () => {
    try {
      const route = location.pathname;
      const res = await apiClient.get(
        `/app-explanations/by-route?route=${encodeURIComponent(route)}`
      );
      const data = res.data as any;
      if (data?.success && Array.isArray(data.explanations)) {
        setExplanations(data.explanations);
      } else {
        setExplanations([]);
      }
    } catch (err) {
      // Silently fail — this is a helper, not critical
      console.error("PageExplanations fetch error:", err);
      setExplanations([]);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchExplanations();
  }, [fetchExplanations]);

  // الانتقال بين الصفحات يقفل الـ popover والمودال المفتوح
  useEffect(() => {
    setOpen(false);
    setSelectedExp(null);
  }, [location.pathname]);

  // إغلاق المودال بزر Escape
  useEffect(() => {
    if (!selectedExp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedExp(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedExp]);

  const hasExplanations = explanations.length > 0;

  const openExplanation = (exp: Explanation) => {
    setSelectedExp(exp);
    setOpen(false);
  };

  const trigger =
    variant === "block" ? (
      <PopoverTrigger
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2
          text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${className}`}
      >
        <QuestionMarkCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium truncate">
          {t("explanations.pageHelp", "شرح الصفحة")}
        </span>
        {hasExplanations && (
          <span
            className="ms-auto shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[11px] font-semibold tabular-nums"
            aria-hidden="true"
          >
            {explanations.length}
          </span>
        )}
      </PopoverTrigger>
    ) : (
      <PopoverTrigger
        className={`business-icon-button relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full
          text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-all active:scale-95 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${className}`}
        title={t("explanations.pageHelp", "شرح الصفحة")}
        aria-label={t("explanations.pageHelp", "شرح الصفحة")}
      >
        <QuestionMarkCircleIcon className="h-5 w-5" aria-hidden="true" />
        {hasExplanations && (
          <span
            className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-gray-900"
            aria-hidden="true"
          />
        )}
      </PopoverTrigger>
    );

  const modalContent = selectedExp ? (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto flex items-center justify-center"
      onClick={() => setSelectedExp(null)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="explanation-modal-title"
    >
      <div
        className="relative my-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header - permanently pinned */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedExp.videoUrl ? (
              <PlayCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <BookOpenIcon className="h-5 w-5 text-blue-500 shrink-0" />
            )}
            <h3
              id="explanation-modal-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate"
            >
              {selectedExp.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setSelectedExp(null)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0 cursor-pointer"
            aria-label="إغلاق"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {/* Video — نسخة الموبايل تلقائيًا على الموبايل، مع زرار تبديل للنسختين */}
          {(selectedExp.videoUrl || selectedExp.videoUrlMobile) && (
            <VideoBlock
              videoUrl={selectedExp.videoUrl}
              videoUrlMobile={selectedExp.videoUrlMobile}
              title={selectedExp.title}
            />
          )}

          {/* Text content */}
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedExp.content) }}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Popover open={open} onOpenChange={(nextOpen: boolean) => setOpen(nextOpen)}>
        {variant === "block" ? (
          <div className="px-3 pb-2">{trigger}</div>
        ) : (
          trigger
        )}
        <PopoverContent
          align="end"
          dir="rtl"
          className="w-80 max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden"
        >
          {hasExplanations ? (
            <div className="max-h-72 overflow-y-auto py-1.5">
              {explanations.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => openExplanation(exp)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 mx-0 text-start
                    text-[13px] font-medium text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
                >
                  {exp.videoUrl ? (
                    <PlayCircleIcon
                      className="h-4 w-4 shrink-0 text-red-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <BookOpenIcon
                      className="h-4 w-4 shrink-0 text-blue-500"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate min-w-0">{exp.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-[13px] text-gray-400 dark:text-gray-500">
              {t("explanations.noPageExplanations", "مفيش شرح مخصوص للصفحة دي")}
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
            <Link
              to="/app-explanations"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2
                text-[13px] font-semibold text-blue-600 dark:text-blue-400
                hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors no-underline"
            >
              <BookOpenIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("explanations.allExplanations", "كل الشروحات")}
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Modal with Portal to document.body */}
      {modalContent && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
};

/** بلوك الفيديو المشترك داخل المودال (يوتيوب embed / ملف مباشر / لينك خارجي) */
const VideoBlock: React.FC<{
  videoUrl: string | null;
  videoUrlMobile?: string | null;
  title: string;
}> = ({ videoUrl, videoUrlMobile, title }) => {
  const { t } = useTranslation();
  const isMobileViewport = useIsMobileViewport();
  const hasBoth = Boolean(videoUrl && videoUrlMobile);
  // null = اتبع الجهاز تلقائيًا · true/false = اختيار صريح من زرار التبديل
  const [override, setOverride] = useState<boolean | null>(null);
  const showMobile = hasBoth
    ? override === null
      ? isMobileViewport
      : override
    : !videoUrl && Boolean(videoUrlMobile);
  const activeUrl = (showMobile ? videoUrlMobile : videoUrl) || videoUrl || videoUrlMobile || "";
  const embedUrl = getYouTubeEmbedUrl(activeUrl);
  const directVideoUrl = embedUrl ? null : getDirectVideoUrl(activeUrl);
  // النسخة الرأسية محتاجة نسبة 9:16 عشان متتقطعش
  const frameClass = showMobile
    ? "w-full aspect-[9/16] max-h-[420px] mx-auto rounded-xl overflow-hidden bg-black shadow-md border border-gray-800"
    : "w-full aspect-video max-h-[340px] mx-auto rounded-xl overflow-hidden bg-black shadow-md border border-gray-800";

  const toggleBtn = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
      active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
    }`;

  return (
    <>
      {hasBoth && (
        <div className="flex items-center gap-1.5 mb-2 justify-end" dir="rtl">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 me-1">
            {t("explanations.watchHow", "شاهد الطريقة من:")}
          </span>
          <button type="button" className={toggleBtn(showMobile)} onClick={() => setOverride(true)}>
            {t("explanations.mobileVersion", "الموبايل")}
          </button>
          <button type="button" className={toggleBtn(!showMobile)} onClick={() => setOverride(false)}>
            {t("explanations.desktopVersion", "اللابتوب")}
          </button>
        </div>
      )}

      {embedUrl && (
        <div className="space-y-2 mb-4">
          <div className={frameClass}>
            <iframe
              className="w-full h-full border-0"
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <PlayCircleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span>{showMobile ? "فيديو من الموبايل" : "فيديو من اللابتوب"}</span>
            </span>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <span>فتح على يوتيوب</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        </div>
      )}

      {directVideoUrl && (
        <div className="space-y-2 mb-4">
          <div className={frameClass}>
            <video
              className="w-full h-full object-contain"
              src={directVideoUrl}
              controls
              playsInline
              preload="metadata"
            />
          </div>
          <div className="flex items-center justify-end px-1 text-xs">
            <a
              href={directVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <span>فتح الفيديو في نافذة جديدة</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        </div>
      )}

      {!embedUrl && !directVideoUrl && (
        <div className="mb-4 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
            يوجد فيديو توضيحي لهذه الصفحة
          </span>
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline"
          >
            <PlayCircleIcon className="h-4 w-4 text-red-500" />
            <span>{t("explanations.watchVideo", "شاهد الفيديو التوضيحي")}</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </>
  );
};

export default PageExplanations;
