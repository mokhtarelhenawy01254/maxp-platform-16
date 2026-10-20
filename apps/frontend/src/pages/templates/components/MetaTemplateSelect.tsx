import React from "react";
import { PlusIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import type { MetaAvailableTemplate } from "../types";
import { extractLocalVariableOrder } from "../utils";

export interface MetaTemplateSelectProps {
  metaSessions: { id: string; name: string; metaDisplayPhoneNumber?: string }[];
  selectedMetaSession: string;
  onSessionChange: (id: string) => void;
  availableMetaTemplates: MetaAvailableTemplate[];
  loadingMetaTemplates: boolean;
  selectedMetaTemplateName: string;
  onSelectTemplate: (name: string) => void;
  onCreateTemplate?: () => void;
  createDisabled?: boolean;
  showTemplates?: boolean;
  enableMultiBind?: boolean;
  excludeOtherBound?: boolean;
  selectedTemplateId?: string | null;
  showMapping: boolean;
  localContent: string;
  sampleVariables: Record<string, string>;
  variableDescriptions: Record<string, string>;
}

export function resolveMetaBodyPreview(
  metaBody: string,
  localContent: string,
  sample: Record<string, string>
): string {
  if (!metaBody) return "";
  const localVars = extractLocalVariableOrder(localContent);
  return metaBody.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const idx = parseInt(n, 10) - 1;
    const v = localVars[idx];
    return v ? (sample[v] || `[${v}]`) : `[${n}]`;
  });
}

export const MetaTemplateSelect: React.FC<MetaTemplateSelectProps> = ({
  metaSessions,
  selectedMetaSession,
  onSessionChange,
  availableMetaTemplates,
  loadingMetaTemplates,
  selectedMetaTemplateName,
  onSelectTemplate,
  onCreateTemplate,
  createDisabled,
  showTemplates = true,
  enableMultiBind,
  excludeOtherBound,
  selectedTemplateId,
  showMapping,
  localContent,
  sampleVariables,
  variableDescriptions,
}) => {
  const selected = availableMetaTemplates.find((m) => m.name === selectedMetaTemplateName);
  const metaBody = (selected?.components || []).find((c) => c.type === "BODY")?.text || "";

  if (metaSessions.length === 0) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          لا توجد جلسة <strong>Meta Cloud API</strong> متصلة — أنشئ جلسة ميتا من <strong>الإعدادات &gt; واتساب &gt; الجلسات</strong> لتفعيل الربط والنشر.
        </div>
        <select
          disabled
          aria-label="حساب النشر على ميتا"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        >
          <option>لا توجد جلسات متاحة</option>
        </select>
      </div>
    );
  }

  return (
    <>
      {onCreateTemplate && (
        <button
          type="button"
          onClick={onCreateTemplate}
          disabled={createDisabled}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          {createDisabled ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <PlusIcon className="h-3.5 w-3.5" />
          )}
          إنشاء قالب ميتا جديد
        </button>
      )}
      <select
        value={selectedMetaSession}
        onChange={(e) => onSessionChange(e.target.value)}
        aria-label="حساب النشر على ميتا"
        className="mb-2 mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {metaSessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.metaDisplayPhoneNumber ? `(${s.metaDisplayPhoneNumber})` : ""}
          </option>
        ))}
      </select>
      {showTemplates && (loadingMetaTemplates ? (
        <p className="text-xs text-slate-400">جار تحميل قوالب ميتا...</p>
      ) : availableMetaTemplates.length > 0 ? (
        <>
          <select
            value={selectedMetaTemplateName}
            onChange={(e) => onSelectTemplate(e.target.value)}
            aria-label="قالب ميتا المعتمد"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">اختر قالب...</option>
            {availableMetaTemplates
              .filter((mt) => {
                if (enableMultiBind || !excludeOtherBound) return true;
                return !mt.boundToLocalTemplateId || mt.boundToLocalTemplateId === selectedTemplateId;
              })
              .map((mt) => {
                const boundEvents = mt.boundToEventTypes?.length
                  ? mt.boundToEventTypes.join("، ")
                  : (mt.boundToEventType || "");
                return (
                  <option key={mt.name} value={mt.name}>
                    {mt.name} {mt.category ? `(${mt.category})` : ""}
                    {boundEvents ? ` - مربوط بـ ${boundEvents}` : ""}
                  </option>
                );
              })}
          </select>

          {metaBody && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                <GlobeAltIcon className="h-3 w-3" />
                الرسالة التي ستصل للعميل (نص قالب ميتا)
              </p>
              <div
                dir="auto"
                className="rounded-xl rounded-ee-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
              >
                <p className="whitespace-pre-wrap break-words">
                  {resolveMetaBodyPreview(metaBody, localContent, sampleVariables)}
                </p>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                المتغيرات تُقرأ تلقائياً من الطلب — هذا النص مطابق تماماً لما سيستلمه العميل.
              </p>
            </div>
          )}

          {showMapping && metaBody && (() => {
            const localVars = extractLocalVariableOrder(localContent);
            const metaNums = [...metaBody.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]);
            if (localVars.length === 0 || metaNums.length === 0) return null;
            const pairs = metaNums.map((n, i) => ({
              meta: `{{${n}}}`,
              local: localVars[i] ? `{{${localVars[i]}}}` : "—",
              desc: localVars[i] ? (variableDescriptions[localVars[i]] || "") : "غير متوفر",
              matched: !!localVars[i],
            }));
            return (
              <div className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  تطابق المتغيرات
                </p>
                <div className="space-y-1">
                  {pairs.map((pr) => (
                    <div key={pr.meta} className="flex items-center gap-2 text-[11px]">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{pr.meta}</span>
                      <span className="text-slate-400">←</span>
                      <span className={`rounded px-1.5 py-0.5 font-mono ${pr.matched ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                        {pr.local}
                      </span>
                      {pr.desc && <span className="text-slate-500 dark:text-slate-400">{pr.desc}</span>}
                      {!pr.matched && <span className="text-red-500 font-semibold">متغير ناقص في النص المحلي</span>}
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  ميتا ترقّم المتغيرات بترتيب ظهورها؛ تأكد أن لكل رقم ميتا متغير محلي مطابق.
                </p>
              </div>
            );
          })()}
        </>
      ) : (
        <p className="text-xs text-slate-400">
          لا توجد قوالب ميتا معتمدة — اكتب المحتوى أعلاه ثم استخدم زر «إنشاء قالب ميتا جديد» لنشره للمراجعة.
        </p>
      ))}
    </>
  );
};

export default MetaTemplateSelect;
