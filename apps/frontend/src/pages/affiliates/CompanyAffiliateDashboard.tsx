import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    BuildingStorefrontIcon,
    CurrencyDollarIcon,
    ShoppingBagIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    LinkIcon,
    UserGroupIcon,
    ArrowLeftCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";

interface Partner {
    id: string;
    name: string;
    logo: string;
    email: string;
}

interface CompanyAffiliate {
    connectionId: string;
    partner: Partner;
    role: "consumer" | "provider";
    totalOrders: number;
    totalCommissions: number;
    paidCommissions: number;
    pendingCommissions: number;
    lastOrderAt: string | null;
}

interface AffiliatesData {
    asConsumer: CompanyAffiliate[];
    asProvider: CompanyAffiliate[];
}

const CompanyAffiliateDashboard: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<AffiliatesData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const resp = await fetch("/api/v1/company-connections/affiliates", {
                headers: tokenManager.createAuthHeaders()
            });
            const result = await resp.json();
            if (result.success) {
                setData(result.data);
            } else {
                toast.error(result.message || "فشل جلب البيانات");
            }
        } catch (error) {
            tToast.error("affiliates_CompanyAffiliateDashboard.error_error_3711");
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (value: number) => {
        return `${value.toLocaleString("ar-EG")} ج.م`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const PartnerCard: React.FC<{ item: CompanyAffiliate }> = ({ item }) => {
        return (
            <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <img
                        src={item.partner.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partner.name)}&background=random`}
                        alt={item.partner.name}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">
                            {item.partner.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">{item.partner.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] rounded-full font-medium ${item.totalOrders > 0
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                        }`}>
                        {item.role === "consumer" ? "مورد" : "مسوق"}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                            <ShoppingBagIcon className="w-3.5 h-3.5" />
                            الطلبات
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {item.totalOrders}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                            <CurrencyDollarIcon className="w-3.5 h-3.5" />
                            إجمالي العمولات
                        </div>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatPrice(item.totalCommissions)}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                            مدفوع
                        </div>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatPrice(item.paidCommissions)}
                        </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                            <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                            معلق
                        </div>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {formatPrice(item.pendingCommissions)}
                        </p>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>آخر طلب: {formatDate(item.lastOrderAt)}</span>
                        <Link
                            to={item.role === "consumer" ? `/company-affiliates/consumer/${item.connectionId}` : `/company-affiliates/provider/${item.connectionId}`}
                            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                        >
                            <ArrowLeftCircleIcon className="w-3.5 h-3.5" />
                            {item.role === "consumer" ? "تفاصيل العمولات والسحب" : "عرض التفاصيل"}
                        </Link>
                    </div>
                </div>
            </div>
        );
    };

    const Section: React.FC<{
        title: string;
        icon: React.ReactNode;
        items: CompanyAffiliate[];
        emptyMessage: string;
        emptySubtext: string;
    }> = ({ title, icon, items, emptyMessage, emptySubtext }) => (
        <div>
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                    {items.length}
                </span>
            </div>
            {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                        <PartnerCard key={item.connectionId} item={item} />
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BuildingStorefrontIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">{emptyMessage}</h4>
                    <p className="text-sm text-gray-500">{emptySubtext}</p>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="py-20 text-center">
                        <ArrowPathIcon className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-500">جاري تحميل البيانات...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                        <BuildingStorefrontIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">الشركات المرتبطة</h2>
                        <p className="text-sm text-gray-500">نظرة عامة على علاقات الأفليت مع الشركات المتصلة</p>
                    </div>
                </div>
                {data && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.asConsumer.length}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">مورّدون</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.asProvider.length}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">مسوقون</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {data.asConsumer.reduce((s, i) => s + i.totalOrders, 0) + data.asProvider.reduce((s, i) => s + i.totalOrders, 0)}
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">إجمالي الطلبات</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatPrice(
                                    data.asConsumer.reduce((s, i) => s + i.totalCommissions, 0) +
                                    data.asProvider.reduce((s, i) => s + i.totalCommissions, 0)
                                )}
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">إجمالي العمولات</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Provider section */}
            <Section
                title="المورّدون (الشركات التي أشتري منها)"
                icon={<BuildingStorefrontIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                items={data?.asConsumer || []}
                emptyMessage="لا توجد شركات مورّدة مرتبطة"
                emptySubtext="اربط متجرك بمورّدين من تكامل المنصة > الربط الداخلي بين الشركات"
            />

            {/* Consumer section */}
            <Section
                title="المسوقون (الشركات التي تشتري مني)"
                icon={<UserGroupIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
                items={data?.asProvider || []}
                emptyMessage="لا توجد شركات مسوّقة مرتبطة"
                emptySubtext="المسوقون يظهرون هنا بعد ربطهم بمتجرك وسحب المنتجات"
            />
        </div>
    );
};

export default CompanyAffiliateDashboard;
