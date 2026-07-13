import React, { useState, useEffect } from "react";
import {
    TrendingUp,
    Calendar,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    Info,
    Loader2,
    Award,
    ArrowRight,
    DollarSign,
    Briefcase
} from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "react-i18next";

interface Promotion {
    id: string;
    fromPositionId?: string;
    toPositionId: string;
    fromPositionName?: string;
    toPositionName: string;
    fromSalary?: number;
    toSalary?: number;
    promotionDate: string;
    effectiveDate: string;
    reason: string;
    status: string;
    notes?: string;
    createdAt: string;
    fromPosition?: { title: string };
    toPosition?: { title: string };
}

const PROMOTION_STATUS = {
    PENDING: {
        label: "في الانتظار",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: Clock,
    },
    APPROVED: {
        label: "معتمد",
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: CheckCircle,
    },
    REJECTED: {
        label: "مرفوض",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: XCircle,
    }
};

const MyPromotions: React.FC = () => {
    const { t } = useTranslation();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get("/hr/my-promotions");
            if (res.data.success) {
                setPromotions(res.data.promotions);
            }
        } catch (error) {
            console.error("Error loading promotions:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return "—";
        return new Intl.NumberFormat("ar-EG", {
            style: "currency",
            currency: "EGP",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ar-EG");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Award className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
                        ترقياتي ومساري الوظيفي
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        سجل الترقيات والتغييرات في المنصب والمستوى الوظيفي
                    </p>
                </div>
            </div>

            {/* Promotions List */}
            <div className="space-y-4">
                {promotions.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mb-4">
                            <TrendingUp className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            لا يوجد سجل ترقيات حتى الآن
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                            سيظهر هنا تاريخك الوظيفي وأي ترقيات تحصل عليها في المستقبل.
                        </p>
                    </div>
                ) : (
                    promotions.map((promotion) => {
                        const status = (PROMOTION_STATUS as any)[promotion.status] || PROMOTION_STATUS.PENDING;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={promotion.id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                    <StatusIcon className="h-3 w-3 ml-1" />
                                                    {status.label}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                                    <Clock className="h-4 w-4 ml-1" />
                                                    تم في {formatDate(promotion.promotionDate)}
                                                </span>
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center gap-4 py-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">المنصب السابق</p>
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center ml-2">
                                                            <Briefcase className="h-4 w-4 text-gray-500" />
                                                        </div>
                                                        <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 line-through">
                                                            {promotion.fromPositionName || promotion.fromPosition?.title || "لا يوجد منصب سابق"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-center md:rotate-0 rotate-90 my-2 md:my-0">
                                                    <ArrowRight className="h-6 w-6 text-indigo-500" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-wider">المنصب الجديد</p>
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center ml-2 font-bold text-indigo-600">
                                                            <Award className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {promotion.toPositionName || promotion.toPosition?.title}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-6 text-sm">
                                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                                    <DollarSign className="h-4 w-4 ml-1 text-green-600" />
                                                    <span>الراتب الجديد: </span>
                                                    <span className="font-bold text-gray-900 dark:text-white mr-1">
                                                        {formatCurrency(promotion.toSalary)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                                    <Calendar className="h-4 w-4 ml-1 text-blue-500" />
                                                    <span>تاريخ السريان: </span>
                                                    <span className="font-medium mr-1">{formatDate(promotion.effectiveDate)}</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    <span className="font-semibold ml-1">السبب:</span>
                                                    {promotion.reason}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="lg:border-r lg:pr-6 border-gray-100 dark:border-gray-700 flex flex-col items-stretch">
                                            <button
                                                onClick={() => {
                                                    setSelectedPromotion(promotion);
                                                    setShowDetailsModal(true);
                                                }}
                                                className="px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                عرض التفاصيل
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedPromotion && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                <Info className="h-6 w-6 text-indigo-500 ml-2" />
                                تفاصيل الترقية
                            </h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XCircle className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">المنصب الجديد</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {selectedPromotion.toPositionName || selectedPromotion.toPosition?.title}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">المنصب السابق</p>
                                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400 line-through">
                                        {selectedPromotion.fromPositionName || selectedPromotion.fromPosition?.title || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">الراتب الجديد</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(selectedPromotion.toSalary)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">الراتب السابق</p>
                                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                                        {formatCurrency(selectedPromotion.fromSalary)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">تاريخ الترقية</p>
                                    <p className="font-medium">{formatDate(selectedPromotion.promotionDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">تاريخ السريان الفعلي</p>
                                    <p className="font-medium text-indigo-600 dark:text-indigo-400">
                                        {formatDate(selectedPromotion.effectiveDate)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">السبب</p>
                                    <p className="text-gray-900 dark:text-white leading-relaxed">
                                        {selectedPromotion.reason}
                                    </p>
                                </div>

                                {selectedPromotion.notes && (
                                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 font-bold">ملاحظات إضافية</p>
                                        <p className="text-gray-900 dark:text-white leading-relaxed italic">
                                            {selectedPromotion.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none font-bold"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPromotions;
