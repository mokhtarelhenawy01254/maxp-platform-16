import React, { useState, useEffect } from "react";
import { Sparkles, Rocket, X } from "lucide-react";
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
  const [isDraftDrawerOpen, setIsDraftDrawerOpen] = useState(false);

  // Mobile view state
  const [mobileView, setMobileView] = useState<"CHAT" | "CANVAS">("CHAT");

  const handleProductSelect = (product: MarketingProduct) => {
    setSelectedProduct(product);
  };

  const handleDraftGenerated = (toolData: any) => {
    let args = toolData?.args || toolData?.arguments || {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }
    const resData = toolData?.result || {};
    const firstDraft = resData.drafts?.[0] || {};

    setCurrentDraft({
      id: firstDraft.id || `draft_${Date.now()}`,
      productName: selectedProduct?.name || args.product_name || firstDraft.name || "منتج المتجر",
      angleTitle: args.angle || firstDraft.angle || "عرض القيمة المباشر للعميل",
      headline: args.headline || firstDraft.headline || "العرض الأقوى لفترة محدودة!",
      primaryText:
        args.primary_text || args.copy || firstDraft.primary_text || "احصل على المنتج مع شحن مجاني ودفع عند الاستلام.",
      callToAction: args.call_to_action || firstDraft.call_to_action || "SHOP_NOW",
      budgetAmount: Number(args.daily_budget) || Number(firstDraft.daily_budget) || 350,
      currency: "EGP",
      targetAudience: args.target_audience || firstDraft.target_audience || "مصر • المهتمون بالشراء أونلاين",
      format: args.format || firstDraft.format || "Reels / Video",
      status: "DRAFT",
    });

    // Auto-open draft drawer when a new campaign draft is generated
    setIsDraftDrawerOpen(true);
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
      sessionsCount={copilotSessions.totalCount || copilotSessions.sessions.length}
      onOpenSessions={() => setIsSessionsDrawerOpen(true)}
      onNewSession={() => copilotSessions.createNewSession()}
      activeAgent={activeAgent}
      agentRoutingHref="/admin/ai-hub?tab=routing"
      statusBadge={
        currentDraft ? (
          <button
            type="button"
            onClick={() => setIsDraftDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer shadow-xs active:scale-95"
            title="عرض ومراجعة مسودة الإعلان"
          >
            <Rocket className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span>مسودة الإعلان جاهزة (مراجعة)</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>مساعد التسويق جاهز</span>
          </div>
        )
      }
      chatTabLabel="المحادثة والاستراتيجية"
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
            totalCount={copilotSessions.totalCount}
            activeSessionId={copilotSessions.activeSessionId}
            onSelectSession={copilotSessions.switchSession}
            onNewSession={() => copilotSessions.createNewSession()}
            onDeleteSession={copilotSessions.deleteSession}
          />

          {/* Slide-over Drawer for Campaign Draft */}
          {isDraftDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setIsDraftDrawerOpen(false)}
                aria-hidden="true"
              />
              <aside
                aria-label="مسودة إطلاق الحملة الإعلانية"
                className="w-full sm:w-[540px] lg:w-[600px] max-w-full h-full bg-white dark:bg-slate-900 border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
              >
                <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                      <Rocket className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        مسودة الحملة الإعلانية
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          جاهزة للإطلاق
                        </span>
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDraftDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <CampaignDraftLaunchCard
                    draft={currentDraft}
                    selectedProduct={selectedProduct}
                    onDraftPublished={() => {
                      setCurrentDraft(null);
                      setIsDraftDrawerOpen(false);
                    }}
                  />
                </div>
              </aside>
            </div>
          )}
        </>
      }
    />
  );
};

export default MarketingAiStudioPage;
