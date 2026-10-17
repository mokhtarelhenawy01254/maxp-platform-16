import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { Product } from "./productModalTypes";

interface ProductCardItemProps {
  product: Product;
  isSelected: boolean;
  onClick: () => void;
}

export const ProductCardItem: React.FC<ProductCardItemProps> = ({
  product,
  isSelected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-card transition-all ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/60 hover:shadow-md"
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <ArchiveBoxIcon className="h-12 w-12" />
          </div>
        )}
        {product.variants.length > 0 && (
          <div className="absolute end-2 top-2 rounded-lg bg-primary/90 px-2 py-1 text-[10px] font-bold text-primary-foreground shadow-sm backdrop-blur-sm">
            خيارات
          </div>
        )}
      </div>

      <div className="bg-card p-3 flex flex-col justify-between flex-1">
        <div>
          <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-foreground">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary font-mono tabular-nums">
              {product.price} ج.م
            </span>
            <div className="max-w-[80px] truncate text-[10px] text-muted-foreground font-mono tabular-nums">
              SKU: {product.sku || "N/A"}
            </div>
          </div>
        </div>

        {product.stock !== undefined && (
          <div className="mt-1">
            {product.stock <= 0 ? (
              <span className="text-[10px] font-semibold text-destructive">
                نفذ من المخزون
              </span>
            ) : product.stock < 5 ? (
              <span className="text-[10px] font-semibold text-warning font-mono tabular-nums">
                متبقي {product.stock}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-success">
                متوفر
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
