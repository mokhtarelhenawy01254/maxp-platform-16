import React from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  Calendar,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  ListTodo,
  Plus,
  Stethoscope,
  Wrench,
} from "lucide-react";
import type {
  CustomerProfileVerticalCapabilities,
  CustomerProfileVerticalContext,
  CustomerProfileVerticalRecord,
} from "./types";

interface NormalizedRecord extends CustomerProfileVerticalRecord {
  recordKind: string;
}

export function extractVerticalRecords(
  context?: CustomerProfileVerticalContext | null,
): NormalizedRecord[] {
  if (!context) return [];
  const items: NormalizedRecord[] = [];
  const pushList = (
    list: CustomerProfileVerticalRecord[] | undefined,
    kind: string,
  ) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (item && item.id) {
        items.push({ ...item, recordKind: item.type || kind });
      }
    });
  };

  pushList(context.summary?.items, context.vertical || "record");
  pushList(context.records, context.vertical || "record");
  pushList(context.dentalCases, "dental_case");
  pushList(context.appointments, "appointment");
  pushList(context.serviceOrders, "service_order");
  pushList(context.tasks, "task");
  pushList(context.enrollments, "enrollment");

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.recordKind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const KIND_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  dental_case: { label: "حالة معمل", icon: Stethoscope },
  appointment: { label: "موعد", icon: Calendar },
  service_order: { label: "طلب خدمة", icon: Wrench },
  task: { label: "مهمة", icon: ListTodo },
  enrollment: { label: "اشتراك", icon: GraduationCap },
};

interface CustomerVerticalRecordsTabProps {
  verticalContext?: CustomerProfileVerticalContext | null;
  verticalCapabilities?: CustomerProfileVerticalCapabilities;
  onPrimaryAction?: () => void;
}

export const CustomerVerticalRecordsTab: React.FC<
  CustomerVerticalRecordsTabProps
> = ({ verticalContext, verticalCapabilities, onPrimaryAction }) => {
  const records = extractVerticalRecords(verticalContext);

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 p-5 text-center space-y-2.5">
        <FolderKanban className="mx-auto h-9 w-9 text-muted-foreground/40" />
        <p className="text-xs font-medium text-muted-foreground">
          لا توجد {verticalCapabilities?.recordsTabLabel || "سجلات"} مسجلة لهذا العميل حتى الآن
        </p>
        {onPrimaryAction && verticalCapabilities?.primaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.97] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{verticalCapabilities.primaryAction.label}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {records.map((rec) => {
        const meta = KIND_META[rec.recordKind] || {
          label: verticalCapabilities?.recordsTabLabel || "سجل",
          icon: FolderKanban,
        };
        const KindIcon = meta.icon;
        const formattedDate = rec.date
          ? format(new Date(rec.date), "dd MMM yyyy", { locale: arSA })
          : null;

        return (
          <div
            key={`${rec.recordKind}-${rec.id}`}
            className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <KindIcon className="h-3 w-3" />
                    <span>{meta.label}</span>
                  </span>
                  {rec.code && (
                    <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                      #{rec.code}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground truncate">
                  {rec.title || (rec as any).patientName || (rec as any).serviceName || meta.label}
                </p>
                {rec.subtitle && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {rec.subtitle}
                  </p>
                )}
              </div>

              {rec.status && (
                <span className="shrink-0 rounded-full border border-border/50 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {rec.status}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
              <span className="tabular-nums">{formattedDate || "—"}</span>
              <div className="flex items-center gap-2">
                {typeof rec.amount === "number" && rec.amount > 0 && (
                  <span className="font-bold tabular-nums text-foreground">
                    <span className="font-mono">{rec.amount.toLocaleString()}</span>{" "}
                    <span>ج.م</span>
                  </span>
                )}
                {rec.href && (
                  <a
                    href={rec.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>عرض</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CustomerVerticalRecordsTab;
