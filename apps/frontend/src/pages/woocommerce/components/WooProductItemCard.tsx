import React from "react";
import {
  ChevronDown,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { getImageUrl } from "../../../utils/imageUrl";

interface WooProductItemCardProps {
  product: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  productSelected: boolean;
  onToggleProductSelect: (checked: boolean) => void;
  selectedVariants: Set<number>;
  onToggleVariant: (variantId: number) => void;
  onSelectAllVariants: () => void;
  onSelectVariantsByType: (type: string) => void;
  variantFilter: string;
  groupVariantsByType: (variations: any[]) => Record<string, any[]>;
  formatPrice: (price: string | number, currency?: string) => string;
}

export const WooProductItemCard: React.FC<WooProductItemCardProps> = ({
  product,
  isExpanded,
  onToggleExpand,
  productSelected,
  onToggleProductSelect,
  selectedVariants,
  onToggleVariant,
  onSelectAllVariants,
  onSelectVariantsByType,
  variantFilter,
  groupVariantsByType,
  formatPrice,
}) => {
  const hasVariations =
    product.isVariable &&
    product.variations &&
    product.variations.length > 0;
  const selectedCount = selectedVariants.size;
  const totalVariations = product.variations?.length || 0;
  const variantTypes = hasVariations
    ? groupVariantsByType(product.variations!)
    : {};

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden text-right shadow-xs">
      <div className="p-3.5 sm:p-4 flex items-center gap-3.5 hover:bg-muted/30 transition-colors">
        <input
          type="checkbox"
          checked={productSelected}
          onChange={(e) => onToggleProductSelect(e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-0 cursor-pointer"
        />

        {product.images?.[0] ? (
          <img
            src={getImageUrl(product.images[0]) || ""}
            alt={product.name}
            className="w-12 h-12 object-cover rounded-lg border border-border/60 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0 text-muted-foreground">
            <ShoppingBag className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
            {product.name}
          </h3>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="font-mono">#{product.sku || "N/A"}</span>
            <span>•</span>
            <span className="font-mono font-medium text-foreground">
              {formatPrice(product.price)}
            </span>
            {hasVariations && (
              <>
                <span>•</span>
                <span className="text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium">
                  {totalVariations} متغيرات
                  {selectedCount > 0 && ` (${selectedCount} محدد)`}
                </span>
              </>
            )}
          </div>

          {/* Quick Variation Filters for this product */}
          {hasVariations && isExpanded && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAllVariants();
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                تحديد الكل
              </button>
              {variantTypes.color && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVariantsByType("color");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  تحديد الألوان
                </button>
              )}
              {variantTypes.size && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVariantsByType("size");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  تحديد المقاسات
                </button>
              )}
            </div>
          )}
        </div>

        {hasVariations && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Variations List */}
      {isExpanded && hasVariations && (
        <div className="border-t border-border/60 bg-muted/20 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 animate-fadeIn">
          {product.variations!.map((variant: any) => {
            if (variantFilter !== "all") {
              const hasAttr = variant.attributes.some(
                (attribute: any) => attribute.type === variantFilter,
              );
              if (!hasAttr) return null;
            }

            const isSelected = selectedVariants.has(variant.wooCommerceVariationId);

            return (
              <div
                key={variant.wooCommerceVariationId}
                onClick={() => onToggleVariant(variant.wooCommerceVariationId)}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary/30"
                    : "bg-background/60 border-border/60 hover:bg-muted/40 hover:border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!isSelected}
                  readOnly
                  className="w-4 h-4 rounded border-border text-primary focus:ring-0 pointer-events-none"
                />
                {variant.images?.[0] && (
                  <img
                    src={getImageUrl(variant.images[0]) || ""}
                    alt=""
                    className="w-9 h-9 object-cover rounded-md border border-border/50 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {variant.attributes.map((attr: any) => (
                      <span
                        key={attr.name || attr.value}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border/50 text-foreground"
                      >
                        {attr.value || attr.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 font-mono">
                    <span>{formatPrice(variant.price || product.price)}</span>
                    {variant.stockQuantity != null && (
                      <>
                        <span>•</span>
                        <span>مخزون: {variant.stockQuantity}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WooProductItemCard;
