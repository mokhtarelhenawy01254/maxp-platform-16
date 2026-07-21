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

interface TurboLiveStatus {
    status: string;
    statusCode: number;
    internalStatus: string;
    captain: string | null;
    captainNumber1: string | null;
    branch: string | null;
    receivedAmount: string | null;
    returnReason: string | null;
    delayReason: string | null;
}

interface TurboOrder {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    total: number;
    status: string;
    turboShipmentId?: string;
    turboTrackingNumber?: string;
    turboShipmentStatus?: string;
    turboLiveStatus?: TurboLiveStatus | null;
    governorate?: string;
    city?: string;
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

    const updateUrlParams = (newParams: Record<string, string>) => {
        const params = Object.fromEntries(searchParams.entries());
        Object.assign(params, newParams);
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
                filterType,
            };

            const response = await apiClient.get("/turbo/records", { params });

            if (response.data.success) {
                setOrders(response.data.data || []);
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.pages || 1);
                    setTotalOrders(response.data.pagination.total || 0);
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
            setSelectedOrders(orders.map(o => o.id));
        }
    };

    const handleBulkCreateShipments = async () => {
        if (selectedOrders.length === 0) return toast.error("Select orders first");
        if (!window.confirm(`Are you sure you want to send ${selectedOrders.length} orders to Turbo?`)) return;

        setCreatingShipments(true);
        try {
            const response = await apiClient.post("/turbo/bulk/create-shipments", { orderIds: selectedOrders });
            if (response.data.success) {
                toast.success(`Success: ${response.data.data?.success?.length || 0}, Failed: ${response.data.data?.failed?.length || 0}`);
                fetchOrders();
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
        setRefreshingStatuses(true);
        try {
            await fetchOrders();
            toast.success(t("orders.statusUpdated", "تم تحديث الحالات"));
        } catch (err) {
            toast.error(t("orders.updateError", "فشل في تحديث الحالات"));
        } finally {
            setRefreshingStatuses(false);
        }
    };

    const getTurboStatusColor = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s === 'delivered' || s === 'completed') return 'bg-green-100 text-green-800';
        if (s === 'out_for_delivery') return 'bg-blue-100 text-blue-800';
        if (s === 'cancelled') return 'bg-red-100 text-red-800';
        if (s === 'returned') return 'bg-orange-100 text-orange-800';
        if (s === 'processing' || s === 'confirmed' || s === 'shipped') return 'bg-yellow-100 text-yellow-800';
        if (s === 'failed_delivery' || s === 'lost') return 'bg-red-100 text-red-800';
        if (s === 'incomplete') return 'bg-red-50 text-red-700 border border-red-200';
        if (s === 'delayed') return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    };

    const statusSummaryItems = [
        { key: 'incomplete', label: 'غير مكتملة', color: 'border-red-300 bg-red-50' },
        { key: 'pending', label: 'قيد الإنتظار', color: 'border-gray-300 bg-gray-50' },
        { key: 'processing', label: 'قيد التنفيذ', color: 'border-yellow-300 bg-yellow-50' },
        { key: 'out_for_delivery', label: 'قيد التوصيل', color: 'border-blue-300 bg-blue-50' },
        { key: 'delivered', label: 'تم التوصيل', color: 'border-green-300 bg-green-50' },
        { key: 'returned', label: 'مرتجع', color: 'border-orange-300 bg-orange-50' },
        { key: 'cancelled', label: 'ملغي', color: 'border-red-300 bg-red-50' },
        { key: 'failed_delivery', label: 'فشل توصيل', color: 'border-red-300 bg-red-50' },
        { key: 'delayed', label: 'متأخر', color: 'border-purple-300 bg-purple-50' },
    ];

    const statusCounts = statusSummaryItems.map(s => ({
        ...s,
        count: orders.filter(o => (o.turboShipmentStatus || '').toLowerCase() === s.key).length
    }));

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TruckIcon className="h-6 w-6 text-blue-600" />
                        {t("orders.turboRecordsTitle")}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t("orders.turboRecordsSubtitle")}
                    </p>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={handleRefreshStatuses}
                        disabled={refreshingStatuses}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${refreshingStatuses ? 'animate-spin' : ''}`} />
                        {t("orders.turboRecordsUpdateStatus")}
                    </button>

                    <button
                        onClick={handleBulkCreateShipments}
                        disabled={creatingShipments || selectedOrders.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        <TruckIcon className="h-4 w-4" />
                        {t("orders.turboRecordsSendToTurbo")}
                    </button>
                </div>
            </div>

            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {statusCounts.map(item => (
                    <div key={item.key} className={`rounded-xl border-2 ${item.color} p-3 text-center`}>
                        <div className="text-2xl font-bold text-gray-800">{item.count}</div>
                        <div className="text-xs text-gray-600 mt-1">{item.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleFilterChange("all")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {t("orders.all")}
                    </button>
                    <button
                        onClick={() => handleFilterChange("unshipped")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterType === 'unshipped' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {t("orders.turboRecordsUnshipped")}
                    </button>
                    <button
                        onClick={() => handleFilterChange("shipped")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterType === 'shipped' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        {t("orders.turboRecordsShipped")}
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-96">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t("orders.turboRecordsSearchPlaceholder")}
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
                        {t("orders.search")}
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
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.orderLabel")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.customer")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.total")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.trackingNumber")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حالة الشحن</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.date")}</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                        {t("orders.loadingOrders")}
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        {t("orders.noOrdersFound")}
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
                                                {order.governorate} - {order.city}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatPrice(order.total)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {order.turboTrackingNumber || order.turboShipmentId ? (
                                                <div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 font-mono border border-gray-200">
                                                        {order.turboTrackingNumber || order.turboShipmentId}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTurboStatusColor(order.turboShipmentStatus || '')}`}>
                                                    {order.turboShipmentStatus || "غير مرسلة"}
                                                </span>
                                                {order.turboLiveStatus && (
                                                    <span className="text-xs text-gray-400">
                                                        {order.turboLiveStatus.status}
                                                        {order.turboLiveStatus.captain && ` - ${order.turboLiveStatus.captain}`}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <Link to={`/orders/${encodeURIComponent(String(order.id))}`} className="text-blue-600 hover:text-blue-900 ml-3">
                                                {t("orders.view")}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        {t("orders.totalOrders")}: <span className="font-medium">{totalOrders}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); updateUrlParams({ page: String(page - 1) }) }}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            {t("orders.previous")}
                        </button>
                        <span className="px-3 py-1">{t("orders.pageOf", { page, totalPages })}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => { setPage(p => p + 1); updateUrlParams({ page: String(page + 1) }) }}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            {t("orders.next")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TurboRecords;
