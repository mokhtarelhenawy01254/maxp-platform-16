import React, { useState, useEffect } from "react";
import { Sparkles, Rocket } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCopilotSessions } from "../../../components/advertising/copilot/useCopilotSessions";
import { getMarketingActiveAgent } from "../../../services/facebookAdsService";
import { ProductOpportunityRadar } from "./ProductOpportunityRadar";
import { MarketingSquadChatFeed } from "./MarketingSquadChatFeed";
import { MarketingControlHub } from "./MarketingControlHub";
import { CampaignDraftLaunchCard } from "./CampaignDraftLaunchCard";
import { AgentStudioLayout } from "../../../components/agent-studio";
import type { MarketingProduct, MarketingCampaignDraft } from "./types";

const MarketingAiStudioPage: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || null;

  const copilotSessions = useCopilotSessions(companyId);

  const [selectedProduct, setSelectedProduct] = useState<MarketingProduct | null>(null);
  const [currentDraft, setCurrentDraft] = useState<MarketingCampaignDraft | null>(null);
  const [activeAgent, setActiveAgent] = useState<{
    id: string;
    name: string;
    role: string;
    isRouted?: boolean;
  } | null>(null);

  // Load active routed agent for Marketing Studio
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getMarketingActiveAgent();
        if (isMounted && res.success && res.agent) {
          setActiveAgent(res.agent);
        }
      } catch (err) {
        console.warn("[MarketingAiStudio] Could not load active agent:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Modal / Drawer states
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSessionsDrawerOpen, setIsSessionsDrawerOpen] = useState(false);

  // Mobile 2-view state: CHAT vs CANVAS
  const [mobileView, setMobileView] = useState<"CHAT" | "CANVAS">("CHAT");

  const handleProductSelect = (product: MarketingProduct) => {
    setSelectedProduct(product);
  };

  const handleDraftGenerated = (toolData: any) => {
    if (toolData?.args) {
      const args = toolData.args;
      setCurrentDraft({
        id: `draft_${Date.now()}`,
        productName: selectedProduct?.name || args.product_name || "منتج المتجر",
        angleTitle: args.angle || "عرض القيمة المباشر للعميل",
        headline: args.headline || "العرض الأقوى لفترة محدودة!",
        primaryText:
          args.primary_text || args.copy || "احصل على المنتج مع شحن مجاني ودفع عند الاستلام.",
        callToAction: args.call_to_action || "SHOP_NOW",
        budgetAmount: Number(args.daily_budget) || 350,
        currency: "EGP",
        targetAudience: args.target_audience || "مصر • المهتمون بالشراء أونلاين",
        format: args.format || "Reels / Video",
        status: "DRAFT",
      });
      // Switch view to preview canvas on mobile if draft ready
      if (window.innerWidth < 1024) {
        setMobileView("CANVAS");
      }
    }
  };

  return (
    <AgentStudioLayout
      studioId="marketing"
      title="مركز التسويق الذكي"
      icon={Sparkles}
      connectionBadgeText="متصل بالمتجر"
      selectedEntity={selectedProduct}
      entitySelectorPlaceholder="اختر منتج الحملة"
      onOpenEntityPicker={() => setIsProductPickerOpen(true)}
      sessionsCount={copilotSessions.sessions.length}
      onOpenSessions={() => setIsSessionsDrawerOpen(true)}
      onNewSession={() => copilotSessions.createNewSession()}
      activeAgent={activeAgent}
      agentRoutingHref="/admin/ai-hub?tab=routing"
      statusBadge={
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Rocket className="w-3.5 h-3.5 text-blue-500" />
          <span>مسودة Meta Ads جاهزة</span>
        </div>
      }
      chatTabLabel="المحادثة والاستراتيجية"
      canvasTabLabel="مسودة الإعلان"
      canvasTabIcon={Rocket}
      hasActiveDraft={!!currentDraft}
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
      chatPanel={
        <MarketingSquadChatFeed
          selectedProduct={selectedProduct}
          companyId={companyId}
          activeAgent={activeAgent}
          onDraftGenerated={handleDraftGenerated}
          activeSession={copilotSessions.activeSession}
          addMessageToActiveSession={copilotSessions.addMessageToActiveSession}
          createNewSession={() => copilotSessions.createNewSession()}
        />
      }
      canvasPanel={
        <CampaignDraftLaunchCard
          draft={currentDraft}
          selectedProduct={selectedProduct}
          onDraftPublished={() => {
            setCurrentDraft(null);
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

          <MarketingControlHub
            isOpen={isSessionsDrawerOpen}
            onClose={() => setIsSessionsDrawerOpen(false)}
            sessions={copilotSessions.sessions}
            activeSessionId={copilotSessions.activeSessionId}
            onSelectSession={copilotSessions.switchSession}
            onNewSession={() => copilotSessions.createNewSession()}
            onDeleteSession={copilotSessions.deleteSession}
          />
        </>
      }
    />
  );
};

export default MarketingAiStudioPage;
