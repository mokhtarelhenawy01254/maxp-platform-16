import { useMemo, useState } from "react";
import { Activity, Clock, Search } from "lucide-react";
import type { ActivityEntry } from "./companyDetailsTypes";
import { formatDateTime, formatActivityTimeline, getStatusMeta } from "./helpers";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
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

const PAGE_SIZE = 15;

export function CompanyRecentActivity({ activities, loading }: {
  activities: ActivityEntry[];
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // بحث في نص الحركة/التفاصيل + فلتر بالفئة
  const decorated = useMemo(
    () =>
      activities.map((entry) => {
        const timeline = formatActivityTimeline(entry);
        return {
          entry,
          timeline,
          categoryLabel: CATEGORY_LABELS[entry.category] || entry.category || "عام",
          haystack: `${timeline.actionText} ${timeline.detailText || ""} ${CATEGORY_LABELS[entry.category] || entry.category || ""}`.toLowerCase(),
        };
      }),
    [activities],
  );

  const categories = useMemo(() => {
    const present = new Set(activities.map((entry) => entry.category).filter(Boolean));
    return ["ALL", ...Array.from(present)];
  }, [activities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decorated.filter(
      (row) => (category === "ALL" || row.entry.category === category) && (!q || row.haystack.includes(q)),
    );
  }, [decorated, query, category]);

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

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE); }}
            placeholder="ابحث في النشاط (الحدث، المستخدم، الفئة)..."
            className="h-10 rounded-xl pr-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
          {categories.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { setCategory(key); setVisible(PAGE_SIZE); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                category === key
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "ALL" ? "الكل" : CATEGORY_LABELS[key] || key}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-medium text-muted-foreground">
        المعروض: {shown.length} من {filtered.length} حركة
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={Search} message="لا يوجد نشاط مطابق للبحث أو الفلتر الحالي." />
      ) : (
        <div className="space-y-2">
          {shown.map(({ entry, timeline, categoryLabel }) => {
            const severityMeta = getStatusMeta("activity", entry.severity);
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
      )}

      {filtered.length > shown.length ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
          >
            عرض {Math.min(PAGE_SIZE, filtered.length - shown.length)} حركة أخرى
          </Button>
        </div>
      ) : null}
    </div>
  );
}
