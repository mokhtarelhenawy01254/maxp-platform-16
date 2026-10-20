import React from "react";
import {
  GlobeAltIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { Template, EventRow, TemplateSlot } from "../types";
import { parseTemplateButtons, resolveVariablesCustom, resolveVariablesForPreview } from "../utils";

export interface StatusTemplateSlotProps {
  slot: TemplateSlot;
  template: Template | null;
  status: EventRow;
  isLegacy?: boolean;
  isPreviewExpanded: boolean;
  onTogglePreview: () => void;
  onEdit: () => void;
  onCreate: () => void;
  onSwitch?: () => void;
  onUnbind?: () => void;
  sampleVariables?: Record<string, string>;
}

export const StatusTemplateSlot: React.FC<StatusTemplateSlotProps> = ({
  slot,
  template,
  status,
  isLegacy,
  isPreviewExpanded,
  onTogglePreview,
  onEdit,
  onCreate,
  onSwitch,
  onUnbind,
  sampleVariables,
}) => {
  const isMeta = slot === "meta";
  const bound = !!template?.metaTemplateName;
  const metaStatus = String(template?.metaTemplateStatus || "").toUpperCase();
  const hasContent = !!template?.content;
  const previewContent = hasContent ? template!.content : "";

  const colors = isMeta
    ? {
        border: "border-blue-200 dark:border-blue-800/40",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        bg: "bg-blue-50/40 dark:bg-blue-900/10",
        accent: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30",
      }
    : {
        border: "border-emerald-200 dark:border-emerald-800/40",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        bg: "bg-emerald-50/40 dark:bg-emerald-900/10",
        accent: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
      };

  const statusBadge = isMeta
    ? bound
      ? metaStatus === "APPROVED"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : metaStatus === "REJECTED"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : template
        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : template
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

  const statusLabel = isMeta
    ? bound
      ? metaStatus === "APPROVED"
        ? "معتمد"
        : metaStatus === "REJECTED"
          ? "مرفوض"
          : metaStatus
            ? metaStatus
            : "قيد المراجعة"
      : template
        ? "محفوظ (بدون ربط)"
        : "بدون قالب"
    : template
      ? "يوجد قالب"
      : "بدون قالب";

  const resolvedText = sampleVariables
    ? resolveVariablesCustom(previewContent, sampleVariables)
    : resolveVariablesForPreview(previewContent);

  return (
    <div
      data-testid={`${slot}-slot-${status.id}`}
      className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors.badge}`}>
          {isMeta ? <GlobeAltIcon className="h-3 w-3" /> : <DocumentTextIcon className="h-3 w-3" />}
          {isMeta ? "قالب ميتا" : "واتساب عادي"}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge}`}>
          {isMeta && bound ? <CheckCircleIcon className="h-3 w-3" /> : null}
          {statusLabel}
        </span>
      </div>

      {isMeta && bound && template?.metaTemplateName && (
        <p className="mt-1.5 truncate font-mono text-[11px] text-blue-700 dark:text-blue-300" dir="ltr">
          {template.metaTemplateName}
          {isLegacy ? " (توصيف قديم)" : ""}
        </p>
      )}

      <div className="mt-1.5 min-h-[2.75rem]">
        {template ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {template.name || "قالب غير مسمّى"}
            </p>
            {hasContent && (
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-400">
                {resolvedText}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMeta
              ? "لا يوجد قالب ميتا — اضغط «إنشاء قالب ميتا» لتأليف رسالة وإرسالها لميتا للمراجعة، أو «اختيار قالب معتمد» لربط قالب معتمد موجود"
              : "لا يوجد قالب واتساب عادي — استخدم زر الإنشاء"}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {hasContent && (
          <button
            onClick={onTogglePreview}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            <DocumentTextIcon className="h-3 w-3" />
            {isPreviewExpanded ? "إخفاء" : "معاينة"}
          </button>
        )}
        {isMeta && (
          <button
            onClick={onSwitch}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "فعّل الإشعار أولاً" : ""}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-white dark:bg-white/10 dark:text-blue-400 dark:hover:bg-white/20 disabled:opacity-50"
          >
            <GlobeAltIcon className="h-3 w-3" />
            {bound ? "تغيير القالب" : "اختيار قالب معتمد"}
          </button>
        )}
        {template ? (
          <button
            onClick={onEdit}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${colors.accent}`}
          >
            <PencilSquareIcon className="h-3 w-3" />
            {isMeta ? "تعديل المحتوى" : "تعديل"}
          </button>
        ) : onCreate ? (
          <button
            onClick={onCreate}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "فعّل الإشعار أولاً" : ""}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${
              isMeta ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            <PlusIcon className="h-3 w-3" />
            {isMeta ? "إنشاء قالب ميتا" : "إنشاء"}
          </button>
        ) : null}
        {isMeta && bound && onUnbind && (
          <button
            onClick={onUnbind}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircleIcon className="h-3 w-3" />
            فك الربط
          </button>
        )}
      </div>

      {hasContent && isPreviewExpanded && (
        <div className="mt-2 rounded-md bg-white/70 p-2 dark:bg-white/5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            المعاينة الكاملة
          </p>
          <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300">
            {resolvedText}
          </p>
          {template?.hasButtons && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {parseTemplateButtons(template?.buttons).map((b, i) => (
                <span
                  key={i}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400"
                >
                  {b.text || b.id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusTemplateSlot;
