import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, X as XMarkIcon } from "lucide-react";
import type { DentalLabCase } from "../../shared";
import {
  addInvoicePayment,
  createInvoice,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "../../shared";

export interface DentalCaseInvoiceModalProps {
  caseData: DentalLabCase;
  onClose: () => void;
  onSaved: () => void;
}

export function DentalCaseInvoiceModal({
  caseData,
  onClose,
  onSaved,
}: DentalCaseInvoiceModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(caseData.remaining ?? caseData.total ?? 0);
  const [paidNow, setPaidNow] = useState(0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const invoice = await createInvoice({
        caseId: caseData.id,
        doctorId: caseData.doctorId,
        doctorName: caseData.doctorName,
        patientName: caseData.patientName,
        total: Number(amount) || 0,
      });
      if (Number(paidNow) > 0) {
        await addInvoicePayment(invoice.id, {
          amount: Number(paidNow),
          method,
          note: note.trim() || undefined,
        });
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

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div className={MODAL_CONTENT_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.cases.createInvoice")}</h3>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.invoices.total")}
            </label>
            <input
              className={inputCls}
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.detail.paymentAmount")}
            </label>
            <input
              className={inputCls}
              type="number"
              value={paidNow}
              onChange={(e) => setPaidNow(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.detail.paymentMethod")}
            </label>
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              {["CASH", "CARD", "BANK", "VODAFONE_CASH"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.detail.paymentNote")}
            </label>
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-xs font-semibold"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalCaseInvoiceModal;
