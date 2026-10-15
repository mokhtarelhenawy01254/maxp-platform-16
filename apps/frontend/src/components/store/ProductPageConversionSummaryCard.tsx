import React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import type { ProductPageConversionSummaryItem } from "./productPageConversionSummaryItems";

interface ProductPageConversionSummaryCardProps {
  items: ProductPageConversionSummaryItem[];
  statusLabel: string;
  statusTone: "active" | "inactive" | "warning";
  ctaLabel: string;
  loading?: boolean;
  onManage: () => void;
  showManageButton?: boolean;
}

const STATUS_TONE_CLASSES: Record<
  ProductPageConversionSummaryCardProps["statusTone"],
  string
> = {
  active:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  inactive: "border-border/70 bg-muted/40 text-muted-foreground",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function ProductPageConversionSummaryCard({
  items = [],
  statusLabel,
  statusTone,
  ctaLabel,
  loading = false,
  onManage,
  showManageButton = true,
}: ProductPageConversionSummaryCardProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm text-card-foreground"
      dir="rtl"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary font-mono">
              <Sparkles className="w-3 h-3" />
              CONVERSION SUITE
            </span>
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_TONE_CLASSES[statusTone]}`}
            >
              {statusLabel}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              الأدوات المفعلة الآن لزيادة معدل التحويل
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              هذه هي الأدوات المؤثرة في قرارات الشراء المعروضة داخل صفحة المنتج.
            </p>
          </div>
        </div>

        {showManageButton && (
          <button
            type="button"
            onClick={onManage}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-2 text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{ctaLabel}</span>
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-border/60 bg-muted/20 p-3.5 hover:border-border transition-colors flex items-start justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.enabled
                      ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-xs font-semibold text-foreground">
                  {item.label}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border ${
                item.enabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border/50"
              }`}
            >
              {item.enabled ? "نشط" : "معطل"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
