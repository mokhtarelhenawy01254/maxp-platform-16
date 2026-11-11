import React from "react";
import { Image as ImageIcon, Instagram } from "lucide-react";

interface InstagramPublishPreviewProps {
  username: string | null;
  caption: string;
  previewUrl: string;
  isVideo: boolean;
}

const InstagramPublishPreview: React.FC<InstagramPublishPreviewProps> = ({
  username,
  caption,
  previewUrl,
  isVideo,
}) => (
  <aside className="rounded-lg border border-border/70 bg-card p-3.5 space-y-2 self-start">
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
      <Instagram className="h-3.5 w-3.5 text-pink-600" /> معاينة المنشور
    </div>
    <div className="rounded-md border border-border/60 overflow-hidden bg-muted/20">
      <div className="aspect-square flex items-center justify-center bg-muted/30">
        {previewUrl ? (
          isVideo ? (
            <video src={previewUrl} controls className="h-full w-full object-cover" />
          ) : (
            <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
          )
        ) : (
          <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
        )}
      </div>
      <div className="p-2 space-y-1">
        <div className="text-[11px] font-semibold text-foreground" dir="ltr">
          {username ? `@${username}` : "@instagram"}
        </div>
        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-4 leading-relaxed">
          {caption || "سيظهر نص المنشور هنا."}
        </p>
      </div>
    </div>
  </aside>
);

export default InstagramPublishPreview;
