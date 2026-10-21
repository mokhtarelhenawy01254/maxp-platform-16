import React from "react";
import { ShoppingBagIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface EasyOrdersTabsNavProps {
  activeTab: "products" | "orders";
  setActiveTab: (tab: "products" | "orders") => void;
}

export const EasyOrdersTabsNav: React.FC<EasyOrdersTabsNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className="flex border-b border-border/70 mb-6">
      <button
        onClick={() => setActiveTab("products")}
        className={`px-5 py-2.5 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors ${
          activeTab === "products"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShoppingBagIcon className="h-4 w-4" />
        <span>استيراد المنتجات</span>
      </button>
      <button
        onClick={() => setActiveTab("orders")}
        className={`px-5 py-2.5 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors ${
          activeTab === "orders"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ArrowPathIcon className="h-4 w-4" />
        <span>مزامنة الطلبات والإعدادات</span>
      </button>
    </div>
  );
};
