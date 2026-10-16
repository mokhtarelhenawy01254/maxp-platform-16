import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";

export interface StorefrontPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  draftTokens: any;
  draftHomeSections?: any;
}

const StorefrontPreviewModal: React.FC<StorefrontPreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  draftTokens,
  draftHomeSections,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const previewOrigin = useMemo(() => {
    try {
      return new URL(previewUrl).origin;
    } catch {
      return window.location.origin;
    }
  }, [previewUrl]);

  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    const handler = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "UPDATE_PREVIEW_TOKENS",
            payload: {
              ...draftTokens,
              ...(draftHomeSections ? { home: { sections: draftHomeSections } } : {}),
            },
          },
          previewOrigin,
        );
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [isOpen, draftTokens, draftHomeSections, previewOrigin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 lg:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative flex h-full w-full max-w-6xl 2xl:max-w-7xl flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                المعاينة الحية للمتجر (Live Preview)
              </h2>
              <p className="text-xs text-muted-foreground">
                معاينة مباشرة للتخصيص والألوان في الوقت الفعلي قبل الحفظ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport switch segmented bar */}
            <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`flex size-7 items-center justify-center rounded-lg transition-all active:scale-[0.97] ${
                  previewMode === "desktop"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                title="شاشة كمبيوتر"
                aria-label="شاشة كمبيوتر"
              >
                <Monitor className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("tablet")}
                className={`flex size-7 items-center justify-center rounded-lg transition-all active:scale-[0.97] ${
                  previewMode === "tablet"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                title="جهاز لوحي"
                aria-label="جهاز لوحي"
              >
                <Tablet className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`flex size-7 items-center justify-center rounded-lg transition-all active:scale-[0.97] ${
                  previewMode === "mobile"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                title="هاتف محمول"
                aria-label="هاتف محمول"
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/50 active:scale-[0.97]"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">نافذة جديدة</span>
            </button>

            <div className="h-4 w-px bg-border/60" />

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-[0.97]"
              aria-label="إغلاق المعاينة"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Browser Chrome Simulator */}
        <div className="flex items-center border-b border-border/60 bg-muted/20 px-4 py-2">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-rose-500/80" />
            <div className="size-2.5 rounded-full bg-amber-500/80" />
            <div className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="mx-4 flex-1 truncate rounded-lg border border-border/60 bg-card px-3 py-1 text-center font-mono text-xs text-muted-foreground tabular-nums">
            {previewUrl}
          </div>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 bg-muted/30 overflow-hidden flex justify-center items-start pt-3 sm:pt-4 pb-0">
          <div
            className={`h-full bg-background transition-all duration-300 ease-in-out origin-top border-t border-x border-border/70 rounded-t-xl overflow-hidden shadow-2xl ${
              previewMode === "mobile"
                ? "w-[375px]"
                : previewMode === "tablet"
                ? "w-[768px]"
                : "w-full rounded-t-none border-0"
            }`}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="h-full w-full border-0"
              title="Storefront Live Preview"
              allow="fullscreen"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPreviewModal;
