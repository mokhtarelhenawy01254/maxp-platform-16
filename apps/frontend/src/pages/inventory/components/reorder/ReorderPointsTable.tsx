import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  ArchiveBoxIcon,
  PencilSquareIcon,
  CheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Input } from "../../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { getImageUrl } from "../../../../utils/imageUrl";
import { STATUS_META, type ReorderItem, type ReorderView } from "./types";

interface ReorderPointsTableProps {
  items: ReorderItem[];
  view: ReorderView;
  loading: boolean;
  selectedIds: Set<string>;
  editingId: string | null;
  editValue: string;
  savingId: string | null;
  sortBy: string;
  sortDir: "asc" | "desc";
  onToggleAll: () => void;
  onToggleSelection: (key: string, item: ReorderItem) => void;
  onStartEdit: (item: ReorderItem) => void;
  onSaveSingle: (item: ReorderItem) => void;
  onCancelEdit: () => void;
  onEditValueChange: (val: string) => void;
  onToggleSort: (field: string) => void;
  rowKey: (item: ReorderItem) => string;
  hasInventory: (item: ReorderItem) => boolean;
}

export const ReorderPointsTable: React.FC<ReorderPointsTableProps> = ({
  items,
  view,
  loading,
  selectedIds,
  editingId,
  editValue,
  savingId,
  sortBy,
  sortDir,
  onToggleAll,
  onToggleSelection,
  onStartEdit,
  onSaveSingle,
  onCancelEdit,
  onEditValueChange,
  onToggleSort,
  rowKey,
  hasInventory,
}) => {
  const { t } = useTranslation();

  const urgencyMeta = (urgency?: string) => {
    if (urgency === "critical") return { label: "حرج", className: "bg-red-100 text-red-700" };
    if (urgency === "warning") return { label: "تحذير", className: "bg-orange-100 text-orange-700" };
    if (urgency === "moderate") return { label: "متوسط", className: "bg-yellow-100 text-yellow-700" };
    return { label: "آمن", className: "bg-emerald-100 text-emerald-700" };
  };

  const sortableHead = (field: string, label: string) => (
    <button
      type="button"
      onClick={() => onToggleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
    >
      {label}
      {sortBy === field ? (
        <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
      ) : null}
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <CheckCircleIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          {t("reorderPoints.empty", "لا توجد بيانات مطابقة")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === items.length && items.length > 0}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
            </TableHead>
            <TableHead>{sortableHead("name", t("reorderPoints.colProduct", "المنتج"))}</TableHead>
            <TableHead>{t("reorderPoints.colStatus", "الحالة")}</TableHead>
            {view === "warehouse" ? (
              <TableHead>{t("reorderPoints.colWarehouse", "المخزن")}</TableHead>
            ) : null}
            <TableHead>{sortableHead("available", t("reorderPoints.colAvailable", "المتبقي"))}</TableHead>
            <TableHead>{sortableHead("reorderPoint", t("reorderPoints.colReorder", "النقطة"))}</TableHead>
            <TableHead>{t("reorderPoints.colPreOrder", "طلب مسبق")}</TableHead>
            <TableHead>{sortableHead("daysUntilStockout", t("reorderPoints.colDays", "أيام النفاد"))}</TableHead>
            <TableHead>{t("reorderPoints.colSuggested", "مقترح")}</TableHead>
            <TableHead className="w-20">{t("reorderPoints.colActions", "")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = STATUS_META[item.status];
            const key = rowKey(item);
            const isEditing = editingId === key;
            const isSaving = savingId === key;
            const urgency = urgencyMeta(item.urgency);
            const imageUrl = item.image ? getImageUrl(item.image) : null;
            const canEditPoint = hasInventory(item);

            return (
              <TableRow key={key}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(key)}
                    disabled={!canEditPoint}
                    onChange={() => onToggleSelection(key, item)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-30"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums font-mono">
                        {item.sku}
                        {item.categoryName ? ` • ${item.categoryName}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </TableCell>
                {view === "warehouse" ? (
                  <TableCell>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {item.warehouseName || "—"}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell>
                  <span className={`text-sm font-bold tabular-nums font-mono ${item.status === "out" ? "text-red-600" : item.status === "low" ? "text-yellow-600" : "text-gray-900 dark:text-white"}`}>
                    {item.available}
                  </span>
                  {item.reserved > 0 ? (
                    <span className="text-xs text-gray-400 mr-1 tabular-nums font-mono">
                      (+{item.reserved} محجوز)
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {!canEditPoint ? (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {t("reorderPoints.noInventory", "بلا سجلات مخزون")}
                      </span>
                      <span className="text-[11px] text-gray-400/70">
                        {t("reorderPoints.noInventoryHint", "أضف مخزوناً أولاً من صفحة إدارة المخزون")}
                      </span>
                    </div>
                  ) : isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(event) => onEditValueChange(event.target.value)}
                        className="w-20 h-8 text-sm tabular-nums font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => onSaveSingle(item)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEdit}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tabular-nums font-mono ${item.status === "low" || item.status === "out" ? "text-yellow-600" : "text-gray-900 dark:text-white"}`}>
                        {item.reorderPoint}
                      </span>
                      <button
                        type="button"
                        onClick={() => onStartEdit(item)}
                        className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer"
                        title={t("reorderPoints.edit", "تعديل النقطة") as string}
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${item.isPreOrder ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {item.isPreOrder
                        ? t("reorderPoints.preOrderOn", "مفعل")
                        : t("reorderPoints.preOrderOff", "معطل")}
                    </span>
                    {item.preOrderDate ? (
                      <span className="text-[11px] text-gray-400 tabular-nums font-mono">
                        {new Date(item.preOrderDate).toLocaleDateString("ar-EG")}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums font-mono">
                      {item.daysUntilStockout === 999
                        ? "∞"
                        : item.daysUntilStockout}
                    </span>
                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${urgency.className}`}>
                      {urgency.label}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums font-mono">
                      {item.suggestedReorder || "—"}
                    </span>
                    {typeof item.dailyAvgSales === "number" && item.dailyAvgSales > 0 ? (
                      <span className="text-[11px] text-gray-400 tabular-nums font-mono">
                        {t("reorderPoints.perDay", "{{count}}/يوم").replace(
                          "{{count}}",
                          String(item.dailyAvgSales),
                        )}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={!canEditPoint}
                    onClick={() => onStartEdit(item)}
                    className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title={t("reorderPoints.edit", "تعديل النقطة") as string}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
