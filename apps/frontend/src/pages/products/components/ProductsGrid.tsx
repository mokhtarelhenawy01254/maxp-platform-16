import React from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { getImageUrl } from "../../../utils/imageUrl";
import { getStockStatusColor, getStockStatusText, getStockStatus } from "./ProductsTypes";
import {
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
  isPublishedWorkflow,
} from "../utils/workflow";

interface ProductsGridProps {
  products: any[];
  canSelectProducts: boolean;
  selectedProducts: Set<string>;
  onSelectProduct: (id: string) => void;
  getStorefrontUrl: (product: any) => string;
  prepareStorefrontContext: () => void;
  formatPrice: (price: number) => string;
}

export const ProductsGrid: React.FC<ProductsGridProps> = ({
  products,
  canSelectProducts,
  selectedProducts,
  onSelectProduct,
  getStorefrontUrl,
  prepareStorefrontContext,
  formatPrice,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        const stockStatus = getStockStatus(product);
        const isSelected = canSelectProducts && selectedProducts.has(product.id);

        return (
          <div
            key={product.id}
            className={`bg-card rounded-xl shadow-xs border border-border/70 overflow-hidden hover:shadow-md transition-all ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="relative">
              {canSelectProducts && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectProduct(product.id)}
                  className="absolute top-2.5 right-2.5 h-4 w-4 text-primary focus:ring-primary border-border rounded z-10 cursor-pointer"
                />
              )}
              <a
                href={getStorefrontUrl(product)}
                onClick={prepareStorefrontContext}
                className="block"
                target="_blank"
                rel="noreferrer"
              >
                {product.mainImage || (product.images && product.images.length > 0) ? (
                  <img
                    src={getImageUrl(product.mainImage || product.images[0], "small") || ""}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-44 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-44 bg-muted/40 flex items-center justify-center text-muted-foreground">
                    <PhotoIcon className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                )}
              </a>

              <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-2 pointer-events-none">
                <span
                  className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full shadow-xs ${getWorkflowStatusColor(
                    product.workflow?.status,
                    product.workflow
                  )}`}
                >
                  {getWorkflowStatusLabel(product.workflow?.status, product.workflow)}
                </span>
                {!isPublishedWorkflow(product.workflow) && (
                  <span className="rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                    معاينة
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 text-xs">
              <a
                href={`/products/${product.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground truncate block hover:text-primary transition-colors text-sm mb-2"
              >
                {product.name}
              </a>

              <div className="flex items-center justify-between font-mono tabular-nums pt-2 border-t border-border/50">
                <span className="font-bold text-foreground">{formatPrice(product.price)}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-sans font-medium ${getStockStatusColor(
                    stockStatus
                  )}`}
                >
                  {getStockStatusText(stockStatus)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductsGrid;
