import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Loader2, X as XMarkIcon } from "lucide-react";
import {
  fmtMoney,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  recordDoctorBulkPayment,
} from "../../shared";
import type { BulkPaymentModalProps } from "../types/doctorDetailTypes";

export function BulkPaymentModal({
  doctor,
  onClose,
  onSaved,
}: BulkPaymentModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(doctor.outstanding ?? ""));
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
      const res = await recordDoctorBulkPayment(doctor.id, {
        amount: val,
        method,
        note,
      });
      toast.success(
        `تم تسجيل دفعة بقيمة ${fmtMoney(res.totalPaid)} وتوزيعها على ${res.allocations.length} فاتورة`
      );
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
            <Banknote className="w-5 h-5 text-green-600" />
            تحصيل دفعة على الحساب
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

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          الطبيب: <span className="font-semibold text-gray-900 dark:text-gray-100">{doctor.name}</span>
          <br />
          المديونية الحالية:{" "}
          <span className="font-bold text-red-600 font-mono tabular-nums">
            {fmtMoney(doctor.outstanding ?? 0)} ج.م
          </span>
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              المبلغ المحصل (ج.م) *
            </label>
            <input
              className={`${MODAL_INPUT_CLS} text-base font-semibold font-mono tabular-nums`}
              type="number"
              min="1"
              step="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              طريقة الدفع
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="CASH">نقدي (كاش)</option>
              <option value="CARD">بطاقة بنكية (فيزا / ماستركارد)</option>
              <option value="BANK">تحويل بنكي (InstaPay / IBAN)</option>
              <option value="VODAFONE_CASH">فودافون كاش / محافظ إلكترونية</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات / رقم الإيصال
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="رقم العملية، اسم المستلم..."
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
            className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "جاري التسجيل..." : "تأكيد التحصيل والتوزيع"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkPaymentModal;
