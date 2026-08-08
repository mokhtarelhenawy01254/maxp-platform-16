import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, CalendarDays, CheckCircle2, ClipboardList, FileCheck2, Loader2, RefreshCw, Send, Stethoscope, UserRound, XCircle } from "lucide-react";
import { BookingAppointment, BookingBranch, BookingDoctor, BOOKING_STATUS_MAP, MODAL_INPUT_CLS, REPORT_STATUS_MAP, api, fetchJson } from "./shared";
import WorkflowStatusBadge from "./WorkflowStatusBadge";

type SubTab = "reception" | "doctor" | "reports";

interface WorkflowRow extends BookingAppointment {
  patient?: { id: string; name: string; phone?: string } | null;
  doctorName?: string;
  assignedDoctorName?: string;
  branchName?: string;
}

const NEXT_BOOKING_STATUS: Record<string, string> = {
  UNCONFIRMED: "CONFIRMED",
  CONFIRMED: "CHECKED_IN",
  CHECKED_IN: "PROCEDURE_STARTED",
  PROCEDURE_STARTED: "PROCEDURE_COMPLETED",
  PROCEDURE_COMPLETED: "CHECKED_OUT",
};

const NEXT_REPORT_STATUS: Record<string, string> = {
  PENDING: "NOTES_IN_PROGRESS",
  NOTES_IN_PROGRESS: "NOTES_COMPLETED",
  NOTES_COMPLETED: "UNDER_REVIEW",
  UNDER_REVIEW: "APPROVED",
};

const LEGACY_TO_BOOKING: Record<string, string> = {
  pending: "UNCONFIRMED",
  confirmed: "CONFIRMED",
  completed: "CHECKED_OUT",
  cancelled: "CANCELLED",
  no_show: "MISSED",
};

const SUB_TABS: { id: SubTab; label: string; icon: typeof CalendarDays }[] = [
  { id: "reception", label: "استقبال", icon: UserRound },
  { id: "doctor", label: "طابور الطبيب", icon: Stethoscope },
  { id: "reports", label: "التقارير", icon: ClipboardList },
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

  const load = useCallback(async () => {
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
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, date, branchId, doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const action = useCallback(
    async (path: string, body: Record<string, unknown>, successMsg: string) => {
      try {
        await fetchJson(api(path), { method: "PUT", body: JSON.stringify(body) });
        toast.success(successMsg);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشلت العملية");
      }
    },
    [load],
  );

  const effectiveBooking = (row: WorkflowRow) => row.bookingStatus || LEGACY_TO_BOOKING[row.status] || "UNCONFIRMED";
  const effectiveReport = (row: WorkflowRow) => row.reportStatus || "PENDING";

  const nextBooking = (row: WorkflowRow) => NEXT_BOOKING_STATUS[effectiveBooking(row)];
  const nextReport = (row: WorkflowRow) => NEXT_REPORT_STATUS[effectiveReport(row)];

  const bookingLabel = (s?: string) => (s ? BOOKING_STATUS_MAP[s]?.label : undefined);
  const reportLabel = (s?: string) => (s ? REPORT_STATUS_MAP[s]?.label : undefined);

  const assignDoctor = (row: WorkflowRow, docId: string) => {
    if (!docId) return;
    void action(`workflow/appointments/${row.id}/assign-doctor`, { doctorId: docId }, "تم تعيين الطبيب");
  };

  const advanceBooking = (row: WorkflowRow) => {
    const next = nextBooking(row);
    if (!next) return;
    void action(`workflow/appointments/${row.id}/booking-status`, { status: next }, `تم الانتقال إلى ${bookingLabel(next) || next}`);
  };

  const cancelBooking = (row: WorkflowRow) => {
    void action(`workflow/appointments/${row.id}/booking-status`, { status: "CANCELLED" }, "تم إلغاء الموعد");
  };

  const missBooking = (row: WorkflowRow) => {
    void action(`workflow/appointments/${row.id}/booking-status`, { status: "MISSED" }, "تم تسجيل عدم الحضور");
  };

  const advanceReport = (row: WorkflowRow) => {
    const next = nextReport(row);
    if (!next) return;
    void action(`workflow/appointments/${row.id}/report-status`, { status: next }, `تم الانتقال إلى ${reportLabel(next) || next}`);
  };

  const toggleDeliveredWithoutReport = (row: WorkflowRow) => {
    void action(
      `workflow/appointments/${row.id}/delivered-without-report`,
      { value: !row.deliveredWithoutReport },
      "تم تحديث التسليم بدون تقرير",
    );
  };

  const toggleResultDelivered = (row: WorkflowRow) => {
    void action(
      `workflow/appointments/${row.id}/result-delivered`,
      { value: !row.resultDelivered },
      "تم تحديث تسليم النتيجة",
    );
  };

  const rowPatientName = (row: WorkflowRow) => row.patient?.name || row.customerName || "—";
  const rowPatientPhone = (row: WorkflowRow) => row.patient?.phone || row.customerPhone || "";
  const rowDoctorName = (row: WorkflowRow) => row.assignedDoctorName || row.doctorName || "—";

  const actionBtn =
    "p-1.5 rounded text-white disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">سير عمل الكشف</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <CalendarDays className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} pr-9 w-44`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "reception" && (
        <div className="flex flex-wrap gap-3 mb-4">
          <select className={MODAL_INPUT_CLS + " w-56"} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {activeTab === "doctor" && (
        <div className="flex flex-wrap gap-3 mb-4">
          <select className={MODAL_INPUT_CLS + " w-56"} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">اختر الطبيب...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{`${d.title || ""} ${d.name || ""}`.trim()}</option>
            ))}
          </select>
        </div>
      )}

      {activeTab === "doctor" && !doctorId && (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">اختر طبيباً لعرض قائمة الكشوف</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center py-12 text-red-500">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                {["المريض", "الخدمة", "الوقت", activeTab === "doctor" ? "التشخيص" : "الطبيب", "حالة الحجز", "حالة التقرير", "إجراءات"].map((h) => (
                  <th key={h} className="text-right py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <td className="py-3 px-4">
                    <span className="font-medium">{rowPatientName(row)}</span>
                    {rowPatientPhone(row) && <span className="block text-xs text-gray-400 dark:text-gray-500" dir="ltr">{rowPatientPhone(row)}</span>}
                  </td>
                  <td className="py-3 px-4">{row.serviceName || "—"}</td>
                  <td className="py-3 px-4" dir="ltr">{row.startTime || ""}</td>
                  <td className="py-3 px-4">
                    {activeTab === "doctor" ? (
                      <span>{row.diagnosis || "—"}</span>
                    ) : (
                      rowDoctorName(row)
                    )}
                  </td>
                  <td className="py-3 px-4"><WorkflowStatusBadge status={row.bookingStatus || LEGACY_TO_BOOKING[row.status]} type="booking" /></td>
                  <td className="py-3 px-4"><WorkflowStatusBadge status={row.reportStatus} type="report" /></td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      {activeTab === "reception" && doctors.length > 0 && (
                        <select
                          className="w-36 border rounded-lg px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                          value={row.assignedDoctorId || row.doctorId || ""}
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
                          title={`الخطوة التالية: ${bookingLabel(nextBooking(row)) || nextBooking(row)}`}
                          className={`${actionBtn} bg-blue-600 hover:bg-blue-700`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {activeTab !== "reception" && nextReport(row) && (
                        <button
                          onClick={() => advanceReport(row)}
                          title={`التقرير التالي: ${reportLabel(nextReport(row)) || nextReport(row)}`}
                          className={`${actionBtn} bg-indigo-600 hover:bg-indigo-700`}
                        >
                          <FileCheck2 className="w-4 h-4" />
                        </button>
                      )}
                      {activeTab === "reception" && (
                        <button
                          onClick={() => toggleDeliveredWithoutReport(row)}
                          title={row.deliveredWithoutReport ? "إلغاء التسليم بدون تقرير" : "تسليم بدون تقرير"}
                          className={`${actionBtn} ${row.deliveredWithoutReport ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-500 hover:bg-gray-600"}`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {activeTab !== "doctor" && (
                        <button
                          onClick={() => toggleResultDelivered(row)}
                          title={row.resultDelivered ? "إلغاء تسليم النتيجة" : "تسليم النتيجة"}
                          className={`${actionBtn} ${row.resultDelivered ? "bg-teal-600 hover:bg-teal-700" : "bg-gray-500 hover:bg-gray-600"}`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => missBooking(row)}
                        title="لم يحضر"
                        className={`${actionBtn} bg-orange-500 hover:bg-orange-600`}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => cancelBooking(row)}
                        title="إلغاء"
                        className={`${actionBtn} bg-red-500 hover:bg-red-600`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
