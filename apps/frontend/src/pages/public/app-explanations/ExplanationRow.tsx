import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Link2,
  PlayCircle,
  Share2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { CardVideoBlock } from "./ExplanationVideo";
import type { AppExplanation } from "./groups";
import "./explanations.css";

/**
 * صف شرح واحد داخل قائمة القسم (Grouped Inset Cell):
 * مصمم لمعايير شاشات الموبايل: مساحة لمس مريحة (Touch Targets >= 48px)،
 * تغذية راجعة لمسية (Tactile Active Feedback)، زر مشاركة أصلي (Native Share API)،
 * وزر مباشر للانتقال إلى الميزة داخل لوحة التحكم إذا وُجد targetRoute.
 */
export const ExplanationRow: React.FC<{
  exp: AppExplanation;
  idx: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchVideoLabel: string;
}> = ({ exp, idx, open, onOpenChange, watchVideoLabel }) => {
  const hasVideo = Boolean(exp.videoUrl);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  const sharedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      if (sharedTimer.current) window.clearTimeout(sharedTimer.current);
    };
  }, []);

  const getExplanationUrl = () => {
    return `${window.location.origin}${window.location.pathname}#${exp.slug}`;
  };

  const handleCopyLink = async () => {
    const url = getExplanationUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = url;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      try {
        document.execCommand("copy");
      } catch {
        /* المتصفح رفض النسخ */
      }
      document.body.removeChild(helper);
    }
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = getExplanationUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: exp.title,
          text: `شرح: ${exp.title} — منصة MaxP`,
          url,
        });
        setShared(true);
        if (sharedTimer.current) window.clearTimeout(sharedTimer.current);
        sharedTimer.current = window.setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        /* المستخدم ألغى المشاركة أو حدث استثناء */
      }
    }
    // في حال عدم توفر navigator.share نقوم بنسخ الرابط
    handleCopyLink();
  };

  return (
    <Collapsible open={open} onOpenChange={(nextOpen: boolean) => onOpenChange(nextOpen)}>
      <div
        id={exp.slug}
        className={`scroll-mt-[120px] transition-colors sm:scroll-mt-[80px] ${
          idx > 0 ? "border-t border-border/50" : ""
        } ${open ? "bg-primary/[0.02] dark:bg-primary/[0.04]" : ""}`}
      >
        <CollapsibleTrigger className="group flex min-h-[50px] w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-start transition-colors hover:bg-muted/40 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4">
          {/* أيقونة نوع الشرح (فيديو / مقال) على غرار إعدادات iOS */}
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
              hasVideo
                ? "bg-primary/10 text-primary"
                : "bg-muted/70 text-muted-foreground group-hover:text-foreground"
            }`}
          >
            {hasVideo ? (
              <PlayCircle className="size-4.5" aria-hidden="true" />
            ) : (
              <FileText className="size-4" aria-hidden="true" />
            )}
          </div>

          {/* عنوان الشرح */}
          <span className="min-w-0 flex-1 text-[14px] font-bold leading-snug text-foreground sm:text-[14.5px]">
            {exp.title}
          </span>

          {/* شارة فيديو للشاشات الكبيرة */}
          {hasVideo && (
            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary sm:inline-flex">
              فيديو
            </span>
          )}

          {/* مؤشر التوسيع/الطي بسلاسة */}
          <ChevronDown
            className={`size-4.5 shrink-0 text-muted-foreground/60 transition-transform duration-250 ease-out ${
              open ? "rotate-180 text-primary" : "group-hover:text-foreground"
            }`}
            aria-hidden="true"
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          {open && (
            <div className="border-t border-border/50 bg-card px-3.5 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
                {/* كتلة الفيديو إن وُجد */}
                <CardVideoBlock exp={exp} watchVideoLabel={watchVideoLabel} />

                {/* نص الشرح المنسق */}
                <div
                  className="exp-article prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exp.content) }}
                />

                {/* شريط الإجراءات السفلي (Action Bar) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3.5">
                  <div className="flex items-center gap-2">
                    {/* زر المشاركة الأصلية للموبايل */}
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-95"
                    >
                      {shared ? (
                        <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Share2 className="size-3.5" aria-hidden="true" />
                      )}
                      <span>{shared ? "تمت المشاركة" : "مشاركة"}</span>
                    </button>

                    {/* زر نسخ الرابط */}
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Link2 className="size-3.5" aria-hidden="true" />
                      )}
                      <span>{copied ? "تم نسخ الرابط" : "نسخ الرابط"}</span>
                    </button>
                  </div>

                  {/* الانتقال المباشر للميزة في المنصة إذا وُجد المسار */}
                  {exp.targetRoute && (
                    <Link
                      to={exp.targetRoute}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-[12px] font-bold text-primary transition-all hover:bg-primary/20 active:scale-95"
                    >
                      <span>الانتقال للميزة في المنصة</span>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
