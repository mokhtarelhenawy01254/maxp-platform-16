import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FileX, ArrowRight, Save, Calendar, History, AlertTriangle, Info, Clock, CheckCircle2, X, Loader2 } from 'lucide-react';
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuthSimple";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../../components/ui/tooltip";

type ResignationFormData = {
    resignationDate: string;
    lastWorkingDay: string;
    reason: string;
};

const MyResignation = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [noticePeriod, setNoticePeriod] = useState(30);
    const [expectedDate, setExpectedDate] = useState<string>("");
    const [showForm, setShowForm] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
    } = useForm<ResignationFormData>({
        defaultValues: {
            resignationDate: new Date().toISOString().split("T")[0],
            lastWorkingDay: "",
            reason: "",
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setFetching(true);
                const historyRes = await api.get("/hr/resignations/my");
                setHistory(historyRes.data.resignations || []);

                let noticeDays = 30;
                // تجاوز طلب الإعدادات لمن ليس لديه صلاحية
                if (user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(user.role)) {
                    try {
                        const settingsRes = await api.get("/hr/settings");
                        if (settingsRes.data.settings?.noticePeriodDays) {
                            noticeDays = settingsRes.data.settings.noticePeriodDays;
                            setNoticePeriod(noticeDays);
                        }
                    } catch (err: any) {
                        if (err?.response?.status !== 403) {
                            console.error("Error fetching HR settings:", err);
                            toast.error("تعذر تحميل إعدادات الموارد البشرية");
                        }
                    }
                }

                // Initialize last working day based on default resignation date
                const today = new Date();
                const expected = new Date(today);
                expected.setDate(today.getDate() + noticeDays);
                const expectedStr = expected.toISOString().split("T")[0];
                setExpectedDate(expectedStr);
                setValue("lastWorkingDay", expectedStr);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("فشل في تحميل البيانات");
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, [setValue]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        if (!isNaN(date.getTime())) {
            const expected = new Date(date);
            expected.setDate(date.getDate() + noticePeriod);
            const expectedStr = expected.toISOString().split("T")[0];
            setExpectedDate(expectedStr);
            setValue("lastWorkingDay", expectedStr);
        }
    };

    const onSubmit = async (data: ResignationFormData) => {
        try {
            setLoading(true);

            const submissionData = {
                ...data,
                employeeId: user?.id, // Ensure we pass the employeeId as required by backend
                status: 'PENDING'
            };

            await api.post("/hr/resignations", submissionData);
            toast.success("تم تقديم طلب الاستقالة بنجاح");
            setShowForm(false);
            reset();

            // Refresh history
            const historyRes = await api.get("/hr/resignations/my");
            setHistory(historyRes.data.resignations || []);
        } catch (error: any) {
            console.error("Error submitting resignation:", error);
            toast.error(error.response?.data?.error || "فشل في تقديم الطلب");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none px-3 py-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> قيد المراجعة</Badge>;
            case "APPROVED":
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-3 py-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> تمت الموافقة</Badge>;
            case "REJECTED":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-3 py-1 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> مرفوض</Badge>;
            case "SETTLED":
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3 py-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> تمت التسوية</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-gray-500 animate-pulse font-medium">جاري تحميل البيانات...</p>
            </div>
        );
    }

    const hasPending = history.some(r => r.status === 'PENDING');

    return (
        <div className="p-4 sm:p-8 w-full max-w-5xl mx-auto space-y-8" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        <FileX className="h-10 w-10 text-red-500" />
                        طلب استقالة
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        إجراءات إنهاء الخدمة وتسجيل تاريخ آخر يوم عمل
                    </p>
                </div>

                {!showForm && !hasPending && (
                    <Button
                        onClick={() => setShowForm(true)}
                        size="lg"
                        variant="destructive"
                        className="rounded-full px-8 shadow-lg hover:shadow-red-500/20 transition-all active:scale-95"
                    >
                        تقديم طلب استقالة جديد
                    </Button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {showForm ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full"
                    >
                        <Card className="border-red-100 shadow-2xl shadow-red-500/5 relative overflow-hidden bg-white/50 backdrop-blur-sm">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2 text-red-700">
                                    <AlertCircle className="w-5 h-5" />
                                    تفاصيل الطلب
                                </CardTitle>
                                <CardDescription>
                                    يرجى ملء البيانات التالية بعناية. طلبك سيصل إلى قسم الموارد البشرية للمراجعة.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Resignation Date */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-red-500" />
                                                تاريخ تقديم الاستقالة
                                                <TooltipProvider shadow={true}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            هو التاريخ الفعلي الذي قمت فيه باتخاذ قرار الاستقالة
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </Label>
                                            <Input
                                                type="date"
                                                className="h-12 text-lg border-gray-200 focus:border-red-500 focus:ring-red-200 transition-all bg-white"
                                                {...register("resignationDate", { required: "التاريخ مطلوب" })}
                                                onChange={(e) => {
                                                    register("resignationDate").onChange(e);
                                                    handleDateChange(e);
                                                }}
                                            />
                                            {errors.resignationDate && <p className="text-sm text-red-500 font-medium">{errors.resignationDate.message}</p>}
                                        </div>

                                        {/* Last Working Day */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-blue-500" />
                                                آخر يوم عمل متوقع
                                            </Label>
                                            <Input
                                                type="date"
                                                className="h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all bg-white"
                                                {...register("lastWorkingDay", { required: "تاريخ آخر يوم عمل مطلوب" })}
                                            />
                                            {errors.lastWorkingDay && <p className="text-sm text-red-500 font-medium">{errors.lastWorkingDay.message}</p>}
                                        </div>
                                    </div>

                                    {/* Policy Info */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                                        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-blue-100">
                                            <Info className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-blue-900 mb-1">
                                                سياسة فترة الإشعار
                                            </h4>
                                            <p className="text-blue-800/80 leading-relaxed font-medium">
                                                بناءً على سياسة الشركة، فترة الإشعار هي <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg mx-1">{noticePeriod} يوماً</span>.
                                                تم حساب تاريخ آخر يوم عمل تلقائياً ليكون <span className="font-bold underline decoration-blue-400 underline-offset-4">{expectedDate}</span>. يمكنك تغييره إذا رغبت في ذلك ولكن قد يتطلب الأمر موافقة خاصة.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="space-y-3">
                                        <Label className="text-base font-semibold text-gray-700">سبب الاستقالة (اختياري)</Label>
                                        <Textarea
                                            placeholder="يمكنك ذكر سبب قرارك لمساعدتنا في تحسين بيئة العمل..."
                                            className="min-h-[150px] text-lg border-gray-200 focus:border-red-500 focus:ring-red-200 transition-all bg-white p-4 resize-none"
                                            {...register("reason")}
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-gray-100">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="lg"
                                            onClick={() => setShowForm(false)}
                                            className="text-gray-500 hover:bg-gray-100 px-8"
                                        >
                                            إلغاء التعديل
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            size="lg"
                                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-10 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    جاري الإرسال...
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Save className="h-5 w-5" />
                                                    تأكيد تقديم الاستقالة
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        {/* Active Request Indicator */}
                        {hasPending && (
                            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 flex items-center gap-6 shadow-sm">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200">
                                    <Clock className="w-8 h-8 text-amber-500 animate-[pulse_2s_infinite]" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-amber-900 mb-1">طلبك قيد المراجعة</h3>
                                    <p className="text-amber-800/80 font-medium">سيتم الرد عليك من قبل قسم الموارد البشرية في أقرب وقت ممكن بمجرد مراجعة طلبك.</p>
                                </div>
                            </div>
                        )}

                        {/* History Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-500 font-semibold mb-4 text-lg">
                                <History className="w-5 h-5" />
                                سجل الطلبات السابقة
                            </div>

                            {history.length === 0 ? (
                                <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center space-y-4">
                                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 border border-gray-100 shadow-inner">
                                        <FileX className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800">لا يوجد طلبات سابقة</h3>
                                    <p className="text-gray-500 text-lg max-w-md mx-auto">لم تتقدم بأي طلبات استقالة حتى الآن. سجلك الوظيفي يبدو في حالة ممتازة!</p>
                                    {!showForm && (
                                        <Button
                                            onClick={() => setShowForm(true)}
                                            variant="outline"
                                            className="mt-4 rounded-full px-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                        >
                                            ابدأ طلباً جديداً
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {history.map((req, idx) => (
                                        <motion.div
                                            key={req.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                        >
                                            <Card className="hover:shadow-xl transition-all border-none shadow-lg shadow-gray-200/50 bg-white group relative overflow-hidden">
                                                <div className={`absolute top-0 right-0 w-1.5 h-full ${req.status === 'APPROVED' ? 'bg-green-500' :
                                                        req.status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`} />
                                                <CardHeader className="pb-4">
                                                    <div className="flex justify-between items-start">
                                                        {getStatusBadge(req.status)}
                                                    </div>
                                                    <CardTitle className="text-lg mt-4 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        تقديم الاستقالة: {new Date(req.resignationDate).toLocaleDateString('ar-EG')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4 text-sm text-gray-600 pb-6 pt-0">
                                                    <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                                        <Clock className="w-4 h-4 text-blue-500" />
                                                        <span className="font-semibold">آخر يوم عمل:</span>
                                                        <span className="text-blue-700">{new Date(req.lastWorkingDay).toLocaleDateString('ar-EG')}</span>
                                                    </div>
                                                    {req.reason && (
                                                        <div className="space-y-1.5">
                                                            <span className="font-semibold text-gray-700 block">السبب:</span>
                                                            <p className="line-clamp-2 text-gray-500 bg-gray-50/50 p-2 rounded-lg italic font-medium leading-relaxed">"{req.reason}"</p>
                                                        </div>
                                                    )}
                                                    {req.exitInterview && (
                                                        <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                                            <span className="font-bold text-indigo-700 block mb-1 underline decoration-indigo-200">ملاحظات مقابلة الخروج:</span>
                                                            <p className="text-indigo-900/80 leading-relaxed font-medium">{req.exitInterview}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyResignation;
