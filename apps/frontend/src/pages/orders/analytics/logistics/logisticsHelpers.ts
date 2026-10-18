export const LIFECYCLE_STAGE_ORDER: Record<string, number> = {
  PENDING: 10,
  CONFIRMED: 20,
  SCHEDULED: 25,
  ON_HOLD: 30,
  ON_HOLD_PREP: 35,
  PROCESSING: 40,
  READY: 45,
  STOCK_SHORTAGE: 50,
  SHORTAGE_FAILED: 55,
  SHIPPED: 60,
  DELIVERED: 70,
  PARTIALLY_DELIVERED: 72,
  RETURNED: 80,
  PARTIALLY_RETURNED: 82,
  CANCELLED: 90,
  DUPLICATE_ORDER: 95,
  REFUNDED: 96,
  TRASH: 99,
};

export const getPaymentMethodLabel = (method: string): string => {
  if (!method) return "غير محدد";
  const normalized = method.trim().toUpperCase();
  switch (normalized) {
    case "CASH":
    case "COD":
      return "الدفع عند الاستلام (COD)";
    case "CREDIT_CARD":
    case "CARD":
    case "ONLINE":
      return "بطاقة بنكية / فيزا";
    case "FAWRY":
      return "فوري (Fawry)";
    case "WALLET":
    case "VODAFONE_CASH":
    case "INSTAPAY":
      return "إنستاباي / محفظة إلكترونية";
    case "BANK_TRANSFER":
      return "تحويل بنكي";
    case "PREPAID":
      return "دفع مسبق";
    default:
      return method;
  }
};

export const getStatusColor = (status: string): string => {
  const s = status.toUpperCase();
  if (s.includes("DELIVERED") || s.includes("COMPLETED")) return "bg-emerald-500";
  if (s.includes("CANCEL") || s.includes("REJECT") || s.includes("FAIL")) return "bg-rose-500";
  if (s.includes("RETURN") || s.includes("REFUND")) return "bg-amber-500";
  if (s.includes("SHIP") || s.includes("TRANSIT") || s.includes("OUT_FOR_DELIVERY")) return "bg-sky-500";
  if (s.includes("PENDING") || s.includes("HOLD") || s.includes("WAIT")) return "bg-amber-500";
  if (s.includes("PROCESS") || s.includes("PREP")) return "bg-indigo-500";
  if (s.includes("CONFIRM")) return "bg-blue-500";
  return "bg-zinc-500";
};
