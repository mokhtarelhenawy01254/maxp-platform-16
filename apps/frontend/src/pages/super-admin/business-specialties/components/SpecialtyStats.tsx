import React from "react";
import { Briefcase, CheckCircle2, Store, Zap } from "lucide-react";
import { cn } from "../../../../lib/utils";
import type { BusinessSpecialty } from "../types";

interface SpecialtyStatsProps {
  specialties: BusinessSpecialty[];
}

export const SpecialtyStats: React.FC<SpecialtyStatsProps> = ({ specialties }) => {
  const activeCount = specialties.filter((s) => s.isActive).length;
  const autoInstallCount = specialties.filter((s) => s.autoInstallOnSignup).length;
  const totalCompanies = specialties.reduce((sum, s) => sum + (s.companyCount || 0), 0);

  const stats = [
    {
      title: "إجمالي النشاطات",
      value: specialties.length,
      icon: Briefcase,
      badge: "دليل النظام",
      accent: "text-foreground",
      iconBg: "bg-muted text-foreground",
    },
    {
      title: "النشاطات النشطة",
      value: activeCount,
      icon: CheckCircle2,
      badge: `${specialties.length ? Math.round((activeCount / specialties.length) * 100) : 0}% مفعّلة`,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "تثبيت تلقائي",
      value: autoInstallCount,
      icon: Zap,
      badge: "عند التسجيل",
      accent: "text-primary",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      title: "الشركات المرتبطة",
      value: totalCompanies,
      icon: Store,
      badge: "حسابات مستخدمين",
      accent: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 transition-all duration-200",
              "hover:border-border hover:shadow-xs",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                style={{}}
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", stat.iconBg)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <span className={cn("text-2xl font-bold tracking-tight font-mono tabular-nums", stat.accent)}>
                {stat.value.toLocaleString("ar-EG")}
              </span>
              <span className="text-[0.68rem] font-medium text-muted-foreground/80">
                {stat.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
