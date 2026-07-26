import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
    Wallet,
    Plus,
    History,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    Loader2,
    Banknote,
    Calendar,
    ArrowRight,
    TrendingDown,
    User,
    ShieldCheck,
    X,
    CreditCard,
    BarChart3,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuthSimple";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";

type AdvanceFormData = {
    amount: string;
    reason: string;
    repaymentType: "ONE_TIME" | "INSTALLMENTS";
    installmentsCount: string;
};

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
        PENDING: {
            label: t("employee.advances.pendingStatus"),
            icon: <Clock className="w-3.5 h-3.5" />,
            className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300",
        },
        APPROVED: {
            label: t("employee.advances.approvedStatus"),
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
        },
        REJECTED: {
            label: t("employee.advances.rejectedStatus"),
            icon: <XCircle className="w-3.5 h-3.5" />,
            className: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300",
        },
    };

    const c = config[status] || { label: status, icon: null, className: "bg-gray-100 text-gray-600" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.className}`}>
            {c.icon}
            {c.label}
        </span>
    );
};

const MyAdvances = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<AdvanceFormData>({
        defaultValues: {
            amount: "",
            reason: "",
            repaymentType: "INSTALLMENTS",
            installmentsCount: "3",
        },
    });

    const repaymentType = watch("repaymentType");
    const amount = watch("amount");
    const installmentsCount = watch("installmentsCount");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setFetching(true);
            const [historyResult, settingsResult] = await Promise.allSettled([
                api.get("/hr/advances/my"),
                api.get("/hr/advances/my-config", { _skipErrorToast: true }),
            ]);

            if (historyResult.status === "fulfilled") {
                setHistory(historyResult.value.data.data || []);
            } else {
                console.error("Error fetching advances history:", historyResult.reason);
                toast.error(t("employee.advances.fetchError"));
            }

            if (settingsResult.status === "fulfilled") {
                setSettings(settingsResult.value.data.settings || {});
            } else {
                console.error("Error fetching advance settings:", settingsResult.reason);
                setSettings(null);
            }
        } catch (error) {
            console.error("Error fetching advances data:", error);
        } finally {
            setFetching(false);
        }
    };

    const onSubmit = async (data: AdvanceFormData) => {
        try {
            setLoading(true);
            const requestedAmount = parseFloat(data.amount);

            if (settings && user?.baseSalary) {
                const maxAllowed = (parseFloat(user.baseSalary) * settings.maxAdvancePercentage) / 100;
                if (requestedAmount > maxAllowed && maxAllowed > 0) {
                    toast.error(t("employee.advances.maxExceeded", { max: maxAllowed.toFixed(0) }));
                    return;
                }
            }

            await api.post("/hr/advances", {
                ...data,
                amount: requestedAmount,
                installmentsCount: data.repaymentType === "INSTALLMENTS" ? parseInt(data.installmentsCount) : 1,
            });

            toast.success(t("employee.advances.submitSuccess"));
            setShowForm(false);
            reset();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || t("employee.advances.submitError"));
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const totalActive = history
        .filter((r) => r.status === "APPROVED" && !r.isPaidOff)
        .reduce((sum, r) => sum + parseFloat(r.remainingBalance || 0), 0);
    const totalPending = history.filter((r) => r.status === "PENDING").length;
    const totalAmount = history.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    // Try to get baseSalary from advances history (employeeSalary field) or user object
    const baseSalary =
        parseFloat(user?.baseSalary || "0") ||
        history.find((r) => r.employeeSalary && parseFloat(r.employeeSalary) > 0)?.employeeSalary ||
        0;

    const maxAllowed =
        settings && baseSalary > 0
            ? (parseFloat(String(baseSalary)) * settings.maxAdvancePercentage) / 100
            : settings?.maxAdvanceAmount || 0;

    const hasPending = totalPending > 0;
    const hasActiveApproved = history.some((r) => r.status === "APPROVED" && !r.isPaidOff);

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
                <div className="relative">
                    <Wallet className="w-16 h-16 text-emerald-200 dark:text-emerald-900" />
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-gray-400 font-medium text-lg">{t("employee.advances.loading")}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-8" dir="rtl">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* ─── Header ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
                                <Wallet className="w-7 h-7 text-white" />
                            </div>
                            {t("employee.advances.title")}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-base">
                            {t("employee.advances.subtitle")}
                        </p>
                    </div>

                    {!showForm && !hasPending && (
                        <Button
                            onClick={() => setShowForm(true)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl h-12 px-6 gap-2 transition-all hover:scale-[1.02]"
                        >
                            <Plus className="w-5 h-5" />
                            {t("employee.advances.newRequest")}
                        </Button>
                    )}
                    {hasPending && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-sm font-bold">
                            <Clock className="w-4 h-4" />
                            {t("employee.advances.hasPendingRequest")}
                        </div>
                    )}
                </div>

                {/* ─── Stats Row ─── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        {
                            label: t("employee.advances.totalRequests"),
                            value: history.length,
                            suffix: t("employee.advances.statsRequestSuffix"),
                            icon: <BarChart3 className="w-5 h-5" />,
                            color: "from-blue-500 to-indigo-600",
                            bg: "bg-blue-50 dark:bg-blue-900/20",
                            text: "text-blue-600 dark:text-blue-400",
                        },
                        {
                            label: t("employee.advances.pending"),
                            value: totalPending,
                            suffix: t("employee.advances.statsRequestSuffix"),
                            icon: <Clock className="w-5 h-5" />,
                            color: "from-amber-500 to-orange-600",
                            bg: "bg-amber-50 dark:bg-amber-900/20",
                            text: "text-amber-600 dark:text-amber-400",
                        },
                        {
                            label: t("employee.advances.remainingForRepayment"),
                            value: totalActive.toFixed(0),
                            suffix: t("employee.advances.egp"),
                            icon: <TrendingDown className="w-5 h-5" />,
                            color: "from-rose-500 to-pink-600",
                            bg: "bg-rose-50 dark:bg-rose-900/20",
                            text: "text-rose-600 dark:text-rose-400",
                        },
                        {
                            label: t("employee.advances.maxAllowed"),
                            value: maxAllowed > 0 ? maxAllowed.toFixed(0) : "---",
                            suffix: maxAllowed > 0 ? t("employee.advances.egp") : "",
                            icon: <ShieldCheck className="w-5 h-5" />,
                            color: "from-emerald-500 to-teal-600",
                            bg: "bg-emerald-50 dark:bg-emerald-900/20",
                            text: "text-emerald-600 dark:text-emerald-400",
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                        >
                            <Card className={`border-0 shadow-sm ${stat.bg} overflow-hidden`}>
                                <CardContent className="p-5">
                                    <div className={`${stat.text} mb-3`}>{stat.icon}</div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold mb-1">{stat.label}</p>
                                    <p className={`text-2xl font-black ${stat.text}`}>
                                        {stat.value} <span className="text-sm font-semibold opacity-70">{stat.suffix}</span>
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* ─── New Request Form ─── */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ type: "spring", damping: 20 }}
                        >
                            <Card className="border border-emerald-100 dark:border-emerald-900/40 shadow-2xl shadow-emerald-500/5 rounded-3xl overflow-hidden bg-white dark:bg-gray-900">
                                {/* Form header */}
                                <div className="bg-gradient-to-l from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 px-8 py-6 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900">
                                            <CreditCard className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-gray-900 dark:text-white text-xl">{t("employee.advances.dialogTitle")}</h2>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("employee.advances.dialogDesc")}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setShowForm(false); reset(); }}
                                        className="rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-800"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <CardContent className="p-8">
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Amount */}
                                            <div className="space-y-2">
                                                <Label className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <Banknote className="w-4 h-4 text-emerald-500" />
                                                    {t("employee.advances.amountLabel")}
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        placeholder={t("employee.advances.amountPlaceholder")}
                                                        className="h-14 text-xl font-bold pr-4 pl-14 border-2 border-gray-100 dark:border-gray-700 focus:border-emerald-400 focus:ring-emerald-200 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 transition-all"
                                                        {...register("amount", {
                                                            required: t("employee.advances.amountRequired"),
                                                            min: { value: 100, message: t("employee.advances.minAmount") },
                                                        })}
                                                    />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{t("employee.advances.egp")}</span>
                                                </div>
                                                {errors.amount && (
                                                    <p className="text-rose-500 text-sm flex items-center gap-1 font-medium">
                                                        <AlertCircle className="w-4 h-4" /> {errors.amount.message}
                                                    </p>
                                                )}
                                                {maxAllowed > 0 && (
                                                    <p className="text-gray-400 text-xs font-medium flex items-center gap-1">
                                                        <Info className="w-3.5 h-3.5" />
                                                        {t("employee.advances.maxAmount", { max: maxAllowed.toFixed(0) })}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Repayment Type */}
                                            <div className="space-y-2">
                                                <Label className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    {t("employee.advances.repaymentMethod")}
                                                </Label>
                                                <Select
                                                    onValueChange={(val) => setValue("repaymentType", val as any)}
                                                    defaultValue="INSTALLMENTS"
                                                >
                                                    <SelectTrigger className="h-14 text-base font-semibold border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 focus:border-blue-400">
                                                        <SelectValue placeholder={t("employee.advances.repaymentPlaceholder")} />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-2 shadow-xl">
                                                        <SelectItem value="INSTALLMENTS" className="text-base h-11 rounded-lg font-medium">{t("employee.advances.monthlyInstallment")}</SelectItem>
                                                        <SelectItem value="ONE_TIME" className="text-base h-11 rounded-lg font-medium">{t("employee.advances.fullDeduction")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Installments Count */}
                                            {repaymentType === "INSTALLMENTS" && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -16 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="space-y-2"
                                                >
                                                    <Label className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-amber-500" />
                                                        {t("employee.advances.installmentCount")}
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        className="h-14 text-xl font-bold border-2 border-gray-100 dark:border-gray-700 focus:border-amber-400 focus:ring-amber-200 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 transition-all"
                                                        {...register("installmentsCount", {
                                                            required: t("employee.advances.installmentRequired"),
                                                            min: { value: 1, message: t("employee.advances.minInstallment") },
                                                            max: { value: settings?.advanceRepaymentMonths || 12, message: t("employee.advances.maxInstallment", { max: settings?.advanceRepaymentMonths || 12 }) },
                                                        })}
                                                    />
                                                    {errors.installmentsCount && (
                                                        <p className="text-rose-500 text-sm font-medium">{errors.installmentsCount.message}</p>
                                                    )}
                                                </motion.div>
                                            )}

                                            {/* Live Summary */}
                                            {amount && parseFloat(amount) > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className={`${repaymentType === "INSTALLMENTS" ? "" : "md:col-span-2"} bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl p-5`}
                                                >
                                                    <p className="text-blue-700 dark:text-blue-300 font-black text-sm mb-2 flex items-center gap-2">
                                                        <Info className="w-4 h-4" /> {t("employee.advances.summaryTitle")}
                                                    </p>
                                                    <div className="flex flex-wrap gap-4">
                                                        <div>
                                                            <p className="text-xs text-blue-500 font-semibold">{t("employee.advances.totalAmount")}</p>
                                                            <p className="text-2xl font-black text-blue-800 dark:text-blue-200">{parseFloat(amount).toFixed(0)} <span className="text-sm">{t("employee.advances.egp")}</span></p>
                                                        </div>
                                                        {repaymentType === "INSTALLMENTS" && installmentsCount && (
                                                            <div>
                                                                <p className="text-xs text-blue-500 font-semibold">{t("employee.advances.monthlyPayment")}</p>
                                                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                                                                    {(parseFloat(amount) / parseInt(installmentsCount || "1")).toFixed(0)} <span className="text-sm">{t("employee.advances.egp")}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Reason */}
                                        <div className="space-y-2">
                                            <Label className="font-bold text-gray-700 dark:text-gray-300">{t("employee.advances.reasonLabel")}</Label>
                                            <Textarea
                                                placeholder={t("employee.advances.reasonPlaceholder")}
                                                className="min-h-[110px] text-base border-2 border-gray-100 dark:border-gray-700 focus:border-emerald-400 transition-all bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl resize-none"
                                                {...register("reason", { required: t("employee.advances.reasonRequired") })}
                                            />
                                            {errors.reason && (
                                                <p className="text-rose-500 text-sm font-medium flex items-center gap-1">
                                                    <AlertCircle className="w-4 h-4" /> {errors.reason.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => { setShowForm(false); reset(); }}
                                                className="flex-1 h-12 rounded-xl font-bold border-2"
                                            >
                                                {t("employee.advances.cancelButton")}
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-[2] h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 text-base gap-2"
                                            >
                                                {loading ? (
                                                    <><Loader2 className="w-5 h-5 animate-spin" /> {t("employee.advances.sending")}</>
                                                ) : (
                                                    <><CheckCircle2 className="w-5 h-5" /> {t("employee.advances.submitButton")}</>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── History List ─── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2.5">
                            <History className="w-6 h-6 text-gray-400" />
                            {t("employee.advances.recordsTitle")}
                            {history.length > 0 && (
                                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm px-2.5 py-0.5 rounded-full font-bold">
                                    {history.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {history.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center space-y-4"
                        >
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900">
                                <Banknote className="w-10 h-10 text-emerald-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-700 dark:text-gray-300">{t("employee.advances.noAdvances")}</h3>
                            <p className="text-gray-400 max-w-sm mx-auto">{t("employee.advances.noAdvancesDesc")}</p>
                            <Button
                                onClick={() => setShowForm(true)}
                                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-8 font-bold"
                            >
                                <Plus className="w-4 h-4 ml-1" />
                                {t("employee.advances.firstAdvance")}
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((req, idx) => {
                                const isExpanded = expandedId === req.id;
                                const paidAmount = parseFloat(req.amount || 0) - parseFloat(req.remainingBalance || req.amount || 0);
                                const progressPct = parseFloat(req.amount) > 0
                                    ? (paidAmount / parseFloat(req.amount)) * 100
                                    : 0;
                                const isManagerCreated = req.approver || req.approvedBy;
                                const isOneTime = req.repaymentType === "ONE_TIME" || req.repaymentType === "MONTHLY";

                                return (
                                    <motion.div
                                        key={req.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Card
                                            className={`border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-white dark:bg-gray-900 cursor-pointer
                                                ${req.status === "PENDING" ? "border-l-4 border-l-amber-400" :
                                                    req.status === "APPROVED" ? "border-l-4 border-l-emerald-400" :
                                                        req.status === "REJECTED" ? "border-l-4 border-l-rose-400" : ""}`}
                                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                        >
                                            <CardContent className="p-0">
                                                {/* Main Row */}
                                                <div className="flex items-center gap-4 p-5">
                                                    {/* Amount Badge */}
                                                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 font-black text-sm
                                                        ${req.status === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" :
                                                            req.status === "REJECTED" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300" :
                                                                "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"}`}>
                                                        <span className="text-lg font-black leading-none">{parseFloat(req.amount).toFixed(0)}</span>
                                                        <span className="text-xs opacity-70">{t("employee.advances.egp")}</span>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <StatusBadge status={req.status} />
                                                            <span className="text-xs text-gray-400 font-medium">
                                                                {isOneTime ? t("employee.advances.lumpSum") : t("employee.advances.installments", { count: req.installmentsCount })}
                                                            </span>
                                                            {/* Tag if created by manager */}
                                                            {req.approvedBy && req.status === "APPROVED" && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-2 py-0.5 rounded-full font-bold">
                                                                    <User className="w-3 h-3" /> {t("employee.advances.approvedByMgmt")}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium truncate">
                                                            {req.reason}
                                                        </p>
                                                        <p className="text-gray-400 text-xs mt-0.5">
                                                            {new Date(req.createdAt).toLocaleDateString("ar-EG", {
                                                                year: "numeric", month: "long", day: "numeric"
                                                            })}
                                                        </p>
                                                    </div>

                                                    {/* Right side */}
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {req.status === "APPROVED" && !req.isPaidOff && (
                                                            <div className="text-left hidden sm:block">
                                                                <p className="text-xs text-gray-400 font-semibold">{t("employee.advances.remaining")}</p>
                                                                <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                                                                    {parseFloat(req.remainingBalance || 0).toFixed(0)} {t("employee.advances.egp")}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {req.isPaidOff && (
                                                            <span className="text-emerald-600 text-xs font-black bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> {t("employee.advances.settled")}
                                                            </span>
                                                        )}
                                                        <ArrowRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                    </div>
                                                </div>

                                                {/* Progress bar for approved */}
                                                {req.status === "APPROVED" && !isOneTime && !req.isPaidOff && (
                                                    <div className="px-5 pb-3">
                                                        <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                                                            <span>{t("employee.advances.paidAmount", { amount: paidAmount.toFixed(0) })}</span>
                                                            <span>{progressPct.toFixed(0)}%</span>
                                                        </div>
                                                        <Progress value={progressPct} className="h-1.5 bg-gray-100 dark:bg-gray-800" />
                                                    </div>
                                                )}

                                                {/* Expanded Details */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="border-t border-gray-100 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-800/30 space-y-4">
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                    <div>
                                                                    <p className="text-gray-400 font-semibold text-xs uppercase mb-1">{t("employee.advances.totalAmountLabel")}</p>
                                                                    <p className="font-black text-gray-800 dark:text-white text-base">{parseFloat(req.amount).toFixed(0)} {t("employee.advances.egp")}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-400 font-semibold text-xs uppercase mb-1">{t("employee.advances.repaymentMethodLabel")}</p>
                                                                    <p className="font-bold text-gray-700 dark:text-gray-300">
                                                                        {isOneTime ? t("employee.advances.lumpSum") : t("employee.advances.installments", { count: req.installmentsCount })}
                                                                    </p>
                                                                </div>
                                                                {!isOneTime && (
                                                                    <div>
                                                                        <p className="text-gray-400 font-semibold text-xs uppercase mb-1">{t("employee.advances.monthlyPaymentLabel")}</p>
                                                                        <p className="font-bold text-gray-700 dark:text-gray-300">{parseFloat(req.monthlyAmount || req.installmentAmount || 0).toFixed(0)} {t("employee.advances.egp")}</p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-gray-400 font-semibold text-xs uppercase mb-1">{t("employee.advances.requestDateLabel")}</p>
                                                                        <p className="font-bold text-gray-700 dark:text-gray-300">
                                                                            {new Date(req.createdAt).toLocaleDateString("ar-EG")}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Reason box */}
                                                                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                                                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1.5">{t("employee.advances.reasonDetail")}</p>
                                                                    <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{req.reason}</p>
                                                                </div>

                                                                {/* Approval info */}
                                                                {req.status === "APPROVED" && req.approver && (
                                                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2.5 rounded-xl text-sm font-bold">
                                                                        <ShieldCheck className="w-4 h-4" />
                                                                        {t("employee.advances.approvedBy", { name: `${req.approver.firstName} ${req.approver.lastName}` })}
                                                                        {req.approvedAt && (
                                                                            <span className="text-emerald-500 font-normal mr-auto">
                                                                                {new Date(req.approvedAt).toLocaleDateString("ar-EG")}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Rejection reason */}
                                                                {req.status === "REJECTED" && req.rejectedReason && (
                                                                    <div className="flex items-start gap-2.5 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 px-4 py-3 rounded-xl text-sm">
                                                                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                        <div>
                                                                            <p className="font-black text-xs uppercase mb-0.5">{t("employee.advances.rejectionReason")}</p>
                                                                            <p className="font-medium">{req.rejectedReason}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyAdvances;
