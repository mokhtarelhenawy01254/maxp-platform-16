import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    TruckIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";

interface TurboOrder {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    shippingAddress?: {
        governorate?: string;
        city?: string;
    };
    trackingNumber?: string;
    createdAt: string;
}

const TurboRecords: React.FC = () => {
    const { t } = useTranslation();
    const { formatPrice } = useCurrency();
    const { formatDate } = useDateFormat();

    const [searchParams, setSearchParams] = useSearchParams();
    const [orders, setOrders] = useState<TurboOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshingStatuses, setRefreshingStatuses] = useState(false);
    const [creatingShipments, setCreatingShipments] = useState(false);

    const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [limit, setLimit] = useState(parseInt(searchParams.get("limit") || "20"));
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [filterType, setFilterType] = useState<"all" | "unshipped" | "shipped">(
        (searchParams.get("filterType") as any) || "all"
    );

    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

    useEffect(() => {
        fetchOrders();
    }, [page, limit, filterType]);

    // Update URL params when search state changes (handling debounce/button click manually below)
    const updateUrlParams = (newParams: Record<string, string>) => {
        const params = Object.fromEntries(searchParams.entries());
        Object.assign(params, newParams);

        // Clean up empty params
        Object.keys(params).forEach(key => {
            if (!params[key]) delete params[key];
        });

        setSearchParams(params, { replace: true });
    };

    const fetchOrders = async (currentSearch = searchQuery) => {
        setLoading(true);
        try {
            const params: any = {
                page: page.toString(),
                limit: limit.toString(),
                search: currentSearch,
            };

            // To filter unshipped orders (orders without Turbo tracking code or specific status)
            // Custom implementation: assuming backend supports these or we might need to filter.
            // Based on typical behavior, let's use the simple endpoint and filter here or pass a specific status if backend supports it.
            // We'll pass 'shippingProvider=turbo' if backend supported it, else we fetch orders and show.

            const response = await apiClient.get("/orders-new/simple", { params });

            if (response.data.success) {
                let fetchedOrders = response.data.data || [];

                // Filter locally if backend doesn't support specific 'unshipped turbo' flags directly
                // For Turbo: looking for orders that either have trackingNumber from Turbo, OR user wants to send them to Turbo
                if (filterType === "unshipped") {
                    fetchedOrders = fetchedOrders.filter((o: any) => !o.trackingNumber);
                } else if (filterType === "shipped") {
                    fetchedOrders = fetchedOrders.filter((o: any) => !!o.trackingNumber); // Basic check for tracking
                }

                setOrders(fetchedOrders);
                if (response.data.pagination) {
                    // If we filtered locally, pagination might be slightly off visually, but acceptable for MVP
                    setTotalPages(response.data.pagination.pages || 1);
                    setTotalOrders(response.data.pagination.total || fetchedOrders.length);
                }
            }
        } catch (error) {
            console.error("Error fetching Turbo records:", error);
            toast.error(t("orders.fetchError", "Failed to load orders"));
        } finally {
            setLoading(false);
        }
    };

    const handleSearchClick = () => {
        setPage(1);
        updateUrlParams({ search: searchQuery, page: "1", filterType });
        fetchOrders(searchQuery);
    };

    const handleFilterChange = (newFilter: "all" | "unshipped" | "shipped") => {
        setFilterType(newFilter);
        setPage(1);
        updateUrlParams({ filterType: newFilter, page: "1", search: searchQuery });
    };

    const toggleOrderSelection = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = () => {
        if (orders.length === 0) return;
        if (selectedOrders.length === orders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(orders.map(o => o.id)); // assuming 'id' is used for these actions
        }
    };

    // Turbo Actions
    const handleBulkCreateShipments = async () => {
        if (selectedOrders.length === 0) return toast.error("Select orders first");

        // Ensure we are sending the correct identifier (orderNumber vs id) based on backend. 
        // The previous implementation used selectedOrders containing orderNumbers or IDs. 
        // Assuming apiClient.post("/turbo/bulk/create-shipments", { orderIds: selectedOrders }) expects IDs based on standard.

        if (!window.confirm(`Are you sure you want to send ${selectedOrders.length} orders to Turbo?`)) return;

        setCreatingShipments(true);
        try {
            const response = await apiClient.post("/turbo/bulk/create-shipments", { orderIds: selectedOrders });
            if (response.data.success) {
                toast.success(`Success: ${response.data.data?.success?.length || 0}, Failed: ${response.data.data?.failed?.length || 0}`);
                fetchOrders(); // Refresh
                setSelectedOrders([]);
            } else {
                toast.error(response.data.message || "Failed to create shipments");
            }
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "An error occurred";
            toast.error(errorMsg);
        } finally {
            setCreatingShipments(false);
        }
    };

    const handleRefreshStatuses = async () => {
        // This could loop through selected orders to track them, or call a backend bulk track if exists.
        // For single orders: GET /api/turbo/orders/:orderId/track
        if (selectedOrders.length === 0) return toast.error("Select orders first");

        setRefreshingStatuses(true);
        let successCount = 0;
        let failCount = 0;

        for (const orderId of selectedOrders) {
            try {
                await apiClient.get(`/turbo/orders/${orderId}/track`);
                successCount++;
            } catch (err) {
                failCount++;
            }
        }

        toast.success(`Refresh complete. Success: ${successCount}, Fail: ${failCount}`);
        fetchOrders(); // Refresh table
        setSelectedOrders([]);
        setRefreshingStatuses(false);
    };

    // Get status color (using standard order status map)
    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'delivered') return 'bg-green-100 text-green-800';
        if (s === 'shipped') return 'bg-blue-100 text-blue-800';
        if (s === 'cancelled') return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TruckIcon className="h-6 w-6 text-blue-600" />
                        سجلات تربو (Turbo Records)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        إدارة الشحنات، متابعة الحالات، وإرسال الطلبات إلى تربو
                    </p>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={handleRefreshStatuses}
                        disabled={refreshingStatuses || selectedOrders.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${refreshingStatuses ? 'animate-spin' : ''}`} />
                        تحديث الحالة
                    </button>

                    <button
                        onClick={handleBulkCreateShipments}
                        disabled={creatingShipments || selectedOrders.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        <TruckIcon className="h-4 w-4" />
                        إرسال إلى تربو
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleFilterChange("all")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        الكل
                    </button>
                    <button
                        onClick={() => handleFilterChange("unshipped")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterType === 'unshipped' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        لم يتم الشحن
                    </button>
                    <button
                        onClick={() => handleFilterChange("shipped")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterType === 'shipped' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        مُشحنة
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-96">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث برقم الطلب، العميل، التتبع..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSearchClick}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                    >
                        بحث
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-right" dir="rtl">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={orders.length > 0 && selectedOrders.length === orders.length}
                                        onChange={toggleAllSelection}
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الطلب</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجمالي</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم التتبع</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                        جاري تحميل الطلبات...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        لا توجد طلبات مطابقة للبحث
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={() => toggleOrderSelection(order.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/orders/${encodeURIComponent(String(order.id))}`} className="text-blue-600 hover:text-blue-900 font-medium">
                                                #{order.orderNumber || order.id.substring(0, 8)}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                                            <div className="text-sm text-gray-500">{order.customerPhone}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {order.shippingAddress?.governorate} - {order.shippingAddress?.city}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatPrice(order.total)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {order.trackingNumber ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 font-mono border border-gray-200">
                                                    {order.trackingNumber}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {t(`orders.status.${order.status.toLowerCase()}`, order.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <Link to={`/orders/${encodeURIComponent(String(order.id))}`} className="text-blue-600 hover:text-blue-900 ml-3">
                                                عرض
                                            </Link>
                                            {/* Can add single-track button here if needed */}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination placeholder, would normally use standard pagination component */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        إجمالي الطلبات: <span className="font-medium">{totalOrders}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); updateUrlParams({ page: String(page - 1) }) }}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            السابق
                        </button>
                        <span className="px-3 py-1">صفحة {page} من {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => { setPage(p => p + 1); updateUrlParams({ page: String(page + 1) }) }}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            التالي
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TurboRecords;
