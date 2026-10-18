import { ShipmentRowItem } from "./ShipmentStatementTable";

export interface ShipmentStatusBadgeResult {
  label: string;
  className: string;
}

/**
 * Maps shipment status strings to human-readable Arabic labels and chassis badge styling
 */
export function getShipmentStatusBadge(status: string, shipment?: ShipmentRowItem): ShipmentStatusBadgeResult {
  const s = String(shipment?.order?.turboShipmentStatus || status || "").toLowerCase().trim();

  if (["incomplete", "status_18", "status_99", "18", "99"].includes(s) || s.includes("غير مكتمل")) {
    return {
      label: "غير مكتملة",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    };
  }
  if (
    ["turbo_sent", "sent", "waiting", "pending", "status_1", "status_2", "1", "2", "booked"].includes(s) ||
    s.includes("انتظار") || s.includes("بانتظار")
  ) {
    return {
      label: "قيد الإنتظار",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
    };
  }
  if (["turbo_saved", "created", "draft"].includes(s)) {
    return {
      label: "مسودة محلية",
      className: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20",
    };
  }
  if (["processing", "underway", "accepted", "status_3", "3"].includes(s) || s.includes("تنفيذ")) {
    return {
      label: "قيد التنفيذ",
      className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20",
    };
  }
  if (["out_for_delivery", "under delivery", "with captain", "in transit", "shipped", "status_4", "4"].includes(s) || s.includes("مسلمة للمندوب")) {
    return {
      label: "مسلمة للمندوب",
      className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20",
    };
  }
  if (["delayed", "on hold", "status_13", "13"].includes(s) || s.includes("مؤجل")) {
    return {
      label: "مؤجلة مع المندوب",
      className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium",
    };
  }
  if (["delivered", "completed", "status_7", "7"].includes(s) || s.includes("تسليم")) {
    return {
      label: "تم التسليم",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold",
    };
  }
  if (["returned_to_company", "returned with company", "returned", "status_5", "status_14", "5", "14"].includes(s)) {
    return {
      label: "مرتجعات في الشركة",
      className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-semibold",
    };
  }
  if (["returned_destroyed", "status_12", "status_17", "12", "17"].includes(s) || s.includes("معدوم")) {
    return {
      label: "مرتجعات معدومة",
      className: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
    };
  }
  if (["returned_missing", "lost", "status_11", "status_16", "11", "16"].includes(s) || s.includes("مفقود")) {
    return {
      label: "مرتجعات مفقودة",
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20",
    };
  }
  if (["returned_resent", "status_10", "status_15", "10", "15"].includes(s) || s.includes("ارسال")) {
    return {
      label: "معاد ارسالها",
      className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20",
    };
  }
  if (["remitted", "supplied", "status_8", "status_19", "8", "19"].includes(s) || s.includes("توريد")) {
    return {
      label: "تم التوريد",
      className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold",
    };
  }
  if (["returned_received", "status_20", "20"].includes(s) || s.includes("وصلتني")) {
    return {
      label: "مرتجعات وصلتني",
      className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 font-semibold",
    };
  }
  if (["cancelled", "status_6", "6"].includes(s) || s.includes("ملغي")) {
    return {
      label: "ملغي",
      className: "bg-muted text-muted-foreground border border-border/70",
    };
  }

  return {
    label: status || "غير محدد",
    className: "bg-muted text-muted-foreground border border-border/70",
  };
}
