import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Sparkles,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { CardVideoBlock } from "./ExplanationVideo";
import { getYouTubeVideoId } from "../../../utils/explanationVideo";
import type { AppExplanation } from "./groups";
import type { TitleMatchRange } from "./search";
import "./explanations.css";

/** «جديد» = أُضيف خلال آخر 14 يومًا */
const isNewExplanation = (createdAt?: string | null): boolean => {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= 14 * 24 * 60 * 60 * 1000;
};

/** ثامبنيل مصغّرة للصفوف ذات الفيديو — mqdefault (16:9) مع سقوط لأيقونة عامة */
const RowThumb: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const videoId = getYouTubeVideoId(videoUrl);
  const [failed, setFailed] = useState(false);

  if (!videoId || failed) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <PlayCircle className="size-4.5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <span className="relative block size-8 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted sm:h-9 sm:w-16">
      <img
        src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 size-full object-cover"
      />
      <span
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/25"
        aria-hidden="true"
      >
        <PlayCircle className="size-3.5 text-white drop-shadow sm:size-4" />
      </span>
    </span>
  );
};

/**
 * نص الشرح: تنظيف HTML ثم لفّ المصطلحات اللاتينية بين قوسين — زي (Slug) أو
 * (Company ID) — في chips مصممة بدل كسر اتجاه النص العربي (bidi).المسح على
 * عُقد النص فقط عبر TreeWalker، ومفيش أي تعديل جوه الوسوم أو الروابط.
 */
const wrapLatinTerms = (root: HTMLElement): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || parent.closest("a, code, pre, button, script, style")) {
        return NodeFilter.FILTER_REJECT;
      }
      return /\(([A-Za-z][A-Za-z0-9 ._-]{0,39}[A-Za-z0-9])\)/.test(node.nodeValue || "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const targets: Text[] = [];
  while (walker.nextNode()) targets.push(walker.currentNode as Text);

  for (const node of targets) {
    const text = node.nodeValue || "";
    const frag = document.createDocumentFragment();
    let last = 0;
    let changed = false;
    const re = /\(([A-Za-z][A-Za-z0-9 ._-]{0,39}[A-Za-z0-9])\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      changed = true;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const chip = document.createElement("code");
      chip.className = "exp-term-chip";
      chip.textContent = m[1];
      frag.appendChild(chip);
      last = m.index + m[0].length;
    }
    if (changed) {
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode?.replaceChild(frag, node);
    }
  }
};

const ArticleContent: React.FC<{ html: string }> = ({ html }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = DOMPurify.sanitize(html);
    wrapLatinTerms(el);
  }, [html]);

  return <div ref={ref} className="exp-article prose max-w-none" />;
};

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
  /** نطاق تظليل المطابقة داخل العنوان (وضع البحث فقط) */
  highlight?: TitleMatchRange | null;
  /** الصف المُشار إليه بمؤشر تنقّل الكيبورد (↑↓) */
  cursorActive?: boolean;
}> = ({ exp, idx, open, onOpenChange, watchVideoLabel, highlight, cursorActive }) => {
  const hasVideo = Boolean(exp.videoUrl);
  const isNew = isNewExplanation(exp.createdAt);
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

  const getExplanationUrl = useCallback(
    () => `${window.location.origin}${window.location.pathname}#${exp.slug}`,
    [exp.slug],
  );

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
        <CollapsibleTrigger
          data-cursor={cursorActive ? "true" : undefined}
          className={`group flex min-h-[50px] w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-start transition-colors hover:bg-muted/40 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4 ${
            cursorActive ? "bg-muted/50 ring-2 ring-inset ring-primary/40" : ""
          }`}
        >
          {/* ثامبنيل الفيديو للصفوف المرئية — وأيقونة مقال لغيرها (iOS Settings style) */}
          {hasVideo ? (
            <RowThumb videoUrl={exp.videoUrl!} />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground transition-colors group-hover:text-foreground sm:size-9">
              <FileText className="size-4" aria-hidden="true" />
            </div>
          )}

          {/* عنوان الشرح — مع تظليل المطابقة في وضع البحث */}
          <span className="min-w-0 flex-1 text-[14px] font-bold leading-snug text-foreground sm:text-[14.5px]">
            {highlight && highlight.start < highlight.end && highlight.end <= exp.title.length ? (
              <>
                {exp.title.slice(0, highlight.start)}
                <mark className="exp-title-mark">
                  {exp.title.slice(highlight.start, highlight.end)}
                </mark>
                {exp.title.slice(highlight.end)}
              </>
            ) : (
              exp.title
            )}
          </span>

          {/* شارة «جديد» للإضافات الحديثة */}
          {isNew && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-2.5" aria-hidden="true" />
              جديد
            </span>
          )}

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
                <ArticleContent html={exp.content} />

                {/* شريط الإجراءات السفلي (Action Bar) — CTA الوصول للميزة هو الأساسي */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3.5">
                  <div className="flex items-center gap-2">
                    {/* زر المشاركة الأصلية للموبايل */}
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-95"
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
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary active:scale-95"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Link2 className="size-3.5" aria-hidden="true" />
                      )}
                      <span>{copied ? "تم نسخ الرابط" : "نسخ الرابط"}</span>
                    </button>
                  </div>

                  {/* الانتقال المباشر للميزة — الزر الأساسي المصمت */}
                  {exp.targetRoute && (
                    <Link
                      to={exp.targetRoute}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95"
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
