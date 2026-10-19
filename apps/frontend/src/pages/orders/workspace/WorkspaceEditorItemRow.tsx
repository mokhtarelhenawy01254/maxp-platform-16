import React from "react";
import { PlusIcon, MinusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { WorkspaceOrderItem } from "./types";
import { getItemOptions } from "./workspaceItemVariantHelpers";

export interface WorkspaceEditorItemRowProps {
  item: WorkspaceOrderItem;
  index: number;
  itemsCount: number;
  isArabic: boolean;
  formatPrice: (amount: number) => string;
  customColorMode: Record<number, boolean>;
  customSizeMode: Record<number, boolean>;
  productVariantsMap: Record<string, any[]>;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onVariantAttributeChange: (index: number, newColor: string, newSize: string) => void;
  setCustomColorMode: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setCustomSizeMode: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export const WorkspaceEditorItemRow: React.FC<WorkspaceEditorItemRowProps> = ({
  item,
  index,
  itemsCount,
  isArabic,
  formatPrice,
  customColorMode,
  customSizeMode,
  productVariantsMap,
  onUpdateQuantity,
  onRemoveItem,
  onVariantAttributeChange,
  setCustomColorMode,
  setCustomSizeMode,
}) => {
  const { colors, sizes } = getItemOptions(item, productVariantsMap);
  const isCustomColor =
    customColorMode[index] ||
    (colors.length > 0 && item.productColor && !colors.includes(item.productColor));
  const isCustomSize =
    customSizeMode[index] ||
    (sizes.length > 0 && item.productSize && !sizes.includes(item.productSize));

  return (
    <div className="rounded-md border border-border/40 bg-muted/20 p-2 text-xs space-y-2">
      {/* Row 1: Image, Name, Price, Stepper & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {item.productImage && (
            <img
              src={item.productImage}
              alt=""
              className="h-8 w-8 rounded object-cover border border-border/40 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">
              {item.productName || item.name}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <span className="tabular-nums font-mono">{formatPrice(item.price)}</span>
              {item.productSku && (
                <span className="opacity-70 truncate font-mono">({item.productSku})</span>
              )}
            </div>
          </div>
        </div>

        {/* Stepper & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded border border-border/60 bg-background">
            <button
              type="button"
              onClick={() => onUpdateQuantity(index, -1)}
              disabled={item.quantity <= 1}
              className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              title={isArabic ? "تقليل" : "Decrease"}
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="min-w-[20px] text-center font-mono text-xs font-bold tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(index, 1)}
              className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
              title={isArabic ? "زيادة" : "Increase"}
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>

          <span className="min-w-[50px] text-end font-mono font-bold tabular-nums text-foreground">
            {formatPrice(item.quantity * item.price)}
          </span>

          <button
            type="button"
            onClick={() => onRemoveItem(index)}
            disabled={itemsCount <= 1}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
            title={isArabic ? "حذف البند" : "Remove item"}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: Color and Size Editor Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded bg-background/70 p-1.5 border border-border/40 text-[11px]">
        {/* Color Selector / Input */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
            {isArabic ? "اللون:" : "Color:"}
          </span>
          {colors.length > 0 && !isCustomColor ? (
            <div className="flex items-center gap-0.5">
              <select
                value={item.productColor || ""}
                onChange={(e) => {
                  if (e.target.value === "__CUSTOM__") {
                    setCustomColorMode((prev) => ({ ...prev, [index]: true }));
                  } else {
                    onVariantAttributeChange(index, e.target.value, item.productSize || "");
                  }
                }}
                className="h-6 max-w-[130px] rounded border border-border/60 bg-background px-1 text-[11px] font-medium text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">{isArabic ? "-- اختر اللون --" : "-- Select --"}</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__CUSTOM__">{isArabic ? "كتابة لون آخر..." : "Other color..."}</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <input
                type="text"
                value={item.productColor || ""}
                onChange={(e) =>
                  onVariantAttributeChange(index, e.target.value, item.productSize || "")
                }
                placeholder={isArabic ? "اللون..." : "Color..."}
                className="h-6 w-24 rounded border border-border/60 bg-background px-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
              />
              {colors.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomColorMode((prev) => ({ ...prev, [index]: false }));
                    onVariantAttributeChange(index, "", item.productSize || "");
                  }}
                  className="px-1 text-[10px] text-primary hover:underline"
                  title={isArabic ? "اختيار من القائمة" : "Select from list"}
                >
                  ↩
                </button>
              )}
            </div>
          )}
        </div>

        {/* Size Selector / Input */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
            {isArabic ? "المقاس:" : "Size:"}
          </span>
          {sizes.length > 0 && !isCustomSize ? (
            <div className="flex items-center gap-0.5">
              <select
                value={item.productSize || ""}
                onChange={(e) => {
                  if (e.target.value === "__CUSTOM__") {
                    setCustomSizeMode((prev) => ({ ...prev, [index]: true }));
                  } else {
                    onVariantAttributeChange(index, item.productColor || "", e.target.value);
                  }
                }}
                className="h-6 max-w-[110px] rounded border border-border/60 bg-background px-1 text-[11px] font-medium text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">{isArabic ? "-- اختر المقاس --" : "-- Select --"}</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__CUSTOM__">{isArabic ? "مقاس آخر..." : "Other size..."}</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <input
                type="text"
                value={item.productSize || ""}
                onChange={(e) =>
                  onVariantAttributeChange(index, item.productColor || "", e.target.value)
                }
                placeholder={isArabic ? "المقاس..." : "Size..."}
                className="h-6 w-20 rounded border border-border/60 bg-background px-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
              />
              {sizes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomSizeMode((prev) => ({ ...prev, [index]: false }));
                    onVariantAttributeChange(index, item.productColor || "", "");
                  }}
                  className="px-1 text-[10px] text-primary hover:underline"
                  title={isArabic ? "اختيار من القائمة" : "Select from list"}
                >
                  ↩
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
