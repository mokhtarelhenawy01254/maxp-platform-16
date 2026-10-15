import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Check, RefreshCw, Calendar, Building2, CreditCard } from "lucide-react";
import {
  ReportDelivery, MODAL_INPUT_CLS,
  api, fetchJson, getAuthHeaders,
} from "./shared";

export interface DeliveryEntry extends ReportDelivery {
  patientName?: string | null;
  patientPhone?: string | null;
  serviceName?: string | null;
  room?: string | null;
  appointmentDate: string;
  startTime?: string | null;
  reportStatus?: string | null;
}

const DELIVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_READY: { label: "غير جاهز", color: "bg-muted text-muted-foreground border-border/70" },
  READY: { label: "جاهز للتسليم", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  DELIVERED: { label: "تم التسليم", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const PAID_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوع", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  PARTIAL: { label: "مسدد جزئياً", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  UNPAID: { label: "غير مدفوع", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const badge = (map: Record<string, { label: string; color: string }>, key?: string | null) => {
  const meta = key ? map[key] : undefined;
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs whitespace-nowrap border font-medium ${meta?.color || "bg-muted text-muted-foreground border-border/60"}`}>
      {meta?.label || key || "—"}
    </span>
  );
};

export default function OperationsDeliveriesTab() {
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
      // ignore
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
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <select
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`}
              value={paidStatus}
              onChange={(e) => setPaidStatus(e.target.value)}
            >
              <option value="">كل حالات السداد</option>
              {Object.entries(PAID_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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

      {/* Deliveries Table Surface */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            قائمة تسليم التقارير
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
              {items.length}
            </span>
          </h3>
        </div>

        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs uppercase font-medium">
                  {["المريض", "الهاتف", "الخدمة", "التاريخ", "الوقت", "الحالة", "السداد", ""].map((h, i) => (
                    <th key={i} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">جاري التحميل...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد تقارير للتسليم اليوم
                  </td></tr>
                ) : items.map((d, idx) => {
                  const busy = busyId === (d.id || d.appointmentId);
                  return (
                    <tr key={`${d.id || d.appointmentId || "del"}-${idx}`} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-foreground">{d.patientName || "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground" dir="ltr">{d.patientPhone || "—"}</td>
                      <td className="py-2.5 px-3 text-foreground">{d.serviceName || "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-xs">{d.appointmentDate}</td>
                      <td className="py-2.5 px-3 font-mono text-xs">{d.startTime || "—"}</td>
                      <td className="py-2.5 px-3">{badge(DELIVERY_STATUS_MAP, d.status)}</td>
                      <td className="py-2.5 px-3">{badge(PAID_STATUS_MAP, d.paidStatus)}</td>
                      <td className="py-2.5 px-3 text-left">
                        <div className="flex items-center gap-1.5 justify-end">
                          {d.status === "NOT_READY" && (
                            <button
                              onClick={() => updateStatus(d, "ready")}
                              disabled={busy}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-lg text-xs font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-50"
                            >
                              تجهيز
                            </button>
                          )}
                          {d.status !== "DELIVERED" && (
                            <button
                              onClick={() => updateStatus(d, "delivered")}
                              disabled={busy}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
}
