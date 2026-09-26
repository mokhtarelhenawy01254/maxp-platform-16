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

  // Normalize media URL: clean any legacy /webhooks/uploads/ to /uploads/
  const cleanSrc = React.useMemo(() => {
    if (!src) return "";
    return src.replace(/\/webhooks\/uploads\//g, "/uploads/");
  }, [src]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

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

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setHasError(false);

    // Broadcast event to stop any other playing audio in the inbox
    window.dispatchEvent(
      new CustomEvent("maxp:stop-other-audios", {
        detail: { id: messageId },
      }),
    );

    // If audio reached the end or is within 0.3s of the end, restart from 0:00
    if (
      audio.ended ||
      (audio.duration > 0 && audio.currentTime >= audio.duration - 0.3)
    ) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    try {
      setIsLoading(true);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn("Audio play error, attempting reload:", err);
      try {
        audio.load();
        await audio.play();
        setIsPlaying(true);
      } catch (fallbackErr) {
        console.error("Audio playback failed completely:", fallbackErr);
        setHasError(true);
        setIsPlaying(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, messageId]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
    setHasError(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const isRtl = document.dir === "rtl" || document.documentElement.dir === "rtl";

    let clickRatio = (clientX - rect.left) / rect.width;
    if (isRtl) {
      clickRatio = 1 - clickRatio;
    }
    clickRatio = Math.max(0, Math.min(1, clickRatio));

    const newTime = clickRatio * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    setPlaybackRate((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  };

  const handleRetry = () => {
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.load();
      handlePlayPause();
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="my-1.5 w-full min-w-[210px] max-w-[320px] rounded-xl p-2.5 transition-all select-none"
      style={{
        background: isCustomer
          ? "color-mix(in srgb, var(--color-foreground) 7%, transparent)"
          : "rgba(0, 0, 0, 0.18)",
        border: "1px solid",
        borderColor: isCustomer
          ? "var(--business-card-border, rgba(203, 213, 225, 0.4))"
          : "rgba(255, 255, 255, 0.15)",
      }}
    >
      <audio
        ref={audioRef}
        src={cleanSrc}
        preload="metadata"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => {
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

      <div className="flex items-center gap-2.5">
        {/* Play / Pause Button with active scale */}
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={isLoading && !isPlaying}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل الصوت"}
          className="relative flex size-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          style={{
            background: isCustomer
              ? "var(--color-primary, #3b82f6)"
              : "rgba(255, 255, 255, 0.95)",
            color: isCustomer ? "#ffffff" : "#1e293b",
          }}
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 fill-current translate-x-[-1px] rtl:translate-x-[1px]" />
          )}
        </button>

        {/* Progress Bar & Timestamps */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Interactive Scrub Bar */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            onTouchStart={handleSeek}
            className="group relative h-2.5 w-full cursor-pointer rounded-full bg-black/15 dark:bg-white/20 transition-all hover:h-3"
            title="انقر للتمرير"
          >
            <div
              className="absolute inset-y-0 start-0 rounded-full transition-all duration-75"
              style={{
                width: `${progressPercentage}%`,
                background: isCustomer
                  ? "var(--color-primary, #3b82f6)"
                  : "rgba(255, 255, 255, 0.95)",
              }}
            />
            {/* Scrubber thumb handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full shadow-md transition-transform scale-90 group-hover:scale-125"
              style={{
                [document.dir === "rtl" ? "right" : "left"]: `calc(${progressPercentage}% - 6px)`,
                background: isCustomer
                  ? "var(--color-primary, #2563eb)"
                  : "#ffffff",
                border: "2px solid rgba(0, 0, 0, 0.1)",
              }}
            />
          </div>

          {/* Time Display and Speed Toggle */}
          <div className="flex items-center justify-between text-[11px] font-mono leading-none opacity-90 tabular-nums">
            <span>
              {formatTime(currentTime)}
              <span className="opacity-60 mx-1">/</span>
              {duration > 0 ? formatTime(duration) : "--:--"}
            </span>

            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
              style={{
                borderColor: isCustomer
                  ? "var(--business-card-border, rgba(0, 0, 0, 0.2))"
                  : "rgba(255, 255, 255, 0.3)",
              }}
              title="تغيير سرعة التشغيل"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {/* Error / Fallback State */}
      {hasError && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="size-3.5 flex-shrink-0" />
            <span className="truncate">تعذر تشغيل الصوت</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-red-500/20 transition-colors"
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
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-red-500/20 transition-colors"
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
