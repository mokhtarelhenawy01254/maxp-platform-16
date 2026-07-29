import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Save,
  ArrowRight,
  AlertCircle,
  BookOpen,
  User,
  Calendar,
  Lightbulb,
  DollarSign,
  Clock,
  Award,
  FileText,
  CheckCircle2,
  Layout as LayoutIcon,
  Trash2,
} from "lucide-react";
import api from "../../services/api";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

// Types
type TrainingFormData = {
  employeeId: string;
  trainingName: string;
  provider: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  cost: string;
  duration: string;
  score: string;
  description: string;
};

const CreateTraining = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TrainingFormData>({
    defaultValues: {
      employeeId: "",
      trainingName: "",
      provider: "",
      type: "technical",
      cost: "",
      duration: "",
      score: "",
      status: "PLANNED",
      description: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employees for the dropdown
        const empRes = await api.get("/hr/employees");
        setEmployees(empRes.data.employees || []);

        // If editing, fetch the training record
        if (isEdit) {
          setFetching(true);
          const trainingRes = await api.get(`/hr/trainings/${id}`);
          const training = trainingRes.data.training;

          if (training) {
            reset({
              employeeId: training.userId || training.employeeId,
              trainingName: training.trainingName,
              provider: training.provider || "",
              type: training.type || "technical",
              startDate: training.startDate
                ? new Date(training.startDate).toISOString().split("T")[0]
                : "",
              endDate: training.endDate
                ? new Date(training.endDate).toISOString().split("T")[0]
                : "",
              status: training.status,
              cost: training.cost?.toString() || "",
              duration: training.duration?.toString() || "",
              score: training.score?.toString() || "",
              description: training.description || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        tToast.error("hr_CreateTraining.failed_load_7dfb");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, isEdit, reset]);

  const onSubmit = async (data: TrainingFormData) => {
    try {
      setLoading(true);

      if (!data.employeeId || data.employeeId.trim() === "") {
        tToast.error("hr_CreateTraining.msg_e5a0");
        return;
      }

      const payload = {
        ...data,
        employeeId: data.employeeId, // Backend expects employeeId (which is userId in service)
        cost: data.cost ? Number(data.cost) : 0,
        duration: data.duration ? Number(data.duration) : 0,
        score: data.score ? Number(data.score) : null,
      };

      if (isEdit) {
        await api.put(`/hr/trainings/${id}`, payload);
        tToast.success("hr_CreateTraining.success_update_d670");
      } else {
        await api.post("/hr/trainings", payload);
        tToast.success("hr_CreateTraining.success_add_818b");
      }

      navigate("/hr/training");
    } catch (error: any) {
      console.error("Error saving training:", error);
      toast.error(error.response?.data?.error || "فشل في حفظ بيانات التدريب");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل التدريبي؟")) return;

    try {
      setLoading(true);
      await api.delete(`/hr/trainings/${id}`);
      tToast.success("hr_CreateTraining.success_delete_b773");
      navigate("/hr/training");
    } catch (error: any) {
      console.error("Error deleting training:", error);
      toast.error(error.response?.data?.error || "فشل في حذف سجل التدريب");
    } finally {
      setLoading(false);
    }
  };

  const trainingTypes = [
    { value: "technical", label: "تقني / فني" },
    { value: "soft-skills", label: "مهارات ناعمة / تواصل" },
    { value: "management", label: "إداري / قيادي" },
    { value: "safety", label: "صحة وسلامة مهنية" },
    { value: "language", label: "لغات" },

    { value: "compliance", label: "امتثال وقوانين" },
    { value: "other", label: "أخرى" },
  ];

  const statusOptions = [
    {
      value: "PLANNED",
      label: "مخطط",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    {
      value: "ONGOING",
      label: "قيد التنفيذ",
      color: "bg-amber-100 text-amber-700 border-amber-200",
    },
    {
      value: "COMPLETED",
      label: "مكتمل",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      value: "CANCELLED",
      label: "ملغي",
      color: "bg-rose-100 text-rose-700 border-rose-200",
    },
  ];

  return (
    <div
      className="hr-theme min-h-screen p-4 md:p-8 w-full space-y-8"
      dir="rtl"
    >
      {/* Elegant Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/hr/training")}
            className="rounded-full bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
          >
            <ArrowRight className="h-5 w-5 text-purple-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-600">
              إضافة سجل تدريبي
            </h1>
            <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
              <BookOpen className="h-4 w-4 text-purple-400" />
              توثيق الدورات التدريبية والتطويرية للموظفين
            </p>
          </div>
        </div>

      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Main Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl ring-1 ring-purple-100/50">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-purple-800">
                  <User className="h-5 w-5" />
                  الموظف والبرنامج
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      الموظف <span className="text-rose-500">*</span>
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
                          <SelectTrigger className="h-12 border-purple-100 focus:ring-purple-200 rounded-xl bg-gray-50/30">
                            <SelectValue placeholder="اختر الموظف المستهدف" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {employees.length === 0 ? (
                              <SelectItem value="no-employees" disabled>
                                لا يوجد موظفين حالياً
                              </SelectItem>
                            ) : (
                              employees.map((emp) => (
                                <SelectItem
                                  key={emp.id}
                                  value={emp.id}
                                  className="py-3"
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-gray-900">
                                      {emp.firstName} {emp.lastName}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      #{emp.employeeNumber} |{" "}
                                      {emp.position?.title || "موظف"}
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
                      <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />{" "}
                        {errors.employeeId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      اسم البرنامج <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="مثال: تحليل البيانات باستخدام Excel"
                      className="h-12 border-purple-100 focus:ring-purple-200 rounded-xl"
                      {...register("trainingName", {
                        required: "اسم البرنامج مطلوب",
                      })}
                    />
                    {errors.trainingName && (
                      <p className="text-xs font-bold text-rose-500 mt-1">
                        {errors.trainingName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">نوع التدريب</Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-12 border-purple-100 rounded-xl bg-gray-50/30">
                            <SelectValue placeholder="اختر تصنيف البرنامج" />
                          </SelectTrigger>
                          <SelectContent>
                            {trainingTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Award className="w-32 h-32" />
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-yellow-300" />
                </div>
                <h3 className="text-xl font-black">نصيحة التدريب</h3>
                <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                  احرص على رفع شهادة التدريب في قسم المستندات بعد انتهاء
                  البرنامج لتوثيق السجل المهني للموظف.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Section: Schedule & Details */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-xl ring-1 ring-purple-100/50">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-800">
                  <Clock className="h-5 w-5" />
                  التوقيت والحالة
                </h3>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold flex items-center gap-2">
                        تاريخ البدء <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          className="h-12 pr-10 border-purple-50 focus:ring-purple-200 rounded-xl"
                          {...register("startDate", {
                            required: "تاريخ البدء مطلوب",
                          })}
                        />
                      </div>
                      {errors.startDate && (
                        <p className="text-xs font-bold text-rose-500 mt-1">
                          {errors.startDate.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">
                        تاريخ الانتهاء المتوقع
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          className="h-12 pr-10 border-purple-50 focus:ring-purple-200 rounded-xl"
                          {...register("endDate")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold">حالة التدريب</Label>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-2 gap-2">
                            {statusOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${field.value === opt.value
                                  ? `${opt.color} shadow-sm ring-2 ring-offset-1 ring-purple-100`
                                  : "bg-white text-gray-500 border-gray-100 hover:border-purple-200"
                                  }`}
                              >
                                {field.value === opt.value && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-400" />
                          المدة (ساعة)
                        </Label>
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-12 border-purple-50 focus:ring-purple-200 rounded-xl"
                          {...register("duration")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold flex items-center gap-2">
                          <Save className="h-4 w-4 text-purple-400" />
                          الجهة المنظمة
                        </Label>
                        <Input
                          placeholder="مركز التدريب..."
                          className="h-12 border-purple-50 focus:ring-purple-200 rounded-xl"
                          {...register("provider")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl ring-1 ring-purple-100/50">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-lg font-bold flex items-center gap-2 text-purple-800">
                  <DollarSign className="h-5 w-5" />
                  الاستثمار والنتائج
                </h3>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      تكلفة البرنامج التدريبي
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                        EGP
                      </span>
                      <Input
                        id="cost"
                        type="number"
                        placeholder="0.00"
                        className="h-14 pl-12 text-lg font-bold border-purple-50 focus:ring-purple-200 rounded-xl bg-gray-50/20"
                        {...register("cost")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      الدرجة أو النتيجة النهائية
                    </Label>
                    <div className="relative">
                      <Award className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                      <Input
                        id="score"
                        type="number"
                        max="100"
                        placeholder="الدرجة من 100"
                        className="h-14 pr-12 text-lg font-bold border-purple-50 focus:ring-purple-200 rounded-xl bg-gray-50/20"
                        {...register("score")}
                      />
                    </div>
                  </div>

                  <div className="col-span-full space-y-2">
                    <Label className="font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      وصف البرنامج وملاحظات إضافية
                    </Label>
                    <Textarea
                      placeholder="اكتب هنا تفاصيل المنهج التدريبي أو أي تقييم إضافي لأداء الموظف خلال التدريب..."
                      className="min-h-[120px] border-purple-50 focus:ring-purple-200 rounded-xl resize-none p-4"
                      {...register("description")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desktop & Mobile Actions at the bottom */}
            <div className="flex flex-col md:flex-row items-center justify-end gap-4 py-8 mt-4 border-t border-purple-100/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/hr/training")}
                className="w-full md:w-auto font-bold text-gray-500 hover:bg-gray-100 rounded-xl px-8 h-12"
              >
                إلغاء التغييرات
              </Button>

              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full md:w-auto font-bold text-rose-600 border-rose-100 hover:bg-rose-50 rounded-xl px-8 h-12"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف السجل نهائياً
                </Button>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black px-12 rounded-xl shadow-xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                    جاري الحفظ...
                  </div>
                ) : (
                  <>
                    <Save className="h-5 w-5 ml-2" />
                    حفظ السجل التدريبي
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateTraining;
