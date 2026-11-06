import type { ElementType } from "react";
import { Activity, CreditCard, Ticket, Users, Wallet } from "lucide-react";
import type { CompanyReview, ActivityEntry } from "./companyDetailsTypes";
import { Card, CardContent } from "../../../components/ui/card";
import { formatCurrency, formatNumber, formatRelativeDateLabel, getStatusMeta } from "./helpers";

export function CompanyPulse({ review, reviewCurrency, openTickets, recentActivity, activeUsers }: {
  review: CompanyReview | null;
  reviewCurrency: string;
  openTickets: number;
  recentActivity: ActivityEntry | null;
  activeUsers: number;
}) {
  const balance = review?.wallet?.balance || 0;
  const monthlyFee = review?.subscription?.monthlyFee || 0;
  const subStatus = review?.subscription?.status || "ACTIVE";
  const subMeta = getStatusMeta("subscription", subStatus);
  // رصيد صفر أو أقل من قيمة التجديد = خطر، مش لون نجاح
  const walletTone: "success" | "warning" | "danger" =
    balance <= 0 ? "danger" : monthlyFee > 0 && balance < monthlyFee ? "warning" : "success";
  const subTone: "success" | "warning" | "danger" =
    subStatus === "ACTIVE" ? "success" : subStatus === "EXPIRED" || subStatus === "CANCELLED" ? "danger" : "warning";

  return (
    <Card className="rounded-2xl border border-border/50 bg-card/70 shadow-xs">
      <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
        <PulseItem
          icon={Users}
          label="الأعضاء النشطون"
          value={`${formatNumber(activeUsers)} عضو`}
        />
        <PulseItem
          icon={CreditCard}
          label="حالة الاشتراك"
          value={subMeta.label}
          tone={subTone}
        />
        <PulseItem
          icon={Wallet}
          label="رصيد المحفظة"
          value={formatCurrency(balance, reviewCurrency)}
          tone={walletTone}
        />
        <PulseItem
          icon={Ticket}
          label="تذاكر مفتوحة"
          value={`${formatNumber(openTickets)} تذكرة`}
          tone={openTickets > 0 ? "warning" : undefined}
        />
        <PulseItem
          icon={Activity}
          label="آخر نشاط"
          value={recentActivity ? formatRelativeDateLabel(recentActivity.createdAt) : "لا يوجد"}
        />
      </CardContent>
    </Card>
  );
}

function PulseItem({ icon: Icon, label, value, tone }: {
  icon: ElementType;
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass = tone === "success"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "warning"
    ? "text-amber-600 dark:text-amber-400"
    : tone === "danger"
    ? "text-rose-600 dark:text-rose-400"
    : "text-foreground";

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className={`text-sm font-black leading-tight ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}
