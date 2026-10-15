import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  PlayCircle,
  X,
  BookOpen,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { VideoBlock } from "./explanations/VideoBlock";
import DOMPurify from "dompurify";

interface Explanation {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  videoUrlMobile?: string | null;
  slug: string;
}

export interface PageExplanationsProps {
  className?: string;
  variant?: "icon" | "block";
}

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
    } catch {
      setExplanations([]);
    }
  }, [location.pathname]);

  useEffect(() => {
    void fetchExplanations();
  }, [fetchExplanations]);

  useEffect(() => {
    setOpen(false);
    setSelectedExp(null);
  }, [location.pathname]);

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
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
      >
        <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold truncate">
          {t("explanations.pageHelp", "شرح الصفحة")}
        </span>
        {hasExplanations && (
          <span
            className="ms-auto shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums"
            aria-hidden="true"
          >
            {explanations.length}
          </span>
        )}
      </PopoverTrigger>
    ) : (
      <PopoverTrigger
        className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
        title={t("explanations.pageHelp", "شرح الصفحة")}
        aria-label={t("explanations.pageHelp", "شرح الصفحة")}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        {hasExplanations && (
          <span
            className="absolute top-1 end-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background"
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
        className="relative my-auto bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-border/80 shrink-0"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/60 shrink-0 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedExp.videoUrl ? (
              <PlayCircle className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
            )}
            <h3
              id="explanation-modal-title"
              className="text-sm sm:text-base font-bold text-foreground truncate"
            >
              {selectedExp.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setSelectedExp(null)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 active:scale-95"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {(selectedExp.videoUrl || selectedExp.videoUrlMobile) && (
            <VideoBlock
              videoUrl={selectedExp.videoUrl}
              videoUrlMobile={selectedExp.videoUrlMobile}
              title={selectedExp.title}
            />
          )}

          <div
            className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-xs"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedExp.content) }}
          />

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>عندك فكرة أو مقترح لتطوير المنصة؟</span>
            <Link
              to="/suggestions"
              onClick={() => setSelectedExp(null)}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <span>عندك اقتراح؟ ابعتلنا</span>
              <ArrowLeft className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </div>
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
          className="w-80 max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl"
        >
          {hasExplanations ? (
            <div className="max-h-72 overflow-y-auto py-1.5 divide-y divide-border/40">
              {explanations.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => openExplanation(exp)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  {exp.videoUrl ? (
                    <PlayCircle className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <span className="truncate min-w-0 flex-1">{exp.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              {t("explanations.noPageExplanations", "مفيش شرح مخصوص للصفحة دي")}
            </div>
          )}

          <div className="border-t border-border/60 p-2 flex items-center justify-between bg-muted/30">
            <Link
              to="/app-explanations"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors no-underline"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t("explanations.allExplanations", "كل الشروحات")}</span>
            </Link>
            <Link
              to="/suggestions"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1"
            >
              عندك اقتراح؟
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {modalContent && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
};

export default PageExplanations;
