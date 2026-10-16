import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, AlertCircle, Download, Loader2 } from "lucide-react";

interface VoiceNotePlayerProps {
  src: string;
  messageId?: string;
  isCustomer?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  src,
  messageId,
  isCustomer = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Normalize media URL
  const cleanSrc = React.useMemo(() => {
    if (!src) return "";
    let normalized = src.replace(/\/webhooks\/uploads\//g, "/uploads/").trim();
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      normalized.startsWith("http://")
    ) {
      normalized = normalized.replace("http://", "https://");
    }
    if (normalized.includes("/api/proxy-image") && !normalized.includes("media=")) {
      normalized += (normalized.includes("?") ? "&" : "?") + "media=audio&type=audio";
    }
    return normalized;
  }, [src]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isRtl =
    typeof document !== "undefined" &&
    (document.documentElement.getAttribute("dir") === "rtl" ||
      document.dir === "rtl" ||
      document.body?.getAttribute("dir") === "rtl");

  // Reset playback and error state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
    if (audioRef.current && cleanSrc) {
      audioRef.current.load();
    }
  }, [cleanSrc]);

  // Stop this audio when another audio starts playing elsewhere in the inbox
  useEffect(() => {
    const handleStopOtherAudios = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      if (customEvent.detail?.id && customEvent.detail.id !== messageId) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener("maxp:stop-other-audios", handleStopOtherAudios);
    return () => {
      window.removeEventListener("maxp:stop-other-audios", handleStopOtherAudios);
    };
  }, [messageId]);

  // Sync playback rate to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !cleanSrc) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent("maxp:stop-other-audios", { detail: { id: messageId } })
      );

      setIsLoading(true);
      setHasError(false);
      audioRef.current
        .play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setIsLoading(false);
          setIsPlaying(false);
          setHasError(true);
        });
    }
  }, [isPlaying, cleanSrc, messageId]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (!isNaN(d) && isFinite(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || duration <= 0) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clickPosition = clientX - rect.left;
    const width = rect.width;

    let percentage = clickPosition / width;
    if (isRtl) {
      percentage = 1 - percentage;
    }
    percentage = Math.max(0, Math.min(1, percentage));

    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  const handleRetry = () => {
    setHasError(false);
    if (audioRef.current && cleanSrc) {
      audioRef.current.load();
      handlePlayPause();
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`my-1.5 w-full min-w-[210px] max-w-[320px] rounded-xl border p-2.5 transition-all select-none ${
        isCustomer
          ? "border-border/70 bg-card text-foreground shadow-2xs"
          : "border-primary-foreground/20 bg-primary/90 text-primary-foreground shadow-xs"
      }`}
    >
      {cleanSrc && (
        <audio
          ref={audioRef}
          src={cleanSrc}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => {
            if (!cleanSrc) return;
            setIsLoading(false);
            setIsPlaying(false);
            setHasError(true);
          }}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <div className="flex items-center gap-2.5">
        {/* Play / Pause Button with active scale */}
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={(isLoading && !isPlaying) || !cleanSrc}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل الصوت"}
          className={`relative flex size-9 shrink-0 items-center justify-center rounded-full shadow-xs transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
            isCustomer
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-background text-foreground hover:bg-muted"
          }`}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current translate-x-[-1px] rtl:translate-x-[1px]" />
          )}
        </button>

        {/* Progress Bar & Timestamps */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Interactive Scrub Bar */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            onTouchStart={handleSeek}
            onTouchMove={handleSeek}
            className="group relative h-2 w-full cursor-pointer rounded-full bg-muted/60 transition-all hover:h-2.5"
            title="انقر للتمرير"
          >
            <div
              className={`absolute inset-y-0 start-0 rounded-full transition-all duration-75 ${
                isCustomer ? "bg-primary" : "bg-primary-foreground"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
            {/* Scrubber thumb handle */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 size-3 rounded-full shadow-xs transition-transform scale-90 group-hover:scale-125 ${
                isCustomer ? "bg-primary" : "bg-background"
              }`}
              style={{
                [isRtl ? "right" : "left"]: `calc(${progressPercentage}% - 6px)`,
              }}
            />
          </div>

          {/* Time Display and Speed Toggle */}
          <div className="flex items-center justify-between text-[11px] font-mono leading-none opacity-90 tabular-nums">
            <span>
              {formatTime(currentTime)}
              <span className="opacity-50 mx-1">/</span>
              {duration > 0 ? formatTime(duration) : "--:--"}
            </span>

            <button
              type="button"
              onClick={cyclePlaybackRate}
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border transition-all hover:opacity-100 active:scale-95 ${
                isCustomer
                  ? "border-border/80 text-foreground bg-card hover:bg-muted"
                  : "border-primary-foreground/30 text-primary-foreground bg-primary/40 hover:bg-primary/60"
              }`}
              title="تغيير سرعة التشغيل"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {/* Error / Fallback State */}
      {hasError && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="truncate">تعذر تشغيل الصوت</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-destructive/20 transition-colors"
            >
              <RotateCcw className="size-3" />
              <span>إعادة</span>
            </button>

            {cleanSrc && (
              <a
                href={cleanSrc}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-destructive/20 transition-colors"
                title="تحميل الملف الصوتي مباشرة"
              >
                <Download className="size-3" />
                <span>فتح</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceNotePlayer;
