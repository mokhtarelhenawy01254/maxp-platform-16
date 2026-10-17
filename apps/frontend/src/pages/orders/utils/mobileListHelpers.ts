export const toCompactRelativeTime = (timeStr: string): string => {
  if (!timeStr) return "";
  return timeStr
    .replace(/^منذ\s+/, "")
    .replace(/\s*دقيقة|\s*دقائق/, " د")
    .replace(/\s*ساعة|\s*ساعات/, " س")
    .replace(/\s*يوم|\s*أيام/, " ي")
    .replace(/\s*minutes?\s*ago/i, "m")
    .replace(/\s*hours?\s*ago/i, "h")
    .replace(/\s*days?\s*ago/i, "d")
    .replace(/\s*just now/i, "now");
};

export const formatMobileOrderNumber = (
  orderNumber: string | undefined,
  metadata?: { isIncompleteCart?: boolean; duplicate?: { duplicateOfOrderNumber?: string } },
): { rawNumber: string; compactOrderNumber: string } => {
  const isCartId = String(orderNumber || "").startsWith("cart_");
  const rawNumber =
    metadata?.isIncompleteCart || isCartId
      ? `INC-${String(orderNumber || "").replace(/^cart_/, "").slice(0, 8).toUpperCase()}`
      : orderNumber || "";
  const compactOrderNumber = rawNumber.replace(/^ORD-/, "");
  return { rawNumber, compactOrderNumber };
};
