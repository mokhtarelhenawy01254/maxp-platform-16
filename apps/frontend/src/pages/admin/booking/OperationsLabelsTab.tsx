import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Tag, Printer, X, FileText, RefreshCw, Calendar, Building2 } from "lucide-react";
import {
  ExamLabel, MODAL_INPUT_CLS,
  api, fetchJson, getAuthHeaders,
} from "./shared";

export interface UnprintedLabel {
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

export interface PrintedLabel extends ExamLabel {
  patientName?: string | null;
  patientPhone?: string | null;
  serviceName?: string | null;
  room?: string | null;
  appointmentDate?: string | null;
  startTime?: string | null;
}

const LABEL_TYPE_MAP: Record<string, string> = { EXAM: "لاصق فحص", ENVELOPE: "لاصق مغلف" };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ar-EG")} ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

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

export default function OperationsLabelsTab() {
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
      // تجاهل فشل الفروع
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
      toast.success("تم تسجيل الطباعة بنجاح");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل طباعة اللاصق");
    } finally {
      setPrintingId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Control Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 font-mono`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <select
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border/70 rounded-lg bg-background hover:bg-muted/60 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Unprinted Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            لاصقات غير مطبوعة
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {unprinted.length}
            </span>
          </h3>
        </div>

        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs uppercase font-medium">
                  {["المريض", "الهاتف", "الخدمة", "الغرفة", "التاريخ", "الوقت", ""].map((h, i) => (
                    <th key={i} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">جاري التحميل...</td></tr>
                ) : unprinted.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد لاصقات غير مطبوعة
                  </td></tr>
                ) : unprinted.map((a, idx) => (
                  <tr key={`${a.appointmentId || "apt"}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{a.patientName || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground" dir="ltr">{a.patientPhone || "—"}</td>
                    <td className="py-2.5 px-3 text-foreground">{a.serviceName || "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{a.room || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{a.appointmentDate}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{a.startTime || "—"}</td>
                    <td className="py-2.5 px-3 text-left">
                      <button
                        onClick={() => handlePrintLabel(a)}
                        disabled={printingId === a.appointmentId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        {printingId === a.appointmentId ? "جاري..." : "طباعة"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printed Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            سجل اللاصقات المطبوعة
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
              {printed.length}
            </span>
          </h3>
        </div>

        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs uppercase font-medium">
                  {["المريض", "الهاتف", "النوع", "الخدمة", "وقت الطباعة", "المطبوع بواسطة"].map((h) => (
                    <th key={h} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">جاري التحميل...</td></tr>
                ) : printed.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد لاصقات مطبوعة اليوم
                  </td></tr>
                ) : printed.map((l, idx) => (
                  <tr key={`${l.id || "prt"}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{l.patientName || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground" dir="ltr">{l.patientPhone || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 text-xs rounded-md bg-muted border border-border/60 text-foreground">
                        {LABEL_TYPE_MAP[l.labelType] || l.labelType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground">{l.serviceName || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{formatDateTime(l.printedAt)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{l.printedBy || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Label Preview Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                لاصق {selected.patientName || ""}
              </h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border border-dashed border-border/80 rounded-xl p-4 text-center space-y-1.5 bg-muted/20">
              <p className="text-base font-bold text-foreground">{selected.patientName || "—"}</p>
              <p className="font-mono text-xs text-muted-foreground" dir="ltr">{selected.patientPhone || ""}</p>
              <p className="text-xs text-foreground">{selected.serviceName || ""} {selected.room ? "· " + selected.room : ""}</p>
              <p className="font-mono text-xs text-muted-foreground">{selected.appointmentDate} — {selected.startTime || ""}</p>
              <BarcodeSvg value={selected.ticketNumber || selected.accessionNumber || selected.appointmentId} svgRef={barcodeSvgRef} />
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground" dir="ltr">
                {selected.ticketNumber || selected.accessionNumber || selected.appointmentId}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openPrintWindow(selected, barcodeSvgRef.current?.outerHTML || null)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة اللاصق
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 border border-border/70 rounded-lg text-xs hover:bg-muted/50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
