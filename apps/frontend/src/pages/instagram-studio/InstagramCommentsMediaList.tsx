import React from "react";
import { ImageOff, Loader2 } from "lucide-react";
import type { InstagramMediaItem } from "./instagramStudioService";
import { formatIgNumber, getMediaThumbnail, getMediaTypeLabel } from "./instagramStudioUtils";

interface InstagramCommentsMediaListProps {
  media: InstagramMediaItem[];
  loading: boolean;
  selectedMediaId: string;
  onSelect: (mediaId: string) => void;
}

const InstagramCommentsMediaList: React.FC<InstagramCommentsMediaListProps> = ({
  media,
  loading,
  selectedMediaId,
  onSelect,
}) => (
  <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
    <div className="px-3 py-2 border-b border-border/60 text-xs font-semibold text-foreground">
      المنشورات
    </div>
    <div className="max-h-[70vh] overflow-y-auto divide-y divide-border/60">
      {loading && (
        <div className="p-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحميل
        </div>
      )}
      {!loading && media.length === 0 && (
        <div className="p-3 text-[11px] text-muted-foreground">لا توجد منشورات.</div>
      )}
      {media.map((item) => {
        const thumb = getMediaThumbnail(item);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full text-right flex items-center gap-2 p-2 transition-colors ${
              selectedMediaId === item.id ? "bg-primary/5" : "hover:bg-muted/40"
            }`}
          >
            <div className="h-11 w-11 rounded-md overflow-hidden bg-muted/40 shrink-0">
              {thumb ? (
                <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ImageOff className="h-4 w-4 text-muted-foreground/60" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-foreground truncate">
                {item.caption || getMediaTypeLabel(item.media_type)}
              </div>
              <div className="text-[10px] text-muted-foreground tabular-nums">
                {formatIgNumber(item.comments_count)} تعليق
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default InstagramCommentsMediaList;
