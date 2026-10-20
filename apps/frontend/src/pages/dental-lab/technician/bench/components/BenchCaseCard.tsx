import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Box,
  Play,
  Pause,
  Upload,
  Eye,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { MyCase, nextStatusOf, fmtDate } from "../../../shared";
import { TimerState, Active3DAttachment } from "../types/dentalTechBenchTypes";

interface BenchCaseCardProps {
  caseItem: MyCase;
  isOverdue: boolean;
  overdueDays: number;
  timerState: TimerState;
  onToggleTimer: (caseId: string) => void;
  fmtTimer: (seconds: number) => string;
  onOpenUpload: (caseId: string) => void;
  onAdvance: (caseItem: MyCase) => void;
  isBusy: boolean;
  onPreview3D: (att: Active3DAttachment) => void;
}

export const BenchCaseCard: React.FC<BenchCaseCardProps> = ({
  caseItem: c,
  isOverdue,
  overdueDays,
  timerState,
  onToggleTimer,
  fmtTimer,
  onOpenUpload,
  onAdvance,
  isBusy,
  onPreview3D,
}) => {
  const nextStatus = nextStatusOf(c.status);

  const scanAttachments = (c.attachments || []).filter(
    (a: any) =>
      a.fileType === "STL" ||
      a.fileType === "PLY" ||
      a.fileType === "OBJ" ||
      (a.fileName && /\.(stl|ply|obj)$/i.test(a.fileName))
  );

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border transition-all shadow-xs ${
        isOverdue
          ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-400"
          : c.priority === "URGENT"
          ? "border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
      }`}
    >
      {/* Top Section */}
      <div className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-gray-900 dark:text-white tabular-nums">
                #{c.caseNumber || c.id.slice(0, 6)}
              </span>
              {isOverdue ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 animate-pulse flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  متأخرة (<span className="tabular-nums font-mono">{overdueDays}</span> يوم)
                </span>
              ) : c.priority === "URGENT" ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  طارئ
                </span>
              ) : null}
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
              {c.workTypeName || "عمل معمل أسنان"}
            </p>
          </div>

          <div className="text-left shrink-0">
            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {c.activeStageName || c.status}
            </span>
          </div>
        </div>

        {/* Doctor and Patient Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
          <div>
            <span className="text-gray-400 block text-[10px]">الطبيب:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
              {c.doctorName || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">المريض:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
              {c.patientName || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">اللون (Shade):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
              {c.shade || "غير محدد"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">تاريخ التسليم:</span>
            <span
              className={`font-semibold block tabular-nums font-mono ${
                isOverdue ? "text-rose-600 font-bold" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {fmtDate(c.dueDate)}
            </span>
          </div>
        </div>

        {/* 3D Files Quick Trigger */}
        {scanAttachments.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Box className="w-3 h-3 text-indigo-500" />
              ملفات 3D:
            </span>
            {scanAttachments.slice(0, 2).map((att: any, idx: number) => (
              <button
                type="button"
                key={att.id || idx}
                onClick={() =>
                  onPreview3D({
                    url: att.fileUrl || att.url,
                    ext: (att.fileType || "stl").toLowerCase(),
                    fileName:
                      att.fileName || `model-${c.caseNumber}.${att.fileType || "stl"}`,
                  })
                }
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition"
              >
                <Eye className="w-3 h-3" />
                <span>معاينة {att.fileType || "3D"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl flex items-center justify-between gap-2">
        {/* Stopwatch */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleTimer(c.id)}
            className={`p-1.5 rounded-lg border transition ${
              timerState.running
                ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                : timerState.elapsedSeconds > 0
                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-700"
            }`}
            title={timerState.running ? "إيقاف مؤقت للوقت" : "بدء عداد وقت المرحلة"}
          >
            {timerState.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
            {fmtTimer(timerState.elapsedSeconds)}
          </span>
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenUpload(c.id)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="رفع مخرجات المرحلة أو صور"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <Link
            to={`/dental-lab/cases/${c.id}`}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 text-xs font-semibold"
          >
            التفاصيل
          </Link>

          {nextStatus && (
            <button
              type="button"
              onClick={() => onAdvance(c)}
              disabled={isBusy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              {isBusy ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>إنهاء المرحلة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BenchCaseCard;
