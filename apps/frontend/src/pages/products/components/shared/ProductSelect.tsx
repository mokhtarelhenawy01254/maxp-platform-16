import React, { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ProductLike {
  id: string | number;
  name?: string | null;
  sku?: string | null;
}

interface ProductSelectProps {
  label: string;
  description: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allProducts: ProductLike[];
  isLoading: boolean;
  placeholder?: string;
  badgeColorClass?: string;
}

const matchesSearch = (product: ProductLike, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    String(product.name || ""),
    String(product.sku || ""),
    String(product.id || ""),
  ]
    .map((value) => value.toLowerCase())
    .some((value) => value.includes(normalizedQuery));
};

export const ProductSelect: React.FC<ProductSelectProps> = ({
  label,
  description,
  selectedIds = [],
  onChange,
  allProducts,
  isLoading,
  placeholder = "ابحث وأضف منتجاً...",
  badgeColorClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
}) => {
  const [search, setSearch] = useState("");

  const normalizedSelectedIds = useMemo(
    () => (Array.isArray(selectedIds) ? selectedIds : []),
    [selectedIds],
  );

  const availableProducts = useMemo(() => {
    const selectedSet = new Set(normalizedSelectedIds);

    return allProducts
      .filter((product) => {
        const productId = String(product.id || "");
        return productId && !selectedSet.has(productId);
      })
      .filter((product) => matchesSearch(product, search))
      .slice(0, 8);
  }, [allProducts, normalizedSelectedIds, search]);

  const selectedProducts = useMemo(
    () =>
      normalizedSelectedIds.map((productId) => {
        const matched = allProducts.find((product) => String(product.id) === productId);
        return matched || { id: productId, name: `Product #${productId}`, sku: "" };
      }),
    [allProducts, normalizedSelectedIds],
  );

  const handleAdd = (productId: string) => {
    if (!productId || normalizedSelectedIds.includes(productId)) {
      return;
    }

    onChange([...normalizedSelectedIds, productId]);
    setSearch("");
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(normalizedSelectedIds.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{description}</p>

      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              جاري تحميل المنتجات...
            </div>
          ) : availableProducts.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {availableProducts.map((product) => {
                const productId = String(product.id || "");

                return (
                  <button
                    key={productId}
                    type="button"
                    onClick={() => handleAdd(productId)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {product.name || `Product #${productId}`}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {product.sku ? `SKU: ${product.sku}` : `ID: ${productId}`}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      <PlusIcon className="h-3.5 w-3.5" />
                      إضافة
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              لم يتم العثور على منتجات
            </div>
          )}
        </div>

        {selectedProducts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedProducts.map((product, index) => (
              <span
                key={`${product.id}-${index}`}
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${badgeColorClass}`}
              >
                {product.name || `Product #${product.id}`}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="mr-1 ml-1"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
