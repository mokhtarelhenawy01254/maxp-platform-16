import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
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
      toast.error("حدث خطأ في جلب قائمة الرغبات");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: string, productId: string, variantId?: string) => {
    try {
      await wishlistApi.removeFromWishlist(productId, variantId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success("تم حذف المنتج من المفضلة");
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("حدث خطأ في حذف المنتج");
    }
  };

  const handleAddToCart = async (productId: string, variantId?: string) => {
    try {
      await storefrontApi.addToCart({
        productId,
        quantity: 1,
        ...(variantId && { variantId }),
      });
      toast.success("تمت إضافة المنتج للسلة");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("حدث خطأ في إضافة المنتج");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("هل أنت متأكد من مسح جميع المنتجات من المفضلة؟")) return;

    try {
      await wishlistApi.clearWishlist();
      setItems([]);
      toast.success("تم مسح قائمة الرغبات");
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Error clearing wishlist:", error);
      toast.error("حدث خطأ في مسح القائمة");
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
