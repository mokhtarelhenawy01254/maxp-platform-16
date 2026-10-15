import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, CalendarDays, CheckCircle2, ClipboardList, FileCheck2, Loader2, RefreshCw, Send, Stethoscope, UserRound, XCircle, Clock } from "lucide-react";
import { BookingAppointment, BookingBranch, BookingDoctor, BOOKING_STATUS_MAP, REPORT_STATUS_MAP, api, fetchJson } from "./shared";
import WorkflowStatusBadge, { NEXT_BOOKING_STATUS, NEXT_REPORT_STATUS, LEGACY_TO_BOOKING } from "./WorkflowStatusBadge";

const SUB_TABS: { id: SubTab; label: string; icon: typeof CalendarDays }[] = [
  { id: "reception", label: "الاستقبال", icon: UserRound },
  { id: "doctor", label: "طابور الطبيب", icon: Stethoscope },
  { id: "reports", label: "التقارير الطبية", icon: ClipboardList },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("reception");
  const [date, setDate] = useState(todayStr);
  const [rows, setRows] = useState<WorkflowRow[]>([]);
  const [branches, setBranches] = useState<BookingBranch[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [branchId, setBranchId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<BookingBranch[]>(api("branches"))
      .then(setBranches)
      .catch(() => {});
    fetchJson<BookingDoctor[]>(api("doctors"))
      .then(setDoctors)
      .catch(() => {});
  }, []);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "reception") {
        const q = new URLSearchParams({ date });
        if (branchId) q.set("branchId", branchId);
        setRows(await fetchJson<WorkflowRow[]>(api(`workflow/queues/reception?${q.toString()}`)));
      } else if (activeTab === "doctor") {
        if (!doctorId) {
          setRows([]);
          return;
        }
        const q = new URLSearchParams({ date, doctorId });
        setRows(await fetchJson<WorkflowRow[]>(api(`workflow/queues/doctor?${q.toString()}`)));
      } else {
        const q = new URLSearchParams({ date });
        setRows(await fetchJson<WorkflowRow[]>(api(`workflow/queues/reports?${q.toString()}`)));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل تحميل البيانات";
      if (opts?.quiet) { console.error("refresh workflow queue", e); return; }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, date, branchId, doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const [busyId, setBusyId] = useState<string | null>(null);

  const action = useCallback(
    async (path: string, body: Record<string, unknown>, successMsg: string, rowId: string) => {
      if (busyId === rowId) return;
      setBusyId(rowId);
      try {
        await fetchJson(api(path), { method: "PUT", body: JSON.stringify(body) });
        toast.success(successMsg);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشلت العملية");
        setBusyId(null);
        return;
      }
      await load({ quiet: true });
      setBusyId(null);
    },
    [load, busyId],
  );

  const effectiveBooking = (row: WorkflowRow) => row.bookingStatus || LEGACY_TO_BOOKING[row.status] || "UNCONFIRMED";
  const effectiveReport = (row: WorkflowRow) => row.reportStatus || "PENDING";

  const nextBooking = (row: WorkflowRow) => NEXT_BOOKING_STATUS[effectiveBooking(row)];
  const nextReport = (row: WorkflowRow) => NEXT_REPORT_STATUS[effectiveReport(row)];

  const bookingLabel = (s?: string) => (s ? BOOKING_STATUS_MAP[s]?.label : undefined);
  const reportLabel = (s?: string) => (s ? REPORT_STATUS_MAP[s]?.label : undefined);

  const assignDoctor = (row: WorkflowRow, docId: string) => {
    if (!docId) return;
    void action(`workflow/appointments/${row.id}/assign-doctor`, { doctorId: docId }, "تم تعيين الطبيب", row.id);
  };

  const advanceBooking = (row: WorkflowRow) => {
    const next = nextBooking(row);
    if (!next) return;
    void action(`workflow/appointments/${row.id}/booking-status`, { status: next }, `تم الانتقال إلى ${bookingLabel(next) || next}`, row.id);
  };

  const cancelBooking = (row: WorkflowRow) => {
    void action(`workflow/appointments/${row.id}/booking-status`, { status: "CANCELLED" }, "تم إلغاء الموعد", row.id);
  };

  const missBooking = (row: WorkflowRow) => {
    void action(`workflow/appointments/${row.id}/booking-status`, { status: "MISSED" }, "تم تسجيل عدم الحضور", row.id);
  };

  const advanceReport = (row: WorkflowRow) => {
    const next = nextReport(row);
    if (!next) return;
    void action(`workflow/appointments/${row.id}/report-status`, { status: next }, `تم الانتقال إلى ${reportLabel(next) || next}`, row.id);
  };

  const toggleDeliveredWithoutReport = (row: WorkflowRow) => {
    void action(
      `workflow/appointments/${row.id}/delivered-without-report`,
      { value: !row.deliveredWithoutReport },
      "تم تحديث التسليم بدون تقرير",
      row.id,
    );
  };

  const toggleResultDelivered = (row: WorkflowRow) => {
    void action(
      `workflow/appointments/${row.id}/result-delivered`,
      { value: !row.resultDelivered },
      "تم تحديث تسليم النتيجة",
      row.id,
    );
  };

  const rowPatientName = (row: WorkflowRow) => row.patient?.name || row.customerName || "—";
  const rowPatientPhone = (row: WorkflowRow) => row.patient?.phone || row.customerPhone || "";
  const rowDoctorName = (row: WorkflowRow) => row.assignedDoctorName || row.doctorName || "—";

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">سير عمل الكشف</h2>
          <p className="text-xs text-muted-foreground">متابعة مراحل الكشف من الاستقبال إلى غرفة الطبيب وإصدار التقارير</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarDays className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
            <input
              type="date"
              className="border border-border/70 rounded-xl pr-8 pl-3 py-1.5 text-xs font-mono tabular-nums bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 text-foreground hover:bg-muted text-xs font-medium rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Segmented Queue Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-1.5 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Queue Filter */}
        <div className="flex items-center gap-2">
          {activeTab === "reception" && (
            <select
              className="border border-border/70 rounded-lg px-2.5 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {activeTab === "doctor" && (
            <select
              className="border border-border/70 rounded-lg px-2.5 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">اختر الطبيب...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{`${d.title || ""} ${d.name || ""}`.trim()}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {activeTab === "doctor" && !doctorId && (
        <div className="bg-card border border-border/70 rounded-xl py-12 text-center text-muted-foreground">
          <Stethoscope className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs">اختر طبيباً لعرض قائمة المرضى المنتظرين في الطابور</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-center text-xs">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl py-12 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs">لا توجد مواعيد في هذا الطابور للتاريخ المحدد</p>
        </div>
      ) : (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-[11px] font-medium">
                  {["العميل / المريض", "الخدمة", "الوقت", activeTab === "doctor" ? "التشخيص" : "الطبيب المعين", "حالة الحجز", "حالة التقرير", "إجراءات الطابور"].map((h) => (
                    <th key={h} className="text-right py-2.5 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-foreground">{rowPatientName(row)}</span>
                      {rowPatientPhone(row) && (
                        <span className="block text-[10px] text-muted-foreground font-mono tabular-nums" dir="ltr">
                          {rowPatientPhone(row)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-foreground">{row.serviceName || "—"}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-foreground font-medium" dir="ltr">
                      {row.startTime || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-foreground">
                      {activeTab === "doctor" ? (
                        <span>{row.diagnosis || "—"}</span>
                      ) : (
                        rowDoctorName(row)
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <WorkflowStatusBadge status={row.bookingStatus || LEGACY_TO_BOOKING[row.status]} type="booking" />
                    </td>
                    <td className="py-2.5 px-3">
                      <WorkflowStatusBadge status={row.reportStatus} type="report" />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        {activeTab === "reception" && doctors.length > 0 && (
                          <select
                            className="w-32 border border-border/70 rounded-lg px-2 py-0.5 text-[11px] bg-background text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                            value={row.assignedDoctorId || row.doctorId || ""}
                            disabled={busyId === row.id}
                            onChange={(e) => assignDoctor(row, e.target.value)}
                          >
                            <option value="">تعيين طبيب...</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>{`${d.title || ""} ${d.name || ""}`.trim()}</option>
                            ))}
                          </select>
                        )}
                        {nextBooking(row) && (
                          <button
                            onClick={() => advanceBooking(row)}
                            disabled={busyId === row.id}
                            title={`الخطوة التالية: ${bookingLabel(nextBooking(row)) || nextBooking(row)}`}
                            className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {activeTab !== "reception" && nextReport(row) && (
                          <button
                            onClick={() => advanceReport(row)}
                            disabled={busyId === row.id}
                            title={`التقرير التالي: ${reportLabel(nextReport(row)) || nextReport(row)}`}
                            className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-40 transition-colors"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {activeTab === "reception" && (
                          <button
                            onClick={() => toggleDeliveredWithoutReport(row)}
                            disabled={busyId === row.id}
                            title={row.deliveredWithoutReport ? "إلغاء التسليم بدون تقرير" : "تسليم بدون تقرير"}
                            className={`p-1 rounded-lg border transition-colors ${
                              row.deliveredWithoutReport
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-muted text-muted-foreground border-border/70 hover:bg-muted/80"
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {activeTab !== "doctor" && (
                          <button
                            onClick={() => toggleResultDelivered(row)}
                            disabled={busyId === row.id}
                            title={row.resultDelivered ? "إلغاء تسليم النتيجة" : "تسليم النتيجة"}
                            className={`p-1 rounded-lg border transition-colors ${
                              row.resultDelivered
                                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                                : "bg-muted text-muted-foreground border-border/70 hover:bg-muted/80"
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => missBooking(row)}
                          disabled={busyId === row.id}
                          title="تسجيل عدم الحضور"
                          className="p-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => cancelBooking(row)}
                          disabled={busyId === row.id}
                          title="إلغاء الموعد"
                          className="p-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 disabled:opacity-40 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
