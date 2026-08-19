import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Briefcase, Calendar, CheckCircle2, DollarSign, Folder, Save, TrendingUp, User as UserIcon } from 'lucide-react';
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
};

const CreatePromotion: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

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
      promotionDate: new Date().toISOString().split("T")[0],
      effectiveDate: new Date().toISOString().split("T")[0],
      reason: "",
      notes: "",
    },
  });

  const watchedEmployeeId = watch("employeeId");
  const watchedToSalary = watch("toSalary");
  const watchedFromSalary = watch("fromSalary");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Employees
        const empRes = await api.get("/hr/employees");
        setEmployees(empRes.data.employees || []);

        // Fetch Positions
        try {
          const posRes = await api.get("/hr/positions");
          setPositions(posRes.data.positions || []);
        } catch (e) {
          console.warn("Could not fetch positions", e);
        }
      } catch (error: any) {
        console.error("❌ Error fetching data:", error);
        toast.error("فشل في تحميل بيانات الموظفين");
      }
    };
    fetchData();
  }, []);

  // Update selected employee details when employeeId changes
  useEffect(() => {
    if (watchedEmployeeId && employees.length > 0) {
      const emp = employees.find((e) => e.id === watchedEmployeeId);
      setSelectedEmployee(emp || null);

      if (emp) {
        // Pre-fill From Position & Salary
        console.log("Selected Employee:", emp);
        setValue("fromPositionName", emp.position?.title || "");
        setValue("fromPositionId", emp.position?.id || "none");
        setValue(
          "fromSalary",
          emp.baseSalary ? Number(emp.baseSalary) : undefined,
        );
      }
    } else {
      setSelectedEmployee(null);
    }
  }, [watchedEmployeeId, employees, setValue]);

  const calculateIncrease = () => {
    if (!watchedFromSalary || !watchedToSalary) return null;
    const diff = Number(watchedToSalary) - Number(watchedFromSalary);
    const percent = (diff / Number(watchedFromSalary)) * 100;
    return { diff, percent };
  };

  const increaseStats = calculateIncrease();

  const onSubmit = async (data: PromotionFormData) => {
    try {
      setLoading(true);

      if (!data.employeeId) {
        toast.error("يجب اختيار الموظف");
        setLoading(false);
        return;
      }

      if (!data.toPositionName) {
        toast.error("يجب كتابة المنصب الجديد");
        setLoading(false);
        return;
      }

      // Check if position names are same
      if (
        data.fromPositionName &&
        data.toPositionName &&
        data.fromPositionName.trim().toLowerCase() ===
          data.toPositionName.trim().toLowerCase()
      ) {
        toast.error("المنصب الجديد يجب أن يكون مختلفاً عن المنصب السابق");
        setLoading(false);
        return;
      }

      // Create payload
      const payload = {
        ...data,
        // Ensure numbers
        fromSalary: data.fromSalary ? Number(data.fromSalary) : undefined,
        toSalary: data.toSalary ? Number(data.toSalary) : undefined,
      };

      await api.post("/hr/promotions", payload);
      toast.success("تم إنشاء الترقية بنجاح");
      navigate("/hr/promotions");
    } catch (error: any) {
      console.error("❌ Error creating promotion:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "فشل في إنشاء الترقية";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
              <TrendingUp className="h-8 w-8 text-green-600" />
              ترقية جديدة
            </h1>
            <p className="text-gray-500 mt-1">تسجيل حركة وظيفية جديدة لموظف</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right Column: Employee Card & Summary */}
        <div className="space-y-6">
          <Card className="border-t-4 border-t-green-500 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle>الموظف المعني</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    اختر الموظف <span className="text-red-500">*</span>
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
                  {errors.employeeId && (
                    <p className="text-xs text-red-500">
                      {errors.employeeId.message}
                    </p>
                  )}
                </div>

                {selectedEmployee && (
                  <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 mt-4 border border-gray-100 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                      <AvatarImage src={selectedEmployee.avatar} />
                      <AvatarFallback className="bg-green-100 text-green-600 text-xl font-bold">
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
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
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
                        // Consider making read-only if we just want to show it
                        // readOnly
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
                    <div className="bg-green-100 p-2 rounded-full text-green-600">
                      <ArrowLeft className="h-6 w-6" />
                    </div>
                  </div>

                  {/* To */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-green-600 text-xs uppercase tracking-wide font-bold">
                        المنصب الجديد
                      </Label>
                      <Input
                        {...register("toPositionName", {
                          required: "المنصب الجديد مطلوب",
                        })}
                        placeholder="اسم المنصب الجديد"
                        className="bg-green-50/50 border-green-200 focus-visible:ring-green-400 font-medium text-green-900"
                      />
                      {errors.toPositionName && (
                        <p className="text-xs text-red-500">
                          {errors.toPositionName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 relative">
                      <Label className="text-green-600 text-xs uppercase tracking-wide font-bold">
                        الراتب الجديد
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                        <Input
                          type="number"
                          {...register("toSalary", { valueAsNumber: true })}
                          placeholder="0.00"
                          className="pr-9 bg-green-50/50 border-green-200 text-green-900 font-bold"
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
                disabled={loading}
              >
                {loading ? (
                  "جاري الحفظ..."
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    حفظ الترقية
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

export default CreatePromotion;
