import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Store, Users, MessageSquare, BarChart3, Zap,
  DollarSign, TrendingUp, Package, Sparkles,
  Check, Loader2, X, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFeatureAccessKind } from "../featureCatalog";
import type { MarketplaceApp } from "../Marketplace";

const categoryIcons: Record<string, LucideIcon> = {
  ECOMMERCE: Store,
  HR: Users,
  COMMUNICATION: MessageSquare,
  CRM: BarChart3,
  ANALYTICS: TrendingUp,
  INTEGRATION: Zap,
  PRODUCTIVITY: Package,
  FINANCE: DollarSign,
  MARKETING: Sparkles,
  MEDICAL: Heart,
};

function shouldUseTextIcon(icon?: string) {
  const normalizedIcon = icon?.trim();
  if (!normalizedIcon) return false;
  return Array.from(normalizedIcon).length <= 3 && !/^[a-z0-9_\-\s]+$/i.test(normalizedIcon);
}

interface AppCardProps {
  app: MarketplaceApp;
  installingApp: string | null;
  uninstallingApp: string | null;
  onQuickInstall: (e: React.MouseEvent, app: MarketplaceApp) => void;
  onUninstall: (app: MarketplaceApp) => void;
  featured?: boolean;
}

export default function AppCard({
  app, installingApp, uninstallingApp,
  onQuickInstall, onUninstall, featured,
}: AppCardProps) {
  const { t } = useTranslation();
  const Icon = categoryIcons[app.category] || Package;
  const textIcon = shouldUseTextIcon(app.icon) ? app.icon?.trim() : null;

  const getDisplayedPrice = (a: MarketplaceApp) => {
    // ponytail: isEnterprise removed — enterprise plan system deleted
    if (a.pricingModel === "FREE") return t('marketplace.freePrice');
    if (a.pricingModel === "PAY_PER_USE") {
      return a.unitPrice
        ? `${a.unitPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perUnit')}`
        : t('marketplace.payPerUse');
    }
    if (a.monthlyPrice) return `${a.monthlyPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perMonth')}`;
    return t('marketplace.contactUs');
  };

  return (
    <Link to={`/marketplace/${app.slug}`} className="block">
      <Card
        className={cn(
          "group transition-all duration-300 ease-out border-border/50 text-right",
          "hover:-translate-y-1 hover:shadow-[0_32px_80px_-48px_rgba(7,17,32,0.5)]",
          "animate-in fade-in slide-in-from-bottom-2 duration-500",
          featured && "bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] border-primary/20",
          app.isInstalled && "border-success/50",
        )}
        style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}
      >
        <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {app.isInstalled && (
              <span className="flex size-2 shrink-0 rounded-full bg-success" />
            )}
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg size-9",
                app.isInstalled
                  ? "bg-success/10 text-success"
                  : featured
                    ? "bg-primary/15 text-primary"
                    : "bg-primary/10 text-primary"
              )}
            >
              {textIcon || <Icon size={18} aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground leading-tight truncate">
                  {app.name}
                </p>
                {featured && (
                  <Sparkles size={11} className="shrink-0 text-primary" aria-hidden="true" />
                )}
              </div>
              <p className="mt-0.5 text-xs font-bold text-primary truncate">
                {getDisplayedPrice(app)}
              </p>
            </div>
          </div>

          {app.isInstalled ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.preventDefault(); onUninstall(app); }}
              disabled={uninstallingApp === app.slug}
            >
              {uninstallingApp === app.slug ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <X size={14} />
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="shrink-0 gap-1 rounded-lg px-3 text-xs font-bold h-8"
              onClick={(e) => { e.preventDefault(); onQuickInstall(e, app); }}
              disabled={installingApp === app.slug}
            >
              {installingApp === app.slug ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Zap size={12} />
              )}
              {installingApp === app.slug ? t('marketplace.activatingNow') : t('marketplace.activate')}
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
