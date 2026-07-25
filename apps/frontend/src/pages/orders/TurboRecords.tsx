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
    CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { getTurboStatusDisplay, getStatusDisplay } from "../../utils/statusRegistry";

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
    const [serverStatusCounts, setServerStatusCounts] = useState<Record<string, number>>({});
    const [financialSummary, setFinancialSummary] = useState<{
        pendingRemittanceAmount: number;
        pendingRemittanceCount: number;
        activeInTransitAmount: number;
        activeInTransitCount: number;
        remittedAmount: number;
        remittedCount: number;
    } | null>(null);

    const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [limit, setLimit] = useState(parseInt(searchParams.get("limit") || "20"));
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [filterType, setFilterType] = useState<string>(
        searchParams.get("filterType") || "all"
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
                if (response.data.statusCounts) {
                    setServerStatusCounts(response.data.statusCounts);
                }
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

    const handleFilterChange = (newFilter: string) => {
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
                toast.success(t("orders.turboRecordsBulkSuccess", "Created shipments successfully"));
                setSelectedOrders([]);
                fetchOrders();
            } else {
                toast.error(response.data.message || "Failed to create shipments");
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || t("orders.turboRecordsBulkError", "Failed to create shipments");
            toast.error(errorMsg);
        } finally {
            setCreatingShipments(false);
        }
    };

    const handleRefreshStatuses = async () => {
        setRefreshingStatuses(true);
        try {
            const params: any = {
                page: page.toString(),
                limit: limit.toString(),
                search: searchQuery,
                filterType,
                refresh: "true",
            };
            const response = await apiClient.get("/turbo/records", { params });
            if (response.data.success) {
                setOrders(response.data.data || []);
                if (response.data.statusCounts) {
                    setServerStatusCounts(response.data.statusCounts);
                }
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.pages || 1);
                    setTotalOrders(response.data.pagination.total || 0);
                }
                toast.success(t("orders.statusUpdated", t('orders.k_1')));
            }
        } catch (err) {
            toast.error(t("orders.updateError", t('orders.k_2')));
        } finally {
            setRefreshingStatuses(false);
        }
    };

    const getTurboStatusColor = (status: string) => {
        return getTurboStatusDisplay(status).colorClass;
    };

    const filterOptions = [
        { key: 'all', label: t('orders.k_67'), color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { key: 'active', label: t('orders.k_66'), color: 'border-amber-400 bg-amber-50 text-amber-900 font-bold' },
        { key: 'merchant_preparing', label: t('orders.k_68'), color: 'border-indigo-400 bg-indigo-50 text-indigo-900 font-bold' },
        { key: 'preparing', label: t('orders.k_69'), color: 'border-purple-400 bg-purple-50 text-purple-900 font-semibold' },
        { key: 'processing', label: t('orders.k_47'), color: 'border-purple-300 bg-purple-50 text-purple-800' },
        { key: 'out_for_delivery', label: t('orders.k_28'), color: 'border-cyan-300 bg-cyan-50 text-cyan-800' },
        { key: 'delayed', label: t('orders.k_9'), color: 'border-amber-300 bg-amber-50 text-amber-800' },
        { key: 'delivered', label: t('orders.deliveredOrders'), color: 'border-green-300 bg-green-50 text-green-800' },
        { key: 'remitted', label: t('orders.k_70'), color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
        { key: 'returned_to_company', label: t('orders.k_18'), color: 'border-red-300 bg-red-50 text-red-800' },
        { key: 'returned_received', label: t('orders.k_72'), color: 'border-violet-300 bg-violet-50 text-violet-800' },
        { key: 'returned_resent', label: t('orders.k_20'), color: 'border-sky-300 bg-sky-50 text-sky-800' },
        { key: 'returned_missing', label: t('orders.k_21'), color: 'border-rose-300 bg-rose-50 text-rose-800' },
        { key: 'returned_destroyed', label: t('orders.k_22'), color: 'border-stone-300 bg-stone-50 text-stone-800' },
        { key: 'cancelled', label: t('orders.k_15'), color: 'border-gray-400 bg-gray-100 text-gray-800' },
        { key: 'archived', label: t('orders.k_71'), color: 'border-stone-400 bg-stone-100 text-stone-800' },
    ];

    const getStatusCount = (key: string) => {
        if (key === 'all') return totalOrders;
        if (serverStatusCounts[key] !== undefined) return serverStatusCounts[key];
        return orders.filter(o => (o.turboShipmentStatus || 'unshipped').toLowerCase() === key).length;
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TruckIcon className="h-6 w-6 text-blue-600" />
                        {t("orders.turboRecordsTitle")}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('orders.k_41')}
                    </p>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={handleRefreshStatuses}
                        disabled={refreshingStatuses}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${refreshingStatuses ? 'animate-spin' : ''}`} />
                        {t("orders.turboRecordsUpdateStatus")}
                    </button>

                    <button
                        onClick={handleBulkCreateShipments}
                        disabled={creatingShipments || selectedOrders.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                        <TruckIcon className="h-4 w-4" />
                        {t("orders.turboRecordsSendToTurbo")}
                    </button>
                </div>
            </div>

            {/* 🔥 الكروت الرئيسية المطلوبة (النشطة / تجهيز التاجر / معالجة الفرع / الكل) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. كارت الشحنات النشطة في تربو */}
                <button
                    onClick={() => handleFilterChange('active')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'active' ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400 scale-[1.02]' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">{t('orders.k_42')}</span>
                        <TruckIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-900">{getStatusCount('active')} {t('orders.k_43')}</div>
                    <div className="text-xs text-amber-700 mt-1 font-medium">{t('orders.k_44')}</div>
                </button>

                {/* 2. كارت تجهيز التاجر (قبل البيك أب والفرع) */}
                <button
                    onClick={() => handleFilterChange('merchant_preparing')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'merchant_preparing' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400 scale-[1.02]' : 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-800 bg-indigo-200/80 px-2 py-0.5 rounded-md">{t('orders.k_45')}</span>
                        <InformationCircleIcon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-indigo-900">{getStatusCount('merchant_preparing')} {t('orders.k_43')}</div>
                    <div className="text-xs text-indigo-700 mt-1 font-medium">{t('orders.k_46')}</div>
                </button>

                {/* 3. كارت معالجة الشحن بالفرع */}
                <button
                    onClick={() => handleFilterChange('processing')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'processing' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-400 scale-[1.02]' : 'border-purple-200 bg-purple-50/60 hover:bg-purple-50'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded-md">{t('orders.k_47')}</span>
                        <InformationCircleIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-purple-900">{getStatusCount('processing')} {t('orders.k_43')}</div>
                    <div className="text-xs text-purple-700 mt-1 font-medium">{t('orders.k_48')}</div>
                </button>

                {/* 4. كارت إجمالي أوردرات تربو */}
                <button
                    onClick={() => handleFilterChange('all')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'all' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400 scale-[1.02]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">{t('orders.k_49')}</span>
                        <TruckIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-900">{totalOrders} {t('orders.k_43')}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">{t('orders.k_50')}</div>
                </button>
            </div>

            {/* Structured Status Categories */}
            <div className="space-y-4 mb-6">
                {/* التقسيم التفصيلي لجميع حالات تربو */}
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TruckIcon className="h-4 w-4 text-blue-500" />
                        {t('orders.k_51')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {filterOptions.filter(o => !['all', 'active', 'preparing'].includes(o.key)).map(item => (
                            <button
                                key={item.key}
                                onClick={() => handleFilterChange(item.key)}
                                className={`rounded-xl border-2 ${item.color} p-2.5 text-center transition-all cursor-pointer hover:shadow-md ${filterType === item.key ? 'ring-2 ring-blue-500 scale-105 font-bold shadow-sm' : 'opacity-85 hover:opacity-100'}`}
                            >
                                <div className="text-lg font-extrabold">{getStatusCount(item.key)}</div>
                                <div className="text-[11px] font-medium truncate">{item.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">{t('orders.k_32')}</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                        {filterOptions.find(f => f.key === filterType)?.label || filterType}
                    </span>
                </div>

                <div className="flex items-center gap-2 w-full md:w-80">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t("orders.turboRecordsSearchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSearchClick}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-xs whitespace-nowrap"
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
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.orderStatus")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.trackingNumber")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('orders.k_33')}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.date")}</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                        {t("orders.loadingOrders")}
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
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
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusDisplay(order.status).colorClass}`}>
                                                {getStatusDisplay(order.status).label}
                                            </span>
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
                                                    {getTurboStatusDisplay(order.turboShipmentStatus || '').label}
                                                </span>
                                                {order.turboLiveStatus && (
                                                    <span className="text-xs text-gray-400">
                                                        {order.turboLiveStatus.status}
                                                        {order.turboLiveStatus.captain && ` - ${order.turboLiveStatus.captain}`}
                                                    </span>
                                                )}
                                                {order.turboLiveStatus?.returnReason && (
                                                    <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-medium">
                                                        {t('orders.k_39')} {order.turboLiveStatus.returnReason}
                                                    </span>
                                                )}
                                                {order.turboLiveStatus?.delayReason && (
                                                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-medium">
                                                        {t('orders.k_40')} {order.turboLiveStatus.delayReason}
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
