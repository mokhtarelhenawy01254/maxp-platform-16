import { useMemo } from "react";
import {
  CalendarDaysIcon, ClockIcon, CheckIcon,
  UserGroupIcon, BuildingOffice2Icon
} from "@heroicons/react/24/outline";
import { BookingBranch, BookingDoctor, BookingAppointment, STATUS_MAP } from "./shared";

interface Props {
  branches: BookingBranch[];
  doctors: BookingDoctor[];
  appointments: BookingAppointment[];
  selectedBranchId: string;
}

export default function DashboardTab({ branches, doctors, appointments, selectedBranchId }: Props) {
  const today = new Date().toISOString().split("T")[0];
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

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">لوحة التحكم</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "مواعيد اليوم", value: stats.todayAppointments.length, icon: CalendarDaysIcon, color: "bg-blue-500" },
          { label: "بانتظار التأكيد", value: stats.pendingCount, icon: ClockIcon, color: "bg-yellow-500" },
          { label: "مؤكدة", value: stats.confirmedCount, icon: CheckIcon, color: "bg-green-500" },
          { label: "الأطباء", value: stats.totalDoctors, icon: UserGroupIcon, color: "bg-purple-500" },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-lg`}><c.icon className="w-6 h-6 text-white" /></div>
            <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p></div>
          </div>
        ))}
      </div>
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
      {(selectedBranchId ? branches.filter(b => b.id === selectedBranchId) : branches).map(branch => {
        const branchAppts = branchAppointments.filter(a => a.branchId === branch.id).slice(0, 10);
        return (
          <div key={branch.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 mb-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><BuildingOffice2Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />{branch.name}</h3>
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
