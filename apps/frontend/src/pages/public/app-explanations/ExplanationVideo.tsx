import React from "react";
import { ExternalLink, PlayCircle, VideoOff } from "lucide-react";
import { getYouTubeEmbedUrl, getDirectVideoUrl } from "../../../utils/explanationVideo";
import { useYouTubeEmbedError } from "../../../hooks/useYouTubeEmbedError";
import type { AppExplanation } from "./groups";

/** فيديو الكارت — ما يُرندر إلا بعد فتح الكارت (تحميل عند الطلب) */
export const CardVideoBlock: React.FC<{ exp: AppExplanation; watchVideoLabel: string }> = ({
  exp,
  watchVideoLabel,
}) => {
  const yt = exp.videoUrl ? getYouTubeEmbedUrl(exp.videoUrl, { jsApi: true }) : null;
  const direct = exp.videoUrl && !yt ? getDirectVideoUrl(exp.videoUrl) : null;
  const { failed: ytFailed, iframeRef, handshake } = useYouTubeEmbedError(yt);

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

      {yt && !ytFailed && (
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
