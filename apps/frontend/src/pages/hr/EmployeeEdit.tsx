import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Save, ArrowRight, User, Shield, DollarSign } from 'lucide-react';
import api from "../../services/api";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type EmployeeFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNumber: string;
  departmentId: string;
  positionId: string;
  hireDate: string;
  contractType: string;
  baseSalary: number;
};

const EmployeeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<EmployeeFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      employeeNumber: "",
      departmentId: "",
      positionId: "",
      hireDate: "",
      contractType: "FULL_TIME",
      baseSalary: 0,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // جلب بيانات الموظف
        const empRes = await api.get(`/hr/employees/${id}`);
        const employee = empRes.data.employee || empRes.data;

        // جلب الأقسام
        const deptRes = await api.get("/hr/departments");
        setDepartments(deptRes.data.departments || []);

        // جلب المناصب
        const posRes = await api.get("/hr/positions");
        setPositions(posRes.data.positions || posRes.data || []);

        // تعبئة النموذج
        reset({
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          email: employee.email || "",
          phone: employee.phone || "",
          employeeNumber: employee.employeeNumber || "",
          departmentId: employee.departmentId || employee.department?.id || "",
          positionId: employee.positionId || employee.position?.id || "",
          hireDate: employee.hireDate
            ? new Date(employee.hireDate).toISOString().split("T")[0]
            : "",
          contractType: employee.contractType || "FULL_TIME",
          baseSalary: employee.baseSalary ? Number(employee.baseSalary) : 0,
        });
      } catch (error: any) {
        console.error("❌ Error fetching employee data:", error);
        toast.error("فشل في تحميل بيانات الموظف");
        navigate("/hr/employees");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, navigate, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setSaving(true);

      // تنظيف البيانات
      const payload = {
        ...data,
        baseSalary: Number(data.baseSalary),
      };

      console.log("🔍 [EMPLOYEE-UPDATE] Submitting employee update:", {
        employeeId: id,
        payload: payload,
        originalSalary: data.baseSalary,
        convertedSalary: Number(data.baseSalary),
      });

      const response = await api.put(`/hr/employees/${id}`, payload);

      console.log("✅ [EMPLOYEE-UPDATE] Update successful:", {
        status: response.status,
        data: response.data,
      });

      toast.success("تم تحديث بيانات الموظف بنجاح");
      navigate(`/hr/employees/${id}`);
    } catch (error: any) {
      console.error("❌ [EMPLOYEE-UPDATE] Error updating employee:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        employeeId: id,
      });
      const errorMessage =
        error.response?.data?.error || "فشل في تحديث بيانات الموظف";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8 text-blue-500" />
              تعديل بيانات الموظف
            </h1>
            <p className="text-gray-500 mt-1">
              تحديث ملف الموظف والإعدادات الخاصة به
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  المعلومات الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم الأول *</Label>
                    <Input
                      {...register("firstName", {
                        required: "الاسم الأول مطلوب",
                      })}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الأخير *</Label>
                    <Input
                      {...register("lastName", {
                        required: "الاسم الأخير مطلوب",
                      })}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" {...register("email")} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input {...register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الموظف</Label>
                    <Input {...register("employeeNumber")} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ التعيين</Label>
                    <Input type="date" {...register("hireDate")} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-400" />
                  الوظيفة والراتب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>القسم</Label>
                    <Controller
                      name="departmentId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر القسم" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المنصب</Label>
                    <Controller
                      name="positionId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المنصب" />
                          </SelectTrigger>
                          <SelectContent>
                            {positions.map((pos) => (
                              <SelectItem key={pos.id} value={pos.id}>
                                {pos.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع العقد</Label>
                    <Controller
                      name="contractType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FULL_TIME">دوام كامل</SelectItem>
                            <SelectItem value="PART_TIME">دوام جزئي</SelectItem>
                            <SelectItem value="CONTRACT">عقد</SelectItem>
                            <SelectItem value="TEMPORARY">مؤقت</SelectItem>
                            <SelectItem value="INTERNSHIP">تدريب</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الراتب الأساسي</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...register("baseSalary")}
                        className="pl-10"
                      />
                      <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">إجراءات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    size="lg"
                    className="w-full"
                  >
                    {saving ? (
                      "جاري الحفظ..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-2" />
                        حفظ جميع التغييرات
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="w-full"
                  >
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeEdit;
