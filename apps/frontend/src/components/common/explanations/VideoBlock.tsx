import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PlayCircle, ExternalLink } from "lucide-react";
import {
  getYouTubeEmbedUrl,
  getDirectVideoUrl,
} from "../../../utils/explanationVideo";

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

export const VideoBlock: React.FC<{
  videoUrl: string | null;
  videoUrlMobile?: string | null;
  title: string;
}> = ({ videoUrl, videoUrlMobile, title }) => {
  const { t } = useTranslation();
  const isMobileViewport = useIsMobileViewport();
  const hasBoth = Boolean(videoUrl && videoUrlMobile);
  const [override, setOverride] = useState<boolean | null>(null);
  const showMobile = hasBoth
    ? override === null
      ? isMobileViewport
      : override
    : !videoUrl && Boolean(videoUrlMobile);
  const activeUrl = (showMobile ? videoUrlMobile : videoUrl) || videoUrl || videoUrlMobile || "";
  const embedUrl = getYouTubeEmbedUrl(activeUrl);
  const directVideoUrl = embedUrl ? null : getDirectVideoUrl(activeUrl);

  const frameClass = showMobile
    ? "w-full aspect-[9/16] max-h-[420px] mx-auto rounded-xl overflow-hidden bg-black shadow-md border border-border/80"
    : "w-full aspect-video max-h-[340px] mx-auto rounded-xl overflow-hidden bg-black shadow-md border border-border/80";

  const toggleBtn = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer ${
      active
        ? "bg-primary text-primary-foreground shadow-2xs"
        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
    }`;

  return (
    <>
      {hasBoth && (
        <div className="flex items-center gap-1.5 mb-2 justify-end" dir="rtl">
          <span className="text-[11px] text-muted-foreground me-1">
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
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{showMobile ? "فيديو من الموبايل" : "فيديو من اللابتوب"}</span>
            </span>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>فتح على يوتيوب</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
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
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>فتح الفيديو في نافذة جديدة</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        </div>
      )}

      {!embedUrl && !directVideoUrl && (
        <div className="mb-4 p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            يوجد فيديو توضيحي لهذه الصفحة
          </span>
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <PlayCircle className="h-4 w-4 text-primary" />
            <span>{t("explanations.watchVideo", "شاهد الفيديو التوضيحي")}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </>
  );
};
