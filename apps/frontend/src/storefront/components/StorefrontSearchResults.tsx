import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { Product } from "../hooks/useProducts";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import StorefrontProductImage from "./StorefrontProductImage";
import { getProductImageCandidates } from "../utils/productImages";
import { formatStorefrontCurrency } from "../utils/currency";
import { buildStorefrontPath } from "../utils/paths";

export interface StorefrontSearchResultsProps {
  results: Product[];
  isLoading: boolean;
  close: () => void;
}

export const StorefrontSearchResults: React.FC<StorefrontSearchResultsProps> = ({
  results,
  isLoading,
  close,
}) => {
  const { settings } = useStorefrontSettings();
  const location = useLocation();

  const currency =
    settings?.storefront?.settings?.currency ||
    settings?.company?.currency ||
    "EGP";

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground italic">
        لا توجد منتجات تطابق بحثك.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {results.map((product) => (
        <Link
          key={product.id}
          to={buildStorefrontPath(
            location.pathname,
            /product/,
            location.search,
          )}
          onClick={close}
          className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors group"
        >
          <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
            <StorefrontProductImage
              candidates={getProductImageCandidates(product)}
              alt={product.name}
              loading="lazy"
              width="48"
              height="48"
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors text-start">
              {product.name}
            </h4>
            <p dir="ltr" className="text-xs text-muted-foreground text-start">
              {formatStorefrontCurrency(product.price, currency)}
            </p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground group-hover:translate-x-1 transition-transform rtl:rotate-180"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  );
};
