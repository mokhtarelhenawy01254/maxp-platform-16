import React from "react";
import { Link, useLocation, useInRouterContext } from "react-router-dom";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

export interface AnalyticsTabItem {
  path: string;
  label: string;
  badge?: string;
  icon: React.ElementType;
}

const TABS: AnalyticsTabItem[] = [
  {
    path: "/analytics/store",
    label: "لوحة أداء المتجر والزيارات",
    icon: ChartBarIcon,
  },
  {
    path: "/analytics/orders/conversion",
    label: "تفصيل معدل التحويل",
    icon: ArrowTrendingUpIcon,
  },
  {
    path: "/analytics/orders/funnel",
    label: "قمع التحويل ومسار الشراء",
    icon: FunnelIcon,
  },
];

interface TabsRendererProps {
  currentPath: string;
  inRouter: boolean;
  className?: string;
}

const TabsRenderer: React.FC<TabsRendererProps> = ({
  currentPath,
  inRouter,
  className = "",
}) => {
  return (
    <div
      className={`mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      dir="rtl"
    >
      <nav
        aria-label="تبويبات تحليلات المتجر والتحويل"
        className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 rounded-2xl border border-gray-200/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/60"
      >
        {TABS.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;
          const linkClasses = `flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] ${
            isActive
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          }`;

          const content = (
            <>
              <Icon
                className={`size-4 sm:size-4.5 ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <span>{tab.label}</span>
            </>
          );

          if (inRouter) {
            return (
              <Link key={tab.path} to={tab.path} className={linkClasses}>
                {content}
              </Link>
            );
          }

          return (
            <a key={tab.path} href={tab.path} className={linkClasses}>
              {content}
            </a>
          );
        })}
      </nav>
    </div>
  );
};

const RouterAwareTabs: React.FC<{ className?: string }> = ({ className }) => {
  const location = useLocation();
  return <TabsRenderer currentPath={location.pathname} inRouter={true} className={className} />;
};

const FallbackTabs: React.FC<{ className?: string }> = ({ className }) => {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  return <TabsRenderer currentPath={currentPath} inRouter={false} className={className} />;
};

export const StoreAnalyticsTabs: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <RouterAwareTabs className={className} />
  ) : (
    <FallbackTabs className={className} />
  );
};

export default StoreAnalyticsTabs;
