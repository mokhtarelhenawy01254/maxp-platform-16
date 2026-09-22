import React from "react";
import {
  Building2,
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Switch } from "../../../../components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import { cn } from "../../../../lib/utils";
import {
  getSpecialtyIcon,
  type BusinessSpecialty,
  type MarketplaceAppOption,
} from "../types";

interface SpecialtyCardViewProps {
  specialties: BusinessSpecialty[];
  appOptionsBySlug: Map<string, MarketplaceAppOption>;
  onEdit: (specialty: BusinessSpecialty) => void;
  onDelete: (specialty: BusinessSpecialty) => void;
  onViewDetails: (specialty: BusinessSpecialty) => void;
  onToggleActive: (specialty: BusinessSpecialty, active: boolean) => void;
  onCreate: () => void;
}

export const SpecialtyCardView: React.FC<SpecialtyCardViewProps> = ({
  specialties,
  appOptionsBySlug,
  onEdit,
  onDelete,
  onViewDetails,
  onToggleActive,
  onCreate,
}) => {
  if (specialties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Search className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          لا توجد نشاطات تجارية مطابقة
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          جرب تغيير معايير البحث أو الفلتر، أو أنشئ نشاطاً تجارياً جديداً.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onCreate}
          className="mt-4 rounded-lg text-xs"
        >
          <Plus className="h-3.5 w-3.5 ml-1" />
          إنشاء نشاط جديد
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {specialties.map((specialty) => {
        const IconComponent = getSpecialtyIcon(specialty.icon);
        const appsCount = specialty.appSlugs.length;
        const visibleApps = specialty.appSlugs.slice(0, 3);
        const remainingApps = appsCount - visibleApps.length;

        return (
          <div
            key={specialty.id}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs transition-all duration-200",
              "hover:border-border hover:shadow-sm",
              !specialty.isActive && "opacity-75 bg-muted/20",
            )}
          >
            {/* Clickable Card Body */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onViewDetails(specialty)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onViewDetails(specialty);
                }
              }}
              className="cursor-pointer p-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-t-xl"
            >
              {/* Header: Icon, Names, and Quick Switch */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                      specialty.isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border/60",
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-foreground">
                      {specialty.nameAr}
                    </h4>
                    <p
                      className="truncate text-[0.7rem] text-muted-foreground font-mono"
                      dir="ltr"
                    >
                      {specialty.slug}
                    </p>
                  </div>
                </div>

                {/* Quick Active Switch */}
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <Switch
                            size="sm"
                            checked={specialty.isActive}
                            onCheckedChange={(checked) =>
                              onToggleActive(specialty, checked)
                            }
                            aria-label={`تفعيل نشاط ${specialty.nameAr}`}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {specialty.isActive ? "النشاط مفعّل (انقر للتعطيل)" : "النشاط موقوف (انقر للتفعيل)"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Status & Auto-install Badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1">
                {specialty.autoInstallOnSignup && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/5 text-primary text-[0.65rem] px-1.5 py-0 h-4 font-medium"
                  >
                    <Zap className="h-2.5 w-2.5 ml-0.5" />
                    تثبيت تلقائي
                  </Badge>
                )}
                {specialty.companyCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-border/60 bg-muted/40 text-muted-foreground text-[0.65rem] px-1.5 py-0 h-4 font-medium font-mono tabular-nums"
                  >
                    <Building2 className="h-2.5 w-2.5 ml-0.5" />
                    {specialty.companyCount.toLocaleString("ar-EG")} شركة
                  </Badge>
                ) : (
                  <span className="text-[0.65rem] text-muted-foreground/70">
                    بدون شركات مسجلة
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                {specialty.descriptionAr || specialty.descriptionEn || "لا يوجد وصف مدخل لهذا النشاط."}
              </p>

              {/* Telemetry Row */}
              <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg border border-border/40 bg-muted/20 p-1.5 text-center">
                <div>
                  <span className="block text-[0.65rem] text-muted-foreground">
                    التطبيقات
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                    {appsCount}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.65rem] text-muted-foreground">
                    الشركات
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                    {specialty.companyCount.toLocaleString("ar-EG")}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.65rem] text-muted-foreground">
                    الترتيب
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                    {specialty.sortOrder}
                  </span>
                </div>
              </div>

              {/* Linked Apps Preview */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1">
                {visibleApps.map((slug) => {
                  const app = appOptionsBySlug.get(slug);
                  return (
                    <span
                      key={slug}
                      className="inline-flex max-w-[130px] items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
                    >
                      <Package className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{app?.name || slug}</span>
                    </span>
                  );
                })}
                {remainingApps > 0 && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium font-mono tabular-nums text-muted-foreground">
                    +{remainingApps}
                  </span>
                )}
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="flex items-center justify-between border-t border-border/40 px-3 py-2 bg-muted/10 rounded-b-xl">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(specialty)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5 ml-1" />
                التفاصيل
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                  aria-label={`تعديل النشاط ${specialty.nameAr}`}
                  title="تعديل النشاط"
                  onClick={() => onEdit(specialty)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive"
                  aria-label={`حذف النشاط ${specialty.nameAr}`}
                  title="حذف النشاط"
                  onClick={() => onDelete(specialty)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
