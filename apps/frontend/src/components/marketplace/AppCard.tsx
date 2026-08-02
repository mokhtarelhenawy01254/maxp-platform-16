import { useState, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Star, CheckCircle2, Download, Zap, X, Loader2, Heart,
  BarChart3, Clock, Shield, BadgeCheck, Brain, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MarketplaceApp } from "@/types/marketplace";
import {
  categoryIcons, appIcons, appIconsBySlug, categoryCssClass,
  shouldUseTextIcon, getPrice, getAvailableBadges, normalizeRequiredApps,
  formatInstallCount,
} from "@/utils/marketplace";
import { getMarketplaceFeatureItems } from "@/pages/marketplace/featureCatalog";

interface AppCardProps {
  app: MarketplaceApp;
  variant?: "default" | "compact" | "featured" | "horizontal";
  installingApp?: string | null;
  uninstallingApp?: string | null;
  onQuickInstall?: (e: React.MouseEvent, app: MarketplaceApp) => void;
  onUninstall?: (app: MarketplaceApp) => void;
  onAddToWishlist?: (app: MarketplaceApp) => void;
  onRemoveFromWishlist?: (app: MarketplaceApp) => void;
  onCompare?: (app: MarketplaceApp) => void;
  isInWishlist?: boolean;
  isInCompare?: boolean;
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
  OFFICIAL: { label: "Official", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: BadgeCheck },
  VERIFIED: { label: "Verified", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: Shield },
  AI_POWERED: { label: "AI", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: Brain },
  NEW: { label: "New", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Zap },
  UPDATED: { label: "Updated", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", icon: Clock },
  BEST_SELLER: { label: "Best Seller", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: Star },
  TRENDING: { label: "Trending", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: BarChart3 },
  ENTERPRISE_READY: { label: "Enterprise", className: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300", icon: Shield },
  EDITOR_CHOICE: { label: "Editor's Choice", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Star },
};

export function AppCard({
  app,
  variant = "default",
  installingApp,
  uninstallingApp,
  onQuickInstall,
  onUninstall,
  onAddToWishlist,
  onRemoveFromWishlist,
  onCompare,
  isInWishlist = false,
  isInCompare = false,
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();

  const BrandIcon = app.slug ? appIconsBySlug[app.slug] : undefined;
  const appIconKey = app.icon?.trim().toLowerCase();
  const AppIcon = appIconKey ? appIcons[appIconKey] : undefined;
  const Icon = AppIcon || categoryIcons[app.category] || Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;
  const catCls = categoryCssClass[app.category] || "";
  const badges = getAvailableBadges(app);
  const features = useMemo(() => getMarketplaceFeatureItems(app), [app]);

  const showPreview = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreviewOpen(true), 400);
  }, []);
  const hidePreview = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreviewOpen(false), 200);
  }, []);

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const isHorizontal = variant === "horizontal";

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist) {
      onRemoveFromWishlist?.(app);
    } else {
      onAddToWishlist?.(app);
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCompare?.(app);
  };

  const card = (
    <div className="relative h-full group/card">
      <Link
        to={`/marketplace/${app.slug}`}
        className={cn(
          "mp-app-card-v2",
          catCls,
          variant === "featured" && "mp-card-featured",
          variant === "horizontal" && "mp-card-horizontal",
          app.isInstalled && "mp-card-installed",
          "block h-full"
        )}
      >
        {showBadges && badges.length > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
            {badges.slice(0, 2).map((badge) => {
              const config = badgeConfig[badge];
              if (!config) return null;
              const IconComp = config.icon;
              return (
                <TooltipProvider key={badge}>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold", config.className)}>
                        <IconComp size={10} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
            {badges.length > 2 && (
              <span className="text-[10px] font-bold text-muted-foreground px-1">+{badges.length - 2}</span>
            )}
          </div>
        )}

        <div className={cn(
          "flex",
          isFeatured ? "flex-row gap-4" : isHorizontal ? "flex-row gap-3" : "flex-col gap-3"
        )}>
          <div className={cn("mp-icon-box-v2", isFeatured && "mp-icon-box-lg", isCompact && "mp-icon-box-sm")}>
            {BrandIcon ? <BrandIcon className={isFeatured ? "size-6" : "size-5"} /> : textIcon ? <span className="text-base font-bold">{textIcon}</span> : <Icon size={isFeatured ? 24 : 20} />}
          </div>

          <div className={cn("flex flex-col min-w-0", isFeatured ? "flex-1" : "flex-1")}>
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                dir="auto"
                className={cn(
                  "font-extrabold text-foreground truncate",
                  isFeatured ? "text-sm" : isCompact ? "text-xs" : "text-xs"
                )}
                style={{ unicodeBidi: 'plaintext' }}
                title={app.name}
              >
                {app.name}
              </h3>
              {showRating && app.rating && (
                <span className="mp-rating-inline shrink-0">
                  <Star size={isCompact ? 9 : 10} className="fill-current" />
                  {app.rating.toFixed(1)}
                </span>
              )}
            </div>

            {showDeveloper && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                {t('marketplace.byDeveloper', { name: app.developer?.name || 'MaxP' })}
              </p>
            )}

            {showDescription && !isCompact && (
              <p
                dir="auto"
                className={cn(
                  "text-muted-foreground line-clamp-2 leading-relaxed mt-1",
                  isFeatured ? "text-xs" : "text-[11px]"
                )}
                style={{ unicodeBidi: 'plaintext' }}
              >
                {app.description}
              </p>
            )}

            {showFeatures && features.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {features.slice(0, 3).map(f => (
                  <span key={f.key} className="mp-feature-chip-v2">
                    <CheckCircle2 size={9} />
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            {showTags && app.tags && app.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {app.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="mp-tag-chip">{tag}</span>
                ))}
              </div>
            )}

            <div className={cn("flex items-center justify-between gap-1", isFeatured ? "mt-auto pt-2" : "mt-2")}>
              <span className="mp-price-tag-v2">{getPrice(app, t)}</span>
              {showInstalls && !isCompact && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
                  <Download size={9} />
                  {formatInstallCount(app.installCount)}
                </span>
              )}
            </div>

            <div className={cn("flex items-center gap-1 mt-2", isFeatured && "mt-3")}>
              {app.isInstalled ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.preventDefault(); onUninstall?.(app); }}
                    disabled={uninstallingApp === app.slug}
                  >
                    {uninstallingApp === app.slug ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  </Button>
                  <span className="text-[10px] font-bold text-success flex items-center gap-0.5 ml-auto">
                    <CheckCircle2 size={10} />
                    {t('marketplace.installed')}
                  </span>
                </>
              ) : (
                <>
                  {onQuickInstall && (
                    <Button
                      size="sm"
                      className={cn("h-7 shrink-0 gap-1 rounded-lg text-xs font-bold", isFeatured && "flex-1")}
                      onClick={(e) => onQuickInstall(e, app)}
                      disabled={installingApp === app.slug}
                    >
                      {installingApp === app.slug ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
                    </Button>
                  )}
                  {isFeatured && onCompare && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("h-7 shrink-0 gap-1 rounded-lg text-xs", isInCompare && "border-primary bg-primary/10")}
                      onClick={handleCompare}
                    >
                      {isInCompare ? <CheckCircle2 size={11} /> : <BarChart3 size={11} />}
                      {t('marketplace.compareApps')}
                    </Button>
                  )}
                  {isFeatured && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 w-7 shrink-0 rounded-lg p-0", isInWishlist && "text-red-500")}
                      onClick={handleWishlist}
                    >
                      <Heart size={13} className={isInWishlist ? "fill-current" : ""} />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );

  if (variant === "compact") return card;

  return (
    <Popover open={previewOpen && !isFeatured} onOpenChange={setPreviewOpen}>
      <div
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onFocus={showPreview}
        onBlur={hidePreview}
        className="h-full"
      >
        <PopoverTrigger asChild>
          {card}
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={12}
          className="w-80 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-xl"
          onMouseEnter={showPreview}
          onMouseLeave={hidePreview}
        >
          <div className="border-b border-border/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {BrandIcon ? <BrandIcon className="size-5" /> : textIcon || <Icon size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 dir="auto" className="text-sm font-bold" style={{ unicodeBidi: 'plaintext' }}>{app.name}</h4>
                  {app.rating && (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                      <Star size={11} className="fill-current" />{app.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p dir="auto" className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" style={{ unicodeBidi: 'plaintext' }}>
                  {app.description}
                </p>
              </div>
            </div>
          </div>

          {features.length > 0 && (
            <div className="border-b border-border/40 px-4 py-3">
              <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('marketplace.features')}</h5>
              <div className="space-y-1.5">
                {features.slice(0, 6).map(f => (
                  <div key={f.key} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-primary" />
                    <span>{f.name}</span>
                  </div>
                ))}
                {features.length > 6 && (
                  <p className="pt-1 text-xs text-muted-foreground">{t('marketplace.moreFeatures', { count: features.length - 6 })}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 pt-3">
            <div>
              <span className="text-sm font-bold text-primary">{getPrice(app, t)}</span>
              {app.trialDays > 0 && (
                <span className="mr-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('marketplace.trialDays', { count: app.trialDays })}</span>
              )}
            </div>
            {app.isInstalled ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <CheckCircle2 size={10} />
                {t('marketplace.installed')}
              </Badge>
            ) : (
              <Button
                size="sm"
                className="h-8 gap-1 rounded-lg text-xs font-bold"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickInstall?.(e, app); }}
                disabled={installingApp === app.slug}
              >
                {installingApp === app.slug ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
              </Button>
            )}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}

export default AppCard;
