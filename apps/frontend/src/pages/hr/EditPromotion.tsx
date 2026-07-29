import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Save,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Briefcase,
  Calendar,
  DollarSign,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

// Types
type PromotionFormData = {
  employeeId: string;
  fromPositionId?: string;
  fromPositionName?: string;
  toPositionId: string;
  toPositionName?: string;
  fromSalary?: number;
  toSalary?: number;
  promotionDate: string;
  effectiveDate: string;
  reason: string;
  notes?: string;
  status: string;
};

const EditPromotion: React.FC = () => {
  console.log("🚀 [DEBUG] EditPromotion component rendering");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]); // We might want to pick from existing positions
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [promotion, setPromotion] = useState<any>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromotionFormData>({
    defaultValues: {
      employeeId: "",
      fromPositionId: "none",
      fromPositionName: "",
      toPositionId: "",
      toPositionName: "",
      fromSalary: undefined,
      toSalary: undefined,
      promotionDate: "",
      effectiveDate: "",
      reason: "",
      notes: "",
      status: "PENDING",
    },
  });

  const watchedEmployeeId = watch("employeeId");
  const watchedToSalary = watch("toSalary");
  const watchedFromSalary = watch("fromSalary");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      console.log("🚀 [DEBUG] EditPromotion fetchData starting for ID:", id);
      try {
        setLoading(true);

        // Fetch Employees
        const empRes = await api.get("/hr/employees");
        const employeesData =
          empRes.data.employees ||
          empRes.data.data ||
          (Array.isArray(empRes.data) ? empRes.data : []);
        setEmployees(employeesData);

        // Fetch Promotion
        const promoRes = await api.get(`/hr/promotions/${id}`);
        const promotionData = promoRes.data.promotion || promoRes.data;

        console.log("📊 [EDIT-PROMOTION] Data:", promotionData);

        if (!promotionData || typeof promotionData !== "object") {
          throw new Error("بيانات الترقية غير صالحة");
        }

        setPromotion(promotionData);

        // Initialize form values
        setValue(
          "employeeId",
          promotionData.userId || promotionData.employeeId || "",
        );
        setValue("fromPositionId", promotionData.fromPositionId || "none");
        setValue("toPositionId", promotionData.toPositionId || "");
        setValue("fromPositionName", promotionData.fromPositionName || "");
        setValue("toPositionName", promotionData.toPositionName || "");
        setValue(
          "fromSalary",
          promotionData.fromSalary != null
            ? Number(promotionData.fromSalary)
            : undefined,
        );
        setValue(
          "toSalary",
          promotionData.toSalary != null
            ? Number(promotionData.toSalary)
            : undefined,
        );
        setValue(
          "promotionDate",
          promotionData.promotionDate
            ? String(promotionData.promotionDate).split("T")[0]
            : "",
        );
        setValue(
          "effectiveDate",
          promotionData.effectiveDate
            ? String(promotionData.effectiveDate).split("T")[0]
            : "",
        );
        setValue("reason", promotionData.reason || "");
        setValue("notes", promotionData.notes || "");
        setValue("status", promotionData.status || "PENDING"); // Ensure status is set

        // Get initial position names if hidden
        if (promotionData.fromPositionId && employeesData.length > 0) {
          // Find employee to get their current position if needed
          const emp = employeesData.find(
            (e: any) =>
              e.id === (promotionData.userId || promotionData.employeeId),
          );
          if (emp) {
            setSelectedEmployee(emp);
          }
        }

        // Fetch Positions (Optional, for autocomplete)
        try {
          const posRes = await api.get("/hr/positions");
          setPositions(posRes.data.positions || []);
        } catch (e) {
          console.warn("Could not fetch positions", e);
        }
      } catch (error: any) {
        console.error("❌ [EDIT-PROMOTION] Error fetching:", error);
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "فشل في تحميل بيانات الترقية";
        toast.error(errorMessage);
        // navigate('/hr/promotions'); // Optional: redirect on error
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, setValue]);

  // Update selected employee details when employeeId changes
  useEffect(() => {
    if (watchedEmployeeId && employees.length > 0) {
      const emp = employees.find((e) => e.id === watchedEmployeeId);
      setSelectedEmployee(emp || null);

      // NOTE: We only auto-fill FROM details if it's a NEW selection or first load logic handled elsewhere.
      // But since this is EDIT, we should be careful not to overwrite what's in the DB unless the user explicitely changes the employee.
      // In this case, if the user changes the employee ID from the original one, we might want to update the "From" fields.
      // But usually, you don't change the employee on an edit page. You delete and create new.
      // However, we allow it.

      if (promotion && watchedEmployeeId !== promotion.userId) {
        // User changed the employee, so let's pre-fill from current data
        if (emp) {
          setValue("fromPositionName", emp.position?.title || "");
          setValue("fromPositionId", emp.position?.id || "none");
          setValue(
            "fromSalary",
            emp.baseSalary ? Number(emp.baseSalary) : undefined,
          );
        }
      }
    }
  }, [watchedEmployeeId, employees, promotion, setValue]);

  const calculateIncrease = () => {
    if (!watchedFromSalary || !watchedToSalary) return null;
    const diff = Number(watchedToSalary) - Number(watchedFromSalary);
    const percent = (diff / Number(watchedFromSalary)) * 100;
    return { diff, percent };
  };

  const increaseStats = calculateIncrease();

  const onSubmit = async (data: PromotionFormData) => {
    try {
      setSaving(true);

      if (!data.employeeId) {
        tToast.error("EditPromotion.msg_0242");
        return;
      }

      if (!data.toPositionName) {
        tToast.error("EditPromotion.msg_d62b");
        return;
      }

      // Create payload
      const payload = {
        ...data,
        // Ensure numbers and handle 0 correctly
        fromSalary:
          data.fromSalary !== undefined && data.fromSalary !== null
            ? Number(data.fromSalary)
            : undefined,
        toSalary:
          data.toSalary !== undefined && data.toSalary !== null
            ? Number(data.toSalary)
            : undefined,
      };

      console.log(
        "🚀 [EDIT-PROMOTION] Submitting payload:",
        JSON.stringify(payload, null, 2),
      );
      const response = await api.put(`/hr/promotions/${id}`, payload);
      console.log("✅ [EDIT-PROMOTION] Success response:", response.data);
      tToast.success("EditPromotion.success_update_a27f");
      navigate("/hr/promotions");
    } catch (error: any) {
      console.error("❌ Error updating promotion:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "فشل في تحديث الترقية";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-700">الترقية غير موجودة</h2>
        <Button onClick={() => navigate("/hr/promotions")} className="mt-4">
          العودة للقائمة
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-6xl 2xl:max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hr/promotions")}
            className="rounded-full hover:bg-gray-100"
          >
            <ArrowRight className="h-6 w-6 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              تعديل ترقية
            </h1>
            <p className="text-gray-500 mt-1">
              تحديث بيانات الترقية وتعديل الحالة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={
              promotion.status === "APPROVED"
                ? "default"
                : promotion.status === "REJECTED"
                  ? "destructive"
                  : "secondary"
            }
            className="text-lg px-4 py-1"
          >
            {promotion.status === "APPROVED"
              ? "تمت الموافقة"
              : promotion.status === "REJECTED"
                ? "مرفوضة"
                : "قيد المراجعة"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right Column: Employee Card & Summary */}
        <div className="space-y-6">
          <Card className="border-t-4 border-t-blue-500 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle>الموظف المعني</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اختر الموظف</Label>
                  <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموظف" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {selectedEmployee && (
                  <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 mt-4 border border-gray-100">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                      <AvatarImage src={selectedEmployee.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                        {selectedEmployee.firstName?.[0]}
                        {selectedEmployee.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedEmployee.employeeNumber}
                      </p>
                      <Badge variant="outline" className="mt-1 bg-white">
                        {selectedEmployee.position?.title || "بدون منصب"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {increaseStats && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <h3 className="text-green-800 font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  تحليل الراتب
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الزيادة المقترحة:</span>
                    <span className="font-bold text-green-700 dir-ltr">
                      +{increaseStats.diff.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">نسبة الزيادة:</span>
                    <span className="font-bold text-green-700 dir-ltr">
                      {increaseStats.percent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Left Column: Promotion Details */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="shadow-md overflow-hidden">
              <div className="bg-gray-50/50 p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                  <Briefcase className="h-5 w-5 text-gray-500" />
                  تفاصيل الحركة الوظيفية
                </h2>
              </div>

              <CardContent className="p-6 space-y-8">
                {/* Movement Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-slate-50 p-6 rounded-xl border border-slate-100">
                  {/* From */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-500 text-xs uppercase tracking-wide">
                        المنصب الحالي
                      </Label>
                      <Input
                        {...register("fromPositionName")}
                        placeholder="اسم المنصب الحالي"
                        className="bg-white border-slate-200 focus-visible:ring-slate-400 font-medium"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <Label className="text-gray-500 text-xs uppercase tracking-wide">
                        الراتب الحالي
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          {...register("fromSalary", { valueAsNumber: true })}
                          placeholder="0.00"
                          className="pr-9 bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="md:col-span-1 flex justify-center py-4 md:py-0">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                      <ArrowLeft className="h-6 w-6" />
                    </div>
                  </div>

                  {/* To */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-blue-600 text-xs uppercase tracking-wide font-bold">
                        المنصب الجديد
                      </Label>
                      <Input
                        {...register("toPositionName", {
                          required: "المنصب الجديد مطلوب",
                        })}
                        placeholder="اسم المنصب الجديد"
                        className="bg-blue-50/50 border-blue-200 focus-visible:ring-blue-400 font-medium text-blue-900"
                      />
                      {errors.toPositionName && (
                        <p className="text-xs text-red-500">
                          {errors.toPositionName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 relative">
                      <Label className="text-blue-600 text-xs uppercase tracking-wide font-bold">
                        الراتب الجديد
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-2.5 h-4 w-4 text-blue-500" />
                        <Input
                          type="number"
                          {...register("toSalary", { valueAsNumber: true })}
                          placeholder="0.00"
                          className="pr-9 bg-blue-50/50 border-blue-200 text-blue-900 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dates & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      تاريخ الترقية
                    </Label>
                    <Input
                      type="date"
                      {...register("promotionDate", { required: "مطلوب" })}
                    />
                    {errors.promotionDate && (
                      <p className="text-xs text-red-500">
                        {errors.promotionDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      تاريخ السريان
                    </Label>
                    <Input
                      type="date"
                      {...register("effectiveDate", { required: "مطلوب" })}
                    />
                    {errors.effectiveDate && (
                      <p className="text-xs text-red-500">
                        {errors.effectiveDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>حالة الطلب</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="حالة الطلب" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">
                              معلق (قيد المراجعة)
                            </SelectItem>
                            <SelectItem value="APPROVED">موافق عليه</SelectItem>
                            <SelectItem value="REJECTED">مرفوض</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>سبب الترقية / المبررات</Label>
                  <Textarea
                    {...register("reason", { required: "مطلوب" })}
                    className="min-h-[100px]"
                    placeholder="اشرح أسباب الترقية بالتفصيل..."
                  />
                  {errors.reason && (
                    <p className="text-xs text-red-500">
                      {errors.reason.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات إضافية</Label>
                  <Textarea
                    {...register("notes")}
                    className="min-h-[80px]"
                    placeholder="أي ملاحظات أخرى..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/hr/promotions")}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="lg"
                className="min-w-[150px]"
                disabled={saving}
              >
                {saving ? (
                  "جاري الحفظ..."
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    حفظ التعديلات
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPromotion;
