import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ViewMode = "list" | "day" | "week" | "month";

interface CalendarItem {
  id: string;
  patientName: string;
  examTypeName?: string;
  deviceName?: string;
  patientFlags?: string[] | string;
  appointmentTime?: string;
  appointmentDate?: string;
  status?: string;
  emergency?: boolean;
  additionAmount?: number;
}

const EGPY_DAYS = ["radiology.scheduleCalendar.days.0", "radiology.scheduleCalendar.days.1", "radiology.scheduleCalendar.days.2", "radiology.scheduleCalendar.days.3", "radiology.scheduleCalendar.days.4", "radiology.scheduleCalendar.days.5", "radiology.scheduleCalendar.days.6"];

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const egyptWeekStart = (d: Date) => { const x = new Date(d); const ed = (x.getDay() + 1) % 7; return addDays(x, -ed); };

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CHECKED_IN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const statusCls = (s?: string) => STATUS_COLOR[s || "SCHEDULED"] || STATUS_COLOR["SCHEDULED"];
const fmtLabel = (d: Date) => d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

export default function ScheduleCalendar(props: {
  view: "day" | "week" | "month";
  anchorDate: string;
  items: CalendarItem[];
  onShift: (dir: number) => void;
  onToday: () => void;
  onSelectDay: (key: string) => void;
  onOpenAppointment?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { view, anchorDate, items, onShift, onToday, onSelectDay, onOpenAppointment } = props;
  const anchor = new Date(anchorDate + "T12:00:00");
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const key = it.appointmentDate ? String(it.appointmentDate).slice(0, 10) : "";
    if (!key) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(it);
  }
  for (const list of byDay.values()) list.sort((a, b) => (a.appointmentTime || "").localeCompare(b.appointmentTime || ""));

  const navBtn = "px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700";

  const dayCell = (d: Date, compact = false) => {
    const key = dayKey(d);
    const list = byDay.get(key) || [];
    const isToday = key === dayKey(new Date());
    return (
      <div key={key} className={`rounded-lg border dark:border-gray-700 p-2 ${isToday ? "ring-2 ring-blue-500" : ""}`}>
        <button onClick={() => onSelectDay(key)} className="text-sm font-semibold hover:text-blue-600 dark:hover:text-blue-400">
          {compact ? `${d.getDate()}/${d.getMonth() + 1}` : d.getDate()}
        </button>
        {compact ? (
          <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">{list.length ? `${list.length} ${t("radiology.scheduleCalendar.bookings")}` : ""}</div>
        ) : (
          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
            {list.length === 0 ? <div className="text-xs text-gray-400">—</div> : list.map(a => (
              <button
                key={a.id}
                type="button"
                disabled={!onOpenAppointment}
                onClick={() => onOpenAppointment?.(a.id)}
                aria-label={a.patientName}
                className={`text-[11px] px-1.5 py-0.5 rounded ${statusCls(a.status)} flex items-center justify-between w-full text-left ${onOpenAppointment ? "cursor-pointer hover:opacity-80" : ""}`}
              >
                <span className="truncate">{a.patientName}{a.emergency ? " ⚡" : ""}</span>
                <span className="whitespace-nowrap" dir="ltr">{a.appointmentTime || "—"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (view === "day") {
    const key = dayKey(anchor);
    const list = byDay.get(key) || [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button className={navBtn} onClick={() => onShift(-1)} aria-label={t("radiology.patients.previous") as string}><ChevronRight className="w-4 h-4" /></button>
            <button className={navBtn} onClick={() => onShift(1)} aria-label={t("radiology.patients.next") as string}><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-sm">{fmtLabel(anchor)}</span>
            <button className={`${navBtn} text-blue-600 dark:text-blue-400`} onClick={onToday} aria-label={t("radiology.scheduleCalendar.today") as string}>{t("radiology.scheduleCalendar.today")}</button>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{list.length} {t("radiology.scheduleCalendar.bookings")}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
          {list.length === 0 ? (
            <div className="p-10 text-center text-gray-400">{t("radiology.scheduleCalendar.noBookingsToday")}</div>
          ) : list.map(a => (
            <button
              key={a.id}
              type="button"
              disabled={!onOpenAppointment}
              onClick={() => onOpenAppointment?.(a.id)}
              aria-label={`${t("radiology.scheduleCalendar.booking")} ${a.patientName}`}
              className={`flex items-center gap-3 px-4 py-3 text-sm w-full ${onOpenAppointment ? "cursor-pointer hover:opacity-80" : ""}`}
            >
              <span className="font-mono whitespace-nowrap text-gray-500 dark:text-gray-400" dir="ltr">{a.appointmentTime || "—"}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusCls(a.status)}`}>{a.status === "SCHEDULED" ? t("radiology.scheduleCalendar.scheduled") : a.status === "CHECKED_IN" ? t("radiology.scheduleCalendar.checkedIn") : a.status === "DONE" ? t("radiology.scheduleCalendar.done") : t("radiology.scheduleCalendar.cancelled")}</span>
              <span className="font-medium">{a.patientName}{a.emergency ? <span className="mr-1 text-xs text-red-500">{t("radiology.scheduleCalendar.emergency")}</span> : null}</span>
              <span className="text-gray-500 dark:text-gray-400 flex-1 truncate">{a.examTypeName || ""}{a.deviceName ? ` (${a.deviceName})` : ""}{a.additionAmount ? ` (+${Number(a.additionAmount).toFixed(0)}${t("radiology.currency")})` : ""}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === "week") {
    const start = egyptWeekStart(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const weekLabel = `${fmtLabel(start)} — ${fmtLabel(addDays(start, 6))}`;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button className={navBtn} onClick={() => onShift(-1)} aria-label={t("radiology.patients.previous") as string}><ChevronRight className="w-4 h-4" /></button>
            <button className={navBtn} onClick={() => onShift(1)} aria-label={t("radiology.patients.next") as string}><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-sm">{weekLabel}</span>
            <button className={`${navBtn} text-blue-600 dark:text-blue-400`} onClick={onToday} aria-label={t("radiology.scheduleCalendar.thisWeek") as string}>{t("radiology.scheduleCalendar.thisWeek")}</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => (
            <div key={i} className="min-w-0">
              <div className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t(EGPY_DAYS[i] ?? "")}</div>
              {dayCell(d)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // month
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = egyptWeekStart(first);
  const daysCount = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: daysCount + Math.max(0, (start.getDay() + 1) % 7) }, (_, i) => addDays(start, i));
  const monthLabel = anchor.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button className={navBtn} onClick={() => onShift(-1)} aria-label={t("radiology.patients.previous") as string}><ChevronRight className="w-4 h-4" /></button>
            <button className={navBtn} onClick={() => onShift(1)} aria-label={t("radiology.patients.next") as string}><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-sm">{monthLabel}</span>
            <button className={`${navBtn} text-blue-600 dark:text-blue-400`} onClick={onToday} aria-label={t("radiology.scheduleCalendar.thisMonth") as string}>{t("radiology.scheduleCalendar.thisMonth")}</button>
          </div>
        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><CalendarDays className="w-4 h-4" />{t("radiology.scheduleCalendar.clickDayForBookings")}</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {EGPY_DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1">{t(d)}</div>)}
        {cells.filter(c => c.getMonth() === anchor.getMonth()).map(c => dayCell(c, true))}
      </div>
    </div>
  );
}
