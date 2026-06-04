import React, { useState, useEffect } from "react";
import {
    Trophy,
    Calendar,
    DollarSign,
    Gift,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Award,
    Info
} from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

interface Reward {
    id: string;
    rewardName: string;
    rewardCategory: string;
    calculatedValue: number;
    periodStart: string;
    periodEnd: string;
    appliedMonth: number;
    appliedYear: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'APPLIED' | 'VOIDED' | 'REJECTED';
    createdAt: string;
    rewardType?: {
        name: string;
        category: string;
    };
}

const REWARD_STATUS = {
    PENDING: {
        label: "قيد الانتظار",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: Clock,
    },
    APPROVED: {
        label: "معتمد",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: CheckCircle,
    },
    APPLIED: {
        label: "تم الصرف",
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: Award,
    },
    REJECTED: {
        label: "مرفوض",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: XCircle,
    },
    VOIDED: {
        label: "ملغي",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
        icon: AlertCircle,
    }
};

const MyRewards: React.FC = () => {
    const { t } = useTranslation();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get("/hr/rewards/my-rewards");
            if (res.data.success) {
                setRewards(res.data.data);
            }
        } catch (error) {
            console.error("Error loading rewards:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("ar-EG", {
            style: "currency",
            currency: "EGP",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ar-EG");
    };

    const getMonthName = (month: number) => {
        const months = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];
        return months[month - 1];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const totalRewards = rewards
        .filter(r => r.status === 'APPLIED' || r.status === 'APPROVED')
        .reduce((sum, r) => sum + r.calculatedValue, 0);

    return (
        <div className="space-y-6 p-6" dir="rtl">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Trophy className="h-10 w-10 text-yellow-500 ml-3 drop-shadow-md" />
                        مكافآتي وحوافزي
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                        سجل المكافآت المالية والحوافز التقديرية التي حصلت عليها
                    </p>
                </div>

                <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl border-none min-w-[280px]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-indigo-100 font-medium">إجمالي المكافآت المعتمدة</span>
                            <Gift className="h-6 w-6 text-yellow-300" />
                        </div>
                        <div className="text-4xl font-black">{formatCurrency(totalRewards)}</div>
                        <div className="mt-4 flex items-center text-indigo-100 text-sm">
                            <TrendingUp className="h-4 w-4 ml-1" />
                            <span>بناءً على سجلاتك في النظام</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-6">
                {rewards.length === 0 ? (
                    <Card className="bg-white dark:bg-gray-800 border-dashed border-2 p-16 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 mb-6">
                            <Trophy className="h-12 w-12" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            لا توجد مكافآت مسجلة حالياً
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-lg leading-relaxed">
                            عندما تحصل على مكافأة أو حافز من الإدارة، ستظهر تفاصيلها هنا فور اعتمادها. استمر في التميز!
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {rewards.map((reward) => {
                            const status = REWARD_STATUS[reward.status] || REWARD_STATUS.PENDING;
                            const StatusIcon = status.icon;

                            return (
                                <div
                                    key={reward.id}
                                    className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    <div className="p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
                                                <div className="flex-shrink-0">
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                        <DollarSign className="h-8 w-8 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 flex-1">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                            {reward.rewardName}
                                                        </h3>
                                                        <Badge className={`${status.color} border-none font-bold py-1 px-3`}>
                                                            <StatusIcon className="h-3.5 w-3.5 ml-1.5" />
                                                            {status.label}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center">
                                                            <Calendar className="h-4 w-4 ml-1.5 text-indigo-500" />
                                                            {getMonthName(reward.appliedMonth)} {reward.appliedYear}
                                                        </div>
                                                        <div className="flex items-center">
                                                            <Clock className="h-4 w-4 ml-1.5 text-indigo-500" />
                                                            بتاريخ: {formatDate(reward.createdAt)}
                                                        </div>
                                                        {reward.rewardCategory && (
                                                            <div className="flex items-center">
                                                                <Filter className="h-4 w-4 ml-1.5 text-indigo-500" />
                                                                الفئة: {reward.rewardCategory}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 border-t lg:border-t-0 lg:border-r border-gray-100 dark:border-gray-700 pt-4 lg:pt-0 lg:pr-8">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">القيمة</p>
                                                    <p className="text-3xl font-black text-green-600 dark:text-green-400">
                                                        {formatCurrency(reward.calculatedValue)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedReward(reward);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl text-sm font-bold transition-all duration-300 border border-gray-200 dark:border-gray-700"
                                                >
                                                    <Info className="h-4 w-4" />
                                                    التفاصيل
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedReward && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <Award className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                                        تفاصيل المكافأة
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium">#{selectedReward.id.slice(-8).toUpperCase()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-3 hover:bg-red-50 hover:text-red-500 text-gray-400 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-200"
                            >
                                <XCircle className="h-7 w-7" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">اسم المكافأة</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                        {selectedReward.rewardName}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">قيمة المكافأة</p>
                                    <p className="text-2xl font-black text-green-600 dark:text-green-400">
                                        {formatCurrency(selectedReward.calculatedValue)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">فترة الاستحقاق</p>
                                    <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                        {getMonthName(selectedReward.appliedMonth)} {selectedReward.appliedYear}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">تاريخ التسجيل</p>
                                    <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                        {formatDate(selectedReward.createdAt)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] font-black mb-3">سبب المكافأة</p>
                                    <p className="text-gray-900 dark:text-white leading-relaxed text-lg italic">
                                        {selectedReward.reason || "لم يتم ذكر سبب محدد"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <Clock className="h-5 w-5 text-gray-400 ml-3" />
                                        <span className="text-gray-500 ml-2">الحالة الحالية:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {REWARD_STATUS[selectedReward.status]?.label || selectedReward.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <Filter className="h-5 w-5 text-gray-400 ml-3" />
                                        <span className="text-gray-500 ml-2">الفئة:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {selectedReward.rewardCategory}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-indigo-200 dark:shadow-none font-black text-lg"
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

export default MyRewards;
