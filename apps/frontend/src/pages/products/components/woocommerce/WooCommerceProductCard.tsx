import React from "react";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { WooCommerceProduct } from "./types";

interface WooCommerceProductCardProps {
  product: WooCommerceProduct;
  index: number;
  isSelected: boolean;
  onToggle: (index: number) => void;
}

export const WooCommerceProductCard: React.FC<WooCommerceProductCardProps> = ({
  product,
  index,
  isSelected,
  onToggle,
}) => {
  return (
    <div
      onClick={() => onToggle(index)}
      className={`rounded-lg border p-3 cursor-pointer transition-all flex flex-col justify-between text-xs ${
        isSelected
          ? "border-primary/40 bg-primary/5 shadow-xs"
          : "border-border/70 bg-card hover:border-border"
      }`}
    >
      <div>
        <div className="relative mb-2.5">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-32 w-full object-cover rounded-md border border-border/60"
            />
          ) : (
            <div className="h-32 w-full bg-muted/30 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8" />
            </div>
          )}
          <div className="absolute top-1.5 right-1.5">
            {isSelected ? (
              <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
            ) : (
              <div className="h-5 w-5 rounded-full border border-border/70 bg-background/80" />
            )}
          </div>
        </div>

        <h3 className="font-semibold text-foreground line-clamp-2 mb-1.5">
          {product.name}
        </h3>
      </div>

      <div className="space-y-1 pt-2 border-t border-border/60 font-mono tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-sans">السعر:</span>
          <span className="font-bold text-foreground">{product.price} ج.م</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-sans">المخزون:</span>
          <span className="text-foreground">{product.stock} قطعة</span>
        </div>
        {product.sku && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-sans">SKU:</span>
            <span>{product.sku}</span>
          </div>
        )}
      </div>
    </div>
  );
};
