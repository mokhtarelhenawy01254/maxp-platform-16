import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CreditCard, Loader2, Receipt, X as XMarkIcon } from "lucide-react";
import {
  addInvoicePayment,
  fmtMoney,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "../../shared";
import type { SingleInvoicePaymentModalProps } from "../types/doctorDetailTypes";

export function SingleInvoicePaymentModal({
  invoice,
  onClose,
  onSaved,
}: SingleInvoicePaymentModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(invoice.remaining || ""));
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("يرجى إدخال مبلغ صحيح");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addInvoicePayment(invoice.id, { amount: val, method, note });
      toast.success("تم تسجيل الدفعة بنجاح");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 animate-in fade-in duration-200"
      onClick={() => !saving && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-md w-full animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            سداد فاتورة: {invoice.invoiceNumber}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono tabular-nums">
          إجمالي الفاتورة: <span className="font-semibold">{fmtMoney(invoice.total)}</span> | المتبقي:{" "}
          <span className="font-bold text-red-600">{fmtMoney(invoice.remaining)} ج.م</span>
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">المبلغ المدفوع *</label>
            <input
              className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
            <select
              className={MODAL_INPUT_CLS}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="CASH">نقدي (كاش)</option>
              <option value="CARD">فيزا / بطاقة بنكية</option>
              <option value="BANK">تحويل بنكي / InstaPay</option>
              <option value="VODAFONE_CASH">محفظة إلكترونية</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظة</label>
            <input
              className={MODAL_INPUT_CLS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="رقم التحويل أو ملاحظة..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {saving ? "جاري السداد..." : "تسجيل الدفعة"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SingleInvoicePaymentModal;
