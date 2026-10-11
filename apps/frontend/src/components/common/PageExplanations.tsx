import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  PlayCircleIcon,
  XMarkIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
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
  slug: string;
}

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

  // الانتقال بين الصفحات يقفل الـ popover المفتوح
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

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
        className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
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
            className="absolute top-1 end-1 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-gray-900"
            aria-hidden="true"
          />
        )}
      </PopoverTrigger>
    );

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

      {/* Modal */}
      {selectedExp && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedExp(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedExp.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedExp(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-5">
              {/* Video */}
              {selectedExp.videoUrl && (
                <VideoBlock videoUrl={selectedExp.videoUrl} title={selectedExp.title} />
              )}

              {/* Text content */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedExp.content) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/** بلوك الفيديو المشترك داخل المودال (يوتيوب embed / ملف مباشر / لينك خارجي) */
const VideoBlock: React.FC<{ videoUrl: string; title: string }> = ({ videoUrl, title }) => {
  const { t } = useTranslation();
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  const directVideoUrl = embedUrl ? null : getDirectVideoUrl(videoUrl);

  return (
    <>
      {embedUrl && (
        <div className="relative w-full pb-[56.25%] mb-4 rounded-xl overflow-hidden bg-black">
          <iframe
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {directVideoUrl && (
        <div className="w-full mb-4 rounded-xl overflow-hidden bg-black">
          <video
            className="w-full max-h-[60vh]"
            src={directVideoUrl}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      )}

      {!embedUrl && !directVideoUrl && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm font-medium"
          >
            <PlayCircleIcon className="h-5 w-5" />
            {t("explanations.watchVideo", "شاهد الفيديو التوضيحي")}
          </a>
        </div>
      )}
    </>
  );
};

export default PageExplanations;
