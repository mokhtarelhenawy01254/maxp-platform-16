import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Plus, Calendar, User, File, Search, Filter, CheckCircle2, Clock, Trash2, Download, Eye, ArrowRight, Info, ShieldAlert, MoreVertical, Edit, Gavel } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";

// Define Types
interface Warning {
  id: string;
  type: "VERBAL" | "WRITTEN" | "FINAL" | "TERMINATION";
  severity: "minor" | "moderate" | "severe";
  title: string;
  description: string;
  incidentDate: string;
  acknowledgedAt?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
    position?: { title: string };
    department?: { name: string };
    image?: string;
  };
}

interface WarningStats {
  total: number;
  byType: Array<{ type: string; _count: number }>;
  bySeverity: Array<{ severity: string; _count: number }>;
  acknowledged: number;
  acknowledgmentRate: number;
}

const Warnings: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();

  // State
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [stats, setStats] = useState<WarningStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, pending, acknowledged
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = employeeId
        ? `/hr/warnings/employee/${employeeId}`
        : "/hr/warnings";

      const statsUrl = `/hr/warnings/stats${employeeId ? `?employeeId=${employeeId}` : ""}`;

      console.log("🔍 [FETCH] Fetching warnings from:", url);
      const warningsRes = await api.get(url);
      setWarnings(warningsRes.data.warnings || []);

      console.log("🔍 [FETCH] Fetching stats from:", statsUrl);
      try {
        const statsRes = await api.get(statsUrl);
        setStats(statsRes.data.stats || null);
      } catch (statsErr: any) {
        console.error(
          "❌ [FETCH-STATS-ERROR]",
          statsErr.response?.data || statsErr.message,
        );
        // Don't fail the whole page if just stats fail
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الإنذار؟")) return;
    try {
      await api.delete(`/hr/warnings/${id}`);
      toast.success("تم حذف الإنذار بنجاح");
      fetchData(); // Refresh data
    } catch (error) {
      toast.error("فشل في حذف الإنذار");
    }
  };

  const handleAdminAcknowledge = async (id: string) => {
    if (!window.confirm("هل تريد تسجيل إقرار إداري لهذا الإنذار؟ (يستخدم في حال توقيع الموظف ورقياً)")) return;
    try {
      await api.post(`/hr/warnings/${id}/admin-acknowledge`);
      toast.success("تم تسجيل الإقرار بنجاح");
      fetchData(); // Refresh data
    } catch (error) {
      toast.error("فشل في تسجيل الإقرار");
    }
  };

  // Helper Functions
  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      VERBAL: "شفوي",
      WRITTEN: "كتابي",
      FINAL: "نهائي",
      TERMINATION: "إنهاء خدمة",
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      VERBAL:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      WRITTEN:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      FINAL:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      TERMINATION:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colorMap[type] || "bg-gray-100 text-gray-700";
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      minor:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
      moderate:
        "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
      severe:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
    };
    const labels: Record<string, string> = {
      minor: "مخالفة بسيطة",
      moderate: "مخالفة متوسطة",
      severe: "مخالفة جسيمة",
    };

    return (
      <Badge
        variant="outline"
        className={`${styles[severity] || ""} text-xs font-normal`}
      >
        {labels[severity] || severity}
      </Badge>
    );
  };

  // Filter Logic
  const filteredWarnings = useMemo(() => {
    return warnings.filter((item) => {
      // 1. Search Query
      const searchMatch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.firstName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.employee.lastName
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (!searchMatch) return false;

      // 2. Tab Filter (Status)
      if (activeTab === "pending" && item.acknowledgedAt) return false;
      if (activeTab === "acknowledged" && !item.acknowledgedAt) return false;

      // 3. Severity Filter
      if (severityFilter !== "all" && item.severity !== severityFilter)
        return false;

      return true;
    });
  }, [warnings, searchQuery, activeTab, severityFilter]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            الإنذارات والمخالفات
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة ومتابعة المخالفات الإدارية والإجراءات التأديبية
          </p>
        </div>
        <Button
          onClick={() => navigate("/hr/warnings/new")}
          className="shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="h-5 w-5 ml-2" />
          تسجيل مخالفة جديدة
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
                إجمالي الإنذارات
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.total}
              </div>
              <p className="text-xs text-blue-600/80 mt-1">
                سجل كامل للمخالفات
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">
                قيد الانتظار
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {stats.total - stats.acknowledged}
              </div>
              <p className="text-xs text-orange-600/80 mt-1">
                بانتظار توقيع الموظف
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                مكتملة الإجراءات
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.acknowledged}
              </div>
              <p className="text-xs text-green-600/80 mt-1">تم الاعتراف بها</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                مخالفات جسيمة
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {stats.bySeverity.find((s) => s.severity === "severe")
                  ?._count || 0}
              </div>
              <p className="text-xs text-red-600/80 mt-1">تتطلب انتباه فوري</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Tabs
              defaultValue="all"
              className="w-full md:w-auto"
              onValueChange={setActiveTab}
            >
              <TabsList className="bg-muted/50 w-full md:w-auto p-1">
                <TabsTrigger value="all" className="flex-1 md:flex-none">
                  الكل
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex-1 md:flex-none">
                  قيد الانتظار
                </TabsTrigger>
                <TabsTrigger
                  value="acknowledged"
                  className="flex-1 md:flex-none"
                >
                  مكتملة
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث باسم الموظف أو المخالفة..."
                  className="pr-9 bg-background/50 border-muted"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px] bg-background/50 border-muted">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="الشدة" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستويات</SelectItem>
                  <SelectItem value="minor">بسيطة</SelectItem>
                  <SelectItem value="moderate">متوسطة</SelectItem>
                  <SelectItem value="severe">جسيمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p>جاري تحديث البيانات...</p>
            </div>
          ) : filteredWarnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                لا توجد مخالفات مطابقة
              </h3>
              <p className="max-w-xs mx-auto mt-2">
                لم يتم العثور على أي سجلات تطابق معايير البحث الخاصة بك. حاول
                تغيير الفلاتر.
              </p>
              {Object.keys(filteredWarnings).length === 0 &&
                warnings.length === 0 && (
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => navigate("/hr/warnings/new")}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مخالفة جديدة
                  </Button>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWarnings.map((warning) => (
                <Card
                  key={warning.id}
                  className="group relative overflow-hidden border-muted hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card"
                >
                  <div
                    className={`absolute top-0 right-0 w-1 h-full ${warning.severity === "severe"
                      ? "bg-red-500"
                      : warning.severity === "moderate"
                        ? "bg-orange-500"
                        : "bg-blue-400"
                      }`}
                  />

                  <CardHeader className="pb-3 pt-5 pr-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                            {warning.employee.firstName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {warning.employee.firstName}{" "}
                            {warning.employee.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {warning.employee.position?.title || "موظف"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mt-1 -ml-2 text-muted-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl p-2 min-w-[180px] z-50">
                          <DropdownMenuItem
                            className="rounded-xl flex items-center gap-3 py-2.5 cursor-pointer"
                            onClick={() =>
                              navigate(`/hr/warnings/${warning.id}`)
                            }
                          >
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm">عـرض التفاصيل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl flex items-center gap-3 py-2.5 cursor-pointer"
                            onClick={() =>
                              navigate(`/hr/warnings/${warning.id}/edit`)
                            }
                          >
                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                              <Edit className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm">تعديل</span>
                          </DropdownMenuItem>
                          {!warning.acknowledgedAt && (
                            <DropdownMenuItem
                              className="rounded-xl flex items-center gap-3 py-2.5 cursor-pointer text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-900/20"
                              onClick={() => handleAdminAcknowledge(warning.id)}
                            >
                              <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-sm">إقرار إداري (يدوي)</span>
                            </DropdownMenuItem>
                          )}
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          <DropdownMenuItem
                            className="rounded-xl flex items-center gap-3 py-2.5 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20"
                            onClick={() => handleDelete(warning.id)}
                          >
                            <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm">حـذف</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <CardTitle
                          className="text-base break-all flex-1 pr-2 leading-tight font-bold text-gray-900 dark:text-gray-100"
                          title={warning.title}
                        >
                          {warning.title}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => setSelectedWarning(warning)}
                          title="عرض سريع"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Badge
                          variant="secondary"
                          className={`${getTypeColor(warning.type)} border-0`}
                        >
                          {getTypeLabel(warning.type)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 pt-2 space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          <FileText className="h-3.5 w-3.5" />
                          <span>وصف المخالفة:</span>
                        </div>
                        <p
                          className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50/80 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5"
                          style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                        >
                          {warning.description}
                        </p>
                      </div>

                      {warning.actionTaken && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                            <Gavel className="h-3.5 w-3.5" />
                            <span>الإجراء المتخذ:</span>
                          </div>
                          <p
                            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20"
                            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                          >
                            {warning.actionTaken}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">تاريخ الواقعة:</span>
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl w-fit border border-blue-100 dark:border-blue-900/30">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(warning.incidentDate).toLocaleDateString("ar-EG")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 pr-6 pb-4 flex items-center justify-between border-t bg-muted/10 h-14">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(warning.severity)}
                    </div>

                    {warning.acknowledgedAt ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        تم الإقرار
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        بانتظار الإقرار
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!selectedWarning} onOpenChange={(open) => !open && setSelectedWarning(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden" dir="rtl">
          {selectedWarning && (
            <>
              {/* Status Header */}
              <div className="h-2 bg-primary/20 bg-gradient-to-r from-primary via-primary/50 to-primary/10" />

              <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-br from-muted/50 via-background to-background relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-4 border-white dark:border-gray-800 shadow-xl ring-2 ring-primary/10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-foreground text-white text-xl font-black">
                          {selectedWarning.employee.firstName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-green-500 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900" />
                    </div>
                    <div className="space-y-1">
                      <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white break-words max-w-[400px]">
                        {selectedWarning.title}
                      </DialogTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <User className="h-3.5 w-3.5" />
                        <span>{selectedWarning.employee.firstName} {selectedWarning.employee.lastName}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <span>{selectedWarning.employee.employeeNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-8 pb-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar relative">
                {/* Meta Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="group p-4 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl border border-muted/50 space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                      <AlertTriangle className="h-3 w-3" /> درجة الشدة
                    </p>
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(selectedWarning.severity)}
                    </div>
                  </div>
                  <div className="group p-4 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl border border-muted/50 space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                      <FileText className="h-3 w-3" /> تصنيف المخالفة
                    </p>
                    <Badge variant="secondary" className={`${getTypeColor(selectedWarning.type)} border-0 text-xs px-3 py-1`}>
                      {getTypeLabel(selectedWarning.type)}
                    </Badge>
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      تفاصيل الواقعة
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: #{selectedWarning.id.slice(-6)}</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-transparent rounded-[1.25rem] blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    <div className="relative bg-white dark:bg-gray-900/50 p-6 rounded-[1.25rem] border border-gray-100 dark:border-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200 text-lg">
                      {selectedWarning.description}
                    </div>
                  </div>
                </div>

                {/* Footnote Stats */}
                <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-dashed border-muted">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-full text-xs font-semibold text-muted-foreground">
                    <Calendar className="h-3 w-3 text-primary" />
                    <span>حدثت في: {new Date(selectedWarning.incidentDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {selectedWarning.acknowledgedAt ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-xs font-bold ring-1 ring-green-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>تم الإقرار: {new Date(selectedWarning.acknowledgedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold ring-1 ring-amber-500/20">
                      <Info className="h-3 w-3" />
                      <span>في انتظار إقرار الموظف</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 bg-muted/20 border-t border-muted/30 flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedWarning(null)}
                  className="rounded-xl px-6 font-bold hover:bg-background"
                >
                  إغلاق النافذة
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => navigate(`/hr/warnings/${selectedWarning.id}`)}
                    className="rounded-xl shadow-lg shadow-primary/20 px-8 font-black gap-2 h-12"
                  >
                    فتح الملف الكامل
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warnings;
