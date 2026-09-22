import React from "react";
import {
  Building2,
  Eye,
  Package,
  Pencil,
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

interface SpecialtyTableViewProps {
  specialties: BusinessSpecialty[];
  appOptionsBySlug: Map<string, MarketplaceAppOption>;
  onEdit: (specialty: BusinessSpecialty) => void;
  onDelete: (specialty: BusinessSpecialty) => void;
  onViewDetails: (specialty: BusinessSpecialty) => void;
  onToggleActive: (specialty: BusinessSpecialty, active: boolean) => void;
}

export const SpecialtyTableView: React.FC<SpecialtyTableViewProps> = ({
  specialties,
  appOptionsBySlug,
  onEdit,
  onDelete,
  onViewDetails,
  onToggleActive,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
              <th className="py-3 px-3.5 font-semibold">النشاط التجاري</th>
              <th className="py-3 px-3 font-semibold text-center">الترتيب</th>
              <th className="py-3 px-3 font-semibold text-center">الشركات</th>
              <th className="py-3 px-3 font-semibold">التطبيقات التلقائية</th>
              <th className="py-3 px-3 font-semibold text-center">تثبيت تلقائي</th>
              <th className="py-3 px-3 font-semibold text-center">الحالة</th>
              <th className="py-3 px-3.5 font-semibold text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {specialties.map((specialty) => {
              const IconComponent = getSpecialtyIcon(specialty.icon);
              const appsCount = specialty.appSlugs.length;
              const previewApps = specialty.appSlugs.slice(0, 2);
              const remaining = appsCount - previewApps.length;

              return (
                <tr
                  key={specialty.id}
                  className={cn(
                    "transition-colors hover:bg-muted/30 group",
                    !specialty.isActive && "opacity-75 bg-muted/10",
                  )}
                >
                  {/* Specialty name & icon */}
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          specialty.isActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted text-muted-foreground border border-border/60",
                        )}
                      >
                        <IconComponent className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block font-bold text-foreground truncate max-w-[200px]">
                          {specialty.nameAr}
                        </span>
                        <span
                          className="block text-[0.68rem] text-muted-foreground font-mono truncate max-w-[200px]"
                          dir="ltr"
                        >
                          {specialty.slug}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Sort Order */}
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-foreground font-medium">
                    {specialty.sortOrder}
                  </td>

                  {/* Company count */}
                  <td className="py-2.5 px-3 text-center">
                    {specialty.companyCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums font-semibold text-foreground">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {specialty.companyCount.toLocaleString("ar-EG")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* Apps preview */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap items-center gap-1 max-w-xs">
                      {previewApps.map((slug) => {
                        const app = appOptionsBySlug.get(slug);
                        return (
                          <span
                            key={slug}
                            className="inline-flex max-w-[110px] items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
                          >
                            <Package className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{app?.name || slug}</span>
                          </span>
                        );
                      })}
                      {remaining > 0 && (
                        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-mono tabular-nums text-muted-foreground">
                          +{remaining}
                        </span>
                      )}
                      {appsCount === 0 && (
                        <span className="text-[0.65rem] text-muted-foreground/60">
                          بدون تطبيقات
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Auto install */}
                  <td className="py-2.5 px-3 text-center">
                    {specialty.autoInstallOnSignup ? (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/5 text-primary text-[0.65rem] font-medium"
                      >
                        <Zap className="h-2.5 w-2.5 ml-0.5" />
                        نعم
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/60 text-[0.7rem]">لا</span>
                    )}
                  </td>

                  {/* Quick Active Switch */}
                  <td className="py-2.5 px-3 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex items-center">
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
                          {specialty.isActive ? "النشاط مفعّل" : "النشاط موقوف"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>

                  {/* Action buttons */}
                  <td className="py-2.5 px-3.5 text-left">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="عرض التفاصيل"
                        onClick={() => onViewDetails(specialty)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`حذف النشاط ${specialty.nameAr}`}
                        title="حذف النشاط"
                        onClick={() => onDelete(specialty)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
