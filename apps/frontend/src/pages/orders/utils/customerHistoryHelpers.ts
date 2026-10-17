export const formatRelativeDays = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    if (diffDays <= 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    if (diffDays <= 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
    return "منذ أكثر من سنة";
  } catch {
    return "";
  }
};

export interface SuccessRateBadgeInfo {
  label: string;
  className: string;
  category: "excellent" | "medium" | "low" | "none";
}

export const getSuccessRateBadge = (
  rate: number | null | undefined,
): SuccessRateBadgeInfo => {
  if (rate == null) {
    return {
      label: "لا توجد بيانات تسليم بعد",
      className: "bg-muted text-muted-foreground border-border/70",
      category: "none",
    };
  }
  if (rate >= 80) {
    return {
      label: `${rate}% نسبة استلام ممتازة`,
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      category: "excellent",
    };
  }
  if (rate >= 50) {
    return {
      label: `${rate}% نسبة استلام متوسطة`,
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      category: "medium",
    };
  }
  return {
    label: `${rate}% نسبة استلام منخفضة (حذر)`,
    className:
      "bg-destructive/10 text-destructive border-destructive/30",
    category: "low",
  };
};
