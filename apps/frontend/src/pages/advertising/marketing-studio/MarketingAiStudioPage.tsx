import React, { useState } from "react";
import {
  Sparkles,
  ShoppingBag,
  MessageSquare,
  Rocket,
  ChevronDown,
  FolderArchive,
  Package,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCopilotSessions } from "../../../components/advertising/copilot/useCopilotSessions";
import { ProductOpportunityRadar } from "./ProductOpportunityRadar";
import { MarketingSquadChatFeed } from "./MarketingSquadChatFeed";
import { MarketingControlHub } from "./MarketingControlHub";
import { CampaignDraftLaunchCard } from "./CampaignDraftLaunchCard";
import type { MarketingProduct, MarketingCampaignDraft } from "./types";

const MarketingAiStudioPage: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || null;

  const copilotSessions = useCopilotSessions(companyId);

  const [selectedProduct, setSelectedProduct] = useState<MarketingProduct | null>(null);
  const [currentDraft, setCurrentDraft] = useState<MarketingCampaignDraft | null>(null);

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
    <div className="h-[calc(100dvh-4.5rem)] flex flex-col p-2.5 sm:p-3.5 gap-2.5 sm:gap-3 bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Ergonomic Control Bar */}
      <header className="flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0 flex-wrap">
        {/* Brand & Cockpit Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-sm flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              مركز التسويق الذكي
            </h1>
            <span className="hidden md:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              AI Cockpit
            </span>
          </div>
        </div>

        {/* Central Ergonomic Selectors: Single-use actions moved to Top-Bar */}
        <div className="flex items-center gap-2">
          {/* Smart Product Selector Button */}
          <button
            type="button"
            onClick={() => setIsProductPickerOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold shadow-sm"
            title="تغيير منتج الحملة"
          >
            {selectedProduct ? (
              <>
                <div className="w-5 h-5 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {selectedProduct.mainImage ? (
                    <img
                      src={selectedProduct.mainImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span className="truncate max-w-[120px] sm:max-w-[180px] text-slate-800 dark:text-slate-100">
                  {selectedProduct.name}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black">
                  {selectedProduct.price} ج.م
                </span>
              </>
            ) : (
              <>
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-slate-700 dark:text-slate-300">اختر منتج الحملة</span>
              </>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>

          {/* Sessions History Button */}
          <button
            type="button"
            onClick={() => setIsSessionsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm"
            title="استعراض الجلسات السابقة"
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">الجلسات</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
              {copilotSessions.sessions.length}
            </span>
          </button>
        </div>

        {/* Mobile View Switcher (2-Tab Clean Toggle) */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMobileView("CHAT")}
            className={`py-1 px-2.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              mobileView === "CHAT"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            المحادثة
          </button>
          <button
            type="button"
            onClick={() => setMobileView("CANVAS")}
            className={`py-1 px-2.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              mobileView === "CANVAS"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            معاينة الإعلان
            {currentDraft && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Main 2-Panel Focused Workspace (Zero Wasted Space) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0 overflow-hidden">
        {/* Panel 1: Strategy & Chat Studio (58% of screen) */}
        <section
          aria-label="استوديو استراتيجية التسويق"
          className={`h-full lg:col-span-7 min-h-0 ${
            mobileView === "CHAT" ? "block" : "hidden lg:block"
          }`}
        >
          <MarketingSquadChatFeed
            selectedProduct={selectedProduct}
            companyId={companyId}
            onDraftGenerated={handleDraftGenerated}
            activeSession={copilotSessions.activeSession}
            addMessageToActiveSession={copilotSessions.addMessageToActiveSession}
            createNewSession={() => copilotSessions.createNewSession()}
          />
        </section>

        {/* Panel 2: Live Ad Mockup & One-Click Launch (42% of screen) */}
        <section
          aria-label="معاينة إعلان فيسبوك وإطلاق الحملة"
          className={`h-full lg:col-span-5 min-h-0 ${
            mobileView === "CANVAS" ? "block" : "hidden lg:block"
          }`}
        >
          <CampaignDraftLaunchCard
            draft={currentDraft}
            selectedProduct={selectedProduct}
            onDraftPublished={() => {
              setCurrentDraft(null);
            }}
          />
        </section>
      </main>

      {/* Slide-over On-Demand Drawers */}
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
    </div>
  );
};

export default MarketingAiStudioPage;
