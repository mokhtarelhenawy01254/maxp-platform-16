import { useMemo } from "react";

export interface ProductOption {
  id: string;
  name: string;
  productVariants?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  variants?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export function useProductFilterOptions(productIdFilter: string, products: ProductOption[]) {
  const selectedProduct = useMemo(() => {
    if (!productIdFilter) return null;
    return products.find((p) => p.id === productIdFilter) || null;
  }, [productIdFilter, products]);

  const selectedProductVariants = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.productVariants || selectedProduct.variants || [];
  }, [selectedProduct]);

  const { availableColors, availableSizes } = useMemo(() => {
    if (!productIdFilter || selectedProductVariants.length === 0) {
      return { availableColors: [] as string[], availableSizes: [] as string[] };
    }
    const colors = new Set<string>();
    const sizes = new Set<string>();
    selectedProductVariants.forEach((v) => {
      if (!v.name) return;
      const pipePattern = /([^:]+):\s*([^|]+)/g;
      let match: RegExpExecArray | null;
      const attrs: Record<string, string> = {};
      while ((match = pipePattern.exec(v.name)) !== null) {
        if (match[1] && match[2]) attrs[match[1].trim()] = match[2].trim();
      }
      if (attrs["اللون"] || attrs["المقاس"]) {
        if (attrs["اللون"]) colors.add(attrs["اللون"]);
        if (attrs["المقاس"]) sizes.add(attrs["المقاس"]);
        return;
      }
      const parts = v.name.split(/\s*[-–]\s*/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        colors.add(parts[0].trim());
        sizes.add(parts[1].trim());
      } else if (parts.length === 1 && parts[0] && v.type) {
        if (v.type === "color") colors.add(parts[0].trim());
        else if (v.type === "size") sizes.add(parts[0].trim());
      }
    });
    return { availableColors: [...colors], availableSizes: [...sizes] };
  }, [productIdFilter, selectedProductVariants]);

  return {
    selectedProduct,
    selectedProductVariants,
    availableColors,
    availableSizes,
  };
}

export default useProductFilterOptions;
