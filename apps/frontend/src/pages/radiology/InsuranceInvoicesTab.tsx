import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  OPEN: { label: "radiology.insuranceInvoices.open", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  PARTIAL: { label: "radiology.insuranceInvoices.partial", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  PAID: { label: "radiology.insuranceInvoices.paidFull", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

const fmtMoney = (n?: number, currency = "") => `${Number(n ?? 0).toFixed(2)} ${currency}`;

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "ΓÇö");

export default function InsuranceInvoicesTab() {
  const { t } = useTranslation();
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
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "", method: "BANK" });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchJson<InvoiceListResponse>(api("insurance-invoices"));
      setInvoices(data?.items || []);
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : t("radiology.insuranceInvoices.loadFailed"));
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
      toast.error(e instanceof Error ? e.message : t("radiology.insuranceInvoices.loadStudiesFailed"));
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
      toast.error(t("radiology.insuranceInvoices.selectInsuranceEntity"));
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
      toast.success(t("radiology.insuranceInvoices.invoiceCreated"));
      setCreateOpen(false);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.insuranceInvoices.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (inv: InsuranceInvoice) => {
    setPaymentTarget(inv);
    setPaymentForm({ amount: "", note: "", method: "BANK" });
  };

  const submitPayment = async () => {
    if (!paymentTarget || paying) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("radiology.amountInvalid"));
      return;
    }
    setPaying(true);
    try {
      await fetchJson(api(`insurance-invoices/${paymentTarget.id}/payment`), {
        method: "POST",
        body: JSON.stringify({ amount, note: paymentForm.note.trim() || undefined, method: paymentForm.method }),
      });
      toast.success(t("radiology.insuranceInvoices.paymentRecorded"));
      setPaymentTarget(null);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.insuranceInvoices.paymentFailed"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.insuranceInvoices.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.insuranceInvoices.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.insuranceInvoices.createInvoice")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">{t("radiology.loading")}</p>
      ) : invoices.length === 0 ? (
        <p className="text-center py-10 text-gray-400">{t("radiology.insuranceInvoices.noInvoices")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.invoiceNumber")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.entity")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.total")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.paid")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.remaining")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.status")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.date")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.insuranceInvoices.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={inv.id} className="border-b dark:border-gray-700/50 last:border-0">
                    <td className="py-3 px-4" dir="ltr">{inv.invoiceNumber || "ΓÇö"}</td>
                    <td className="py-3 px-4 font-medium">{inv.insuranceCompanyName || "ΓÇö"}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.totalAmount, t("radiology.currency"))}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.paidAmount, t("radiology.currency"))}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.remainingAmount, t("radiology.currency"))}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label.startsWith("radiology.") ? t(st.label) : st.label}</span></td>
                    <td className="py-3 px-4">{fmtDate(inv.createdAt)}</td>
                    <td className="py-3 px-4">
                      {inv.status !== "PAID" ? (
                        <button onClick={() => openPayment(inv)} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-100">
                          <Banknote className="w-3.5 h-3.5" />{t("radiology.insuranceInvoices.recordPayment")}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">ΓÇö</span>
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
              <h3 className="text-lg font-bold">{t("radiology.insuranceInvoices.createInvoiceTitle")}</h3>
              <button onClick={() => !saving && setCreateOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.insuranceEntityRequired")}</label>
                <select className={MODAL_INPUT_CLS} value={createForm.insuranceCompanyId} onChange={e => setCreateForm({ ...createForm, insuranceCompanyId: e.target.value })}>
                  <option value="">{t("radiology.insuranceInvoices.selectEntity")}</option>
                  {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.dateFrom")}</label>
                  <input type="date" className={MODAL_INPUT_CLS} value={createForm.periodFrom} onChange={e => setCreateForm({ ...createForm, periodFrom: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.dateTo")}</label>
                  <input type="date" className={MODAL_INPUT_CLS} value={createForm.periodTo} onChange={e => setCreateForm({ ...createForm, periodTo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.studies")}</label>
                {studiesLoading ? (
                  <p className="text-sm text-gray-400 py-2">{t("radiology.insuranceInvoices.loadingStudies")}</p>
                ) : !createForm.insuranceCompanyId ? (
                  <p className="text-sm text-gray-400 py-2">{t("radiology.insuranceInvoices.selectEntityFirst")}</p>
                ) : eligibleStudies.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">{t("radiology.insuranceInvoices.noLinkedStudies")}</p>
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
                          {s.examTypeName ? <span className="text-gray-500 dark:text-gray-400"> ΓÇö {s.examTypeName}</span> : null}
                          {!s.insuranceCompanyId ? <span className="text-xs text-yellow-600 dark:text-yellow-400"> ({t("radiology.insuranceInvoices.willBeLinked")})</span> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.notes")}</label>
                <input className={MODAL_INPUT_CLS} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} placeholder={t("radiology.insuranceInvoices.notesOptionalPlaceholder")} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">{t("radiology.cancel")}</button>
              <button onClick={submitCreate} disabled={saving || !createForm.insuranceCompanyId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.insuranceInvoices.createInvoiceSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !paying && setPaymentTarget(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("radiology.insuranceInvoices.recordPaymentTitle")}</h3>
              <button onClick={() => !paying && setPaymentTarget(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("radiology.insuranceInvoices.invoiceLabel")} <span dir="ltr">{paymentTarget.invoiceNumber || paymentTarget.id}</span> ΓÇö {t("radiology.insuranceInvoices.remaining")} {fmtMoney(paymentTarget.remainingAmount, t("radiology.currency"))}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.amountRequired")}</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.paymentMethod")}</label>
                <select className={MODAL_INPUT_CLS} value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                  <option value="BANK">{t("radiology.paymentMethod.BANK")}</option>
                  <option value="CASH">{t("radiology.paymentMethod.CASH")}</option>
                  <option value="CARD">{t("radiology.paymentMethod.CARD")}</option>
                  <option value="VODAFONE_CASH">{t("radiology.paymentMethod.VODAFONE_CASH")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.note")}</label>
                <input className={MODAL_INPUT_CLS} value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPaymentTarget(null)} disabled={paying} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">{t("radiology.cancel")}</button>
              <button onClick={submitPayment} disabled={paying} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.insuranceInvoices.recordPayment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
