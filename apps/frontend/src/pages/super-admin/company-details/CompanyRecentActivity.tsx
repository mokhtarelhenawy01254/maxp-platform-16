import { Activity, Clock } from "lucide-react";
import type { ActivityEntry } from "./companyDetailsTypes";
import { formatDateTime, formatActivityTimeline, getStatusMeta } from "./helpers";
import { Badge } from "../../../components/ui/badge";
import { EmptyState } from "./EmptyState";

const CATEGORY_LABELS: Record<string, string> = {
  AUTH: "المصادقة والدخول",
  CONVERSATIONS: "المحادثات",
  BILLING: "الفوترة والمدفوعات",
  SETTINGS: "إعدادات الشركة",
  PRODUCTS: "المنتجات",
  ORDERS: "الطلبات",
  CUSTOMERS: "العملاء",
  SYSTEM: "النظام",
  TEAM: "إدارة الفريق",
  MARKETPLACE: "سوق التطبيقات",
};

export function CompanyRecentActivity({ activities, loading }: {
  activities: ActivityEntry[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return <EmptyState icon={Activity} message="لم يتم تسجيل أي نشاط حديث لهذه الشركة حتى الآن." />;
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 10).map((entry) => {
        const timeline = formatActivityTimeline(entry);
        const severityMeta = getStatusMeta("activity", entry.severity);
        const categoryLabel = CATEGORY_LABELS[entry.category] || entry.category || "عام";

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3.5 rounded-xl border border-border/40 bg-card/60 p-3.5 transition-colors hover:bg-muted/40"
          >
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">
                  {timeline.actionText}
                </span>
                <Badge variant="outline" className={severityMeta.className}>
                  {severityMeta.label}
                </Badge>
              </div>

              {timeline.detailText ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {timeline.detailText}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                <Badge variant="outline" className="border-border/50 bg-muted/30 px-2 py-0 text-[10px]">
                  {categoryLabel}
                </Badge>
                <span>•</span>
                <span>{formatDateTime(entry.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
