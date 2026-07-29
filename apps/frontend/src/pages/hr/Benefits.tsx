import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  Users,
  DollarSign,
  CheckCircle,
  Trash2,
  HeartPulse,
  Shield,
  PiggyBank,
  Save,
  Pencil,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Car,
  Home,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface Enrollment {
  id: string;
  startDate: string;
  endDate?: string;
  status: string;
  notes?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
}

interface Benefit {
  id: string;
  name: string;
  description?: string;
  type: string;
  cost?: number;
  currency: string;
  isActive: boolean;
  activeEnrollments?: number;
  enrollments?: Enrollment[];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

const Benefits: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "health_insurance",
    cost: 0,
    currency: "EGP",
    isActive: true,
  });

  const [enrollmentFormData, setEnrollmentFormData] = useState({
    employeeId: "",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const { id } = useParams();

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBenefits();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, typeFilter, page]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (id && id !== "new") {
      fetchBenefitDetails(id);
    } else if (location.pathname.endsWith("/new")) {
      setDialogOpen(true);
    }
  }, [id, location.pathname]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/hr/employees?limit=1000");
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchBenefitDetails = async (benefitId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/benefits/${benefitId}`);
      setSelectedBenefit(response.data.benefit);
      setDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching benefit details:", error);
      tToast.error("benefits.failed_fetch_81e2");
      navigate("/hr/benefits");
    } finally {
      setLoading(false);
    }
  };

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      console.log("💎 Fetching benefits with params:", {
        search,
        type: typeFilter,
        page,
        limit: 9,
      });
      const response = await api.get("/hr/benefits", {
        params: {
          search,
          type: typeFilter,
          page,
          limit: 9,
        },
      });
      setBenefits(response.data?.benefits || []);
      setPagination(
        response.data?.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      );
    } catch (error) {
      console.error("Error fetching benefits:", error);
      tToast.error("benefits.failed_fetch_cfae");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollmentFormData.employeeId) {
      tToast.error("benefits.msg_7103");
      return;
    }

    try {
      setEnrollLoading(true);
      await api.post("/hr/benefits/enroll", {
        benefitId: selectedBenefit?.id,
        ...enrollmentFormData,
      });
      tToast.success("benefits.success_login_9cb9");
      setEnrollmentFormData({
        employeeId: "",
        startDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      if (selectedBenefit) {
        fetchBenefitDetails(selectedBenefit.id);
      }
      fetchBenefits();
    } catch (error: any) {
      console.error("Error enrolling employee:", error);
      toast.error(error.response?.data?.error || "فشل في تسجيل الموظف");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      tToast.error("benefits.name_required_6cb0");
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/hr/benefits/${editingId}`, formData);
        tToast.success("benefits.success_update_38b1");
      } else {
        await api.post("/hr/benefits", formData);
        tToast.success("benefits.success_create_3efd");
      }
      setDialogOpen(false);
      resetForm();
      fetchBenefits();
      if (!editingId && location.pathname.endsWith("/new")) {
        navigate("/hr/benefits");
      }
    } catch (error: any) {
      console.error("Error saving benefit:", error);
      toast.error(
        error.response?.data?.error ||
        (editingId ? "فشل في تحديث الميزة" : "فشل في إنشاء الميزة"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذه الميزة؟")) return;

    try {
      await api.delete(`/hr/benefits/${id}`);
      tToast.success("benefits.success_delete_aded");
      fetchBenefits();
    } catch (error) {
      console.error("Error deleting benefit:", error);
      tToast.error("benefits.failed_delete_29dd");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "health_insurance",
      cost: 0,
      currency: "EGP",
      isActive: true,
    });
    setEditingId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
    navigate("/hr/benefits/new");
  };

  const openEditDialog = (benefit: Benefit) => {
    setFormData({
      name: benefit.name || "",
      description: benefit.description || "",
      type: benefit.type || "health_insurance",
      cost: benefit.cost || 0,
      currency: benefit.currency || "EGP",
      isActive: benefit.isActive,
    });
    setEditingId(benefit.id);
    setDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "health_insurance":
        return <HeartPulse className="h-5 w-5 text-red-500" />;
      case "life_insurance":
        return <Shield className="h-5 w-5 text-blue-500" />;
      case "retirement":
        return <PiggyBank className="h-5 w-5 text-green-500" />;
      case "transportation":
        return <Car className="h-5 w-5 text-gray-500" />;
      case "housing":
        return <Home className="h-5 w-5 text-orange-500" />;
      default:
        return <Gift className="h-5 w-5 text-purple-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      health_insurance: "تأمين صحي",
      life_insurance: "تأمين على الحياة",
      retirement: "تقاعد",
      transportation: "بدل انتقال",
      housing: "بدل سكن",
      other: "أخرى",
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50/30 dark:bg-gray-900/30">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">
            جاري تحميل المزايا...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gray-50/20 min-h-screen" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            المزايا والتعويضات
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            إدارة المزايا الإضافية وبرامج الرعاية الخاصة بالموظفين
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة ميزة جديدة
        </Button>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative group">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="ابحث عن ميزة بالاسم أو الوصف..."
            className="w-full pr-12 h-14 rounded-2xl border-none bg-white dark:bg-gray-900 shadow-sm shadow-gray-200/50 dark:shadow-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="md:col-span-4 h-14">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-full rounded-2xl border-none bg-white dark:bg-gray-900 shadow-sm shadow-gray-200/50 dark:shadow-none focus:ring-2 focus:ring-primary/20 font-bold transition-all">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <SelectValue placeholder="تصفية حسب النوع" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="all" className="rounded-xl m-1">كل الأنواع</SelectItem>
              <SelectItem value="health_insurance" className="rounded-xl m-1">تأمين صحي</SelectItem>
              <SelectItem value="life_insurance" className="rounded-xl m-1">تأمين على الحياة</SelectItem>
              <SelectItem value="retirement" className="rounded-xl m-1">تقاعد</SelectItem>
              <SelectItem value="transportation" className="rounded-xl m-1">بدل انتقال</SelectItem>
              <SelectItem value="housing" className="rounded-xl m-1">بدل سكن</SelectItem>
              <SelectItem value="other" className="rounded-xl m-1">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {benefits.length === 0 && !loading ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Gift className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">لا توجد مزايا مسجلة</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              لم تقم بإضافة أي مزايا موظفين حتى الآن. ابدأ بإضافة التأمين الصحي
              أو برامج التقاعد.
            </p>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="h-11 rounded-full px-8"
            >
              <Plus className="h-4 w-4 ml-2" />
              أضف أول ميزة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit: Benefit) => (
            <div
              key={benefit.id}
              className="group relative"
              onClick={() => navigate(`/hr/benefits/${benefit.id}`)}
            >
              <Card className="relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer group bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl ring-1 ring-gray-100 dark:ring-white/5 h-full rounded-3xl">
                {/* Visual Gradient Bottom */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-l from-primary via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none group-hover:scale-110 transition-transform duration-500">
                      {getTypeIcon(benefit.type)}
                    </div>
                    <div className="flex gap-1">
                      {benefit.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-none font-bold">
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          متوقف
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(benefit);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={(e) => handleDelete(e, benefit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-black mt-6 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                    {benefit.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[48px] mt-2 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    {benefit.description || "لا يوجد وصف متاح لهذه الميزة"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-lg font-bold px-3 py-1 border-primary/10 bg-primary/5 text-primary"
                    >
                      {getTypeLabel(benefit.type)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest leading-none mb-1">
                          التكلفة
                        </p>
                        <p className="font-black text-gray-900 dark:text-gray-100">
                          {benefit.cost?.toLocaleString() || 0}{" "}
                          <span className="text-xs font-bold text-gray-400">
                            {benefit.currency}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-left flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest leading-none mb-1">
                          المشتركون
                        </p>
                        <p className="font-black text-orange-600 dark:text-orange-400 leading-none">
                          {benefit.activeEnrollments || 0}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="px-6 py-4 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {[...Array(Math.min(3, benefit.activeEnrollments || 0))].map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-black text-primary flex items-center gap-2">
                    عرض التفاصيل
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </div>
          ))}
          {/* Pagination Section */}
          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-sm text-muted-foreground">
                عرض {benefits.length} من {pagination?.total || 0} ميزة
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  {[...Array(pagination?.totalPages || 0)].map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                      className="h-9 w-9 p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(pagination?.totalPages || 1, p + 1))
                  }
                  disabled={page === pagination?.totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && location.pathname.endsWith("/new")) {
            navigate("/hr/benefits");
          }
          if (!open) {
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md" dir="rtl">
          <div className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-primary/10">
                <Gift className="h-10 w-10 text-primary" />
              </div>
              <DialogTitle className="text-3xl font-black text-gray-900 dark:text-gray-100">
                {editingId ? "تعديل ميزة قائمة" : "إضافة ميزة جديدة"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm">
                {editingId
                  ? "قم بتحديث بيانات الميزة الحالية لتنسجم مع سياسات الشركة المتغيرة."
                  : "ابدأ بتعريف ميزة جديدة تساهم في رفع مستوى رفاهية موظفيك."}
              </DialogDescription>
            </div>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-8 space-y-8">
              <div className="space-y-3 px-1">
                <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" />
                  اسم الميزة الفريد
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="مثال: تأمين طبي VIP، بدل سكن كبار المدراء..."
                  className="h-14 rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
                <div className="space-y-3">
                  <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    نوع الميزة
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm font-bold">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      <SelectItem value="health_insurance" className="rounded-xl m-1">تأمين صحي</SelectItem>
                      <SelectItem value="life_insurance" className="rounded-xl m-1">تأمين على الحياة</SelectItem>
                      <SelectItem value="retirement" className="rounded-xl m-1">تقاعد ومساهمات</SelectItem>
                      <SelectItem value="transportation" className="rounded-xl m-1">بدل انتقال</SelectItem>
                      <SelectItem value="housing" className="rounded-xl m-1">بدل سكن</SelectItem>
                      <SelectItem value="other" className="rounded-xl m-1">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    التكلفة الشهرية
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">EGP</span>
                    <Input
                      type="number"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-14 rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm pl-16 text-lg font-black"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-primary" />
                  وصف الميزة وشروط الاستحقاق
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="اشرح هنا تفاصيل الميزة، من يستحقها، وكيفية تفعيلها..."
                  className="min-h-[120px] rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm p-4 text-gray-600 dark:text-gray-400 resize-none leading-relaxed"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 pt-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              {submitting ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 border-3 border-white/30 border-t-white animate-spin rounded-full" />
                  جاري الحفظ...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  {editingId ? "حفظ التعديلات" : "تأكيد إضافة الميزة"}
                </div>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                if (location.pathname.endsWith("/new"))
                  navigate("/hr/benefits");
              }}
              className="h-14 px-8 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Benefit Details Dialog */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedBenefit(null);
            navigate("/hr/benefits");
          }
        }}
      >
        <DialogContent
          className="sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          dir="rtl"
        >
          {selectedBenefit && (
            <div className="flex flex-col max-h-[90vh]">
              <div className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                        {getTypeIcon(selectedBenefit.type)}
                      </div>
                      <div className="flex flex-col">
                        <Badge variant="outline" className="w-fit bg-white/50 dark:bg-white/5 border-primary/20 text-primary font-bold">
                          {getTypeLabel(selectedBenefit.type)}
                        </Badge>
                        <DialogTitle className="text-3xl font-black mt-1 text-gray-900 dark:text-gray-100">
                          {selectedBenefit.name}
                        </DialogTitle>
                      </div>
                    </div>
                    <DialogDescription className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                      {selectedBenefit.description || "لا يوجد وصف متاح لهذه الميزة"}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-4 bg-white dark:bg-gray-800/50 p-5 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/50 min-w-[200px]">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-inner">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-0.5">
                        المشتركون حالياً
                      </p>
                      <p className="text-3xl font-black text-gray-900 dark:text-gray-100 leading-none">
                        {selectedBenefit.activeEnrollments || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="enrollments" className="flex-1 flex flex-col min-h-0">
                <div className="px-8 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
                  <TabsList className="bg-transparent gap-8 h-16">
                    <TabsTrigger
                      value="enrollments"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-16 px-2 font-bold transition-all text-gray-500 dark:text-gray-400"
                    >
                      قائمة المشتركين
                    </TabsTrigger>
                    <TabsTrigger
                      value="add_enrollment"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-16 px-2 font-bold transition-all text-gray-500 dark:text-gray-400"
                    >
                      إضافة مشترك جديد
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 dark:bg-black/20">
                  <TabsContent
                    value="enrollments"
                    className="m-0 focus-visible:outline-none data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    {!selectedBenefit.enrollments ||
                      selectedBenefit.enrollments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <Users className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">لا يوجد مشتركون حالياً</p>
                        <p className="text-sm text-gray-500">
                          ابدأ بإضافة موظفين للاستفادة من هذه الميزة
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b bg-gray-50/50 dark:bg-gray-800/50">
                              <TableHead className="text-right text-gray-900 dark:text-gray-100 font-bold py-4">
                                الموظف
                              </TableHead>
                              <TableHead className="text-right text-gray-900 dark:text-gray-100 font-bold">
                                تاريخ البدء
                              </TableHead>
                              <TableHead className="text-right text-gray-900 dark:text-gray-100 font-bold">
                                الحالة
                              </TableHead>
                              <TableHead className="text-left text-gray-900 dark:text-gray-100 font-bold">
                                ملاحظات
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedBenefit.enrollments.map((en) => (
                              <TableRow
                                key={en.id}
                                className="group hover:bg-primary/5 dark:hover:bg-primary/10 border-b border-gray-50 dark:border-gray-800 transition-colors"
                              >
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                                      {en.employee.firstName[0]}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-gray-100">
                                        {en.employee.firstName}{" "}
                                        {en.employee.lastName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        #{en.employee.employeeNumber}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-600 dark:text-gray-400 font-medium">
                                  {new Date(en.startDate).toLocaleDateString(
                                    "ar-EG",
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      en.status === "ACTIVE"
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-100 border-none"
                                    }
                                  >
                                    {en.status === "ACTIVE" ? "نشط" : "ملغى"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-500 dark:text-gray-500 max-w-[200px] truncate italic">
                                  {en.notes || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="add_enrollment"
                    className="m-0 focus-visible:outline-none data-[state=active]:flex data-[state=active]:flex-col"
                  >
                    <div className="max-w-2xl mx-auto space-y-8 pt-2 pb-12 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            اختر الموظف المستفيد
                          </Label>
                          <Select
                            value={enrollmentFormData.employeeId}
                            onValueChange={(val) =>
                              setEnrollmentFormData({
                                ...enrollmentFormData,
                                employeeId: val,
                              })
                            }
                          >
                            <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-gray-100">
                              <SelectValue placeholder="ابحث عن الموظف..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-2xl">
                              <div className="p-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-800 z-10">
                                <div className="relative">
                                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="ابحث بالاسم أو الرقم الوظيفي..."
                                    className="h-10 pr-10 text-sm rounded-xl border-gray-100 dark:border-gray-700"
                                    onChange={(e) => {
                                      // Filter logic can be added here if needed
                                    }}
                                  />
                                </div>
                              </div>
                              <ScrollArea className="h-64">
                                {employees.length === 0 ? (
                                  <div className="p-8 text-center text-sm text-gray-400 italic">
                                    لا يوجد موظفون متاحون
                                  </div>
                                ) : (
                                  employees.map((emp) => (
                                    <SelectItem
                                      key={emp.id}
                                      value={emp.id}
                                      className="rounded-xl m-1 cursor-pointer focus:bg-primary/10"
                                    >
                                      <div className="flex flex-col text-right">
                                        <span className="font-bold">{emp.firstName} {emp.lastName}</span>
                                        <span className="text-[10px] text-gray-400">#{emp.employeeNumber}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            تاريخ بدء الاستحقاق
                          </Label>
                          <Input
                            type="date"
                            value={enrollmentFormData.startDate}
                            onChange={(e) =>
                              setEnrollmentFormData({
                                ...enrollmentFormData,
                                startDate: e.target.value,
                              })
                            }
                            className="h-14 rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Pencil className="h-4 w-4 text-primary" />
                          ملاحظات إضافية
                        </Label>
                        <Textarea
                          value={enrollmentFormData.notes}
                          onChange={(e) =>
                            setEnrollmentFormData({
                              ...enrollmentFormData,
                              notes: e.target.value,
                            })
                          }
                          placeholder="أي تفاصيل خاصة باشتراك هذا الموظف (مثلاً: الفئة التأمينية، المرافقون...)"
                          className="min-h-[120px] rounded-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-gray-900 dark:text-gray-100 resize-none p-4"
                        />
                      </div>

                      <Button
                        className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                        onClick={handleEnroll}
                        disabled={enrollLoading}
                      >
                        {enrollLoading ? (
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-5 border-3 border-white/30 border-t-white animate-spin rounded-full" />
                            جاري الحفظ...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="h-5 w-5" />
                            تأكيد التسجيل في الميزة
                          </div>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )
          }
        </DialogContent >
      </Dialog >
    </div >
  );
};

export default Benefits;
