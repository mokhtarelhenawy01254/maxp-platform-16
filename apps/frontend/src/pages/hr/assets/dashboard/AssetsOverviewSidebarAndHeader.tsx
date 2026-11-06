import React from "react";
import {
  ComputerDesktopIcon,
  Squares2X2Icon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AssetDashboardSectionId } from "./types";
import {
  ASSET_DASHBOARD_SECTIONS,
  getAssetSectionColorClasses,
  getAssetSectionTitle,
} from "./helpers";

interface AssetsOverviewSidebarAndHeaderProps {
  activeSection: AssetDashboardSectionId;
  onSelectSection: (sectionId: AssetDashboardSectionId) => void;
}

export const AssetsOverviewSidebar: React.FC<
  AssetsOverviewSidebarAndHeaderProps
> = ({ activeSection, onSelectSection }) => {
  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-l border-border/70 bg-muted/20 shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl">
            <ComputerDesktopIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              إدارة الأصول والعهدة
            </h1>
            <p className="text-[11px] text-muted-foreground">
              حماية وتتبع أصول وعهد الشركة
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-2 space-y-1">
        {ASSET_DASHBOARD_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <SectionIcon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="flex-1 text-right">{section.title}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export const AssetsOverviewTopHeader: React.FC<
  AssetsOverviewSidebarAndHeaderProps
> = ({ activeSection, onSelectSection }) => {
  return (
    <div className="border-b border-border/70 bg-card/60 backdrop-blur-sm px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="h-4 w-1 bg-primary rounded-full" />
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          {getAssetSectionTitle(activeSection)}
        </h2>
      </div>

      {/* Quick Navigation Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 rounded-lg hover:bg-muted/40 transition-colors text-xs font-medium text-foreground">
          <Squares2X2Icon className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">الوصول السريع</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 p-1.5 rounded-xl border border-border/70 bg-popover"
        >
          <div className="px-2 py-1.5 border-b border-border/50 mb-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">
              التنقل عبر الأقسام
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {ASSET_DASHBOARD_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const isCurrentSection = activeSection === section.id;
              return (
                <DropdownMenuItem
                  key={section.id}
                  onSelect={() => onSelectSection(section.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    isCurrentSection
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <SectionIcon
                    className={`h-4 w-4 shrink-0 ${
                      isCurrentSection ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="flex-1 text-right">
                    {section.title}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
