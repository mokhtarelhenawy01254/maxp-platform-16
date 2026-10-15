import { useMemo, useEffect, useState } from "react";
import { Building2, CalendarDays, Check, Clock, Users, Wallet, Banknote, Download } from 'lucide-react';
import { BookingBranch, BookingDoctor, BookingAppointment, STATUS_MAP, api, getAuthHeaders } from "./shared";

interface Props {
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  appointments: BookingAppointment[];
  selectedBranchId: string;
}

interface ReportsData {
  financials?: { totalRevenue: number; collected: number; outstanding: number; invoiceCount: number; unpaidInvoices: number };
  doctorPerformance?: { doctorId: string; doctorName: string; total: number }[];
  patientStats?: { totalPatients: number; newPatients: number; returningPatients: number };
}

export default function DashboardTab({ branches, doctors, appointments, selectedBranchId }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api(`reports/summary?period=${period}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (json.success && !cancelled) setReports(json.data);
      } catch (e) { console.error("fetchReports", e); }
    })();
    return () => { cancelled = true; };
  }, [period]);

  const branchAppointments = useMemo(() =>
    selectedBranchId ? appointments.filter(a => a.branchId === selectedBranchId) : appointments,
    [appointments, selectedBranchId]
  );
  const stats = {
    todayAppointments: branchAppointments.filter(a => a.appointmentDate === today),
    pendingCount: branchAppointments.filter(a => a.status === "pending").length,
    confirmedCount: branchAppointments.filter(a => a.status === "confirmed").length,
    totalBranches: selectedBranchId ? 1 : branches.length,
    totalDoctors: selectedBranchId ? doctors.length : doctors.filter(d => d.isActive).length,
    maleCount: branchAppointments.filter(a => a.customerGender === "male").length,
    femaleCount: branchAppointments.filter(a => a.customerGender === "female").length,
  };

  const downloadCsv = async (type: "appointments" | "invoices") => {
    try {
      const res = await fetch(api(`reports/export?type=${type}`), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("exportCsv", e); }
  };

  const financials = reports?.financials;
  const patientStats = reports?.patientStats;
  const topDoctor = reports?.doctorPerformance?.[0];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">لوحة تحكم الحجوزات السريرية</h2>
          <p className="text-xs text-muted-foreground mt-0.5">مؤشرات الأداء اليومية، الإيرادات، وتوزيع الحالات</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border border-border/70 rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-card text-foreground shadow-sm hover:border-border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">الشهر</option>
          </select>
          <button
            onClick={() => downloadCsv("appointments")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm border border-border/70 rounded-lg bg-card text-foreground hover:bg-muted/60 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>المواعيد</span>
          </button>
          <button
            onClick={() => downloadCsv("invoices")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm border border-border/70 rounded-lg bg-card text-foreground hover:bg-muted/60 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>الفواتير</span>
          </button>
        </div>
      </div>

      {/* Appointment KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "مواعيد اليوم", value: stats.todayAppointments.length, icon: CalendarDays, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "بانتظار التأكيد", value: stats.pendingCount, icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
          { label: "مؤكدة", value: stats.confirmedCount, icon: Check, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "الأطباء النشطون", value: stats.totalDoctors, icon: Users, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
        ].map((c, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/70 p-4 shadow-sm flex items-center gap-3.5 transition-all hover:border-border">
            <div className={`p-2.5 rounded-xl border ${c.color} shrink-0`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground tracking-tight">{c.value}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Financial KPIs */}
      {financials && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: `الإيراد (${period === "today" ? "اليوم" : period === "week" ? "7 أيام" : "الشهر"})`, value: financials.totalRevenue, icon: Wallet, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
            { label: "المحصّل الفعلي", value: financials.collected, icon: Banknote, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
            { label: "المتبقي الآجل", value: financials.outstanding, icon: Wallet, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
            { label: "فواتير غير مسددة", value: financials.unpaidInvoices, icon: Banknote, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
          ].map((c, i) => (
            <div key={i} className="bg-card rounded-xl border border-border/70 p-4 shadow-sm flex items-center gap-3.5 transition-all hover:border-border">
              <div className={`p-2.5 rounded-xl border ${c.color} shrink-0`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground tracking-tight">
                  {Number(c.value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-muted-foreground mr-1">ج.م</span>
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distribution & Performance Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">توزيع مواعيد اليوم حسب الجنس</p>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <span className="text-xs text-foreground">ذكور: <strong className="font-mono tabular-nums">{stats.maleCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0"></span>
              <span className="text-xs text-foreground">إناث: <strong className="font-mono tabular-nums">{stats.femaleCount}</strong></span>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1">الفروع المتاحة</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">{stats.totalBranches}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/70 p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي الحجوزات المسجلة</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">{branchAppointments.length}</p>
        </div>
      </div>

      {(patientStats || topDoctor) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {patientStats && (
            <div className="bg-card rounded-xl border border-border/70 p-4 shadow-sm">
              <p className="text-xs font-semibold text-foreground mb-3">
                ملفات المرضى ({period === "today" ? "اليوم" : period === "week" ? "7 أيام" : "الشهر"})
              </p>
              <div className="flex gap-8 text-xs">
                <div>
                  <p className="text-xl font-bold font-mono tabular-nums text-foreground">{patientStats.totalPatients}</p>
                  <p className="text-muted-foreground mt-0.5">إجمالي الملفات</p>
                </div>
                <div>
                  <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{patientStats.newPatients}</p>
                  <p className="text-muted-foreground mt-0.5">مرضى جدد</p>
                </div>
                <div>
                  <p className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">{patientStats.returningPatients}</p>
                  <p className="text-muted-foreground mt-0.5">مرضى مترددون</p>
                </div>
              </div>
            </div>
          )}
          {topDoctor && (
            <div className="bg-card rounded-xl border border-border/70 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">
                  الطبيب الأكثر إنجازاً ({period === "today" ? "اليوم" : period === "week" ? "7 أيام" : "الشهر"})
                </p>
                <p className="text-base font-bold text-foreground">{topDoctor.doctorName}</p>
                <p className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5">{topDoctor.total} موعد منجز</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch Appointments Breakdown */}
      {(selectedBranchId ? branches.filter(b => b.id === selectedBranchId) : branches).map(branch => {
        const branchAppts = branchAppointments.filter(a => a.branchId === branch.id).slice(0, 10);
        return (
          <div key={branch.id} className="bg-card rounded-xl border border-border/70 p-4 shadow-sm">
            <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>{branch.name}</span>
              <span className="text-xs font-normal text-muted-foreground font-mono tabular-nums">({branchAppts.length} مواعيد قادمة)</span>
            </h3>
            {branchAppts.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">لا توجد مواعيد مسجلة لهذا الفرع</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                      {["العميل", "التاريخ", "الوقت", "الحالة"].map(h => (
                        <th key={h} className="text-right py-2.5 px-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {branchAppts.map(a => (
                      <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground">{a.customerName}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{a.appointmentDate}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{a.startTime}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_MAP[a.status]?.color || ""}`}>
                            {STATUS_MAP[a.status]?.label || a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
