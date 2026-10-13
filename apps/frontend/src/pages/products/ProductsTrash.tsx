import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    TrashIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    CheckIcon,
    PhotoIcon,
    ChevronLeftIcon,
    ArrowRightIcon,
    ArchiveBoxXMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
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
            tToast.error("productsTrash.failed_fetch_bddf");
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
                tToast.success("productsTrash.msg_b52a");
                setProducts((prev) => prev.filter((p) => p.id !== productId));
                setSelectedProducts((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(productId);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error restoring product:", error);
            tToast.error("productsTrash.msg_9da5");
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
                tToast.success("productsTrash.success_delete_4f2e");
                setProducts((prev) => prev.filter((p) => p.id !== productId));
                setSelectedProducts((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(productId);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error permanently deleting product:", error);
            tToast.error("productsTrash.failed_delete_c5b3");
        } finally {
            setDeleting(null);
        }
    };

    // استعادة الكل المحدد
    const handleRestoreAll = async () => {
        if (selectedProducts.size === 0) {
            tToast.error("productsTrash.msg_d600");
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
            tToast.error("productsTrash.failed_restore_ea6a");
        } finally {
            setLoading(false);
        }
    };

    // حذف نهائي للكل
    const handlePermanentDeleteAll = async () => {
        if (selectedProducts.size === 0) {
            tToast.error("productsTrash.msg_1884");
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
            tToast.error("productsTrash.failed_delete_c5b3");
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
        return (firstImage as any)?.url || (firstImage as any)?.src || null;
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12">
            {/* Header with Linear Craft */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                    <Link
                        to="/products"
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-[0.94] transition-all shadow-2xs"
                        title="العودة إلى المنتجات"
                    >
                        <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                سلة المحذوفات
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700 font-mono tabular-nums">
                                <ArchiveBoxXMarkIcon className="h-3 w-3 text-zinc-400" />
                                {products.length} منتج
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                            المنتجات المحذوفة مؤقتاً يمكنك استعادتها أو تفريغها نهائياً
                        </p>
                    </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                    {selectedProducts.size > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={handleRestoreAll}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:bg-zinc-800 active:scale-[0.97] transition-all shadow-2xs disabled:opacity-50"
                            >
                                <ArrowPathIcon className="h-3.5 w-3.5" />
                                <span>استعادة ({selectedProducts.size})</span>
                            </button>
                            <button
                                type="button"
                                onClick={handlePermanentDeleteAll}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100 active:scale-[0.97] transition-all shadow-2xs disabled:opacity-50"
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                                <span>حذف نهائي ({selectedProducts.size})</span>
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={fetchDeletedProducts}
                        disabled={loading}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 active:scale-[0.94] transition-all disabled:opacity-50"
                        title="تحديث"
                    >
                        <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div>
                {loading && products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <ArrowPathIcon className="h-6 w-6 text-zinc-400 animate-spin mb-2" />
                        <p className="text-xs font-medium">جاري جلب سلة المحذوفات...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-12 text-center shadow-2xs">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-3 border border-zinc-200/60 dark:border-zinc-700">
                            <TrashIcon className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                            سلة المحذوفات فارغة
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                            لا توجد أي منتجات محذوفة حالياً. المنتجات التي تحذفها مؤقتاً تظهر هنا.
                        </p>
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 active:scale-[0.97] transition-all shadow-2xs"
                        >
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                            <span>العودة للمنتجات</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Control Strip */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-2xs">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.size === products.length && products.length > 0}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900 dark:bg-zinc-800"
                                />
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    تحديد الكل ({products.length})
                                </span>
                            </label>

                            <span className="font-mono tabular-nums text-[11px] text-zinc-500">
                                {selectedProducts.size} محدد
                            </span>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {products.map((product) => {
                                const image = getProductImage(product.images);
                                const isSelected = selectedProducts.has(product.id);
                                const isRestoring = restoring === product.id;
                                const isDeleting = deleting === product.id;

                                return (
                                    <div
                                        key={product.id}
                                        className={`bg-white dark:bg-zinc-900 rounded-xl border p-3.5 transition-all shadow-2xs ${
                                            isSelected
                                                ? "border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900/10 dark:ring-zinc-100/10"
                                                : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(product.id)}
                                                className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900 dark:bg-zinc-800 shrink-0"
                                            />

                                            <div className="h-14 w-14 rounded-lg border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <PhotoIcon className="h-5 w-5 text-zinc-400" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                                    {product.name}
                                                </h3>
                                                {product.sku && (
                                                    <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5" dir="ltr">
                                                        SKU: {product.sku}
                                                    </p>
                                                )}
                                                <p className="font-mono tabular-nums text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                                                    {formatPrice(product.price)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                                            {product.category && (
                                                <span className="truncate max-w-[120px]">
                                                    {product.category.name}
                                                </span>
                                            )}
                                            <span className="font-mono tabular-nums">
                                                {formatDate(product.deletedAt)}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRestore(product.id)}
                                                disabled={isRestoring || isDeleting}
                                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 active:scale-[0.97] transition-all disabled:opacity-50"
                                            >
                                                <ArrowPathIcon className={`h-3 w-3 ${isRestoring ? "animate-spin" : ""}`} />
                                                <span>استعادة</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePermanentDelete(product.id)}
                                                disabled={isRestoring || isDeleting}
                                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.97] transition-all disabled:opacity-50"
                                            >
                                                <TrashIcon className={`h-3 w-3 ${isDeleting ? "animate-spin" : ""}`} />
                                                <span>حذف نهائي</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductsTrash;
