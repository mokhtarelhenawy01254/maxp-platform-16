import React from "react";
import {
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
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

const STATUS_TONE_CLASSES: Record<ProductPageConversionSummaryCardProps["statusTone"], string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  inactive:
    "border-gray-200 bg-white/70 text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
};

export default function ProductPageConversionSummaryCard({
  items,
  statusLabel,
  statusTone,
  ctaLabel,
  loading = false,
  onManage,
  showManageButton = true,
}: ProductPageConversionSummaryCardProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              <SparklesIcon className="h-3.5 w-3.5" />
              Conversion Suite
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${STATUS_TONE_CLASSES[statusTone]}`}
            >
              {statusLabel}
            </span>
          </div>
          <div>
            <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
              الأدوات المفعلة الآن
            </h4>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
              هذه هي الأدوات المرتبطة الآن بقرار الشراء داخل صفحة المنتج.
            </p>
          </div>
        </div>

        {showManageButton ? (
          <button
            type="button"
            onClick={onManage}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
              loading
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                : "border-indigo-200 bg-indigo-600 text-white hover:-translate-y-0.5 hover:bg-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            }`}
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            <span>{ctaLabel}</span>
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      item.enabled ? "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.14)]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {item.label}
                  </span>
                </div>
                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-black ${
                  item.enabled
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {item.enabled ? "On" : "Off"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
