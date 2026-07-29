import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
    BuildingStorefrontIcon,
    CurrencyDollarIcon,
    ShoppingBagIcon,
    ArrowPathIcon,
    BanknotesIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowLeftIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import tokenManager from "../../utils/tokenManager";

interface OrderItem {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    sourceType: string;
}

interface CommissionItem {
    id: string;
    amount: number;
    status: string;
    type: string;
    rate: number | null;
    orderTotal: number;
    createdAt: string;
    orderNumber: string;
    orderStatus: string;
}

interface PayoutItem {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    notes: string;
    transactionId: string;
    proofFileUrl: string;
    processedAt: string;
    createdAt: string;
}

type TabType = "orders" | "commissions" | "payouts";

const formatPrice = (value: number) => `${value.toLocaleString("ar-EG")} ج.م`;
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("ar-EG");

const getStatusColor = (status: string) => {
    switch (status) {
        case "CONFIRMED": case "PROCESSED": return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
        case "PENDING": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
        case "PAID": return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
        case "CANCELLED": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
        default: return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
    }
};

const getStatusText = (s: string) => {
    switch (s) {
        case "CONFIRMED": return "مؤكدة";
        case "PENDING": return "قيد الانتظار";
        case "PROCESSED": case "PAID": return "تم الدفع";
        case "CANCELLED": return "ملغية";
        case "PROCESSING": return "قيد المعالجة";
        default: return s;
    }
};

const CompanyProviderDetail: React.FC = () => {
    const { connectionId } = useParams<{ connectionId: string }>();

    const [activeTab, setActiveTab] = useState<TabType>("orders");
    const [summary, setSummary] = useState({ totalCommissions: 0, paidCommissions: 0, pendingCommissions: 0, totalOrders: 0 });

    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [ordersTotal, setOrdersTotal] = useState(0);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersPages, setOrdersPages] = useState(0);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const [commissions, setCommissions] = useState<CommissionItem[]>([]);
    const [commissionsTotal, setCommissionsTotal] = useState(0);
    const [commissionsPage, setCommissionsPage] = useState(1);
    const [commissionsPages, setCommissionsPages] = useState(0);
    const [commissionsSummary, setCommissionsSummary] = useState({ totalCommissions: 0, paidCommissions: 0, pendingCommissions: 0 });
    const [loadingCommissions, setLoadingCommissions] = useState(false);

    const [payouts, setPayouts] = useState<PayoutItem[]>([]);
    const [payoutsTotal, setPayoutsTotal] = useState(0);
    const [payoutsPage, setPayoutsPage] = useState(1);
    const [payoutsPages, setPayoutsPages] = useState(0);
    const [loadingPayouts, setLoadingPayouts] = useState(false);

    const loadOrders = useCallback(async (page: number) => {
        setLoadingOrders(true);
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/provider/orders?page=${page}&limit=20`, {
                headers: tokenManager.createAuthHeaders()
            });
            const result = await resp.json();
            if (result.success) {
                setOrders(result.data.orders);
                setOrdersTotal(result.data.total);
                setOrdersPages(result.data.totalPages);
                setOrdersPage(result.data.page);
            }
        } catch {
            tToast.error("affiliates_CompanyProviderDetail.failed_load_0d15");
        } finally {
            setLoadingOrders(false);
        }
    }, [connectionId]);

    const loadCommissions = useCallback(async (page: number) => {
        setLoadingCommissions(true);
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/provider/commissions?page=${page}&limit=20`, {
                headers: tokenManager.createAuthHeaders()
            });
            const result = await resp.json();
            if (result.success) {
                setCommissions(result.data.commissions);
                setCommissionsTotal(result.data.total);
                setCommissionsPages(result.data.totalPages);
                setCommissionsPage(result.data.page);
                setCommissionsSummary(result.data.summary);
            }
        } catch {
            tToast.error("affiliates_CompanyProviderDetail.failed_load_728a");
        } finally {
            setLoadingCommissions(false);
        }
    }, [connectionId]);

    const loadPayouts = useCallback(async (page: number) => {
        setLoadingPayouts(true);
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/provider/payouts?page=${page}&limit=20`, {
                headers: tokenManager.createAuthHeaders()
            });
            const result = await resp.json();
            if (result.success) {
                setPayouts(result.data.payouts);
                setPayoutsTotal(result.data.total);
                setPayoutsPages(result.data.totalPages);
                setPayoutsPage(result.data.page);
            }
        } catch {
            tToast.error("affiliates_CompanyProviderDetail.failed_load_c88c");
        } finally {
            setLoadingPayouts(false);
        }
    }, [connectionId]);

    const loadSummary = useCallback(async () => {
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/provider/commissions?page=1&limit=1`, {
                headers: tokenManager.createAuthHeaders()
            });
            const result = await resp.json();
            if (result.success && result.data.summary) {
                setCommissionsSummary(result.data.summary);
                setSummary(prev => ({ ...prev, ...result.data.summary }));
            }
            const resp2 = await fetch(`/api/v1/company-connections/${connectionId}/provider/orders?page=1&limit=1`, {
                headers: tokenManager.createAuthHeaders()
            });
            const result2 = await resp2.json();
            if (result2.success) {
                setSummary(prev => ({ ...prev, totalOrders: result2.data.total }));
            }
        } catch { /* ignore */ }
    }, [connectionId]);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { if (activeTab === "orders") loadOrders(1); }, [activeTab, loadOrders]);
    useEffect(() => { if (activeTab === "commissions") loadCommissions(1); }, [activeTab, loadCommissions]);
    useEffect(() => { if (activeTab === "payouts") loadPayouts(1); }, [activeTab, loadPayouts]);

    const handleRecordPayout = async (payoutId: string) => {
        const txId = prompt("رقم المعاملة (اختياري):");
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/provider/payouts/${payoutId}/record`, {
                method: "POST",
                headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ transactionId: txId || "" })
            });
            const result = await resp.json();
            if (result.success) {
                tToast.success("affiliates_CompanyProviderDetail.msg_ff78");
                loadPayouts(payoutsPage);
                loadSummary();
            } else {
                toast.error(result.message || "فشل تسجيل الدفع");
            }
        } catch {
            tToast.error("affiliates_CompanyProviderDetail.error_error_fe90");
        }
    };

    const handleCancelPayout = async (payoutId: string) => {
        const reason = prompt("سبب الإلغاء:");
        if (!reason) return;
        try {
            const resp = await fetch(`/api/v1/company-connections/${connectionId}/provider/payouts/${payoutId}/cancel`, {
                method: "POST",
                headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ reason })
            });
            const result = await resp.json();
            if (result.success) {
                tToast.success("affiliates_CompanyProviderDetail.msg_badc");
                loadPayouts(payoutsPage);
                loadSummary();
            } else {
                toast.error(result.message || "فشل الإلغاء");
            }
        } catch {
            tToast.error("affiliates_CompanyProviderDetail.error_error_fe90");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <Link to="/company-affiliates" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ArrowLeftIcon className="w-4 h-4" />
                        العودة للشركات المرتبطة
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <BuildingStorefrontIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تفاصيل الشركة المسوقة</h1>
                        <p className="text-sm text-gray-500">الأوردرات والعمولات وطلبات السحب</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <p className="text-xs text-blue-600 dark:text-blue-400">إجمالي العمولات</p>
                        <p className="text-lg font-bold text-blue-600">{formatPrice(commissionsSummary.totalCommissions)}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <p className="text-xs text-green-600 dark:text-green-400">مدفوع</p>
                        <p className="text-lg font-bold text-green-600">{formatPrice(commissionsSummary.paidCommissions)}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                        <p className="text-xs text-amber-600 dark:text-amber-400">معلق</p>
                        <p className="text-lg font-bold text-amber-600">{formatPrice(commissionsSummary.pendingCommissions)}</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                        <p className="text-xs text-purple-600 dark:text-purple-400">إجمالي الطلبات</p>
                        <p className="text-lg font-bold text-purple-600">{summary.totalOrders}</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                {([{ k: "orders", l: "الطلبات الواردة", icon: ShoppingBagIcon },
                    { k: "commissions", l: "العمولات", icon: CurrencyDollarIcon },
                    { k: "payouts", l: "طلبات السحب", icon: BanknotesIcon },
                ] as const).map(({ k, l, icon: Icon }) => (
                    <button
                        key={k}
                        onClick={() => setActiveTab(k as TabType)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === k ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                    >
                        <Icon className="w-4 h-4" />
                        {l}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {activeTab === "orders" && (
                    <div className="p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">الطلبات الواردة من الشركة المسوقة</h3>
                        {loadingOrders ? (
                            <div className="py-12 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>
                        ) : orders.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">لا توجد طلبات واردة</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500">
                                                <th className="p-3">رقم الطلب</th>
                                                <th className="p-3">الحالة</th>
                                                <th className="p-3">الإجمالي</th>
                                                <th className="p-3">التاريخ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((o) => (
                                                <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="p-3 font-mono text-blue-600 dark:text-blue-400">{o.orderNumber}</td>
                                                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(o.status)}`}>{getStatusText(o.status)}</span></td>
                                                    <td className="p-3 font-bold">{formatPrice(o.total)}</td>
                                                    <td className="p-3 text-gray-500">{formatDate(o.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {ordersPages > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        {Array.from({ length: ordersPages }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => loadOrders(p)} className={`px-3 py-1 rounded-md text-sm ${p === ordersPage ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>{p}</button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === "commissions" && (
                    <div className="p-6">
                        {commissionsSummary.totalCommissions > 0 && (
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                    <p className="text-xs text-blue-600 dark:text-blue-400">الإجمالي</p>
                                    <p className="text-lg font-bold text-blue-600">{formatPrice(commissionsSummary.totalCommissions)}</p>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                    <p className="text-xs text-green-600 dark:text-green-400">مدفوع</p>
                                    <p className="text-lg font-bold text-green-600">{formatPrice(commissionsSummary.paidCommissions)}</p>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                                    <p className="text-xs text-amber-600 dark:text-amber-400">معلق</p>
                                    <p className="text-lg font-bold text-amber-600">{formatPrice(commissionsSummary.pendingCommissions)}</p>
                                </div>
                            </div>
                        )}
                        {loadingCommissions ? (
                            <div className="py-12 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>
                        ) : commissions.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">لا توجد عمولات مسجلة</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500">
                                                <th className="p-3">رقم الطلب</th>
                                                <th className="p-3">العمولة</th>
                                                <th className="p-3">الحالة</th>
                                                <th className="p-3">التاريخ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {commissions.map((c) => (
                                                <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="p-3 font-mono text-blue-600 dark:text-blue-400">{c.orderNumber || "—"}</td>
                                                    <td className="p-3 font-bold text-green-600">+{formatPrice(c.amount)}</td>
                                                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(c.status)}`}>{getStatusText(c.status)}</span></td>
                                                    <td className="p-3 text-gray-500">{formatDate(c.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {commissionsPages > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        {Array.from({ length: commissionsPages }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => loadCommissions(p)} className={`px-3 py-1 rounded-md text-sm ${p === commissionsPage ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>{p}</button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === "payouts" && (
                    <div className="p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">طلبات السحب من الشركة المسوقة</h3>
                        {loadingPayouts ? (
                            <div className="py-12 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>
                        ) : payouts.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">لا توجد طلبات سحب</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500">
                                                <th className="p-3">التاريخ</th>
                                                <th className="p-3">المبلغ</th>
                                                <th className="p-3">طريقة الدفع</th>
                                                <th className="p-3">الحالة</th>
                                                <th className="p-3">الإجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payouts.map((p) => (
                                                <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="p-3 text-gray-500">{formatDate(p.createdAt)}</td>
                                                    <td className="p-3 font-bold">{formatPrice(p.amount)}</td>
                                                    <td className="p-3">{p.paymentMethod || "—"}</td>
                                                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(p.status)}`}>{getStatusText(p.status)}</span></td>
                                                    <td className="p-3">
                                                        {p.status === "PENDING" ? (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleRecordPayout(p.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">
                                                                    <CheckCircleIcon className="w-3.5 h-3.5 inline ml-1" />
                                                                    قبول
                                                                </button>
                                                                <button onClick={() => handleCancelPayout(p.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg">
                                                                    <XCircleIcon className="w-3.5 h-3.5 inline ml-1" />
                                                                    إلغاء
                                                                </button>
                                                            </div>
                                                        ) : p.proofFileUrl ? (
                                                            <a href={p.proofFileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                                                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                                                إثبات التحويل
                                                            </a>
                                                        ) : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {payoutsPages > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        {Array.from({ length: payoutsPages }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => loadPayouts(p)} className={`px-3 py-1 rounded-md text-sm ${p === payoutsPage ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>{p}</button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyProviderDetail;
