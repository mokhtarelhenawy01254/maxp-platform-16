import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  BookingAppointment, BookingBranch, BookingDoctor, BookingService, BookingPatient,
  BOOKING_STATUS_MAP, STATUS_MAP, MODAL_INPUT_CLS, fetchJson, api, getAuthHeaders
} from "./shared";
import AppointmentModal from "./AppointmentModal";

interface Props {
  appointments?: BookingAppointment[];
  calDate?: Date;
  onCalDateChange?: (d: Date) => void;
  selectedDay?: string | null;
  onSelectedDayChange?: (d: string | null) => void;
}

interface TimelineResource {
  doctorId: string;
  doctorName: string;
  specialty: string;
  branchId?: string;
  branchName?: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  slots: { time: string }[];
}

interface TimelineData {
  resources: TimelineResource[];
  appointments: BookingAppointment[];
}

const TIMELINE_SLOT_MINUTES = 5;
const DEFAULT_DAY_START = "08:00";
const DEFAULT_DAY_END = "22:00";
const SLOT_PX = 22;
const UNASSIGNED_KEY = "__unassigned__";

const toMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shiftDate = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

const BLOCK_COLORS: Record<string, string> = {
  pending: "bg-yellow-200/80 border-yellow-300 text-yellow-900 dark:bg-yellow-500/25 dark:border-yellow-500/40 dark:text-yellow-100",
  confirmed: "bg-green-200/80 border-green-300 text-green-900 dark:bg-green-500/25 dark:border-green-500/40 dark:text-green-100",
  checked_in: "bg-blue-200/80 border-blue-300 text-blue-900 dark:bg-blue-500/25 dark:border-blue-500/40 dark:text-blue-100",
  procedure_started: "bg-indigo-200/80 border-indigo-300 text-indigo-900 dark:bg-indigo-500/25 dark:border-indigo-500/40 dark:text-indigo-100",
  procedure_completed: "bg-violet-200/80 border-violet-300 text-violet-900 dark:bg-violet-500/25 dark:border-violet-500/40 dark:text-violet-100",
  checked_out: "bg-teal-200/80 border-teal-300 text-teal-900 dark:bg-teal-500/25 dark:border-teal-500/40 dark:text-teal-100",
  completed: "bg-blue-200/80 border-blue-300 text-blue-900 dark:bg-blue-500/25 dark:border-blue-500/40 dark:text-blue-100",
  cancelled: "bg-red-200/70 border-red-300 text-red-900 dark:bg-red-500/25 dark:border-red-500/40 dark:text-red-100",
  missed: "bg-orange-200/70 border-orange-300 text-orange-900 dark:bg-orange-500/25 dark:border-orange-500/40 dark:text-orange-100",
  no_show: "bg-gray-200/70 border-gray-300 text-gray-700 dark:bg-gray-600/30 dark:border-gray-500/40 dark:text-gray-200",
};

const blockColor = (a: BookingAppointment): string =>
  BLOCK_COLORS[(a.bookingStatus || a.status || "").toLowerCase()] ||
  "bg-gray-200/70 border-gray-300 text-gray-700 dark:bg-gray-600/30 dark:border-gray-500/40 dark:text-gray-200";

const statusLabel = (a: BookingAppointment): string => {
  if (a.bookingStatus && BOOKING_STATUS_MAP[a.bookingStatus]) return BOOKING_STATUS_MAP[a.bookingStatus]?.label || "";
  return STATUS_MAP[a.status]?.label || a.status || "";
};

export default function CalendarTab(_props: Props) {
  const [timelineDate, setTimelineDate] = useState(() => toDateStr(new Date()));
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [branches, setBranches] = useState<BookingBranch[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [patients, setPatients] = useState<BookingPatient[]>([]);
  const [modalAppointment, setModalAppointment] = useState<Partial<BookingAppointment> | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchJson<BookingBranch[]>(api("branches")),
      fetchJson<BookingDoctor[]>(api("doctors")),
      fetchJson<BookingService[]>(api("services")),
      fetchJson<BookingPatient[]>(api("patients?includeInactive=true")),
    ]).then(([b, d, s, p]) => {
      if (!active) return;
      if (b.status === "fulfilled") setBranches(b.value || []);
      if (d.status === "fulfilled") setDoctors(d.value || []);
      if (s.status === "fulfilled") setServices(s.value || []);
      if (p.status === "fulfilled") setPatients(p.value || []);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ date: timelineDate });
    if (branchId) params.set("branchId", branchId);
    if (serviceId) params.set("serviceId", serviceId);
    let active = true;
    setLoading(true);
    fetchJson<TimelineData>(api(`appointments/timeline?${params}`))
      .then((data) => { if (active) setTimeline(data); })
      .catch((e) => { if (active) { console.error("timeline", e); toast.error("فشل تحميل الجدول الزمني"); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [timelineDate, branchId, serviceId, refreshKey]);

  const dayRange = useMemo(() => {
    const resources = timeline?.resources || [];
    if (resources.length === 0) return { startMin: toMinutes(DEFAULT_DAY_START), endMin: toMinutes(DEFAULT_DAY_END) };
    let startMin = toMinutes(DEFAULT_DAY_END);
    let endMin = toMinutes(DEFAULT_DAY_START);
    resources.forEach((r) => {
      const s = toMinutes(r.startTime);
      const e = toMinutes(r.endTime);
      if (s < startMin) startMin = s;
      if (e > endMin) endMin = e;
    });
    if (endMin <= startMin) return { startMin: toMinutes(DEFAULT_DAY_START), endMin: toMinutes(DEFAULT_DAY_END) };
    return { startMin, endMin };
  }, [timeline]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let m = dayRange.startMin; m < dayRange.endMin; m += TIMELINE_SLOT_MINUTES) {
      slots.push(formatTime(m));
    }
    return slots;
  }, [dayRange]);

  const dayHeight = timeSlots.length * SLOT_PX;

  const slotTop = (time: string): number => ((toMinutes(time) - dayRange.startMin) / TIMELINE_SLOT_MINUTES) * SLOT_PX;
  const blockTop = (a: BookingAppointment): number => ((toMinutes(a.startTime) - dayRange.startMin) / TIMELINE_SLOT_MINUTES) * SLOT_PX;
  const blockHeight = (a: BookingAppointment): number => Math.max((a.duration || 30) / TIMELINE_SLOT_MINUTES * SLOT_PX, SLOT_PX);

  const appointmentsByDoctor = useMemo(() => {
    const map: Record<string, BookingAppointment[]> = {};
    (timeline?.appointments || []).forEach((a) => {
      const key = a.doctorId || UNASSIGNED_KEY;
      if (!map[key]) map[key] = [];
      map[key]!.push(a);
    });
    return map;
  }, [timeline]);

  const resources = timeline?.resources || [];
  const unassigned = appointmentsByDoctor[UNASSIGNED_KEY] || [];

  const openNewAppointment = (doctor: TimelineResource | null, time: string) => {
    setModalAppointment({
      branchId: branchId || doctor?.branchId || "",
      doctorId: doctor?.doctorId || "",
      serviceId: serviceId || "",
      appointmentDate: timelineDate,
      startTime: time,
    });
  };

  const openEditAppointment = (a: BookingAppointment) => {
    setModalAppointment({ ...a });
  };

  const saveAppointment = async (d: Partial<BookingAppointment>) => {
    const isEdit = !!d.id;
    try {
      const url = api(`appointments${isEdit ? `/${d.id}` : ""}`);
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(d),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || "فشل حفظ الموعد"); return; }
      toast.success(isEdit ? "تم تحديث الموعد" : "تم حجز الموعد");
      setModalAppointment(undefined);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error("saveAppointment", e);
      toast.error("حدث خطأ في حفظ الموعد");
    }
  };

  const renderBlocks = (appts: BookingAppointment[], renderEmptyRows: boolean, onEmptyClick: (time: string) => void) => (
    <>
      {renderEmptyRows && timeSlots.map((t) => (
        <div
          key={t}
          onClick={() => onEmptyClick(t)}
          className="absolute inset-x-0 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
          style={{ top: slotTop(t), height: SLOT_PX }}
        />
      ))}
      {appts
        .filter((a) => toMinutes(a.startTime) < dayRange.endMin)
        .map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => openEditAppointment(a)}
            title={`${a.customerName} - ${a.startTime}${a.room ? ` - ${a.room}` : ""}`}
            className={`absolute inset-x-1 z-[5] overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight ${blockColor(a)}`}
            style={{ top: blockTop(a), height: blockHeight(a) }}
          >
            <span className="block truncate font-semibold">{a.customerName}</span>
            <span className="block truncate">{a.serviceName || ""}</span>
            <span className="mt-0.5 inline-block rounded-full bg-white/60 px-1 py-px text-[9px] dark:bg-black/30">{statusLabel(a)}</span>
            {a.room && <span className="block truncate text-[9px] opacity-80">غرفة: {a.room}</span>}
          </button>
        ))}
    </>
  );

  const renderDoctorColumn = (doc: TimelineResource) => (
    <div key={doc.doctorId} className="min-w-[170px] flex-1 border-l border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/40">
        <p className="truncate text-sm font-bold">{doc.doctorName}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{doc.specialty || doc.branchName || "—"}</p>
        {!doc.isAvailable && <span className="text-[10px] text-red-500 dark:text-red-400">أوقات غير محددة</span>}
      </div>
      <div className="relative overflow-hidden" style={{ height: dayHeight }}>
        {renderBlocks(appointmentsByDoctor[doc.doctorId] || [], true, (t) => openNewAppointment(doc, t))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="date" className={`${MODAL_INPUT_CLS} w-auto`} value={timelineDate} onChange={(e) => e.target.value && setTimelineDate(e.target.value)} />
        <button onClick={() => setTimelineDate(toDateStr(new Date()))} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">اليوم</button>
        <button onClick={() => setTimelineDate((d) => shiftDate(d, -1))} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">اليوم السابق</button>
        <button onClick={() => setTimelineDate((d) => shiftDate(d, 1))} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">اليوم التالي</button>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">جميع الفروع</option>
          {branches.filter((b) => b.isActive).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">جميع الخدمات</option>
          {services.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? "جاري التحميل..." : `${resources.length} طبيب، ${timeline?.appointments?.length || 0} موعد`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex min-w-max">
          <div className="sticky right-0 z-10 shrink-0 border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <div className="w-16 border-b border-gray-200 dark:border-gray-700" />
            <div className="flex flex-col" style={{ height: dayHeight }}>
              {timeSlots.map((t) => (
                <div
                  key={t}
                  className="border-b border-gray-200/70 pb-0.5 text-center text-[10px] text-gray-500 dark:border-gray-700/60 dark:text-gray-400"
                  style={{ height: SLOT_PX }}
                >
                  {toMinutes(t) % 60 === 0 ? t : ""}
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-10 text-gray-400 dark:text-gray-500">جاري التحميل...</div>
          ) : resources.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-10 text-gray-400 dark:text-gray-500">
              {branchId ? "لا توجد أطباء في هذا الفرع أو لا يوجد أطباء متاحون" : "لا توجد أطباء"}
            </div>
          ) : (
            <>
              {resources.map(renderDoctorColumn)}
              {unassigned.length > 0 && (
                <div className="min-w-[170px] flex-1 border-l border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-700 dark:bg-gray-700/40">
                    <p className="truncate text-sm font-bold">بدون طبيب</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">أي طبيب</p>
                  </div>
                  <div className="relative overflow-hidden" style={{ height: dayHeight }}>
                    {renderBlocks(unassigned, true, (t) => openNewAppointment(null, t))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalAppointment !== undefined && (
        <AppointmentModal
          appointment={modalAppointment}
          branches={branches}
          branchDoctors={doctors}
          services={services}
          patients={patients}
          onClose={() => setModalAppointment(undefined)}
          onSave={saveAppointment}
        />
      )}
    </div>
  );
}
