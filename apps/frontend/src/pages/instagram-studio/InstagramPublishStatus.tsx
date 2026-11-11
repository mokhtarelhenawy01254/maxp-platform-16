import React from "react";
import { CheckCircle2, ExternalLink, Loader2, Send } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { PublishResult } from "./instagramStudioService";

interface InstagramPublishStatusProps {
  publishing: boolean;
  stage: string;
  publishError: string;
  result: PublishResult | null;
  onPublish: () => void;
}

const InstagramPublishStatus: React.FC<InstagramPublishStatusProps> = ({
  publishing,
  stage,
  publishError,
  result,
  onPublish,
}) => (
  <div className="space-y-2.5">
    {publishError && (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {publishError}
      </div>
    )}

    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {publishing ? stage || "جاري النشر" : "لن يُنشر أي شيء قبل الضغط على زر النشر"}
      </span>
      <Button
        data-testid="instagram-publish-button"
        size="sm"
        className="h-9 text-xs gap-1.5"
        onClick={onPublish}
        disabled={publishing}
      >
        {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        نشر الآن
      </Button>
    </div>

    {result && (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> تم النشر بنجاح
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums" dir="ltr">
          media id: {result.mediaId || "—"}
        </div>
        {result.permalink && (
          <a
            data-testid="instagram-published-permalink"
            href={result.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline break-all"
            dir="ltr"
          >
            <ExternalLink className="h-3 w-3" /> View on Instagram
          </a>
        )}
      </div>
    )}
  </div>
);

export default InstagramPublishStatus;
