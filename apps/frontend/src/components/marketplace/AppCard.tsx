import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Star, CheckCircle2, Clock, Shield, BadgeCheck, Brain, Package, ExternalLink, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceApp } from "@/types/marketplace";
import {
  categoryIcons, appIcons, appIconsBySlug,
  shouldUseTextIcon, getPrice, getAvailableBadges, getAppDestination,
} from "@/utils/marketplace";
import { getMarketplaceFeatureItems } from "@/pages/marketplace/featureCatalog";
import { getAppSystemHub } from "@/utils/marketplaceSystems";

export interface AppCardProps {
  app: MarketplaceApp;
  variant?: "default" | "compact" | "featured" | "horizontal";
  showBadges?: boolean;
  showRating?: boolean;
  showInstalls?: boolean;
  showDeveloper?: boolean;
  showDescription?: boolean;
  showFeatures?: boolean;
  showTags?: boolean;
  animationDelay?: number;
}

const badgeConfig: Record<string, { label: string; className: string; icon: typeof Star }> = {
  OFFICIAL: { label: "رسمي", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/50", icon: BadgeCheck },
  VERIFIED: { label: "موثوق", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/50", icon: Shield },
  AI_POWERED: { label: "AI", className: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/50", icon: Brain },
  NEW: { label: "جديد", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50", icon: Clock },
  UPDATED: { label: "محدّث", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/50", icon: Clock },
  BEST_SELLER: { label: "الأكثر طلباً", className: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200/50", icon: Star },
  TRENDING: { label: "رائج", className: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/50", icon: Star },
  ENTERPRISE_READY: { label: "شركات", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/50", icon: Shield },
  EDITOR_CHOICE: { label: "موصى به", className: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/50", icon: Star },
};

export function AppCard({
  app,
  variant = "default",
  showBadges = true,
  showRating = true,
  showInstalls = true,
  showDeveloper = false,
  showDescription = true,
  showFeatures = false,
  showTags = false,
  animationDelay = 0,
}: AppCardProps) {
  const { t } = useTranslation();

  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
  const appIconKey = app.icon?.trim().toLowerCase();
  const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
  const Icon = AppIcon || categoryIcons[app.category] || Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;
  const badges = getAvailableBadges(app);
  const features = useMemo(() => getMarketplaceFeatureItems(app), [app]);
  const destination = app.mainRoute || getAppDestination(app);
  const systemHub = getAppSystemHub(app);
  const SystemIcon = systemHub.icon;

  // ── List / Horizontal View ──
  if (variant === "horizontal") {
    return (
      <div className="group/card relative w-full">
        <Link
          to={`/marketplace/${app.slug}`}
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/40 bg-card transition-all duration-150",
            "hover:border-primary/40 hover:bg-card/90 hover:shadow-sm",
            app.isInstalled && "border-emerald-500/25 bg-emerald-500/[0.02]"
          )}
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <div className="size-11 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
              {app.logo ? (
                <img src={app.logo} alt={app.name} className="size-full object-cover" loading="lazy" />
              ) : BrandIcon ? (
                <BrandIcon className="size-5 text-foreground" />
              ) : textIcon ? (
                <span className="text-base font-bold">{textIcon}</span>
              ) : (
                <Icon size={20} className="text-foreground/80" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 dir="auto" className="text-sm font-bold text-foreground group-hover/card:text-primary transition-colors truncate">
                  {app.name}
                </h3>
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", systemHub.badgeClassName)}>
                  <SystemIcon size={10} />
                  {systemHub.nameAr}
                </span>
                {app.isInstalled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={10} />
                    {t('marketplace.installedBadge', 'مثبت')}
                  </span>
                ) : showBadges && badges.length > 0 && badgeConfig[badges[0]] ? (
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", badgeConfig[badges[0]].className)}>
                    {badgeConfig[badges[0]].label}
                  </span>
                ) : null}

                {showRating && app.rating != null && app.rating > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                    <Star size={11} className="fill-current" />
                    <span className="font-semibold text-foreground/80">{app.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>

              {app.description && (
                <p dir="auto" className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {app.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
            <span className="text-xs font-bold text-foreground/80 px-2 py-1 rounded-md bg-muted/40">
              {getPrice(app, t)}
            </span>

            {app.isInstalled ? (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = destination;
                }}
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
              >
                <ExternalLink size={12} />
                فتح
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-muted/60 text-foreground group-hover/card:bg-primary group-hover/card:text-primary-foreground transition-all">
                تفاصيل
                <ArrowRight size={12} className="rtl:rotate-180" />
              </span>
            )}
          </div>
        </Link>
      </div>
    );
  }

  // ── Compact View ──
  if (variant === "compact") {
    return (
      <div className="group/card relative h-full">
        <Link
          to={`/marketplace/${app.slug}`}
          className={cn(
            "flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-card hover:border-primary/40 transition-all",
            app.isInstalled && "border-emerald-500/25"
          )}
        >
          <div className="size-9 rounded-lg bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
            {app.logo ? (
              <img src={app.logo} alt={app.name} className="size-full object-cover" loading="lazy" />
            ) : BrandIcon ? (
              <BrandIcon className="size-4 text-foreground" />
            ) : (
              <Icon size={16} className="text-foreground/80" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 dir="auto" className="text-xs font-bold text-foreground truncate group-hover/card:text-primary transition-colors">
              {app.name}
            </h4>
            <span className="text-[10px] text-muted-foreground">{getPrice(app, t)}</span>
          </div>
        </Link>
      </div>
    );
  }

  // ── Default Grid Card ──
  return (
    <div className="group/card relative h-full">
      <Link
        to={`/marketplace/${app.slug}`}
        className={cn(
          "flex flex-col h-full rounded-2xl border border-border/40 bg-card p-4 transition-all duration-200",
          "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
          app.isInstalled && "border-emerald-500/30 bg-emerald-500/[0.015]"
        )}
      >
        {/* Top Header: Icon + Status/Badges */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="size-11 sm:size-12 rounded-xl bg-muted/50 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-200 group-hover/card:scale-105">
            {app.logo ? (
              <img src={app.logo} alt={app.name} className="size-full object-cover" loading="lazy" />
            ) : BrandIcon ? (
              <BrandIcon className="size-5 sm:size-6 text-foreground" />
            ) : textIcon ? (
              <span className="text-base sm:text-lg font-bold">{textIcon}</span>
            ) : (
              <Icon size={22} className="text-foreground/80" />
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            {app.isInstalled ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 size={11} />
                {t('marketplace.installedBadge', 'مثبت')}
              </span>
            ) : showBadges && badges.length > 0 && badgeConfig[badges[0]] ? (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", badgeConfig[badges[0]].className)}>
                {badgeConfig[badges[0]].label}
              </span>
            ) : null}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border", systemHub.badgeClassName)}>
              <SystemIcon size={9} />
              {systemHub.nameAr}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-1.5 mb-1.5">
            <h3
              dir="auto"
              className="text-sm font-bold text-foreground group-hover/card:text-primary transition-colors truncate"
              title={app.name}
            >
              {app.name}
            </h3>
            {showRating && app.rating != null && app.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-500 shrink-0 font-semibold">
                <Star size={11} className="fill-current" />
                {app.rating.toFixed(1)}
              </span>
            )}
          </div>

          {showDescription && (
            <p
              dir="auto"
              className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 flex-1"
            >
              {app.description}
            </p>
          )}

          {showFeatures && features.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {features.slice(0, 2).map((f) => (
                <span key={f.key} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                  <CheckCircle2 size={10} className="text-primary" />
                  {f.name}
                </span>
              ))}
            </div>
          )}

          {showTags && app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {app.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: Price & Direct Action */}
          <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground/80">
              {getPrice(app, t)}
            </span>

            {app.isInstalled ? (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = destination;
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <ExternalLink size={11} />
                فتح
              </span>
            ) : (
              <span className="text-[11px] font-bold text-primary group-hover/card:translate-x-0.5 transition-transform flex items-center gap-0.5">
                التفاصيل
                <ArrowRight size={11} className="rtl:rotate-180" />
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default AppCard;
