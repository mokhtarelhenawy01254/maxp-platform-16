import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Search, RefreshCw, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import {
  TransactionLog, MODAL_INPUT_CLS,
  api, fetchJson,
} from "./shared";

interface TransactionsResponse {
  items: TransactionLog[];
  total: number;
  page: number;
  limit: number;
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  PATIENT: "مريض", INVOICE: "فاتورة", PAYMENT: "دفعة", PAYBACK: "استرجاع", APPOINTMENT: "موعد",
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: "إنشاء", UPDATE: "تعديل", PAYMENT: "دفعة", PAYBACK: "استرجاع",
  DISCOUNT: "خصم", ADJUSTMENT: "تسوية", MERGE: "دمج",
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ar-EG")} ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatAmount = (v?: number | null) =>
  v === null || v === undefined ? "—" : `${v.toFixed(2)} ج.م`;

export default function OperationsTransactionsTab() {
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
    <div className="space-y-6">
      {/* Search & Filter Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث في الوصف أو الدافع..."
              className={`${MODAL_INPUT_CLS} pr-8 w-48 sm:w-64 text-sm py-1.5`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 font-mono`}
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 font-mono`}
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <select
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 cursor-pointer`}
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            >
              <option value="">كل الكيانات</option>
              {Object.entries(ENTITY_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => setPage(1)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border/70 rounded-lg bg-background hover:bg-muted/60 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Transactions Table Surface */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            سجل الحركات والتدقيق
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
              {total}
            </span>
          </h3>
        </div>

        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs uppercase font-medium">
                  {["التاريخ", "النوع", "الكيان", "الإجراء", "الوصف", "المبلغ", "الدافع", "المستخدم"].map((h) => (
                    <th key={h} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">جاري التحميل...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد حركات مسجلة
                  </td></tr>
                ) : items.map((t, idx) => (
                  <tr key={`${t.id || "tx"}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                    <td className="py-2.5 px-3 text-foreground font-medium">{ENTITY_TYPE_LABEL[t.entityType] || t.entityType}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground" dir="ltr">{t.entityId}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted border border-border/60">
                        {ACTION_LABEL[t.action] || t.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground">{t.description || "—"}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-xs font-semibold whitespace-nowrap">{formatAmount(t.amount)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{t.payer || "—"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{t.userName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {total > limit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-card border border-border/70 rounded-xl text-xs text-muted-foreground">
            <span>إجمالي <strong className="font-mono text-foreground">{total}</strong> حركة — الصفحة <strong className="font-mono text-foreground">{page}</strong> من <strong className="font-mono text-foreground">{totalPages}</strong></span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border/70 rounded-lg disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                السابق
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border/70 rounded-lg disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                التالي
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
