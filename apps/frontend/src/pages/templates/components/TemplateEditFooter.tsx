import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { TemplateFormState, TemplateSlot, TemplateScopeConfig, MetaSession } from "../types";

export interface TemplateEditFooterProps {
  dialogSlot: TemplateSlot;
  templateForm: TemplateFormState;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  isMetaBound: boolean;
  metaContentChanged: boolean;
  metaBindingChanged: boolean;
  saving: boolean;
  resubmittingMeta: boolean;
  bindingId: string | null;
  publishingId: string | null;
  metaSessions: MetaSession[];
  metaVariableMismatch: { metaCount: number; localCount: number; missing: number } | null;
  config: TemplateScopeConfig;
  onClose: () => void;
  onSave: () => void;
  onResubmitMeta: () => void;
  onCreateMetaTemplate: () => void;
}

export default function TemplateEditFooter({
  dialogSlot,
  templateForm,
  setTemplateForm,
  isMetaBound,
  metaContentChanged,
  metaBindingChanged,
  saving,
  resubmittingMeta,
  bindingId,
  publishingId,
  metaSessions,
  metaVariableMismatch,
  config,
  onClose,
  onSave,
  onResubmitMeta,
  onCreateMetaTemplate,
}: TemplateEditFooterProps) {
  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <label
          htmlFor="template-active"
          className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
          title="القوالب غير النشطة تحفظ دون إرسال"
        >
          <input
            type="checkbox"
            id="template-active"
            checked={templateForm.isActive}
            onChange={(e) => setTemplateForm((p) => ({ ...p, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          قالب نشط
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          {dialogSlot === "meta" && isMetaBound && metaContentChanged && !metaBindingChanged && (
            <button
              type="button"
              onClick={onResubmitMeta}
              disabled={saving || resubmittingMeta || !!bindingId || metaSessions.length === 0}
              title={metaSessions.length === 0 ? "لا توجد جلسة ميتا متصلة" : "تحديث المحتوى على ميتا وإعادته للمراجعة"}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              {resubmittingMeta ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )}
              إرسال للمراجعة من جديد
            </button>
          )}
          <button
            type="button"
            onClick={dialogSlot === "meta" && !templateForm.metaTemplateName ? onCreateMetaTemplate : onSave}
            disabled={
              saving ||
              resubmittingMeta ||
              !!bindingId ||
              !!publishingId ||
              !!metaVariableMismatch ||
              (dialogSlot === "regular" && !templateForm.content.trim()) ||
              (dialogSlot === "meta" && metaSessions.length === 0 && !isMetaBound)
            }
            title={
              metaSessions.length === 0 && dialogSlot === "meta" && !isMetaBound
                ? "لا توجد جلسة ميتا متصلة — أنشئ جلسة Meta Cloud أولاً"
                : metaVariableMismatch
                  ? `القالب المحلي محتاج ${metaVariableMismatch.missing} متغيرات إضافية`
                  : undefined
            }
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
              dialogSlot === "meta" && (metaBindingChanged || !templateForm.metaTemplateName)
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {(saving || bindingId || publishingId) && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {dialogSlot === "meta"
              ? metaBindingChanged
                ? "حفظ وربط بقالب ميتا"
                : isMetaBound
                  ? "حفظ"
                  : templateForm.metaTemplateName
                    ? "حفظ وربط بقالب ميتا"
                    : "إنشاء قالب ميتا جديد"
              : "حفظ"}
          </button>
        </div>
      </div>

      {metaVariableMismatch && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300" role="alert">
          [تنبيه] قالب ميتا محتاج <strong>{metaVariableMismatch.metaCount} متغيرات</strong>، لكن المحتوى المحلي فيه <strong>{metaVariableMismatch.localCount} فقط</strong> — أضف <strong>{metaVariableMismatch.missing}</strong> متغيرات ({config.variables.slice(0, 4).map((v) => v.var).join("، ")}) عشان تقدر تحفظ وتربط.
        </p>
      )}
    </>
  );
}
