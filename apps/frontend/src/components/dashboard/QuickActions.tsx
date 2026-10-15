import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  Box,
  Users,
  BarChart2,
  Settings,
  DollarSign,
  MessageSquare,
  Rocket,
  Sparkles,
  Link2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useRoutePrefetch } from "../../hooks/useRoutePrefetch";

interface QuickAction {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  appSlug?: string;
}

const primaryActions: QuickAction[] = [
  { key: "orders", labelKey: "companyDashboard.quickActions.orders", icon: ShoppingCart, path: "/orders", appSlug: "ecommerce-basic" },
  { key: "products", labelKey: "companyDashboard.quickActions.products", icon: Box, path: "/products", appSlug: "ecommerce-basic" },
  { key: "customers", labelKey: "companyDashboard.quickActions.customers", icon: Users, path: "/customers", appSlug: "crm-basic" },
  { key: "whatsapp", labelKey: "companyDashboard.quickActions.whatsapp", icon: MessageSquare, path: "/whatsapp", appSlug: "whatsapp-business" },
  { key: "inbox", labelKey: "companyDashboard.quickActions.inbox", icon: MessageSquare, path: "/unified-inbox", appSlug: "unified-inbox" },
  { key: "ai-agent", labelKey: "companyDashboard.quickActions.aiAgent", icon: Sparkles, path: "/admin/ai-hub", appSlug: "ai-chat-basic" },
  { key: "connections", labelKey: "companyDashboard.quickActions.connections", icon: Link2, path: "/unified-inbox/connections", appSlug: "unified-inbox" },
];

const secondaryActions: QuickAction[] = [
  { key: "analytics", labelKey: "companyDashboard.quickActions.analytics", icon: BarChart2, path: "/analytics/orders", appSlug: "ecommerce-basic" },
  { key: "marketing", labelKey: "companyDashboard.quickActions.marketing", icon: DollarSign, path: "/marketing", appSlug: "facebook-ads-pro" },
  { key: "storefront", labelKey: "companyDashboard.quickActions.storefront", icon: Rocket, path: "/settings/store", appSlug: "ecommerce-basic" },
  { key: "settings", labelKey: "companyDashboard.quickActions.settings", icon: Settings, path: "/settings" },
];

interface QuickActionsProps {
  activeApps?: string[];
  badges?: Record<string, number>;
}

export function QuickActions({ activeApps = [], badges = {} }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prefetch = useRoutePrefetch();
  const activeLower = activeApps.map((a) => a.toLowerCase());

  const filterActions = (actions: QuickAction[]) =>
    actions.filter((a) => !a.appSlug || activeLower.includes(a.appSlug));

  const visiblePrimary = filterActions(primaryActions);
  const sortedPrimary = [...visiblePrimary].sort((a, b) => (badges[b.key] ?? 0) - (badges[a.key] ?? 0));
  const visibleSecondary = filterActions(secondaryActions);

  if (visiblePrimary.length === 0 && visibleSecondary.length === 0) return null;

  return (
    <div className="py-2">
      <div className="flex flex-wrap gap-1.5">
        {sortedPrimary.map((action) => {
          const badge = badges[action.key];
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => navigate(action.path)}
              onMouseEnter={() => prefetch(action.path)}
              onFocus={() => prefetch(action.path)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                "bg-card border border-border/70 text-foreground hover:bg-muted/50 transition-colors shadow-2xs",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                "group relative"
              )}
            >
              <action.icon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{t(action.labelKey)}</span>
              {badge != null && badge > 0 && (
                <span className="min-w-3.5 h-3.5 px-1 rounded-full text-[9px] font-bold leading-[14px] bg-destructive text-destructive-foreground font-mono tabular-nums">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
        {visibleSecondary.length > 0 && (
          <>
            <span className="w-px h-4 self-center bg-border/60 mx-0.5" />
            {visibleSecondary.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                onMouseEnter={() => prefetch(action.path)}
                onFocus={() => prefetch(action.path)}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <action.icon className="w-3 h-3 text-muted-foreground" />
                <span>{t(action.labelKey)}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
