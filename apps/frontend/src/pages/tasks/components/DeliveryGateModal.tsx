import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

export interface DeliveryEvidencePayload {
  changeType: string;
  commitOrPath: string;
  numbersBeforeAfter: string;
  notTestedScope: string;
  proofAttachmentId?: string;
  proofAttachmentUrl?: string;
  agentInfo?: {
    isAgent: boolean;
    agentName: string;
    commitOrRunId: string;
    testOutput: string;
  } | null;
}

interface DeliveryGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    attachments?: Array<{ id: string; fileName: string; originalName?: string; filePath?: string }>;
  };
  onSubmit: (evidence: DeliveryEvidencePayload, newFile?: File | null) => Promise<void>;
  isSubmitting?: boolean;
}

const CHANGE_TYPES = [
  { value: "BUG_FIX", label: "إصلاح خطأ (Bug Fix)" },
  { value: "FEATURE", label: "ميزة جديدة (Feature)" },
  { value: "REFACTOR", label: "إعادة هيكلة (Refactor)" },
  { value: "PERFORMANCE", label: "تحسين أداء (Performance)" },
  { value: "UI_UX", label: "واجهة وتجربة (UI/UX)" },
  { value: "CONFIG", label: "إعدادات وضبط (Config)" },
];

export const DeliveryGateModal: React.FC<DeliveryGateModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmit,
  isSubmitting = false,
}) => {
  const [changeType, setChangeType] = useState<string>("BUG_FIX");
  const [commitOrPath, setCommitOrPath] = useState<string>("");
  const [numbersBeforeAfter, setNumbersBeforeAfter] = useState<string>("");
  const [notTestedScope, setNotTestedScope] = useState<string>("");
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>(
    task.attachments?.[0]?.id || ""
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Agent Section
  const [isAgent, setIsAgent] = useState<boolean>(false);
  const [agentName, setAgentName] = useState<string>("MaxP DevAgent");
  const [agentRunId, setAgentRunId] = useState<string>("");
  const [agentTestOutput, setAgentTestOutput] = useState<string>("");

  // Validation Logic
  const missingItems = useMemo(() => {
    const list: string[] = [];
    if (!changeType.trim()) list.push("نوع التغيير");
    if (!commitOrPath.trim() || commitOrPath.trim().length < 3) list.push("الكوميت / مسار الملفات");
    if (!numbersBeforeAfter.trim() || numbersBeforeAfter.trim().length < 5) list.push("الأرقام قبل / بعد");
    if (!notTestedScope.trim() || notTestedScope.trim().length < 5) list.push("إيه اللي ما اختبرتهوش");

    const hasAttachment = Boolean(selectedAttachmentId || uploadedFile || (task.attachments && task.attachments.length > 0));
    if (!hasAttachment) list.push("إثبات تشغيل مرفق");

    if (isAgent) {
      if (!agentName.trim()) list.push("اسم الوكيل");
      if (!agentRunId.trim()) list.push("معرّف التشغيل للوكيل");
      const normalizedOutput = agentTestOutput.trim().toLowerCase();
      if (!agentTestOutput.trim() || agentTestOutput.trim().length < 10 || ["تمت", "تمّت", "done", "ok"].includes(normalizedOutput)) {
        list.push("ناتج اختبارات حقيقي للوكيل («تمّت» وحدها ليست دليلاً)");
      }
    }

    return list;
  }, [changeType, commitOrPath, numbersBeforeAfter, notTestedScope, selectedAttachmentId, uploadedFile, task.attachments, isAgent, agentName, agentRunId, agentTestOutput]);

  // Evidence collection is voluntary and non-blocking
  const isFormValid = true;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const payload: DeliveryEvidencePayload = {
      changeType,
      commitOrPath: commitOrPath.trim(),
      numbersBeforeAfter: numbersBeforeAfter.trim(),
      notTestedScope: notTestedScope.trim(),
      proofAttachmentId: selectedAttachmentId || undefined,
      agentInfo: isAgent
        ? {
            isAgent: true,
            agentName: agentName.trim(),
            commitOrRunId: agentRunId.trim(),
            testOutput: agentTestOutput.trim(),
          }
        : null,
    };

    await onSubmit(payload, uploadedFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                بوابة تسليم المهمة للمراجعة والاعتماد (Delivery Gate)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-md">
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

        {/* Missing Elements Banner */}
        <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 text-xs">
          {missingItems.length > 0 ? (
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>
                <strong>إيه الناقص للتسليم:</strong> {missingItems.join(" · ")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircleIcon className="size-4 shrink-0" />
              <span>الدليل مكتمل ومستوفي كافة شروط بوابة التسليم ✓</span>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {/* 1. Change Type */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              1. نوع التغيير <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHANGE_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  onClick={() => setChangeType(type.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition ${
                    changeType === type.value
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Commit Hash / File Paths */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              2. الكوميت أو مسار الملفات المعدلة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={commitOrPath}
              onChange={(e) => setCommitOrPath(e.target.value)}
              placeholder="مثال: fix(auth): session guard or apps/backend/controller/taskController.js"
              className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* 3. Numbers Before / After */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              3. الأرقام قبل / بعد (Telemetry & Metrics) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={numbersBeforeAfter}
              onChange={(e) => setNumbersBeforeAfter(e.target.value)}
              placeholder="مثال: زمن الاستجابة P95 قبل 1.4s وبعد 0.3s · نسبة الخطأ انخفضت من 12% إلى 0%"
              className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* 4. What wasn't tested */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              4. «إيه اللي ما اختبرتهوش» (الحدود والافتراضات التي لم تغطها) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={notTestedScope}
              onChange={(e) => setNotTestedScope(e.target.value)}
              placeholder="مثال: تم التحقق عبر Jest وChrome؛ لم يتم اختباره على أجهزة iOS القديمة أو بيئة الإنتاج الحية"
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* 5. Proof Attachment */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 bg-zinc-50/50 dark:bg-zinc-950/20">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <PaperClipIcon className="size-4 text-zinc-500" />
                إثبات تشغيل مرفق (صورة / فيديو / سجل اختبار) <span className="text-rose-500">*</span>
              </label>
              {task.attachments && task.attachments.length > 0 && (
                <span className="text-xs text-zinc-500">
                  {task.attachments.length} مرفق متاح بالمهمة
                </span>
              )}
            </div>

            {/* Existing Attachments picker */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="mb-2.5 space-y-1.5 max-h-28 overflow-y-auto">
                {task.attachments.map((att) => (
                  <label
                    key={att.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedAttachmentId === att.id
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedProof"
                      checked={selectedAttachmentId === att.id}
                      onChange={() => setSelectedAttachmentId(att.id)}
                      className="size-3.5 text-primary"
                    />
                    <span className="truncate">{att.originalName || att.fileName}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Direct File Upload */}
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary/60 cursor-pointer bg-white dark:bg-zinc-900 transition">
                <ArrowUpTrayIcon className="size-4 text-zinc-400" />
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                  {uploadedFile ? uploadedFile.name : "رفع لقطة شاشة / إثبات تشغيل جديد"}
                </span>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadedFile(f);
                  }}
                  className="hidden"
                />
              </label>
              {uploadedFile && (
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-xs text-rose-500 hover:underline shrink-0"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {/* 6. AI Agent Section Toggle */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={isAgent}
                onChange={(e) => setIsAgent(e.target.checked)}
                className="size-4 rounded text-primary focus:ring-primary/40"
              />
              <span className="font-medium text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <CpuChipIcon className="size-4 text-indigo-500" />
                تم تنفيذ التغييرات بواسطة وكيل ذكاء اصطناعي (AI Agent Output)
              </span>
            </label>

            {isAgent && (
              <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      اسم الوكيل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. MaxP Agent, Codex, Copilot"
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      معرّف التشغيل أو الكوميت <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentRunId}
                      onChange={(e) => setAgentRunId(e.target.value)}
                      placeholder="e.g. run-86bd1d or commit SHA"
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      ناتج الاختبارات للوكيل (Test Suite Output) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      «تمّت» وحدها ليست دليلاً
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={agentTestOutput}
                    onChange={(e) => setAgentTestOutput(e.target.value)}
                    placeholder="انسخ ناتج الاختبارات أو أوامر الفحص الفعلية التي نفذها الوكيل (مثل: PASS 12 passed, 0 failed)..."
                    className="w-full p-2.5 rounded-lg font-mono text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            title="تسليم المهمة للمراجعة والاعتماد"
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
              !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer active:scale-95"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <span className="inline-block animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <CheckCircleIcon className="size-4" />
            )}
            <span>تسليم للمراجعة والاعتماد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
