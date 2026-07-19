import { useState, useMemo, useCallback } from "react";
import type {
  ProductVariant,
  VariantSelectionState,
  VariantOptionGroup,
  StorefrontProduct,
} from "../types/StorefrontTypes";

/**
 * 🔀 Headless hook for product variant selection.
 *
 * Extracts the duplicated variant logic from ProductDetails.tsx (133KB),
 * Product page variants such as Elessi and related detail screens into a single
 * reusable hook.
 *
 * @param product - The product object containing variants
 * @returns VariantSelectionState + actions (selectOption, resetSelection)
 */
export const useProductVariants = (product: StorefrontProduct | null | undefined) => {
  const variants = useMemo<ProductVariant[]>(
    () => (product?.variants && Array.isArray(product.variants) ? product.variants : []),
    [product?.variants],
  );

  // Group variant options by attribute name (e.g. "Color", "Size")
  const optionGroups = useMemo<VariantOptionGroup[]>(() => {
    if (variants.length === 0) return [];

    const groupMap = new Map<string, Set<string>>();

    variants.forEach((variant) => {
      const variantOptions = Array.isArray(variant.options) ? variant.options : [];
      variantOptions.forEach((option) => {
        const name = option.name?.trim();
        const value = option.value?.trim();
        if (!name || !value) return;

        if (!groupMap.has(name)) {
          groupMap.set(name, new Set());
        }
        groupMap.get(name)!.add(value);
      });
    });

    return Array.from(groupMap.entries()).map(([name, valuesSet]) => ({
      name,
      values: Array.from(valuesSet),
    }));
  }, [variants]);

  // Track selected options: { "Color": "Black", "Size": "L" }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Find matching variant based on selected options
  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (variants.length === 0) return null;

    const selectedKeys = Object.keys(selectedOptions);
    if (selectedKeys.length === 0) {
      // Auto-select first variant if none selected
      return variants[0] || null;
    }

    return (
      variants.find((variant) => {
        const variantOptions = Array.isArray(variant.options) ? variant.options : [];
        return selectedKeys.every((key) => {
          const option = variantOptions.find((o) => o.name === key);
          return option && option.value === selectedOptions[key];
        });
      }) || null
    );
  }, [variants, selectedOptions]);

  // Resolve price from variant or product
  const resolvedPrice = useMemo(() => {
    if (selectedVariant?.price != null) return selectedVariant.price;
    return product?.price || 0;
  }, [selectedVariant, product?.price]);

  const resolvedCompareAtPrice = useMemo(() => {
    if (selectedVariant?.compareAtPrice != null) return selectedVariant.compareAtPrice;
    return product?.compareAtPrice;
  }, [selectedVariant, product?.compareAtPrice]);

  const isValidSelection = useMemo(() => {
    if (variants.length === 0) return true; // No variants = always valid
    return selectedVariant !== null;
  }, [variants.length, selectedVariant]);

  // Filter available values based on current selections
  const getAvailableValues = useCallback(
    (groupName: string): string[] => {
      if (variants.length === 0) return [];

      const otherSelections = { ...selectedOptions };
      delete otherSelections[groupName];
      const otherKeys = Object.keys(otherSelections);

      if (otherKeys.length === 0) {
        // No other filters — all values available
        const group = optionGroups.find((g) => g.name === groupName);
        return group?.values || [];
      }

      // Filter variants that match ALL other selections
      const matchingVariants = variants.filter((variant) => {
        const variantOptions = Array.isArray(variant.options) ? variant.options : [];
        return otherKeys.every((key) => {
          const opt = variantOptions.find((o) => o.name === key);
          return opt && opt.value === otherSelections[key];
        });
      });

      // Collect unique values for this group from matching variants
      const available = new Set<string>();
      matchingVariants.forEach((variant) => {
        const opt = variant.options?.find((o) => o.name === groupName);
        if (opt?.value) available.add(opt.value);
      });

      return Array.from(available);
    },
    [variants, selectedOptions, optionGroups],
  );

  // Actions
  const selectOption = useCallback(
    (name: string, value: string) => {
      setSelectedOptions((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const resetSelection = useCallback(() => {
    setSelectedOptions({});
  }, []);

  const state: VariantSelectionState = {
    selectedOptions,
    selectedVariant,
    optionGroups,
    isValidSelection,
    resolvedPrice,
    resolvedCompareAtPrice,
  };

  return {
    ...state,
    variants,
    hasVariants: variants.length > 0,
    selectOption,
    resetSelection,
    getAvailableValues,
  };
};
