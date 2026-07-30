import { Trash2 as TrashIcon, RefreshCw as ArrowPathIcon, AlertTriangle as ExclamationTriangleIcon, X as XMarkIcon, Check as CheckIcon, Image as PhotoIcon, ChevronLeft as ChevronLeftIcon } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
;
import { toast } from "sonner";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";

interface DeletedProduct {
    id: string;
    name: string;
    price: number;
    sku: string;
    barcode: string;
    stock: number;
    images: any[];
    category?: {
        id: string;
        name: string;
    };
    deletedAt: string;
    createdAt: string;
}

const ProductsTrash: React.FC = () => {
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { formatDate } = useDateFormat();

    const [products, setProducts] = useState<DeletedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [restoring, setRestoring] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    // جلب المنتجات المحذوفة
    const fetchDeletedProducts = async () => {
        setLoading(true);
        try {
            const { apiClient } = await import("../../services/apiClient");
            const response = await apiClient.get("/products/trash/all");
            if (response.data.success) {
                setProducts(response.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching deleted products:", error);
            toast.error("فشل في جلب المنتجات المحذوفة");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeletedProducts();
    }, []);

    // استعادة منتج واحد
    const handleRestore = async (productId: string) => {
        setRestoring(productId);
        try {
            const { apiClient } = await import("../../services/apiClient");
            const response = await apiClient.post(`/products/${productId}/restore`);
            if (response.data.success) {
                toast.success("تم استعادة المنتج بنجاح");
                setProducts((prev) => prev.filter((p) => p.id !== productId));
                setSelectedProducts((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(productId);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error restoring product:", error);
            toast.error("فشل في استعادة المنتج");
        } finally {
            setRestoring(null);
        }
    };

    // حذف نهائي لمنتج واحد
    const handlePermanentDelete = async (productId: string) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
            return;
        }

        setDeleting(productId);
        try {
            const { apiClient } = await import("../../services/apiClient");
            const response = await apiClient.delete(`/products/${productId}/permanent`);
            if (response.data.success) {
                toast.success("تم حذف المنتج نهائياً");
                setProducts((prev) => prev.filter((p) => p.id !== productId));
                setSelectedProducts((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(productId);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error permanently deleting product:", error);
            toast.error("فشل في حذف المنتج نهائياً");
        } finally {
            setDeleting(null);
        }
    };

    // استعادة الكل
    const handleRestoreAll = async () => {
        if (selectedProducts.size === 0) {
            toast.error("يرجى اختيار منتجات للاستعادة");
            return;
        }

        setLoading(true);
        try {
            const { apiClient } = await import("../../services/apiClient");
            let successCount = 0;
            for (const productId of selectedProducts) {
                try {
                    const response = await apiClient.post(`/products/${productId}/restore`);
                    if (response.data.success) {
                        successCount++;
                    }
                } catch (e) {
                    console.error(`Error restoring product ${productId}:`, e);
                }
            }

            if (successCount > 0) {
                toast.success(`تم استعادة ${successCount} منتج بنجاح`);
                fetchDeletedProducts();
                setSelectedProducts(new Set());
            }
        } catch (error) {
            console.error("Error restoring all products:", error);
            toast.error("فشل في استعادة المنتجات");
        } finally {
            setLoading(false);
        }
    };

    // حذف نهائي للكل
    const handlePermanentDeleteAll = async () => {
        if (selectedProducts.size === 0) {
            toast.error("يرجى اختيار منتجات للحذف");
            return;
        }

        if (!window.confirm(`هل أنت متأكد من حذف ${selectedProducts.size} منتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
            return;
        }

        setLoading(true);
        try {
            const { apiClient } = await import("../../services/apiClient");
            let successCount = 0;
            for (const productId of selectedProducts) {
                try {
                    const response = await apiClient.delete(`/products/${productId}/permanent`);
                    if (response.data.success) {
                        successCount++;
                    }
                } catch (e) {
                    console.error(`Error permanently deleting product ${productId}:`, e);
                }
            }

            if (successCount > 0) {
                toast.success(`تم حذف ${successCount} منتج نهائياً`);
                fetchDeletedProducts();
                setSelectedProducts(new Set());
            }
        } catch (error) {
            console.error("Error deleting all products:", error);
            toast.error("فشل في حذف المنتجات");
        } finally {
            setLoading(false);
        }
    };

    // تحديد/إلغاء تحديد منتج
    const toggleSelect = (productId: string) => {
        setSelectedProducts((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    // تحديد/إلغاء تحديد الكل
    const toggleSelectAll = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(products.map((p) => p.id)));
        }
    };

    // الحصول على صورة المنتج
    const getProductImage = (images: string[]) => {
        if (!images || images.length === 0) return null;
        const firstImage = images[0];
        if (typeof firstImage === "string") {
            return firstImage;
        }
        return firstImage?.url || firstImage?.src || null;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/products"
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    سلة المحذوفات
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {products.length} منتج محذوف
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {selectedProducts.size > 0 && (
                                <>
                                    <button
                                        onClick={handleRestoreAll}
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className="h-5 w-5 mr-2" />
                                        استعادة ({selectedProducts.size})
                                    </button>
                                    <button
                                        onClick={handlePermanentDeleteAll}
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        <TrashIcon className="h-5 w-5 mr-2" />
                                        حذف نهائي ({selectedProducts.size})
                                    </button>
                                </>
                            )}

                            <button
                                onClick={fetchDeletedProducts}
                                disabled={loading}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="تحديث"
                            >
                                <ArrowPathIcon className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {loading && products.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20">
                        <TrashIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            سلة المحذوفات فارغة
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            المنتجات المحذوفة ستظهر هنا
                        </p>
                        <Link
                            to="/products"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            العودة للمنتجات
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Bulk Actions Bar */}
                        <div className="mb-4 flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.size === products.length}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    تحديد الكل ({products.length})
                                </span>
                            </label>

                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedProducts.size} محدد
                            </span>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map((product) => {
                                const image = getProductImage(product.images);
                                const isSelected = selectedProducts.has(product.id);
                                const isRestoring = restoring === product.id;
                                const isDeleting = deleting === product.id;

                                return (
                                    <div
                                        key={product.id}
                                        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all ${isSelected
                                            ? "border-blue-500 ring-2 ring-blue-500/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                            }`}
                                    >
                                        <div className="p-4">
                                            {/* Header with checkbox */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(product.id)}
                                                    className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                {/* Image */}
                                                <div className="flex-shrink-0">
                                                    {image ? (
                                                        <img
                                                            src={image}
                                                            alt={product.name}
                                                            className="w-20 h-20 object-cover rounded-lg"
                                                        />
                                                    ) : (
                                                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                            <PhotoIcon className="h-8 w-8 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {product.name}
                                                    </h3>
                                                    {product.sku && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            SKU: {product.sku}
                                                        </p>
                                                    )}
                                                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                                                        {formatPrice(product.price)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Meta */}
                                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                                                {product.category && (
                                                    <p>
                                                        <span className="font-medium">الفئة:</span>{" "}
                                                        {product.category.name}
                                                    </p>
                                                )}
                                                <p>
                                                    <span className="font-medium">تاريخ الحذف:</span>{" "}
                                                    {formatDate(product.deletedAt)}
                                                </p>
                                                {product.stock !== undefined && (
                                                    <p>
                                                        <span className="font-medium">المخزون:</span>{" "}
                                                        {product.stock}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRestore(product.id)}
                                                    disabled={isRestoring || isDeleting}
                                                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                                                >
                                                    {isRestoring ? (
                                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                                                            استعادة
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handlePermanentDelete(product.id)}
                                                    disabled={isRestoring || isDeleting}
                                                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                                >
                                                    {isDeleting ? (
                                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <TrashIcon className="h-4 w-4 mr-1" />
                                                            حذف نهائي
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductsTrash;
