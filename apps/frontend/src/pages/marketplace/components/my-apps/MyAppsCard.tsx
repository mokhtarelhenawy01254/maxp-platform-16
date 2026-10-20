import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package, MoreVertical, Zap, Settings2, Activity,
  ExternalLink, Sparkles, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAppSystemHub } from "@/utils/marketplaceSystems";
import {
  categoryIcons,
  appIcons,
  appIconsBySlug,
  shouldUseTextIcon,
} from "@/utils/marketplace";
import type { InstalledApp } from "@/types/marketplace";
import {
  STATUS_CONFIG,
  getDaysRemaining,
  getAppDestination,
} from "../../types/myAppsTypes";

interface MyAppsCardProps {
  installed: InstalledApp;
  isSelected: boolean;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onOpenDrawer: (app: InstalledApp) => void;
  onConfirmUninstall: (app: InstalledApp) => void;
  isUninstalling: boolean;
}

export const MyAppsCard: React.FC<MyAppsCardProps> = ({
  installed,
  isSelected,
  onToggleSelect,
  onOpenDrawer,
  onConfirmUninstall,
  isUninstalling,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = statusConf.icon;
  const isTrial = installed.status === "TRIAL";
  const trialDays = getDaysRemaining(installed.trialEndsAt);
  const isExpired = installed.status === "EXPIRED" || installed.status === "CANCELLED" || (installed.status === "TRIAL" && trialDays !== null && trialDays < 0);
  const destination = isExpired ? `/marketplace/${installed.app.slug}` : getAppDestination(installed.app);

  const BrandIcon = installed.app.slug ? appIconsBySlug[installed.app.slug] : undefined;
  const appIconKey = installed.app.icon?.trim().toLowerCase();
  const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
  const Icon = AppIcon || categoryIcons[installed.app.category] || Package;
  const textIcon = shouldUseTextIcon(installed.app.icon) ? installed.app.icon?.trim() : null;
  const systemHub = getAppSystemHub(installed.app as any);
  const SystemIcon = systemHub.icon;

  return (
    <div
      onClick={() => navigate(destination)}
      className={cn(
        "group relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-150 select-none cursor-pointer",
        "bg-card hover:bg-accent/[0.04] hover:shadow-sm",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
          : installed.status === "ACTIVE"
          ? "border-emerald-500/25 hover:border-emerald-500/50 bg-emerald-500/[0.015]"
          : installed.status === "TRIAL"
          ? "border-amber-500/25 hover:border-amber-500/50 bg-amber-500/[0.015]"
          : "border-border/40 hover:border-primary/50"
      )}
    >
      {/* Right: Checkbox + Icon + Name + System Hub */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div
          onClick={(e) => onToggleSelect(installed.id, e)}
          className="cursor-pointer shrink-0 p-1 rounded-md hover:bg-muted/60 transition-colors"
          title={isSelected ? "إلغاء تحديد الأداة" : "تحديد الأداة"}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(installed.id)}
            className="size-4 rounded-md cursor-pointer"
          />
        </div>

        <div className="size-11 sm:size-12 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-150 group-hover:scale-105">
          {installed.app.logo && installed.app.logo.startsWith("http") ? (
            <img src={installed.app.logo} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
          ) : installed.app.icon && installed.app.icon.startsWith("http") ? (
            <img src={installed.app.icon} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
          ) : BrandIcon ? (
            <BrandIcon className="size-5 sm:size-6 text-foreground" />
          ) : textIcon ? (
            <span className="text-base sm:text-lg font-bold">{textIcon}</span>
          ) : (
            <Icon size={22} className="text-foreground/80" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 dir="auto" className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={installed.app.name}>
              {installed.app.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground truncate">
              <SystemIcon size={11} className="shrink-0 text-primary/70" />
              <span className="truncate">{systemHub.nameAr}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Left: Status + Pricing/Usage + More Menu */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end justify-center text-left rtl:text-right gap-1">
          <Badge
            variant="outline"
            className={cn("gap-1 text-[10px] font-bold px-2 py-0.5 shrink-0", statusConf.badgeClass)}
          >
            <StatusIcon size={10} />
            <span>
              {isTrial && trialDays !== null
                ? (trialDays === 0 ? "تنتهي اليوم" : trialDays === 1 ? "متبقي يوم" : `متبقي ${trialDays} أيام`)
                : t(`marketplace.${statusConf.labelKey}`, statusConf.fallbackLabel)}
            </span>
          </Badge>

          <span className="text-xs font-bold text-foreground/80 tabular-nums font-mono">
            {installed.monthlyUsage && Number(installed.monthlyUsage.totalCost) > 0
              ? `${Number(installed.monthlyUsage.totalCost).toFixed(2)} ج.م`
              : installed.activePricingModel === "FREE"
              ? "مجاني"
              : installed.activePricingModel === "PAY_PER_USE"
              ? "حسب الاستخدام"
              : "شهري"}
          </span>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="size-8 rounded-xl text-muted-foreground hover:text-foreground inline-flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer border border-transparent hover:border-border/50"
            >
              <MoreVertical size={15} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl text-right" dir="rtl">
              <DropdownMenuLabel className="text-xs font-bold text-muted-foreground truncate">
                {installed.app.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-xs font-semibold"
                onClick={() => navigate(destination)}
              >
                {isExpired ? <Sparkles size={14} className="text-amber-500" /> : <Zap size={14} className="text-primary" />}
                <span>{isExpired ? "تجديد الاشتراك" : "فتح التطبيق"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-xs font-semibold"
                onClick={() => navigate(`/my-apps/${installed.app.slug}/settings`)}
              >
                <Settings2 size={14} />
                <span>إعدادات الأداة</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-xs font-semibold"
                onClick={() => onOpenDrawer(installed)}
              >
                <Activity size={14} />
                <span>تفاصيل وسجل الاستهلاك</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-xs font-semibold"
                onClick={() => navigate(`/marketplace/apps/${installed.app.slug}`)}
              >
                <ExternalLink size={14} />
                <span>عرض في المتجر</span>
              </DropdownMenuItem>
              {installed.status === "TRIAL" && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-xs font-semibold text-primary"
                  onClick={() => navigate(`/my-apps/${installed.app.slug}/upgrade`)}
                >
                  <Sparkles size={14} />
                  <span>ترقية الاشتراك</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-xs font-semibold text-destructive focus:text-destructive"
                onClick={() => onConfirmUninstall(installed)}
                disabled={isUninstalling}
              >
                <X size={14} />
                <span>إلغاء التفعيل</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
