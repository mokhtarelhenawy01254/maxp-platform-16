import React from "react";
import { PlusIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline";
import {
  Product,
  ProductVariant,
  ProductAttribute,
} from "./productModalTypes";

interface ProductVariantSidebarProps {
  selectedProduct: Product | null;
  productAttributes: ProductAttribute[];
  selectedAttributes: Record<string, string>;
  setSelectedAttributes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  getAvailableValues: (attrName: string) => string[];
  allAttributesSelected: boolean;
  matchedVariant: ProductVariant | null;
  handleVariantSelect: (variant: ProductVariant) => void;
}

export const ProductVariantSidebar: React.FC<ProductVariantSidebarProps> = ({
  selectedProduct,
  productAttributes,
  selectedAttributes,
  setSelectedAttributes,
  getAvailableValues,
  allAttributesSelected,
  matchedVariant,
  handleVariantSelect,
}) => {
  if (!selectedProduct) {
    return (
      <div className="hidden md:flex w-80 flex-col items-center justify-center p-8 text-center opacity-50 grayscale bg-muted/30">
        <ArchiveBoxIcon className="mb-4 h-16 w-16 text-muted-foreground" />
        <h4 className="font-bold text-muted-foreground">اختر منتجاً</h4>
        <p className="mt-2 text-sm text-muted-foreground">
          اختر منتجاً من القائمة الجانبية لتخصيص الخيارات
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-80 flex-col overflow-y-auto bg-muted/30 transition-all h-full">
      <div className="border-b border-border/60 bg-card p-4">
        <h3 className="line-clamp-2 font-bold leading-snug text-foreground">
          {selectedProduct.name}
        </h3>
        <p className="mt-1 text-lg font-bold text-primary font-mono tabular-nums">
          {selectedProduct.price} ج.م
        </p>
      </div>

      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
        {productAttributes.length > 0 ? (
          productAttributes.map((attr) => {
            const availableValues = getAvailableValues(attr.name);
            const isSelected = selectedAttributes[attr.name];

            return (
              <div key={attr.name} className="space-y-3">
                <label className="flex items-center justify-between text-sm font-bold text-foreground">
                  {attr.name}
                  {isSelected && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                      {isSelected}
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {attr.values.map((value) => {
                    const isAvailable = availableValues.includes(value);
                    const isActive = selectedAttributes[attr.name] === value;

                    return (
                      <button
                        type="button"
                        key={value}
                        onClick={() =>
                          setSelectedAttributes((prev) => ({
                            ...prev,
                            [attr.name]: value,
                          }))
                        }
                        disabled={!isAvailable}
                        className={`min-w-[3rem] rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all active:scale-95 ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : isAvailable
                              ? "border-border bg-card text-foreground hover:border-primary/60 hover:shadow-sm"
                              : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through opacity-50"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-2">
            {selectedProduct.variants.map((variant) => (
              <button
                type="button"
                key={variant.id}
                onClick={() => handleVariantSelect(variant)}
                disabled={variant.stock !== undefined && variant.stock <= 0}
                className={`w-full rounded-xl border-2 p-3 text-end transition-all active:scale-[0.98] ${
                  variant.stock !== undefined && variant.stock <= 0
                    ? "cursor-not-allowed border-border bg-muted/40 opacity-50"
                    : "border-border bg-card hover:border-primary"
                }`}
              >
                <div className="font-bold text-foreground">{variant.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary font-mono tabular-nums">
                    {variant.price && parseFloat(variant.price as any) > 0
                      ? `${variant.price} ج.م`
                      : `${selectedProduct.price} ج.م`}
                  </span>
                  {variant.stock !== undefined &&
                    (variant.stock <= 0 ? (
                      <span className="text-[10px] font-semibold text-destructive">
                        نفذ
                      </span>
                    ) : variant.stock < 5 ? (
                      <span className="text-[10px] font-semibold text-warning font-mono tabular-nums">
                        متبقي {variant.stock}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-success">
                        متوفر
                      </span>
                    ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-card p-4">
        {matchedVariant ? (
          <button
            type="button"
            onClick={() => handleVariantSelect(matchedVariant)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <PlusIcon className="h-5 w-5" />
            تأكيد الإضافة
          </button>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 px-3 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              {!allAttributesSelected
                ? `يرجى اختيار ${productAttributes
                    .filter((a) => !selectedAttributes[a.name])
                    .map((a) => a.name)
                    .join(" و ")}`
                : "المزيج المختار غير متوفر"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
