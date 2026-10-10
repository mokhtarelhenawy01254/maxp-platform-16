import { type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightCircle,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Pencil,
  Phone,
  Printer,
  Stethoscope,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X as XMarkIcon,
} from "lucide-react";
import {
  DentalLabCase,
  CASE_STATUS_MAP,
  PRIORITY_CONFIG,
  ROLE_CONFIG,
  nextStatusOf,
  fmtMoney,
  fmtDate,
} from "./shared";

interface DentalCaseInspectorProps {
  caseData: DentalLabCase;
  onClose: () => void;
  onAdvance: (c: DentalLabCase) => void;
  onAssign: (c: DentalLabCase) => void;
  onEdit: (c: DentalLabCase) => void;
  onInvoice: (c: DentalLabCase) => void;
  onUpload: (c: DentalLabCase, e: ChangeEvent<HTMLInputElement>) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onPrintWorkOrder: (c: DentalLabCase) => void;
  onTrash: (c: DentalLabCase) => void;
  isBusy: boolean;
  uploadingId: string | null;
}

export default function DentalCaseInspector({
  caseData,
  onClose,
  onAdvance,
  onAssign,
  onEdit,
  onInvoice,
  onUpload,
  onPrintPanLabel,
  onPrintWorkOrder,
  onTrash,
  isBusy,
  uploadingId,
}: DentalCaseInspectorProps) {
  const next = nextStatusOf(caseData.status);

  const isOverdue =
    Boolean(caseData.dueDate) &&
    !caseData.isDeleted &&
    caseData.status !== "DELIVERED" &&
    caseData.status !== "CLOSED" &&
    new Date(caseData.dueDate!) < new Date();

  const daysOverdue = isOverdue
    ? Math.max(1, Math.floor((Date.now() - new Date(caseData.dueDate!).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const total = Number(caseData.total) || 0;
  const paid = Number(caseData.paid) || 0;
  const remaining = Number(caseData.remaining) || 0;
  const isPaidFull = total > 0 && remaining <= 0;
  const isPartial = paid > 0 && remaining > 0;

  const priorityMeta = PRIORITY_CONFIG[caseData.priority] ?? {
    label: caseData.priority,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  const statusMeta = CASE_STATUS_MAP[caseData.status] ?? {
    label: caseData.status,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Top Header */}
      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight" dir="ltr">
                {caseData.caseNumber || caseData.id.slice(0, 8)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityMeta.color}`}>
                {priorityMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {caseData.patientName} • د. {caseData.doctorName || "غير محدد"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`/dental-lab/cases/${caseData.id}`}
            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
            title="فتح صفحة الحالة الكاملة"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
            title="إغلاق لوحة المعاينة"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Action Command Bar */}
      <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center gap-1.5">
        {next && (
          <button
            type="button"
            onClick={() => onAdvance(caseData)}
            disabled={isBusy}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            title={`تمرير الحالة إلى: ${CASE_STATUS_MAP[next]?.label || next}`}
          >
            <ArrowRightCircle className="w-4 h-4 rtl:rotate-180" />
            <span>نقل إلى: {CASE_STATUS_MAP[next]?.label || next}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onPrintPanLabel(caseData)}
          className="flex items-center gap-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          title="طباعة تيكت صينية المعمل (Pan Label)"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>تيكت</span>
        </button>

        <button
          type="button"
          onClick={() => onPrintWorkOrder(caseData)}
          className="flex items-center gap-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          title="طباعة أمر الشغل (Work Order PDF)"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span>أمر شغل</span>
        </button>

        <button
          type="button"
          onClick={() => onAssign(caseData)}
          className="flex items-center gap-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          title="إسناد فنيين للحالة"
        >
          <UserPlus className="w-3.5 h-3.5 text-purple-500" />
          <span>إسناد</span>
        </button>

        <button
          type="button"
          onClick={() => onInvoice(caseData)}
          className="flex items-center gap-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          title="إصدار فاتورة أو تسجيل دفعة"
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
          <span>فاتورة</span>
        </button>

        <label
          className="flex items-center gap-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          title="رفع مرفقات وصور للحالة"
        >
          {uploadingId === caseData.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-teal-500" />
          )}
          <span>مرفق</span>
          <input type="file" multiple className="hidden" onChange={(e) => onUpload(caseData, e)} />
        </label>

        <button
          type="button"
          onClick={() => onEdit(caseData)}
          className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors shadow-2xs"
          title="تعديل سريع للحالة"
        >
          <Pencil className="w-3.5 h-3.5 text-blue-500" />
        </button>

        <button
          type="button"
          onClick={() => onTrash(caseData)}
          disabled={isBusy}
          className="p-1.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-red-500 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
          title="نقل لسلة المهملات"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
        {/* Status & Overdue Alert */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">مرحلة التشغيل:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          </div>

          {isOverdue ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>متأخر {daysOverdue} يوم</span>
            </span>
          ) : caseData.dueDate ? (
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>تسليم: {fmtDate(caseData.dueDate)}</span>
            </span>
          ) : null}
        </div>

        {/* Doctor & Patient Micro-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Doctor */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>الطبيب والعيادة</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              {caseData.doctorName ? `د. ${caseData.doctorName}` : "—"}
            </p>
            {caseData.doctor?.clinicName && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                عيادة: {caseData.doctor.clinicName}
              </p>
            )}
            {caseData.doctorId && (
              <Link
                to={`/dental-lab/doctors/${caseData.doctorId}`}
                className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
              >
                <span>كشف حساب الطبيب</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>

          {/* Patient */}
          <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>المريض</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              {caseData.patientName || "—"}
            </p>
            {caseData.patientPhone ? (
              <a
                href={`tel:${caseData.patientPhone}`}
                className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-blue-600 mt-0.5"
                dir="ltr"
              >
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{caseData.patientPhone}</span>
              </a>
            ) : (
              <p className="text-[11px] text-slate-400">—</p>
            )}
          </div>
        </div>

        {/* Technical Specs Bento Grid */}
        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>مواصفات التركيبة / الشغل</span>
            </span>
            <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md text-[11px]">
              {caseData.workTypeName || "نوع الشغل غير محدد"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">الأسنان والوحدات:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {caseData.teeth ? `الأسنان: ${caseData.teeth}` : `${caseData.unitsCount || 1} وحدة`}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">اللون (Shade):</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {caseData.shade || "غير محدد"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">الخامة / المادة:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {caseData.material || "غير محدد"}
                {caseData.materialBrand ? ` (${caseData.materialBrand})` : ""}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">فترة الضمان:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {caseData.warrantyYears ? `${caseData.warrantyYears} سنوات` : "بدون ضمان"}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Technicians */}
        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>الفنيون المسندون</span>
            </span>
            <button
              type="button"
              onClick={() => onAssign(caseData)}
              className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              + إضافة فني
            </button>
          </div>

          {caseData.assignments && caseData.assignments.length > 0 ? (
            <div className="space-y-1.5">
              {caseData.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px]">
                      👤
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {a.technician?.name || a.technicianId}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {ROLE_CONFIG[a.role]?.label || a.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-[11px]">
              لم يتم إسناد أي فني على هذه الحالة بعد
            </div>
          )}
        </div>

        {/* Financial Overview Card */}
        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              <span>الحساب والمستحقات</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isPaidFull
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : isPartial
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
              }`}
            >
              {isPaidFull ? "مسدد بالكامل ✓" : isPartial ? "مسدد جزئياً" : "غير مسدد"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 block text-[10px]">الإجمالي</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs">
                {fmtMoney(total)}
              </span>
            </div>

            <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg">
              <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">المدفوع</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300 text-xs">
                {fmtMoney(paid)}
              </span>
            </div>

            <div className="p-2 bg-rose-50/60 dark:bg-rose-950/20 rounded-lg">
              <span className="text-rose-600 dark:text-rose-400 block text-[10px]">المتبقي</span>
              <span className="font-bold font-mono text-rose-700 dark:text-rose-300 text-xs">
                {fmtMoney(remaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor & Lab Notes */}
        {caseData.notes && (
          <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">
              ملاحظات وتعليمات الطبيب:
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-[11px]">
              {caseData.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
