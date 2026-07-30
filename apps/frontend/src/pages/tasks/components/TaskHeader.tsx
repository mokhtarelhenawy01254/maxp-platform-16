import { Calendar as CalendarIcon, Activity as ChartBarIcon, Clock as ClockIcon, Circle as CpuChipIcon, Folder as FolderIcon, Plus as PlusIcon, Grid as Squares2X2Icon } from 'lucide-react';
import React from "react";
import { Link } from "react-router-dom";
;

import { BusinessPageHero } from "../../../components/business/BusinessSurface";
import { Button, buttonVariants } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

export interface TaskHeaderProps {
  setShowCreateTaskModal: (show: boolean) => void;
  setShowCreateProjectModal: (show: boolean) => void;
  setActiveTab: (
    tab: "tasks" | "projects" | "categories" | "integrations",
  ) => void;
  canManageIntegrations?: boolean;
}

const quickLinks = [
  {
    href: "/tasks/dashboard",
    label: "لوحة التحكم",
    icon: ChartBarIcon,
  },
  {
    href: "/tasks/kanban",
    label: "كانبان",
    icon: Squares2X2Icon,
  },
  {
    href: "/tasks/calendar",
    label: "التقويم",
    icon: CalendarIcon,
  },
  {
    href: "/tasks/time-reports",
    label: "تقارير الوقت",
    icon: ClockIcon,
  },
  {
    href: "/tasks/templates",
    label: "القوالب",
    icon: FolderIcon,
  },
];

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  setShowCreateTaskModal,
  setShowCreateProjectModal,
  setActiveTab,
  canManageIntegrations = false,
}) => {
  return (
    <div className="space-y-3">
      <BusinessPageHero
        eyebrow="Business OS / Tasks"
        title="إدارة المهام والمشاريع"
        description="ادخل مباشرة إلى سطح العمل ثم ابدأ من قائمة المهام المفتوحة دون خطوات زائدة."
        className="px-5 py-5 md:px-6 md:py-5"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageIntegrations ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-2xl border-white/12 bg-white/10 px-4 text-white hover:bg-white/14 hover:text-white"
                onClick={() => setActiveTab("integrations")}
              >
                <CpuChipIcon className="size-4" />
                التكاملات
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-2xl border-white/12 bg-white/10 px-4 text-white hover:bg-white/14 hover:text-white"
              onClick={() => setShowCreateProjectModal(true)}
            >
              <PlusIcon className="size-4" />
              مشروع جديد
            </Button>
            <Button
              type="button"
              className="h-10 rounded-2xl px-4 shadow-[0_24px_44px_-26px_rgba(47,107,255,0.88)]"
              onClick={() => setShowCreateTaskModal(true)}
            >
              <PlusIcon className="size-4" />
              مهمة جديدة
            </Button>
          </div>
        }
      />

      <div className="business-page-panel hidden overflow-hidden border-0 shadow-none 2xl:block">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">
            اختصارات إضافية:
          </span>
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-9 shrink-0 rounded-full border-border/70 bg-background/70 px-3.5 text-foreground hover:bg-muted/80",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
