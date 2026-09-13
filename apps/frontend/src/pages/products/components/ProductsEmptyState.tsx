import React from "react";
import { Link } from "react-router-dom";
import { PhotoIcon, PlusIcon } from "@heroicons/react/24/outline";

interface ProductsEmptyStateProps {
  isMerchant?: boolean;
  onQuickAddClick?: () => void;
}

const ProductsEmptyState: React.FC<ProductsEmptyStateProps> = ({
  isMerchant = false,
  onQuickAddClick,
}) => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-12 text-center">
      <PhotoIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">لا توجد منتجات</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">ابدأ بإضافة منتجك الأول بسهولة</p>
      <div className="flex gap-3 justify-center flex-wrap">
        {!isMerchant && (
          <>
            <Link to="/products/import-easy-orders" className="inline-flex items-center px-4 py-2 border border-blue-500 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50">
              Easy Orders
            </Link>
            <Link to="/products/import-woocommerce" className="inline-flex items-center px-4 py-2 border border-purple-500 rounded-lg text-sm font-semibold text-purple-600 hover:bg-purple-50">
              WooCommerce
            </Link>
          </>
        )}
        {onQuickAddClick ? (
          <button
            type="button"
            onClick={onQuickAddClick}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-bold text-white bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-97 transition-transform shadow-xs"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة منتج جديد
          </button>
        ) : (
          <Link to="/products/new" className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-bold text-white bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة منتج جديد
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductsEmptyState;
