import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  TagIcon, ClipboardDocumentListIcon, ArrowPathIcon, PrinterIcon,
  CheckIcon, MagnifyingGlassIcon, XMarkIcon, DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  ExamLabel, ReportDelivery, TransactionLog, MODAL_INPUT_CLS,
  api, fetchJson, getAuthHeaders,
} from "./shared";

type SubTab = "labels" | "deliveries" | "transactions";

const SUB_TABS: { id: SubTab; label: string; icon: typeof TagIcon }[] = [
  { id: "labels", label: "لاصقات", icon: TagIcon },
  { id: "deliveries", label: "تسليم التقارير", icon: ClipboardDocumentListIcon },
  { id: "transactions", label: "سجل الحركات", icon: ArrowPathIcon },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const LABEL_TYPE_MAP: Record<string, string> = { EXAM: "لاصق فحص", ENVELOPE: "لاصق مغلف" };

const DELIVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_READY: { label: "غير جاهز", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  READY: { label: "جاهز للتسليم", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  DELIVERED: { label: "تم التسليم", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
};

const PAID_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوع", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  PARTIAL: { label: "مسدد جزئياً", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  UNPAID: { label: "غير مدفوع", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const ENTITY_TYPE_LABEL: Record<string, string> = {
  PATIENT: "مريض", INVOICE: "فاتورة", PAYMENT: "دفعة", PAYBACK: "استرجاع", APPOINTMENT: "موعد",
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: "إنشاء", UPDATE: "تعديل", PAYMENT: "دفعة", PAYBACK: "استرجاع",
  DISCOUNT: "خصم", ADJUSTMENT: "تسوية", MERGE: "دمج",
};

interface UnprintedLabel {
  appointmentId: string;
  patientId?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  serviceName?: string | null;
  room?: string | null;
  ticketNumber?: string | null;
  accessionNumber?: string | null;
  appointmentDate: string;
  startTime?: string | null;
  status?: string | null;
  bookingStatus?: string | null;
  reportStatus?: string | null;
}

interface PrintedLabel extends ExamLabel {
  patientName?: string | null;
  patientPhone?: string | null;
  serviceName?: string | null;
  room?: string | null;
  appointmentDate?: string | null;
  startTime?: string | null;
}

interface DeliveryEntry extends ReportDelivery {
  patientName?: string | null;
  patientPhone?: string | null;
  serviceName?: string | null;
  room?: string | null;
  appointmentDate: string;
  startTime?: string | null;
  reportStatus?: string | null;
}

interface TransactionsResponse {
  items: TransactionLog[];
  total: number;
  page: number;
  limit: number;
}

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ar-EG")} ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatAmount = (v?: number | null) =>
  v === null || v === undefined ? "—" : `${v.toFixed(2)} ج.م`;

const badge = (map: Record<string, { label: string; color: string }>, key?: string | null) => {
  const meta = key ? map[key] : undefined;
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta?.color || ""}`}>{meta?.label || key || "—"}</span>;
};

const tableWrap = "bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto";
const tableBase = "w-full min-w-[760px]";
const thBase = "text-right py-3 px-4";
const theadCls = "border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm";
const rowCls = "border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm";
const emptyCls = "text-center py-12 text-gray-400 dark:text-gray-500";

const BarcodeSvg = ({ value, svgRef }: { value: string; svgRef: { current: SVGSVGElement | null } }) => {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import("jsbarcode" as string)) as { default?: unknown };
        const JsBarcode = (mod.default ?? mod) as (el: Element, v: string, o?: Record<string, unknown>) => void;
        if (svgRef.current && !cancelled) {
          JsBarcode(svgRef.current, value, { format: "CODE128", width: 1.6, height: 44, displayValue: false, margin: 0 });
        }
      } catch {
        // jsbarcode غير متاح — يعرض النص فقط
      }
    })();
    return () => { cancelled = true; };
  }, [value, svgRef]);
  return <svg ref={svgRef} className="mx-auto w-full max-w-[280px] h-12 mt-2" />;
};

const openPrintWindow = (label: UnprintedLabel, svgHtml: string | null) => {
  const w = window.open("", "_blank", "width=420,height=340");
  if (!w) {
    toast.error("تعذر فتح نافذة الطباعة");
    return;
  }
  w.document.write(
    `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>لاصق</title>` +
    `<style>body{font-family:Tahoma,Arial,sans-serif;padding:16px}@media print{.no-print{display:none}}` +
    `.label{border:2px dashed #888;border-radius:12px;padding:16px;text-align:center;max-width:340px;margin:0 auto}` +
    `.name{font-size:20px;font-weight:bold;margin:0}.sub{color:#555;font-size:13px;margin:4px 0}` +
    `.code{font-family:monospace;font-size:11px;color:#666;letter-spacing:1px;direction:ltr}` +
    `.btn{margin-top:16px;width:100%;padding:10px;font-size:14px;font-weight:bold;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}</style>` +
    `</head><body><div class="label"><h1 class="name">${label.patientName || "—"}</h1>` +
    `<p class="sub" dir="ltr">${label.patientPhone || ""}</p>` +
    `<p class="sub">${label.serviceName || ""} ${label.room ? "· " + label.room : ""}</p>` +
    `<p class="sub">${label.appointmentDate} — ${label.startTime || ""}</p>` +
    `${svgHtml || ""}<p class="code">${label.ticketNumber || label.accessionNumber || label.appointmentId}</p></div>` +
    `<button class="btn no-print" onclick="window.print()">طباعة</button>` +
    `</body></html>`
  );
  w.document.close();
  w.focus();
};

export default function OperationsPage() {
  const [tab, setTab] = useState<SubTab>("labels");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">العمليات</h2>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === "labels" && <LabelsTab />}
      {tab === "deliveries" && <DeliveriesTab />}
      {tab === "transactions" && <TransactionsTab />}
    </div>
  );
}

function LabelsTab() {
  const [date, setDate] = useState(todayStr());
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [unprinted, setUnprinted] = useState<UnprintedLabel[]>([]);
  const [printed, setPrinted] = useState<PrintedLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnprintedLabel | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const data = await fetchJson<{ id: string; name: string }[]>(api("branches"));
      setBranches(data || []);
    } catch {
      // تجاهل فشل تحميل الفروع
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (branchId) params.set("branchId", branchId);
      const [unprintedData, printedData] = await Promise.all([
        fetchJson<UnprintedLabel[]>(api(`operations/labels/unprinted?${params.toString()}`)),
        fetchJson<PrintedLabel[]>(api(`operations/labels/printed?date=${date}`)),
      ]);
      setUnprinted(unprintedData || []);
      setPrinted(printedData || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل جلب اللاصقات");
    } finally {
      setLoading(false);
    }
  }, [date, branchId]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { load(); }, [load]);

  const handlePrintLabel = useCallback(async (a: UnprintedLabel) => {
    setPrintingId(a.appointmentId);
    try {
      const label = await fetchJson<ExamLabel>(api("operations/labels"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ appointmentId: a.appointmentId }),
      });
      setUnprinted((prev) => prev.filter((x) => x.appointmentId !== a.appointmentId));
      setPrinted((prev) => [
        {
          id: label.id,
          appointmentId: label.appointmentId,
          patientId: label.patientId,
          labelType: label.labelType,
          printedAt: label.printedAt,
          printedBy: label.printedBy,
          patientName: a.patientName,
          patientPhone: a.patientPhone,
          serviceName: a.serviceName,
          room: a.room,
          appointmentDate: a.appointmentDate,
          startTime: a.startTime,
        },
        ...prev,
      ]);
      setSelected(a);
      toast.success("تم تسجيل الطباعة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل طباعة اللاصق");
    } finally {
      setPrintingId(null);
    }
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">التاريخ</label>
          <input type="date" className={`${MODAL_INPUT_CLS} text-sm py-1.5`} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الفرع</label>
          <select className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`} value={branchId}
            onChange={(e) => setBranchId(e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <button onClick={() => load()} disabled={loading}
          className="self-end px-3 py-2 text-sm border rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          تحديث
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          لاصقات غير مطبوعة
        </h3>
        <div className={tableWrap}>
          <table className={tableBase}>
            <thead>
              <tr className={theadCls}>
                {["المريض", "الهاتف", "الخدمة", "الغرفة", "التاريخ", "الوقت", ""].map((h) => (
                  <th key={h} className={thBase}>{h === "" ? "" : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={emptyCls}>جاري التحميل...</td></tr>
              ) : unprinted.length === 0 ? (
                <tr><td colSpan={7} className={emptyCls}>
                  <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  لا توجد لاصقات غير مطبوعة
                </td></tr>
              ) : unprinted.map((a) => (
                <tr key={a.appointmentId} className={rowCls}>
                  <td className="py-3 px-4 font-medium">{a.patientName || "—"}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400" dir="ltr">{a.patientPhone || "—"}</td>
                  <td className="py-3 px-4">{a.serviceName || "—"}</td>
                  <td className="py-3 px-4">{a.room || "—"}</td>
                  <td className="py-3 px-4">{a.appointmentDate}</td>
                  <td className="py-3 px-4">{a.startTime || "—"}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => handlePrintLabel(a)} disabled={printingId === a.appointmentId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                      <PrinterIcon className="w-3.5 h-3.5" />
                      {printingId === a.appointmentId ? "جاري..." : "طباعة"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          لاصقات مطبوعة
        </h3>
        <div className={tableWrap}>
          <table className={tableBase}>
            <thead>
              <tr className={theadCls}>
                {["المريض", "الهاتف", "النوع", "الخدمة", "وقت الطباعة", "المطبوع بواسطة"].map((h) => (
                  <th key={h} className={thBase}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={emptyCls}>جاري التحميل...</td></tr>
              ) : printed.length === 0 ? (
                <tr><td colSpan={6} className={emptyCls}>
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  لا توجد لاصقات مطبوعة
                </td></tr>
              ) : printed.map((l) => (
                <tr key={l.id} className={rowCls}>
                  <td className="py-3 px-4 font-medium">{l.patientName || "—"}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400" dir="ltr">{l.patientPhone || "—"}</td>
                  <td className="py-3 px-4">{LABEL_TYPE_MAP[l.labelType] || l.labelType}</td>
                  <td className="py-3 px-4">{l.serviceName || "—"}</td>
                  <td className="py-3 px-4">{formatDateTime(l.printedAt)}</td>
                  <td className="py-3 px-4">{l.printedBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <PrinterIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                لاصق {selected.patientName || ""}
              </h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center space-y-1">
              <p className="text-lg font-bold">{selected.patientName || "—"}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">{selected.patientPhone || ""}</p>
              <p className="text-sm">{selected.serviceName || ""} {selected.room ? "· " + selected.room : ""}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selected.appointmentDate} — {selected.startTime || ""}</p>
              <BarcodeSvg value={selected.ticketNumber || selected.accessionNumber || selected.appointmentId} svgRef={barcodeSvgRef} />
              <p className="text-[10px] tracking-widest text-gray-500 dark:text-gray-400" dir="ltr">
                {selected.ticketNumber || selected.accessionNumber || selected.appointmentId}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => openPrintWindow(selected, barcodeSvgRef.current?.outerHTML || null)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-semibold">
                <PrinterIcon className="w-4 h-4" />
                طباعة اللاصق
              </button>
              <button onClick={() => setSelected(null)} className="px-4 py-2 border rounded-lg text-sm dark:border-gray-600">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveriesTab() {
  const [date, setDate] = useState(todayStr());
  const [branchId, setBranchId] = useState("");
  const [paidStatus, setPaidStatus] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<DeliveryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const data = await fetchJson<{ id: string; name: string }[]>(api("branches"));
      setBranches(data || []);
    } catch {
      // تجاهل فشل تحميل الفروع
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (branchId) params.set("branchId", branchId);
      if (paidStatus) params.set("paidStatus", paidStatus);
      const data = await fetchJson<DeliveryEntry[]>(api(`operations/deliveries?${params.toString()}`));
      setItems(data || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل جلب تسليم التقارير");
    } finally {
      setLoading(false);
    }
  }, [date, branchId, paidStatus]);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { load(); }, [load]);

  const updateStatus = useCallback(async (d: DeliveryEntry, status: "ready" | "delivered") => {
    const actionId = d.id || d.appointmentId;
    setBusyId(actionId);
    try {
      await fetchJson(api(`operations/deliveries/${actionId}/${status}`), {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      toast.success(status === "ready" ? "تم تجهيز التقرير للتسليم" : "تم تسليم التقرير");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تحديث حالة التسليم");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">التاريخ</label>
          <input type="date" className={`${MODAL_INPUT_CLS} text-sm py-1.5`} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الفرع</label>
          <select className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`} value={branchId}
            onChange={(e) => setBranchId(e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">حالة السداد</label>
          <select className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`} value={paidStatus}
            onChange={(e) => setPaidStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(PAID_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={() => load()} disabled={loading}
          className="self-end px-3 py-2 text-sm border rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          تحديث
        </button>
      </div>

      <div className={tableWrap}>
        <table className={tableBase}>
          <thead>
            <tr className={theadCls}>
              {["المريض", "الهاتف", "الخدمة", "التاريخ", "الوقت", "الحالة", "السداد", ""].map((h) => (
                <th key={h} className={thBase}>{h === "" ? "" : h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={emptyCls}>جاري التحميل...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className={emptyCls}>
                <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                لا توجد تسليمات
              </td></tr>
            ) : items.map((d) => {
              const busy = busyId === (d.id || d.appointmentId);
              return (
                <tr key={d.appointmentId} className={rowCls}>
                  <td className="py-3 px-4 font-medium">{d.patientName || "—"}</td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400" dir="ltr">{d.patientPhone || "—"}</td>
                  <td className="py-3 px-4">{d.serviceName || "—"}</td>
                  <td className="py-3 px-4">{d.appointmentDate}</td>
                  <td className="py-3 px-4">{d.startTime || "—"}</td>
                  <td className="py-3 px-4">{badge(DELIVERY_STATUS_MAP, d.status)}</td>
                  <td className="py-3 px-4">{badge(PAID_STATUS_MAP, d.paidStatus)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {d.status === "NOT_READY" && (
                        <button onClick={() => updateStatus(d, "ready")} disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50">
                          تجهيز
                        </button>
                      )}
                      {d.status !== "DELIVERED" && (
                        <button onClick={() => updateStatus(d, "delivered")} disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50">
                          <CheckIcon className="w-3.5 h-3.5" />
                          تسليم
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionsTab() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entityType, setEntityType] = useState("");
  const [items, setItems] = useState<TransactionLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (entityType) params.set("entityType", entityType);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const data = await fetchJson<TransactionsResponse>(api(`operations/transactions?${params.toString()}`));
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل جلب سجل الحركات");
    } finally {
      setLoading(false);
    }
  }, [from, to, entityType, search, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="بحث في الوصف أو الدافع..."
            className={`${MODAL_INPUT_CLS} pr-8 w-48 sm:w-64 text-sm`}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">من</label>
          <input type="date" className={`${MODAL_INPUT_CLS} text-sm py-1.5`} value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">إلى</label>
          <input type="date" className={`${MODAL_INPUT_CLS} text-sm py-1.5`} value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">نوع الكيان</label>
          <select className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`} value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">الكل</option>
            {Object.entries(ENTITY_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={() => setPage(1)} disabled={loading}
          className="px-3 py-2 text-sm border rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          بحث
        </button>
      </div>

      <div className={tableWrap}>
        <table className={tableBase}>
          <thead>
            <tr className={theadCls}>
              {["التاريخ", "النوع", "الكيان", "الإجراء", "الوصف", "المبلغ", "الدافع", "المستخدم"].map((h) => (
                <th key={h} className={thBase}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={emptyCls}>جاري التحميل...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className={emptyCls}>
                <ArrowPathIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                لا توجد حركات
              </td></tr>
            ) : items.map((t) => (
              <tr key={t.id} className={rowCls}>
                <td className="py-3 px-4 whitespace-nowrap text-xs">{formatDateTime(t.createdAt)}</td>
                <td className="py-3 px-4">{ENTITY_TYPE_LABEL[t.entityType] || t.entityType}</td>
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400" dir="ltr">{t.entityId}</td>
                <td className="py-3 px-4">{ACTION_LABEL[t.action] || t.action}</td>
                <td className="py-3 px-4">{t.description || "—"}</td>
                <td className="py-3 px-4 whitespace-nowrap">{formatAmount(t.amount)}</td>
                <td className="py-3 px-4">{t.payer || "—"}</td>
                <td className="py-3 px-4">{t.userName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
          <span>إجمالي {total} حركة — الصفحة {page} من {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs sm:text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
              السابق
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs sm:text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
