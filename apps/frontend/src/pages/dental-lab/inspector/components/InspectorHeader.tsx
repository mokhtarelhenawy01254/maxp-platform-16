import { Link } from "react-router-dom";
import { ExternalLink, X as XMarkIcon } from "lucide-react";
import { type DentalLabCase, PRIORITY_CONFIG } from "../../shared";

interface InspectorHeaderProps {
  caseData: DentalLabCase;
  onClose: () => void;
}

export function InspectorHeader({ caseData, onClose }: InspectorHeaderProps) {
  const priorityMeta = PRIORITY_CONFIG[caseData.priority] ?? {
    label: caseData.priority,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 animate-pulse" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight"
              dir="ltr"
            >
              {caseData.caseNumber || caseData.id.slice(0, 8)}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityMeta.color}`}
            >
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
  );
}

export default InspectorHeader;
