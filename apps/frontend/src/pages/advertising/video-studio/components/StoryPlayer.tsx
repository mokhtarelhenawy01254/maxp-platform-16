// Sequential story player: plays completed scenes back-to-back
import React, { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { VideoStory } from "../types";

export const StoryPlayer: React.FC<{ story: VideoStory }> = ({ story }) => {
  const completed = story.scenes.filter((s) => s.status === "COMPLETED" && s.job?.outputUrl);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [story.id]);

  if (completed.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        المشاهد المكتملة هتظهر هنا كفيلم واحد
      </div>
    );
  }

  const current = completed[Math.min(index, completed.length - 1)];
  if (!current) return null;

  const advance = () => {
    if (index + 1 < completed.length) {
      setIndex(index + 1);
      requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
    } else {
      setPlaying(false);
      setIndex(0);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative bg-black">
        <video
          ref={videoRef}
          key={current.id}
          src={current?.job?.outputUrl ?? undefined}
          poster={current.job?.outputPosterUrl ?? undefined}
          onEnded={advance}
          playsInline
          className="mx-auto max-h-[50vh] w-full object-contain"
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border/70 px-2 py-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => {
            if (playing) {
              videoRef.current?.pause();
              setPlaying(false);
            } else {
              videoRef.current?.play().catch(() => {});
              setPlaying(true);
            }
          }}
        >
          {playing ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
          {playing ? "إيقاف" : "تشغيل القصة"}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {completed.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setPlaying(false);
              }}
              aria-label={`المشهد ${s.sceneOrder}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/40"}`}
            />
          ))}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {Math.min(index + 1, completed.length)}/{completed.length}
        </span>
      </div>
    </div>
  );
};
