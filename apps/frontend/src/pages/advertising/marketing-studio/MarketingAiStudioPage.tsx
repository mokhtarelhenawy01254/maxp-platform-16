import React, { useState } from "react";
import { Sparkles, ShoppingBag, MessageSquare, Rocket } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { ProductOpportunityRadar } from "./ProductOpportunityRadar";
import { MarketingSquadChatFeed } from "./MarketingSquadChatFeed";
import { CampaignDraftLaunchCard } from "./CampaignDraftLaunchCard";
import type { MarketingProduct, MarketingCampaignDraft } from "./types";

const MarketingAiStudioPage: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || null;

  const [selectedProduct, setSelectedProduct] = useState<MarketingProduct | null>(null);
  const [currentDraft, setCurrentDraft] = useState<MarketingCampaignDraft | null>(null);

  // Mobile/Tablet Tab state
  const [mobileTab, setMobileTab] = useState<"RADAR" | "CHAT" | "DRAFT">("CHAT");

  const handleProductSelect = (product: MarketingProduct) => {
    setSelectedProduct(product);
    // If mobile, switch view to chat when product is selected
    if (window.innerWidth < 1024) {
      setMobileTab("CHAT");
    }
  };

  const handleDraftGenerated = (toolData: any) => {
    if (toolData?.args) {
      const args = toolData.args;
      setCurrentDraft({
        id: `draft_${Date.now()}`,
        productName: selectedProduct?.name || args.product_name || "منتج المتجر",
        angleTitle: args.angle || "عرض القيمة المباشر للعميل",
        headline: args.headline || "العرض الأقوى لفترة محدودة!",
        primaryText: args.primary_text || args.copy || "احصل على المنتج مع شحن مجاني ودفع عند الاستلام.",
        callToAction: args.call_to_action || "SHOP_NOW",
        budgetAmount: Number(args.daily_budget) || 350,
        currency: "EGP",
        targetAudience: args.target_audience || "مصر • المهتمون بالشراء أونلاين",
        format: args.format || "Reels / Video",
        status: "DRAFT",
      });
    }
  };

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col p-3 sm:p-4 gap-3 bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header & Mobile Tabs Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              مركز التسويق الذكي للمتجر
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Marketing AI Cockpit
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              تخطيط الحملات وصياغة الزوايا والإطلاق بضغطة زر بناءً على اقتصاديات المتجر والمخزون
            </p>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setMobileTab("RADAR")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "RADAR"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            المنتجات
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("CHAT")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "CHAT"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            المحادثة
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("DRAFT")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === "DRAFT"
                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            المسودة
          </button>
        </div>
      </header>

      {/* Main 3-Column Studio Canvas */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Column 1: Product Opportunity Radar */}
        <section
          aria-label="رادار منتجات المتجر"
          className={`h-full lg:col-span-3 min-h-0 ${
            mobileTab === "RADAR" ? "block" : "hidden lg:block"
          }`}
        >
          <ProductOpportunityRadar
            selectedProduct={selectedProduct}
            onSelectProduct={handleProductSelect}
          />
        </section>

        {/* Column 2: Marketing Squad Chat Feed */}
        <section
          aria-label="محادثة فريق التسويق"
          className={`h-full lg:col-span-6 min-h-0 ${
            mobileTab === "CHAT" ? "block" : "hidden lg:block"
          }`}
        >
          <MarketingSquadChatFeed
            selectedProduct={selectedProduct}
            companyId={companyId}
            onDraftGenerated={handleDraftGenerated}
          />
        </section>

        {/* Column 3: Campaign Draft & Action Card */}
        <section
          aria-label="مسودة الإطلاق"
          className={`h-full lg:col-span-3 min-h-0 ${
            mobileTab === "DRAFT" ? "block" : "hidden lg:block"
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
    </div>
  );
};

export default MarketingAiStudioPage;
