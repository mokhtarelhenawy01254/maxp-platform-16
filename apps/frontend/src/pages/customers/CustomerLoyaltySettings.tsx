import React, { lazy, Suspense, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DollarSign, Coins, BadgePercent, Star, Settings2 } from "lucide-react";

const CashbackSettings = lazy(() => import("./CashbackSettings"));
const PointsSettings = lazy(() => import("./PointsSettings"));
const AutoDiscountSettings = lazy(() => import("./AutoDiscountSettings"));
const LoyaltyTiers = lazy(() => import("./LoyaltyTiers"));

type TabKey = "cashback" | "points" | "discount" | "tiers";

const VALID_TABS: TabKey[] = ["cashback", "points", "discount", "tiers"];

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "cashback", label: "الكاش باك", icon: DollarSign },
  { key: "points", label: "النقاط", icon: Coins },
  { key: "discount", label: "الخصم بعد البيع", icon: BadgePercent },
  { key: "tiers", label: "المستويات", icon: Star },
];

/**
 * صفحة "إعدادات" الموحدة لقسم العملاء:
 * كل إعدادات نظام الولاء في مكان واحد (الكاش باك / النقاط / الخصم بعد البيع / المستويات).
 */
const CustomerLoyaltySettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") as TabKey | null;
  const initialTab = urlTab && VALID_TABS.includes(urlTab) ? urlTab : "cashback";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إعدادات</h1>
            <p className="text-gray-600 dark:text-gray-400">إدارة أنظمة الولاء: النقاط، المستويات، الكاش باك، والخصم بعد البيع</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow dark:shadow-md overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
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
