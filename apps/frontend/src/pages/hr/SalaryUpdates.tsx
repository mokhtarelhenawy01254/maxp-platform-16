import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Save,
  AlertTriangle,
  Search,
  Filter,
  Loader2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import api from "../../services/api";
import { SalaryHistoryTable } from "./SalaryHistoryTable";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  baseSalary: string;
  department: { name: string } | null;
  position: { title: string } | null;
  contractType: string;
  status: string;
}

export const SalaryUpdates: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const [historyLoading, setHistoryLoading] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [search, departmentFilter, employees]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes] = await Promise.all([
        api.get("/hr/employees?limit=1000&status=ACTIVE"),
        api.get("/hr/departments"),
      ]);

      setEmployees(empRes.data?.employees || empRes.data?.data || []);
      setDepartments(deptRes.data?.departments || deptRes.data?.data || []);

      fetchSalaryHistory();
    } catch (error) {
      console.error("Error fetching data:", error);
      tToast.error("SalaryUpdates.failed_fetch_4bd4");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get("/hr/salary-history?limit=50&page=1");
      setSalaryHistory(res.data?.history || res.data?.data || []);
    } catch (error) {
      console.error("Error fetching salary history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterData = () => {
    let result = [...(employees || [])];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.firstName || "").toLowerCase().includes(q) ||
          (e.lastName || "").toLowerCase().includes(q) ||
          (e.employeeNumber || "").includes(q),
      );
    }

    if (departmentFilter !== "all") {
      result = result.filter((e) => e.department?.name === departmentFilter);
    }

    setFilteredEmployees(result);
  };

  const parseSalary = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const normalized = s.replace(/,/g, "");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const isSameSalary = (a: unknown, b: unknown) => {
    const na = parseSalary(a);
    const nb = parseSalary(b);
    if (na === null && nb === null) return true;
    if (na === null || nb === null) return false;
    return na === nb;
  };

  const handleSalaryChange = (id: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      setUpdates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setUpdates((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleReasonChange = (id: string, value: string) => {
    setReasons((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const changedCount = (employees || []).reduce((count, e) => {
    if (updates[e.id] === undefined) return count;
    const isChanged = !isSameSalary(updates[e.id], e.baseSalary);
    return isChanged ? count + 1 : count;
  }, 0);

  const hasChanges = changedCount > 0;

  const handleSave = async () => {
    try {
      const updatesList = (employees || []).filter(
        (e) =>
          updates[e.id] !== undefined &&
          !isSameSalary(updates[e.id], e.baseSalary),
      );

      if (updatesList.length === 0) {
        tToast.info("SalaryUpdates.msg_f4a3");
        return;
      }

      const missingReason = updatesList.some(
        (e) => !reasons[e.id] || reasons[e.id].trim() === "",
      );
      if (missingReason) {
        tToast.error("SalaryUpdates.msg_bdbc");
        return;
      }

      setSaving(true);

      const payload = updatesList.map((e) => ({
        id: e.id,
        baseSalary: updates[e.id],
        reason: reasons[e.id],
      }));

      const res = await api.put("/hr/employees/bulk-salaries", { updates: payload });

      if (res.data?.success) {
        toast.success(`تم تحديث رواتب ${res.data.updatedCount ?? updatesList.length} موظف بنجاح`);
        setUpdates({});
        setReasons({});
        fetchData();
      } else {
        toast.error(res.data?.error || "فشل حفظ التغييرات");
      }
    } catch (error: any) {
      console.error("Error saving salaries:", error);
      toast.error(error.response?.data?.error || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">جاري تحميل بيانات الرواتب...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background" dir="rtl">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate("/hr/payroll")}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع لسجل الرواتب"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
              تعديل الرواتب الأساسية للموظفين
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              تعديل جماعي وسريع للرواتب الأساسية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span>{changedCount} تعديل غير محفوظ</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
            <span>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
          </button>
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        
        {/* Strip 1: Filter Ribbon */}
        <section className="px-3 sm:px-4 py-2.5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="البحث بالاسم أو الرقم الوظيفي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full ps-8 pe-3 py-1 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل الأقسام</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Strip 2: Active Employees Salary Table */}
        <section className="p-3 sm:p-4">
          <div className="rounded-md border border-border/70 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground bg-muted/20">
                    <th className="py-2.5 px-3 text-start font-semibold">الموظف</th>
                    <th className="py-2.5 px-3 text-start font-semibold">القسم</th>
                    <th className="py-2.5 px-3 text-start font-semibold">نوع العقد</th>
                    <th className="py-2.5 px-3 text-start font-semibold">الحالة</th>
                    <th className="py-2.5 px-3 text-start font-semibold w-40">الراتب الأساسي (ج.م)</th>
                    <th className="py-2.5 px-3 text-start font-semibold w-64">سبب التعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredEmployees.map((employee) => {
                    const currentSalary = updates[employee.id] !== undefined ? updates[employee.id] : employee.baseSalary || "";
                    const isChanged = updates[employee.id] !== undefined && !isSameSalary(updates[employee.id], employee.baseSalary);

                    return (
                      <tr key={employee.id} className={`hover:bg-muted/30 transition-colors ${isChanged ? "bg-primary/[0.03]" : ""}`}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {employee.employeeNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {employee.department?.name || "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-border/60 bg-muted/40 text-muted-foreground">
                            {employee.contractType || "-"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            نشط
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={currentSalary}
                            onChange={(e) => handleSalaryChange(employee.id, e.target.value)}
                            className={`w-full px-2.5 py-1 text-xs font-mono rounded border ${
                              isChanged
                                ? "border-primary bg-primary/[0.04] text-foreground font-bold"
                                : "border-border/80 bg-background text-foreground"
                            } focus:outline-hidden focus:ring-1 focus:ring-primary`}
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder={isChanged ? "اكتب سبب التعديل..." : "-"}
                            value={reasons[employee.id] || ""}
                            onChange={(e) => handleReasonChange(employee.id, e.target.value)}
                            disabled={!isChanged}
                            className={`w-full px-2.5 py-1 text-xs rounded border ${
                              isChanged && (!reasons[employee.id] || reasons[employee.id].trim() === "")
                                ? "border-amber-500 bg-amber-500/[0.04]"
                                : "border-border/80 bg-background"
                            } focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-40 disabled:bg-muted/20`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        لا يوجد موظفون مطابقون لشروط البحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Strip 3: Salary History Log (Subcomponent) */}
        <section className="p-3 sm:p-4">
          <SalaryHistoryTable
            salaryHistory={salaryHistory}
            historyLoading={historyLoading}
          />
        </section>

      </main>
    </div>
  );
};

export default SalaryUpdates;
