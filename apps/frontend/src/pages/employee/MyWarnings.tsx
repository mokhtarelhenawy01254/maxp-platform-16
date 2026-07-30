import { formatDate } from '@/utils/formatters';
import React, { useState, useEffect } from "react";
import { AlertTriangle, Clipboard, Calendar, Clock, CheckCircle2, File, Loader2, Info, ShieldAlert, Eye } from 'lucide-react';
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useDateFormat } from "../../hooks/useDateFormat";

interface Warning {
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "major" | "critical";
    type: string;
    incidentDate: string;
    actionTaken?: string;
    acknowledgedAt?: string;
    createdAt: string;
}

const severityConfig: Record<string, { label: string; color: string; icon: any }> = {
    low: {
        label: "تنبيه بسيط",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        icon: Info,
    },
    medium: {
        label: "تنبيه متوسط",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
        icon: AlertCircle,
    },
    major: {
        label: "إنذار جسيم",
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        icon: AlertTriangle,
    },
    critical: {
        label: "إنذار خطير جداً",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
        icon: ShieldAlert,
    },
};

const MyWarnings: React.FC = () => {
    const { formatDate } = useDateFormat();
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);

    const fetchWarnings = async () => {
        try {
            setLoading(true);
            const response = await api.get("/hr/warnings/my-history");
            setWarnings(response.data.warnings || []);
        } catch (error) {
            console.error("Error fetching warnings:", error);
            toast.error("فشل في تحميل سجل الإنذارات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarnings();
    }, []);

    const handleAcknowledge = async (id: string) => {
        try {
            setAcknowledgingId(id);
            const response = await api.post(`/hr/warnings/${id}/acknowledge`);
            if (response.data.success) {
                toast.success("تم تأكيد الاستلام بنجاح");
                setWarnings((prev) =>
                    prev.map((w) =>
                        w.id === id ? { ...w, acknowledgedAt: new Date().toISOString() } : w
                    )
                );
            }
        } catch (error) {
            console.error("Error acknowledging warning:", error);
            toast.error("فشل في تأكيد الاستلام");
        } finally {
            setAcknowledgingId(null);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">جاري تحميل سجل الإنذارات...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8" dir="rtl">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-rose-700 p-8 text-white shadow-xl shadow-red-200/50 dark:shadow-none">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold flex items-center gap-3">
                            <ShieldAlert className="h-10 w-10 text-white/90" />
                            إنذاراتي وتنبيهاتي
                        </h1>
                        <p className="text-white/80 text-lg max-w-xl">
                            هنا تجد سجل الإنذارات والتنبيهات الرسمية المسجلة بحسابك. يرجى مراجعة كل إنذار وتأكيد العلم به.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                        <div className="text-center">
                            <span className="block text-3xl font-bold">{warnings.length}</span>
                            <span className="text-xs uppercase tracking-wider opacity-80 font-bold">إجمالي السجلات</span>
                        </div>
                        <div className="h-10 w-px bg-white/20" />
                        <div className="text-center">
                            <span className="block text-3xl font-bold">
                                {warnings.filter(w => !w.acknowledgedAt).length}
                            </span>
                            <span className="text-xs uppercase tracking-wider opacity-80 font-bold">بانتظار التأكيد</span>
                        </div>
                    </div>
                </div>
                {/* Decorative Circles */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
            </div>

            <AnimatePresence mode="wait">
                {warnings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 shadow-sm"
                    >
                        <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">سجلك نظيف تماماً!</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md px-6">
                            لم نجد أي إنذارات أو تنبيهات مسجلة بحسابك. استمر في الحفاظ على هذا المستوى الرائع من الانضباط!
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-6"
                    >
                        {warnings.map((warning) => {
                            const config = severityConfig[warning.severity] || severityConfig.low;
                            const SeverityIcon = config.icon;

                            return (
                                <motion.div key={warning.id} variants={cardVariants} layout>
                                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl bg-white dark:bg-gray-900/50 backdrop-blur-sm">
                                        {/* Severity Border Indicator */}
                                        <div className={`absolute top-0 right-0 w-2 h-full ${config.color.split(' ')[0]}`} />

                                        <CardHeader className="p-6 pb-2">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className={`p-3 rounded-2xl ${config.color} shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                                        <SeverityIcon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate flex-1" title={warning.title}>
                                                                {warning.title}
                                                                {!warning.acknowledgingId && (
                                                                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                                                                )}
                                                            </CardTitle>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full flex-shrink-0"
                                                                onClick={() => setSelectedWarning(warning)}
                                                                title="عرض التفاصيل"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {formatDate(warning.incidentDate)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {new Date(warning.incidentDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className={`${config.color} border py-1.5 px-4 rounded-full text-sm font-bold shadow-sm flex-shrink-0`}>
                                                    {config.label}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-6 pt-0 space-y-4">
                                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <FileText className="h-4 w-4" />
                                                        <span className="text-xs font-bold uppercase">وصف المخالفة:</span>
                                                    </div>
                                                    <p
                                                        className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap px-1"
                                                        style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                                    >
                                                        {warning.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {warning.actionTaken && (
                                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2 text-amber-500">
                                                            <Info className="h-4 w-4" />
                                                            <span className="text-xs font-bold uppercase">الإجراء المتخذ:</span>
                                                        </div>
                                                        <p
                                                            className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap px-1"
                                                            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                                        >
                                                            {warning.actionTaken}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                <div className="text-xs text-gray-400 font-medium">
                                                    تاريخ التسجيل النظامي: {formatDate(warning.createdAt)}
                                                </div>

                                                {!warning.acknowledgedAt ? (
                                                    <Button
                                                        onClick={() => handleAcknowledge(warning.id)}
                                                        disabled={acknowledgingId === warning.id}
                                                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-2xl px-8 h-12 font-bold shadow-lg shadow-green-200/50 dark:shadow-none transition-all hover:scale-105 active:scale-95"
                                                    >
                                                        {acknowledgingId === warning.id ? (
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="ml-2 h-5 w-5" />
                                                                تأكيد العلم والاستلام
                                                            </>
                                                        )}
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-2 px-4 rounded-xl border border-green-100 dark:border-green-900/30 text-sm font-bold">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                        تم التأكيد في {formatDate(warning.acknowledgedAt)}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <Dialog open={!!selectedWarning} onOpenChange={(open) => !open && setSelectedWarning(null)}>
                <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden" dir="rtl">
                    {selectedWarning && (
                        <>
                            {/* Accent Header */}
                            <div className={`h-2 ${severityConfig[selectedWarning.severity]?.color || 'bg-blue-500'}`} />

                            <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-br from-muted/50 via-background to-background relative overflow-hidden">
                                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`p-4 rounded-[1.5rem] shadow-xl ring-4 ring-white dark:ring-gray-900 ${severityConfig[selectedWarning.severity]?.color || 'bg-blue-500'} bg-opacity-10 dark:bg-opacity-20`}>
                                        {React.createElement(severityConfig[selectedWarning.severity]?.icon || severityConfig.low.icon, {
                                            className: `h-8 w-8 ${selectedWarning.severity === 'critical' || selectedWarning.severity === 'major' ? 'text-red-500' : 'text-blue-500'}`
                                        })}
                                    </div>
                                    <div className="space-y-1">
                                        <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white break-words max-w-[420px]">
                                            {selectedWarning.title}
                                        </DialogTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="rounded-full px-3 py-0.5 border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 text-[10px] font-black uppercase tracking-widest">
                                                {severityConfig[selectedWarning.severity]?.label || "تنبيه رقمي"}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground font-mono">#{selectedWarning.id.slice(-6).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="px-8 pb-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar relative">
                                {/* Description Section */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        تفاصيل المخالفة المسجلة
                                    </h4>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-transparent rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                                        <div
                                            className="relative bg-white dark:bg-gray-900/50 p-7 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-200 text-lg font-medium"
                                            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                        >
                                            {selectedWarning.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Administrative Action Section */}
                                {selectedWarning.actionTaken && (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                            <Info className="h-3.5 w-3.5" />
                                            الإجراء الإداري المقرر
                                        </h4>
                                        <div className="bg-amber-500/5 dark:bg-amber-500/10 p-6 rounded-[1.5rem] border border-amber-500/10 shadow-sm border-dashed">
                                            <p
                                                className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-md leading-relaxed"
                                                style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                            >
                                                {selectedWarning.actionTaken}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Audit Timeline */}
                                <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-dashed border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 rounded-2xl text-xs font-bold text-gray-500">
                                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                        <span>تاريخ الحادثة: {formatDate(selectedWarning.incidentDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 rounded-2xl text-xs font-bold text-gray-500">
                                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                                        <span>التوقيت: {new Date(selectedWarning.incidentDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-muted/20 border-t border-gray-100 dark:border-gray-800 flex justify-end items-center gap-4">
                                {!selectedWarning.acknowledgedAt && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold ml-auto animate-pulse flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> يرجى الإقرار بالعلم
                                    </p>
                                )}
                                <Button
                                    variant="secondary"
                                    onClick={() => setSelectedWarning(null)}
                                    className="rounded-xl px-8 font-black text-xs uppercase tracking-widest h-11"
                                >
                                    إغلاق
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default MyWarnings;
