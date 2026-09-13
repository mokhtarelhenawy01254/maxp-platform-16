import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Rocket,
  Copy,
  Check,
  Maximize2,
  Package,
  Sparkles,
  Ratio,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type {
  AspectRatioType,
  CanvasOverlaySettings,
  CreativePreset,
  MarketingProduct,
} from "./types";

interface CreativeStudioInteractiveCanvasProps {
  selectedProduct: MarketingProduct | null;
  selectedPreset: CreativePreset;
  aspectRatio: AspectRatioType;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  overlay: CanvasOverlaySettings;
  backgroundUrl: string | null;
  isGenerating: boolean;
}

export const CreativeStudioInteractiveCanvas: React.FC<CreativeStudioInteractiveCanvasProps> = ({
  selectedProduct,
  selectedPreset,
  aspectRatio,
  onChangeAspectRatio,
  overlay,
  backgroundUrl,
  isGenerating,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Aspect ratio sizing classes
  const aspectClass =
    aspectRatio === "1:1"
      ? "aspect-square max-w-[460px]"
      : aspectRatio === "9:16"
      ? "aspect-[9/16] max-w-[320px]"
      : "aspect-[16/9] max-w-[560px]";

  // Positioning classes for typography layers
  const getPositionClasses = () => {
    switch (overlay.textPosition) {
      case "top-right":
        return "top-6 right-6 text-right items-end";
      case "top-center":
        return "top-6 left-1/2 -translate-x-1/2 text-center items-center";
      case "top-left":
        return "top-6 left-6 text-left items-start";
      case "bottom-right":
        return "bottom-6 right-6 text-right items-end";
      case "bottom-center":
        return "bottom-6 left-1/2 -translate-x-1/2 text-center items-center";
      case "bottom-left":
        return "bottom-6 left-6 text-left items-start";
      default:
        return "top-6 right-6 text-right items-end";
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
    toast.success("تم نسخ نصوص الإعلان إلى الحافظة");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToMarketingStudio = () => {
    if (!selectedProduct) {
      toast.error("يرجى اختيار منتج أولاً");
      return;
    }

    // Navigate to marketing-studio with creative pre-filled in session state
    navigate("/advertising/marketing-studio", {
      state: {
        prefillProduct: selectedProduct,
        prefillDraft: {
          headline: overlay.headline,
          primaryText: overlay.subheadline,
          callToAction: overlay.callToAction || "SHOP_NOW",
          price: overlay.price,
        },
      },
    });
    toast.success("جاري فتح مسودة الحملة في مركز التسويق الذكي...");
  };

  const handleDownloadSnapshot = () => {
    if (backgroundUrl) {
      const a = document.createElement("a");
      a.href = backgroundUrl;
      a.download = `creative-ad-${selectedProduct?.id || "maxp"}-${Date.now()}.png`;
      a.click();
      toast.success("تم بدء تحميل الصورة الإعلانية");
    } else {
      toast.info("اضغط 'توليد المشهد' أولاً لتحميل النسخة المولدة بالذكاء الاصطناعي عالية الدقة");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100/70 dark:bg-slate-950 min-h-0 select-none overflow-hidden">
      {/* Canvas Top Bar: Aspect Ratio Switcher + Quick Actions */}
      <div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          {(
            [
              { id: "1:1", label: "1:1 Feed" },
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAdText}
            className="h-8 text-xs gap-1.5 rounded-lg border-slate-200 dark:border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>نسخ النصوص</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSnapshot}
            className="h-8 text-xs gap-1.5 rounded-lg border-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل بدقة فائقة</span>
          </Button>
        </div>
      </div>

      {/* Center Interactive Canvas Viewport (Padded, Centered, Scrollable if needed) */}
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

          {/* Layer 1: Product Cutout with Deep Studio Contact Shadow */}
          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
            {selectedProduct?.mainImage ? (
              <div className="relative max-w-[70%] max-h-[70%] flex items-center justify-center">
                <img
                  src={selectedProduct.mainImage}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain filter drop-shadow-[0_25px_25px_rgba(0,0,0,0.7)] drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-white/60 bg-black/30 backdrop-blur-xs rounded-2xl border border-white/10">
                <Package className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-bold">اختر منتجاً من الكتالوج</p>
                <p className="text-[10px] opacity-75">ليتم دمجه تلقائياً فوق منصة الاستوديو</p>
              </div>
            )}
          </div>

          {/* Layer 2: Vector Typography & Marketing Badges (Top/Active Position) */}
          <div className={`absolute z-20 flex flex-col gap-1.5 max-w-[85%] ${getPositionClasses()}`}>
            {/* Discount Badge */}
            {overlay.discountBadge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-black shadow-lg backdrop-blur-md border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{overlay.discountBadge}</span>
              </div>
            )}

            {/* Main Headline */}
            {overlay.headline && (
              <h2 className="text-lg sm:text-2xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] text-pretty">
                {overlay.headline}
              </h2>
            )}

            {/* Subheadline */}
            {overlay.subheadline && (
              <p className="text-xs sm:text-sm font-semibold text-slate-200/90 leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                {overlay.subheadline}
              </p>
            )}
          </div>

          {/* Layer 3: Bottom Action & Pricing Row */}
          <div className="relative z-20 mt-auto p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-between gap-3">
            {/* Price Tag */}
            {overlay.price != null && (
              <div className="flex flex-col items-start">
                {overlay.originalPrice && overlay.originalPrice > overlay.price && (
                  <span className="text-[11px] text-slate-400 line-through tabular-nums font-mono">
                    {overlay.originalPrice} {overlay.currency}
                  </span>
                )}
                <div className="flex items-baseline gap-1 text-white font-black text-xl sm:text-2xl drop-shadow-md">
                  <span className="tabular-nums">{overlay.price}</span>
                  <span className="text-xs font-bold text-amber-400">{overlay.currency}</span>
                </div>
              </div>
            )}

            {/* Call To Action Button Overlay */}
            {overlay.callToAction && (
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg active:scale-[0.97] transition-all flex items-center gap-1.5 border border-amber-300/40 cursor-default"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{overlay.callToAction}</span>
              </button>
            )}
          </div>

          {/* Loading Overlay when generating */}
          {isGenerating && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
              <Sparkles className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
              <p className="font-black text-sm">جاري توليد بيئة الاستوديو الإعلانية...</p>
              <p className="text-xs text-slate-400 mt-1">
                تطبيق إضاءة وظلال مطابقة للمنتج مع نموذج {selectedPreset.labelAr}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bridge Action Bar: Send directly to Meta Ads Campaign Draft */}
      <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>الكانفاس جاهز للنشر والحملات الإعلانية</span>
        </div>

        <Button
          type="button"
          onClick={handleSendToMarketingStudio}
          disabled={!selectedProduct}
          className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm active:scale-[0.97] transition-all flex items-center gap-2 cursor-pointer"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>إرسال لمسودة حملة Meta Ads في مركز التسويق</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
};
