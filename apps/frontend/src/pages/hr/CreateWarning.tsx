import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Save, ArrowRight, AlertTriangle, Calendar, File, User, ShieldAlert, Gavel, Eye } from 'lucide-react';
import api from "../../services/api";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";

// Types
type WarningFormData = {
  employeeId: string;
  type: "VERBAL" | "WRITTEN" | "FINAL" | "TERMINATION";
  severity: "minor" | "medium" | "major" | "critical";
  title: string;
  description: string;
  incidentDate: string;
  actionTaken: string;
};

const CreateWarning = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<WarningFormData>({
    defaultValues: {
      employeeId: "",
      type: "VERBAL",
      severity: "minor",
      title: "",
      description: "",
      incidentDate: new Date().toISOString().split("T")[0],
      actionTaken: "",
    },
  });

  const selectedEmployeeId = watch("employeeId");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empRes = await api.get("/hr/employees");
        setEmployees(empRes.data.employees || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("فشل في تحميل بيانات الموظفين");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find((e) => e.id === selectedEmployeeId);
      setSelectedEmployee(employee);
    }
  }, [selectedEmployeeId, employees]);

  const onSubmit = async (data: WarningFormData) => {
    try {
      setLoading(true);

      if (!data.employeeId || data.employeeId.trim() === "") {
        toast.error("يجب اختيار الموظف");
        return;
      }

      await api.post("/hr/warnings", data);
      toast.success("تم إصدار الإنذار بنجاح");
      navigate("/hr/warnings");
    } catch (error: any) {
      console.error("Error creating warning:", error);
      toast.error(error.response?.data?.error || "فشل في إصدار الإنذار");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hr/warnings")}
            className="rounded-full hover:bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-8 w-8 text-red-500" />
              إصدار مخالفة إدارية
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              توثيق إجراء تأديبي أو مخالفة وفقاً للوائح الشركة
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                تفاصيل المخالفة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Employee Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    الموظف المعني <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="employeeId"
                    control={control}
                    rules={{ required: "يجب اختيار الموظف" }}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-12 bg-background/50">
                          <SelectValue placeholder="بحث عن موظف..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.length === 0 ? (
                            <SelectItem value="no-employees" disabled>
                              لا يوجد موظفين متاحين
                            </SelectItem>
                          ) : (
                            employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback>
                                      {emp.firstName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    ({emp.employeeNumber})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.employeeId && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{" "}
                      {errors.employeeId.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Incident Date */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">
                      تاريخ الواقعة <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-12 pr-10 bg-background/50"
                        {...register("incidentDate", {
                          required: "التاريخ مطلوب",
                        })}
                      />
                    </div>
                    {errors.incidentDate && (
                      <p className="text-sm text-red-500">
                        {errors.incidentDate.message}
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">
                      نوع الإجراء <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-12 bg-background/50">
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VERBAL">تنبيه شفهي</SelectItem>
                            <SelectItem value="WRITTEN">إنذار كتابي</SelectItem>
                            <SelectItem value="FINAL">إنذار نهائي</SelectItem>
                            <SelectItem value="TERMINATION">
                              قرار فصل / إنهاء خدمات
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {/* Severity & Title */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">
                      درجة الخطورة
                    </Label>
                    <Controller
                      name="severity"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-12 bg-background/50">
                            <SelectValue placeholder="اختر الشدة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minor">بسيطة (Low)</SelectItem>
                            <SelectItem value="medium">
                              متوسطة (Medium)
                            </SelectItem>
                            <SelectItem value="major">جسيمة (High)</SelectItem>
                            <SelectItem value="critical">
                              حرجة (Critical)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-base font-semibold">
                      عنوان المخالفة <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="مثال: الغياب المتكرر بدون عذر..."
                      className="h-12 bg-background/50"
                      {...register("title", { required: "العنوان مطلوب" })}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">
                        {errors.title.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    تفاصيل الواقعة <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="اشرح بوضوح ما حدث، متى، وأين..."
                    className="min-h-[120px] bg-background/50 resize-none leading-relaxed"
                    {...register("description", {
                      required: "التفاصيل مطلوبة",
                    })}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Action Taken */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    القرارات المتخذة (الجزاءات)
                  </Label>
                  <Textarea
                    placeholder="مثال: خصم يومين من الراتب، الحرمان من العلاوة..."
                    className="min-h-[80px] bg-background/50 resize-none"
                    {...register("actionTaken")}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end pt-6 border-t gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setShowPreview(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    معاينة قبل الحفظ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/hr/warnings")}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white min-w-[150px]"
                  >
                    {loading ? (
                      "جاري الحفظ..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-2" />
                        اعتماد المخالفة
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Selected Employee Card */}
          {selectedEmployee ? (
            <Card className="border-none shadow-lg bg-gradient-to-br from-muted to-background animate-in fade-in zoom-in duration-300">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                  ملف الموظف
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center p-6 space-y-4">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarFallback className="text-2xl">
                    {selectedEmployee.firstName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.position?.title || "موظف"}
                  </p>
                  {selectedEmployee.department?.name && (
                    <Badge variant="secondary" className="mt-2">
                      {selectedEmployee.department.name}
                    </Badge>
                  )}
                </div>
                <div className="w-full pt-4 border-t grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-background/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">
                      الرقم الوظيفي
                    </p>
                    <p className="font-semibold">
                      {selectedEmployee.employeeNumber || "-"}
                    </p>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">
                      تاريخ التعيين
                    </p>
                    <p className="font-semibold">
                      {selectedEmployee.hireDate
                        ? new Date(
                          selectedEmployee.hireDate,
                        ).toLocaleDateString("ar-EG")
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm bg-muted/30 border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                <User className="h-12 w-12 mb-3 opacity-20" />
                <p>اختر موظفاً لعرض ملفه المختصر هنا</p>
              </CardContent>
            </Card>
          )}

          {/* Guidelines Card */}
          <Card className="border-none shadow-md bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
            <CardHeader>
              <CardTitle className="text-base text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                سياسة التدرج في العقوبات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-blue-700/80 dark:text-blue-400/80">
              <div className="flex gap-2 items-start">
                <div className="h-5 w-5 rounded-full bg-blue-200 dark:bg-blue-800 flex flex-shrink-0 items-center justify-center text-[10px] font-bold mt-0.5">
                  1
                </div>
                <p>
                  <span className="font-semibold">تنبيه شفهي:</span> للمخالفات
                  البسيطة الأولى (مثل التأخير البسيط).
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="h-5 w-5 rounded-full bg-blue-200 dark:bg-blue-800 flex flex-shrink-0 items-center justify-center text-[10px] font-bold mt-0.5">
                  2
                </div>
                <p>
                  <span className="font-semibold">إنذار كتابي:</span> عند تكرار
                  المخالفة أو للمخالفات المتوسطة.
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="h-5 w-5 rounded-full bg-blue-200 dark:bg-blue-800 flex flex-shrink-0 items-center justify-center text-[10px] font-bold mt-0.5">
                  3
                </div>
                <p>
                  <span className="font-semibold">فصل / إنهاء:</span> للمخالفات
                  الجسيمة جداً أو استنفاد رصيد الإنذارات.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden" dir="rtl">
          {/* Header with Background Pattern */}
          <div className="relative h-32 bg-gradient-to-r from-red-600 to-rose-700 flex items-center px-8 overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

            <div className="flex items-center gap-5 relative z-10 w-full">
              <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-md shadow-inner ring-1 ring-white/30">
                <ShieldAlert className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <DialogTitle className="text-2xl font-black text-white break-words pr-2">
                  {watch("title") || "عنوان الإنذار"}
                </DialogTitle>
                <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                  <span className="bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">مسودة معاينة</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span>{watch("type")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar relative">
            {selectedEmployee && (
              <div className="flex items-center gap-4 p-5 bg-muted/30 rounded-[1.5rem] border border-muted ring-4 ring-muted/20">
                <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-800 shadow-md">
                  <AvatarFallback className="bg-primary text-white font-black">{selectedEmployee.firstName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white leading-none mb-1">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                    {selectedEmployee.position?.title || "موظف"} • {selectedEmployee.employeeNumber}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <FileText className="h-3.5 w-3.5" />
                وصف المخالفة المقترح
              </h4>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500/10 to-transparent rounded-3xl blur opacity-25" />
                <div className="relative bg-white dark:bg-gray-900/50 p-7 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200 text-lg font-medium">
                  {watch("description") || "سيتم عرض وصف المخالفة هنا..."}
                </div>
              </div>
            </div>

            {watch("actionTaken") && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Gavel className="h-3.5 w-3.5" />
                  الإجراء الإداري المتخذ
                </h4>
                <div className="bg-amber-500/5 dark:bg-amber-500/10 p-6 rounded-[1.5rem] border border-amber-500/10 shadow-sm border-dashed">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words text-md leading-relaxed">
                    {watch("actionTaken")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-dashed border-muted font-bold text-xs text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-full">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>تاريخ الواقعة: {watch("incidentDate")}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-full ring-1 ring-primary/10">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>درجة الشدة: {watch("severity")}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-muted/20 border-t border-muted/30 flex justify-end">
            <Button
              onClick={() => setShowPreview(false)}
              className="rounded-xl px-10 h-12 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              فهمت، العودة للتعديل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateWarning;
