import React, { useState } from "react";
import { ExternalLink, PlayCircle, VideoOff } from "lucide-react";
import {
  getYouTubeEmbedUrl,
  getDirectVideoUrl,
  getYouTubeVideoId,
} from "../../../utils/explanationVideo";
import { useYouTubeEmbedError } from "../../../hooks/useYouTubeEmbedError";
import type { AppExplanation } from "./groups";

/** ثامبنيل الفاساد — maxresdefault مع سقوط تدريجي إلى hqdefault ثم إخفاء */
const FacadeThumb: React.FC<{ videoId: string; alt: string }> = ({ videoId, alt }) => {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (src.includes("maxresdefault")) {
          setSrc(`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`);
        } else {
          setHidden(true);
        }
      }}
      className="exp-facade-img absolute inset-0 size-full object-cover"
      aria-hidden="true"
    />
  );
};

/**
 * فيديو الكارت — Facade Player:
 * ثامبنيل نظيفة + زر تشغيل مخصص بدل كروم اليوتيوب الأحمر؛ الـ iframe يُحمَّل
 * عند أول ضغطة تشغيل فقط (تحميل عند الطلب + هوية بصرية موحّدة).
 */
export const CardVideoBlock: React.FC<{ exp: AppExplanation; watchVideoLabel: string }> = ({
  exp,
  watchVideoLabel,
}) => {
  const [playing, setPlaying] = useState(false);
  const yt = exp.videoUrl ? getYouTubeEmbedUrl(exp.videoUrl, { jsApi: true }) : null;
  const direct = exp.videoUrl && !yt ? getDirectVideoUrl(exp.videoUrl) : null;
  const ytVideoId = exp.videoUrl ? getYouTubeVideoId(exp.videoUrl) : null;
  const { failed: ytFailed, iframeRef, handshake } = useYouTubeEmbedError(playing ? yt : null);

  if (!exp.videoUrl) return null;

  return (
    <>
      {yt && ytFailed && (
        <div className="flex max-w-[760px] items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50 p-3.5 dark:border-amber-500/40 dark:bg-amber-500/10">
          <VideoOff className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="text-xs leading-relaxed">
            <span className="block font-bold text-foreground">الفيديو التوضيحي مش متاح حاليًا</span>
            <span className="block text-muted-foreground">
              الشرح المكتوب تحت كامل — وإحنا بنرجّع الفيديو في أقرب وقت.
            </span>
          </div>
        </div>
      )}

      {yt && !playing && (
        <div className="max-w-[760px] space-y-2">
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="exp-facade group relative block aspect-video max-h-[240px] w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 dark:from-slate-800 dark:to-slate-900 sm:max-h-[340px]"
            aria-label={`${watchVideoLabel} — ${exp.title}`}
          >
            {ytVideoId && <FacadeThumb videoId={ytVideoId} alt="" />}
            <span
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20 group-active:bg-black/25"
              aria-hidden="true"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
                <PlayCircle className="size-7" aria-hidden="true" />
              </span>
            </span>
          </button>
          <div className="flex items-center justify-start px-1">
            <a
              href={exp.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span>فتح على يوتيوب ↗</span>
            </a>
          </div>
        </div>
      )}

      {yt && playing && !ytFailed && (
        <div className="max-w-[760px] space-y-2">
          <div className="aspect-video max-h-[240px] w-full overflow-hidden rounded-xl border border-border bg-black shadow-sm sm:max-h-[340px]">
            <iframe
              ref={iframeRef}
              id={`yt-card-${exp.id}`}
              className="h-full w-full border-0"
              src={yt}
              title={exp.title}
              onLoad={handshake}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex items-center justify-start px-1">
            <a
              href={exp.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span>فتح على يوتيوب ↗</span>
            </a>
          </div>
        </div>
      )}

      {direct && (
        <div className="max-w-[760px] space-y-2">
          <div className="aspect-video max-h-[240px] w-full overflow-hidden rounded-xl border border-border bg-black shadow-sm sm:max-h-[340px]">
            <video className="h-full w-full object-contain" src={direct} controls playsInline preload="metadata" />
          </div>
          <div className="flex items-center justify-start px-1">
            <a
              href={direct}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span>فتح الفيديو في نافذة جديدة</span>
            </a>
          </div>
        </div>
      )}

      {!yt && !direct && (
        <a
          href={exp.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <PlayCircle className="size-5" aria-hidden="true" />
          <span>{watchVideoLabel}</span>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </>
  );
};
