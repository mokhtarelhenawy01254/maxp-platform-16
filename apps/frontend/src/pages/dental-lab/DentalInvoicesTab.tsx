import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Banknote, CreditCard, FileText, Link2, Loader2, Plus, RefreshCw, X as XMarkIcon } from "lucide-react";
import {
  DentalInvoice, DentalLabCase, PAYMENT_STATUS_MAP, INVOICE_STATUS_MAP,
  fetchInvoices, fetchCases, createInvoice, addInvoicePayment, fetchInvoicePdf, fetchInvoicePaymentLink,
  fmtMoney, MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";

const FALLBACK_BADGE = { label: "", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };

const invoiceBadge = (status?: string) => {
  if (!status) return null;
  const meta = INVOICE_STATUS_MAP[status] ?? { ...FALLBACK_BADGE, label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

const paymentBadge = (status?: string) => {
  if (!status) return null;
  const meta = PAYMENT_STATUS_MAP[status as keyof typeof PAYMENT_STATUS_MAP] ?? { ...FALLBACK_BADGE, label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

function CreateInvoiceModal({ cases, onClose, onSaved }: { cases: DentalLabCase[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [total, setTotal] = useState(0);
  const [paidNow, setPaidNow] = useState(0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const onCaseChange = (id: string) => {
    setCaseId(id);
    const c = cases.find(x => x.id === id);
    if (c) {
      setDoctorName(c.doctorName || "");
      setPatientName(c.patientName || "");
      setTotal(c.total ?? c.priceSnapshot ?? 0);
    } else {
      setDoctorName("");
      setPatientName("");
      setTotal(0);
    }
  };

  const save = async () => {
    if (saving) return;
    if (!doctorName.trim() && !caseId) { toast.error(t("dentalLab.invoices.doctorName")); return; }
    setSaving(true);
    try {
      const invoice = await createInvoice({
        caseId: caseId || undefined,
        doctorName: doctorName.trim() || undefined,
        patientName: patientName.trim() || undefined,
        total: Number(total) || 0,
      });
      if (Number(paidNow) > 0) {
        await addInvoicePayment(invoice.id, { amount: Number(paidNow), method, note: note.trim() || undefined });
      }
      toast.success(t("dentalLab.invoices.created"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.invoices.createTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t("dentalLab.invoices.createSubtitle")}</p>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>{t("dentalLab.invoices.linkCase")}</label>
            <select className={inputCls} value={caseId} onChange={e => onCaseChange(e.target.value)}>
              <option value="">{t("dentalLab.invoices.manualDoctor")}</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber || c.id.slice(0, 8)} — {c.patientName}{c.doctorName ? ` (${c.doctorName})` : ""}
                </option>
              ))}
            </select>
            {cases.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t("dentalLab.invoices.noCases")}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("dentalLab.invoices.doctorName")} *</label>
              <input className={inputCls} value={doctorName} onChange={e => setDoctorName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.invoices.patientName")}</label>
              <input className={inputCls} value={patientName} onChange={e => setPatientName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("dentalLab.invoices.total")}</label>
            <input className={inputCls} type="number" value={total} onChange={e => setTotal(Number(e.target.value))} />
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t("dentalLab.detail.paymentTitle")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentAmount")}</label>
                <input className={inputCls} type="number" value={paidNow} onChange={e => setPaidNow(Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentMethod")}</label>
                <select className={inputCls} value={method} onChange={e => setMethod(e.target.value)}>
                  {["CASH", "CARD", "BANK", "VODAFONE_CASH"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentNote")}</label>
                <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || (!doctorName.trim() && !caseId)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSaved }: { invoice: DentalInvoice; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(invoice.remaining > 0 ? invoice.remaining : 0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    if (!(Number(amount) > 0)) { toast.error(t("dentalLab.detail.paymentAmount")); return; }
    setSaving(true);
    try {
      await addInvoicePayment(invoice.id, { amount: Number(amount), method, note: note.trim() || undefined });
      toast.success(t("dentalLab.detail.paymentAdded"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.invoices.paymentTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentAmount")} *</label>
            <input className={MODAL_INPUT_CLS} type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentMethod")}</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={e => setMethod(e.target.value)}>
              {["CASH", "CARD", "BANK", "VODAFONE_CASH"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentNote")}</label>
            <input className={MODAL_INPUT_CLS} value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DentalInvoicesTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalInvoice[]>([]);
  const [cases, setCases] = useState<DentalLabCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<DentalInvoice | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const [invs, cs] = await Promise.all([fetchInvoices(), fetchCases({ limit: 100 })]);
      setRows(invs);
      setCases(cs.data);
    } catch (e) {
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
        toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
      }
    }
  }, [t]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.invoices.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" />{t("dentalLab.invoices.newInvoice")}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <CreditCard className="w-10 h-10 mx-auto mb-3" />
            {t("dentalLab.invoices.noData")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  {[t("dentalLab.invoices.doctorName"), t("dentalLab.invoices.patientName"), t("dentalLab.invoices.total"), t("dentalLab.invoices.paid"), t("dentalLab.invoices.remaining"), t("dentalLab.common.status"), t("dentalLab.common.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(inv => (
                  <tr key={inv.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 font-medium">{inv.doctorName || "—"}</td>
                    <td className="py-3 px-4">{inv.patientName || "—"}</td>
                    <td className="py-3 px-4">{fmtMoney(inv.total)}</td>
                    <td className="py-3 px-4 text-green-600 dark:text-green-400">{fmtMoney(inv.paid)}</td>
                    <td className="py-3 px-4 text-red-500">{fmtMoney(inv.remaining)}</td>
                    <td className="py-3 px-4">{invoiceBadge(inv.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={async () => {
                            try {
                              const blob = await fetchInvoicePdf(inv.id);
                              const url = URL.createObjectURL(blob);
                              window.open(url, "_blank");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
                            }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg text-xs"
                          title={t("dentalLab.invoices.pdf")}
                        >
                          <FileText className="w-3.5 h-3.5" />{t("dentalLab.invoices.pdf")}
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const r = await fetchInvoicePaymentLink(inv.id);
                              if (r.configured && r.checkoutUrl) {
                                window.open(r.checkoutUrl, "_blank");
                              } else {
                                toast.info(r.message || t("dentalLab.invoices.paymentNotConfigured"));
                              }
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
                            }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg text-xs"
                          title={t("dentalLab.invoices.paymentLink")}
                        >
                          <Link2 className="w-3.5 h-3.5" />{t("dentalLab.invoices.paymentLink")}
                        </button>
                        {inv.remaining > 0 && (
                          <button onClick={() => setPaymentInvoice(inv)} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg text-xs" title={t("dentalLab.invoices.addPayment")}>
                            <Banknote className="w-3.5 h-3.5" />{t("dentalLab.invoices.addPayment")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateInvoiceModal cases={cases} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); refresh({ silent: true }); }} />
      )}
      {paymentInvoice && (
        <PaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} onSaved={() => { setPaymentInvoice(null); refresh({ silent: true }); }} />
      )}
    </div>
  );
}