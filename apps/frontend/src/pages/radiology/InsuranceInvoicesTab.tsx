import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Banknote } from "lucide-react";
import { api, bookingApi, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface InsuranceCompany {
  id: string;
  name: string;
  isActive?: boolean;
}

interface InsuranceInvoiceItem {
  id: string;
  studyId: string;
  patientName: string;
  examTypeName?: string;
  amount: number;
  createdAt: string;
}

interface InsuranceInvoice {
  id: string;
  invoiceNumber?: string;
  insuranceCompanyId: string;
  insuranceCompanyName?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  periodFrom?: string;
  periodTo?: string;
  notes?: string;
  createdAt: string;
  items?: InsuranceInvoiceItem[];
}

interface StudyOption {
  id: string;
  patientName: string;
  examTypeName?: string;
  insuranceCompanyId?: string | null;
  createdAt?: string;
}

interface InvoiceListResponse {
  items: InsuranceInvoice[];
  total: number;
  page: number;
  limit: number;
}

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "مفتوحة", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  PARTIAL: { label: "مسدد جزئياً", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  PAID: { label: "مسدد بالكامل", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

const fmtMoney = (n?: number) => `${Number(n ?? 0).toFixed(2)} ج`;

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");

export default function InsuranceInvoicesTab() {
  const [entities, setEntities] = useState<InsuranceCompany[]>([]);
  const [invoices, setInvoices] = useState<InsuranceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    insuranceCompanyId: "",
    periodFrom: "",
    periodTo: "",
    notes: "",
    studyIds: [] as string[],
  });
  const [studies, setStudies] = useState<StudyOption[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<InsuranceInvoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "" });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchJson<InvoiceListResponse>(api("insurance-invoices"));
      setInvoices(data?.items || []);
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "فشل تحميل فواتير التأمين");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntities = useCallback(async () => {
    try {
      const data = await fetchJson<InsuranceCompany[]>(bookingApi("insurance-companies"));
      setEntities(Array.isArray(data) ? data : []);
    } catch {
      setEntities([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadEntities();
  }, [load, loadEntities]);

  const openCreate = async () => {
    setCreateForm({ insuranceCompanyId: "", periodFrom: "", periodTo: "", notes: "", studyIds: [] });
    setCreateOpen(true);
    setStudiesLoading(true);
    try {
      const url = new URL(api("studies"));
      url.searchParams.set("limit", "200");
      const data = await fetchJson<{ items: StudyOption[]; total: number }>(url.toString());
      setStudies(data?.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تحميل الدراسات");
    } finally {
      setStudiesLoading(false);
    }
  };

  const eligibleStudies = createForm.insuranceCompanyId
    ? studies.filter(s => !s.insuranceCompanyId || s.insuranceCompanyId === createForm.insuranceCompanyId)
    : [];

  const toggleStudy = (id: string) => {
    setCreateForm(f => ({
      ...f,
      studyIds: f.studyIds.includes(id) ? f.studyIds.filter(x => x !== id) : [...f.studyIds, id],
    }));
  };

  const submitCreate = async () => {
    if (!createForm.insuranceCompanyId) {
      toast.error("اختر جهة التأمين");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const selected = studies.filter(s => createForm.studyIds.includes(s.id));
      for (const s of selected) {
        if (s.insuranceCompanyId !== createForm.insuranceCompanyId) {
          await fetchJson(api(`studies/${s.id}/insurance`), {
            method: "PUT",
            body: JSON.stringify({ insuranceCompanyId: createForm.insuranceCompanyId }),
          });
        }
      }
      const payload: Record<string, unknown> = {
        insuranceCompanyId: createForm.insuranceCompanyId,
        studyIds: createForm.studyIds,
        notes: createForm.notes.trim() || undefined,
      };
      if (createForm.periodFrom) payload["periodFrom"] = createForm.periodFrom;
      if (createForm.periodTo) payload["periodTo"] = createForm.periodTo;
      await fetchJson(api("insurance-invoices"), { method: "POST", body: JSON.stringify(payload) });
      toast.success("تم إنشاء فاتورة التأمين");
      setCreateOpen(false);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الفاتورة");
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (inv: InsuranceInvoice) => {
    setPaymentTarget(inv);
    setPaymentForm({ amount: "", note: "" });
  };

  const submitPayment = async () => {
    if (!paymentTarget || paying) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("المبلغ غير صحيح");
      return;
    }
    setPaying(true);
    try {
      await fetchJson(api(`insurance-invoices/${paymentTarget.id}/payment`), {
        method: "POST",
        body: JSON.stringify({ amount, note: paymentForm.note.trim() || undefined }),
      });
      toast.success("تم تسجيل الدفعة");
      setPaymentTarget(null);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تسجيل الدفعة");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">فواتير التأمين (من والي)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">فواتير مجمعة لكل جهة تأمين مع سجل المدفوعات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />إنشاء فاتورة
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">جاري التحميل...</p>
      ) : invoices.length === 0 ? (
        <p className="text-center py-10 text-gray-400">لا توجد فواتير تأمين بعد</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">رقم الفاتورة</th>
                <th className="py-3 px-4 text-right font-medium">الجهة</th>
                <th className="py-3 px-4 text-right font-medium">الإجمالي</th>
                <th className="py-3 px-4 text-right font-medium">المدفوع</th>
                <th className="py-3 px-4 text-right font-medium">المتبقي</th>
                <th className="py-3 px-4 text-right font-medium">الحالة</th>
                <th className="py-3 px-4 text-right font-medium">التاريخ</th>
                <th className="py-3 px-4 text-right font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={inv.id} className="border-b dark:border-gray-700/50 last:border-0">
                    <td className="py-3 px-4" dir="ltr">{inv.invoiceNumber || "—"}</td>
                    <td className="py-3 px-4 font-medium">{inv.insuranceCompanyName || "—"}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.totalAmount)}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.paidAmount)}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.remainingAmount)}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span></td>
                    <td className="py-3 px-4">{fmtDate(inv.createdAt)}</td>
                    <td className="py-3 px-4">
                      {inv.status !== "PAID" ? (
                        <button onClick={() => openPayment(inv)} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-100">
                          <Banknote className="w-3.5 h-3.5" />تسجيل دفعة
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setCreateOpen(false)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إنشاء فاتورة تأمين</h3>
              <button onClick={() => !saving && setCreateOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">جهة التأمين *</label>
                <select className={MODAL_INPUT_CLS} value={createForm.insuranceCompanyId} onChange={e => setCreateForm({ ...createForm, insuranceCompanyId: e.target.value })}>
                  <option value="">اختر الجهة</option>
                  {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">من تاريخ</label>
                  <input type="date" className={MODAL_INPUT_CLS} value={createForm.periodFrom} onChange={e => setCreateForm({ ...createForm, periodFrom: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">إلى تاريخ</label>
                  <input type="date" className={MODAL_INPUT_CLS} value={createForm.periodTo} onChange={e => setCreateForm({ ...createForm, periodTo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الدراسات</label>
                {studiesLoading ? (
                  <p className="text-sm text-gray-400 py-2">جارٍ تحميل الدراسات...</p>
                ) : !createForm.insuranceCompanyId ? (
                  <p className="text-sm text-gray-400 py-2">اختر جهة التأمين أولاً لعرض دراساتها</p>
                ) : eligibleStudies.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">لا توجد دراسات مرتبطة بهذه الجهة</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border dark:border-gray-600 rounded-lg divide-y dark:divide-gray-700">
                    {eligibleStudies.map(s => (
                      <label key={s.id} className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={createForm.studyIds.includes(s.id)}
                          onChange={() => toggleStudy(s.id)}
                          className="mt-0.5 rounded border-gray-300 dark:border-gray-600"
                        />
                        <span>
                          <span className="font-medium">{s.patientName}</span>
                          {s.examTypeName ? <span className="text-gray-500 dark:text-gray-400"> — {s.examTypeName}</span> : null}
                          {!s.insuranceCompanyId ? <span className="text-xs text-yellow-600 dark:text-yellow-400"> (سيتم ربطها بالجهة)</span> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ملاحظات</label>
                <input className={MODAL_INPUT_CLS} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="ملاحظات اختيارية" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">إلغاء</button>
              <button onClick={submitCreate} disabled={saving || !createForm.insuranceCompanyId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}إنشاء الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !paying && setPaymentTarget(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تسجيل دفعة</h3>
              <button onClick={() => !paying && setPaymentTarget(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              الفاتورة <span dir="ltr">{paymentTarget.invoiceNumber || paymentTarget.id}</span> — المتبقي {fmtMoney(paymentTarget.remainingAmount)}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">المبلغ *</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ملاحظة</label>
                <input className={MODAL_INPUT_CLS} value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPaymentTarget(null)} disabled={paying} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">إلغاء</button>
              <button onClick={submitPayment} disabled={paying} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}تسجيل الدفعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
