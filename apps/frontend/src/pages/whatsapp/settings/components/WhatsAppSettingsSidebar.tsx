import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import type { TabDefinition, TabId } from "../types/whatsAppSettingsTypes";

interface WhatsAppSettingsSidebarProps {
  tabs: TabDefinition[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export const WhatsAppMobileNav: React.FC<WhatsAppSettingsSidebarProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="block xl:hidden">
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none touch-pan-x px-0.5">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-95",
                  selected
                    ? "bg-[color:var(--business-success)] text-white shadow-sm ring-2 ring-[color:var(--business-success)]/20"
                    : "border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
                )}
              >
                <Icon className="size-3.5 sm:size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const WhatsAppDesktopSidebar: React.FC<WhatsAppSettingsSidebarProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <WhatsAppSurfaceCard
      className="hidden xl:block"
      title={ts("whatsappSettings.sidebarTitle")}
      description={ts("whatsappSettings.description")}
    >
      <div className="space-y-2">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-start transition-all",
                selected
                  ? "bg-[color:color-mix(in_srgb,var(--business-success)_10%,var(--color-card))] text-[color:var(--business-success)] shadow-[0_12px_24px_rgba(35,159,90,0.10)]"
                  : "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-card)]",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl",
                  selected
                    ? "bg-[color:var(--business-success)] text-white"
                    : "bg-primary/10 text-[color:var(--color-primary)]",
                )}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{tab.label}</p>
                <p className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                  {tab.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </WhatsAppSurfaceCard>
  );
};
