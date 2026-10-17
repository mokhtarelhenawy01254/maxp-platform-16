import { AvailabilityRow, formatSafeDate, getStockStatus } from "./availabilityTypes";

export function exportAvailabilityCsv(rows: AvailabilityRow[]) {
  const headers = [
    "الاسم",
    "كود SKU",
    "القسم",
    "السعر",
    "الكمية",
    "تتبع المخزون",
    "طلب مسبق",
    "تاريخ الطلب المسبق",
    "الحالة",
  ];

  const rowsData = rows.map((row) => [
    row.name,
    row.sku,
    row.categoryName,
    row.price,
    row.stock,
    row.trackInventory ? "نعم" : "لا",
    row.isPreOrder ? "نعم" : "لا",
    row.preOrderDate ? formatSafeDate(row.preOrderDate, "en-CA") : "",
    getStockStatus(row),
  ]);

  const csv = [headers, ...rowsData]
    .map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `products-availability-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
