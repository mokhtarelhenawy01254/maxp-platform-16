import React, { useRef, useState, useMemo } from "react";
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
  Scissors,
  Eye,
  EyeOff,
  Upload,
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
  onUpdateOverlay?: (updates: Partial<CanvasOverlaySettings>) => void;
  onUpdateProductTransform?: (updates: Partial<ProductTransformSettings>) => void;
  backgroundUrl: string | null;
  isGenerating: boolean;
  onUploadCustomProduct?: (file: File) => void;
  variantUrls?: string[];
  onSelectVariant?: (url: string) => void;
  cutoutProductUrl?: string | null;
  onSetCutoutProductUrl?: (url: string | null) => void;
  activeProductAngleUrl?: string | null;
  onSelectProductAngle?: (url: string) => void;
  onAddProductAngle?: (file: File) => void;
}

export const CreativeStudioInteractiveCanvas: React.FC<CreativeStudioInteractiveCanvasProps> = ({
  selectedProduct,
  selectedPreset,
  aspectRatio,
  onChangeAspectRatio,
  overlay,
  onUpdateOverlay,
  onUpdateProductTransform,
  backgroundUrl,
  isGenerating,
  onUploadCustomProduct,
  variantUrls = [],
  onSelectVariant,
  cutoutProductUrl,
  onSetCutoutProductUrl,
  activeProductAngleUrl,
  onSelectProductAngle,
  onAddProductAngle,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const angleFileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [localAngles, setLocalAngles] = useState<Array<{ url: string; label: string }>>([]);

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

  // Extract all available product angles & photos from product, variants, and local uploads
  const productPhotos = useMemo(() => {
    if (!selectedProduct) return [];
    const list: Array<{ url: string; label: string }> = [];
    const seen = new Set<string>();

    const add = (url: string | null | undefined, label: string) => {
      if (!url || typeof url !== "string") return;
      const trimmed = url.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      list.push({ url: trimmed, label });
    };

    add(selectedProduct.mainImage, "الرئيسية");

    if (Array.isArray(selectedProduct.images)) {
      selectedProduct.images.forEach((img, idx) => {
        add(img, `زاوية ${idx + 1}`);
      });
    }

    if (Array.isArray(selectedProduct.variants)) {
      selectedProduct.variants.forEach((v, idx) => {
        if (v.image) add(v.image, v.name || `موديل ${idx + 1}`);
        if (Array.isArray(v.images)) {
          v.images.forEach((img, i) => add(img, `${v.name || "موديل"} ${i + 1}`));
        }
      });
    }

    localAngles.forEach((la) => add(la.url, la.label));

    return list;
  }, [selectedProduct, localAngles]);

  const currentAngleUrl = activeProductAngleUrl || selectedProduct?.mainImage || null;
  const activeProductImage = cutoutProductUrl || currentAngleUrl;

  const handleSelectAngle = (url: string) => {
    onSelectProductAngle?.(url);
    if (cutoutProductUrl) {
      onSetCutoutProductUrl?.(null);
    }
    toast.info("تم اختيار زاوية العرض للمنتج");
  };

  const handleAddAngleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onAddProductAngle) {
      onAddProductAngle(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const newUrl = reader.result;
          setLocalAngles((prev) => [...prev, { url: newUrl, label: `زاوية مخصصة ${prev.length + 1}` }]);
          onSelectProductAngle?.(newUrl);
          toast.success("تمت إضافة زاوية جديدة للمنتج بنجاح");
        }
      };
      reader.readAsDataURL(file);
    }
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

  const handleLaunchMetaWizard = () => {
    if (!selectedProduct) {
      toast.error("يرجى اختيار منتج أولاً");
      return;
    }

    const launchPrefillId = `creative_${Date.now()}`;
    const creativeImage = backgroundUrl || activeProductImage || selectedProduct.mainImage || "";

    const prefillPayload = {
      productId: selectedProduct.id,
      productTitle: selectedProduct.name,
      productSlug: selectedProduct.name ? selectedProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "product",
      headline: overlay.headline || selectedProduct.name,
      primaryText: overlay.subheadline || "اطلب الآن بأفضل سعر وجودة مضمونة مع شحن سريع ودفع عند الاستلام",
      callToAction: overlay.callToAction || "SHOP_NOW",
      budget: overlay.price ? Math.max(350, Math.round(overlay.price * 1.5)) : 500,
      objective: "OUTCOME_SALES",
      creativeType: "SINGLE_IMAGE",
      imageUrls: [creativeImage].filter(Boolean),
      status: "ACTIVE",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    try {
      sessionStorage.setItem(`facebookAds.productLaunchPrefill:${launchPrefillId}`, JSON.stringify(prefillPayload));
      if (selectedProduct.id) {
        sessionStorage.setItem(`facebookAds.productLaunchPrefill:${selectedProduct.id}:${launchPrefillId}`, JSON.stringify(prefillPayload));
      }
    } catch (e) {
      console.warn("Could not save to sessionStorage", e);
    }

    toast.success("جاري نقلك إلى معالج إعلانات فيسبوك مع تعبئة التصميم والنصوص تلقائياً...");
    navigate(`/advertising/facebook-ads/create-ad?launchPrefillId=${launchPrefillId}${selectedProduct.id ? `&productId=${selectedProduct.id}` : ""}`);
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
          callToAction: overlay.callToAction,
          price: overlay.price,
          format: aspectRatio === "9:16" ? "Story / Reels" : "Feed / Square",
          creativeImageUrl: backgroundUrl || activeProductImage,
        },
      },
    });
  };

  const handleDownloadSnapshot = async () => {
    if (!selectedProduct && !backgroundUrl) {
      toast.error("لا يوجد مشهد أو منتج لتصديره");
      return;
    }

    setIsExporting(true);
    try {
      // Use cutout product image if available, else current angle image
      const effectiveProduct = selectedProduct
        ? {
            ...selectedProduct,
            mainImage: cutoutProductUrl || currentAngleUrl || selectedProduct.mainImage,
          }
        : null;

      await downloadCompositeImage({
        backgroundUrl,
        product: effectiveProduct,
        aspectRatio,
        overlay,
        previewGradient: selectedPreset.previewGradient,
      });
      toast.success("تم تنزيل التصميم الإعلاني بدقة 2K بنجاح");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("تعذر تصدير الصورة، يرجى المحاولة مرة أخرى");
    } finally {
      setIsExporting(false);
    }
  };

  // Instant In-Browser Chroma Background Remover
  const handleRemoveBackground = () => {
    const imgSrc = currentAngleUrl;
    if (!imgSrc) return;

    setIsRemovingBg(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imgData.data;

        // Sample corner pixels to determine background tone
        const corners = [
          0,
          (c.width - 1) * 4,
          ((c.height - 1) * c.width) * 4,
          ((c.height - 1) * c.width + (c.width - 1)) * 4,
        ];
        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach((idx) => {
          bgR += data[idx];
          bgG += data[idx + 1];
          bgB += data[idx + 2];
        });
        bgR = Math.round(bgR / 4);
        bgG = Math.round(bgG / 4);
        bgB = Math.round(bgB / 4);

        const threshold = 38;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          // If close to background tone or pure near-white/light gray studio background
          if (dist < threshold || (r > 240 && g > 240 && b > 240)) {
            data[i + 3] = 0; // Zero alpha (transparent)
          }
        }
        ctx.putImageData(imgData, 0, 0);
        const resultUrl = c.toDataURL("image/png");
        onSetCutoutProductUrl?.(resultUrl);
        onUpdateOverlay?.({ isBackgroundRemoved: true });
        toast.success("تم تفريغ خلفية المنتج تلقائياً بنجاح");
      } catch (e) {
        console.warn("Chroma cutout failed:", e);
        toast.error("تعذر التفريغ التلقائي لهذه الصورة");
      } finally {
        setIsRemovingBg(false);
      }
    };
    img.onerror = () => {
      setIsRemovingBg(false);
      toast.error("تعذر تحميل صورة المنتج لتفريغها");
    };
    img.src = imgSrc;
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/60 dark:bg-slate-950/80 select-none overflow-hidden">
      {/* Top Workspace Canvas Control Bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0 gap-2 flex-wrap">
        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
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

        {/* Canvas Visibility & Cutout Controls */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Product Cutout Layer */}
          {selectedProduct && (
            <button
              type="button"
              onClick={() =>
                onUpdateOverlay?.({
                  showProductLayer: overlay.showProductLayer === false ? true : false,
                })
              }
              className={`h-8 px-2 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                overlay.showProductLayer !== false
                  ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
              }`}
              title="إظهار أو إخفاء مجسم المنتج المفرغ فوق خلفية الذكاء الاصطناعي"
            >
              {overlay.showProductLayer !== false ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {overlay.showProductLayer !== false ? "طبقة المنتج: نشطة" : "طبقة المنتج: مخفية"}
              </span>
            </button>
          )}

          {/* Instant Background Remover Button */}
          {selectedProduct && overlay.showProductLayer !== false && (
            <button
              type="button"
              disabled={isRemovingBg}
              onClick={handleRemoveBackground}
              className="h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer"
              title="تفريغ الخلفية البيضاء أو الاستوديو تلقائياً ليصبح المنتج شفافاً 100%"
            >
              {isRemovingBg ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Scissors className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="hidden md:inline">تفريغ الخلفية</span>
            </button>
          )}

          {/* Upload Custom External Product Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onUploadCustomProduct) {
                onUploadCustomProduct(file);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2 text-xs font-bold rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer"
            title="رفع صورة منتج خارجي من حاسوبك أو هاتفك"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline">رفع منتج خارجي</span>
          </button>
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
            title="تصدير تصميم متكامل بدقة 2K (الخلفية + المنتج + اللوجو + الظلال + النصوص)"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isExporting ? "جاري الرندرة..." : "تحميل بدقة 2K"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleLaunchMetaWizard}
            className="h-8 text-xs gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer"
            title="تعبئة معالج إعلانات فيسبوك مباشرة بهذا التصميم الإعلاني والنصوص"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إطلاق كإعلان فيسبوك</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendToMarketingStudio}
            className="h-8 text-xs px-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer hidden lg:flex"
            title="المتابعة في استوديو كتابة الحملات التسويقية"
          >
            <span>استوديو الحملات</span>
          </Button>
        </div>
      </div>

      {/* Product Angles & Multi-Image Gallery Strip */}
      {selectedProduct && productPhotos.length > 0 && (
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 flex-shrink-0 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 flex-shrink-0">
            <Package className="w-3.5 h-3.5 text-indigo-500" />
            <span>زوايا المنتج ({productPhotos.length}):</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {productPhotos.map((item, idx) => {
              const isActive = currentAngleUrl === item.url || (!activeProductAngleUrl && idx === 0);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectAngle(item.url)}
                  className={`group relative flex items-center gap-1.5 p-1 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${
                    isActive
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 shadow-xs ring-2 ring-indigo-400/30"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-400 opacity-80 hover:opacity-100"
                  }`}
                  title={item.label}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-8 h-8 rounded-lg object-contain bg-slate-100 dark:bg-slate-950/50 p-0.5"
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-1 hidden md:inline">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mr-1" />
                  )}
                </button>
              );
            })}

            {/* Upload Additional Product Angle */}
            <input
              ref={angleFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddAngleFile}
            />
            <button
              type="button"
              onClick={() => angleFileInputRef.current?.click()}
              className="h-8 px-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer flex-shrink-0"
              title="رفع صورة زاوية جديدة لهذا المنتج من حاسوبك"
            >
              <Upload className="w-3 h-3 text-indigo-500" />
              <span>+ إضافة زاوية</span>
            </button>
          </div>
        </div>
      )}

      {/* Center Interactive Canvas Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto relative">
        {/* The Live Layered Canvas Frame */}
        <div
          ref={canvasRef}
          className={`w-full ${aspectClass} relative rounded-2xl overflow-hidden shadow-2xl border border-slate-900/10 dark:border-white/10 transition-all duration-300 flex flex-col justify-between flex-shrink-0`}
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

          {/* Layer 5: Brand Logo Overlay */}
          {overlay.logo?.show && overlay.logo?.url && (
            <div
              className={`absolute z-30 pointer-events-none p-3.5 ${
                overlay.logo.position === "top-left"
                  ? "top-0 left-0"
                  : overlay.logo.position === "bottom-left"
                  ? "bottom-0 left-0"
                  : overlay.logo.position === "bottom-right"
                  ? "bottom-0 right-0"
                  : "top-0 right-0"
              }`}
              style={{ opacity: overlay.logo.opacity ?? 1 }}
            >
              <img
                src={overlay.logo.url}
                alt="Brand Logo"
                className={`object-contain drop-shadow-md ${
                  overlay.logo.size === "sm"
                    ? "h-6 max-w-[80px]"
                    : overlay.logo.size === "lg"
                    ? "h-12 max-w-[150px]"
                    : "h-9 max-w-[110px]"
                }`}
              />
            </div>
          )}

          {/* Layer 1 & 2: Interactive Transform Product Container (Controlled by showProductLayer) */}
          {overlay.showProductLayer !== false && (
            <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-10">
              {activeProductImage ? (
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
                    src={activeProductImage}
                    alt={selectedProduct?.name || "Product"}
                    className="max-h-52 sm:max-h-64 object-contain drop-shadow-xl relative z-10 transition-transform select-none pointer-events-none"
                    draggable={false}
                  />

                  {/* Interactive Drag Pill Indicator */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                    <Move className="w-2.5 h-2.5" />
                    <span>اسحب للتحريك</span>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 rounded-2xl border-2 border-dashed border-white/30 hover:border-indigo-400 flex flex-col items-center justify-center p-4 text-center bg-black/30 backdrop-blur-xs cursor-pointer transition"
                >
                  <Package className="w-10 h-10 text-white/40 mb-2" />
                  <span className="text-xs font-bold text-white/80">
                    اختر أو ارفع منتجاً لإسقاطه في الاستوديو
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Layer 3: Top Badges (Preset Tag & High Converting Discount Pill) */}
          <div className="relative z-20 p-4 flex items-start justify-between gap-2 pointer-events-none">
            {overlay.showBadge && overlay.discountBadge ? (
              <div
                className="px-3 py-1 rounded-full text-xs font-black shadow-lg border border-black/10 flex items-center gap-1"
                style={{
                  backgroundColor: overlay.accentColor || "#f59e0b",
                  color: "#000000",
                }}
              >
                <span>{overlay.discountBadge}</span>
              </div>
            ) : (
              <div />
            )}

            <div className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/90 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{selectedPreset.labelAr}</span>
            </div>
          </div>

          {/* Layer 4: Bottom Converting Typography & Direct-Response Overlay */}
          <div className="relative z-20 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none text-right">
            <h2
              className="text-base sm:text-xl font-black text-white drop-shadow-md leading-tight"
              style={{ fontFamily: overlay.fontFamily || "Cairo" }}
            >
              {overlay.headline}
            </h2>

            {overlay.subheadline && (
              <p
                className="text-[11px] sm:text-xs text-white/80 mt-1 line-clamp-2 drop-shadow-xs"
                style={{ fontFamily: overlay.fontFamily || "Cairo" }}
              >
                {overlay.subheadline}
              </p>
            )}

            {/* Price Row & Call to Action */}
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              {overlay.showCta && (
                <div
                  className="px-4 py-1.5 rounded-xl font-black text-xs text-white shadow-lg pointer-events-auto flex items-center gap-1.5 cursor-pointer hover:opacity-95 active:scale-95 transition"
                  style={{ backgroundColor: overlay.primaryColor || "#4f46e5" }}
                >
                  <span>{overlay.callToAction || "اطلب الآن"}</span>
                  <span className="text-[10px]">←</span>
                </div>
              )}

              {overlay.showPrice && overlay.price != null && (
                <div className="flex items-baseline gap-2 font-mono text-left">
                  {overlay.originalPrice && overlay.originalPrice > overlay.price && (
                    <span className="text-xs line-through text-white/50">
                      {overlay.originalPrice} {overlay.currency}
                    </span>
                  )}
                  <span
                    className="text-sm sm:text-lg font-black text-emerald-400 drop-shadow-xs"
                    style={{ color: overlay.accentColor || "#10b981" }}
                  >
                    {overlay.price} {overlay.currency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading Indicator Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-3">
                <div className="w-12 h-12 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
              </div>
              <p className="text-xs font-bold text-white mb-1">
                جاري توليد المشهد الإعلاني بالذكاء الاصطناعي...
              </p>
              <span className="text-[10px] text-white/60 font-mono">
                معالجة الإضاءة والظلال التفاعلية
              </span>
            </div>
          )}
        </div>

        {/* Multi-Variant Selector Strip (Batch Generation 1x/2x/4x) */}
        {variantUrls && variantUrls.length > 1 && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-20">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
              تنويعات المشهد:
            </span>
            <div className="flex items-center gap-1.5">
              {variantUrls.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectVariant?.(url)}
                  className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    backgroundUrl === url
                      ? "border-indigo-600 scale-105 shadow-md ring-2 ring-indigo-400/40"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-bold text-white text-center py-0.5">
                    خيار {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
