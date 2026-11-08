// Completed output card: poster + inline player + download/copy
import React, { useState } from "react";
import { Check, Copy, Download, Play } from "lucide-react";
import { toast } from "sonner";
import { typeLabel } from "../presets";
import type { VideoJob } from "../types";

const absoluteUrl = (url: string) =>
  url.startsWith("http") ? url : `${window.location.origin}${url}`;

export const OutputVideoCard: React.FC<{ job: VideoJob }> = ({ job }) => {
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const isImage = job.type === "CHARACTER_SHEET" || job.type === "TEXT_TO_IMAGE";
  const metaAssets = job.providerMeta?.outputAssets;
  const outputs: string[] = isImage
    ? Array.isArray(metaAssets) && metaAssets.length > 0
      ? (metaAssets as string[])
      : job.outputUrl
        ? [job.outputUrl]
        : []
    : job.outputUrl
      ? [job.outputUrl]
      : [];
  if (outputs.length === 0) return null;

  const copyLink = async () => {
    const first = outputs[0] ?? "";
    if (!first) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl(first));
      setCopied(true);
      toast.success("تم نسخ الرابط");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[3/4] w-full bg-muted">
        {playing && !isImage ? (
          <video
            src={outputs[0] ?? undefined}
            poster={job.outputPosterUrl ?? undefined}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-contain"
          />
        ) : isImage ? (
          <img src={outputs[0] ?? undefined} alt={job.params?.prompt ?? ""} className="absolute inset-0 size-full object-cover" loading="lazy" />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 size-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="تشغيل الفيديو"
          >
            {job.outputPosterUrl ? (
              <img src={job.outputPosterUrl} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <video src={outputs[0] ?? undefined} muted preload="metadata" className="size-full object-cover" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/15">
              <span className="flex size-11 items-center justify-center rounded-full bg-background/95 shadow-sm">
                <Play className="size-5 text-foreground" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 border-t border-border/70 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium">{job.params?.prompt || typeLabel(job.type)}</p>
          <p className="truncate text-[10px] text-muted-foreground tabular-nums">
            {typeLabel(job.type)} · {job.model}
            {job.params?.durationSeconds ? ` · ${job.params.durationSeconds}ث` : ""}
          </p>
        </div>
        <a
          href={absoluteUrl(outputs[0] ?? "")}
          download
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="تحميل"
          title="تحميل"
        >
          <Download className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label="نسخ الرابط"
          title="نسخ الرابط"
        >
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
};
