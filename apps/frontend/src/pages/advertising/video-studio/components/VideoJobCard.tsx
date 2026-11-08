// Job status row used by the render queue (progress + cancel)
import React from "react";
import { Ban, AlertCircle } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Progress } from "../../../../components/ui/progress";
import { statusLabel, typeLabel } from "../presets";
import type { VideoJob } from "../types";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  QUEUED: "bg-muted text-muted-foreground",
  PROCESSING: "bg-primary/10 text-primary",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  FAILED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_CLASS[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export const VideoJobCard: React.FC<{ job: VideoJob; onCancel: (id: string) => void; cancelling?: boolean }> = ({
  job,
  onCancel,
  cancelling,
}) => {
  const cancellable = job.status === "QUEUED" || job.status === "PROCESSING";
  return (
    <div className="flex flex-col gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{job.params?.prompt || typeLabel(job.type)}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {typeLabel(job.type)} · {job.model}
            {job.providerMeta?.simulated ? " · محاكاة" : ""}
            {job.billingMode === "BYOK" ? " · مفتاحك" : Number(job.chargedEgp) > 0 ? ` · ${Number(job.chargedEgp)} ج.م` : ""}
          </p>
        </div>
        <StatusChip status={job.status} />
        {cancellable && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onCancel(job.id)}
            disabled={cancelling}
            aria-label="إلغاء التوليد"
            title="إلغاء"
          >
            <Ban className="size-3.5" />
          </Button>
        )}
      </div>
      {job.status === "PROCESSING" && (
        <Progress value={job.progress} className="h-1.5" aria-label={`تقدم ${job.progress}%`} />
      )}
      {job.status === "FAILED" && job.errorMessage && (
        <p className="flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{job.errorMessage}</span>
        </p>
      )}
    </div>
  );
};
