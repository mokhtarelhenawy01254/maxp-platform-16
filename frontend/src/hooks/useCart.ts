import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storefrontApi } from "../utils/storefrontApi";

/**
 * 🛒 Custom hook for cart management using React Query.
 * Centralizes cart state, mutations, and business logic (free shipping).
 */
export const useCart = () => {
  const queryClient = useQueryClient();

  // 1. Fetch Cart Data
  const {
    data: cartResponse,
    isLoading: isCartLoading,
    isFetching: isCartFetching,
    refetch: refetchCart 
  } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const response = await storefrontApi.getCart();
      const cartData = response?.data || response || { items: [], total: 0 };
      
      // Parse images for consistency across the app
      if (Array.isArray(cartData.items)) {
        cartData.items = cartData.items.map((item: any) => {
          let image = item.product?.images || item.images || item.image;
          if (typeof image === "string" && image.startsWith("[")) {
            try {
              const parsed = JSON.parse(image);
              image = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : (parsed || null);
            } catch {
              // fallback to original if parsing fails
            }
          }
          return { ...item, image };
        });
      }
      
      return cartData;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // 2. Fetch Store Info (for Free Shipping & Currency settings)
  const { data: storeInfo } = useQuery({
    queryKey: ["storeInfo"],
    queryFn: async () => {
      const response = await storefrontApi.getStoreInfo();
      return response?.data || response;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const cart = cartResponse || { items: [], total: 0 };
  const items = Array.isArray(cart.items) ? cart.items : [];
  const subtotal = Number(cart.total || 0);

  // 3. Business Logic: Free Shipping Progress
  const freeShippingSettings = storeInfo?.freeShippingSettings || { enabled: false, minAmount: 0 };
  const isFreeShippingAvailable = freeShippingSettings.enabled && subtotal >= freeShippingSettings.minAmount;
  
  const minAmount = Number(freeShippingSettings.minAmount || 0);
  const freeShippingProgress = minAmount > 0 
    ? Math.min((subtotal / minAmount) * 100, 100) 
    : 0;
  const amountToFreeShipping = Math.max(minAmount - subtotal, 0);

  // 4. Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity, variantId }: { productId: string; quantity: number; variantId?: string | null }) => {
      return storefrontApi.updateCartItem(productId, { quantity, variantId });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cart"], data?.data || data);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ productId, variantId }: { productId: string; variantId?: string | null }) => {
      return storefrontApi.removeCartItem(productId, variantId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cart"], data?.data || data);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return storefrontApi.clearCart();
    },
    onSuccess: () => {
      queryClient.setQueryData(["cart"], { items: [], total: 0 });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity, variantId }: { productId: string; quantity: number; variantId?: string | null }) => {
      return storefrontApi.addToCart({ productId, quantity, variantId: variantId ?? undefined });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cart"], data?.data || data);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      // Notify other parts of the app if needed
      window.dispatchEvent(new Event("cartUpdated"));
    }
  });

  // 5. Utility: Total Items Count
  const itemsCount = items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);

  return {
    cart,
    items,
    itemsCount,
    subtotal,
    isCartLoading,
    isCartFetching,
    isAdding: addToCartMutation.isPending,
    isLoading: isCartLoading || updateQuantityMutation.isPending || removeItemMutation.isPending || addToCartMutation.isPending,
    freeShipping: {
      settings: freeShippingSettings,
      isAvailable: isFreeShippingAvailable,
      progress: freeShippingProgress,
      amountRemaining: amountToFreeShipping,
    },
    updateQuantity: (productId: string, quantity: number, variantId?: string | null) => 
      updateQuantityMutation.mutate({ productId, quantity, variantId }),
    updateQuantityAsync: (productId: string, quantity: number, variantId?: string | null) => 
      updateQuantityMutation.mutateAsync({ productId, quantity, variantId }),
    removeItem: (productId: string, variantId?: string | null) => 
      removeItemMutation.mutate({ productId, variantId }),
    removeItemAsync: (productId: string, variantId?: string | null) => 
      removeItemMutation.mutateAsync({ productId, variantId }),
    clearCart: () => clearCartMutation.mutate(),
    clearCartAsync: () => clearCartMutation.mutateAsync(),
    addToCart: (productId: string, quantity: number, variantId?: string | null) => 
      addToCartMutation.mutate({ productId, quantity, variantId }),
    addToCartAsync: (productId: string, quantity: number, variantId?: string | null) => 
      addToCartMutation.mutateAsync({ productId, quantity, variantId }),
    refresh: refetchCart,
  };
};
