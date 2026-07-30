import { ShoppingBag as ShoppingCartIcon, Circle as CubeIcon, Circle as UserGroupIcon, Activity as ChartBarIcon, Settings as Cog6ToothIcon, DollarSign as CurrencyDollarIcon, MessageSquare as ChatBubbleLeftRightIcon, Circle as RocketLaunchIcon, Star as SparklesIcon, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
;
import { cn } from "../../lib/utils";

interface QuickAction {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  appSlug?: string;
}

const primaryActions: QuickAction[] = [
  { key: "orders", labelKey: "companyDashboard.quickActions.orders", icon: ShoppingCartIcon, path: "/orders", appSlug: "ecommerce-basic" },
  { key: "products", labelKey: "companyDashboard.quickActions.products", icon: CubeIcon, path: "/products", appSlug: "ecommerce-basic" },
  { key: "customers", labelKey: "companyDashboard.quickActions.customers", icon: UserGroupIcon, path: "/customers", appSlug: "crm-basic" },
  { key: "whatsapp", labelKey: "companyDashboard.quickActions.whatsapp", icon: ChatBubbleLeftRightIcon, path: "/whatsapp", appSlug: "whatsapp-business" },
  { key: "inbox", labelKey: "companyDashboard.quickActions.inbox", icon: ChatBubbleLeftRightIcon, path: "/unified-inbox", appSlug: "unified-inbox" },
  { key: "ai-agent", labelKey: "companyDashboard.quickActions.aiAgent", icon: SparklesIcon, path: "/admin/ai-hub", appSlug: "ai-chat-basic" },
  { key: "connections", labelKey: "companyDashboard.quickActions.connections", icon: LinkIcon, path: "/unified-inbox/connections", appSlug: "unified-inbox" },
];

const secondaryActions: QuickAction[] = [
  { key: "analytics", labelKey: "companyDashboard.quickActions.analytics", icon: ChartBarIcon, path: "/analytics/orders", appSlug: "ecommerce-basic" },
  { key: "marketing", labelKey: "companyDashboard.quickActions.marketing", icon: CurrencyDollarIcon, path: "/marketing", appSlug: "facebook-ads-pro" },
  { key: "storefront", labelKey: "companyDashboard.quickActions.storefront", icon: RocketLaunchIcon, path: "/settings/store", appSlug: "ecommerce-basic" },
  { key: "settings", labelKey: "companyDashboard.quickActions.settings", icon: Cog6ToothIcon, path: "/settings" },
];

interface QuickActionsProps {
  activeApps?: string[];
  badges?: Record<string, number>;
}

export function QuickActions({ activeApps = [], badges = {} }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                "text-muted-foreground hover:text-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "group relative",
              )}
              style={{
                background: "color-mix(in srgb, var(--color-border) 25%, transparent)",
              }}
            >
              <action.icon className="w-3.5 h-3.5" />
              {t(action.labelKey)}
              {badge != null && badge > 0 && (
                <span className="min-w-3.5 h-3.5 px-1 rounded-full text-[9px] font-bold leading-[14px] text-white tabular-nums"
                  style={{ background: "color-mix(in srgb, var(--color-destructive) 88%, black)" }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
        {visibleSecondary.length > 0 && (
          <>
            <span className="w-px h-4 self-center bg-border/50 mx-0.5" />
            {visibleSecondary.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <action.icon className="w-3 h-3" />
                {t(action.labelKey)}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
