import React from "react";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClockIcon,
  StarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CustomerDetailTabKey } from "./types";

interface CustomerDetailsTabsNavProps {
  activeTab: CustomerDetailTabKey;
  onTabChange: (key: CustomerDetailTabKey) => void;
}

export const CustomerDetailsTabsNav: React.FC<CustomerDetailsTabsNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  const tabs: Array<{
    key: CustomerDetailTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "info", label: t("customers.tabs.info"), icon: UserIcon },
    { key: "orders", label: t("orders.title"), icon: ShoppingBagIcon },
    {
      key: "conversations",
      label: t("sidebar.conversations"),
      icon: ChatBubbleLeftRightIcon,
    },
    { key: "notes", label: t("customers.tabs.notes"), icon: DocumentTextIcon },
    {
      key: "activity",
      label: t("customers.tabs.activity", "النشاط"),
      icon: ClockIcon,
    },
    {
      key: "loyalty",
      label: t("customers.tabs.loyalty", "الولاء والنقاط"),
      icon: StarIcon,
    },
    {
      key: "journey",
      label: t("customers.tabs.journey", "رحلة العميل"),
      icon: SparklesIcon,
    },
  ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
      <nav className="flex -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 active:scale-[0.98] ${
                isActive
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
