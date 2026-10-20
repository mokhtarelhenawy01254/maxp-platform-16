import { type ChangeEvent } from "react";
import {
  ArrowRightCircle,
  CreditCard,
  FileText,
  Loader2,
  Pencil,
  Printer,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  type DentalLabCase,
  CASE_STATUS_MAP,
  nextStatusOf,
} from "../../shared";

interface InspectorActionBarProps {
  caseData: DentalLabCase;
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

export function InspectorActionBar({
  caseData,
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
}: InspectorActionBarProps) {
  const next = nextStatusOf(caseData.status);

  return (
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
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onUpload(caseData, e)}
        />
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
  );
}

export default InspectorActionBar;
