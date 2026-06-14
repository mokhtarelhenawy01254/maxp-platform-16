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
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

interface QuickAction {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const primaryActions: QuickAction[] = [
  { key: "orders", labelKey: "quickActions.orders", icon: ShoppingCartIcon, path: "/orders" },
  { key: "products", labelKey: "quickActions.products", icon: CubeIcon, path: "/products" },
  { key: "customers", labelKey: "quickActions.customers", icon: UserGroupIcon, path: "/customers" },
  { key: "whatsapp", labelKey: "quickActions.whatsapp", icon: ChatBubbleLeftRightIcon, path: "/whatsapp" },
];

const secondaryActions: QuickAction[] = [
  { key: "analytics", labelKey: "quickActions.analytics", icon: ChartBarIcon, path: "/analytics/orders" },
  { key: "marketing", labelKey: "quickActions.marketing", icon: CurrencyDollarIcon, path: "/marketing" },
  { key: "storefront", labelKey: "quickActions.storefront", icon: RocketLaunchIcon, path: "/settings/store" },
  { key: "settings", labelKey: "quickActions.settings", icon: Cog6ToothIcon, path: "/settings" },
];

export function QuickActions() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{t("quickActions.title")}</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {primaryActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => navigate(action.path)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
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
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {secondaryActions.map((action) => (
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
      </div>
    </div>
  );
}
