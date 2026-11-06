import React from "react";
import { Gift, Users, Crown, TrendingUp, DollarSign } from "lucide-react";
import type { LoyaltyTabKey } from "./types";

interface CustomerLoyaltyTabsBarProps {
  activeTab: LoyaltyTabKey;
  onTabChange: (tab: LoyaltyTabKey) => void;
}

export const CustomerLoyaltyTabsBar: React.FC<CustomerLoyaltyTabsBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: "programs" as const, label: "البرامج", icon: Gift },
    { id: "customers" as const, label: "العملاء", icon: Users },
    { id: "tiers" as const, label: "المستويات", icon: Crown },
    { id: "analytics" as const, label: "التحليلات", icon: TrendingUp },
    { id: "cashback" as const, label: "الكاش باك", icon: DollarSign },
  ];

  return (
    <div className="flex gap-1.5 p-1.5 border-b border-border/70 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
