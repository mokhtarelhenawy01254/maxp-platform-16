import { useMemo, useEffect, useState } from "react";
import { Building2, CalendarDays, Check, Clock, Users, Wallet, Banknote, Download } from 'lucide-react'
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
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">لوحة التحكم</h2>
        <div className="flex items-center gap-2">
          <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">الشهر</option>
          </select>
          <button onClick={() => downloadCsv("appointments")} className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><Download className="w-4 h-4" />المواعيد</button>
          <button onClick={() => downloadCsv("invoices")} className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><Download className="w-4 h-4" />الفواتير</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "مواعيد اليوم", value: stats.todayAppointments.length, icon: CalendarDays, color: "bg-blue-500" },
          { label: "بانتظار التأكيد", value: stats.pendingCount, icon: Clock, color: "bg-yellow-500" },
          { label: "مؤكدة", value: stats.confirmedCount, icon: Check, color: "bg-green-500" },
          { label: "الأطباء", value: stats.totalDoctors, icon: Users, color: "bg-purple-500" },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p></div>
          </div>
        ))}
      </div>

      {financials && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: `الإيراد (${period === "today" ? "اليوم" : period === "week" ? "7 أيام" : "الشهر"})`, value: financials.totalRevenue, icon: Wallet, color: "bg-emerald-500" },
            { label: "المحصّل", value: financials.collected, icon: Banknote, color: "bg-teal-500" },
            { label: "المتبقي", value: financials.outstanding, icon: Wallet, color: "bg-orange-500" },
            { label: "فواتير غير مسددة", value: financials.unpaidInvoices, icon: Banknote, color: "bg-red-500" },
          ].map((c, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
              <div className={`${c.color} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
              <div><p className="text-2xl font-bold">{Number(c.value || 0).toFixed(2)}</p><p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المواعيد اليوم</p>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-sm">ذكور: {stats.maleCount}</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500"></span><span className="text-sm">إناث: {stats.femaleCount}</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الفروع النشطة</p>
          <p className="text-2xl font-bold">{stats.totalBranches}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي الحجوزات</p>
          <p className="text-2xl font-bold">{branchAppointments.length}</p>
        </div>
      </div>

      {(patientStats || topDoctor) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {patientStats && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="font-bold mb-2">المرضى ({period === "today" ? "اليوم" : period === "week" ? "7 أيام" : "الشهر"})</p>
              <div className="flex gap-6 text-sm">
                <div><p className="text-xl font-bold">{patientStats.totalPatients}</p><p className="text-gray-500 dark:text-gray-400">إجمالي الملفات</p></div>
                <div><p className="text-xl font-bold text-green-600">{patientStats.newPatients}</p><p className="text-gray-500 dark:text-gray-400">مرضى جدد</p></div>
              </div>
            </div>
          )}
          {topDoctor && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="font-bold mb-2">الأعلى أداءً ({period === "today" ? "اليوم" : period === "week" ? "7 أيام" : "الشهر"})</p>
              <p className="text-xl font-bold">{topDoctor.doctorName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{topDoctor.total} موعد</p>
            </div>
          )}
        </div>
      )}

      {(selectedBranchId ? branches.filter(b => b.id === selectedBranchId) : branches).map(branch => {
        const branchAppts = branchAppointments.filter(a => a.branchId === branch.id).slice(0, 10);
        return (
          <div key={branch.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 mb-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />{branch.name}</h3>
            {branchAppts.length === 0 ? (
              <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["العميل", "التاريخ", "الوقت", "الحالة"].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
                  <tbody>{branchAppts.map(a => (
                    <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4">{a.customerName}</td>
                      <td className="py-3 px-4">{a.appointmentDate}</td>
                      <td className="py-3 px-4">{a.startTime}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
