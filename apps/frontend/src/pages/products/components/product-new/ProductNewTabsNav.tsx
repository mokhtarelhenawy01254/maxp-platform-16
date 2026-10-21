import React from "react";
import type { FieldErrors } from "../../types";
import { TabItem } from "./types";

interface ProductNewTabsNavProps {
  tabs: TabItem[];
  activeTab: string;
  changeTab: (tabId: string) => void;
  isEditMode: boolean;
  productId?: string;
  showVariants: boolean;
  fieldErrors: FieldErrors;
}

export const ProductNewTabsNav: React.FC<ProductNewTabsNavProps> = ({
  tabs,
  activeTab,
  changeTab,
  isEditMode,
  productId,
  showVariants,
  fieldErrors,
}) => {
  return (
    <>
      {/* Mobile horizontal tab bar (< lg:) */}
      <div className="lg:hidden -mx-1 px-1 sm:mx-0 sm:px-0 mb-4">
        <nav
          className="flex gap-1.5 overflow-x-auto scrollbar-none py-1.5 px-2 bg-card/90 border border-border/70 rounded-xl shadow-2xs"
          aria-label="أقسام المنتج"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all min-h-[38px] ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Desktop vertical sidebar tabs (lg: and above) */}
      <div className="hidden lg:block lg:col-span-1">
        <nav className="space-y-1 sticky top-24">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const shouldPulse =
              tab.id === "variants" && showVariants && !isActive;

            const tabUrl = isEditMode
              ? `/products/${productId}/edit?tab=${tab.id}`
              : `/products/new?tab=${tab.id}`;

            return (
              <a
                key={tab.id}
                href={tabUrl}
                onClick={(e) => {
                  e.preventDefault();
                  changeTab(tab.id);
                }}
                className={`${
                  isActive
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                } group flex w-full items-center border-l-4 rtl:border-l-0 rtl:border-r-4 px-3 py-2.5 text-xs font-medium transition-colors ${
                  shouldPulse ? "animate-pulse bg-primary/5" : ""
                }`}
              >
                <Icon
                  className={`${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground/70 group-hover:text-foreground"
                  } shrink-0 mr-2.5 rtl:ml-2.5 rtl:mr-0 h-4 w-4 transition-colors`}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.name}</span>

                {tab.id === "basic" &&
                  (fieldErrors.name || fieldErrors.category) && (
                    <span className="ml-auto rtl:mr-auto w-2 h-2 bg-destructive rounded-full" />
                  )}
                {tab.id === "pricing" && fieldErrors.price && (
                  <span className="ml-auto rtl:mr-auto w-2 h-2 bg-destructive rounded-full" />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default ProductNewTabsNav;
