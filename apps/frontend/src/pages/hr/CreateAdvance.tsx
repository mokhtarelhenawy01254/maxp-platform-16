import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowRight,
  DollarSign,
  Calendar,
  Wallet,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface AdvanceFormData {
  employeeId: string;
  amount: string;
  reason: string;
  repaymentType: string;
  installmentsCount: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  position?: { title: string } | null;
  hasEmployeeRecord?: boolean;
}

export const CreateAdvance: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdvanceFormData>({
    defaultValues: {
      employeeId: "",
      amount: "",
      reason: "",
      repaymentType: "ONE_TIME",
      installmentsCount: 1,
    },
  });

  const repaymentType = watch("repaymentType");

  useEffect(() => {
    register("employeeId", { required: true });
  }, [register]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empResponse, settingsResponse] = await Promise.all([
          api.get("/hr/employees?limit=1000"),
          api.get("/hr/settings").catch(() => ({ data: { settings: null } })),
        ]);
        setEmployees(empResponse.data?.employees || empResponse.data?.data || []);
        if (settingsResponse?.data?.settings) {
          setSettings(settingsResponse.data.settings);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        tToast.error("CreateAdvance.error_error_3c32");
      }
    };
    loadData();
  }, []);

  const onSubmit = async (data: AdvanceFormData) => {
    try {
      setLoading(true);
      await api.post("/hr/advances", {
        ...data,
        amount: parseFloat(data.amount),
        installmentsCount:
          data.repaymentType === "INSTALLMENTS" ? data.installmentsCount : 1,
      });

      tToast.success("CreateAdvance.success_create_6559");
      navigate("/hr/advances");
    } catch (error: any) {
      console.error("Error creating advance:", error);
      toast.error(error.response?.data?.error || "حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setLoading(false);
    }
  };

  const maxMonths = settings?.advanceRepaymentMonths || 12;

  const validEmployees = employees.filter((emp) => emp.hasEmployeeRecord !== false);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background" dir="rtl">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/hr/advances")}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع لقائمة السلف"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
              طلب سلفة ماليّة جديد
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              تسجيل طلب سلفة لموظف وتحديد خطة السداد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/hr/advances")}
            className="px-3 py-1 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "جاري الإنشاء..." : "إنشاء طلب السلفة"}</span>
          </button>
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-4">
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5 rounded-md border border-border/70 bg-card space-y-4">
            
            {/* Employee Selection */}
            <div className="space-y-1.5">
              <label htmlFor="employee-select" className="text-xs font-semibold text-foreground">
                الموظف المستفيد *
              </label>
              <select
                id="employee-select"
                onChange={(e) => setValue("employeeId", e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                  errors.employeeId ? "border-destructive text-destructive" : "border-border/80"
                }`}
              >
                <option value="">اختر الموظف...</option>
                {validEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} {employee.position?.title ? `(${employee.position.title})` : ""}
                  </option>
                ))}
              </select>
              {errors.employeeId && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>يرجى اختيار الموظف</span>
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="advance-amount" className="text-xs font-semibold text-foreground">
                  مبلغ السلفة (ج.م) *
                </label>
                {settings?.maxAdvancePercentage && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    الحد الأقصى للنظام: {settings.maxAdvancePercentage}% من الراتب
                  </span>
                )}
              </div>
              <div className="relative">
                <DollarSign className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <input
                  id="advance-amount"
                  type="number"
                  step="0.01"
                  placeholder="مثال: 3000"
                  {...register("amount", { required: true, min: 1 })}
                  className={`w-full ps-8 pe-3 py-1.5 text-xs font-mono rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                    errors.amount ? "border-destructive" : "border-border/80"
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-[10px] text-destructive">يرجى إدخال مبلغ صحيح أكبر من الصفر</p>
              )}
            </div>

            {/* Repayment Type */}
            <div className="space-y-1.5">
              <label htmlFor="repayment-type" className="text-xs font-semibold text-foreground">
                نوع السداد *
              </label>
              <select
                id="repayment-type"
                defaultValue="ONE_TIME"
                {...register("repaymentType")}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="ONE_TIME">دفعة واحدة (خصم كامل من راتب الشهر القادم)</option>
                <option value="INSTALLMENTS">تقسيط شهري على عدة أشهر</option>
              </select>
            </div>

            {/* Installments Count (if INSTALLMENTS) */}
            {repaymentType === "INSTALLMENTS" && (
              <div className="space-y-1.5 p-3 rounded-md border border-border/60 bg-muted/20">
                <label htmlFor="installments-count" className="text-xs font-semibold text-foreground">
                  عدد الأقساط الشهرية *
                </label>
                <input
                  id="installments-count"
                  type="number"
                  min="2"
                  max={maxMonths}
                  placeholder={`بحد أقصى ${maxMonths} شهر`}
                  {...register("installmentsCount", {
                    required: repaymentType === "INSTALLMENTS",
                    min: 2,
                    max: maxMonths,
                  })}
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                    errors.installmentsCount ? "border-destructive" : "border-border/80"
                  }`}
                />
                <p className="text-[10px] text-muted-foreground">
                  الحد المسموح به: من شهرين وحتى {maxMonths} شهر
                </p>
                {errors.installmentsCount && (
                  <p className="text-[10px] text-destructive">
                    يرجى إدخال عدد أقساط بين 2 و {maxMonths}
                  </p>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <label htmlFor="advance-reason" className="text-xs font-semibold text-foreground">
                سبب طلب السلفة (اختياري)
              </label>
              <textarea
                id="advance-reason"
                placeholder="اكتب ملاحظات أو سبب طلب السلفة..."
                rows={3}
                {...register("reason")}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

          </form>

        </div>
      </main>
    </div>
  );
};

export default CreateAdvance;
