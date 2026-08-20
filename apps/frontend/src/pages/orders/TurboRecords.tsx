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
        { key: 'all', label: t('orders.k_67'), color: 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' },
        { key: 'active', label: t('orders.k_66'), color: 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-bold' },
        { key: 'merchant_preparing', label: t('orders.k_68'), color: 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 font-bold' },
        { key: 'preparing', label: t('orders.k_69'), color: 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 font-semibold' },
        { key: 'processing', label: t('orders.k_47'), color: 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' },
        { key: 'out_for_delivery', label: t('orders.k_28'), color: 'border-cyan-300 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200' },
        { key: 'delayed', label: t('orders.k_9'), color: 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' },
        { key: 'delivered', label: t('orders.deliveredOrders'), color: 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
        { key: 'remitted', label: t('orders.k_70'), color: 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' },
        { key: 'returned_to_company', label: t('orders.k_18'), color: 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200' },
        { key: 'returned_received', label: t('orders.k_72'), color: 'border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200' },
        { key: 'returned_to_customer', label: t('orders.k_73'), color: 'border-fuchsia-300 dark:border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200' },
        { key: 'returned_resent', label: t('orders.k_20'), color: 'border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200' },
        { key: 'returned_missing', label: t('orders.k_21'), color: 'border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200' },
        { key: 'returned_destroyed', label: t('orders.k_22'), color: 'border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/30 text-stone-800 dark:text-stone-200' },
        { key: 'cancelled', label: t('orders.k_15'), color: 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' },
        { key: 'archived', label: t('orders.k_71'), color: 'border-stone-400 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300' },
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TruckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        {t("orders.turboRecordsTitle")}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('orders.k_41')}
                    </p>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={handleRefreshStatuses}
                        disabled={refreshingStatuses}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
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

            {/* ≡ƒöÑ ╪º┘ä┘â╪▒┘ê╪¬ ╪º┘ä╪▒╪ª┘è╪│┘è╪⌐ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐ (╪º┘ä┘å╪┤╪╖╪⌐ / ╪¬╪¼┘ç┘è╪▓ ╪º┘ä╪¬╪º╪¼╪▒ / ┘à╪╣╪º┘ä╪¼╪⌐ ╪º┘ä┘ü╪▒╪╣ / ╪º┘ä┘â┘ä) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. ┘â╪º╪▒╪¬ ╪º┘ä╪┤╪¡┘å╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐ ┘ü┘è ╪¬╪▒╪¿┘ê */}
                <button
                    onClick={() => handleFilterChange('active')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'active' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 scale-[1.02]' : 'border-amber-200 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-800/60 px-2 py-0.5 rounded-md">{t('orders.k_42')}</span>
                        <TruckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-2xl font-black text-amber-900 dark:text-amber-100">{getStatusCount('active')} {t('orders.k_43')}</div>
                    <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">{t('orders.k_44')}</div>
                </button>

                {/* 2. ┘â╪º╪▒╪¬ ╪¬╪¼┘ç┘è╪▓ ╪º┘ä╪¬╪º╪¼╪▒ (┘é╪¿┘ä ╪º┘ä╪¿┘è┘â ╪ú╪¿ ┘ê╪º┘ä┘ü╪▒╪╣) */}
                <button
                    onClick={() => handleFilterChange('merchant_preparing')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'merchant_preparing' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-400 scale-[1.02]' : 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-200/80 dark:bg-indigo-800/60 px-2 py-0.5 rounded-md">{t('orders.k_45')}</span>
                        <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{getStatusCount('merchant_preparing')} {t('orders.k_43')}</div>
                    <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 font-medium">{t('orders.k_46')}</div>
                </button>

                {/* 3. ┘â╪º╪▒╪¬ ┘à╪╣╪º┘ä╪¼╪⌐ ╪º┘ä╪┤╪¡┘å ╪¿╪º┘ä┘ü╪▒╪╣ */}
                <button
                    onClick={() => handleFilterChange('processing')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'processing' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-400 scale-[1.02]' : 'border-purple-200 dark:border-purple-700 bg-purple-50/60 dark:bg-purple-900/20 hover:bg-purple-50 dark:hover:bg-purple-900/30'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-purple-800 dark:text-purple-200 bg-purple-200/80 dark:bg-purple-800/60 px-2 py-0.5 rounded-md">{t('orders.k_47')}</span>
                        <InformationCircleIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-purple-900 dark:text-purple-100">{getStatusCount('processing')} {t('orders.k_43')}</div>
                    <div className="text-xs text-purple-700 dark:text-purple-300 mt-1 font-medium">{t('orders.k_48')}</div>
                </button>

                {/* 4. ┘â╪º╪▒╪¬ ╪Ñ╪¼┘à╪º┘ä┘è ╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪¬╪▒╪¿┘ê */}
                <button
                    onClick={() => handleFilterChange('all')}
                    className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer shadow-sm hover:shadow-md ${filterType === 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-800/60 px-2 py-0.5 rounded-md">{t('orders.k_49')}</span>
                        <TruckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{totalOrders} {t('orders.k_43')}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{t('orders.k_50')}</div>
                </button>
            </div>

            {/* Structured Status Categories */}
            <div className="space-y-4 mb-6">
                {/* ╪º┘ä╪¬┘é╪│┘è┘à ╪º┘ä╪¬┘ü╪╡┘è┘ä┘è ┘ä╪¼┘à┘è╪╣ ╪¡╪º┘ä╪º╪¬ ╪¬╪▒╪¿┘ê */}
                <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TruckIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
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
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('orders.k_32')}</span>
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
                            className="w-full pl-3 pr-9 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSearchClick}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-xs whitespace-nowrap"
                    >
                        {t("orders.search")}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right" dir="rtl">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={orders.length > 0 && selectedOrders.length === orders.length}
                                        onChange={toggleAllSelection}
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.orderLabel")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.customer")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.total")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.orderStatus")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.trackingNumber")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('orders.k_33')}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.date")}</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("orders.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                        </div>
                                        {t("orders.loadingOrders")}
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t("orders.noOrdersFound")}
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={() => toggleOrderSelection(order.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/orders/${encodeURIComponent(String(order.id))}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium">
                                                #{order.orderNumber || order.id.substring(0, 8)}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.customerName}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{order.customerPhone}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {order.governorate} - {order.city}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
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
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono border border-gray-200 dark:border-gray-600">
                                                            {order.turboTrackingNumber || order.turboShipmentId}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTurboStatusColor(order.turboShipmentStatus || '')}`}>
                                                    {getTurboStatusDisplay(order.turboShipmentStatus || '').label}
                                                </span>
                                                {(order.turboLiveStatus || order.turboCaptainName) && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {order.turboLiveStatus?.status || order.turboShipmentStatus}
                                                        {order.turboCaptainName && ` - ┘à┘å╪»┘ê╪¿: ${order.turboCaptainName}`}
                                                        {order.turboCaptainName && order.turboCaptainPhone && ` (${order.turboCaptainPhone})`}
                                                        {!order.turboCaptainName && order.turboLiveStatus?.captain && ` - ${order.turboLiveStatus.captain}`}
                                                    </span>
                                                )}
                                                {order.turboBranchName && (
                                                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 font-medium">
                                                        ┘ü╪▒╪╣: {order.turboBranchName}{order.turboBranchPhone ? ` (${order.turboBranchPhone})` : ''}
                                                    </span>
                                                )}
                                                {(order.turboReturnReason || order.turboLiveStatus?.returnReason) && (
                                                    <span className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800 font-medium">
                                                        {t('orders.k_39')} {order.turboReturnReason || order.turboLiveStatus?.returnReason}
                                                    </span>
                                                )}
                                                {(order.turboDelayReason || order.turboLiveStatus?.delayReason) && (
                                                    <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-800 font-medium">
                                                        {t('orders.k_40')} {order.turboDelayReason || order.turboLiveStatus?.delayReason}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <Link to={`/orders/${encodeURIComponent(String(order.id))}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 ml-3">
                                                {t("orders.view")}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        {t("orders.totalOrders")}: <span className="font-medium">{totalOrders}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); updateUrlParams({ page: String(page - 1) }) }}
                            className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                        >
                            {t("orders.previous")}
                        </button>
                        <span className="px-3 py-1 text-gray-700 dark:text-gray-300">{t("orders.pageOf", { page, totalPages })}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => { setPage(p => p + 1); updateUrlParams({ page: String(page + 1) }) }}
                            className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
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
