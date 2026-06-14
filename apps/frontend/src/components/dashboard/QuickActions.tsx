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
  color: string;
}

const primaryActions: QuickAction[] = [
  { key: "orders", labelKey: "quickActions.orders", icon: ShoppingCartIcon, path: "/orders", color: "from-blue-500 to-blue-600" },
  { key: "products", labelKey: "quickActions.products", icon: CubeIcon, path: "/products", color: "from-emerald-500 to-emerald-600" },
  { key: "customers", labelKey: "quickActions.customers", icon: UserGroupIcon, path: "/customers", color: "from-violet-500 to-violet-600" },
  { key: "whatsapp", labelKey: "quickActions.whatsapp", icon: ChatBubbleLeftRightIcon, path: "/whatsapp", color: "from-indigo-500 to-indigo-600" },
];

const secondaryActions: QuickAction[] = [
  { key: "analytics", labelKey: "quickActions.analytics", icon: ChartBarIcon, path: "/analytics/orders", color: "from-amber-500 to-amber-600" },
  { key: "marketing", labelKey: "quickActions.marketing", icon: CurrencyDollarIcon, path: "/marketing", color: "from-rose-500 to-rose-600" },
  { key: "storefront", labelKey: "quickActions.storefront", icon: RocketLaunchIcon, path: "/settings/store", color: "from-cyan-500 to-cyan-600" },
  { key: "settings", labelKey: "quickActions.settings", icon: Cog6ToothIcon, path: "/settings", color: "from-slate-500 to-slate-600" },
];

interface QuickActionsProps {
  isRtl: boolean;
}

export function QuickActions({ isRtl }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/50 shadow-sm">
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
                "hover:shadow-md hover:-translate-y-0.5",
                "transition-all duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "group",
              )}
            >
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br text-white shadow-sm shrink-0",
                "transition-transform duration-300 group-hover:scale-110",
                action.color,
              )}>
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
                "bg-muted/30 hover:bg-muted/50 border border-border/30",
                "transition-all duration-200 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
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
