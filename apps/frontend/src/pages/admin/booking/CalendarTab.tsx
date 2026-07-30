import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
;
import { BookingAppointment, STATUS_MAP } from "./shared";

interface Props {
  appointments: BookingAppointment[];
  calDate: Date;
  onCalDateChange: (d: Date) => void;
  selectedDay: string | null;
  onSelectedDayChange: (d: string | null) => void;
}

const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAY_NAMES_SHORT = ["ح","ن","ث","ر","خ","ج","س"];

export default function CalendarTab({ appointments, calDate, onCalDateChange, selectedDay, onSelectedDayChange }: Props) {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const apptsByDate: Record<string, typeof appointments> = {};
  appointments.forEach(a => {
    if (!apptsByDate[a.appointmentDate]) apptsByDate[a.appointmentDate] = [];
    apptsByDate[a.appointmentDate].push(a);
  });

  const dayAppts = selectedDay ? apptsByDate[selectedDay] || [] : [];

  const prevMonth = () => onCalDateChange(new Date(year, month - 1, 1));
  const nextMonth = () => onCalDateChange(new Date(year, month + 1, 1));

  const days: { date: string; day: number; isToday: boolean; hasAppts: boolean; male: number; female: number }[] = [];
  for (let i = 0; i < firstDay; i++) days.push({ date: "", day: 0, isToday: false, hasAppts: false, male: 0, female: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const ad = apptsByDate[dateStr] || [];
    days.push({
      date: dateStr, day: d, isToday: dateStr === today,
      hasAppts: ad.length > 0,
      male: ad.filter(a => a.customerGender === "male").length,
      female: ad.filter(a => a.customerGender === "female").length,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold">{MONTH_NAMES[month]} {year}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><ChevronRightIcon className="w-5 h-5" /></button>
          <button onClick={() => onCalDateChange(new Date())} className="px-3 py-1.5 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">اليوم</button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><ChevronLeftIcon className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          {DAY_NAMES_SHORT.map(d => <div key={d} className="text-center py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => (
            <div key={i} onClick={() => d.date && onSelectedDayChange(d.date === selectedDay ? null : d.date)}
              className={`min-h-[60px] md:min-h-[80px] p-1 md:p-2 border-b dark:border-gray-700 border-l cursor-pointer transition-colors
                ${d.isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                ${d.date === selectedDay ? "ring-2 ring-blue-500 ring-inset" : ""}
                ${!d.date ? "bg-gray-50 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {d.date && (
                <>
                  <span className={`text-sm font-medium ${d.isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"}`}>{d.day}</span>
                  {d.hasAppts && (
                    <div className="mt-1 space-y-0.5">
                      {d.male > 0 && <div className="text-xs px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{d.male} ذكر</div>}
                      {d.female > 0 && <div className="text-xs px-1 py-0.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300">{d.female} أنثى</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {selectedDay && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <h3 className="font-bold mb-3">مواعيد {selectedDay}</h3>
          {dayAppts.length === 0 ? (
            <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
          ) : (
            <div className="space-y-2">
              {dayAppts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${a.customerGender === "female" ? "bg-pink-500" : "bg-blue-500"}`}></span>
                    <div>
                      <p className="font-medium text-sm">{a.customerName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{a.startTime} - {a.serviceName || a.branchName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
