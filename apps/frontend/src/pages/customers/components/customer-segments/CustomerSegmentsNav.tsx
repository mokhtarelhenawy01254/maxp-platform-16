import React from "react";
import { TrendingUp, Shield, Star } from "lucide-react";
import { FolderIcon, TagIcon } from "@heroicons/react/24/outline";
import { CustomerSegmentsTab } from "./useCustomerSegmentsController";

export const SEGMENT_TABS = [
  { key: "overview" as const, label: "الرئيسية", icon: TrendingUp },
  { key: "quality" as const, label: "الجودة", icon: Shield },
  { key: "loyalty" as const, label: "الولاء", icon: Star },
  { key: "categories" as const, label: "تصنيفات الليدات", icon: FolderIcon },
  { key: "tags" as const, label: "الوسوم", icon: TagIcon },
];

interface CustomerSegmentsNavProps {
  activeTab: CustomerSegmentsTab;
  onTabChange: (tab: CustomerSegmentsTab) => void;
}

export const CustomerSegmentsNav: React.FC<CustomerSegmentsNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 overflow-x-auto shadow-2xs">
      {SEGMENT_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === tab.key
              ? "bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
};
