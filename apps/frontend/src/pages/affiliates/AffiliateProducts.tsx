import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { LinkIcon, ShoppingBagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  buildAffiliateProductUrl,
  type AffiliateStoreProfile,
} from "./affiliateStoreLinks";
import { copyAffiliateText } from "./affiliateClipboard";

interface AffiliateProduct {
  id: string;
  productId: string;
  basePrice: number;
  markup: number;
  finalPrice: number;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    images: string;
  };
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const AffiliateProducts: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const navigate = useNavigate();
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [affiliate, setAffiliate] = useState<AffiliateStoreProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const parseProductImages = (images?: string) => {
    if (!images) return [];
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [productsRes, affiliateRes] = await Promise.all([
        apiClient.get<ApiSuccess<AffiliateProduct[]>>("/affiliates/products"),
        apiClient.get<ApiSuccess<AffiliateStoreProfile>>("/affiliates/me"),
      ]);
      if (productsRes.data.success) {
        setProducts(productsRes.data.data);
      }
      if (affiliateRes.data.success) {
        setAffiliate(affiliateRes.data.data);
      }
    } catch (error: any) {
      tToast.error("AffiliateProducts.error_error_ad12");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMarkup = async (productId: string, markup: number) => {
    try {
      if (!Number.isFinite(markup) || markup < 0) {
        tToast.error("AffiliateProducts.msg_f09a");
        return;
      }

      const product = products.find((p) => p.productId === productId);
      if (!product) return;

      const response = await apiClient.put<
        ApiSuccess<unknown>,
        { markup: number }
      >(`/affiliates/products/${product.id}`, { markup });
      if (response.data.success) {
        tToast.success("AffiliateProducts.success_update_c846");
        loadProducts();
      }
    } catch (error: any) {
      tToast.error("AffiliateProducts.error_error_59e1");
    }
  };

  const handleRemoveProduct = async (affiliateProductId: string) => {
    try {
      const response = await apiClient.delete<ApiSuccess<unknown>>(
        `/affiliates/products/${affiliateProductId}`,
      );
      if (response.data.success) {
        tToast.success("AffiliateProducts.msg_46fb");
        loadProducts();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إزالة المنتج");
    }
  };

  const generateAffiliateLink = async (productId: string) => {
    return buildAffiliateProductUrl(affiliate, productId);
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}
    >
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1
              className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              منتجاتي
            </h1>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-2`}>
              إدارة منتجاتك مع هامش الربح
            </p>
          </div>
          
        </div>

        {/* Product Grid / Empty State */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((affiliateProduct) => {
              const images = parseProductImages(affiliateProduct.product.images);
              const mainImage = images[0] || "/placeholder-product.png";
              const storefrontUrl = buildAffiliateProductUrl(
                affiliate,
                affiliateProduct.productId,
              );

              return (
                <div
                  key={affiliateProduct.id}
                  className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"} overflow-hidden hover:shadow-md transition-all group`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={mainImage}
                      alt={affiliateProduct.product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-lg">
                        منتجي
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3
                      className={`font-bold mb-2 truncate ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {affiliateProduct.product.name}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">سعر المنصة:</span>
                        <span
                          className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {formatPrice(affiliateProduct.basePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">هامش ربحك:</span>
                        <span className="font-bold text-green-500">
                          +{formatPrice(affiliateProduct.markup)}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between text-sm font-bold border-t pt-2 ${isDark ? "border-gray-700" : "border-gray-100"}`}
                      >
                        <span
                          className={isDark ? "text-white" : "text-gray-900"}
                        >
                          السعر للعميل:
                        </span>
                        <span className="text-blue-500">
                          {formatPrice(affiliateProduct.finalPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={affiliateProduct.markup}
                        onBlur={(e) => {
                          const newMarkup = parseFloat(e.target.value);
                          if (newMarkup !== affiliateProduct.markup) {
                            handleUpdateMarkup(
                              affiliateProduct.productId,
                              newMarkup,
                            );
                          }
                        }}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                          isDark
                            ? "bg-gray-900 border-gray-700 text-white"
                            : "bg-gray-50 border-gray-200 text-gray-900"
                        } outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="تعديل الربح"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const link = await generateAffiliateLink(
                            affiliateProduct.productId,
                          );
                          const copied = await copyAffiliateText(link);
                          if (copied) {
                            tToast.success("AffiliateProducts.msg_0153");
                            return;
                          }
                          tToast.error("AffiliateProducts.msg_ccdb");
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-xs font-bold transition shadow-sm shadow-blue-500/20"
                      >
                        <LinkIcon className="h-4 w-4" />
                        نسخ الرابط
                      </button>
                      <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3 py-2 border rounded-lg text-xs font-bold transition ${
                          isDark
                            ? "border-gray-700 text-gray-400 hover:bg-gray-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        عرض على المتجر
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(affiliateProduct.id)}
                        className={`px-3 py-2 border rounded-lg text-xs font-bold transition ${
                          isDark
                            ? "border-red-900/60 text-red-300 hover:bg-red-900/20"
                            : "border-red-100 text-red-600 hover:bg-red-50"
                        }`}
                        title="إزالة المنتج من كتالوجي"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`text-center py-20 rounded-2xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} shadow-sm`}
          >
            <ShoppingBagIcon
              className={`h-16 w-16 mx-auto mb-4 opacity-20 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            />
            <p
              className={`mb-6 text-lg font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              كتالوجك الشخصي فارغ تماماً
            </p>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateProducts;
