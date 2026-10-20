import React, { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { META_BODY_CHAR_LIMIT } from "../utils";
import WhatsAppBubblePreview from "./WhatsAppBubblePreview";
import type { TemplateFormState, TemplateSlot, TemplateScopeConfig, Template } from "../types";

export interface TemplateContentEditorProps {
  dialogSlot: TemplateSlot;
  templateForm: TemplateFormState;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  selectedTemplate: Template | null;
  config: TemplateScopeConfig;
  sampleVariables: Record<string, string>;
}

export default function TemplateContentEditor({
  dialogSlot,
  templateForm,
  setTemplateForm,
  selectedTemplate,
  config,
  sampleVariables,
}: TemplateContentEditorProps) {
  const [showVariables, setShowVariables] = useState(false);
  const [showLocalRef, setShowLocalRef] = useState(false);

  return (
    <div>
      {dialogSlot === "meta" ? (
        <button
          type="button"
          onClick={() => setShowLocalRef((s) => !s)}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            <ChevronDownIcon className={`h-3.5 w-3.5 transition ${showLocalRef ? "rotate-180" : ""}`} />
            {selectedTemplate?.metaTemplateName ? "محتوى الرسالة" : "محتوى الرسالة (هي التي ترسل)"} <span className="text-red-500">*</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`text-[10px] font-medium tabular-nums font-mono ${
                templateForm.content.length > META_BODY_CHAR_LIMIT
                  ? "text-red-600 dark:text-red-400"
                  : templateForm.content.length > META_BODY_CHAR_LIMIT * 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400 dark:text-slate-500"
              }`}
              aria-live="polite"
            >
              {templateForm.content.length} / {META_BODY_CHAR_LIMIT}
            </span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
              {showLocalRef ? "إخفاء" : "عرض"}
            </span>
          </span>
        </button>
      ) : (
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            محتوى الرسالة <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-[10px] font-medium tabular-nums font-mono ${
              dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT
                ? "text-red-600 dark:text-red-400"
                : dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT * 0.9
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-slate-500"
            }`}
            aria-live="polite"
          >
            {dialogSlot === "meta"
              ? `${templateForm.content.length} / ${META_BODY_CHAR_LIMIT}`
              : `${templateForm.content.length} حرف`}
          </span>
        </div>
      )}

      {(dialogSlot !== "meta" || showLocalRef || !selectedTemplate?.metaTemplateName) && (
        <>
          <div className={dialogSlot === "meta" ? "mt-3 grid gap-3 lg:grid-cols-2" : "grid gap-3 lg:grid-cols-2"}>
            <textarea
              value={templateForm.content}
              onChange={(e) =>
                setTemplateForm((p) => ({
                  ...p,
                  content:
                    dialogSlot === "meta"
                      ? e.target.value.slice(0, META_BODY_CHAR_LIMIT + 200)
                      : e.target.value,
                }))
              }
              rows={7}
              aria-label={dialogSlot === "meta" ? "محتوى القالب المحلي" : "محتوى الرسالة"}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT
                  ? "border-red-400 dark:border-red-500"
                  : "border-slate-200"
              }`}
              placeholder="اكتب رسالتك هنا..."
            />

            <div className="rounded-lg border border-slate-200 bg-[#e5ddd5] p-3 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                معاينة مباشرة
              </p>
              <WhatsAppBubblePreview
                content={templateForm.content}
                buttons={templateForm.buttons}
                hasButtons={templateForm.hasButtons}
                sampleVariables={sampleVariables}
              />
            </div>
          </div>

          {dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400" role="alert">
              [تنبيه] النص أطول من حد ميتا ({META_BODY_CHAR_LIMIT} حرف) — القالب سيتم رفضه عند النشر على Meta Cloud API.
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="mt-1 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <ChevronDownIcon className={`h-3 w-3 transition ${showVariables ? "rotate-180" : ""}`} />
            {showVariables ? "إخفاء المتغيرات" : "عرض كل المتغيرات المتاحة"}
          </button>

          {showVariables && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50 text-right dark:bg-slate-800">
                    <th className="px-2 py-1 font-medium text-slate-500">المتغير</th>
                    <th className="px-2 py-1 font-medium text-slate-500">الوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {config.variables.map((v) => (
                    <tr key={v.var} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-2 py-1 font-mono text-indigo-600 dark:text-indigo-400">
                        {v.var}
                      </td>
                      <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{v.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
