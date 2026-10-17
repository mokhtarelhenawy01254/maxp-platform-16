import { format } from "date-fns";
import { toast } from "sonner";
import { ShipmentRowItem } from "./ShipmentStatementTable";
import { getShipmentStatusBadge } from "./shipmentStatusBadge";

export const formatSafeShipmentDate = (dateVal: string | Date | null | undefined): string => {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return format(d, "yyyy-MM-dd HH:mm");
  } catch {
    return "-";
  }
};

/**
 * Exports current shipments array to a downloadable CSV manifest with UTF-8 BOM
 */
export function exportShipmentsCsv(shipments: ShipmentRowItem[]) {
  if (shipments.length === 0) {
    toast.error("لا توجد شحنات في العرض الحالي لتصديرها");
    return;
  }

  const headers = [
    "رقم الشحنة",
    "رقم الطلب",
    "تاريخ الطلب",
    "اسم العميل",
    "هاتف العميل",
    "المحافظة",
    "المدينة",
    "العنوان التفصيلي",
    "شركة الشحن",
    "نوع الربط",
    "رقم البوليصة والتتبع (AWB)",
    "مندوب التوصيل",
    "هاتف المندوب",
    "فرع الشحن",
    "هاتف الفرع",
    "الفرع المتوقع",
    "سبب التأجيل",
    "سبب الإرجاع",
    "قيمة التحصيل COD",
    "المبلغ المستلم",
    "الحالة",
  ];

  const rows = shipments.map((s) => [
    s.id,
    s.order?.orderNumber || s.orderId || "",
    formatSafeShipmentDate(s.createdAt),
    s.order?.customerName || s.order?.customer?.name || "",
    s.order?.customerPhone || s.order?.customer?.phone || "",
    s.destinationGovernorate || s.order?.governorate || "",
    s.destinationCity || s.order?.city || "",
    s.destinationAddress || "",
    s.shippingCompany?.name || s.carrierType || "يدوي",
    s.shippingCompany?.integrationMode || "MANUAL",
    s.trackingNumber || s.externalShipmentId || "",
    s.captainName || "",
    s.captainPhone || "",
    s.branchName || "",
    s.branchPhone || "",
    s.expectedBranch || "",
    s.delayReason || "",
    s.returnReason || "",
    s.order?.total || s.cost || 0,
    s.receivedAmount || 0,
    getShipmentStatusBadge(s.status, s).label,
  ]);

  const csvContent =
    "\uFEFF" +
    [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `shipment_statement_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("تم تصدير بيان تفاصيل الشحنات بنجاح");
}
