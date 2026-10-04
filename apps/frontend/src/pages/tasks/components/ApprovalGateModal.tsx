import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ShieldExclamationIcon,
  DocumentCheckIcon,
  PaperClipIcon,
  CpuChipIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface ApprovalGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    status: string;
    acceptanceCriteria?: string | null;
    hasEvidence?: boolean;
    missingEvidence?: boolean;
    evidence?: any;
    returnCount?: number;
    lastReturnReason?: string | null;
    attachments?: Array<{ id: string; fileName: string; originalName?: string; filePath?: string }>;
  };
  currentUserRole?: string;
  onApprove: (options: { ownerOverride?: boolean; ownerOverrideReason?: string; criteriaChecked?: boolean }) => Promise<void>;
  onReturn: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const ApprovalGateModal: React.FC<ApprovalGateModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUserRole = "",
  onApprove,
  onReturn,
  isSubmitting = false,
}) => {
  const isOwner = ["OWNER", "SUPER_ADMIN"].includes(currentUserRole.toUpperCase());

  // Parse acceptance criteria lines into checklist
  const initialChecklist = useMemo(() => {
    const raw = String(task.acceptanceCriteria || "").trim();
    if (!raw) {
      return [{ id: 0, text: "التحقق من إنجاز متطلبات المهمة بالكامل وعملها بدون أخطاء", checked: false }];
    }
    return raw
      .split("\n")
      .map((line) => line.replace(/^[-*•\d\.\s]+/, "").trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: idx, text, checked: false }));
  }, [task.acceptanceCriteria]);

  const [checklist, setChecklist] = useState(initialChecklist);
  const [returnMode, setReturnMode] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [useOwnerOverride, setUseOwnerOverride] = useState(false);
  const [ownerOverrideReason, setOwnerOverrideReason] = useState("");

  const allCriteriaChecked = checklist.length > 0 && checklist.every((item) => item.checked);
  const evidenceObj = typeof task.evidence === "string" ? (() => { try { return JSON.parse(task.evidence); } catch { return null; } })() : task.evidence;
  const hasValidEvidence = Boolean(task.hasEvidence || evidenceObj);

  const canApprove = (allCriteriaChecked && hasValidEvidence) || (isOwner && useOwnerOverride && ownerOverrideReason.trim().length >= 5);

  if (!isOpen) return null;

  const toggleCheck = (idx: number) => {
    setChecklist((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c))
    );
  };

  const handleApproveSubmit = async () => {
    if (!canApprove || isSubmitting) return;
    await onApprove({
      criteriaChecked: allCriteriaChecked,
      ownerOverride: useOwnerOverride,
      ownerOverrideReason: useOwnerOverride ? ownerOverrideReason.trim() : undefined,
    });
  };

  const handleReturnSubmit = async () => {
    if (!returnReason.trim() || isSubmitting) return;
    await onReturn(returnReason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div>
            <div className="flex items-center gap-2">
              <DocumentCheckIcon className="size-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                بوابة الاعتماد والتحقق (Approval Gate)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-lg">
              {task.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Content Body: Two columns */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
          {/* Column 1: Acceptance Criteria Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <DocumentCheckIcon className="size-4 text-primary" />
                معايير القبول (مطلوب التأشير على الكل)
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                allCriteriaChecked
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}>
                {checklist.filter(c => c.checked).length} / {checklist.length}
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition select-none ${
                    item.checked
                      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {}}
                    className="size-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                  />
                  <span className="leading-relaxed">{item.text}</span>
                </label>
              ))}
            </div>

            {/* Return Count & Past History */}
            {Number(task.returnCount || 0) > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
                <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ArrowUturnLeftIcon className="size-3.5" />
                  تم إرجاع هذه المهمة للتعديل سابقاً {task.returnCount} مرة
                </p>
                {task.lastReturnReason && (
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1 italic">
                    «{task.lastReturnReason}»
                  </p>
                )}
              </div>
            )}

            {/* Owner Override Section */}
            {isOwner && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-700 dark:text-rose-400">
                  <input
                    type="checkbox"
                    checked={useOwnerOverride}
                    onChange={(e) => setUseOwnerOverride(e.target.checked)}
                    className="size-3.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <ShieldExclamationIcon className="size-4 text-rose-500" />
                  تجاوز استثنائي كمالك (Owner Override)
                </label>
                {useOwnerOverride && (
                  <div className="mt-2 space-y-1.5 animate-in fade-in">
                    <input
                      type="text"
                      value={ownerOverrideReason}
                      onChange={(e) => setOwnerOverrideReason(e.target.value)}
                      placeholder="سبب التجاوز الاستثنائي (يسجّل في سجل التدقيق)..."
                      className="w-full h-8 px-2.5 rounded-lg text-xs border border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20"
                    />
                    <p className="text-[10px] text-zinc-500">
                      سيتم تسجيل التجاوز باسمك في سجل التدقيق غير القابل للتعديل.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Evidence Dossier */}
          <div className="space-y-3.5 bg-zinc-50/70 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <span className="flex items-center gap-1.5">
                <PaperClipIcon className="size-4 text-zinc-500" />
                ملف الدليل المرفق (Delivery Evidence)
              </span>
              {hasValidEvidence ? (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircleIcon className="size-3.5" />
                  معتمد
                </span>
              ) : (
                <span className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                  <ExclamationCircleIcon className="size-3.5" />
                  بدون دليل
                </span>
              )}
            </h3>

            {evidenceObj ? (
              <div className="space-y-2.5">
                <div>
                  <span className="font-semibold text-zinc-500 block text-[11px]">1. نوع التغيير:</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-xs">
                    {evidenceObj.changeType || "غير محدد"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-zinc-500 block text-[11px]">2. الكوميت / مسار الملفات:</span>
                  <code className="block mt-0.5 p-1.5 rounded bg-zinc-100 dark:bg-zinc-900 font-mono text-[11px] break-all border border-zinc-200 dark:border-zinc-800">
                    {evidenceObj.commitOrPath || "غير متوفر"}
                  </code>
                </div>

                <div>
                  <span className="font-semibold text-zinc-500 block text-[11px]">3. الأرقام قبل / بعد:</span>
                  <p className="mt-0.5 text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                    {evidenceObj.numbersBeforeAfter || "لا توجد أرقام مسجلة"}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-zinc-500 block text-[11px]">4. «إيه اللي ما اختبرتهوش»:</span>
                  <p className="mt-0.5 text-zinc-700 dark:text-zinc-300 leading-relaxed italic bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                    {evidenceObj.notTestedScope || "لم يتم توضيح حدود الاختبار"}
                  </p>
                </div>

                {/* Agent Evidence Box */}
                {evidenceObj.agentInfo?.isAgent && (
                  <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300 text-[11px]">
                      <CpuChipIcon className="size-3.5" />
                      مخرج الوكيل: {evidenceObj.agentInfo.agentName} ({evidenceObj.agentInfo.commitOrRunId})
                    </div>
                    <pre className="mt-1.5 p-2 rounded bg-white dark:bg-zinc-900 text-[10px] font-mono max-h-24 overflow-y-auto text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                      {evidenceObj.agentInfo.testOutput}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-zinc-400">
                <ExclamationCircleIcon className="size-8 mx-auto text-amber-500 mb-1" />
                <p className="font-medium text-amber-600 dark:text-amber-400">لا يوجد دليل تسليم مسجل على هذه المهمة</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  المهمة نُقلت للمراجعة بدون استيفاء بوابة التسليم. يرجى طلب تعديلات لاستكمال الدليل.
                </p>
              </div>
            )}

            {/* Proof Attachments preview/links */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="font-semibold text-zinc-500 block text-[11px] mb-1">المرفقات التشغيلية:</span>
                <div className="space-y-1">
                  {task.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.filePath || `/api/tasks/attachments/${att.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:text-primary transition"
                    >
                      <span className="truncate">{att.originalName || att.fileName}</span>
                      <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Return Drawer (Collapsible) */}
        {returnMode && (
          <div className="px-5 py-3.5 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900/40 text-xs animate-in slide-in-from-bottom duration-150">
            <label className="block font-bold text-amber-900 dark:text-amber-300 mb-1.5">
              سبب الإرجاع للتعديل والملاحظات المطلوبة <span className="text-rose-500">* (إلزامي)</span>
            </label>
            <textarea
              rows={2}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="اكتب بوضوح ما هو الناقص وما المطلوب من المنفذ تعديله أو إرفاقه قبل إعادة التسليم..."
              className="w-full p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none text-xs"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setReturnMode(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReturnSubmit}
                disabled={!returnReason.trim() || isSubmitting}
                className="px-4 py-1.5 rounded-lg font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50"
              >
                تأكيد الإرجاع للمنفذ
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            {!returnMode && (
              <button
                type="button"
                onClick={() => setReturnMode(true)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition flex items-center gap-1.5"
              >
                <ArrowUturnLeftIcon className="size-4" />
                <span>رجع للتعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApproveSubmit}
              disabled={!canApprove || isSubmitting}
              title={
                !hasValidEvidence
                  ? "ممنوع الاعتماد بدون دليل تسليم"
                  : !allCriteriaChecked
                  ? "يجب التأشير على جميع معايير القبول أولاً"
                  : "اعتماد وإنجاز المهمة"
              }
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                canApprove && !isSubmitting
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer active:scale-95"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <span className="inline-block animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <CheckCircleIcon className="size-4" />
              )}
              <span>
                {useOwnerOverride ? "اعتماد بتجاوز المالك (Override)" : "اعتماد وإنجاز المهمة"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
