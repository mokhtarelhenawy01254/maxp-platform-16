import React from "react";
import { Star, Copy, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Switch } from "../../../../components/ui/switch";
import { CardContent } from "../../../../components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import type { MarketplaceManagementItem } from "../types/marketplaceAdminTypes";
import {
  categoryLabels,
  getCategoryColor,
  getAppGradient,
  getAppIcon,
} from "../utils/marketplaceCategoryUtils";

export interface MarketplaceAppCardProps {
  app: MarketplaceManagementItem;
  compact?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCopySlug: (slug?: string) => void;
  onEdit: (app: MarketplaceManagementItem) => void;
  onDelete: (id: string) => void;
  onQuickToggle: (
    app: MarketplaceManagementItem,
    field: "isActive" | "isPublic" | "isFeatured",
    value: boolean,
  ) => void;
  onNavigateDetails: (id: string) => void;
}

export const MarketplaceAppCard: React.FC<MarketplaceAppCardProps> = ({
  app,
  compact = false,
  isExpanded = false,
  onToggleExpand,
  onCopySlug,
  onEdit,
  onDelete,
  onQuickToggle,
  onNavigateDetails,
}) => {
  const price = app.monthlyPrice || 0;
  const installs = app._count?.installations || app.installCount || 0;
  const monthlyRevenue = price > 0 ? installs * price : 0;
  const monthlyPrice = app.monthlyPrice || 0;
  const yearlyPrice = app.yearlyPrice || 0;
  const yearlySavings =
    monthlyPrice > 0 && yearlyPrice > 0
      ? Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100))
      : 0;

  if (compact) {
    return (
      <div className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm ${getAppGradient(
                  app.category,
                )}`}
              >
                {getAppIcon(app)}
              </div>
              <div className="min-w-0">
                <h4
                  onClick={() => app.id && onNavigateDetails(app.id)}
                  className="font-bold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                >
                  {app.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {app.category && (
                    <span
                      className="inline-block px-1.5 py-0.2 rounded-full text-[0.62rem] font-semibold text-white"
                      style={{ backgroundColor: getCategoryColor(app.category) }}
                    >
                      {categoryLabels[app.category] || app.category}
                    </span>
                  )}
                  {app.slug && (
                    <button
                      type="button"
                      onClick={() => onCopySlug(app.slug)}
                      className="font-mono text-[0.62rem] text-muted-foreground hover:text-foreground truncate max-w-[90px]"
                      title={`نسخ المعرف: ${app.slug}`}
                    >
                      {app.slug}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {app.isFeatured && (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-2.5 py-1.5 text-xs mb-2.5">
            <span className="font-semibold text-primary tabular-nums font-mono">
              {monthlyPrice > 0 ? `${monthlyPrice.toLocaleString("ar-EG")} ج/ش` : "مجاني"}
            </span>
            <span className="text-muted-foreground tabular-nums font-mono">
              {installs} تثبيت
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
              {monthlyRevenue > 0 ? `${monthlyRevenue.toLocaleString("ar-EG")} ج` : "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch
              checked={!!app.isActive}
              onCheckedChange={(checked) => onQuickToggle(app, "isActive", checked)}
              className="scale-75 origin-right"
            />
            <span
              className={
                app.isActive ? "text-foreground font-medium" : "text-muted-foreground"
              }
            >
              {app.isActive ? "نشط" : "معطل"}
            </span>
          </label>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => app.id && onNavigateDetails(app.id)}
              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
            >
              إدارة
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="تعديل التطبيق"
              onClick={() => onEdit(app)}
              className="h-7 w-7 text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="حذف التطبيق"
              onClick={() => app.id && onDelete(app.id)}
              className="h-7 w-7 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Detailed Grid View
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      {/* Card Header */}
      <div className="relative overflow-hidden border-b border-border/60 p-4 pb-3">
        <div
          className="absolute -left-10 -top-12 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
          style={{ backgroundColor: getCategoryColor(app.category || "") }}
        />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-md ${getAppGradient(
                app.category,
              )}`}
            >
              {getAppIcon(app)}
            </div>
            <div className="min-w-0">
              <h3
                onClick={() => app.id && onNavigateDetails(app.id)}
                className="truncate text-base font-bold leading-tight cursor-pointer hover:text-primary transition-colors"
              >
                {app.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {app.slug && (
                  <button
                    type="button"
                    onClick={() => onCopySlug(app.slug)}
                    className="inline-flex items-center gap-1 font-mono text-[0.68rem] text-muted-foreground hover:text-foreground bg-muted/60 px-1.5 py-0.5 rounded"
                    title="نسخ المعرف"
                  >
                    <span>{app.slug}</span>
                    <Copy className="h-2.5 w-2.5 opacity-60" />
                  </button>
                )}
                {app.category && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold text-white"
                    style={{ backgroundColor: getCategoryColor(app.category) }}
                  >
                    {categoryLabels[app.category] || app.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {app.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[0.65rem] font-bold text-white shadow-sm">
                <Star className="h-3 w-3 fill-current" />
                مميز
              </span>
            )}
            {app.isPopular && (
              <span className="inline-flex items-center rounded-full bg-sky-500 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                شائع
              </span>
            )}
          </div>
        </div>
      </div>

      <CardContent className="flex flex-grow flex-col gap-3 p-4 pt-3">
        {/* Description */}
        <p className="line-clamp-2 text-sm text-muted-foreground min-h-[2.5rem]">
          {app.description || "لا يوجد وصف متوفر لهذا التطبيق"}
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/50 p-2 text-center">
            <p className="text-sm font-bold text-primary tabular-nums font-mono">
              {installs.toLocaleString("ar-EG")}
            </p>
            <span className="text-[0.65rem] text-muted-foreground">تثبيت</span>
          </div>
          <div className="rounded-xl bg-muted/50 p-2 text-center">
            <p className="text-sm font-bold text-amber-500 inline-flex items-center justify-center gap-0.5 tabular-nums font-mono">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              {app.rating?.toFixed(1) || "0.0"}
            </p>
            <span className="text-[0.65rem] text-muted-foreground tabular-nums font-mono">
              ({app.reviewCount || 0})
            </span>
          </div>
          <div className="rounded-xl bg-muted/50 p-2 text-center">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
              {monthlyRevenue.toLocaleString("ar-EG")}
            </p>
            <span className="text-[0.65rem] text-muted-foreground">ج.م/شهر</span>
          </div>
        </div>

        {/* Price Pill */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-primary tabular-nums font-mono">
              {monthlyPrice ? `${monthlyPrice.toLocaleString("ar-EG")} ج.م` : "مجاني"}
            </span>
            {monthlyPrice ? <span className="text-xs text-muted-foreground">/ شهر</span> : null}
          </div>
          {yearlySavings > 0 && (
            <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700 dark:text-green-400 tabular-nums font-mono">
              {`${yearlySavings}% توفير سنوي`}
            </span>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="rounded-xl bg-muted/30 p-2.5 space-y-1 text-xs text-muted-foreground border border-border/40">
            <div className="flex justify-between">
              <span>فترة التجربة:</span>
              <span className="font-semibold text-foreground tabular-nums font-mono">
                {app.trialDays || 14} يوم
              </span>
            </div>
            <div className="flex justify-between">
              <span>الإيراد السنوي المتوقع:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                {((app.monthlyPrice || 0) * installs * 12).toLocaleString("ar-EG")} ج.م
              </span>
            </div>
            {app.mainRoute && (
              <div className="flex justify-between items-center">
                <span>المسار:</span>
                <span className="font-mono text-[0.7rem] text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {app.mainRoute}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Switches */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={!!app.isActive}
                onCheckedChange={(checked) =>
                  onQuickToggle(app, "isActive", checked === true)
                }
              />
              <span>نشط</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={!!app.isPublic}
                onCheckedChange={(checked) =>
                  onQuickToggle(app, "isPublic", checked === true)
                }
              />
              <span>عام</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={!!app.isFeatured}
                onCheckedChange={(checked) =>
                  onQuickToggle(app, "isFeatured", checked === true)
                }
              />
              <span>مميز</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-1">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => app.id && onNavigateDetails(app.id)}
              variant="ghost"
              className="text-primary hover:bg-primary/10 hover:text-primary font-semibold"
            >
              إدارة التطبيق
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
            </Button>
            {onToggleExpand && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleExpand}
                className="text-muted-foreground hover:bg-muted text-xs"
              >
                {isExpanded ? "أقل" : "المزيد"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="تعديل التطبيق"
                    onClick={() => onEdit(app)}
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>تعديل التطبيق</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="حذف التطبيق"
                    onClick={() => app.id && onDelete(app.id)}
                    className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>حذف التطبيق</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default MarketplaceAppCard;
