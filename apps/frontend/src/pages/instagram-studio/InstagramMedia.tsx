import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Heart, ImageOff, Instagram, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import InstagramAccountSelector from "./InstagramAccountSelector";
import InstagramInsightsPanel from "./InstagramInsightsPanel";
import {
  extractInstagramError,
  getMedia,
  getMediaInsights,
  getTargets,
  type InstagramInsightMetrics,
  type InstagramMediaItem,
  type InstagramTarget,
} from "./instagramStudioService";
import {
  formatIgDate,
  formatIgNumber,
  getMediaThumbnail,
  getMediaTypeLabel,
} from "./instagramStudioUtils";

const InstagramMedia: React.FC = () => {
  const [targets, setTargets] = useState<InstagramTarget[]>([]);
  const [noAccountMessage, setNoAccountMessage] = useState<string | null>(null);
  const [igId, setIgId] = useState("");
  const [media, setMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<InstagramMediaItem | null>(null);
  const [insights, setInsights] = useState<InstagramInsightMetrics | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getTargets();
        if (!mounted) return;
        setTargets(result.targets);
        setNoAccountMessage(result.noAccountMessage);
        if (result.targets.length > 0) setIgId(result.targets[0].igId);
      } catch (err) {
        if (mounted) setError(extractInstagramError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadMedia = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setLoading(true);
    setError("");
    setSelected(null);
    setInsights(null);
    try {
      const result = await getMedia({ igAccountId: accountId, limit: 36 });
      setMedia(result.media || []);
    } catch (err) {
      setMedia([]);
      setError(extractInstagramError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (igId) loadMedia(igId);
  }, [igId, loadMedia]);

  const openMedia = async (item: InstagramMediaItem) => {
    setSelected(item);
    setInsights(null);
    setLoadingInsights(true);
    try {
      const result = await getMediaInsights(item.id, igId);
      setInsights(result.metrics);
    } catch (err) {
      toast.error(extractInstagramError(err));
    } finally {
      setLoadingInsights(false);
    }
  };

  if (!loading && targets.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl" dir="rtl">
        <div className="rounded-lg border border-dashed border-border/70 bg-card p-10 text-center space-y-3">
          <ImageOff className="h-8 w-8 text-muted-foreground mx-auto" />
          <h1 className="text-base font-bold text-foreground">لا يوجد حساب Instagram مرتبط</h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {noAccountMessage ||
              "اربط حساب Instagram احترافي بصفحة Facebook من إعدادات التكاملات، ثم ارجع إلى هذه الشاشة."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 max-w-7xl" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-600" />
            مكتبة وسائط Instagram
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            استعراض منشورات الحساب مع الإحصاءات الأساسية لكل منشور
          </p>
        </div>
        <div className="flex items-end gap-2">
          <InstagramAccountSelector
            targets={targets}
            value={igId}
            onChange={setIgId}
            disabled={loading}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 border-border/70"
            onClick={() => loadMedia(igId)}
            disabled={loading || !igId}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
        <div
          data-testid="instagram-media-grid"
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5"
        >
          {loading &&
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg border border-border/60 bg-muted/40 animate-pulse"
              />
            ))}

          {!loading && media.length === 0 && (
            <div className="col-span-full rounded-lg border border-border/70 bg-card p-8 text-center text-xs text-muted-foreground">
              لا توجد منشورات على هذا الحساب بعد.
            </div>
          )}

          {!loading &&
            media.map((item) => {
              const thumb = getMediaThumbnail(item);
              const isActive = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openMedia(item)}
                  className={`text-right rounded-lg overflow-hidden border bg-card transition-colors ${
                    isActive
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border/70 hover:border-primary/40"
                  }`}
                >
                  <div className="relative aspect-square bg-muted/40">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.caption || "Instagram media"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageOff className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0 bg-background/85 backdrop-blur border-border/60"
                    >
                      {getMediaTypeLabel(item.media_type)}
                    </Badge>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Heart className="h-3 w-3" /> {formatIgNumber(item.like_count)}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <MessageCircle className="h-3 w-3" /> {formatIgNumber(item.comments_count)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 tabular-nums truncate">
                      {formatIgDate(item.timestamp)}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        <aside className="rounded-lg border border-border/70 bg-card p-3.5 space-y-3 self-start">
          {!selected ? (
            <div className="text-xs text-muted-foreground text-center py-10">
              اختر منشوراً لعرض التفاصيل والإحصاءات.
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-foreground">تفاصيل المنشور</div>
              {getMediaThumbnail(selected) && (
                <img
                  src={getMediaThumbnail(selected) as string}
                  alt="media"
                  className="w-full rounded-md object-cover max-h-56"
                />
              )}
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-6">
                {selected.caption || "بدون نص"}
              </p>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {formatIgDate(selected.timestamp)}
              </div>

              <InstagramInsightsPanel insights={insights} loading={loadingInsights} />

              {selected.permalink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 border-border/70"
                  onClick={() => window.open(selected.permalink as string, "_blank", "noopener")}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> فتح على Instagram
                </Button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default InstagramMedia;
