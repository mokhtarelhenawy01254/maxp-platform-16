import React from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import FieldHint from "./FieldHint";
import type { TemplateFormState, TemplateScopeConfig, TemplateSlot } from "../types";

export interface TemplateHeaderMediaProps {
  dialogSlot: TemplateSlot;
  templateForm: TemplateFormState;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  headerUploading: boolean;
  uploadHeaderMedia: (file: File) => void;
  config: TemplateScopeConfig;
}

export default function TemplateHeaderMedia({
  dialogSlot,
  templateForm,
  setTemplateForm,
  headerUploading,
  uploadHeaderMedia,
  config,
}: TemplateHeaderMediaProps) {
  if (dialogSlot !== "meta") return null;

  return (
    <div className="mb-3 space-y-1">
      <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
        صورة الرأس (HEADER)
        <FieldHint text="اختياري — ترفع لميتا كـ IMAGE header وتستخدم عينة للموافقة" />
      </label>
      <div className="flex items-center gap-2">
        {templateForm.headerMediaHandle ? (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
            <PhotoIcon className="size-4 shrink-0 text-slate-400" />
            <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400" dir="ltr">
              {templateForm.headerMediaName || templateForm.headerMediaHandle}
            </span>
            <button
              type="button"
              onClick={() => setTemplateForm((p) => ({ ...p, headerMediaHandle: "", headerMediaName: "" }))}
              className="shrink-0 text-[11px] font-medium text-red-500 hover:text-red-600"
            >
              إزالة
            </button>
          </div>
        ) : (
          <div className="flex h-10 flex-1 items-center gap-2">
            <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <PhotoIcon className="size-4" />
              {headerUploading ? "جاري الرفع إلى ميتا..." : "اختر صورة للرأس"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={headerUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadHeaderMedia(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </div>
      {config.features.enableHeaderProductImage && (
        <label
          className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
          title="كل رسالة هتتبعت بصورة أول منتج في الطلب (متغيرة لكل طلب)"
        >
          <input
            type="checkbox"
            checked={templateForm.headerUsesOrderProduct}
            onChange={(e) => setTemplateForm((p) => ({ ...p, headerUsesOrderProduct: e.target.checked }))}
            className="size-4 accent-indigo-600"
          />
          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
            استخدم صورة المنتج من الطلب وقت الإرسال
          </span>
        </label>
      )}
    </div>
  );
}
