import React, { useState, useMemo } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  CpuChipIcon,
  PhotoIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

export interface DeliveryEvidencePayload {
  changeType: string;
  commitOrPath: string;
  pageUrl?: string;
  numbersBeforeAfter: string;
  notTestedScope: string;
  beforeAttachmentId?: string;
  beforeAttachmentUrl?: string;
  afterAttachmentId?: string;
  afterAttachmentUrl?: string;
  proofAttachmentId?: string;
  proofAttachmentUrl?: string;
  proofAttachmentName?: string;
  agentInfo?: {
    isAgent: boolean;
    agentName: string;
    commitOrRunId: string;
    testOutput: string;
  } | null;
}

export interface DeliveryGateFiles {
  beforeFile?: File | null;
  afterFile?: File | null;
}

interface DeliveryGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    priority?: string;
    pageUrl?: string | null;
    attachments?: Array<{ id: string; fileName: string; originalName?: string; filePath?: string }>;
  };
  onSubmit: (
    evidence: DeliveryEvidencePayload,
    files?: DeliveryGateFiles | File | null
  ) => Promise<void>;
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
  const [pageUrl, setPageUrl] = useState<string>(task.pageUrl || "");
  const [numbersBeforeAfter, setNumbersBeforeAfter] = useState<string>("");
  const [notTestedScope, setNotTestedScope] = useState<string>("");

  // Before & After attachments
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforeAttachmentId, setBeforeAttachmentId] = useState<string>("");
  const [afterAttachmentId, setAfterAttachmentId] = useState<string>("");

  // Agent Section
  const [isAgent, setIsAgent] = useState<boolean>(false);
  const [agentName, setAgentName] = useState<string>("MaxP DevAgent");
  const [agentRunId, setAgentRunId] = useState<string>("");
  const [agentTestOutput, setAgentTestOutput] = useState<string>("");

  // Server error tracking
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverMissingFields, setServerMissingFields] = useState<string[]>([]);

  const normalizedPriority = useMemo(() => {
    const p = String(task.priority || "MEDIUM").trim().toUpperCase();
    if (["URGENT", "HIGH"].includes(p)) return "HIGH";
    if (["LOW"].includes(p)) return "LOW";
    return "MEDIUM";
  }, [task.priority]);

  // Validation Logic based on Priority Severity
  const missingItems = useMemo(() => {
    const list: string[] = [];

    const hasChangeType = Boolean(changeType.trim());
    const hasLinkOrCommit = Boolean(pageUrl.trim() || commitOrPath.trim());
    const hasNumbers = Boolean(numbersBeforeAfter.trim() && numbersBeforeAfter.trim().length >= 3);
    const hasNotTested = Boolean(notTestedScope.trim() && notTestedScope.trim().length >= 3);
    const hasBefore = Boolean(beforeFile || beforeAttachmentId);
    const hasAfter = Boolean(afterFile || afterAttachmentId);

    if (normalizedPriority === "HIGH") {
      if (!hasChangeType) list.push("نوع التغيير");
      if (!hasLinkOrCommit) list.push("لينك الصفحة أو الكوميت/مسار الملفات");
      if (!hasNumbers) list.push("الأرقام قبل / بعد");
      if (!hasNotTested) list.push("إيه اللي ما اختبرتهوش");
      if (!hasBefore) list.push("صورة قبل");
      if (!hasAfter) list.push("صورة بعد");
    } else if (normalizedPriority === "MEDIUM") {
      if (!hasChangeType) list.push("نوع التغيير");
      if (!hasLinkOrCommit) list.push("لينك الصفحة أو الكوميت/مسار الملفات");
    }
    // LOW: No required fields

    if (isAgent) {
      if (!agentName.trim()) list.push("اسم الوكيل");
      if (!agentRunId.trim()) list.push("معرّف التشغيل للوكيل");
      const normalizedOutput = agentTestOutput.trim().toLowerCase();
      if (!agentTestOutput.trim() || agentTestOutput.trim().length < 5 || ["تمت", "تمّت", "done", "ok"].includes(normalizedOutput)) {
        list.push("ناتج اختبارات حقيقي للوكيل («تمّت» وحدها ليست دليلاً)");
      }
    }

    return list;
  }, [
    normalizedPriority,
    changeType,
    commitOrPath,
    pageUrl,
    numbersBeforeAfter,
    notTestedScope,
    beforeFile,
    beforeAttachmentId,
    afterFile,
    afterAttachmentId,
    isAgent,
    agentName,
    agentRunId,
    agentTestOutput,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    setServerMissingFields([]);

    const payload: DeliveryEvidencePayload = {
      changeType,
      commitOrPath: commitOrPath.trim(),
      pageUrl: pageUrl.trim() || undefined,
      numbersBeforeAfter: numbersBeforeAfter.trim(),
      notTestedScope: notTestedScope.trim(),
      beforeAttachmentId: beforeAttachmentId || undefined,
      afterAttachmentId: afterAttachmentId || undefined,
      proofAttachmentId: afterAttachmentId || beforeAttachmentId || undefined,
      agentInfo: isAgent
        ? {
            isAgent: true,
            agentName: agentName.trim(),
            commitOrRunId: agentRunId.trim(),
            testOutput: agentTestOutput.trim(),
          }
        : null,
    };

    try {
      await onSubmit(payload, { beforeFile, afterFile });
    } catch (err: any) {
      if (err?.missingFields && Array.isArray(err.missingFields)) {
        setServerMissingFields(err.missingFields);
      }
      setServerError(err?.message || "فشل تسليم المهمة للمراجعة والاعتماد");
    }
  };

  const priorityLabel =
    normalizedPriority === "HIGH"
      ? "عالية / عاجلة (إلزام كامل)"
      : normalizedPriority === "MEDIUM"
      ? "متوسطة (إلزام أساسي)"
      : "منخفضة (مرنة)";

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
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                الأولوية: {priorityLabel}
              </span>
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

        {/* Server Rejection Alert Banner */}
        {serverError && (
          <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <strong className="block font-semibold">رفض السيرفر (HTTP 422 — أدلة تسليم ناقصة):</strong>
                <p className="mt-0.5">{serverError}</p>
                {serverMissingFields.length > 0 && (
                  <p className="mt-1 font-semibold text-rose-900 dark:text-rose-200">
                    الحقول المطلوبة استيفاؤها: {serverMissingFields.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Local Missing Elements Banner */}
        {!serverError && (
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
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {/* 1. Change Type */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              1. نوع التغيير {normalizedPriority !== "LOW" && <span className="text-rose-500">*</span>}
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

          {/* 2. Page URL & Commit/File Path (One or both required for MEDIUM & HIGH) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
                2. أ. لينك الصفحة (Page URL) {normalizedPriority !== "LOW" && !commitOrPath.trim() && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="https://maxp.online/... أو مسار الصفحة"
                  className="w-full h-10 px-3.5 pl-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs"
                />
                <LinkIcon className="size-4 absolute left-2.5 top-3 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
                2. ب. الكوميت أو مسار الملفات {normalizedPriority !== "LOW" && !pageUrl.trim() && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={commitOrPath}
                onChange={(e) => setCommitOrPath(e.target.value)}
                placeholder="مثال: fix(tasks): gate enforcement or taskController.js"
                className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs"
              />
            </div>
          </div>

          {/* 3. Numbers Before / After */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              3. الأرقام قبل / بعد (Telemetry & Metrics) {normalizedPriority === "HIGH" && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={numbersBeforeAfter}
              onChange={(e) => setNumbersBeforeAfter(e.target.value)}
              placeholder="مثال: زمن الاستجابة قبل 1.4s وبعد 0.3s · نسبة الخطأ انخفضت من 12% إلى 0%"
              className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs"
            />
          </div>

          {/* 4. What wasn't tested */}
          <div>
            <label className="block font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              4. «إيه اللي ما اختبرتهوش» (الحدود والافتراضات غير المغطاة) {normalizedPriority === "HIGH" && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={2}
              value={notTestedScope}
              onChange={(e) => setNotTestedScope(e.target.value)}
              placeholder="مثال: تم التحقق عبر Jest والمتصفح؛ لم يتم اختباره على أجهزة iOS القديمة أو بيئة الإنتاج"
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none text-xs"
            />
          </div>

          {/* 5. Before & After Screenshots (Dual Slots) */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <PhotoIcon className="size-4 text-indigo-500" />
                مرفقات الإثبات: «صورة قبل» و «صورة بعد» {normalizedPriority === "HIGH" && <span className="text-rose-500">*</span>}
              </label>
              {task.attachments && task.attachments.length > 0 && (
                <span className="text-xs text-zinc-500">
                  {task.attachments.length} مرفق متاح بالمهمة
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Slot 1: Before Screenshot */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-500" />
                    صورة قبل (Before) {normalizedPriority === "HIGH" && <span className="text-rose-500">*</span>}
                  </span>
                  {(beforeFile || beforeAttachmentId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBeforeFile(null);
                        setBeforeAttachmentId("");
                      }}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      إلغاء
                    </button>
                  )}
                </div>

                {/* Existing attachments select for Before */}
                {task.attachments && task.attachments.length > 0 && (
                  <select
                    value={beforeAttachmentId}
                    onChange={(e) => {
                      setBeforeAttachmentId(e.target.value);
                      if (e.target.value) setBeforeFile(null);
                    }}
                    className="w-full h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[11px]"
                  >
                    <option value="">اختيار من مرفقات المهمة...</option>
                    {task.attachments.map((att) => (
                      <option key={`before-${att.id}`} value={att.id}>
                        {att.originalName || att.fileName}
                      </option>
                    ))}
                  </select>
                )}

                {/* File Upload for Before */}
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary/60 cursor-pointer bg-zinc-50 dark:bg-zinc-950/60 transition text-xs">
                  <ArrowUpTrayIcon className="size-4 text-zinc-400" />
                  <span className="truncate text-zinc-600 dark:text-zinc-300">
                    {beforeFile ? beforeFile.name : "رفع صورة قبل جديدة"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setBeforeFile(f);
                        setBeforeAttachmentId("");
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Slot 2: After Screenshot */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    صورة بعد (After) {normalizedPriority === "HIGH" && <span className="text-rose-500">*</span>}
                  </span>
                  {(afterFile || afterAttachmentId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAfterFile(null);
                        setAfterAttachmentId("");
                      }}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      إلغاء
                    </button>
                  )}
                </div>

                {/* Existing attachments select for After */}
                {task.attachments && task.attachments.length > 0 && (
                  <select
                    value={afterAttachmentId}
                    onChange={(e) => {
                      setAfterAttachmentId(e.target.value);
                      if (e.target.value) setAfterFile(null);
                    }}
                    className="w-full h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[11px]"
                  >
                    <option value="">اختيار من مرفقات المهمة...</option>
                    {task.attachments.map((att) => (
                      <option key={`after-${att.id}`} value={att.id}>
                        {att.originalName || att.fileName}
                      </option>
                    ))}
                  </select>
                )}

                {/* File Upload for After */}
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary/60 cursor-pointer bg-zinc-50 dark:bg-zinc-950/60 transition text-xs">
                  <ArrowUpTrayIcon className="size-4 text-zinc-400" />
                  <span className="truncate text-zinc-600 dark:text-zinc-300">
                    {afterFile ? afterFile.name : "رفع صورة بعد جديدة"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAfterFile(f);
                        setAfterAttachmentId("");
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
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
