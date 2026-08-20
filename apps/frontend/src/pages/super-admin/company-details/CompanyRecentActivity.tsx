import { Activity, Clock } from "lucide-react";
import type { ActivityEntry } from "./companyDetailsTypes";
import { formatDateTime } from "./helpers";
import { Badge } from "../../../components/ui/badge";
import { EmptyState } from "./EmptyState";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300",
  MEDIUM: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300",
  LOW: "border-border/50 bg-muted/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  AUTH: "دخول",
  CONVERSATIONS: "محادثات",
  BILLING: "فوترة",
  SETTINGS: "إعدادات",
  PRODUCTS: "منتجات",
  ORDERS: "طلبات",
  CUSTOMERS: "عملاء",
  SYSTEM: "نظام",
};

export function CompanyRecentActivity({ activities, loading }: {
  activities: ActivityEntry[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return <EmptyState icon={Activity} message="لم يتم تسجيل أي نشاط حديث لهذه الشركة." />;
  }

  return (
    <div className="space-y-1">
      {activities.slice(0, 8).map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <Clock className="size-3 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{entry.description}</span>
              <Badge variant="outline" className={SEVERITY_COLORS[entry.severity] || ""}>
                {entry.severity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[entry.category] || entry.category} • {formatDateTime(entry.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
