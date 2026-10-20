import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ExternalLink,
  Eye,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  fmtDate,
  fmtMoney,
  type DentalCaseAttachment,
  type DentalCaseHistoryEntry,
  type DentalLabCaseDetail,
} from "../../shared";

interface DentalCaseAlertBannersProps {
  c: DentalLabCaseDetail;
  attachments: DentalCaseAttachment[];
  history: DentalCaseHistoryEntry[];
  isOverdue: boolean;
  daysOverdue: number;
  snoozing: boolean;
  caseBusy: boolean;
  handleSnoozeOverdue: (days: number) => void;
  handleReturnFromOutsource: () => void;
  handleRestore: () => void;
  handlePermanentDelete: () => void;
  onOpenTryInReturn: () => void;
  onSelectModel: (model: { name: string; url: string }) => void;
}

export default function DentalCaseAlertBanners({
  c,
  attachments,
  history,
  isOverdue,
  daysOverdue,
  snoozing,
  caseBusy,
  handleSnoozeOverdue,
  handleReturnFromOutsource,
  handleRestore,
  handlePermanentDelete,
  onOpenTryInReturn,
  onSelectModel,
}: DentalCaseAlertBannersProps) {
  const designAtt = attachments.find((a) => a.kind === "DESIGN_REVIEW");
  const designHist = history.find((h) => h.dimension === "DESIGN_REVIEW");
  const isApproved = designHist?.status === "APPROVED";
  const isChanges = designHist?.status === "CHANGES_REQUESTED";

  return (
    <>
      {isOverdue && (
        <div className="mb-6 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                تنبيه تأخير: هذه الحالة متأخرة بمقدار {daysOverdue} يوم عن موعد التسليم المحدد!
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                تاريخ الاستحقاق كان في: <b className="font-mono tabular-nums">{fmtDate(c.dueDate)}</b> —
                يرجى الإسراع في إنهاء المراحل المتبقية وتجهيز الشغل للتسليم.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 hidden sm:inline">
              تأجيل التنبيه (Snooze):
            </span>
            <button
              type="button"
              onClick={() => handleSnoozeOverdue(1)}
              disabled={snoozing}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm disabled:opacity-50 transition-colors"
              title="تأجيل تنبيه التأخير وتمديد الموعد ليوم إضافي"
            >
              تأجيل +1 يوم
            </button>
            <button
              type="button"
              onClick={() => handleSnoozeOverdue(3)}
              disabled={snoozing}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm disabled:opacity-50 transition-colors"
              title="تأجيل تنبيه التأخير وتمديد الموعد لـ 3 أيام"
            >
              تأجيل +3 أيام
            </button>
            <button
              type="button"
              onClick={() => handleSnoozeOverdue(7)}
              disabled={snoozing}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm disabled:opacity-50 transition-colors"
              title="تأجيل تنبيه التأخير وتمديد الموعد لأسبوع كامل"
            >
              تأجيل +أسبوع
            </button>
          </div>
        </div>
      )}

      {c.status === "OUTSOURCED" && (
        <div className="mb-6 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  الشغل حالياً لدى جهة خارجية: {c.externalLabName || "معمل خارجي"}
                </h4>
                {c.expectedReturnAt && new Date(c.expectedReturnAt) < new Date() && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    متأخر عن موعد العودة المتوقع
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 font-mono tabular-nums">
                {c.expectedReturnAt ? `موعد الاستلام المتوقع: ${fmtDate(c.expectedReturnAt)}` : "جاري التشغيل الخارجي"}
                {c.outsourceCost != null ? ` | التكلفة: ${fmtMoney(c.outsourceCost)}` : ""}
                {c.outsourceNotes ? ` | ${c.outsourceNotes}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReturnFromOutsource}
            disabled={caseBusy}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            استلام الشغل وفحص الجودة
          </button>
        </div>
      )}

      {c.isDeleted && (
        <div className="mb-6 p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/80 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-600 text-white flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                هذه الحالة موجودة حالياً في سلة المهملات
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                تم نقل الحالة إلى سلة المهملات ولا تظهر في القوائم النشطة أو الإحصائيات. يمكنك
                استعادتها أو حذفها نهائياً.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestore}
              disabled={caseBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              استعادة الحالة
            </button>
            <button
              onClick={handlePermanentDelete}
              disabled={caseBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف نهائي
            </button>
          </div>
        </div>
      )}

      {c.isTryIn && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-amber-500 text-white font-bold text-sm">بروفة</span>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-200">
                الحالة حالياً في مرحلة بروفة (Try-in) لدى العيادة — {c.tryInStage || "بروفة عامة"}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                عدد مرات خروج البروفة لهذه الحالة:{" "}
                <span className="font-mono tabular-nums font-bold">{c.tryInCount || 1}</span> مرات.
                الفاتورة والبيانات المالية محفوظة دون تكرار.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenTryInReturn}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            استلام الحالة من البروفة
          </button>
        </div>
      )}

      {designAtt && (
        <div
          className={`mb-6 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
            isApproved
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : isChanges
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl text-white font-bold ${
                isApproved ? "bg-emerald-600" : isChanges ? "bg-amber-600" : "bg-indigo-600"
              }`}
            >
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {isApproved
                  ? `تم اعتماد تصميم الـ 3D من الطبيب المعالج (${designHist?.userName || "الطبيب"})`
                  : isChanges
                  ? "الطبيب طلب تعديل على تصميم الـ 3D"
                  : "تصميم الـ 3D مرفوع وبانتظار اعتماد الطبيب المعالج عبر البوابة"}
              </h4>
              <p className="text-xs opacity-90 mt-0.5 font-mono">
                {designHist?.reason
                  ? `ملاحظات الطبيب: "${designHist.reason}"`
                  : `الملف المرفق: ${designAtt.fileName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onSelectModel({
                  name: designAtt.fileName,
                  url: `/api/v1/dental-lab/files/${designAtt.storedPath}`,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              معاينة التصميم ثلاثي الأبعاد
            </button>
          </div>
        </div>
      )}
    </>
  );
}
