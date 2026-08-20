import React, { lazy, Suspense, useState } from "react";
import { DollarSign, Coins, BadgePercent, Star, Settings2 } from "lucide-react";

const CashbackSettings = lazy(() => import("./CashbackSettings"));
const PointsSettings = lazy(() => import("./PointsSettings"));
const AutoDiscountSettings = lazy(() => import("./AutoDiscountSettings"));
const LoyaltyTiers = lazy(() => import("./LoyaltyTiers"));

type TabKey = "cashback" | "points" | "discount" | "tiers";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "cashback", label: "╪º┘ä┘â╪º╪┤ ╪¿╪º┘â", icon: DollarSign },
  { key: "points", label: "╪º┘ä┘å┘é╪º╪╖", icon: Coins },
  { key: "discount", label: "╪º┘ä╪«╪╡┘à ╪¿╪╣╪» ╪º┘ä╪¿┘è╪╣", icon: BadgePercent },
  { key: "tiers", label: "╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬", icon: Star },
];

/**
 * ╪╡┘ü╪¡╪⌐ "╪Ñ╪╣╪»╪º╪»╪º╪¬" ╪º┘ä┘à┘ê╪¡╪»╪⌐ ┘ä┘é╪│┘à ╪º┘ä╪╣┘à┘ä╪º╪í:
 * ┘â┘ä ╪Ñ╪╣╪»╪º╪»╪º╪¬ ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í ┘ü┘è ┘à┘â╪º┘å ┘ê╪º╪¡╪» (╪º┘ä┘â╪º╪┤ ╪¿╪º┘â / ╪º┘ä┘å┘é╪º╪╖ / ╪º┘ä╪«╪╡┘à ╪¿╪╣╪» ╪º┘ä╪¿┘è╪╣ / ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬).
 */
const CustomerLoyaltySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("cashback");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">╪Ñ╪╣╪»╪º╪»╪º╪¬</h1>
            <p className="text-gray-600 dark:text-gray-400">╪Ñ╪»╪º╪▒╪⌐ ╪ú┘å╪╕┘à╪⌐ ╪º┘ä┘ê┘ä╪º╪í: ╪º┘ä┘å┘é╪º╪╖╪î ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬╪î ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â╪î ┘ê╪º┘ä╪«╪╡┘à ╪¿╪╣╪» ╪º┘ä╪¿┘è╪╣</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow dark:shadow-md overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        }
      >
        {activeTab === "cashback" && <CashbackSettings />}
        {activeTab === "points" && <PointsSettings />}
        {activeTab === "discount" && <AutoDiscountSettings />}
        {activeTab === "tiers" && <LoyaltyTiers />}
      </Suspense>
    </div>
  );
};

export default CustomerLoyaltySettings;
