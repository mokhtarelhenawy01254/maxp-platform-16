import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Banknote,
  CalendarClock,
  Check,
  CheckSquare,
  Clock,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  User,
  X as XMarkIcon,
} from "lucide-react";
import {
  DentalInvoice,
  DentalLabCase,
  DentalLabDoctor,
  DoctorStatement,
  PAYMENT_STATUS_MAP,
  INVOICE_STATUS_MAP,
  fetchInvoices,
  fetchCases,
  fetchDoctors,
  createInvoice,
  addInvoicePayment,
  fetchInvoicePdf,
  fetchInvoicePaymentLink,
  fetchUninvoicedSummary,
  batchCreateMonthlyInvoices,
  recordDoctorBulkPayment,
  fetchDoctorStatement,
  UninvoicedSummaryResult,
  fmtMoney,
  fmtDate,
  fmtDateTime,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "./shared";

const FALLBACK_BADGE = { label: "", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };

const invoiceBadge = (status?: string) => {
  if (!status) return null;
  const meta = INVOICE_STATUS_MAP[status] ?? { ...FALLBACK_BADGE, label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

const paymentBadge = (status?: string) => {
  if (!status) return null;
  const meta = PAYMENT_STATUS_MAP[status as keyof typeof PAYMENT_STATUS_MAP] ?? { ...FALLBACK_BADGE, label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

function shareInvoiceWhatsApp(inv: DentalInvoice) {
  const phone = (inv.doctor?.phone || "").replace(/[^0-9]/g, "");
  const invNum = inv.invoiceNumber || inv.id.slice(0, 8);
  const patient = inv.patientName || inv.case?.patientName || "—";
  const caseNum = inv.case?.caseNumber ? ` (حالة: ${inv.case.caseNumber})` : "";
  const workType = inv.case?.workTypeName ? `\nنوع الشغل: ${inv.case.workTypeName}` : "";
  const teeth = inv.case?.teeth ? `\nالأسنان: ${inv.case.teeth}` : "";

  const text = `مرحباً دكتور ${inv.doctorName || ""}\nتحية طيبة من إدارة معمل الأسنان 🦷\nمرفق تفاصيل الفاتورة رقم: *${invNum}*\nالمريض: *${patient}*${caseNum}${workType}${teeth}\n------------------\nالإجمالي: *${fmtMoney(inv.total)} ج.م*\nالمسدد: *${fmtMoney(inv.paid)} ج.م*\nالمتبقي المستحق: *${fmtMoney(inv.remaining)} ج.م*\n------------------\nشكراً لتعاملكم معنا.`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
}

function shareStatementWhatsApp(
  docName: string,
  phone: string | undefined,
  totals: { invoiced?: number; paid?: number; remaining?: number; cases?: number }
) {
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  const text = `مرحباً دكتور ${docName}\nتحية طيبة من إدارة معمل الأسنان 🦷\nمرفق ملخص كشف الحساب:\nعدد الحالات: *${totals.cases || 0} حالة*\nإجمالي المفوتر: *${fmtMoney(totals.invoiced)} ج.م*\nإجمالي المسدد: *${fmtMoney(totals.paid)} ج.م*\n*الرصيد المتبقي المستحق: ${fmtMoney(totals.remaining)} ج.م*\n------------------\nنسعد دائماً بخدمتكم وتوفير أعلى معايير الجودة.`;

  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
}

// ==================== CREATE INVOICE MODAL ====================
function CreateInvoiceModal({
  cases,
  doctors,
  preselectedDoctorId,
  onClose,
  onSaved,
}: {
  cases: DentalLabCase[];
  doctors: DentalLabDoctor[];
  preselectedDoctorId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-lg my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-bold">{t("dentalLab.invoices.createTitle")}</h3>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 max-h-[75vh] overflow-y-auto px-0.5">
          <div>
            <label className={labelCls}>{t("dentalLab.invoices.linkCase")} (اختياري)</label>
            <select className={inputCls} value={caseId} onChange={(e) => onCaseChange(e.target.value)}>
              <option value="">-- بدون ربط بحالة (فاتورة يدوية للطبيب) --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber || c.id.slice(0, 8)} — {c.patientName} {c.doctorName ? `(د. ${c.doctorName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>اختر الطبيب *</label>
              <select className={inputCls} value={doctorId} onChange={(e) => onDoctorSelect(e.target.value)}>
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
              <input className={inputCls} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="د. ..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("dentalLab.invoices.patientName")}</label>
              <input className={inputCls} value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="اسم المريض" />
            </div>
            <div>
              <label className={labelCls}>تاريخ الاستحقاق</label>
              <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t("dentalLab.invoices.total")} (ج.م) *</label>
            <input className={inputCls} type="number" min="0" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
          </div>

          <div className="border-t dark:border-gray-800 pt-3 mt-2">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-green-600" />
              سداد دفعة فورية مع إنشاء الفاتورة (اختياري)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentAmount")} (ج.م)</label>
                <input className={inputCls} type="number" min="0" max={total || undefined} value={paidNow} onChange={(e) => setPaidNow(Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.detail.paymentMethod")}</label>
                <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
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
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي تفاصيل أو بنود إضافية..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t dark:border-gray-800 mt-4">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || (!doctorName.trim() && !doctorId && !caseId)} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== PAYMENT MODAL ====================
function PaymentModal({ invoice, onClose, onSaved }: { invoice: DentalInvoice; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(invoice.remaining > 0 ? invoice.remaining : 0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    if (!(Number(amount) > 0)) {
      toast.error(t("dentalLab.detail.paymentAmount"));
      return;
    }
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            <h3 className="text-base sm:text-lg font-bold">{t("dentalLab.invoices.paymentTitle")}</h3>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-xs space-y-1 mb-4 border dark:border-gray-700/50">
          <p className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>رقم الفاتورة:</span> <span className="font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber || invoice.id.slice(0, 8)}</span>
          </p>
          <p className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>الطبيب:</span> <span className="font-semibold text-gray-900 dark:text-gray-100">{invoice.doctorName || "—"}</span>
          </p>
          <p className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>المتبقي المستحق:</span> <span className="font-bold text-red-600">{fmtMoney(invoice.remaining)} ج.م</span>
          </p>
        </div>

        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("dentalLab.detail.paymentAmount")} *</label>
              {invoice.remaining > 0 && (
                <button type="button" onClick={() => setAmount(invoice.remaining)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  سداد كامل المتبقي ({fmtMoney(invoice.remaining)})
                </button>
              )}
            </div>
            <input className={MODAL_INPUT_CLS} type="number" min="0.01" step="any" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentMethod")}</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">نقدي (كاش)</option>
              <option value="BANK">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش / محفظة</option>
              <option value="CARD">فيزا / بطاقة</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentNote")}</label>
            <input className={MODAL_INPUT_CLS} value={note} onChange={(e) => setNote(e.target.value)} placeholder="رقم الإيصال أو ملاحظة..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t dark:border-gray-800 mt-4">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || !(Number(amount) > 0)} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? t("dentalLab.common.saving") : "تسجيل الدفعة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== BATCH MONTHLY INVOICE MODAL ====================
function BatchMonthlyInvoiceModal({
  summary,
  onClose,
  onSaved,
}: {
  summary: UninvoicedSummaryResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>(
    summary.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
  );
  const [mode, setMode] = useState<"PER_CASE" | "CONSOLIDATED">("PER_CASE");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(10);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allSelected = summary.doctors.length > 0 && selectedDoctorIds.length === summary.doctors.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDoctorIds([]);
    } else {
      setSelectedDoctorIds(summary.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id)));
    }
  };

  const toggleDoctor = (id: string | null) => {
    if (!id) return;
    setSelectedDoctorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedStats = useMemo(() => {
    const filtered = summary.doctors.filter((d) => d.doctorId && selectedDoctorIds.includes(d.doctorId));
    const cases = filtered.reduce((sum, d) => sum + d.casesCount, 0);
    const amount = filtered.reduce((sum, d) => sum + d.totalAmount, 0);
    return { doctorsCount: filtered.length, cases, amount };
  }, [summary, selectedDoctorIds]);

  const handleRunBatch = async () => {
    if (selectedDoctorIds.length === 0) {
      toast.error("يرجى اختيار طبيب واحد على الأقل لإصدار الفواتير له");
      return;
    }
    setSubmitting(true);
    try {
      const res = await batchCreateMonthlyInvoices({
        doctorIds: selectedDoctorIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        mode,
      });
      toast.success(`تم إنشاء ${res.createdCount} فاتورة بنجاح لـ ${res.invoicedCasesCount} حالة!`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الفواتير المجمعة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => !submitting && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-2xl my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">إصدار الفواتير الشهرية المجمعة</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">تجميع الحالات المكتملة والمسلمة وإصدار مطالبات رسمية للأطباء</p>
            </div>
          </div>
          <button onClick={() => !submitting && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-0.5">
          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border dark:border-gray-700/50">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">نمط إصدار الفواتير</label>
              <select className={`${MODAL_INPUT_CLS} text-sm`} value={mode} onChange={(e) => setMode(e.target.value as "PER_CASE" | "CONSOLIDATED")}>
                <option value="PER_CASE">فاتورة مستقلة لكل حالة (موصى به - تفصيل أسماء المرضى)</option>
                <option value="CONSOLIDATED">فاتورة شهرية مجمعة واحدة لكل طبيب</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">تاريخ استحقاق الفواتير</label>
              <input type="date" className={`${MODAL_INPUT_CLS} text-sm`} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">ملاحظات تظهر على الفواتير الصادرة</label>
              <input className={`${MODAL_INPUT_CLS} text-sm`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: مطالبات دورية لشهر ..." />
            </div>
          </div>

          {/* Doctors Selection Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>{allSelected ? "إلغاء تحديد الكل" : "تحديد جميع الأطباء"}</span>
              </button>
            </div>
            <span className="text-xs text-gray-500">
              المحدد: <strong className="text-gray-900 dark:text-gray-100">{selectedStats.doctorsCount} طبيب</strong> ({selectedStats.cases} حالة) بإجمالي{" "}
              <strong className="text-blue-600 dark:text-blue-400">{fmtMoney(selectedStats.amount)} ج.م</strong>
            </span>
          </div>

          {/* Doctor Rows */}
          <div className="border dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700 max-h-56 overflow-y-auto">
            {summary.doctors.map((doc) => {
              const isSelected = Boolean(doc.doctorId && selectedDoctorIds.includes(doc.doctorId));
              return (
                <div
                  key={doc.doctorId || doc.doctorName}
                  onClick={() => toggleDoctor(doc.doctorId)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50/60 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 dark:border-gray-600"}`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.doctorName}</p>
                      <p className="text-xs text-gray-500">{doc.clinicName ? `${doc.clinicName} • ` : ""}{doc.casesCount} حالة غير مفوترة</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtMoney(doc.totalAmount)} ج.م</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800 mt-4">
          <div className="text-xs text-gray-500">
            سيتم إنشاء الفواتير بنمط <span className="font-semibold text-gray-700 dark:text-gray-300">{mode === "PER_CASE" ? "فاتورة لكل حالة" : "فاتورة مجمعة"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              إلغاء
            </button>
            <button
              onClick={handleRunBatch}
              disabled={submitting || selectedDoctorIds.length === 0}
              className="px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {submitting ? "جاري الإصدار..." : `إصدار (${selectedStats.cases}) فاتورة`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCTOR BULK PAYMENT MODAL ====================
function BulkPaymentModal({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<string>(String(doctor.outstanding && doctor.outstanding > 0 ? doctor.outstanding : ""));
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
      const res = await recordDoctorBulkPayment(doctor.id, { amount: val, method, note: note.trim() || undefined });
      toast.success(`تم تسجيل دفعة بقيمة ${fmtMoney(res.totalPaid)} ج.م وتوزيعها على ${res.allocations.length} فاتورة بنجاح`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            <h3 className="text-base sm:text-lg font-bold">تحصيل دفعة على حساب الطبيب</h3>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          الطبيب: <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.name}</span> — المتبقي الحالي:{" "}
          <span className="font-bold text-red-600">{fmtMoney(doctor.outstanding ?? 0)} ج.م</span>
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-3.5 py-2 text-xs mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">المبلغ المحصل *</label>
              {(doctor.outstanding ?? 0) > 0 && (
                <button type="button" onClick={() => setAmount(String(doctor.outstanding))} className="text-xs text-blue-600 hover:underline">
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
            <p className="text-[11px] text-gray-400 mt-1">سيتم توزيع المبلغ تلقائياً على فواتير الطبيب المفتوحة بالأقدمية (FIFO).</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">نقدي (كاش)</option>
              <option value="BANK">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش / محفظة</option>
              <option value="CARD">فيزا / بطاقة</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">ملاحظات أو رقم الإيصال</label>
            <input className={MODAL_INPUT_CLS} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: إيصال رقم #..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t dark:border-gray-800 mt-4">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            إلغاء
          </button>
          <button onClick={save} disabled={saving || !Number(amount)} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "جاري التسجيل..." : "تأكيد التحصيل"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCTOR STATEMENT MODAL ====================
function DoctorStatementModal({
  doctor,
  onClose,
  onBulkPayment,
}: {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onBulkPayment: () => void;
}) {
  const [statement, setStatement] = useState<DoctorStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"invoices" | "cases">("invoices");

  const loadStatement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDoctorStatement({
        doctorId: doctor.id,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setStatement(data);
    } catch (e) {
      toast.error("فشل جلب كشف الحساب");
    } finally {
      setLoading(false);
    }
  }, [doctor.id, from, to]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-4xl my-6 print:shadow-none print:p-0`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b dark:border-gray-800 mb-4 gap-3 print:border-b-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl print:hidden">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                كشف حساب الطبيب: {doctor.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {doctor.clinicName ? `${doctor.clinicName} • ` : ""}{doctor.phone ? `هاتف: ${doctor.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => shareStatementWhatsApp(doctor.name, doctor.phone, statement?.totals || {})}
              className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-green-100"
              title="إرسال كشف الحساب عبر الواتساب"
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span>واتساب</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 border dark:border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onBulkPayment}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700"
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل دفعة</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pb-3 border-b dark:border-gray-800 text-xs print:hidden">
          <span className="font-semibold text-gray-600 dark:text-gray-400">الفترة:</span>
          <div className="flex items-center gap-1.5">
            <span>من:</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border dark:border-gray-700 rounded px-2 py-1 text-xs dark:bg-gray-800" />
          </div>
          <div className="flex items-center gap-1.5">
            <span>إلى:</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border dark:border-gray-700 rounded px-2 py-1 text-xs dark:bg-gray-800" />
          </div>
          <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            عرض الكل
          </button>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
          <div className="p-3 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">عدد الفواتير / الحالات</span>
            <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
              {statement?.totals?.invoicesCount ?? 0} فاتورة ({statement?.totals?.cases ?? 0} حالة)
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border dark:border-gray-700 rounded-xl">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">إجمالي المفوتر</span>
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {fmtMoney(statement?.totals?.invoiced)} ج.م
            </p>
          </div>
          <div className="p-3 bg-green-50/60 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl">
            <span className="text-[11px] text-green-700 dark:text-green-400 font-medium">إجمالي المسدد</span>
            <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-400 mt-0.5">
              {fmtMoney(statement?.totals?.paid)} ج.م
            </p>
          </div>
          <div className="p-3 bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
            <span className="text-[11px] text-red-700 dark:text-red-400 font-medium">الرصيد المتبقي المستحق</span>
            <p className="text-base sm:text-lg font-bold text-red-600 mt-0.5">
              {fmtMoney(statement?.totals?.remaining)} ج.م
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b dark:border-gray-800 mb-3 print:hidden">
          <button
            onClick={() => setTab("invoices")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === "invoices" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            سجل الفواتير ({statement?.invoices?.length || 0})
          </button>
          <button
            onClick={() => setTab("cases")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === "cases" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            سجل الحالات ({statement?.cases?.length || 0})
          </button>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : tab === "invoices" ? (
          <div className="overflow-x-auto max-h-72 border dark:border-gray-700 rounded-xl">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">المريض / الحالة</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">المسدد</th>
                  <th className="py-2.5 px-3">المتبقي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {(!statement?.invoices || statement.invoices.length === 0) ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">لا توجد فواتير مسجلة في هذه الفترة</td></tr>
                ) : (
                  statement.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(inv.createdAt)}</td>
                      <td className="py-2.5 px-3">{inv.patientName || "—"}</td>
                      <td className="py-2.5 px-3 font-medium">{fmtMoney(inv.total)}</td>
                      <td className="py-2.5 px-3 text-green-600">{fmtMoney(inv.paid)}</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{fmtMoney(inv.remaining)}</td>
                      <td className="py-2.5 px-3">{invoiceBadge(inv.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72 border dark:border-gray-700 rounded-xl">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">رقم الحالة</th>
                  <th className="py-2.5 px-3">المريض</th>
                  <th className="py-2.5 px-3">نوع الشغل</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">المسدد</th>
                  <th className="py-2.5 px-3">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {(!statement?.cases || statement.cases.length === 0) ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">لا توجد حالات مسجلة في هذه الفترة</td></tr>
                ) : (
                  statement.cases.map((c, idx) => (
                    <tr key={c.caseNumber || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{c.caseNumber || "—"}</td>
                      <td className="py-2.5 px-3 font-medium">{c.patientName || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{c.workTypeName || "—"}</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-gray-800">{c.status || "—"}</span></td>
                      <td className="py-2.5 px-3 font-medium">{fmtMoney(c.total)}</td>
                      <td className="py-2.5 px-3 text-green-600">{fmtMoney(c.paid)}</td>
                      <td className="py-2.5 px-3 text-red-600 font-bold">{fmtMoney(c.remaining)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800 mt-4 print:hidden">
          <span className="text-xs text-gray-400">تم إنشاء كشف الحساب آلياً من منصة MaxP Dental Lab</span>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== INVOICE DETAIL DRAWER / MODAL ====================
function InvoiceDetailModal({
  invoice,
  onClose,
  onAddPayment,
  onPdf,
  onPaymentLink,
}: {
  invoice: DentalInvoice;
  onClose: () => void;
  onAddPayment: () => void;
  onPdf: () => void;
  onPaymentLink: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-xl my-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">فاتورة #{invoice.invoiceNumber || invoice.id.slice(0, 8)}</h3>
                {invoiceBadge(invoice.status)}
              </div>
              <p className="text-xs text-gray-400">تاريخ الإصدار: {fmtDateTime(invoice.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[72vh] overflow-y-auto px-0.5 text-xs">
          {/* Doctor & Patient Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-700/60">
            <div>
              <span className="text-gray-400 block mb-0.5">بيانات الطبيب</span>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{invoice.doctorName || "—"}</p>
              {invoice.doctor?.clinicName && <p className="text-gray-500 mt-0.5">{invoice.doctor.clinicName}</p>}
              {invoice.doctor?.phone && <p className="text-gray-500 mt-0.5">{invoice.doctor.phone}</p>}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">بيانات المريض والحالة</span>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{invoice.patientName || invoice.case?.patientName || "—"}</p>
              {invoice.case?.caseNumber && (
                <p className="text-blue-600 dark:text-blue-400 font-semibold mt-0.5">حالة رقم: {invoice.case.caseNumber}</p>
              )}
              {invoice.dueDate && (
                <p className="text-amber-600 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> استحقاق: {fmtDate(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Case Breakdown if linked */}
          {invoice.case && (
            <div className="p-3 bg-blue-50/40 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="font-bold text-gray-800 dark:text-gray-200 block mb-2">تفاصيل العمل الفني بالحالة:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-400">نوع الشغل:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.workTypeName || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">عدد الكراونات/الوحدات:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.unitsCount || 1} وحدة</p>
                </div>
                <div>
                  <span className="text-gray-400">سعر الوحدة:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(invoice.case.unitPrice)} ج.م</p>
                </div>
                <div>
                  <span className="text-gray-400">الأسنان:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.teeth || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">اللون (Shade):</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.shade || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">الخامة:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.material || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Financial Totals */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border dark:border-gray-700/60">
            <div>
              <span className="text-gray-400">الإجمالي</span>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">{fmtMoney(invoice.total)} ج.م</p>
            </div>
            <div>
              <span className="text-gray-400">المسدد</span>
              <p className="text-base font-bold text-green-600 dark:text-green-400">{fmtMoney(invoice.paid)} ج.م</p>
            </div>
            <div>
              <span className="text-gray-400">المتبقي</span>
              <p className="text-base font-bold text-red-600">{fmtMoney(invoice.remaining)} ج.م</p>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg text-amber-900 dark:text-amber-300">
              <span className="font-semibold">ملاحظات:</span> {invoice.notes}
            </div>
          )}

          {/* Payment History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-900 dark:text-gray-100">سجل الدفعات المسددة ({invoice.payments?.length || 0})</span>
              {invoice.remaining > 0 && (
                <button
                  type="button"
                  onClick={onAddPayment}
                  className="text-xs text-green-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة دفعة
                </button>
              )}
            </div>

            {(!invoice.payments || invoice.payments.length === 0) ? (
              <p className="text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-700">لم يتم تسجيل أي دفعات لهذه الفاتورة بعد</p>
            ) : (
              <div className="border dark:border-gray-700 rounded-xl overflow-hidden divide-y dark:divide-gray-700">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <div>
                      <p className="font-bold text-green-700 dark:text-green-400">{fmtMoney(p.amount)} ج.م</p>
                      <p className="text-[11px] text-gray-400">
                        {fmtDateTime(p.createdAt)} • طريقة: <span className="font-semibold">{p.method || "CASH"}</span>
                      </p>
                    </div>
                    {p.note && <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{p.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t dark:border-gray-800 mt-4">
          <div className="flex items-center gap-2">
            <button onClick={onPdf} className="px-3 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> فاتورة PDF
            </button>
            <button onClick={onPaymentLink} className="px-3 py-1.5 border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-900/30 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> رابط دفع
            </button>
            <button onClick={() => shareInvoiceWhatsApp(invoice)} className="px-3 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> إرسال واتساب
            </button>
          </div>

          <div className="flex items-center gap-2">
            {invoice.remaining > 0 && (
              <button onClick={onAddPayment} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> تسجيل سداد
              </button>
            )}
            <button onClick={onClose} className="px-4 py-1.5 border dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN INVOICES TAB ====================
export default function DentalInvoicesTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalInvoice[]>([]);
  const [cases, setCases] = useState<DentalLabCase[]>([]);
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [uninvoicedSummary, setUninvoicedSummary] = useState<UninvoicedSummaryResult | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<DentalInvoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<DentalInvoice | null>(null);
  const [statementDoctor, setStatementDoctor] = useState<DentalLabDoctor | null>(null);
  const [bulkPaymentDoctor, setBulkPaymentDoctor] = useState<DentalLabDoctor | null>(null);

  // Compute date ranges
  const dateParams = useMemo(() => {
    if (datePreset === "THIS_MONTH") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { from };
    }
    if (datePreset === "LAST_MONTH") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      return { from, to };
    }
    return {};
  }, [datePreset]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const [invs, cs, docs, uninv] = await Promise.all([
          fetchInvoices({
            doctorId: selectedDoctorId || undefined,
            status: statusFilter !== "ALL" ? statusFilter : undefined,
            search: searchQuery.trim() || undefined,
            ...dateParams,
          }),
          fetchCases({ limit: 100 }),
          fetchDoctors(),
          fetchUninvoicedSummary().catch(() => null),
        ]);
        setRows(invs);
        setCases(cs.data);
        setDoctors(docs);
        if (uninv) setUninvoicedSummary(uninv);
      } catch (e) {
        if (!opts?.silent) {
          setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
          toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
        }
      }
    },
    [t, selectedDoctorId, statusFilter, searchQuery, dateParams]
  );

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Selected doctor object & stats
  const activeDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [selectedDoctorId, doctors]);

  const activeDoctorStats = useMemo(() => {
    if (!activeDoctor) return null;
    const docInvoices = rows.filter((r) => r.doctorId === activeDoctor.id || r.doctorName === activeDoctor.name);
    const totalBilled = docInvoices.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const totalPaid = docInvoices.reduce((sum, r) => sum + (Number(r.paid) || 0), 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);
    const uninvoicedInfo = uninvoicedSummary?.doctors.find((d) => d.doctorId === activeDoctor.id);

    return {
      totalBilled,
      totalPaid,
      outstanding,
      invoicesCount: docInvoices.length,
      uninvoicedCases: uninvoicedInfo?.casesCount ?? 0,
      uninvoicedAmount: uninvoicedInfo?.totalAmount ?? 0,
      creditLimit: activeDoctor.creditLimit || 0,
      creditExceeded: (activeDoctor.creditLimit || 0) > 0 && outstanding > (activeDoctor.creditLimit || 0),
    };
  }, [activeDoctor, rows, uninvoicedSummary]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>{t("dentalLab.invoices.title")}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">إدارة ومتابعة فواتير الأطباء ودورات التحصيل والفوترة الشهرية</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {uninvoicedSummary && uninvoicedSummary.totalCases > 0 && (
            <button
              onClick={() => setBatchOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:from-amber-600 hover:to-orange-600 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>فوترة مجمعة ({uninvoicedSummary.totalCases} حالة)</span>
            </button>
          )}

          <button
            onClick={() => refresh()}
            className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span>{t("dentalLab.common.refresh")}</span>
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t("dentalLab.invoices.newInvoice")}</span>
          </button>
        </div>
      </div>

      {/* Uninvoiced Billing Banner */}
      {uninvoicedSummary && uninvoicedSummary.totalCases > 0 && !selectedDoctorId && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">دورة الفوترة الشهرية وتصفية الحسابات</h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {uninvoicedSummary.totalCases} حالة معلقة
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                يوجد {uninvoicedSummary.totalCases} حالة مكتملة/مسلمة لـ {uninvoicedSummary.totalDoctors} طبيب بإجمالي{" "}
                <span className="font-bold text-blue-700 dark:text-blue-300">{fmtMoney(uninvoicedSummary.totalAmount)} {t("dentalLab.common.egp")}</span>{" "}
                جاهزة لإصدار فواتيرها بنقرة واحدة.
              </p>
            </div>
          </div>
          <button
            onClick={() => setBatchOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>إصدار الفواتير المجمعة الآن</span>
          </button>
        </div>
      )}

      {/* Doctor Selection Bar & Active Doctor Dashboard */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">حساب الطبيب:</span>
            <select
              className="flex-1 border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">-- جميع الأطباء (عرض شامل) --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.clinicName ? `(${d.clinicName})` : ""} {d.outstanding ? `— متبقي: ${fmtMoney(d.outstanding)} ج.م` : ""}
                </option>
              ))}
            </select>
          </div>

          {activeDoctor && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatementDoctor(activeDoctor)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>كشف حساب الطبيب</span>
              </button>
              <button
                onClick={() => setBulkPaymentDoctor(activeDoctor)}
                className="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-green-100"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>تحصيل دفعة</span>
              </button>
              {activeDoctor.phone && (
                <button
                  onClick={() => shareStatementWhatsApp(activeDoctor.name, activeDoctor.phone, activeDoctorStats || {})}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100"
                  title="مراسلة الطبيب عبر واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selected Doctor Financial Strip */}
        {activeDoctor && activeDoctorStats && (
          <div className="pt-2 border-t dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
              <span className="text-gray-400 block text-[11px]">إجمالي الفواتير</span>
              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {fmtMoney(activeDoctorStats.totalBilled)} ج.م <span className="text-[10px] text-gray-400 font-normal">({activeDoctorStats.invoicesCount} فاتورة)</span>
              </p>
            </div>
            <div className="p-2.5 bg-green-50/60 dark:bg-green-900/20 rounded-lg">
              <span className="text-green-700 dark:text-green-400 block text-[11px]">إجمالي المسدد</span>
              <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400 mt-0.5">
                {fmtMoney(activeDoctorStats.totalPaid)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-red-50/60 dark:bg-red-900/20 rounded-lg">
              <span className="text-red-700 dark:text-red-400 block text-[11px]">المديونية الحالية المتبقية</span>
              <p className="text-sm sm:text-base font-bold text-red-600 mt-0.5">
                {fmtMoney(activeDoctorStats.outstanding)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg">
              <span className="text-amber-700 dark:text-amber-400 block text-[11px]">حالات غير مفوترة</span>
              <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                {activeDoctorStats.uninvoicedCases} حالة ({fmtMoney(activeDoctorStats.uninvoicedAmount)} ج.م)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full pl-3 pr-9 py-1.5 border dark:border-gray-700 rounded-lg text-xs sm:text-sm dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            placeholder="بحث برقم الفاتورة، اسم الدكتور، المريض..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "الكل" },
            { id: "OPEN", label: "غير مسددة" },
            { id: "PARTIAL", label: "مسددة جزئياً" },
            { id: "PAID", label: "مسددة" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-1 border-r dark:border-gray-800 pr-2">
          {[
            { id: "ALL", label: "كل الفترات" },
            { id: "THIS_MONTH", label: "هذا الشهر" },
            { id: "LAST_MONTH", label: "الشهر السابق" },
          ].map((dp) => (
            <button
              key={dp.id}
              onClick={() => setDatePreset(dp.id as "ALL" | "THIS_MONTH" | "LAST_MONTH")}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                datePreset === dp.id
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {dp.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300">{t("dentalLab.invoices.noData")}</p>
            <p className="text-xs text-gray-400 mt-1">جرّب تغيير فلاتر البحث أو الطبيب المحدد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right">
              <thead className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-300 font-bold">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">رقم الفاتورة</th>
                  <th className="py-3 px-3 whitespace-nowrap">التاريخ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">{t("dentalLab.invoices.doctorName")}</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">الحالة / المريض</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.invoices.total")}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.invoices.paid")}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.invoices.remaining")}</th>
                  <th className="py-3 px-3 whitespace-nowrap">الاستحقاق</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.common.status")}</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">{t("dentalLab.common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {rows.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setDetailInvoice(inv)}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {inv.invoiceNumber || inv.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
                    <td className="py-3 px-3.5 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {inv.doctorName || "—"}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{inv.patientName || inv.case?.patientName || "—"}</span>
                        {inv.case?.caseNumber && (
                          <span className="text-[11px] text-gray-400">حالة: {inv.case.caseNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtMoney(inv.total)}</td>
                    <td className="py-3 px-3 text-green-600 dark:text-green-400 font-semibold whitespace-nowrap">{fmtMoney(inv.paid)}</td>
                    <td className="py-3 px-3 text-red-600 font-bold whitespace-nowrap">{fmtMoney(inv.remaining)}</td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {inv.dueDate ? (
                        <span className="text-xs text-amber-700 dark:text-amber-400">{fmtDate(inv.dueDate)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{invoiceBadge(inv.status)}</td>
                    <td className="py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailInvoice(inv)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                          title="تفاصيل الفاتورة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title={t("dentalLab.invoices.pdf")}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => shareInvoiceWhatsApp(inv)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                          title="إرسال الفاتورة عبر واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
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
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                          title={t("dentalLab.invoices.paymentLink")}
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        {inv.remaining > 0 && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 rounded-lg text-xs font-semibold"
                            title={t("dentalLab.invoices.addPayment")}
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>سداد</span>
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

      {/* All modals */}
      {createOpen && (
        <CreateInvoiceModal
          cases={cases}
          doctors={doctors}
          preselectedDoctorId={selectedDoctorId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            refresh({ silent: true });
          }}
        />
      )}

      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSaved={() => {
            setPaymentInvoice(null);
            refresh({ silent: true });
          }}
        />
      )}

      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onAddPayment={() => {
            const inv = detailInvoice;
            setDetailInvoice(null);
            setPaymentInvoice(inv);
          }}
          onPdf={async () => {
            try {
              const blob = await fetchInvoicePdf(detailInvoice.id);
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
            } catch (e) {
              toast.error("فشل جلب ملف الفاتورة");
            }
          }}
          onPaymentLink={async () => {
            try {
              const r = await fetchInvoicePaymentLink(detailInvoice.id);
              if (r.configured && r.checkoutUrl) window.open(r.checkoutUrl, "_blank");
              else toast.info(r.message || "الدفع الإلكتروني غير مهيأ");
            } catch (e) {
              toast.error("فشل جلب رابط الدفع");
            }
          }}
        />
      )}

      {batchOpen && uninvoicedSummary && (
        <BatchMonthlyInvoiceModal
          summary={uninvoicedSummary}
          onClose={() => setBatchOpen(false)}
          onSaved={() => {
            setBatchOpen(false);
            refresh({ silent: true });
          }}
        />
      )}

      {statementDoctor && (
        <DoctorStatementModal
          doctor={statementDoctor}
          onClose={() => setStatementDoctor(null)}
          onBulkPayment={() => {
            const doc = statementDoctor;
            setStatementDoctor(null);
            setBulkPaymentDoctor(doc);
          }}
        />
      )}

      {bulkPaymentDoctor && (
        <BulkPaymentModal
          doctor={bulkPaymentDoctor}
          onClose={() => setBulkPaymentDoctor(null)}
          onSaved={() => {
            setBulkPaymentDoctor(null);
            refresh({ silent: true });
          }}
        />
      )}
    </div>
  );
}