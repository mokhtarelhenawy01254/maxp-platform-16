import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Palette, Sparkles, Wand2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { AgentStudioLayout } from "../../../components/agent-studio";
import { ProductOpportunityRadar } from "../marketing-studio/ProductOpportunityRadar";
import { CreativeStudioControlPanel } from "./CreativeStudioControlPanel";
import { CreativeStudioInteractiveCanvas } from "./CreativeStudioInteractiveCanvas";
import { CreativeStudioHistoryDrawer } from "./CreativeStudioHistoryDrawer";
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
} from "./types";

const CreativeAiStudioPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const companyId = user?.companyId || null;

  // Selected Product from Store Catalog (support prefill from location.state)
  const [selectedProduct, setSelectedProduct] = useState<MarketingProduct | null>(
    (location.state as any)?.prefillProduct || null
  );
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Creative Presets & Settings
  const [selectedPreset, setSelectedPreset] = useState<CreativePreset>(CREATIVE_STUDIO_PRESETS[0]);
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-image-2");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("1:1");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

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
      productTransform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        shadowType: "contact",
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
      .get<{ success: boolean; data: { dailyUsage: number; dailyLimit: number } }>(
        "/ai-image/tier-config"
      )
      .then((res) => {
        if (isMounted && res.data?.success && res.data.data) {
          setDailyUsage(res.data.data.dailyUsage || 0);
          setDailyLimit(res.data.data.dailyLimit || 50);
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
        if (res.data?.success && Array.isArray(res.data.data)) {
          setHistoryCount(res.data.data.length);
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

  // Generate Studio Scene with OpenRouter backend
  const handleGenerate = async () => {
    if (!selectedProduct) {
      toast.error("يرجى اختيار منتج من الكتالوج أولاً");
      return;
    }

    setIsGenerating(true);
    try {
      const basePrompt = customPrompt.trim()
        ? `${customPrompt}. Style: ${selectedPreset.promptModifier}`
        : `${selectedPreset.promptModifier}. Professional commercial scene for product: ${selectedProduct.name}. Clean composition, realistic shadows and lighting.`;

      let resolvedProductImage = selectedProduct.mainImage || undefined;
      if (
        resolvedProductImage &&
        !resolvedProductImage.startsWith("http://") &&
        !resolvedProductImage.startsWith("https://") &&
        !resolvedProductImage.startsWith("data:")
      ) {
        const origin = window.location.origin;
        resolvedProductImage = `${origin.replace(/\/+$/, "")}/${resolvedProductImage.replace(/^\/+/, "")}`;
      }

      const res = await apiClient.post<{
        success?: boolean;
        data?: { imageUrl?: string };
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
        },
        { timeout: 120000 }
      );

      if (res.data?.data?.imageUrl) {
        setBackgroundUrl(res.data.data.imageUrl);
        setDailyUsage((prev) => prev + 1);
        loadHistoryCount();
        toast.success("تم توليد المشهد الإعلاني بنجاح");
        // On mobile, switch view to canvas to see result immediately
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
      connectionBadgeText="متصل بكتالوج المتجر"
      selectedEntity={selectedProduct}
      entitySelectorPlaceholder="اختر منتج التصميم"
      onOpenEntityPicker={() => setIsProductPickerOpen(true)}
      sessionsCount={historyCount}
      sessionsButtonLabel="سجل الصور"
      sessionsIcon={ImageIcon}
      onOpenSessions={() => setIsHistoryOpen(true)}
      onNewSession={() => {
        setBackgroundUrl(null);
        setSelectedPreset(CREATIVE_STUDIO_PRESETS[0]);
        toast.info("تم بدء تصميم جديد");
      }}
      statusBadge={
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{selectedModel.split("/").pop()}</span>
        </div>
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
          onGenerate={handleGenerate}
          dailyUsage={dailyUsage}
          dailyLimit={dailyLimit}
        />
      }
      canvasPanel={
        <CreativeStudioInteractiveCanvas
          selectedProduct={selectedProduct}
          selectedPreset={selectedPreset}
          aspectRatio={aspectRatio}
          onChangeAspectRatio={setAspectRatio}
          overlay={overlay}
          onUpdateProductTransform={handleUpdateProductTransform}
          backgroundUrl={backgroundUrl}
          isGenerating={isGenerating}
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
              if (window.innerWidth < 1024) {
                setMobileView("CANVAS");
              }
            }}
            onHistoryChange={(cnt) => setHistoryCount(cnt)}
          />
        </>
      }
    />
  );
};

export default CreativeAiStudioPage;
