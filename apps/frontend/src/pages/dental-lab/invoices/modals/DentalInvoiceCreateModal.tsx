import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Banknote, CreditCard, Loader2, X as XMarkIcon } from "lucide-react";
import type { CreateInvoiceModalProps } from "../types/dentalInvoicesTypes";
import {
  createInvoice,
  addInvoicePayment,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "../../shared";

export function DentalInvoiceCreateModal({
  cases,
  doctors,
  preselectedDoctorId,
  onClose,
  onSaved,
}: CreateInvoiceModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [doctorId, setDoctorId] = useState(preselectedDoctorId || "");
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [total, setTotal] = useState(0);
  const [paidNow, setPaidNow] = useState(0);
  const [method, setMethod] = useState("CASH");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (preselectedDoctorId) {
      const d = doctors.find((x) => x.id === preselectedDoctorId);
      if (d) {
        setDoctorId(d.id);
        setDoctorName(d.name);
      }
    }
  }, [preselectedDoctorId, doctors]);

  const onCaseChange = (id: string) => {
    setCaseId(id);
    const c = cases.find((x) => x.id === id);
    if (c) {
      setDoctorId(c.doctorId || "");
      setDoctorName(c.doctorName || c.doctor?.name || "");
      setPatientName(c.patientName || "");
      setTotal(c.total ?? c.priceSnapshot ?? 0);
    } else {
      setCaseId("");
      setPatientName("");
      setTotal(0);
    }
  };

  const onDoctorSelect = (id: string) => {
    setDoctorId(id);
    const d = doctors.find((x) => x.id === id);
    if (d) setDoctorName(d.name);
  };

  const save = async () => {
    if (saving) return;
    if (!doctorName.trim() && !doctorId && !caseId) {
      toast.error(t("dentalLab.invoices.doctorName"));
      return;
    }
    setSaving(true);
    try {
      const invoice = await createInvoice({
        caseId: caseId || undefined,
        doctorId: doctorId || undefined,
        doctorName: doctorName.trim() || undefined,
        patientName: patientName.trim() || undefined,
        total: Number(total) || 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: note.trim() || undefined,
      });
      if (Number(paidNow) > 0) {
        await addInvoicePayment(invoice.id, {
          amount: Number(paidNow),
          method,
          note: "دفعة عند إنشاء الفاتورة",
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
  const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !saving && onClose()}
    >
      <div className={`${MODAL_CONTENT_CLS} max-w-lg my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-bold">{t("dentalLab.invoices.createTitle")}</h3>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 max-h-[75vh] overflow-y-auto px-0.5">
          <div>
            <label className={labelCls}>{t("dentalLab.invoices.linkCase")} (اختياري)</label>
            <select
              className={inputCls}
              value={caseId}
              onChange={(e) => onCaseChange(e.target.value)}
            >
              <option value="">-- بدون ربط بحالة (فاتورة يدوية للطبيب) --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber || c.id.slice(0, 8)} — {c.patientName}{" "}
                  {c.doctorName ? `(د. ${c.doctorName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>اختر الطبيب *</label>
              <select
                className={inputCls}
                value={doctorId}
                onChange={(e) => onDoctorSelect(e.target.value)}
              >
                <option value="">-- اختر من قائمة الأطباء --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.invoices.doctorName")} (نص حر)</label>
              <input
                className={inputCls}
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="د. ..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("dentalLab.invoices.patientName")}</label>
              <input
                className={inputCls}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="اسم المريض"
              />
            </div>
            <div>
              <label className={labelCls}>تاريخ الاستحقاق</label>
              <input
                className={inputCls}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t("dentalLab.invoices.total")} (ج.م) *</label>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
            />
          </div>

          <div className="border-t dark:border-gray-800 pt-3 mt-2">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-green-600" />
              سداد دفعة فورية مع إنشاء الفاتورة (اختياري)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentAmount")} (ج.م)</label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max={total || undefined}
                  value={paidNow}
                  onChange={(e) => setPaidNow(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentMethod")}</label>
                <select
                  className={inputCls}
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
            </div>
          </div>

          <div>
            <label className={labelCls}>ملاحظات</label>
            <input
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أي تفاصيل أو بنود إضافية..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t dark:border-gray-800 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving || (!doctorName.trim() && !doctorId && !caseId)}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceCreateModal;

