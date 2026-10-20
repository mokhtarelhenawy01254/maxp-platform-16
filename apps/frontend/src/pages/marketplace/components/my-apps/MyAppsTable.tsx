import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package, MoreVertical, Zap, Settings2, Activity,
  ExternalLink, Sparkles, X, ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface MyAppsTableProps {
  apps: InstalledApp[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onOpenDrawer: (app: InstalledApp) => void;
  onConfirmUninstall: (app: InstalledApp) => void;
  uninstallingId: string | null;
}

export const MyAppsTable: React.FC<MyAppsTableProps> = ({
  apps,
  selectedIds,
  onToggleSelect,
  onOpenDrawer,
  onConfirmUninstall,
  uninstallingId,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border/30 bg-card overflow-hidden divide-y divide-border/20">
      {apps.map((installed) => {
        const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
        const StatusIcon = statusConf.icon;
        const isTrial = installed.status === "TRIAL";
        const trialDays = getDaysRemaining(installed.trialEndsAt);
        const isExpired = installed.status === "EXPIRED" || installed.status === "CANCELLED" || (installed.status === "TRIAL" && trialDays !== null && trialDays < 0);
        const destination = isExpired ? `/marketplace/${installed.app.slug}` : getAppDestination(installed.app);
        const isSelected = selectedIds.has(installed.id);

        const BrandIcon = installed.app.slug ? appIconsBySlug[installed.app.slug] : undefined;
        const appIconKey = installed.app.icon?.trim().toLowerCase();
        const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
        const Icon = AppIcon || categoryIcons[installed.app.category] || Package;
        const textIcon = shouldUseTextIcon(installed.app.icon) ? installed.app.icon?.trim() : null;
        const systemHub = getAppSystemHub(installed.app as any);
        const SystemIcon = systemHub.icon;

        return (
          <div
            key={installed.id}
            onClick={() => navigate(destination)}
            className={cn(
              "p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors select-none cursor-pointer",
              isSelected ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                onClick={(e) => onToggleSelect(installed.id, e)}
                className="cursor-pointer shrink-0 p-1 rounded-md hover:bg-muted/50 transition-colors"
                title={isSelected ? "إلغاء تحديد الأداة" : "تحديد الأداة"}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(installed.id)}
                  className="size-4 rounded-md cursor-pointer"
                />
              </div>
              <div className="size-10 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
                {installed.app.logo && installed.app.logo.startsWith("http") ? (
                  <img src={installed.app.logo} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
                ) : installed.app.icon && installed.app.icon.startsWith("http") ? (
                  <img src={installed.app.icon} alt={installed.app.name} className="size-full object-cover" loading="lazy" />
                ) : BrandIcon ? (
                  <BrandIcon className="size-5 text-foreground" />
                ) : textIcon ? (
                  <span className="text-sm font-bold">{textIcon}</span>
                ) : (
                  <Icon size={18} className="text-foreground/80" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary">{installed.app.name}</h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    <SystemIcon size={10} className="text-primary/70" />
                    <span>{systemHub.nameAr}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                <Badge
                  variant="outline"
                  className={cn("gap-1 text-[10px] font-bold px-1.5 py-0.5", statusConf.badgeClass)}
                >
                  <StatusIcon size={9} />
                  <span>{t(`marketplace.${statusConf.labelKey}`, statusConf.fallbackLabel)}</span>
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

                {isTrial && trialDays !== null && (
                  <span className={cn("text-[11px] font-bold tabular-nums font-mono", trialDays <= 3 ? "text-destructive" : "text-amber-600")}>
                    {trialDays <= 3 ? `باقي ${trialDays}ي` : `تجربة (${trialDays}ي)`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant={isExpired ? "outline" : "default"}
                  className={cn("h-8 rounded-xl text-xs font-bold gap-1 px-3", isExpired && "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10")}
                  onClick={() => navigate(destination)}
                >
                  {isExpired ? <Sparkles size={13} /> : <ArrowUpRight size={13} />}
                  <span>{isExpired ? "تجديد" : "فتح"}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground inline-flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                  >
                    <MoreVertical size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl text-right" dir="rtl">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-xs font-semibold text-destructive focus:text-destructive"
                      onClick={() => onConfirmUninstall(installed)}
                      disabled={uninstallingId === installed.id}
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
      })}
    </div>
  );
};
