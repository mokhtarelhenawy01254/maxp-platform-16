import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Star, CheckCircle2, Clock, Shield, BadgeCheck, Brain, Package, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceApp } from "@/types/marketplace";
import {
  categoryIcons, appIcons, appIconsBySlug,
  shouldUseTextIcon, getPrice, getAvailableBadges, getAppDestination,
} from "@/utils/marketplace";
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
  showRating = false,
}: AppCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
  const appIconKey = app.icon?.trim().toLowerCase();
  const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
  const Icon = AppIcon || categoryIcons[app.category] || Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;
  const badges = getAvailableBadges(app);
  const destination = app.mainRoute || getAppDestination(app);
  const systemHub = getAppSystemHub(app);
  const SystemIcon = systemHub.icon;

  const handleClick = (e: React.MouseEvent) => {
    // If installed, navigate directly to destination app
    if (app.isInstalled) {
      e.preventDefault();
      if (!destination) return;
      if (destination.startsWith("http://") || destination.startsWith("https://")) {
        window.location.href = destination;
      } else {
        navigate(destination);
      }
    }
  };

  const targetTo = app.isInstalled ? destination : `/marketplace/${app.slug}`;

  // ── Compact View (e.g. For Sidebars or dropdowns) ──
  if (variant === "compact") {
    return (
      <Link
        to={targetTo}
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-2.5 p-2 rounded-xl border border-border/30 bg-card hover:border-primary/40 transition-all",
          app.isInstalled && "border-emerald-500/25"
        )}
      >
        <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
          {app.logo ? (
            <img src={app.logo} alt={app.name} className="size-full object-cover" loading="lazy" />
          ) : BrandIcon ? (
            <BrandIcon className="size-4 text-foreground" />
          ) : (
            <Icon size={15} className="text-foreground/80" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 dir="auto" className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {app.name}
          </h4>
          <span className="text-[10px] text-muted-foreground">{getPrice(app, t)}</span>
        </div>
      </Link>
    );
  }

  // ── Modern Ultra-Clean App Tile (Default & Horizontal) ──
  return (
    <Link
      to={targetTo}
      onClick={handleClick}
      className={cn(
        "group relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-150 select-none",
        "bg-card hover:bg-accent/[0.04] hover:shadow-sm",
        app.isInstalled
          ? "border-emerald-500/25 hover:border-emerald-500/50 bg-emerald-500/[0.015]"
          : "border-border/40 hover:border-primary/50"
      )}
    >
      {/* Start: Icon + Name + Category/Hub */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="size-11 sm:size-12 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-150 group-hover:scale-105">
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

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 dir="auto" className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={app.name}>
              {app.name}
            </h3>
            {showRating && app.rating != null && app.rating > 0 && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[11px] text-amber-500 shrink-0 font-bold">
                <Star size={10} className="fill-current" />
                {app.rating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground truncate">
              <SystemIcon size={11} className="shrink-0 text-primary/70" />
              <span className="truncate">{systemHub.nameAr}</span>
            </span>
          </div>

          {app.description && (
            <p className="hidden sm:block text-[11px] text-muted-foreground/90 line-clamp-1 mt-0.5" dir="auto">
              {app.description.replace(/\s+/g, " ").trim()}
            </p>
          )}
        </div>
      </div>

      {/* End: Status & Pricing */}
      <div className="flex flex-col items-end justify-center shrink-0 text-left rtl:text-right gap-1">
        {app.isInstalled ? (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
            app.isIncludedInPlan
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-500/20"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/20"
          )}>
            <CheckCircle2 size={10} />
            {app.isIncludedInPlan ? "مشمول بالباقة" : t('marketplace.installedBadge', 'مثبت')}
          </span>
        ) : showBadges && badges.length > 0 && badgeConfig[badges[0]] ? (
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", badgeConfig[badges[0]].className)}>
            {badgeConfig[badges[0]].label}
          </span>
        ) : null}

        {app.isInstalled && (
          <button
            type="button"
            aria-label={t('marketplace.viewDetails', 'تفاصيل التطبيق')}
            title={t('marketplace.viewDetails', 'تفاصيل التطبيق')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/marketplace/${app.slug}`);
            }}
            className="size-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Info size={13} />
          </button>
        )}

        {!app.isIncludedInPlan && (
          <span className="text-xs font-bold text-foreground/80 tabular-nums">
            {getPrice(app, t)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default AppCard;
