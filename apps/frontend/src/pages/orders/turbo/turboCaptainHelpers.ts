export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  shipping: number;
  status: string;
  turboShipmentId: string;
  turboTrackingNumber: string;
  turboShipmentStatus: string;
  turboDelayReason: string | null;
  turboReturnReason: string | null;
  turboExpectedBranch: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
}

export interface CaptainInfo {
  name: string;
  phone: string | null;
  branch: string | null;
  branchPhone: string | null;
}

export interface Stats {
  total: number;
  delivered: number;
  returned: number;
  active: number;
  delayed: number;
  remitted: number;
  totalRevenue: number;
  totalShipping: number;
  deliveryRate: number;
  delayReasons: Record<string, number>;
  returnReasons: Record<string, number>;
}

export const statusBadgeClass = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "delivered" || s === "remitted")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  if (s.startsWith("returned"))
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
  if (s === "delayed")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  return "bg-primary/10 text-primary border border-primary/20";
};

export const statusArabic = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "delivered") return "تم التسليم";
  if (s === "remitted") return "تم التوريد";
  if (s.startsWith("returned")) return "مرتجع";
  if (s === "delayed") return "مؤجلة";
  if (s === "processing") return "قيد التنفيذ";
  if (s === "turbo_sent") return "قيد الانتظار";
  if (s === "turbo_saved") return "محفوظة";
  if (s === "out_for_delivery") return "مسلمة للمندوب";
  if (s === "created") return "منشأة";
  return s;
};
