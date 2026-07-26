import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    GraduationCap,
    Calendar,
    DollarSign,
    Award,
    Clock,
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2,
    ExternalLink,
    Eye,
    FileText,
    Search,
    Filter,
    X,
    RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";
import { useMemo } from "react";

interface Training {
    id: string;
    trainingName: string;
    provider?: string;
    type: string;
    startDate: string;
    endDate?: string;
    status: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
    cost?: number;
    duration?: number;
    score?: number;
    description?: string;
}

const typeLabels: Record<string, string> = {
    technical: "employee.training.typeTechnical",
    "soft-skills": "employee.training.typeSoftSkills",
    management: "employee.training.typeLeadership",
    safety: "employee.training.typeHealthSafety",
    language: "employee.training.typeLanguages",

    compliance: "employee.training.typeCompliance",
    other: "employee.training.typeOther",
};

const statusConfig: Record<string, { labelKey: string; color: string; icon: React.ReactNode }> = {
    PLANNED: {
        labelKey: "employee.training.plannedStatus",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    ONGOING: {
        labelKey: "employee.training.inProgressStatus",
        color: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    COMPLETED: {
        labelKey: "employee.training.completedStatus",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    CANCELLED: {
        labelKey: "employee.training.cancelledStatus",
        color: "bg-rose-100 text-rose-700 border-rose-200",
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
};

const MyTraining: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    useEffect(() => {
        fetchMyTrainings();
    }, []);

    const fetchMyTrainings = async () => {
        try {
            setLoading(true);
            // Fetch trainings for the current logged-in employee
            const response = await api.get("/hr/trainings/my");
            setTrainings(response.data.trainings || []);
        } catch (error: any) {
            console.error("Error fetching my trainings:", error);
            // If the dedicated endpoint doesn't exist, try the general one with a self flag
            try {
                const fallback = await api.get("/hr/trainings?self=true");
                setTrainings(fallback.data.trainings || []);
            } catch {
                toast.error(t("employee.training.fetchError"));
                setTrainings([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Compute summary stats
    const stats = {
        total: trainings.length,
        completed: trainings.filter((t) => t.status === "COMPLETED").length,
        ongoing: trainings.filter((t) => t.status === "ONGOING").length,
        totalHours: trainings.reduce((sum, t) => sum + (t.duration || 0), 0),
    };

    // Memoized filtered trainings
    const filteredTrainings = useMemo(() => {
        return trainings.filter((t) => {
            const matchesSearch = t.trainingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.provider?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [trainings, searchTerm, statusFilter]);

    // Local Skeleton Component
    const TrainingSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-none shadow-md overflow-hidden bg-white/40 animate-pulse">
                    <div className="h-1.5 w-full bg-gray-200" />
                    <CardHeader className="space-y-3">
                        <div className="flex justify-between">
                            <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                            <div className="w-20 h-5 bg-gray-200 rounded-lg" />
                        </div>
                        <div className="w-3/4 h-6 bg-gray-200 rounded-md" />
                        <div className="w-1/2 h-4 bg-gray-200 rounded-md" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><div className="w-full h-3 bg-gray-100 rounded" /><div className="w-2/3 h-4 bg-gray-200 rounded" /></div>
                            <div className="space-y-2"><div className="w-full h-3 bg-gray-100 rounded" /><div className="w-2/3 h-4 bg-gray-200 rounded" /></div>
                        </div>
                        <div className="h-20 bg-gray-50 rounded-xl" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );



    return (
        <div className="min-h-screen p-6 md:p-8 space-y-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-600">
                        {t("employee.training.title")}
                    </h1>
                    <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                        <GraduationCap className="h-4 w-4 text-purple-400" />
                        {t("employee.training.subtitle")}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <Input
                            placeholder={String(t("employee.training.searchPlaceholder"))}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-9 border-purple-100 focus:border-purple-300 focus:ring-purple-200 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-purple-50/50 rounded-xl border border-purple-100 overflow-x-auto no-scrollbar w-full sm:w-auto">
                        {["ALL", "PLANNED", "ONGOING", "COMPLETED"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === status
                                        ? "bg-white text-purple-700 shadow-sm"
                                        : "text-gray-500 hover:text-purple-600"
                                    }`}
                            >
                                {status === "ALL" ? t("employee.training.all") : t(statusConfig[status]?.labelKey || status)}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchMyTrainings}
                        className="text-purple-600 hover:bg-purple-100 rounded-xl shrink-0"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
                    <div className="h-1 w-full bg-purple-500 opacity-50" />
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t("employee.training.totalCourses")}</p>
                            <p className="text-2xl font-black text-gray-800">{stats.total}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
                    <div className="h-1 w-full bg-emerald-500 opacity-50" />
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t("employee.training.completed")}</p>
                            <p className="text-2xl font-black text-emerald-600">{stats.completed}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
                    <div className="h-1 w-full bg-amber-500 opacity-50" />
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t("employee.training.inProgress")}</p>
                            <p className="text-2xl font-black text-amber-600">{stats.ongoing}</p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
                            <Loader2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
                    <div className="h-1 w-full bg-blue-500 opacity-50" />
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t("employee.training.totalHours")}</p>
                            <p className="text-2xl font-black text-blue-600">{stats.totalHours}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Training List */}
            {loading ? (
                <TrainingSkeleton />
            ) : filteredTrainings.length === 0 ? (
                <Card className="border-none shadow-2xl bg-white/50 backdrop-blur-md p-16 animate-in zoom-in-95 duration-500">
                    <CardContent className="flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-200">
                            {searchTerm || statusFilter !== "ALL" ? <Search className="h-12 w-12" /> : <GraduationCap className="h-12 w-12" />}
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-800">
                                    {searchTerm || statusFilter !== "ALL" ? t("employee.training.noSearchResults") : t("employee.training.noTrainings")}
                                </h3>
                                <p className="text-gray-500 max-w-sm mx-auto">
                                    {searchTerm || statusFilter !== "ALL"
                                        ? t("employee.training.searchHint")
                                        : t("employee.training.noTrainingsHint")}
                                </p>
                            </div>

                            {(searchTerm || statusFilter !== "ALL") && (
                                <Button
                                    variant="outline"
                                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                                    onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }}
                                >
                                    {t("employee.training.resetSearch")}
                                </Button>
                            )}

                            {!(searchTerm || statusFilter !== "ALL") && (
                                <Button
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                    onClick={fetchMyTrainings}
                                >
                                    {t("employee.training.refreshData")}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {filteredTrainings.map((training) => {
                        const status = statusConfig[training.status] ?? {
                            label: training.status,
                            color: "bg-gray-100 text-gray-700",
                            icon: null,
                        };

                        return (
                            <Card
                                key={training.id}
                                className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden bg-white/70 backdrop-blur-sm ring-1 ring-purple-100/50"
                            >
                                <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
                                            <GraduationCap className="h-6 w-6" />
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 ${status.color}`}>
                                            {status.icon}
                                            {t(status.labelKey)}
                                        </span>
                                    </div>
                                    <CardTitle className="text-xl font-black mt-4 leading-tight group-hover:text-purple-700 transition-colors">
                                        {training.trainingName}
                                    </CardTitle>
                                    {training.provider && (
                                        <p className="text-sm text-gray-500 font-medium">{training.provider}</p>
                                    )}
                                    <Badge variant="outline" className="w-fit text-[10px] font-bold border-purple-100 text-purple-600 mt-1">
                                        {t(typeLabels[training.type] ?? "employee.training.typeOther")}
                                    </Badge>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {t("employee.training.startDate")}
                                            </p>
                                            <p className="text-xs font-bold text-gray-700">
                                                {new Date(training.startDate).toLocaleDateString("ar-EG", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>

                                        {training.duration ? (
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {t("employee.training.duration")}
                                            </p>
                                            <p className="text-xs font-bold text-gray-700">{t("employee.training.hours", { hours: training.duration })}</p>
                                            </div>
                                        ) : null}
                                    </div>

                                    {training.endDate && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {t("employee.training.endDate")}
                                            </p>
                                            <p className="text-xs font-bold text-gray-700">
                                                {new Date(training.endDate).toLocaleDateString("ar-EG", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                        {training.cost ? (
                                            <div className="flex flex-col">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" /> {t("employee.training.cost")}
                                                </p>
                                                <p className="text-sm font-black text-purple-600">
                                                    {training.cost.toLocaleString()}{" "}
                                                    <span className="text-[10px] font-bold opacity-60">EGP</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <div />
                                        )}

                                        {training.score ? (
                                            <div className="flex flex-col items-end">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                                    <Award className="h-3 w-3" /> {t("employee.training.rating")}
                                                </p>
                                                <p className="text-sm font-black text-amber-500">%{training.score}</p>
                                            </div>
                                        ) : null}
                                    </div>

                                    {training.description && (
                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 border-t border-gray-50 pt-3 mt-3">
                                            {training.description}
                                        </p>
                                    )}

                                    <div className="pt-4 mt-4 border-t border-gray-50">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-bold gap-2"
                                            onClick={() => setSelectedTraining(training)}
                                        >
                                            <Eye className="w-4 h-4" /> {t("employee.training.viewDetails")}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!!selectedTraining && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-[100] flex justify-center items-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTraining(null) }}>
                    <div dir="rtl" className="relative border-none shadow-2xl overflow-hidden rounded-[2rem] bg-white hr-theme p-0 w-full max-w-[600px] my-auto">
                        <div className="relative w-full h-full pb-6">
                            <div className="h-2 w-full bg-gradient-to-r from-purple-500 to-indigo-500 absolute top-0 left-0" />
                            <div className="px-6 pt-6 pb-2">
                                <h2 className="text-2xl font-black text-gray-800 flex flex-col gap-2">
                                    <span className="flex items-center gap-2 text-purple-600">
                                        <BookOpen className="w-6 h-6" />
                                        {t("employee.training.detailsTitle")}
                                    </span>
                                    <span className="text-xl text-gray-700">{selectedTraining?.trainingName}</span>
                                </h2>
                            </div>

                            {selectedTraining && (
                                <div className="p-6 space-y-6 bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-bold border-purple-200 text-purple-700 bg-purple-50">
                                            {t(typeLabels[selectedTraining.type] ?? "employee.training.typeOther")}
                                        </Badge>
                                        {selectedTraining.provider && (
                                            <Badge variant="secondary" className="font-bold bg-indigo-50 text-indigo-700">
                                                {t("employee.training.provider", { name: selectedTraining.provider })}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 mt-4 gap-4 p-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-gray-400 uppercase">{t("employee.training.startDate")}</p>
                                            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-purple-400" />
                                                {new Date(selectedTraining.startDate).toLocaleDateString("ar-EG", {
                                                    day: "numeric", month: "long", year: "numeric"
                                                })}
                                            </p>
                                        </div>
                                        {selectedTraining.endDate && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-gray-400 uppercase">{t("employee.training.endDate")}</p>
                                                <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-purple-400" />
                                                    {new Date(selectedTraining.endDate).toLocaleDateString("ar-EG", {
                                                        day: "numeric", month: "long", year: "numeric"
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 mt-4 gap-4 p-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                                        {selectedTraining.duration && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-gray-400 uppercase">{t("employee.training.duration")}</p>
                                                <p className="text-xl font-black text-gray-700 flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-indigo-400" />
                                                    {t("employee.training.hours", { hours: selectedTraining.duration })}
                                                </p>
                                            </div>
                                        )}
                                        {selectedTraining.cost ? (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-gray-400 uppercase">{t("employee.training.cost")}</p>
                                                <p className="text-xl font-black text-emerald-600 flex items-center gap-2">
                                                    <DollarSign className="w-5 h-5" />
                                                    {selectedTraining.cost.toLocaleString()}
                                                    <span className="text-xs">EGP</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <div />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 mt-4 gap-4 p-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-gray-400 uppercase">{t("employee.training.rating")}</p>
                                            {selectedTraining.score ? (
                                                <p className="text-xl font-black text-amber-500 flex items-center gap-2">
                                                    <Award className="w-5 h-5" />
                                                    %{selectedTraining.score}
                                                </p>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-400">{t("employee.training.notRated")}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-gray-400 uppercase">{t("employee.training.status")}</p>
                                            <div className="mt-1">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black border flex items-center gap-2 w-fit ${statusConfig[selectedTraining.status]?.color || "bg-gray-100 text-gray-700"}`}>
                                                    {statusConfig[selectedTraining.status]?.icon}
                                                    {t(statusConfig[selectedTraining.status]?.labelKey || selectedTraining.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTraining.description && (
                                        <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                                            <p className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-2 uppercase">
                                                <FileText className="w-4 h-4" /> {t("employee.training.description")}
                                            </p>
                                            <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                                {selectedTraining.description}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            onClick={() => setSelectedTraining(null)}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-8 rounded-xl"
                                        >
                                        {t("employee.common.close")}
                                    </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTraining;
