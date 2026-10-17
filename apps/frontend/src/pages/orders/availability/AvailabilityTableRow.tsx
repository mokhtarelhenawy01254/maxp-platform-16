import React from "react";
import { Link } from "react-router-dom";
import { ArchiveBoxIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { Switch } from "../../../components/ui/switch";
import { getImageUrl } from "../../../utils/imageUrl";
import {
  AvailabilityRow,
  STOCK_STATUS_META,
  getStockStatus,
  toDateInputValue,
  formatSafeDate,
} from "./availabilityTypes";

interface AvailabilityTableRowProps {
  row: AvailabilityRow;
  index: number;
  startIndex: number;
  savingKey: string | null;
  toggleField: (row: AvailabilityRow, field: "trackInventory" | "isPreOrder", value: boolean) => void;
  savePreOrderDate: (row: AvailabilityRow, dateValue: string) => void;
  formatPrice: (amount: number) => string;
}

export const AvailabilityTableRow: React.FC<AvailabilityTableRowProps> = ({
  row,
  index,
  startIndex,
  savingKey,
  toggleField,
  savePreOrderDate,
  formatPrice,
}) => {
  const status = STOCK_STATUS_META[getStockStatus(row)];
  const imageUrl = row.image ? getImageUrl(row.image) : null;
  const trackSaving = savingKey === `${row.id}:trackInventory`;
  const preOrderSaving = savingKey === `${row.id}:isPreOrder`;
  const preOrderDateSaving = savingKey === `${row.id}:preOrderDate`;

  return (
    <tr className="hover:bg-muted/40 transition-colors border-b border-border/50">
      {/* Row Index */}
      <td className="px-3 py-3 text-center text-xs text-muted-foreground font-mono tabular-nums">
        {startIndex + index + 1}
      </td>

      {/* Product Image & Title */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={row.name}
              className="h-10 w-10 rounded-xl object-cover border border-border/70 shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-muted border border-border/70 flex items-center justify-center shrink-0">
              <ArchiveBoxIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <Link
              to={`/products/${row.id}/edit`}
              className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-xs"
            >
              {row.name}
            </Link>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {row.sku || "—"}
              {row.variantsCount > 0 ? ` • ${row.variantsCount} خيار` : ""}
            </p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.categoryName || "—"}
      </td>

      {/* Price */}
      <td className="px-3 py-3 text-center font-mono tabular-nums whitespace-nowrap">
        <span className="text-xs sm:text-sm font-semibold text-foreground">
          {formatPrice(row.price)}
        </span>
      </td>

      {/* Stock Quantity */}
      <td className="px-3 py-3 text-center font-mono tabular-nums whitespace-nowrap">
        <span
          className={`text-xs sm:text-sm font-bold ${
            row.stock === 0
              ? "text-rose-600 dark:text-rose-400"
              : row.stock <= 5
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
          }`}
        >
          {row.stock}
        </span>
      </td>

      {/* Status Badge */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              row.stock === 0
                ? "bg-rose-500"
                : row.stock <= 5
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
          />
          {status.label}
        </span>
      </td>

      {/* Track Inventory Switch */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <div className="flex flex-col items-center gap-1">
          <Switch
            size="sm"
            checked={row.trackInventory}
            disabled={trackSaving}
            onCheckedChange={(val) => toggleField(row, "trackInventory", Boolean(val))}
          />
          <span
            className={`text-[10px] font-semibold ${
              row.trackInventory ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {row.trackInventory ? "مفعل" : "معطل"}
          </span>
        </div>
      </td>

      {/* Pre-Order Switch */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <div className="flex flex-col items-center gap-1">
          <Switch
            size="sm"
            checked={row.isPreOrder}
            disabled={preOrderSaving}
            onCheckedChange={(val) => toggleField(row, "isPreOrder", Boolean(val))}
          />
          <span
            className={`text-[10px] font-semibold ${
              row.isPreOrder ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
            }`}
          >
            {row.isPreOrder ? "مفعل" : "معطل"}
          </span>
        </div>
      </td>

      {/* Pre-Order Date Input */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        {row.isPreOrder ? (
          <div className="flex flex-col items-center gap-1">
            <input
              type="date"
              value={toDateInputValue(row.preOrderDate)}
              disabled={preOrderDateSaving}
              onChange={(e) => savePreOrderDate(row, e.target.value)}
              className="h-7 w-[125px] rounded-lg border border-border/70 bg-background px-2 text-xs text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
            />
            {row.preOrderDate && (
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                {formatSafeDate(row.preOrderDate, "ar-EG")}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <Link
          to={`/products/${row.id}/edit`}
          className="inline-flex p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
          title="تعديل المنتج"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
};
