import React from "react";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, GlobeAltIcon, XCircleIcon } from "@heroicons/react/24/outline";
import FieldHint from "./FieldHint";
import type { TemplateButton, TemplateFormState, TemplateSlot, TemplateScopeConfig } from "../types";

export interface TemplateButtonsBuilderProps {
  dialogSlot: TemplateSlot;
  templateForm: TemplateFormState;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  config: TemplateScopeConfig;
  statusOptions: Array<{ value: string; label: string }>;
  addButton: () => void;
  addLinkButton: () => void;
  updateButton: (index: number, patch: Partial<TemplateButton>) => void;
  removeButton: (index: number) => void;
}

export default function TemplateButtonsBuilder({
  dialogSlot,
  templateForm,
  setTemplateForm,
  config,
  statusOptions,
  addButton,
  addLinkButton,
  updateButton,
  removeButton,
}: TemplateButtonsBuilderProps) {
  if (!config.features.enableButtons) return null;

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
          الأزرار التفاعلية
          {dialogSlot === "meta" && templateForm.metaTemplateName && (
            <FieldHint text="الأزرار الحالية معتمدة على ميتا — أي تعديل يحتاج «إرسال للمراجعة من جديد»" />
          )}
        </label>
        <Switch
          checked={templateForm.hasButtons}
          onCheckedChange={(val) => setTemplateForm((p) => ({ ...p, hasButtons: val }))}
          aria-label="الأزرار التفاعلية"
        />
      </div>

      {templateForm.hasButtons && (
        <div className="mt-3 space-y-2">
          {templateForm.buttons.map((btn, idx) => (
            <div
              key={btn.id || idx}
              className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/40"
            >
              <div className="w-32">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">نوع الزر</label>
                <select
                  value={btn.type || "QUICK_REPLY"}
                  onChange={(e) => {
                    const type = e.target.value as "QUICK_REPLY" | "LINK";
                    updateButton(idx, {
                      type,
                      action: type === "LINK" ? "LINK" : (btn.action === "LINK" ? "CONFIRMED" : btn.action),
                    });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="QUICK_REPLY">{config.features.quickReplyActions ? "إجراء سريع" : "تغيير الحالة"}</option>
                  <option value="LINK">صفحة العميل</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">نص الزر</label>
                <input
                  type="text"
                  value={btn.text}
                  onChange={(e) => updateButton(idx, { text: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder={btn.type === "LINK" ? "مثال: صفحتي على المتجر" : "مثال: تأكيد الأوردر"}
                />
              </div>
              {btn.type === "LINK" ? (
                <div className="flex-1 pb-1">
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400" title="يفتح صفحة العميل على متجركم حسب رقم الواتساب تلقائياً">
                    رابط صفحة العميل
                  </p>
                </div>
              ) : (
                <div className="flex-1">
                  <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">عند الضغط</label>
                  <select
                    value={btn.action}
                    onChange={(e) => updateButton(idx, { action: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeButton(idx)}
                title="حذف الزر"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            {templateForm.buttons.length < 3 && (
              <button
                type="button"
                onClick={addButton}
                title="الحد الأقصى 3 أزرار لكل رسالة"
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                إضافة زر حالة
              </button>
            )}
            {templateForm.buttons.length < 3 && (
              <button
                type="button"
                onClick={addLinkButton}
                title="الحد الأقصى 3 أزرار لكل رسالة"
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                <GlobeAltIcon className="h-3.5 w-3.5" />
                إضافة زر صفحة العميل
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
