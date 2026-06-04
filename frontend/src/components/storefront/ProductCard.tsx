import React from "react";
import { Link } from "react-router-dom";

export interface ProductCardSettings {
  productCardStyle?: string;
  gridAddToCartIcon?: string;
  gridDiscountBanner?: boolean;
  currency?: string;
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    price?: number;
    salePrice?: number;
    comparePrice?: number;
    images?: string[];
  };
  settings?: ProductCardSettings;
  companyId?: string;
  currencyLabel?: string;
  onAddToCart?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  settings,
  currencyLabel = settings?.currency || "EGP",
  onAddToCart,
}) => {
  const image = Array.isArray(product.images) ? product.images[0] : "";
  const hasDiscount =
    settings?.gridDiscountBanner &&
    typeof product.comparePrice === "number" &&
    product.comparePrice > (product.salePrice || product.price || 0);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link to={`/product/${product.slug || product.id}`} className="block">
        <div className="relative aspect-square bg-slate-100">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              لا توجد صورة
            </div>
          )}
          {hasDiscount ? (
            <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
              خصم
            </span>
          ) : null}
        </div>
      </Link>

      <div className="space-y-3 p-4" dir="rtl">
        <Link to={`/product/${product.slug || product.id}`} className="block">
          <h3 className="line-clamp-2 text-sm font-bold text-slate-900">
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
          <span className="min-w-0 text-base font-black text-slate-900">
            {product.salePrice || product.price || 0} {currencyLabel}
          </span>
          {typeof product.comparePrice === "number" &&
          product.comparePrice > (product.salePrice || product.price || 0) ? (
            <span className="shrink-0 text-sm text-slate-400 line-through">
              {product.comparePrice} {currencyLabel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onAddToCart}
          className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {settings?.gridAddToCartIcon === "plus" ? "+ " : ""}
          أضف إلى السلة
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
