import type { ElementType } from "react";
import { Activity, CreditCard, Ticket, Users, Wallet } from "lucide-react";
import type { CompanyReview, ActivityEntry } from "./companyDetailsTypes";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
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
  const walletOk = balance >= monthlyFee;

  return (
    <Card className="rounded-2xl border border-border/50 bg-card/70 shadow-xs">
      <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
        <PulseItem
          icon={Users}
          label="الأعضاء النشطون"
          value={`${formatNumber(activeUsers)} عضو`}
          badge="success"
        />
        <PulseItem
          icon={CreditCard}
          label="حالة الاشتراك"
          value={subMeta.label}
          badgeClassName={subMeta.className}
        />
        <PulseItem
          icon={Wallet}
          label="رصيد المحفظة"
          value={formatCurrency(balance, reviewCurrency)}
          badge={walletOk ? "success" : balance === 0 ? undefined : "warning"}
        />
        <PulseItem
          icon={Ticket}
          label="تذاكر مفتوحة"
          value={`${formatNumber(openTickets)} تذكرة`}
          badge={openTickets > 0 ? "warning" : undefined}
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

function PulseItem({ icon: Icon, label, value, badge, badgeClassName }: {
  icon: ElementType;
  label: string;
  value: string;
  badge?: "success" | "warning";
  badgeClassName?: string;
}) {
  const badgeClass = badgeClassName || (
    badge === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
      : badge === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300"
      : "border-border/50 bg-muted/30 text-foreground"
  );

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <Badge variant="outline" className={`font-bold px-2.5 py-0.5 text-xs ${badgeClass}`}>
        {value}
      </Badge>
    </div>
  );
}
