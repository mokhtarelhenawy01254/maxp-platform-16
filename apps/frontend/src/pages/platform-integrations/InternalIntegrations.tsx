import React, { useState, useEffect } from "react";
import {
    LinkIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    ShoppingCartIcon,
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    ExclamationTriangleIcon,
    UsersIcon as UserGroupIcon,
    TrashIcon,
    BuildingOfficeIcon,
    ClipboardDocumentIcon,
    CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";

interface Connection {
    id: string;
    providerId: string;
    consumerId: string;
    allowProductPull: boolean;
    allowOrderPull: boolean;
    status: string;
    provider: {
        id: string;
        name: string;
        logo: string;
        email: string;
    };
}

interface Request {
    id: string;
    requesterId: string;
    message: string;
    createdAt: string;
    requester: {
        name: string;
        logo: string;
        email: string;
    };
}

interface InternalProduct {
    name: string;
    description: string;
    price: number;
    comparePrice: number | null;
    sku: string | null;
    stock: number;
    images: string[];
    category: string | null;
    internalId: string;
    source: string;
    variants?: Array<{
        internalId: string;
        name: string;
        type: string;
        sku: string | null;
        price: number | null;
        comparePrice: number | null;
        cost: number | null;
        images: string[];
        stock: number;
        trackInventory: boolean;
        isActive: boolean;
        sortOrder: number;
        metadata: string | null;
    }>;
}

interface InternalOrder {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    customer: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    orderItems: Array<{
        product: {
            name: string;
            sku: string;
        };
        quantity: number;
        price: number;
    }>;
}

const InternalIntegrations: React.FC = () => {
    const [view, setView] = useState<"main" | "pull-products" | "pull-orders">("main");
    const [activeTab, setActiveTab] = useState<"connections" | "requests" | "find" | "consumers">("connections");
    const [connections, setConnections] = useState<Connection[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [consumers, setConsumers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [searching, setSearching] = useState(false);
    const [copied, setCopied] = useState(false);
    const [editingCommission, setEditingCommission] = useState<Record<string, number | null>>({});
    const { user } = useAuth();

    // Pull Products State
    const [selectedProvider, setSelectedProvider] = useState<Connection | null>(null);
    const [providerProducts, setProviderProducts] = useState<InternalProduct[]>([]);
    const [selectedProductIndexes, setSelectedProductIndexes] = useState<Set<number>>(new Set());
    const [fetchingProducts, setFetchingProducts] = useState(false);
    const [importing, setImporting] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState("");

    // Response Loading State
    const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

    // Pull Orders State
    const [availableOrders, setAvailableOrders] = useState<InternalOrder[]>([]);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [fetchingOrders, setFetchingOrders] = useState(false);
    const [importingOrders, setImportingOrders] = useState(false);
    const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
        tokenManager.createAuthHeaders(additionalHeaders);

    const fetchActiveConnections = async () => {
        try {
            const resp = await fetch("/api/v1/company-connections/active", {
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.success) setConnections(data.data);
        } catch (error) {
            toast.error("فشل جلب الشركات المتصلة");
        }
    };

    const fetchConsumers = async () => {
        try {
            const resp = await fetch("/api/v1/company-connections/consumers", {
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.success) setConsumers(data.data);
        } catch (error) {
            toast.error("فشل جلب المشتركين");
        }
    };

    const fetchReceivedRequests = async () => {
        try {
            const resp = await fetch("/api/v1/company-connections/requests/received", {
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.success) setRequests(data.data);
        } catch (error) {
            toast.error("فشل جلب طلبات الربط");
        }
    };

    const updatePermission = async (connectionId: string, permissions: any) => {
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/permissions`, {
                method: "PUT",
                headers: getAuthHeaders({
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify(permissions)
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(data.message || "تم تحديث الصلاحيات");
                fetchConsumers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("حدث خطأ أثناء تحديث الصلاحيات");
        }
    };

    useEffect(() => {
        fetchActiveConnections();
        fetchReceivedRequests();
        fetchConsumers();
    }, []);

    const handleRespond = async (id: string, status: "APPROVED" | "REJECTED") => {
        if (respondingIds.has(id)) return;
        setRespondingIds(prev => new Set(prev).add(id));
        try {
            const resp = await fetch(`/api/v1/company-connections/requests/${id}/respond`, {
                method: "PUT",
                headers: getAuthHeaders({
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ status })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(data.message);
                fetchReceivedRequests();
                fetchActiveConnections();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("حدث خطأ أثناء معالجة الطلب");
        } finally {
            setRespondingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const sendRequest = async () => {
        if (!searchId.trim()) return;
        setSearching(true);
        try {
            const resp = await fetch("/api/v1/company-connections/requests", {
                method: "POST",
                headers: getAuthHeaders({
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ receiverId: searchId.trim(), message: "طلب ربط لسحب المنتجات" })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(data.message);
                setSearchId("");
                setActiveTab("connections");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("فشل إرسال طلب الربط");
        } finally {
            setSearching(false);
        }
    };

    const startPulling = async (conn: Connection) => {
        setSelectedProvider(conn);
        setFetchingProducts(true);
        setView("pull-products");
        try {
            const resp = await fetch(`/api/v1/company-connections/${conn.providerId}/products`, {
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.success) {
                setProviderProducts(data.data.products);
                // Select all by default
                setSelectedProductIndexes(new Set(data.data.products.map((_: any, i: number) => i)));
            } else {
                toast.error(data.message);
                setView("main");
            }
        } catch (error) {
            toast.error("فشل جلب منتجات الشركة");
            setView("main");
        } finally {
            setFetchingProducts(false);
        }
    };

    const startPullingOrders = async (conn: Connection) => {
        setSelectedProvider(conn);
        setFetchingOrders(true);
        setView("pull-orders");
        try {
            const resp = await fetch(`/api/v1/affiliates/import/available-orders/${conn.providerId}`, {
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.success) {
                setAvailableOrders(data.data);
                // Select all by default
                setSelectedOrderIds(new Set(data.data.map((o: any) => o.id)));
            } else {
                toast.error(data.message);
                setView("main");
            }
        } catch (error) {
            toast.error("فشل جلب طلبات الشركة");
            setView("main");
        } finally {
            setFetchingOrders(false);
        }
    };

    const deleteConnection = async (connectionId: string) => {
        if (!window.confirm("هل أنت متأكد من رغبتك في قطع الاتصال والارتباط بين الشركتين؟ ستتوقف جميع عمليات مزامنة البيانات.")) {
            return;
        }
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(data.message || "تم قطع الاتصال بنجاح");
                fetchActiveConnections();
                fetchConsumers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("فشل في قطع الاتصال");
        }
    };

    const toggleProduct = (index: number) => {
        const newSelected = new Set(selectedProductIndexes);
        if (newSelected.has(index)) newSelected.delete(index);
        else newSelected.add(index);
        setSelectedProductIndexes(newSelected);
    };

    const toggleOrder = (orderId: string) => {
        const newSelected = new Set(selectedOrderIds);
        if (newSelected.has(orderId)) newSelected.delete(orderId);
        else newSelected.add(orderId);
        setSelectedOrderIds(newSelected);
    };

    const handleImport = async () => {
        if (selectedProductIndexes.size === 0 || !selectedProvider) return;
        setImporting(true);
        try {
            const productsToImport = Array.from(selectedProductIndexes).map(idx => providerProducts[idx]);
            const resp = await fetch(`/api/v1/company-connections/${selectedProvider.providerId}/import`, {
                method: "POST",
                headers: getAuthHeaders({
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ products: productsToImport })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(data.message);
                setView("main");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("فشل عملية الاستيراد");
        } finally {
            setImporting(false);
        }
    };

    const handleImportOrders = async () => {
        if (selectedOrderIds.size === 0 || !selectedProvider) return;
        setImportingOrders(true);
        try {
            const ordersToImport = availableOrders.filter(o => selectedOrderIds.has(o.id));
            const resp = await fetch(`/api/v1/affiliates/import/orders/${selectedProvider.providerId}`, {
                method: "POST",
                headers: getAuthHeaders({
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ orders: ordersToImport })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success(data.message);
                setView("main");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("فشل عملية استيراد الطلبات");
        } finally {
            setImportingOrders(false);
        }
    };

    const totalProviderVariants = providerProducts.reduce(
        (sum, product) => sum + (product.variants?.length || 0),
        0
    );

    const filteredProducts = providerProducts.filter((p) =>
        productSearchQuery
            ? p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
              (p.sku || "").toLowerCase().includes(productSearchQuery.toLowerCase()) ||
              (p.category || "").toLowerCase().includes(productSearchQuery.toLowerCase())
            : true
    );

    const handleSelectAll = () => {
        const filteredIndexes = filteredProducts.map((p) => providerProducts.indexOf(p));
        setSelectedProductIndexes(new Set(filteredIndexes));
    };

    const handleDeselectAll = () => {
        setSelectedProductIndexes(new Set());
    };

    if (view === "pull-products" && selectedProvider) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView("main")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">سحب المنتجات من {selectedProvider.provider.name}</h2>
                            <p className="text-sm text-gray-500">اختر المنتجات التي ترغب في استيرادها إلى متجرك</p>
                            <div className="text-xs text-gray-500 mt-1">
                                {providerProducts.length > 0 ? `${providerProducts.length} منتج / ${totalProviderVariants} متغير` : ""}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleImport}
                        disabled={importing || selectedProductIndexes.size === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {importing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowDownTrayIcon className="w-5 h-5" />}
                        استيراد المحدد ({selectedProductIndexes.size})
                    </button>
                </div>

                {/* Search + Selection Actions */}
                {!fetchingProducts && providerProducts.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={productSearchQuery}
                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                placeholder="ابحث عن منتج بالاسم أو SKU..."
                                className="w-full pr-9 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 outline-none"
                                dir="rtl"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAll}
                                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                تحديد الكل ({filteredProducts.length})
                            </button>
                            <button
                                onClick={handleDeselectAll}
                                className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                إلغاء الكل
                            </button>
                        </div>
                    </div>
                )}

                {fetchingProducts ? (
                    <div className="py-20 text-center">
                        <ArrowPathIcon className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-500">جاري جلب المنتجات...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map((product, idx) => {
                            const originalIndex = providerProducts.indexOf(product);
                            const isSelected = selectedProductIndexes.has(originalIndex);
                            return (
                                <div
                                    key={product.internalId}
                                    onClick={() => toggleProduct(originalIndex)}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-gray-100 dark:border-gray-700 hover:border-gray-200"
                                        }`}
                                >
                                    <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-gray-50">
                                        <img
                                            src={product.images[0] || "https://placehold.co/200x200/png?text=No+Image"}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-lg">
                                                <CheckCircleIcon className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{product.name}</h4>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-blue-600 font-bold">{product.price} ج.م</span>
                                        <span className="text-gray-500">المخزون: {product.stock}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        {`المتغيرات: ${product.variants?.length || 0}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : providerProducts.length > 0 ? (
                    <div className="py-20 text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد منتجات تطابق البحث</h3>
                        <p className="text-gray-500">حاول تغيير كلمة البحث.</p>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد منتجات متاحة</h3>
                        <p className="text-gray-500">هذه الشركة ليس لديها منتجات نشطة حالياً.</p>
                    </div>
                )}
            </div>
        );
    }

    if (view === "pull-orders" && selectedProvider) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView("main")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">سحب الطلبات من {selectedProvider.provider.name}</h2>
                            <p className="text-sm text-gray-500">اختر الطلبات التي ترغب في استيرادها إلى نظامك</p>
                        </div>
                    </div>
                    <button
                        onClick={handleImportOrders}
                        disabled={importingOrders || selectedOrderIds.size === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {importingOrders ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowDownTrayIcon className="w-5 h-5" />}
                        استيراد المحددة ({selectedOrderIds.size})
                    </button>
                </div>

                {fetchingOrders ? (
                    <div className="py-20 text-center">
                        <ArrowPathIcon className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-500">جاري جلب الطلبات...</p>
                    </div>
                ) : availableOrders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableOrders.map((order: InternalOrder) => {
                            const isSelected = selectedOrderIds.has(order.id);
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => toggleOrder(order.id)}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" : "border-gray-100 dark:border-gray-700 hover:border-gray-200"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">طلب #{order.orderNumber}</h4>
                                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("ar-EG")}</p>
                                        </div>
                                        {isSelected && <CheckCircleIcon className="w-6 h-6 text-indigo-600" />}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">العميل:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{order.customer.firstName} {order.customer.lastName}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">الهاتف:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{order.customer.phone}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-500 font-bold">الإجمالي:</span>
                                            <span className="font-bold text-green-600">{order.total} ج.م</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-[10px] text-gray-400 mb-1">المنتجات:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {order.orderItems.map((item: any, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-[10px] rounded-md truncate max-w-[150px]">
                                                    {item.product.name} (x{item.quantity})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد طلبات متاحة</h3>
                        <p className="text-gray-500">ليس لديك طلبات جديدة متاحة للسحب من هذه الشركة.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <LinkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">الربط الداخلي بين الشركات</h2>
                    <p className="text-sm text-gray-500">اربط متجرك بشركات أخرى على المنصة لسحب المنتجات والطلبات</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab("connections")}
                    className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "connections"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    الشركات المتصلة ({connections.length})
                </button>
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === "requests"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    طلبات الربط ({requests.length})
                    {requests.length > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("consumers")}
                    className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "consumers"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    المشتركون ({consumers.length})
                </button>
                <button
                    onClick={() => setActiveTab("find")}
                    className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "find"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    إضافة شركة جديدة
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === "connections" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {connections.length > 0 ? (
                            connections.map((conn) => (
                                <div key={conn.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-4">
                                        <img
                                            src={conn.provider.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(conn.provider.name)}&background=random`}
                                            alt={conn.provider.name}
                                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{conn.provider.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{conn.provider.email}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] rounded-full">
                                            متصل
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => startPulling(conn)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <ShoppingCartIcon className="w-4 h-4" />
                                            سحب المنتجات
                                        </button>
                                        <button
                                            onClick={() => startPullingOrders(conn)}
                                            disabled={!conn.allowOrderPull}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                        >
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                            سحب الطلبات
                                        </button>
                                        <button
                                            onClick={() => deleteConnection(conn.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            قطع الاتصال
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center">
                                <div className="bg-gray-100 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <LinkIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-gray-900 dark:text-white font-medium">لا توجد شركات متصلة حالياً</h3>
                                <p className="text-gray-500 text-sm">ابدأ بالبحث عن شركة وإرسال طلب ربط</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "requests" && (
                    <div className="space-y-4">
                        {requests.length > 0 ? (
                            requests.map((req) => (
                                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl gap-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={req.requester.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.requester.name)}&background=random`}
                                            alt={req.requester.name}
                                            className="w-12 h-12 rounded-lg bg-gray-100 object-cover"
                                        />
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{req.requester.name}</h4>
                                            <p className="text-xs text-gray-500">{req.requester.email}</p>
                                            <p className="text-xs mt-1 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded italic">"{req.message}"</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRespond(req.id, "APPROVED")}
                                            disabled={respondingIds.has(req.id)}
                                            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            {respondingIds.has(req.id) ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                                            موافقة
                                        </button>
                                        <button
                                            onClick={() => handleRespond(req.id, "REJECTED")}
                                            disabled={respondingIds.has(req.id)}
                                            className="flex items-center gap-1 px-4 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            {respondingIds.has(req.id) ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <XCircleIcon className="w-4 h-4" />}
                                            رفض
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-500">لا توجد طلبات ربط واردة</div>
                        )}
                    </div>
                )}

                {activeTab === "consumers" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {consumers.length > 0 ? (
                            consumers.map((conn: any) => (
                                <div key={conn.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                                    <div className="flex items-center gap-3 mb-6">
                                        <img
                                            src={conn.consumer.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(conn.consumer.name)}&background=random`}
                                            alt={conn.consumer.name}
                                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{conn.consumer.name}</h4>
                                            <p className="text-xs text-gray-500">{conn.consumer.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] rounded-full">
                                            <UserGroupIcon className="w-3 h-3" />
                                            مشترك
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCartIcon className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium">سحب المنتجات</span>
                                            </div>
                                            <button
                                                onClick={() => updatePermission(conn.id, { allowProductPull: !conn.allowProductPull })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${conn.allowProductPull ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${conn.allowProductPull ? 'right-1' : 'right-7'}`}></span>
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <ArrowDownTrayIcon className="w-4 h-4 text-indigo-500" />
                                                <span className="text-sm font-medium">سحب الطلبات</span>
                                            </div>
                                            <button
                                                onClick={() => updatePermission(conn.id, { allowOrderPull: !conn.allowOrderPull })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${conn.allowOrderPull ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${conn.allowOrderPull ? 'right-1' : 'right-7'}`}></span>
                                            </button>
                                        </div>

                                        {/* Commission Rate */}
                                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
                                                <span className="text-sm font-medium">نسبة العمولة (%)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.5"
                                                    value={editingCommission[conn.id] ?? conn.commissionRate ?? ""}
                                                    onChange={(e) => setEditingCommission(prev => ({ ...prev, [conn.id]: e.target.value === "" ? null : Number(e.target.value) }))}
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-center bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-green-500"
                                                    placeholder="—"
                                                />
                                                <span className="text-xs text-gray-400">%</span>
                                                {(editingCommission[conn.id] !== undefined && editingCommission[conn.id] !== (conn.commissionRate ?? null)) && (
                                                    <button
                                                        onClick={() => {
                                                            updatePermission(conn.id, { commissionRate: editingCommission[conn.id] });
                                                        }}
                                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                                                    >
                                                        حفظ
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => deleteConnection(conn.id)}
                                            className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            إزالة المشترك
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-500">لا يوجد مشتركون حالياً</div>
                        )}
                    </div>
                )}

                {activeTab === "find" && (
                    <div className="max-w-xl mx-auto py-8 space-y-6">
                        {/* Company ID Card */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">معرف شركتك (Your Company ID)</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                                <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white dir-ltr text-left break-all" style={{ direction: "ltr" }}>
                                    {user?.companyId || "—"}
                                </code>
                                <button
                                    onClick={() => {
                                        if (user?.companyId) {
                                            navigator.clipboard.writeText(user.companyId);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                                >
                                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                    {copied ? "تم النسخ" : "نسخ"}
                                </button>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                شارك هذا المعرف مع الشركات الأخرى لتربط متجرك بهم
                            </p>
                        </div>

                        <h3 className="text-lg font-semibold text-center">إرسال طلب ربط جديد</h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    placeholder="أدخل معرف الشركة (Company ID)"
                                    className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 outline-none placeholder:text-right"
                                    dir="rtl"
                                />
                            </div>
                            <button
                                onClick={sendRequest}
                                disabled={searching || !searchId}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {searching ? <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" /> : "إرسال طلب الربط"}
                            </button>
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl">
                                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                                    * ملاحظة: يجب أن تطلب معرف الشركة من الطرف الآخر لإضافته هنا. سيحتاج الطرف الآخر للموافقة على الطلب قبل البدء في سحب البيانات.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default InternalIntegrations;
