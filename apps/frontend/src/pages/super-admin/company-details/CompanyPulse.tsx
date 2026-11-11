import { Boxes, Building2, ShoppingBag, Users } from "lucide-react";
import type { CompanyData, CompanyReview } from "./companyDetailsTypes";
import { MetricCard } from "./MetricCard";
import { formatNumber, getUnifiedUsersCount } from "./helpers";

export function CompanyPulse({
  review,
  company,
  customersCount = 0,
  ordersThisMonth = 0,
  activeApps = 0,
}: {
  review: CompanyReview | null;
  company?: CompanyData | null;
  customersCount?: number;
  ordersThisMonth?: number;
  activeApps?: number;
}) {
  const unifiedUsersCount = getUnifiedUsersCount(review, company);

  // الاتجاه مقارنة بالشهر السابق لا يُعرض إلا لو البيانات موجودة فعلاً في رد الـ API
  const kpis = [
    {
      key: "users",
      icon: Users,
      label: "الأعضاء",
      value: formatNumber(unifiedUsersCount),
      trend: null,
    },
    {
      key: "customers",
      icon: Building2,
      label: "العملاء",
      value: formatNumber(customersCount),
      trend: null,
    },
    {
      key: "orders",
      icon: ShoppingBag,
      label: "طلبات الشهر",
      value: formatNumber(ordersThisMonth),
      trend: null,
    },
    {
      key: "apps",
      icon: Boxes,
      label: "الأدوات النشطة",
      value: formatNumber(activeApps),
      trend: null,
    },
  ];

  return (
    <div className="border-t border-border/50 pt-3" data-testid="unified-kpi-bar">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((item) => (
          <MetricCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            trend={item.trend}
          />
        ))}
      </div>
    </div>
  );
}
