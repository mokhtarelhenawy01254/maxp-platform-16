import React, { useState, useEffect } from "react";
import { ShoppingCartIcon, PlusIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../services/apiClient";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number | undefined;
  images: string[];
  stock: number;
}

interface FrequentlyBoughtTogetherProps {
  productId: string;
  companyId: string;
  currentProduct: Product;
  onAddToCart: (productIds: string[]) => void;
}

const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({
  productId,
  companyId,
  currentProduct,
  onAddToCart,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set([productId]),
  );

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

  useEffect(() => {
    fetchFrequentlyBought();
  }, [productId, companyId]);

  const fetchFrequentlyBought = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/public/products/${productId}/frequently-bought-together`,
        {
          params: { companyId, limit: 3 },
        },
      );

      if (response.data.success) {
        const productsWithParsedImages = response.data.data.map(
          (product: any) => ({
            ...product,
            images: parseImages(product.images),
            salePrice: product.salePrice || product.comparePrice || undefined,
          }),
        );
        setProducts(productsWithParsedImages);
      }
    } catch (error) {
      console.error("❌ [FREQUENTLY-BOUGHT] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      if (id !== productId) { // Prevent unselecting current product for logical consistency
        newSelected.delete(id);
      }
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const calculateTotal = () => {
    let total = 0;
    if (selectedProducts.has(productId)) {
      total += Number(currentProduct.salePrice || currentProduct.price || 0);
    }
    products.forEach((product) => {
      if (selectedProducts.has(product.id)) {
        total += Number(product.salePrice || product.price || 0);
      }
    });
    return total;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a1a2e]"></div>
      </div>
    );
  }

  if (products.length === 0) return null;

  const allProducts = [currentProduct, ...products];

  return (
    <div className="mt-12 p-6 md:p-8 bg-[#fcfbf7] border border-[#c9a96e]/20 rounded-2xl shadow-sm">
      <h3 className="text-xl font-black text-[#1a1a2e] mb-6 flex items-center gap-2">
        <ShoppingCartIcon className="h-6 w-6 text-[#c9a96e]" />
        <span>يُشترى معاً عادة</span>
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        {allProducts.map((product, index) => {
          const isCurrentProduct = product.id === productId;
          const displayPrice = product.salePrice || product.price;
          const isSelected = selectedProducts.has(product.id);
          const productImages = parseImages(product.images);
          const productImage = productImages.length > 0 ? productImages[0] : "";

          return (
            <React.Fragment key={product.id}>
              {index > 0 && (
                <div className="flex items-center justify-center">
                  <PlusIcon className="h-6 w-6 text-gray-300" />
                </div>
              )}

              <div
                className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? "opacity-100" : "opacity-60 grayscale hover:grayscale-0 hover:opacity-80"
                  }`}
                onClick={() => handleToggleProduct(product.id)}
              >
                <div className={`w-32 h-40 md:w-40 md:h-48 rounded-xl overflow-hidden border-2 transition-colors ${isSelected ? "border-[#c9a96e]" : "border-transparent"
                  }`}>
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {isCurrentProduct && (
                    <div className="absolute top-2 right-2 bg-[#1a1a2e] text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      الحالي
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs font-bold text-[#1a1a2e] truncate w-32 md:w-40">{product.name}</p>
                  <p className="text-sm font-black text-[#c9a96e] mt-0.5">{formatPrice(displayPrice)}</p>
                </div>

                {/* Custom Checkbox overlay */}
                {!isCurrentProduct && (
                  <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-[#c9a96e] border-[#c9a96e]" : "bg-white border-gray-300"
                    }`}>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="border-t border-[#c9a96e]/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">
            الإجمالي للمنتجات المحددة ({selectedProducts.size})
          </p>
          <p className="text-2xl font-black text-[#1a1a2e]">
            {formatPrice(calculateTotal())}
          </p>
        </div>

        <button
          onClick={() => onAddToCart(Array.from(selectedProducts))}
          disabled={selectedProducts.size === 0}
          className="w-full sm:w-auto px-10 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold hover:bg-[#c9a96e] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-[#1a1a2e]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCartIcon className="h-5 w-5" />
          <span>أضف المحدد للسلة</span>
        </button>
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;
