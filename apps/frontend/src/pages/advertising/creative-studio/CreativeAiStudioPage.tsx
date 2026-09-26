import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Palette, Sparkles, Wand2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCompanyBranding } from "../../../hooks/useCompanyBranding";
import { AgentStudioLayout } from "../../../components/agent-studio";
import { ProductOpportunityRadar } from "../marketing-studio/ProductOpportunityRadar";
import { CreativeStudioControlPanel } from "./CreativeStudioControlPanel";
import { CreativeStudioInteractiveCanvas } from "./CreativeStudioInteractiveCanvas";
import { CreativeStudioHistoryDrawer } from "./CreativeStudioHistoryDrawer";
import { CreativeModelSelectorModal } from "./CreativeModelSelectorModal";
import { CREATIVE_STUDIO_PRESETS } from "./CreativeStudioPresets";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type {
  AspectRatioType,
  CanvasOverlaySettings,
  CreativePreset,
  MarketingProduct,
  ProductTransformSettings,
  CreativeAngleSuggestion,
  BrandKitSettings,
  BatchCountType,
} from "./types";

const CreativeAiStudioPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const companyId = user?.companyId || null;
  const companyBranding = useCompanyBranding(companyId);

  // Selected Product from Store Catalog or Uploaded Externally
  const [selectedProduct, setSelectedProduct] = useState<MarketingProduct | null>(
    (location.state as any)?.prefillProduct || null
  );
  const [activeProductAngleUrl, setActiveProductAngleUrl] = useState<string | null>(
    (location.state as any)?.prefillProduct?.mainImage || null
  );
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Creative Presets & Settings
  const [selectedPreset, setSelectedPreset] = useState<CreativePreset>(CREATIVE_STUDIO_PRESETS[0]);
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-image-2");
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("1:1");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // 2026 Extended States: Reference, Brand Kit, Cutout, Batch Variants
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [cutoutProductUrl, setCutoutProductUrl] = useState<string | null>(null);
  const [variantUrls, setVariantUrls] = useState<string[]>([]);
  const [batchCount, setBatchCount] = useState<BatchCountType>(1);
  const [brandKit, setBrandKit] = useState<BrandKitSettings>({
    isLocked: false,
    primaryColor: "#4f46e5",
    accentColor: "#f59e0b",
    aestheticMood: "minimalist-luxury",
  });

  // Gallery History state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Quota Telemetry
  const [dailyUsage, setDailyUsage] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(50);

  // Mobile view toggle (CONTROLS vs CANVAS)
  const [mobileView, setMobileView] = useState<"CHAT" | "CANVAS">("CANVAS");

  // Editable Typography & Visual Overlay
  const [overlay, setOverlay] = useState<CanvasOverlaySettings>(() => {
    const prefill = (location.state as any)?.prefillDraft;
    return {
      headline: prefill?.headline || "العرض الأقوى لفترة محدودة",
      subheadline: prefill?.primaryText || "جودة استثنائية مع شحن سريع ودفع عند الاستلام",
      price: prefill?.price ?? null,
      originalPrice: null,
      currency: "ج.م",
      discountBadge: "خصم خاص",
      callToAction: prefill?.callToAction || "اطلب الآن",
      primaryColor: "#4f46e5",
      accentColor: "#f59e0b",
      textColor: "#ffffff",
      fontFamily: "Cairo",
      textPosition: "top-right",
      showBadge: true,
      showPrice: true,
      showCta: true,
      showProductLayer: true,
      isBackgroundRemoved: false,
      productTransform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        shadowType: "contact",
      },
      logo: {
        url: null,
        position: "top-right",
        size: "md",
        opacity: 1,
        show: false,
      },
    };
  });

  // Load Model Config, Tier and Daily Usage
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<{ success: boolean; data: { model?: string } }>("/ai-image/model-config")
      .then((res) => {
        if (isMounted && res.data?.success && res.data.data?.model) {
          setSelectedModel(res.data.data.model);
        }
      })
      .catch(() => {});

    apiClient
      .get<{ success: boolean; data: { dailyUsage: number; dailyLimit: number; remainingQuota: number } }>(
        "/ai-image/quota"
      )
      .then((res) => {
        if (isMounted && res.data?.success && res.data.data) {
          setDailyUsage(res.data.data.dailyUsage ?? 0);
          setDailyLimit(res.data.data.dailyLimit ?? 50);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  const loadHistoryCount = useCallback(() => {
    apiClient
      .get<{ success?: boolean; data?: any[] }>("/ai-image/history")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        const list = Array.isArray(payload) ? payload : (payload?.items || payload?.history || payload?.images || []);
        if (Array.isArray(list)) {
          setHistoryCount(list.length);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHistoryCount();
  }, [loadHistoryCount, companyId]);

  // When a product is selected, intelligently auto-populate the ad overlay
  const handleProductSelect = useCallback((product: MarketingProduct) => {
    setSelectedProduct(product);
    setActiveProductAngleUrl(product.mainImage || product.images?.[0] || null);
    setCutoutProductUrl(null);
    setOverlay((prev) => {
      const price = product.price;
      const originalPrice = product.cost ? Math.round(price * 1.35) : null;
      const discountPercent =
        originalPrice && originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : null;

      return {
        ...prev,
        headline: product.name,
        subheadline: "متوفر الآن بأفضل سعر مع ضمان الاسترجاع والاستبدال",
        price,
        originalPrice,
        discountBadge: discountPercent ? `خصم ${discountPercent}%` : "عرض حصري",
        productTransform: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          shadowType: "contact",
        },
      };
    });
  }, []);

  const handleUpdateOverlay = (updates: Partial<CanvasOverlaySettings>) => {
    setOverlay((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdateProductTransform = useCallback(
    (updates: Partial<ProductTransformSettings>) => {
      setOverlay((prev) => ({
        ...prev,
        productTransform: {
          ...prev.productTransform,
          ...updates,
        },
      }));
    },
    []
  );

  const handleSelectAngle = useCallback((angle: CreativeAngleSuggestion) => {
    setCustomPrompt(angle.prompt);
    toast.info(`تم تطبيق زاوية: ${angle.titleAr}`);
  }, []);

  // Upload custom external product from local device
  const handleUploadCustomProduct = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const customProd: MarketingProduct = {
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || "منتج خارجي",
          price: 990,
          stock: 10,
          mainImage: reader.result,
        };
        setSelectedProduct(customProd);
        setActiveProductAngleUrl(reader.result);
        setCutoutProductUrl(null);
        setOverlay((prev) => ({
          ...prev,
          headline: customProd.name,
          price: 990,
          discountBadge: "عرض خاص",
          showProductLayer: true,
        }));
        toast.success("تم تحميل صورة المنتج الخارجي بنجاح");
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate Studio Scene with OpenRouter backend
  const handleGenerate = async (overridePrompt?: string) => {
    if (!selectedProduct) {
      toast.error("يرجى اختيار منتج أو رفع صورة منتج أولاً");
      return;
    }

    setIsGenerating(true);
    try {
      const activeText = (overridePrompt || customPrompt).trim();
      let basePrompt = activeText
        ? `${activeText}. Style: ${selectedPreset.promptModifier}`
        : `${selectedPreset.promptModifier}. Professional commercial scene for product: ${selectedProduct.name}. Clean composition, realistic shadows and lighting.`;

      if (brandKit.isLocked) {
        basePrompt += ` Aesthetic style: ${brandKit.aestheticMood}. Harmonized with brand identity colors (${brandKit.primaryColor} and ${brandKit.accentColor}).`;
      }

      let resolvedProductImage = cutoutProductUrl || activeProductAngleUrl || selectedProduct.mainImage || undefined;
      if (
        resolvedProductImage &&
        !resolvedProductImage.startsWith("http://") &&
        !resolvedProductImage.startsWith("https://") &&
        !resolvedProductImage.startsWith("data:")
      ) {
        const origin = window.location.origin;
        resolvedProductImage = `${origin.replace(/\/+$/, "")}/${resolvedProductImage.replace(/^\/+/, "")}`;
      }

      let resolvedReferenceImage = referenceImageUrl || undefined;
      if (
        resolvedReferenceImage &&
        !resolvedReferenceImage.startsWith("http://") &&
        !resolvedReferenceImage.startsWith("https://") &&
        !resolvedReferenceImage.startsWith("data:")
      ) {
        const origin = window.location.origin;
        resolvedReferenceImage = `${origin.replace(/\/+$/, "")}/${resolvedReferenceImage.replace(/^\/+/, "")}`;
      }

      const res = await apiClient.post<{
        success?: boolean;
        data?: { imageUrl?: string; images?: string[] };
        message?: string;
      }>(
        "/ai-image/generate",
        {
          prompt: basePrompt,
          model: selectedModel,
          aspectRatio,
          style: selectedPreset.category,
          quality: 90,
          productImage: resolvedProductImage,
          referenceImage: resolvedReferenceImage,
          n: batchCount,
        },
        { timeout: 180000 }
      );

      const returnedImages =
        res.data?.data?.images && res.data.data.images.length > 0
          ? res.data.data.images
          : res.data?.data?.imageUrl
          ? [res.data.data.imageUrl]
          : [];

      if (returnedImages.length > 0) {
        setVariantUrls(returnedImages);
        setBackgroundUrl(returnedImages[0]);
        setDailyUsage((prev) => prev + returnedImages.length);
        loadHistoryCount();
        toast.success(
          returnedImages.length > 1
            ? `تم توليد ${returnedImages.length} تنويعات إعلانية بنجاح`
            : "تم توليد المشهد الإعلاني بنجاح"
        );
        if (window.innerWidth < 1024) {
          setMobileView("CANVAS");
        }
      } else {
        toast.error(res.data?.message || "لم يتم استلام صورة من الموديل");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "فشل توليد المشهد";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AgentStudioLayout
      studioId="creative"
      title="استوديو التصاميم الذكي"
      icon={Palette}
      connectionBadgeText={selectedProduct?.id?.startsWith("custom-") ? "منتج مخصص خارجي" : "متصل بكتالوج المتجر"}
      selectedEntity={selectedProduct}
      entitySelectorPlaceholder="اختر منتج التصميم"
      onOpenEntityPicker={() => setIsProductPickerOpen(true)}
      sessionsCount={historyCount}
      sessionsButtonLabel="سجل الصور"
      sessionsIcon={ImageIcon}
      onOpenSessions={() => setIsHistoryOpen(true)}
      onNewSession={() => {
        setBackgroundUrl(null);
        setVariantUrls([]);
        setSelectedPreset(CREATIVE_STUDIO_PRESETS[0]);
        toast.info("تم بدء تصميم جديد");
      }}
      statusBadge={
        <button
          type="button"
          onClick={() => setIsModelModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer"
          title="انقر لفتح معرض النماذج 2026"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{selectedModel.split("/").pop()}</span>
        </button>
      }
      chatTabLabel="بيئات الاستوديو والنصوص"
      canvasTabLabel="كانفاس التصميم المرئي"
      canvasTabIcon={Wand2}
      hasActiveDraft={!!backgroundUrl}
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
      chatPanel={
        <CreativeStudioControlPanel
          selectedProduct={selectedProduct}
          selectedPresetId={selectedPreset.id}
          onSelectPreset={(preset) => setSelectedPreset(preset)}
          selectedModel={selectedModel}
          onSelectModel={(m) => setSelectedModel(m)}
          aspectRatio={aspectRatio}
          onChangeAspectRatio={setAspectRatio}
          overlay={overlay}
          onUpdateOverlay={handleUpdateOverlay}
          customPrompt={customPrompt}
          onChangeCustomPrompt={setCustomPrompt}
          onSelectAngle={handleSelectAngle}
          isGenerating={isGenerating}
          onGenerate={() => handleGenerate()}
          dailyUsage={dailyUsage}
          dailyLimit={dailyLimit}
          referenceImageUrl={referenceImageUrl}
          onSetReferenceImageUrl={setReferenceImageUrl}
          brandKit={brandKit}
          onUpdateBrandKit={(updates) => setBrandKit((prev) => ({ ...prev, ...updates }))}
          batchCount={batchCount}
          onChangeBatchCount={setBatchCount}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          onTriggerGenerateWithPrompt={(prompt) => handleGenerate(prompt)}
          onSelectScenePreset={(scene, autoSwapPrompt) => {
            setCustomPrompt(autoSwapPrompt);
            setBackgroundUrl(scene.previewUrl);
            setVariantUrls([scene.previewUrl]);
            toast.success(`تم اختيار مشهد: ${scene.titleAr}`);
          }}
          storeLogoUrl={companyBranding.logo}
        />
      }
      canvasPanel={
        <CreativeStudioInteractiveCanvas
          selectedProduct={selectedProduct}
          selectedPreset={selectedPreset}
          aspectRatio={aspectRatio}
          onChangeAspectRatio={setAspectRatio}
          overlay={overlay}
          onUpdateOverlay={handleUpdateOverlay}
          onUpdateProductTransform={handleUpdateProductTransform}
          backgroundUrl={backgroundUrl}
          isGenerating={isGenerating}
          onUploadCustomProduct={handleUploadCustomProduct}
          variantUrls={variantUrls}
          onSelectVariant={(url) => setBackgroundUrl(url)}
          cutoutProductUrl={cutoutProductUrl}
          onSetCutoutProductUrl={setCutoutProductUrl}
          activeProductAngleUrl={activeProductAngleUrl}
          onSelectProductAngle={(url) => {
            setActiveProductAngleUrl(url);
            setCutoutProductUrl(null);
          }}
        />
      }
      extraDrawers={
        <>
          <ProductOpportunityRadar
            isOpen={isProductPickerOpen}
            onClose={() => setIsProductPickerOpen(false)}
            selectedProduct={selectedProduct}
            onSelectProduct={handleProductSelect}
          />
          <CreativeStudioHistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onSelectImage={(url) => {
              setBackgroundUrl(url);
              setVariantUrls([url]);
              if (window.innerWidth < 1024) {
                setMobileView("CANVAS");
              }
            }}
            onHistoryChange={(cnt) => setHistoryCount(cnt)}
          />
          <CreativeModelSelectorModal
            isOpen={isModelModalOpen}
            onClose={() => setIsModelModalOpen(false)}
            selectedModel={selectedModel}
            onSelectModel={(m) => setSelectedModel(m)}
          />
        </>
      }
    />
  );
};

export default CreativeAiStudioPage;
