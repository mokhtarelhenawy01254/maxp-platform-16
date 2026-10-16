import React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number | undefined;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  variant?: "default" | "pills" | "underline";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  variant = "default",
  className = "",
}) => {
  const getTabClasses = (tab: Tab) => {
    const isActive = activeTab === tab.id;
    const baseClasses =
      "flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium transition-all duration-150 select-none active:scale-[0.98]";

    if (tab.disabled) {
      return `${baseClasses} opacity-40 cursor-not-allowed text-muted-foreground`;
    }

    switch (variant) {
      case "pills":
        return cn(
          baseClasses,
          "rounded-lg",
          isActive
            ? "bg-primary text-primary-foreground shadow-2xs"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        );

      case "underline":
        return cn(
          baseClasses,
          "border-b-2 -mb-px",
          isActive
            ? "border-primary text-primary font-semibold"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/80",
        );

      default:
        return cn(
          baseClasses,
          "rounded-lg",
          isActive
            ? "bg-card text-foreground shadow-2xs font-semibold border border-border/60"
            : "text-muted-foreground hover:text-foreground hover:bg-background/60",
        );
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Tabs Navigation */}
      <div
        className={cn(
          "flex items-center gap-1 overflow-x-auto no-scrollbar",
          variant === "underline" && "border-b border-border/60",
          variant === "default" && "bg-muted/40 p-1 rounded-xl border border-border/60 max-w-fit",
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={getTabClasses(tab)}
            type="button"
          >
            {tab.icon && <span className="shrink-0 size-4 flex items-center justify-center">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== "" && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono tabular-nums leading-none",
                  activeTab === tab.id
                    ? variant === "pills"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className={cn(
          variant === "default"
            ? "rounded-xl border border-border/60 bg-card p-4 sm:p-5 text-foreground shadow-2xs"
            : "text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
};

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  activeTab,
  children,
  className = "",
}) => {
  if (activeTab !== id) return null;

  return <div className={cn("space-y-4", className)}>{children}</div>;
};

export default Tabs;
