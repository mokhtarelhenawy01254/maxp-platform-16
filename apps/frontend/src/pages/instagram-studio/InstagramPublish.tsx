import React, { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import InstagramAccountSelector from "./InstagramAccountSelector";
import InstagramMediaTypePicker from "./InstagramMediaTypePicker";
import InstagramPublishPreview from "./InstagramPublishPreview";
import InstagramPublishStatus from "./InstagramPublishStatus";
import {
  createContainer,
  extractInstagramError,
  getContainerStatus,
  getTargets,
  publishNow,
  type InstagramMediaType,
  type InstagramTarget,
  type PublishResult,
} from "./instagramStudioService";
import { CAPTION_LIMIT } from "./instagramStudioUtils";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_TRIES = 20;

const inputClass =
  "h-9 w-full rounded-md border border-border/70 bg-background px-3 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const InstagramPublish: React.FC = () => {
  const [targets, setTargets] = useState<InstagramTarget[]>([]);
  const [noAccountMessage, setNoAccountMessage] = useState<string | null>(null);
  const [igId, setIgId] = useState("");
  const [mediaType, setMediaType] = useState<InstagramMediaType>("IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [carouselUrls, setCarouselUrls] = useState<string[]>(["", ""]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [stage, setStage] = useState("");
  const [publishError, setPublishError] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await getTargets();
        if (!mounted) return;
        setTargets(response.targets);
        setNoAccountMessage(response.noAccountMessage);
        if (response.targets.length > 0) setIgId(response.targets[0].igId);
      } catch (err) {
        if (mounted) setPublishError(extractInstagramError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const pollUntilReady = useCallback(
    async (containerId: string) => {
      for (let attempt = 0; attempt < MAX_POLL_TRIES; attempt += 1) {
        const status = await getContainerStatus(containerId, igId);
        setStage(`حالة الحاوية: ${status.status_code}`);
        if (status.status_code === "FINISHED") return;
        if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
          throw new Error(status.status || `فشل تجهيز الحاوية (${status.status_code})`);
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      throw new Error("انتهت مدة الانتظار أثناء تجهيز الحاوية على Instagram");
    },
    [igId],
  );

  const handlePublish = async () => {
    if (!igId) {
      toast.error("اختر حساب Instagram أولاً");
      return;
    }
    const isCarousel = mediaType === "CAROUSEL";
    const urls = carouselUrls.map((url) => url.trim()).filter(Boolean);
    if (isCarousel && urls.length < 2) {
      toast.error("الألبوم يحتاج رابطين على الأقل");
      return;
    }
    if (!isCarousel && !mediaUrl.trim()) {
      toast.error(mediaType === "IMAGE" ? "رابط الصورة مطلوب" : "رابط الفيديو مطلوب");
      return;
    }

    setPublishing(true);
    setPublishError("");
    setResult(null);
    try {
      setStage("جاري إنشاء الحاوية");
      const created = await createContainer({
        igAccountId: igId,
        mediaType,
        caption: caption.trim() || undefined,
        imageUrl: mediaType === "IMAGE" ? mediaUrl.trim() : undefined,
        videoUrl: mediaType === "IMAGE" ? undefined : mediaUrl.trim() || undefined,
        isReel: mediaType === "REELS",
        carouselItems: isCarousel ? urls.map((url) => ({ imageUrl: url })) : undefined,
      });

      setStage("بانتظار تجهيز الوسائط على Instagram");
      await pollUntilReady(created.containerId);

      setStage("جاري النشر النهائي");
      const published = await publishNow({ igAccountId: igId, containerId: created.containerId });
      setResult(published);
      setStage("");
      toast.success("تم النشر على Instagram");
    } catch (err) {
      setStage("");
      setPublishError(extractInstagramError(err));
    } finally {
      setPublishing(false);
    }
  };

  if (!loading && targets.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl" dir="rtl">
        <div className="rounded-lg border border-dashed border-border/70 bg-card p-10 text-center space-y-3">
          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
          <h1 className="text-base font-bold text-foreground">لا يوجد حساب Instagram مرتبط</h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {noAccountMessage ||
              "اربط حساب Instagram احترافي بصفحة Facebook من إعدادات التكاملات، ثم ارجع إلى هذه الشاشة."}
          </p>
        </div>
      </div>
    );
  }

  const selectedUsername = targets.find((target) => target.igId === igId)?.igUsername || null;
  const isCarousel = mediaType === "CAROUSEL";
  const previewUrl = isCarousel ? carouselUrls.find((url) => url.trim()) || "" : mediaUrl;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-3 max-w-7xl" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-pink-600" />
            النشر على Instagram
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            نشر صورة أو ريل أو فيديو أو ألبوم مباشرة على الحساب المرتبط
          </p>
        </div>
        <InstagramAccountSelector targets={targets} value={igId} onChange={setIgId} disabled={publishing} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3 items-start">
        <div className="rounded-lg border border-border/70 bg-card p-3.5 space-y-3">
          <InstagramMediaTypePicker
            value={mediaType}
            onChange={(type) => {
              setMediaType(type);
              setResult(null);
            }}
          />

          {isCarousel ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                روابط عناصر الألبوم (2 إلى 5)
              </span>
              {carouselUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Input
                    value={url}
                    onChange={(event) =>
                      setCarouselUrls((prev) =>
                        prev.map((item, i) => (i === index ? event.target.value : item)),
                      )
                    }
                    placeholder="https://example.com/image.jpg"
                    className={inputClass}
                    dir="ltr"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    onClick={() =>
                      setCarouselUrls((prev) =>
                        prev.length > 2 ? prev.filter((_, i) => i !== index) : prev,
                      )
                    }
                    aria-label="حذف عنصر"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {carouselUrls.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] gap-1 border-border/70"
                  onClick={() => setCarouselUrls((prev) => [...prev, ""])}
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة عنصر
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {mediaType === "IMAGE" ? "رابط الصورة (JPG/PNG عام)" : "رابط الفيديو (MP4 عام)"}
              </span>
              <Input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://example.com/media.jpg"
                className={inputClass}
                dir="ltr"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">نص المنشور</span>
              <span
                className={`text-[10px] tabular-nums ${
                  caption.length > CAPTION_LIMIT ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {caption.length} / {CAPTION_LIMIT}
              </span>
            </div>
            <Textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, CAPTION_LIMIT))}
              placeholder="اكتب وصف المنشور والهاشتاجات"
              className="min-h-[90px] text-xs border-border/70 resize-none"
            />
          </div>

          <InstagramPublishStatus
            publishing={publishing}
            stage={stage}
            publishError={publishError}
            result={result}
            onPublish={handlePublish}
          />
        </div>

        <InstagramPublishPreview
          username={selectedUsername}
          caption={caption}
          previewUrl={previewUrl}
          isVideo={mediaType === "REELS" || mediaType === "VIDEO"}
        />
      </div>
    </div>
  );
};

export default InstagramPublish;
