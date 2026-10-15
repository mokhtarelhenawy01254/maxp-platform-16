import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Save,
  ArrowRight,
  FileX,
  Calculator,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import api from "../../services/api";

type ResignationFormData = {
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  exitInterview: string;
};

const CreateResignation: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [noticePeriod, setNoticePeriod] = useState(30);
  const [expectedDate, setExpectedDate] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResignationFormData>({
    defaultValues: {
      employeeId: "",
      resignationDate: new Date().toISOString().split("T")[0],
      lastWorkingDay: "",
      reason: "",
      exitInterview: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, settingsRes] = await Promise.all([
          api.get("/hr/employees"),
          api.get("/hr/settings"),
        ]);

        const empList = empRes.data?.employees || empRes.data?.data || [];
        setEmployees(Array.isArray(empList) ? empList : []);

        if (settingsRes.data?.settings?.noticePeriodDays) {
          setNoticePeriod(settingsRes.data.settings.noticePeriodDays);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        tToast.error("CreateResignation.failed_load_4801");
      }
    };
    fetchData();
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      const expected = new Date(date);
      expected.setDate(date.getDate() + noticePeriod);
      setExpectedDate(expected.toISOString().split("T")[0]);
    }
  };

  const onSubmit = async (data: ResignationFormData) => {
    try {
      setLoading(true);
      if (!data.employeeId || data.employeeId.trim() === "") {
        tToast.error("CreateResignation.msg_640c");
        return;
      }

      await api.post("/hr/resignations", data);
      tToast.success("CreateResignation.success_login_7609");
      navigate("/hr/resignations");
    } catch (error: any) {
      console.error("Error creating resignation:", error);
      toast.error(error.response?.data?.error || "فشل في تسجيل الاستقالة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground text-xs" dir="rtl">
      {/* Top Header */}
      <header className="flex items-center gap-3 border-b border-border/70 pb-4">
        <button
          onClick={() => navigate("/hr/resignations")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="رجوع"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileX className="h-4 w-4" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              تسجيل استقالة وإنهاء خدمة موظف
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            توثيق طلب الاستقالة، احتساب فترة الإشعار القانونية، وملاحظات مقابلة الخروج
          </p>
        </div>
      </header>

      {/* Form Chassis */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-border/70 bg-card p-5 space-y-5 shadow-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employee Selection */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block font-medium text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              الموظف <span className="text-red-500">*</span>
            </label>
            <Controller
              name="employeeId"
              control={control}
              rules={{ required: "يجب اختيار الموظف" }}
              render={({ field }) => (
                <select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- اختر الموظف من القائمة --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.employeeNumber ? `(${emp.employeeNumber})` : ""} {emp.code ? `(${emp.code})` : ""} - {emp.department || "عام"}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.employeeId && (
              <p className="text-[11px] text-red-500">{errors.employeeId.message}</p>
            )}
            {employees.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>لا يوجد موظفون متاحون حالياً. يرجى التأكد من تسجيل موظفين في قسم الموارد البشرية.</span>
              </div>
            )}
          </div>

          {/* Resignation Date */}
          <div className="space-y-1.5">
            <label className="block font-medium text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              تاريخ تقديم الاستقالة <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("resignationDate", { required: "التاريخ مطلوب" })}
              onChange={(e) => {
                register("resignationDate").onChange(e);
                handleDateChange(e);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.resignationDate && (
              <p className="text-[11px] text-red-500">{errors.resignationDate.message}</p>
            )}
            {expectedDate && (
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground font-mono">
                <Calculator className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>فترة الإشعار ({noticePeriod} يوم) — آخر يوم متوقع: <strong className="text-foreground">{expectedDate}</strong></span>
              </div>
            )}
          </div>

          {/* Last Working Day */}
          <div className="space-y-1.5">
            <label className="block font-medium text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              آخر يوم عمل معتمد <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("lastWorkingDay", { required: "تاريخ آخر يوم عمل مطلوب" })}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.lastWorkingDay && (
              <p className="text-[11px] text-red-500">{errors.lastWorkingDay.message}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="block font-medium text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            سبب الاستقالة
          </label>
          <textarea
            placeholder="اذكر أسباب وظروف تقديم الاستقالة..."
            rows={2}
            className="w-full px-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            {...register("reason")}
          />
        </div>

        {/* Exit Interview */}
        <div className="space-y-1.5">
          <label className="block font-medium text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            ملاحظات مقابلة الخروج (Exit Interview)
          </label>
          <textarea
            placeholder="تفاصيل المقابلة، التغذية الراجعة، وملاحظات الفريق..."
            rows={3}
            className="w-full px-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            {...register("exitInterview")}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/70">
          <button
            type="button"
            onClick={() => navigate("/hr/resignations")}
            className="rounded-md border border-border/70 bg-background px-4 py-1.5 font-medium text-foreground hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-rose-600 px-4 py-1.5 font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>حفظ الاستقالة</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateResignation;
