import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X as XMarkIcon,
} from "lucide-react";
import {
  DentalLabDoctorDetail,
  DentalLabDoctor,
  DentalLabCase,
  DentalInvoice,
  DentalWorkType,
  DoctorStatement,
  fetchDoctorDetail,
  fetchCases,
  fetchInvoices,
  fetchDoctorStatement,
  fetchWorkTypes,
  fetchDoctorPricing,
  saveDoctorPricing,
  updateDoctor,
  recordDoctorBulkPayment,
  addInvoicePayment,
  fetchInvoicePdf,
  fetchInvoicePaymentLink,
  CASE_STATUS_MAP,
  PRIORITY_CONFIG,
  PAYMENT_STATUS_MAP,
  fmtMoney,
  fmtDate,
  fmtDateTime,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "./shared";
import QuickOrderModal from "./QuickOrderModal";

type DetailTab = "cases" | "invoices" | "statement" | "pricing" | "portal";

/* -------------------------------------------------------------------------- */
/*                               Modal: Edit Doctor                           */
/* -------------------------------------------------------------------------- */
function EditDoctorModal({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: DentalLabDoctorDetail;
  onClose: () => void;
  onSaved: (updated: DentalLabDoctorDetail) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(doctor.name || "");
  const [phone, setPhone] = useState(doctor.phone || "");
  const [clinicName, setClinicName] = useState(doctor.clinicName || "");
  const [governorate, setGovernorate] = useState(doctor.governorate || "");
  const [creditLimit, setCreditLimit] = useState(String(doctor.creditLimit ?? "0"));
  const [notes, setNotes] = useState(doctor.notes || "");
  const [portalPin, setPortalPin] = useState("");
  const [isActive, setIsActive] = useState(doctor.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError(t("dentalLab.common.nameRequired", "اسم الطبيب مطلوب"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<DentalLabDoctor> & { portalPin?: string } = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        clinicName: clinicName.trim() || undefined,
        governorate: governorate.trim() || undefined,
        creditLimit: Math.max(0, Number(creditLimit) || 0),
        notes: notes.trim() || undefined,
        isActive,
      };
      if (portalPin.trim()) {
        payload.portalPin = portalPin.trim();
      }
      const updated = await updateDoctor(doctor.id, payload);
      toast.success(t("dentalLab.doctors.updated"));
      onSaved({
        ...doctor,
        ...updated,
        hasPortalPin: portalPin.trim() ? true : doctor.hasPortalPin,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            {t("dentalLab.doctors.editTitle")}
          </h3>
          <button onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className={labelCls}>{t("dentalLab.common.name")} *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="د. أحمد مصطفى" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("dentalLab.common.phone")}</label>
              <input className={inputCls} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.doctors.governorate")}</label>
              <input className={inputCls} value={governorate} onChange={(e) => setGovernorate(e.target.value)} placeholder="القاهرة / الجيزة" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("dentalLab.doctors.clinicName")}</label>
              <input className={inputCls} value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="عيادة النور لطب الأسنان" />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.doctors.creditLimit")}</label>
              <input
                className={inputCls}
                type="number"
                min="0"
                step="500"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0 = بدون حد"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              {t("dentalLab.doctors.portalPin")} (PIN للدخول للبوابة الذاتية)
            </label>
            <input
              className={inputCls}
              type="password"
              maxLength={8}
              value={portalPin}
              onChange={(e) => setPortalPin(e.target.value)}
              placeholder={doctor.hasPortalPin ? "اتركه فارغاً للإبقاء على الرمز الحالي" : "تعيين رمز الدخول (مثال: 1234)"}
            />
            <p className="text-xs text-gray-500 mt-1">يستخدمه الطبيب لتسجيل الدخول إلى بوابة الأطباء ومتابعة حالاته.</p>
          </div>

          <div>
            <label className={labelCls}>{t("dentalLab.common.notes")}</label>
            <textarea
              className={`${inputCls} h-20 resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات خاصة بالتعامل أو التوصيل أو المواعيد..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="doc-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="doc-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              حساب الطبيب نشط (يسمح بإسناد واستلام حالات جديدة)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Dialog: Focused Portal PIN                        */
/* -------------------------------------------------------------------------- */
function PortalPinDialog({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: DentalLabDoctorDetail;
  onClose: () => void;
  onSaved: (updated: DentalLabDoctorDetail) => void;
}) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(doctor.phone || "");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmedPhone = phone.trim();
    const trimmedPin = pin.trim();
    if (!/^01[0-9]{9}$/.test(trimmedPhone)) {
      setError("رقم الهاتف مطلوب بصيغة صحيحة (11 رقمًا تبدأ بـ 01، مثال: 01012345678)");
      return;
    }
    if (trimmedPin.length < 4 || trimmedPin.length > 8) {
      setError("رمز الدخول (PIN) مطلوب: من 4 إلى 8 خانات");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Same endpoint the full edit modal uses — partial update ({ phone, portalPin } only)
      const updated = await updateDoctor(doctor.id, { phone: trimmedPhone, portalPin: trimmedPin });
      toast.success(t("dentalLab.doctors.updated"));
      onSaved({ ...doctor, ...updated, hasPortalPin: true });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" onClick={() => !saving && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-700 p-5 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{doctor.hasPortalPin ? "تغيير رمز الدخول (PIN)" : "تعيين رمز الدخول (PIN)"}</span>
          </h3>
          <button onClick={onClose} disabled={saving} aria-label="إغلاق" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className={labelCls}>{t("dentalLab.common.phone")} *</label>
            <input
              className={inputCls}
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              inputMode="numeric"
              maxLength={11}
            />
          </div>

          <div>
            <label className={labelCls}>{t("dentalLab.doctors.portalPin")} *</label>
            <div className="relative">
              <input
                className={`${inputCls} pl-10`}
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="مثال: 1234"
                inputMode="numeric"
                maxLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                aria-label={showPin ? "إخفاء رمز الدخول" : "إظهار رمز الدخول"}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">يستخدمه الطبيب مع رقم الهاتف لتسجيل الدخول إلى بوابة الأطباء.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Modal: Bulk Payment                            */
/* -------------------------------------------------------------------------- */
function BulkPaymentModal({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: DentalLabDoctorDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
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
      const res = await recordDoctorBulkPayment(doctor.id, { amount: val, method, note });
      toast.success(`تم تسجيل دفعة بقيمة ${fmtMoney(res.totalPaid)} وتوزيعها على ${res.allocations.length} فاتورة`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            تحصيل دفعة على الحساب
          </h3>
          <button onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          الطبيب: <span className="font-semibold text-gray-900 dark:text-gray-100">{doctor.name}</span>
          <br />
          المديونية الحالية: <span className="font-bold text-red-600">{fmtMoney(doctor.outstanding ?? 0)} ج.م</span>
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ المحصل (ج.م) *</label>
            <input
              className={`${MODAL_INPUT_CLS} text-base font-semibold`}
              type="number"
              min="1"
              step="50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">نقدي (كاش)</option>
              <option value="CARD">بطاقة بنكية (فيزا / ماستركارد)</option>
              <option value="BANK">تحويل بنكي (InstaPay / IBAN)</option>
              <option value="VODAFONE_CASH">فودافون كاش / محافظ إلكترونية</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات / رقم الإيصال</label>
            <input
              className={MODAL_INPUT_CLS}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="رقم العملية، اسم المستلم..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "جاري التسجيل..." : "تأكيد التحصيل والتوزيع"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Modal: Single Invoice Payment                      */
/* -------------------------------------------------------------------------- */
function SingleInvoicePaymentModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: DentalInvoice;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            سداد فاتورة: {invoice.invoiceNumber}
          </h3>
          <button onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
              className={MODAL_INPUT_CLS}
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">نقدي (كاش)</option>
              <option value="CARD">فيزا / بطاقة بنكية</option>
              <option value="BANK">تحويل بنكي / InstaPay</option>
              <option value="VODAFONE_CASH">محفظة إلكترونية</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظة</label>
            <input className={MODAL_INPUT_CLS} value={note} onChange={(e) => setNote(e.target.value)} placeholder="رقم التحويل أو ملاحظة..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {saving ? "جاري السداد..." : "تسجيل الدفعة"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
export default function DentalDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Primary Doctor State
  const [doctor, setDoctor] = useState<DentalLabDoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<DetailTab>("cases");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<DentalInvoice | null>(null);

  // Tab 1: Cases State
  const [cases, setCases] = useState<DentalLabCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState("ALL");

  // Tab 2: Invoices State
  const [invoices, setInvoices] = useState<DentalInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");

  // Tab 3: Statement State
  const [statementData, setStatementData] = useState<DoctorStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementFrom, setStatementFrom] = useState("");
  const [statementTo, setStatementTo] = useState("");

  // Tab 4: Pricing State
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<string, string>>({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);

  /* ------------------------------- Fetch Doctor ------------------------------ */
  const loadDoctor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDoctorDetail(id);
      setDoctor(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  /* -------------------------------- Load Cases ------------------------------- */
  const loadCases = useCallback(async () => {
    if (!id) return;
    setCasesLoading(true);
    try {
      const res = await fetchCases({ doctorId: id, limit: 100 });
      setCases(res.data || []);
    } catch (e) {
      console.error("Error loading doctor cases:", e);
    } finally {
      setCasesLoading(false);
    }
  }, [id]);

  /* ------------------------------- Load Invoices ------------------------------ */
  const loadInvoices = useCallback(async () => {
    if (!id) return;
    setInvoicesLoading(true);
    try {
      const res = await fetchInvoices({ doctorId: id, limit: 100 });
      setInvoices(res || []);
    } catch (e) {
      console.error("Error loading doctor invoices:", e);
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  /* ------------------------------ Load Statement ------------------------------ */
  const loadStatement = useCallback(async () => {
    if (!id) return;
    setStatementLoading(true);
    try {
      const res = await fetchDoctorStatement({
        doctorId: id,
        from: statementFrom || undefined,
        to: statementTo || undefined,
      });
      setStatementData(res);
    } catch (e) {
      console.error("Error loading doctor statement:", e);
    } finally {
      setStatementLoading(false);
    }
  }, [id, statementFrom, statementTo]);

  /* -------------------------------- Load Pricing ------------------------------- */
  const loadPricing = useCallback(async () => {
    if (!id) return;
    setPricingLoading(true);
    try {
      const [wts, custom] = await Promise.all([
        fetchWorkTypes(),
        fetchDoctorPricing(id).catch(() => ({})),
      ]);
      setWorkTypes(wts.filter((w) => w.isActive));
      const map: Record<string, string> = {};
      for (const w of wts) {
        map[w.id] = custom[w.id] != null ? String(custom[w.id]) : "";
      }
      setPricingMap(map);
    } catch (e) {
      console.error("Error loading pricing:", e);
    } finally {
      setPricingLoading(false);
    }
  }, [id]);

  /* -------------------------- Effect on Active Tab -------------------------- */
  useEffect(() => {
    if (!id) return;
    if (activeTab === "cases") loadCases();
    if (activeTab === "invoices") loadInvoices();
    if (activeTab === "statement") loadStatement();
    if (activeTab === "pricing") loadPricing();
  }, [activeTab, id, loadCases, loadInvoices, loadStatement, loadPricing]);

  /* ---------------------------- Save Rate Sheet ----------------------------- */
  const handleSavePricing = async () => {
    if (!id) return;
    setPricingSaving(true);
    try {
      const clean: Record<string, number> = {};
      for (const [wid, v] of Object.entries(pricingMap)) {
        if (v.trim() !== "") clean[wid] = Number(v);
      }
      await saveDoctorPricing(id, clean);
      toast.success(t("dentalLab.doctors.pricing.saved"));
      await loadPricing();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ التسعير");
    } finally {
      setPricingSaving(false);
    }
  };

  /* ------------------------------- Toggle Status ------------------------------ */
  const handleToggleActive = async () => {
    if (!doctor) return;
    const nextState = !doctor.isActive;
    try {
      await updateDoctor(doctor.id, { isActive: nextState });
      toast.success(nextState ? "تم تنشيط الطبيب بنجاح" : "تم إلغاء تفعيل الطبيب");
      setDoctor((prev) => (prev ? { ...prev, isActive: nextState } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تغيير حالة الطبيب");
    }
  };

  /* -------------------------------- Download PDF ------------------------------ */
  const handleDownloadInvoicePdf = async (invId: string, invNum?: string) => {
    try {
      const blob = await fetchInvoicePdf(invId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invNum || invId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("فشل تحميل الفاتورة");
    }
  };

  /* ---------------------------- Copy Payment Link ---------------------------- */
  const handleCopyPaymentLink = async (invId: string) => {
    try {
      const res = await fetchInvoicePaymentLink(invId);
      if (res.checkoutUrl) {
        await navigator.clipboard.writeText(res.checkoutUrl);
        toast.success("تم نسخ رابط الدفع الإلكتروني للحافظة");
      } else {
        toast.info(res.message || "بوابة الدفع الإلكتروني غير مفعلة حالياً");
      }
    } catch {
      toast.error("فشل جلب رابط الدفع");
    }
  };

  /* ----------------------------- Filtered Cases ----------------------------- */
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (caseStatusFilter !== "ALL" && c.status !== caseStatusFilter) {
        if (caseStatusFilter === "OVERDUE") {
          const isOverdue =
            c.dueDate &&
            new Date(c.dueDate) < new Date() &&
            c.status !== "DELIVERED" &&
            c.status !== "CLOSED";
          if (!isOverdue) return false;
        } else {
          return false;
        }
      }
      if (caseSearch.trim()) {
        const q = caseSearch.toLowerCase().trim();
        const num = (c.caseNumber || "").toLowerCase();
        const pName = (c.patientName || "").toLowerCase();
        const wName = (c.workTypeName || "").toLowerCase();
        if (!num.includes(q) && !pName.includes(q) && !wName.includes(q)) return false;
      }
      return true;
    });
  }, [cases, caseSearch, caseStatusFilter]);

  /* ---------------------------- Filtered Invoices --------------------------- */
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== "ALL" && inv.status !== invoiceStatusFilter) return false;
      return true;
    });
  }, [invoices, invoiceStatusFilter]);

  /* ----------------------------- Clean WhatsApp ----------------------------- */
  const whatsappUrl = useMemo(() => {
    if (!doctor?.phone) return null;
    let p = doctor.phone.replace(/\D/g, "");
    if (p.startsWith("0")) p = "2" + p;
    return `https://wa.me/${p}`;
  }, [doctor?.phone]);

  /* ------------------------------- Empty/Error ------------------------------ */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">جاري تحميل بيانات الطبيب...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-1">
            {error || "لم يتم العثور على الطبيب المطلوب"}
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            قد يكون الطبيب محذوفاً أو تم فتح رابط غير صحيح.
          </p>
          <button
            onClick={() => navigate("/dental-lab/doctors")}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            الرجوع لقائمة الأطباء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6" dir="rtl">
      {/* --------------------------- Top Navigation Bar --------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link
            to="/dental-lab/doctors"
            className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>{t("dentalLab.doctors.title")}</span>
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100 font-bold truncate max-w-[200px] sm:max-w-none">
            {doctor.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadDoctor();
              if (activeTab === "cases") loadCases();
              if (activeTab === "invoices") loadInvoices();
              if (activeTab === "statement") loadStatement();
              if (activeTab === "pricing") loadPricing();
              toast.success("تم تحديث البيانات");
            }}
            className="p-2 border dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title={t("dentalLab.common.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Pencil className="w-3.5 h-3.5 text-blue-600" />
            <span>تعديل البيانات</span>
          </button>
        </div>
      </div>

      {/* ----------------------------- Hero Header ----------------------------- */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md shrink-0">
              {doctor.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                  {doctor.name}
                </h1>
                <button
                  onClick={handleToggleActive}
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border transition-all ${
                    doctor.isActive
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                      : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {doctor.isActive ? "طبيب نشط" : "مؤرشف / غير نشط"}
                </button>
                {doctor.hasPortalPin ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    بوابة الطبيب مفعلة
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    البوابة غير مضبوطة
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {doctor.clinicName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {doctor.clinicName}
                  </span>
                )}
                {doctor.governorate && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {doctor.governorate}
                  </span>
                )}
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium"
                    dir="ltr"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {doctor.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 dark:border-gray-700">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واتساب</span>
              </a>
            )}

            <button
              onClick={() => setShowBulkPaymentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل دفعة</span>
            </button>

            <button
              onClick={() => setShowQuickOrderModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل حالة جديدة</span>
            </button>
          </div>
        </div>

        {/* Optional Notes banner */}
        {doctor.notes && (
          <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <span className="font-bold shrink-0">ملاحظات الطبيب:</span>
            <span>{doctor.notes}</span>
          </div>
        )}
      </div>

      {/* ------------------------- KPI & Financial Cards ------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Outstanding Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              الرصيد المتبقي (المديونية)
            </span>
            <Wallet className="w-4 h-4 text-red-500" />
          </div>
          <p
            className={`text-lg sm:text-2xl font-black mt-1.5 ${
              (doctor.outstanding ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
            }`}
          >
            {fmtMoney(doctor.outstanding ?? 0)}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>حد الائتمان: {doctor.creditLimit ? `${fmtMoney(doctor.creditLimit)} ج.م` : "غير محدد"}</span>
            {doctor.creditExceeded && (
              <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                تجاوز الحد!
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Invoiced */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              إجمالي المسحوبات (الفوترة)
            </span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 text-gray-900 dark:text-gray-100">
            {fmtMoney(doctor.totalBilled ?? 0)}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {doctor.invoicesCount ?? 0} فواتير مسجلة
          </p>
        </div>

        {/* Card 3: Total Paid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              إجمالي المدفوعات (المحصل)
            </span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 text-emerald-600 dark:text-emerald-400">
            {fmtMoney(doctor.totalPaid ?? 0)}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            نسبة التحصيل:{" "}
            {(doctor.totalBilled ?? 0) > 0
              ? `${Math.round(((doctor.totalPaid ?? 0) / (doctor.totalBilled || 1)) * 100)}%`
              : "100%"}
          </p>
        </div>

        {/* Card 4: Cases Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              حالات الطبيب
            </span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100">
              {doctor.activeCases ?? 0}
            </span>
            <span className="text-xs text-blue-600 font-semibold">حالة شغالة</span>
            <span className="text-xs text-gray-400">/ {doctor.casesCount ?? 0} إجمالي</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-medium">{doctor.completedCases ?? 0} منتهية</span>
            {(doctor.overdueCases ?? 0) > 0 ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {doctor.overdueCases} متأخرة
              </span>
            ) : (
              <span className="text-gray-400">لا يوجد تأخير</span>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------- Navigation Tabs ---------------------------- */}
      <div className="border-b dark:border-gray-700">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-px">
          {[
            { id: "cases", label: "حالات الطبيب", icon: Layers, count: doctor.casesCount },
            { id: "invoices", label: "الفواتير والمدفوعات", icon: Receipt, count: doctor.invoicesCount },
            { id: "statement", label: "كشف الحساب", icon: FileSpreadsheet },
            { id: "pricing", label: "التسعير المخصص", icon: BadgePercent },
            { id: "portal", label: "بوابة الطبيب والحساب", icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all touch-manipulation min-h-[44px] ${
                  active
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      active
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/*                               TAB 1: CASES                                */}
      {/* ========================================================================= */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border dark:border-gray-700">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                className={`${MODAL_INPUT_CLS} pr-9 text-sm`}
                placeholder="ابحث باسم المريض، رقم الحالة، نوع الشغل..."
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: "ALL", label: "الكل" },
                { id: "IN_PROGRESS", label: "قيد التشغيل" },
                { id: "READY", label: "جاهزة للتسليم" },
                { id: "DELIVERED", label: "تم التسليم" },
                { id: "OVERDUE", label: "المتأخرة" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCaseStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-[36px] ${
                    caseStatusFilter === f.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {casesLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <Layers className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 font-medium">لا توجد حالات مسجلة لهذا الطبيب بالمعايير الحالية</p>
              <button
                onClick={() => setShowQuickOrderModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                تسجيل أول حالة الآن
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 text-right">
                      <th className="py-3 px-3.5">رقم الحالة</th>
                      <th className="py-3 px-3.5">المريض</th>
                      <th className="py-3 px-3.5">نوع الشغل</th>
                      <th className="py-3 px-3.5">اللون / الأسنان</th>
                      <th className="py-3 px-3.5">الحالة</th>
                      <th className="py-3 px-3.5">الأولوية</th>
                      <th className="py-3 px-3.5">الاستحقاق</th>
                      <th className="py-3 px-3.5">السعر</th>
                      <th className="py-3 px-3.5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {filteredCases.map((c) => {
                      const st = CASE_STATUS_MAP[c.status as keyof typeof CASE_STATUS_MAP] || {
                        label: c.status,
                        color: "bg-gray-100 text-gray-700",
                      };
                      const pr = PRIORITY_CONFIG[c.priority as keyof typeof PRIORITY_CONFIG] || {
                        label: c.priority,
                        color: "bg-gray-100 text-gray-700",
                      };
                      const isOverdue =
                        c.dueDate &&
                        new Date(c.dueDate) < new Date() &&
                        c.status !== "DELIVERED" &&
                        c.status !== "CLOSED";

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="py-3 px-3.5 font-bold">
                            <Link
                              to={`/dental-lab/cases/${c.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>{c.caseNumber}</span>
                            </Link>
                          </td>
                          <td className="py-3 px-3.5">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{c.patientName}</p>
                            {c.patientPhone && (
                              <p className="text-xs text-gray-400" dir="ltr">
                                {c.patientPhone}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-medium">{c.workTypeName || "—"}</td>
                          <td className="py-3 px-3.5 text-xs text-gray-500">
                            {c.shade ? <span className="font-semibold">{c.shade}</span> : "—"}
                            {c.teeth && <span className="mr-1 text-gray-400">({c.teeth})</span>}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${pr.color}`}>
                              {pr.label}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-xs">
                            <span className={isOverdue ? "text-red-600 font-bold" : "text-gray-600 dark:text-gray-300"}>
                              {fmtDate(c.dueDate)}
                            </span>
                            {isOverdue && <span className="mr-1 text-[10px] text-red-500 block">متأخر</span>}
                          </td>
                          <td className="py-3 px-3.5 font-semibold">{fmtMoney(c.priceSnapshot ?? 0)} ج.م</td>
                          <td className="py-3 px-3.5 text-center">
                            <Link
                              to={`/dental-lab/cases/${c.id}`}
                              className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                              title="فتح تفاصيل الحالة"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/*                            TAB 2: INVOICES                                */}
      {/* ========================================================================= */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-sm">فواتير ومستحقات الطبيب</span>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: "ALL", label: "كل الفواتير" },
                { id: "OPEN", label: "مفتوحة (مستحقة)" },
                { id: "PARTIAL", label: "مدفوعة جزئياً" },
                { id: "PAID", label: "مسددة بالكامل" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setInvoiceStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    invoiceStatusFilter === f.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {invoicesLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 font-medium">لا توجد فواتير تطابق هذا التصنيف</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 text-right">
                      <th className="py-3 px-3.5">رقم الفاتورة</th>
                      <th className="py-3 px-3.5">التاريخ</th>
                      <th className="py-3 px-3.5">رقم الحالة / البيان</th>
                      <th className="py-3 px-3.5">الإجمالي</th>
                      <th className="py-3 px-3.5">المدفوع</th>
                      <th className="py-3 px-3.5">المتبقي</th>
                      <th className="py-3 px-3.5">الحالة</th>
                      <th className="py-3 px-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {filteredInvoices.map((inv) => {
                      const st = PAYMENT_STATUS_MAP[inv.status as keyof typeof PAYMENT_STATUS_MAP] || {
                        label: inv.status,
                        color: "bg-gray-100 text-gray-700",
                      };
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-3.5 font-bold text-gray-900 dark:text-gray-100">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-3.5 text-xs text-gray-500">{fmtDate(inv.createdAt)}</td>
                          <td className="py-3 px-3.5">
                            {inv.case?.caseNumber ? (
                              <Link
                                to={`/dental-lab/cases/${inv.caseId}`}
                                className="text-blue-600 hover:underline font-medium text-xs"
                              >
                                {inv.case.caseNumber} {inv.case.patientName ? `(${inv.case.patientName})` : ""}
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-400">فاتورة مجمعة / دورية</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-semibold">{fmtMoney(inv.total)} ج.م</td>
                          <td className="py-3 px-3.5 text-emerald-600 font-medium">{fmtMoney(inv.paid)} ج.م</td>
                          <td
                            className={`py-3 px-3.5 font-bold ${
                              (inv.remaining || 0) > 0 ? "text-red-600" : "text-gray-400"
                            }`}
                          >
                            {fmtMoney(inv.remaining)} ج.م
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {(inv.remaining || 0) > 0 && (
                                <button
                                  onClick={() => setSelectedInvoiceToPay(inv)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                                  title="سداد الفاتورة"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadInvoicePdf(inv.id, inv.invoiceNumber)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                title="تحميل فاتورة PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopyPaymentLink(inv.id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                                title="نسخ رابط الدفع الإلكتروني"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/*                            TAB 3: STATEMENT                               */}
      {/* ========================================================================= */}
      {activeTab === "statement" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">من تاريخ:</label>
                <input
                  type="date"
                  className={`${MODAL_INPUT_CLS} text-sm py-1.5`}
                  value={statementFrom}
                  onChange={(e) => setStatementFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">إلى تاريخ:</label>
                <input
                  type="date"
                  className={`${MODAL_INPUT_CLS} text-sm py-1.5`}
                  value={statementTo}
                  onChange={(e) => setStatementTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadStatement}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5 mt-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث الكشف</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 border dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب</span>
            </button>
          </div>

          {statementLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-6 print:border-none print:shadow-none">
              {/* Printable Header */}
              <div className="flex justify-between items-start border-b pb-4 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    كشف حساب معمل الأسنان
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    العميل / الطبيب: <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.name}</span>
                  </p>
                  {doctor.clinicName && (
                    <p className="text-xs text-gray-500">العيادة: {doctor.clinicName}</p>
                  )}
                </div>
                <div className="text-left text-xs text-gray-500">
                  <p>تاريخ الاستخراج: {new Date().toLocaleDateString("ar-EG")}</p>
                  {statementFrom && <p>من: {statementFrom}</p>}
                  {statementTo && <p>إلى: {statementTo}</p>}
                </div>
              </div>

              {/* Summary Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                <div>
                  <span className="text-xs text-gray-500 block">إجمالي الفواتير الصادرة</span>
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {fmtMoney(statementData?.totals?.invoiced ?? doctor.totalBilled ?? 0)} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">إجمالي المسدد</span>
                  <span className="text-base font-bold text-emerald-600">
                    {fmtMoney(statementData?.totals?.paid ?? doctor.totalPaid ?? 0)} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">الرصيد المتبقي</span>
                  <span className="text-base font-bold text-red-600">
                    {fmtMoney(statementData?.totals?.remaining ?? doctor.outstanding ?? 0)} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">عدد الحالات بالفترة</span>
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {statementData?.totals?.cases ?? doctor.casesCount ?? 0} حالة
                  </span>
                </div>
              </div>

              {/* Statement Invoices Table */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  تفاصيل الفواتير والمسحوبات:
                </h4>
                <table className="w-full text-sm border dark:border-gray-700 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-right">
                      <th className="py-2.5 px-3">رقم الفاتورة</th>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">القيمة الكلية</th>
                      <th className="py-2.5 px-3">المدفوع</th>
                      <th className="py-2.5 px-3">المتبقي</th>
                      <th className="py-2.5 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {(statementData?.invoices || invoices).map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2 px-3 font-semibold">{inv.invoiceNumber}</td>
                        <td className="py-2 px-3 text-xs">{fmtDate(inv.createdAt)}</td>
                        <td className="py-2 px-3">{fmtMoney(inv.total)} ج.م</td>
                        <td className="py-2 px-3 text-emerald-600">{fmtMoney(inv.paid)} ج.م</td>
                        <td className="py-2 px-3 font-bold text-red-600">{fmtMoney(inv.remaining)} ج.م</td>
                        <td className="py-2 px-3 text-xs">{inv.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/*                            TAB 4: PRICING                                 */}
      {/* ========================================================================= */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-indigo-600" />
                قائمة الأسعار المخصصة للطبيب (Rate Sheet)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                حدد أسعاراً خاصة لهذا الطبيب تختلف عن السعر الافتراضي للمعمل. الحقل الفارغ يعتمد السعر الافتراضي تلقائياً.
              </p>
            </div>

            <button
              onClick={handleSavePricing}
              disabled={pricingSaving || pricingLoading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shrink-0"
            >
              {pricingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{pricingSaving ? "جاري الحفظ..." : "حفظ قائمة الأسعار"}</span>
            </button>
          </div>

          {pricingLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 text-right">
                      <th className="py-3 px-4">نوع الشغل / الخدمة</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">السعر الافتراضي للمعمل</th>
                      <th className="py-3 px-4">السعر المخصص للدكتور (ج.م)</th>
                      <th className="py-3 px-4">الفارق / الخصم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {workTypes.map((w) => {
                      const customVal = pricingMap[w.id];
                      const numCustom = customVal !== "" && customVal != null ? Number(customVal) : null;
                      const hasCustom = numCustom !== null && !isNaN(numCustom);
                      const diff = hasCustom ? numCustom - w.price : 0;

                      return (
                        <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                            {w.name}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">{w.category || "عام"}</td>
                          <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                            {fmtMoney(w.price)} ج.م
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              placeholder={`الافتراضي (${w.price})`}
                              value={pricingMap[w.id] ?? ""}
                              onChange={(e) =>
                                setPricingMap((prev) => ({ ...prev, [w.id]: e.target.value }))
                              }
                              className={`${MODAL_INPUT_CLS} w-36 text-sm py-1 font-semibold ${
                                hasCustom ? "border-indigo-400 bg-indigo-50/20" : ""
                              }`}
                            />
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {hasCustom ? (
                              diff < 0 ? (
                                <span className="text-emerald-600 font-bold">
                                  خصم {fmtMoney(Math.abs(diff))} ج.م (
                                  {Math.round((Math.abs(diff) / w.price) * 100)}%)
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-amber-600 font-bold">
                                  زيادة {fmtMoney(diff)} ج.م
                                </span>
                              ) : (
                                <span className="text-gray-400">نفس السعر</span>
                              )
                            ) : (
                              <span className="text-gray-400">سعر المعمل الافتراضي</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/*                            TAB 5: PORTAL & INFO                           */}
      {/* ========================================================================= */}
      {activeTab === "portal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Portal Access */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
              <KeyRound className="w-5 h-5" />
              <h3>بوابة الأطباء الذاتية (Doctor Portal)</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              تتيح البوابة للدكتور تسجيل ومتابعة طلبات التركيبات مباشرة، رفع ملفات السكانات والأشعة ثلاثية الأبعاد، واستعراض ومراجعة التصاميم.
            </p>

            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">حالة البوابة:</span>
                <span className={`font-semibold ${doctor.hasPortalPin ? "text-emerald-600" : "text-amber-600"}`}>
                  {doctor.hasPortalPin ? "مفعلة ومحمية بـ PIN" : "غير مفعلة (لا يوجد PIN)"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">رقم الهاتف للدخول:</span>
                <span className="font-mono font-bold" dir="ltr">{doctor.phone || "غير مسجل"}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowPinDialog(true)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{doctor.hasPortalPin ? "تغيير رمز الدخول (PIN)" : "تعيين رمز الدخول (PIN)"}</span>
              </button>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/dental-portal`;
                  navigator.clipboard.writeText(url);
                  toast.success("تم نسخ رابط بوابة الأطباء");
                }}
                className="px-4 py-2 border dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ رابط البوابة</span>
              </button>
            </div>
          </div>

          {/* Card 2: Contact & Registration Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
              <Building2 className="w-5 h-5" />
              <h3>بيانات الاتصال والعيادة</h3>
            </div>

            <div className="divide-y dark:divide-gray-700 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">اسم الطبيب:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">رقم الهاتف:</span>
                <span className="font-mono" dir="ltr">{doctor.phone || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">اسم العيادة / المركز:</span>
                <span>{doctor.clinicName || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">المحافظة / العنوان:</span>
                <span>{doctor.governorate || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">حد الائتمان المسموح:</span>
                <span className="font-bold">{doctor.creditLimit ? `${fmtMoney(doctor.creditLimit)} ج.م` : "مفتوح"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">تاريخ التسجيل:</span>
                <span>{doctor.createdAt ? fmtDateTime(doctor.createdAt) : "—"}</span>
              </div>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="w-full px-4 py-2 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              تعديل كامل الملف
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------- Modals Mount ----------------------------- */}
      {showEditModal && (
        <EditDoctorModal
          doctor={doctor}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setDoctor(updated)}
        />
      )}

      {showPinDialog && (
        <PortalPinDialog
          doctor={doctor}
          onClose={() => setShowPinDialog(false)}
          onSaved={(updated) => setDoctor(updated)}
        />
      )}

      {showBulkPaymentModal && (
        <BulkPaymentModal
          doctor={doctor}
          onClose={() => setShowBulkPaymentModal(false)}
          onSaved={() => {
            loadDoctor();
            if (activeTab === "invoices") loadInvoices();
            if (activeTab === "statement") loadStatement();
          }}
        />
      )}

      {selectedInvoiceToPay && (
        <SingleInvoicePaymentModal
          invoice={selectedInvoiceToPay}
          onClose={() => setSelectedInvoiceToPay(null)}
          onSaved={() => {
            loadDoctor();
            loadInvoices();
            if (activeTab === "statement") loadStatement();
          }}
        />
      )}

      {showQuickOrderModal && (
        <QuickOrderModal
          onClose={() => setShowQuickOrderModal(false)}
          preselectedDoctor={doctor}
          onSaved={() => {
            setShowQuickOrderModal(false);
            loadDoctor();
            loadCases();
            toast.success("تم إنشاء الحالة بنجاح لهذا الطبيب");
          }}
        />
      )}
    </div>
  );
}
