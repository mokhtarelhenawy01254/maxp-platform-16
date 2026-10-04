import React from "react";
import {
  Cog6ToothIcon,
  CpuChipIcon,
  FolderIcon,
  QueueListIcon,
  TagIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import type { TaskPageTab } from "../types";

type TaskWorkspaceTabsProps = {
  activeTab: TaskPageTab;
  onTabChange: (tab: TaskPageTab) => void;
  canManageIntegrations: boolean;
  taskCount: number;
  projectCount: number;
  categoryCount: number;
  complianceCount?: number;
  backlogCount?: number;
};

type TabDefinition = {
  key: TaskPageTab;
  label: string;
  count?: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const buildTabs = (
  canManageIntegrations: boolean,
  taskCount: number,
  projectCount: number,
  categoryCount: number,
  backlogCount?: number,
): TabDefinition[] => {
  const baseTabs: TabDefinition[] = [
    {
      key: "tasks",
      label: "المهام",
      count: taskCount,
      icon: QueueListIcon,
    },
    {
      key: "compliance",
      label: "تقارير الالتزام",
      icon: ShieldCheckIcon,
    },
    {
      key: "backlog",
      label: "الباك لوج والتحسين",
      count: backlogCount,
      icon: SparklesIcon,
    },
    {
      key: "projects",
      label: "المشاريع",
      count: projectCount,
      icon: FolderIcon,
    },
    {
      key: "categories",
      label: "أقسام المهام",
      count: categoryCount,
      icon: TagIcon,
    },
    {
      key: "settings",
      label: "إعدادات المهام",
      icon: Cog6ToothIcon,
    },
  ];

  if (canManageIntegrations) {
    baseTabs.push({
      key: "integrations",
      label: "تكاملات المهام",
      icon: CpuChipIcon,
    });
  }

  return baseTabs;
};

export const TaskWorkspaceTabs: React.FC<TaskWorkspaceTabsProps> = ({
  activeTab,
  onTabChange,
  canManageIntegrations,
  taskCount,
  projectCount,
  categoryCount,
  backlogCount,
}) => {
  const tabs = buildTabs(
    canManageIntegrations,
    taskCount,
    projectCount,
    categoryCount,
    backlogCount,
  );

  return (
    <section className="rounded-[16px] border border-border/60 bg-card/72 p-1.5 shadow-[0_12px_34px_-30px_rgba(15,27,45,0.22)]">
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTabChange(tab.key)}
              className={`group flex min-w-[8.25rem] flex-1 items-center justify-between gap-2 rounded-[12px] border px-2.5 py-2 text-right transition-all md:min-w-[9rem] ${
                isActive
                  ? "border-primary/25 bg-primary/8 shadow-[0_12px_24px_-22px_rgba(47,107,255,0.45)]"
                  : "border-border/60 bg-background/72 hover:border-primary/20 hover:bg-background"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex size-7 items-center justify-center rounded-[10px] ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-xs font-semibold text-foreground md:text-sm">
                  {tab.label}
                </span>
              </div>

              {typeof tab.count === "number" ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "border border-border/60 bg-card text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
