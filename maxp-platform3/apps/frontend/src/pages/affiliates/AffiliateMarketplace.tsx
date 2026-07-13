import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  buildAffiliateProductUrl,
  type AffiliateStoreProfile,
} from "./affiliateStoreLinks";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string;
  slug?: string | null;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const normalizeProductImages = (
  images: string | string[] | null | undefined,
): string[] => {
  if (!images) {
    return [];
  }

  if (Array.isArray(images)) {
    return images.filter(
      (image): image is string =>
        typeof image === "string" && image.trim().length > 0,
    );
  }

  const trimmedImages = images.trim();

  if (!trimmedImages) {
    return [];
  }

  if (trimmedImages.startsWith("[")) {
    try {
      const parsedImages = JSON.parse(trimmedImages);
      if (Array.isArray(parsedImages)) {
        return parsedImages.filter(
          (image): image is string =>
            typeof image === "string" && image.trim().length > 0,
        );
      }

      if (typeof parsedImages === "string" && parsedImages.trim().length > 0) {
        return [parsedImages.trim()];
      }

      return [];
    } catch {
      return [trimmedImages];
    }
  }

  return [trimmedImages];
};

const AffiliateMarketplace: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [markup, setMarkup] = useState<{ [key: string]: number }>({});
  const [affiliate, setAffiliate] = useState<AffiliateStoreProfile | null>(null);

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    try {
      setLoading(true);
      const [productsRes, affiliateRes] = await Promise.all([
        apiClient.get<ApiSuccess<Product[]>>(
          "/products?limit=50&marketplace=true",
        ),
        apiClient.get<ApiSuccess<AffiliateStoreProfile>>("/affiliates/me"),
      ]);
      if (productsRes.data.success) {
        setProducts(productsRes.data.data);
      }
      if (affiliateRes.data.success) {
        setAffiliate(affiliateRes.data.data);
      }
    } catch (error) {
      toast.error("فشل جلب كتالوج منتجات الشركة");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (productId: string) => {
    try {
      setImporting(productId);
      const profit = markup[productId] || 0;
      if (!Number.isFinite(profit) || profit < 0) {
        toast.error("برجاء إدخال هامش ربح صالح");
        return;
      }

      const response = await apiClient.post<
        ApiSuccess<unknown>,
        { productId: string; markup: number }
      >("/affiliates/products", {
        productId,
        markup: profit,
      });

      if (response.data.success) {
        toast.success("تم استيراد المنتج لكتالوجك بنجاح");
        // Optional: Remove from marketplace list or show imported status
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "هذا المنتج موجود بالفعل في كتالوجك",
      );
    } finally {
      setImporting(null);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/affiliates/products")}
              className={`p-2 rounded-lg ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100"} transition-all`}
            >
              <ArrowRightIcon
                className={`h-5 w-5 ${isDark ? "text-white" : "text-gray-900"}`}
              />
            </button>
            <div>
              <h1
                className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                كتالوج منتجات الشركة
              </h1>
              <p
                className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} mt-1`}
              >
                هنا تختار منتجات الشركة وتحدد ربحك. عرض المنتج والشراء يتمان على متجر الشركة العام برابطك كمسوق.
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-blue-500/30 bg-blue-500/10 text-blue-100" : "border-blue-100 bg-blue-50 text-blue-900"}`}
          >
            هذه ليست واجهة متجر للعميل. هي مساحة تشغيل للمسوق فقط: أضف المنتج ثم شارك رابط المتجر الذي يحتوي على كودك.
          </div>

          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن منتج لاستيراده..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-10 pl-4 py-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-900"} outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const images = normalizeProductImages(product.images);
            const mainImage = images[0] || "/placeholder-product.png";
            const productKey = product.slug || product.id;
            const storefrontUrl = buildAffiliateProductUrl(affiliate, productKey);

            return (
              <div
                key={product.id}
                className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group`}
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3
                    className={`font-bold mb-2 truncate ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {product.name}
                  </h3>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-500">سعر الجملة:</span>
                    <span
                      className={`text-sm font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}
                    >
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">
                        حدد ربحك (جنيه):
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        onChange={(e) =>
                          setMarkup({
                            ...markup,
                            [product.id]: Number(e.target.value),
                          })
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-gray-50 border-gray-200"} outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    <button
                      onClick={() => handleImport(product.id)}
                      disabled={importing === product.id}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all ${
                        importing === product.id
                          ? "bg-gray-700 text-gray-400"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                      }`}
                    >
                      {importing === product.id ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <PlusCircleIcon className="h-4 w-4" />
                      )}
                      إضافة لمنتجاتي
                    </button>
                    <a
                      href={storefrontUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all border ${
                        isDark
                          ? "border-gray-700 text-gray-300 hover:bg-gray-700"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      عرض على متجر الشركة
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBagIcon className="h-16 w-16 mx-auto mb-4 opacity-10" />
            <p className="text-gray-500">لا توجد منتجات مطابقة للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateMarketplace;
