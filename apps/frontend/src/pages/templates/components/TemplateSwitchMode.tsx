import React from "react";
import MetaTemplateSelect from "./MetaTemplateSelect";
import type {
  StatusWithTemplate,
  MetaSession,
  MetaAvailableTemplate,
  TemplateFormState,
} from "../types";

export interface TemplateSwitchModeProps {
  selectedStatus: StatusWithTemplate;
  noun: { singular: string; plural: string };
  isMetaBound: boolean;
  originalMetaTemplateName: string;
  metaSessions: MetaSession[];
  selectedMetaSession: string;
  onSelectMetaSession: (sessionId: string) => void;
  availableMetaTemplates: MetaAvailableTemplate[];
  loadingMetaTemplates: boolean;
  templateForm: TemplateFormState;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  sampleVariables: Record<string, string>;
  variableDescriptions?: Record<string, string>;
  metaVariableMismatch: { metaCount: number; localCount: number; missing: number } | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function TemplateSwitchMode({
  selectedStatus,
  noun,
  isMetaBound,
  originalMetaTemplateName,
  metaSessions,
  selectedMetaSession,
  onSelectMetaSession,
  availableMetaTemplates,
  loadingMetaTemplates,
  templateForm,
  setTemplateForm,
  sampleVariables,
  variableDescriptions,
  metaVariableMismatch,
  saving,
  onClose,
  onSave,
}: TemplateSwitchModeProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
          نوع الحدث
        </label>
        <input
          type="text"
          value={selectedStatus.code}
          disabled
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        />
      </div>

      <div className="rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
          اختر قالب ميتا المعتمد
        </label>
        <p className="-mt-0.5 mb-2 text-[10px] text-slate-400 dark:text-slate-500">
          {isMetaBound
            ? `الربط الحالي: ${originalMetaTemplateName} — اختار قالب تاني عشان تغيّره (مش بيغيّر محتوى الرسالة).`
            : `اختار قالب معتمد وربطه بال${noun.singular} — الرسالة اللي هتتبعت هي نص قالب ميتا نفسه.`}
        </p>
        <MetaTemplateSelect
          metaSessions={metaSessions}
          selectedMetaSession={selectedMetaSession}
          onSessionChange={onSelectMetaSession}
          availableMetaTemplates={availableMetaTemplates}
          loadingMetaTemplates={loadingMetaTemplates}
          selectedMetaTemplateName={templateForm.metaTemplateName}
          onSelectTemplate={(name) =>
            setTemplateForm((p) => ({ ...p, metaTemplateName: name }))
          }
          showMapping={false}
          localContent={templateForm.content}
          sampleVariables={sampleVariables}
          variableDescriptions={variableDescriptions}
        />
      </div>

      {metaVariableMismatch && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          [تنبيه] قالب ميتا محتاج <strong>{metaVariableMismatch.metaCount} متغيرات</strong>، لكن محتوى الرسالة الحالية فيه <strong>{metaVariableMismatch.localCount} فقط</strong>. بدّل من وضع «تعديل» عشان تعدّل الرسالة وتضيف المتغيرات الناقصة.
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !templateForm.metaTemplateName || !!metaVariableMismatch}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          حفظ وربط بقالب ميتا
        </button>
      </div>
    </div>
  );
}
