import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Loader2, X as XMarkIcon } from "lucide-react";
import {
  fmtMoney,
  recordDoctorBulkPayment,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  type DentalLabDoctor,
} from "../../shared";

interface DentalInvoiceBulkPaymentModalProps {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onSaved: () => void;
}

export function DentalInvoiceBulkPaymentModal({
  doctor,
  onClose,
  onSaved,
}: DentalInvoiceBulkPaymentModalProps) {
  const [amount, setAmount] = useState<string>(
    String(doctor.outstanding && doctor.outstanding > 0 ? doctor.outstanding : "")
  );
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
        note: note.trim() || undefined,
      });
      toast.success(
        `تم تسجيل دفعة بقيمة ${fmtMoney(res.totalPaid)} ج.م وتوزيعها على ${res.allocations.length} فاتورة بنجاح`
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div className={`${MODAL_CONTENT_CLS} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            <h3 className="text-base sm:text-lg font-bold">تحصيل دفعة على حساب الطبيب</h3>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          الطبيب:{" "}
          <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.name}</span> —
          المتبقي الحالي:{" "}
          <span className="font-bold text-red-600 font-mono tabular-nums">
            {fmtMoney(doctor.outstanding ?? 0)} ج.م
          </span>
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-3.5 py-2 text-xs mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                المبلغ المحصل *
              </label>
              {(doctor.outstanding ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(doctor.outstanding))}
                  className="text-xs text-blue-600 hover:underline font-mono tabular-nums"
                >
                  سداد كامل المديونية
                </button>
              )}
            </div>
            <input
              type="number"
              min="0.01"
              step="any"
              className={MODAL_INPUT_CLS}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-[11px] text-gray-400 mt-1">
              سيتم توزيع المبلغ تلقائياً على فواتير الطبيب المفتوحة بالأقدمية (FIFO).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              طريقة الدفع
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="CASH">نقدي (كاش)</option>
              <option value="BANK">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش / محفظة</option>
              <option value="CARD">فيزا / بطاقة</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات أو رقم الإيصال
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: إيصال رقم #..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t dark:border-gray-800 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={saving || !Number(amount)}
            className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "جاري التسجيل..." : "تأكيد التحصيل"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceBulkPaymentModal;

