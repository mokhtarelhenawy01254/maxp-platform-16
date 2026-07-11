import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingCartIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  RocketLaunchIcon,
  SparklesIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

interface QuickAction {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  appSlug?: string;
}

const primaryActions: QuickAction[] = [
  { key: "orders", labelKey: "quickActions.orders", icon: ShoppingCartIcon, path: "/orders", appSlug: "ecommerce-basic" },
  { key: "products", labelKey: "quickActions.products", icon: CubeIcon, path: "/products", appSlug: "ecommerce-basic" },
  { key: "customers", labelKey: "quickActions.customers", icon: UserGroupIcon, path: "/customers", appSlug: "crm-basic" },
  { key: "whatsapp", labelKey: "quickActions.whatsapp", icon: ChatBubbleLeftRightIcon, path: "/whatsapp", appSlug: "whatsapp-business" },
  { key: "inbox", labelKey: "quickActions.inbox", icon: ChatBubbleLeftRightIcon, path: "/unified-inbox", appSlug: "unified-inbox" },
  { key: "ai-agent", labelKey: "quickActions.aiAgent", icon: SparklesIcon, path: "/admin/ai-hub", appSlug: "ai-chat-basic" },
  { key: "connections", labelKey: "quickActions.connections", icon: LinkIcon, path: "/unified-inbox/connections", appSlug: "unified-inbox" },
];

const secondaryActions: QuickAction[] = [
  { key: "analytics", labelKey: "quickActions.analytics", icon: ChartBarIcon, path: "/analytics/orders", appSlug: "ecommerce-basic" },
  { key: "marketing", labelKey: "quickActions.marketing", icon: CurrencyDollarIcon, path: "/marketing", appSlug: "facebook-ads-pro" },
  { key: "storefront", labelKey: "quickActions.storefront", icon: RocketLaunchIcon, path: "/settings/store", appSlug: "ecommerce-basic" },
  { key: "settings", labelKey: "quickActions.settings", icon: Cog6ToothIcon, path: "/settings" },
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
  // ponytail: sort by badge count desc so attention-needing actions surface first
  const sortedPrimary = [...visiblePrimary].sort((a, b) => (badges[b.key] ?? 0) - (badges[a.key] ?? 0));
  const visibleSecondary = filterActions(secondaryActions);

  if (visiblePrimary.length === 0 && visibleSecondary.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{t("quickActions.title")}</h3>
      <div className="space-y-3">
        {visiblePrimary.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sortedPrimary.map((action) => {
              const badge = badges[action.key];
              return (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-xl",
                  "bg-card border border-border/50 shadow-sm",
                  "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "group",
                )}
                aria-label={t(action.labelKey)}
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0 text-white",
                  "transition-transform duration-200 group-hover:scale-110",
                )}
                  style={{ background: `color-mix(in srgb, var(--color-primary) 85%, white)` }}
                >
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground truncate">
                  {t(action.labelKey)}
                </span>
                {badge != null && badge > 0 && (
                  <span
                    className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold leading-4 text-white tabular-nums"
                    style={{ background: "color-mix(in srgb, var(--color-destructive) 88%, black)" }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
              );
            })}
          </div>
        )}
        {visibleSecondary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleSecondary.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                  "text-xs font-medium text-muted-foreground",
                  "transition-all duration-200 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                style={{
                  background: "color-mix(in srgb, var(--color-border) 30%, transparent)",
                }}
              >
                <action.icon className="w-3.5 h-3.5" />
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
