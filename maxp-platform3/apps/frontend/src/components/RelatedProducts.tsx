import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/apiClient";
import ProductCard, { type ProductCardSettings } from "./storefront/ProductCard";
import { storefrontSettingsService } from "../services/storefrontSettingsService";

interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  salePrice?: number;
  comparePrice?: number;
  images: string[];
  stock: number;
  category?: {
    id: string;
    name: string;
  };
}

interface RelatedProductsProps {
  productId: string;
  companyId: string;
  limit?: number;
  showHeading?: boolean;
  headingText?: string;
}

interface RelatedProductsResponseItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price?: number | string;
  salePrice?: number | string;
  comparePrice?: number | string;
  images?: string[] | string;
  stock?: number;
  category?: {
    id: string;
    name: string;
  };
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({
  productId,
  companyId,
  limit = 6,
  showHeading = true,
  headingText = "🔍 منتجات قد تعجبك",
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<
    ProductCardSettings | null
  >(null);

  const loadGlobalSettings = useCallback(async () => {
    try {
      if (companyId) {
        const data = await storefrontSettingsService.getPublicSettings(companyId);
        if (data.success && data.data) {
          setGlobalSettings({
            productCardStyle: data.data.productCardStyle as any,
            gridAddToCartIcon: data.data.gridAddToCartIcon as any,
            gridDiscountBanner: data.data.gridDiscountBanner as any,
            currency: (data.data as any).currency || "جنيه",
          } as any);
        }
      }
    } catch (error) {
      console.warn("[RelatedProducts] Error loading global settings");
    }
  }, [companyId]);

  const parseImages = (images: string | string[] | undefined): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === "string") {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [images];
      } catch {
        return [images];
      }
    }
    return [];
  };

  const fetchRelatedProducts = useCallback(async () => {
    if (!companyId || !productId) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/public/products/${productId}/related`,
        {
          params: { companyId, limit },
        },
      );

      if (response.data.success) {
        const productsWithParsedData = (response.data.data as RelatedProductsResponseItem[]).map(
          (product) => ({
            ...product,
            images: parseImages(product.images),
            price: Number(product.price) || 0,
            salePrice: product.salePrice
              ? Number(product.salePrice)
              : undefined,
            comparePrice: product.comparePrice
              ? Number(product.comparePrice)
              : undefined,
          }),
        );
        setProducts(productsWithParsedData as Product[]);
      }
    } catch (error) {
      console.error("❌ [RELATED-PRODUCTS] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId, limit, productId]);

  useEffect(() => {
    void fetchRelatedProducts();
    void loadGlobalSettings();
  }, [fetchRelatedProducts, loadGlobalSettings]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mt-12">
      {showHeading && (
        <h3 className="text-2xl font-black text-[#1a1a2e] mb-8 relative inline-block">
          {headingText}
          <span className="absolute -bottom-2 right-0 w-12 h-1 bg-[#c9a96e]"></span>
        </h3>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              comparePrice: product.comparePrice,
              salePrice: product.salePrice,
              images: product.images,
            }}
            settings={{
              productCardStyle: globalSettings?.productCardStyle,
              gridAddToCartIcon: globalSettings?.gridAddToCartIcon,
              gridDiscountBanner: globalSettings?.gridDiscountBanner,
            }}
            companyId={companyId}
            onAddToCart={() => {
              window.dispatchEvent(new Event("cartUpdated"));
            }}
            currencyLabel={(globalSettings as any)?.currency || "جنيه"}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
