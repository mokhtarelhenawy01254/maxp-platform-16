import { Boxes, Building2, Info, ShoppingBag, UserCheck, Users } from "lucide-react";
import type { CompanyData, CompanyReview } from "./companyDetailsTypes";
import { MetricCard } from "./MetricCard";
import { Badge } from "../../../components/ui/badge";
import { formatNumber, getDirectUsersCount, getUnifiedUsersCount } from "./helpers";

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
  const directUsersCount = getDirectUsersCount(company, review);
  const membersCount = getUnifiedUsersCount(review, company);
  const externalMembersCount = Math.max(0, membersCount - directUsersCount);

  const tooltipDiffText = `جدول users (${formatNumber(directUsersCount)}) يحسب الحسابات التي شركتها الأساسية هي هذه الشركة فقط، بينما الأعضاء (${formatNumber(membersCount)}) في جدول user_companies يشمل جميع عضويات الوصول للشركة بما فيها الأعضاء المرتبطون من شركات أخرى.`;

  // الاتجاه مقارنة بالشهر السابق لا يُعرض إلا لو البيانات موجودة فعلاً في رد الـ API
  const kpis = [
    {
      key: "users",
      testId: "kpi-direct-users",
      icon: Users,
      label: "المستخدمون",
      value: formatNumber(directUsersCount),
      hint: "المسجلون مباشرة على الشركة (جدول users)",
      tooltip: "عدد المستخدمين الأساسيين المرتبطين مباشرة بهذه الشركة في جدول users",
      trend: null,
    },
    {
      key: "customers",
      testId: "kpi-customers",
      icon: Building2,
      label: "العملاء",
      value: formatNumber(customersCount),
      hint: undefined,
      tooltip: undefined,
      trend: null,
    },
    {
      key: "orders",
      testId: "kpi-orders",
      icon: ShoppingBag,
      label: "طلبات الشهر",
      value: formatNumber(ordersThisMonth),
      hint: undefined,
      tooltip: undefined,
      trend: null,
    },
    {
      key: "apps",
      testId: "kpi-active-apps",
      icon: Boxes,
      label: "الأدوات النشطة",
      value: formatNumber(activeApps),
      hint: undefined,
      tooltip: undefined,
      trend: null,
    },
  ];

  const membershipExplanation =
    externalMembersCount > 0
      ? `عضويات user_companies شاملة ${formatNumber(externalMembersCount)} ${externalMembersCount === 1 ? "عضو" : "أعضاء"} من شركات أخرى (الفرق عن جدول users: ${formatNumber(directUsersCount)} مستخدم أساسي)`
      : directUsersCount === membersCount
        ? `عضويات user_companies مطابقة للمستخدمين الأساسيين في جدول users (${formatNumber(directUsersCount)})`
        : `عضويات user_companies المسجلة (${formatNumber(membersCount)}) من أصل ${formatNumber(directUsersCount)} مستخدم أساسي`;

  return (
    <div className="border-t border-border/50 pt-3 space-y-3" data-testid="unified-kpi-bar">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((item) => (
          <MetricCard
            key={item.key}
            testId={item.testId}
            icon={item.icon}
            label={item.label}
            value={item.value}
            hint={item.hint}
            tooltip={item.tooltip}
            trend={item.trend}
          />
        ))}
      </div>

      {/* مقياس منفصل ومسمّى بوضوح لعضويات user_companies */}
      <div
        data-testid="memberships-metric-card"
        title={tooltipDiffText}
        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/25 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            <UserCheck className="size-4" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-foreground">الأعضاء</span>
            <span className="text-lg font-black tracking-tight text-foreground" data-testid="memberships-metric-value">
              {formatNumber(membersCount)}
            </span>
            <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
              عضويات user_companies
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
          <button
            type="button"
            title={tooltipDiffText}
            aria-label={tooltipDiffText}
            data-testid="memberships-diff-tooltip"
            className="inline-flex shrink-0 items-center justify-center rounded-full text-sky-600 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-400"
          >
            <Info className="size-3.5" />
          </button>
          <span title={tooltipDiffText}>{membershipExplanation}</span>
        </div>
      </div>
    </div>
  );
}
