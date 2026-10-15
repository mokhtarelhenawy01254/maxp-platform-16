import React from "react";
import {
  FolderPlus,
  Plus,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Clapperboard,
  TrendingUp,
  PackageCheck,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  PRESET_PROJECT_TEMPLATES,
  type PresetProjectTemplate,
} from "./taskPresetTemplates";

interface TaskWorkspaceEmptyStateProps {
  onOpenCreateTask: () => void;
  onOpenCreateProject: () => void;
  onApplyPresetTemplate: (template: PresetProjectTemplate) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  AcademicCapIcon: GraduationCap,
  VideoCameraIcon: Clapperboard,
  ChartBarIcon: TrendingUp,
  TruckIcon: PackageCheck,
};

export const TaskWorkspaceEmptyState: React.FC<TaskWorkspaceEmptyStateProps> = ({
  onOpenCreateTask,
  onOpenCreateProject,
  onApplyPresetTemplate,
  hasActiveFilters,
  onResetFilters,
}) => {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/60 px-4 py-12 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          <Sparkles className="size-6 text-primary/70" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            لا توجد مهام تطابق هذا الفلتر
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            جرب إعادة ضبط الفلاتر أو إزالة البحث لعرض كافة المهام والمشاريع.
          </p>
        </div>
        {onResetFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="rounded-xl mt-1"
          >
            مسح الفلاتر وإظهار الكل
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-card/65 p-5 md:p-7 shadow-sm">
      {/* Intro hero banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>مساحة تخطيط وإنتاجية واضحة</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">
            ابدأ بتنظيم عملك وفريقك بخطوات بسيطة
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            أنشئ مشروعك الأول لتجميع المهام، أو أضف مهمة سريعة، أو اختر قالباً جاهزاً من قوالب الأعمال المجرّبة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onOpenCreateTask}
            className="rounded-xl gap-1.5 h-9 text-xs font-semibold"
          >
            <Plus className="size-4" />
            <span>مهمة جديدة</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCreateProject}
            className="rounded-xl gap-1.5 h-9 text-xs font-semibold border-border/80 hover:bg-background"
          >
            <FolderPlus className="size-4 text-primary" />
            <span>مشروع جديد</span>
          </Button>
        </div>
      </div>

      {/* Preset templates grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            قوالب جاهزة للاستخدام المباشر
          </h3>
          <span className="text-[11px] text-muted-foreground">
            تنشئ المشروع مع مهامه العملية بنقرة واحدة
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESET_PROJECT_TEMPLATES.map((tmpl) => {
            const Icon = TEMPLATE_ICONS[tmpl.iconName] || Sparkles;

            return (
              <div
                key={tmpl.id}
                className="group flex flex-col justify-between rounded-xl border border-border/70 bg-background/80 p-3.5 transition-all hover:border-primary/40 hover:bg-background hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <Icon className="size-4" />
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 bg-primary/5 px-2 py-0 text-[10px] font-semibold text-primary"
                    >
                      {tmpl.badge}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {tmpl.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {tmpl.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {tmpl.tasks.length} مهام مجهزة
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onApplyPresetTemplate(tmpl)}
                    className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10 rounded-lg"
                  >
                    <span>استخدام القالب</span>
                    <ArrowRight className="size-3 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
