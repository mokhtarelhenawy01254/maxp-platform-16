import { useState, useEffect } from "react";
import { toast } from "sonner";
import { tToast } from "../utils/i18n-toast";
import { wishlistApi } from "../utils/wishlistApi";
import { storefrontApi, getCompanyId } from "../utils/storefrontApi";
import { storefrontSettingsService } from "../services/storefrontSettingsService";

export interface WishlistItem {
  id: string;
  productId: string;
  variantId?: string;
  product: {
    id: string;
    name: string;
    slug?: string;
    price: number;
    comparePrice?: number;
    images: string | string[];
    stock: number;
    category?: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
}

export const useWishlistPage = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);

  useEffect(() => {
    fetchWishlist();
    fetchStorefrontSettings();
  }, []);

  const fetchStorefrontSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (companyId) {
        const data = await storefrontSettingsService.getPublicSettings(companyId);
        if (data.success) {
          setStorefrontSettings(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching storefront settings:", error);
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const data = await wishlistApi.getWishlist();
      if (data.success) {
        setItems(data.data.items || []);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      tToast.error("useWishlistPage.error_error_d13d");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: string, productId: string, variantId?: string) => {
    try {
      await wishlistApi.removeFromWishlist(productId, variantId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      tToast.success("useWishlistPage.success_delete_3958");
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      tToast.error("useWishlistPage.error_error_10f3");
    }
  };

  const handleAddToCart = async (productId: string, variantId?: string) => {
    try {
      await storefrontApi.addToCart({
        productId,
        quantity: 1,
        ...(variantId && { variantId }),
      });
      tToast.success("useWishlistPage.msg_27db");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Error adding to cart:", error);
      tToast.error("useWishlistPage.error_error_2ec3");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("هل أنت متأكد من مسح جميع المنتجات من المفضلة؟")) return;

    try {
      await wishlistApi.clearWishlist();
      setItems([]);
      tToast.success("useWishlistPage.msg_a442");
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Error clearing wishlist:", error);
      tToast.error("useWishlistPage.error_error_d538");
    }
  };

  const parseImages = (images: string | string[]): string[] => {
    if (Array.isArray(images)) return images;
    if (typeof images === "string") {
      try {
        return JSON.parse(images);
      } catch {
        return [images];
      }
    }
    return [];
  };

  return {
    items,
    loading,
    storefrontSettings,
    handleRemove,
    handleAddToCart,
    handleClearAll,
    parseImages,
    fetchWishlist,
  };
};
