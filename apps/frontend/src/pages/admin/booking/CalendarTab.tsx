import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, Users } from "lucide-react";
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
  pending: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
  confirmed: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  checked_in: "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300",
  procedure_started: "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
  procedure_completed: "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300",
  checked_out: "bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-300",
  completed: "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300",
  cancelled: "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
  missed: "bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300",
  no_show: "bg-muted border-border/70 text-muted-foreground",
};

const blockColor = (a: BookingAppointment): string =>
  BLOCK_COLORS[(a.bookingStatus || a.status || "").toLowerCase()] ||
  "bg-muted border-border/70 text-muted-foreground";

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
          className="absolute inset-x-0 cursor-pointer border-b border-border/40 hover:bg-primary/5 transition-colors"
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
            className={`absolute inset-x-1 z-[5] overflow-hidden rounded-md border px-1.5 py-0.5 text-right text-[11px] leading-tight transition-transform hover:scale-[1.01] shadow-xs ${blockColor(a)}`}
            style={{ top: blockTop(a), height: blockHeight(a) }}
          >
            <span className="block truncate font-bold">{a.customerName}</span>
            <span className="block truncate text-[10px] opacity-90">{a.serviceName || ""}</span>
            <span className="mt-0.5 inline-block rounded-full bg-background/60 px-1 py-px text-[9px] font-medium font-mono tabular-nums">{statusLabel(a)}</span>
            {a.room && <span className="block truncate text-[9px] opacity-75">غرفة: {a.room}</span>}
          </button>
        ))}
    </>
  );

  const renderDoctorColumn = (doc: TimelineResource) => (
    <div key={doc.doctorId} className="min-w-[170px] flex-1 border-l border-border/70">
      <div className="border-b border-border/70 bg-muted/40 px-2.5 py-2">
        <p className="truncate text-xs font-bold text-foreground">{doc.doctorName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{doc.specialty || doc.branchName || "—"}</p>
        {!doc.isAvailable && <span className="text-[10px] text-destructive">أوقات غير محددة</span>}
      </div>
      <div className="relative overflow-hidden" style={{ height: dayHeight }}>
        {renderBlocks(appointmentsByDoctor[doc.doctorId] || [], true, (t) => openNewAppointment(doc, t))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} w-auto text-xs sm:text-sm font-mono tabular-nums`}
              value={timelineDate}
              onChange={(e) => e.target.value && setTimelineDate(e.target.value)}
            />
          </div>
          <button
            onClick={() => setTimelineDate(toDateStr(new Date()))}
            className="flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs sm:text-sm font-medium hover:bg-muted/60 transition-colors shadow-sm"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <span>اليوم</span>
          </button>
          <div className="flex items-center gap-1 border border-border/70 rounded-lg p-0.5 bg-card shadow-sm">
            <button
              onClick={() => setTimelineDate((d) => shiftDate(d, -1))}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="اليوم السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTimelineDate((d) => shiftDate(d, 1))}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="اليوم التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <select
            className={`${MODAL_INPUT_CLS} w-auto text-xs sm:text-sm`}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">جميع الفروع</option>
            {branches.filter((b) => b.isActive).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            className={`${MODAL_INPUT_CLS} w-auto text-xs sm:text-sm`}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">جميع الخدمات</option>
            {services.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono tabular-nums">
            {loading ? "جاري التحميل..." : `${resources.length} طبيب · ${timeline?.appointments?.length || 0} موعد`}
          </span>
        </div>
      </div>

      {/* Timeline Surface */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex min-w-max">
          <div className="sticky right-0 z-10 shrink-0 border-l border-border/70 bg-muted/40">
            <div className="w-16 border-b border-border/70 h-9" />
            <div className="flex flex-col" style={{ height: dayHeight }}>
              {timeSlots.map((t) => (
                <div
                  key={t}
                  className="border-b border-border/50 pb-0.5 text-center text-[10px] font-mono tabular-nums text-muted-foreground"
                  style={{ height: SLOT_PX }}
                >
                  {toMinutes(t) % 60 === 0 ? t : ""}
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-12 text-xs text-muted-foreground">
              جاري تحميل الجدول الزمني...
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-xs text-muted-foreground">
              <Users className="w-8 h-8 opacity-40 mb-2 text-primary" />
              <p>{branchId ? "لا توجد أطباء متاحون في هذا الفرع" : "لا يوجد أطباء مسجلون في الجدول"}</p>
            </div>
          ) : (
            <>
              {resources.map(renderDoctorColumn)}
              {unassigned.length > 0 && (
                <div className="min-w-[170px] flex-1 border-l border-border/70">
                  <div className="border-b border-border/70 bg-muted/40 px-2.5 py-2">
                    <p className="truncate text-xs font-bold text-foreground">بدون طبيب محدد</p>
                    <p className="truncate text-[11px] text-muted-foreground">موعد عام</p>
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
