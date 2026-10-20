import { AlertTriangle, Clock } from "lucide-react";
import { type DentalLabCase, CASE_STATUS_MAP, fmtDate } from "../../shared";

interface InspectorStatusBannerProps {
  caseData: DentalLabCase;
}

export function InspectorStatusBanner({ caseData }: InspectorStatusBannerProps) {
  const isOverdue =
    Boolean(caseData.dueDate) &&
    !caseData.isDeleted &&
    caseData.status !== "DELIVERED" &&
    caseData.status !== "CLOSED" &&
    new Date(caseData.dueDate!) < new Date();

  const daysOverdue = isOverdue
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(caseData.dueDate!).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const statusMeta = CASE_STATUS_MAP[caseData.status] ?? {
    label: caseData.status,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          مرحلة التشغيل:
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full font-bold ${statusMeta.color}`}
        >
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
  );
}

export default InspectorStatusBanner;
