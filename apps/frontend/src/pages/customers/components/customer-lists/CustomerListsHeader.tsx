import React from "react";
import { Layers, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CustomerListsHeaderProps {
  onRefresh: () => void;
  onCreate: () => void;
}

export const CustomerListsHeader: React.FC<CustomerListsHeaderProps> = ({
  onRefresh,
  onCreate,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-soft sm:rounded-3xl sm:shadow-raised">
      <div className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-2 sm:gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:size-12 sm:rounded-2xl">
              <Layers className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0 space-y-1 sm:space-y-2">
              <Badge
                variant="outline"
                className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)] sm:px-2.5 sm:text-[10px]"
              >
                Customer Lists
              </Badge>
              <div className="space-y-0.5 sm:space-y-1">
                <h1 className="text-balance font-heading text-xl font-semibold tracking-normal text-[color:var(--color-foreground)] sm:text-[2rem]">
                  إدارة قوائم العملاء
                </h1>
                <p className="max-w-3xl text-xs leading-5 text-[color:var(--color-muted-foreground)] sm:text-sm sm:leading-6 sm:text-[0.95rem]">
                  أنشئ قوائم عملاء ذكية حسب النشاط والطلبات والمرتجعات، ثم أرسلها مباشرة عبر واتساب.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={onRefresh}
            >
              <RefreshCw className="size-4" /> تحديث
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              onClick={onCreate}
            >
              <Plus className="size-4" /> قائمة جديدة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
