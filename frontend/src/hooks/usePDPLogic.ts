import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useCart } from "../hooks/useCart";
import { useProductVariants } from "../hooks/useProductVariants";
import { StorefrontProduct } from "../types/StorefrontTypes";

/**
 * 💡 usePDPLogic Hook
 * 
 * Centralizes common PDP logic (Cart + Variants + Actions) to prevent 
 * duplication across multiple theme layouts.
 */
export const usePDPLogic = (product: StorefrontProduct) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, isAdding } = useCart();
  
  const {
    selectedVariant,
    selectedOptions,
    optionGroups,
    resolvedPrice,
    resolvedCompareAtPrice,
    selectOption,
    isValidSelection,
    hasVariants,
  } = useProductVariants(product);

  const handleAddToCart = useCallback(() => {
    if (!product?.id) return;
    if (hasVariants && !isValidSelection) {
      toast.error("Please select a variant first", { id: "variant-select-error" });
      return;
    }
    addToCart(product.id, quantity, selectedVariant?.id || null);
    toast.success("Added to cart", { id: "cart-add-success" });
  }, [product?.id, quantity, selectedVariant?.id, hasVariants, isValidSelection, addToCart]);

  return {
    quantity,
    setQuantity,
    isAdding,
    selectedVariant,
    selectedOptions,
    optionGroups,
    resolvedPrice,
    resolvedCompareAtPrice,
    selectOption,
    isValidSelection,
    hasVariants,
    handleAddToCart,
  };
};
