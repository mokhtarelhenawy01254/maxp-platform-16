import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Rocket,
  Copy,
  Check,
  Package,
  Sparkles,
  Loader2,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadCompositeImage } from "./CreativeCanvasExportEngine";
import type {
  AspectRatioType,
  CanvasOverlaySettings,
  CreativePreset,
  MarketingProduct,
  ProductTransformSettings,
} from "./types";

interface CreativeStudioInteractiveCanvasProps {
  selectedProduct: MarketingProduct | null;
  selectedPreset: CreativePreset;
  aspectRatio: AspectRatioType;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  overlay: CanvasOverlaySettings;
  onUpdateProductTransform?: (updates: Partial<ProductTransformSettings>) => void;
  backgroundUrl: string | null;
  isGenerating: boolean;
}

export const CreativeStudioInteractiveCanvas: React.FC<CreativeStudioInteractiveCanvasProps> = ({
  selectedProduct,
  selectedPreset,
  aspectRatio,
  onChangeAspectRatio,
  overlay,
  onUpdateProductTransform,
  backgroundUrl,
  isGenerating,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Dragging interaction state for product
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const transform = overlay.productTransform || {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    shadowType: "contact",
  };

  // Aspect ratio sizing classes
  const aspectClass =
    aspectRatio === "1:1"
      ? "aspect-square max-w-[460px]"
      : aspectRatio === "9:16"
      ? "aspect-[9/16] max-w-[320px]"
      : aspectRatio === "4:5"
      ? "aspect-[4/5] max-w-[380px]"
      : "aspect-[16/9] max-w-[560px]";

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onUpdateProductTransform) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: transform.x,
      initY: transform.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !onUpdateProductTransform || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

    const newX = Math.max(-45, Math.min(45, Math.round(dragStartRef.current.initX + deltaX)));
    const newY = Math.max(-45, Math.min(45, Math.round(dragStartRef.current.initY + deltaY)));

    onUpdateProductTransform({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleCopyAdText = () => {
    const text = [
      overlay.headline,
      overlay.subheadline,
      overlay.price ? `السعر: ${overlay.price} ${overlay.currency}` : "",
      overlay.callToAction ? `الطلب: ${overlay.callToAction}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("تم نسخ النصوص الإعلانية إلى الحافظة");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToMarketingStudio = () => {
    if (!selectedProduct) {
      toast.error("يرجى اختيار منتج أولاً");
      return;
    }

    navigate("/advertising/marketing-studio", {
      state: {
        prefillProduct: selectedProduct,
        prefillDraft: {
          headline: overlay.headline,
          primaryText: overlay.subheadline,
          callToAction: overlay.callToAction || "SHOP_NOW",
          price: overlay.price,
          creativeUrl: backgroundUrl,
        },
      },
    });
    toast.success("جاري فتح مسودة الحملة في مركز التسويق...");
  };

  // High-DPI Composite Canvas 2K Export
  const handleDownloadSnapshot = async () => {
    if (!selectedProduct) {
      toast.error("يرجى اختيار منتج من الكتالوج أولاً");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("جاري رندرة المشهد الإعلاني بدقة فائقة 2K...");
      await downloadCompositeImage({
        backgroundUrl,
        product: selectedProduct,
        aspectRatio,
        overlay,
        previewGradient: selectedPreset.previewGradient,
      });
      toast.success("✓ تم تصدير التصميم الإعلاني الكامل بنجاح");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء رندرة وتصدير الصورة");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100/70 dark:bg-slate-950 min-h-0 select-none overflow-hidden">
      {/* Canvas Top Bar: Aspect Ratio Switcher + Quick Actions */}
      <div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 flex-shrink-0">
        {/* Multi-Format Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          {(
            [
              { id: "1:1", label: "1:1 Feed" },
              { id: "4:5", label: "4:5 Portrait" },
              { id: "9:16", label: "9:16 Story" },
              { id: "16:9", label: "16:9 Banner" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeAspectRatio(item.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                aspectRatio === item.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAdText}
            className="h-8 text-xs gap-1.5 rounded-lg border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">نسخ النصوص</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSnapshot}
            disabled={isExporting}
            className="h-8 text-xs gap-1.5 rounded-lg border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
            title="تصدير تصميم متكامل بدقة 2K (الخلفية + المنتج + الظلال + النصوص)"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isExporting ? "جاري الرندرة..." : "تحميل بدقة 2K"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSendToMarketingStudio}
            className="h-8 text-xs gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
            title="إرسال التصميم لمركز التسويق لإطلاق الحملة"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="hidden md:inline">إطلاق كإعلان</span>
          </Button>
        </div>
      </div>

      {/* Center Interactive Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto relative">
        {/* The Live Layered Canvas Frame */}
        <div
          ref={canvasRef}
          className={`w-full ${aspectClass} relative rounded-2xl overflow-hidden shadow-2xl border border-slate-900/10 dark:border-white/10 transition-all duration-300 flex flex-col justify-between`}
        >
          {/* Layer 0: Background Layer (AI image or Simulated Studio Preset) */}
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              alt="AI Studio Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-b ${selectedPreset.previewGradient} flex items-center justify-center`}
            >
              {/* Subtle ambient lighting simulation rings */}
              <div className="absolute w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Layer 1 & 2: Interactive Transform Product Container with Real Shadow Physics */}
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-10">
            {selectedProduct?.mainImage ? (
              <div
                className="relative inline-block select-none pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-75"
                style={{
                  transform: `translate(${transform.x * 2.5}px, ${transform.y * 2.5}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="اسحب بالماوس لتحريك المنتج في أي مكان"
              >
                {/* Physical Contact Shadow */}
                {transform.shadowType === "contact" && (
                  <>
                    <div
                      className="absolute -bottom-3 inset-x-8 h-8 rounded-[100%] bg-black/60 blur-md pointer-events-none"
                      style={{ transform: "scaleY(0.4)" }}
                    />
                    <div
                      className="absolute -bottom-1 inset-x-12 h-3 rounded-[100%] bg-black/85 blur-xs pointer-events-none"
                      style={{ transform: "scaleY(0.3)" }}
                    />
                  </>
                )}

                {/* Directional Studio Shadow */}
                {transform.shadowType === "directional" && (
                  <div
                    className="absolute -bottom-4 -right-4 inset-x-4 h-10 rounded-[100%] bg-black/50 blur-lg pointer-events-none"
                    style={{ transform: "scaleY(0.4) skewX(-15deg)" }}
                  />
                )}

                {/* Subtle Ambient Shadow */}
                {transform.shadowType === "subtle" && (
                  <div
                    className="absolute -bottom-2 inset-x-6 h-6 rounded-[100%] bg-black/35 blur-md pointer-events-none"
                    style={{ transform: "scaleY(0.3)" }}
                  />
                )}

                {/* The Product Cutout Image */}
                <img
                  src={selectedProduct.mainImage}
                  alt={selectedProduct.name}
                  className="max-h-52 sm:max-h-64 object-contain drop-shadow-xl relative z-10 transition-transform select-none pointer-events-none"
                  draggable={false}
                />

                {/* Interactive Drag Pill Indicator (appears on hover) */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                  <Move className="w-2.5 h-2.5" />
                  <span>اسحب للتحريك</span>
                </div>
              </div>
            ) : (
              <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center p-4 text-center bg-black/20 backdrop-blur-xs">
                <Package className="w-10 h-10 text-white/40 mb-2" />
                <span className="text-xs font-bold text-white/60">اختر منتجاً لإسقاطه في الاستوديو</span>
              </div>
            )}
          </div>

          {/* Layer 3: Top Badges (Discount, Special Offer) */}
          <div className="relative p-5 sm:p-6 flex items-start justify-between z-20 pointer-events-none">
            {overlay.showBadge && overlay.discountBadge ? (
              <div
                className="px-3 py-1 rounded-full text-xs font-black shadow-lg backdrop-blur-md border border-white/20 tracking-wide pointer-events-auto"
                style={{
                  backgroundColor: overlay.accentColor,
                  color: "#000000",
                }}
              >
                {overlay.discountBadge}
              </div>
            ) : (
              <div />
            )}

            {/* Subdued Preset Pill */}
            <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-bold text-white/80 border border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{selectedPreset.labelAr}</span>
            </div>
          </div>

          {/* Layer 4: Bottom Dynamic Typography and Call to Action */}
          <div className="relative p-5 sm:p-6 z-20 pointer-events-none bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col gap-2.5 text-right">
            {/* Ad Headline */}
            {overlay.headline && (
              <h2
                className="text-base sm:text-lg font-black tracking-tight drop-shadow-md leading-tight"
                style={{
                  color: overlay.textColor,
                  fontFamily: overlay.fontFamily,
                }}
              >
                {overlay.headline}
              </h2>
            )}

            {/* Subheadline */}
            {overlay.subheadline && (
              <p
                className="text-xs font-medium text-white/90 drop-shadow-sm line-clamp-2 leading-relaxed"
                style={{ fontFamily: overlay.fontFamily }}
              >
                {overlay.subheadline}
              </p>
            )}

            {/* Price Tag & CTA Bar */}
            <div className="flex items-center justify-between pt-1.5 gap-2 border-t border-white/15">
              {overlay.showPrice && typeof overlay.price === "number" ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-black text-emerald-400 drop-shadow-md tabular-nums">
                    {overlay.price.toLocaleString("ar-EG")} {overlay.currency}
                  </span>
                  {overlay.originalPrice && overlay.originalPrice > overlay.price && (
                    <span className="text-xs text-white/50 line-through tabular-nums">
                      {overlay.originalPrice.toLocaleString("ar-EG")} {overlay.currency}
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* Call to Action Button */}
              {overlay.showCta && overlay.callToAction && (
                <div
                  className="px-4 py-1.5 rounded-full text-xs font-black text-white shadow-lg pointer-events-auto cursor-pointer hover:brightness-110 active:scale-95 transition flex items-center gap-1"
                  style={{ backgroundColor: overlay.primaryColor }}
                >
                  <span>{overlay.callToAction}</span>
                  <span className="text-sm">←</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Generating Active Overlay Animation */}
          {isGenerating && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-in fade-in duration-200">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-7 h-7 text-indigo-400 animate-spin" />
                </div>
              </div>
              <p className="text-xs font-bold text-white text-center">
                جاري توليد المشهد الإعلاني بالذكاء الاصطناعي...
              </p>
              <p className="text-[11px] text-slate-400 text-center mt-1">
                تطبيق محاكاة الإضاءة والظلال الواقعية
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
