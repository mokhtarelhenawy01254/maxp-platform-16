import React from "react";

export const parseTags = (tags: any): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const getStatusBadge = (
  status: string,
  statusOptions: { value: string; label: string; color: string }[],
) => {
  const statusOption = statusOptions.find((option) => option.value === status);
  if (!statusOption) return null;

  const colorClasses: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-800",
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-100 text-gray-800",
    purple: "bg-purple-100 text-purple-800",
    red: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colorClasses[statusOption.color] || "bg-gray-100 text-gray-800"
      }`}
    >
      {statusOption.label}
    </span>
  );
};

export const getRatingBadge = (rating: string | undefined, deliveryRate?: number | null) => {
  if (!rating || rating === "UNKNOWN") return null;
  const r = rating.toLowerCase();
  switch (r) {
    case "excellent":
      return (
        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full ring-1 ring-emerald-600/20 font-medium inline-flex items-center gap-1">
          <span>عميل ممتاز</span>
          {deliveryRate !== undefined && deliveryRate !== null && deliveryRate > 0 && (
            <span className="opacity-80 text-[10px] font-mono tabular-nums">({Math.round(deliveryRate)}%)</span>
          )}
        </span>
      );
    case "good":
      return (
        <span className="ml-2 text-xs bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 px-2 py-0.5 rounded-full ring-1 ring-sky-600/20 font-medium inline-flex items-center gap-1">
          <span>عميل جيد</span>
          {deliveryRate !== undefined && deliveryRate !== null && deliveryRate > 0 && (
            <span className="opacity-80 text-[10px] font-mono tabular-nums">({Math.round(deliveryRate)}%)</span>
          )}
        </span>
      );
    case "average":
      return (
        <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full ring-1 ring-amber-600/20 font-medium inline-flex items-center gap-1">
          <span>عميل متوسط</span>
          {deliveryRate !== undefined && deliveryRate !== null && deliveryRate > 0 && (
            <span className="opacity-80 text-[10px] font-mono tabular-nums">({Math.round(deliveryRate)}%)</span>
          )}
        </span>
      );
    case "poor":
    case "bad":
      return (
        <span className="ml-2 text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 rounded-full ring-1 ring-rose-600/20 font-medium inline-flex items-center gap-1">
          <span>عميل ضعيف</span>
          {deliveryRate !== undefined && deliveryRate !== null && (
            <span className="opacity-80 text-[10px] font-mono tabular-nums">({Math.round(deliveryRate)}%)</span>
          )}
        </span>
      );
    default:
      return null;
  }
};

export const getAutoDiscountBadge = (status: string | null | undefined) => {
  if (!status) return null;
  if (status === "AVAILABLE") {
    return (
      <span
        className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        title="عند العميل كوبون خصم فعّال على أوردره الجاي"
      >
        خصم متاح
      </span>
    );
  }
  if (status === "PRE_ACTIVATION") {
    return (
      <span
        className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        title="طلب قبل تفعيل نظام الولاء — الخصم التلقائي مش بيطبق عليه"
      >
        قبل تفعيل النظام
      </span>
    );
  }
  return null;
};

export const getTierBadge = (
  tier: { name?: string; nameAr?: string; color?: string } | null | undefined,
) => {
  if (!tier) return null;
  const label = tier.nameAr || tier.name || "عميل";
  const color = tier.color || "#6366f1";
  return (
    <span
      className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + "1A", color, border: `1px solid ${color}40` }}
      title={`مستوى الولاء: ${label}`}
    >
      {label}
    </span>
  );
};
