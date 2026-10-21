import React from "react";
import {
  Users, Layers, Plus, Pencil, Trash2, Eye, Send, ListFilter,
  Clock, Loader2, Copy, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerList } from "./types";
import { criteriaSummary, formatDate } from "./criteriaUtils";

interface CustomerListsGridProps {
  loading: boolean;
  lists: CustomerList[];
  searchTerm: string;
  filterType: "all" | "custom" | "default";
  refreshingId: string | null;
  onCreate: () => void;
  onOpenDetail: (list: CustomerList) => void;
  onWhatsAppSend: (list: CustomerList) => void;
  onEdit: (list: CustomerList) => void;
  onDuplicate: (list: CustomerList) => void;
  onRefreshCount: (list: CustomerList) => void;
  onDeleteRequest: (list: CustomerList) => void;
}

export const CustomerListsGrid: React.FC<CustomerListsGridProps> = ({
  loading,
  lists,
  searchTerm,
  filterType,
  refreshingId,
  onCreate,
  onOpenDetail,
  onWhatsAppSend,
  onEdit,
  onDuplicate,
  onRefreshCount,
  onDeleteRequest,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5 shadow-sm"
          >
            <Skeleton className="mb-3 h-5 w-1/3" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-4 h-4 w-2/3" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-6 py-16 text-center sm:rounded-3xl">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
          <Layers className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[color:var(--color-foreground)]">لا توجد قوائم بعد</p>
          <p className="max-w-sm text-sm text-[color:var(--color-muted-foreground)]">
            {searchTerm || filterType !== "all"
              ? "لم يتم العثور على قوائم تطابق البحث."
              : "أنشئ أول قائمة عملاء ذكية لاستهداف حملاتك بشكل دقيق."}
          </p>
        </div>
        {!searchTerm && filterType === "all" && (
          <Button className="rounded-full" onClick={onCreate}>
            <Plus className="size-4" /> إنشاء قائمة جديدة
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {lists.map((list) => (
        <div
          key={list.id}
          className="group flex flex-col rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-raised sm:rounded-3xl"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
                <Users className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-[color:var(--color-foreground)]">{list.name}</h3>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  {list.isDefault ? "قائمة افتراضية" : formatDate(list.updatedAt)}
                </p>
              </div>
            </div>
            {list.isDefault && (
              <Badge className="shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--color-info)_15%,var(--color-card))] text-[color:var(--color-info)]">
                افتراضية
              </Badge>
            )}
          </div>

          {list.description ? (
            <p className="mb-3 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
              {list.description}
            </p>
          ) : null}

          <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:var(--color-muted)] px-2.5 py-1 text-[11px] text-[color:var(--color-muted-foreground)]">
            <ListFilter className="size-3" />
            {criteriaSummary(list.criteria)}
          </div>

          <div className="mb-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums font-mono text-[color:var(--color-foreground)]">
              {list.count.toLocaleString("ar-EG")}
            </span>
            <span className="text-sm text-[color:var(--color-muted-foreground)]">عميل</span>
            {!list.isDefault && list.isStale ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                title="لم يتم تحديث هذا العدد منذ أكثر من 7 أيام"
              >
                <Clock className="size-3" /> قديم
              </span>
            ) : null}
          </div>

          <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] pt-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onOpenDetail(list)}
            >
              <Eye className="size-3.5" /> الأعضاء
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => onWhatsAppSend(list)}
            >
              <Send className="size-3.5" /> واتساب
            </Button>
            {!list.isDefault && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onEdit(list)}
                >
                  <Pencil className="size-3.5" /> تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onDuplicate(list)}
                  title="نسخ قائمة مشابهة"
                >
                  <Copy className="size-3.5" /> نسخ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onRefreshCount(list)}
                  disabled={refreshingId === list.id}
                  aria-label="تحديث العدد"
                >
                  {refreshingId === list.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto rounded-full text-destructive hover:text-destructive"
                  onClick={() => onDeleteRequest(list)}
                  aria-label="حذف"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
