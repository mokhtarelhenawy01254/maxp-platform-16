import React from "react";
import { SparklesIcon, XMarkIcon, ArrowPathIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { MetaTemplate } from "./WorkspaceWhatsAppTemplates";

export interface WorkspaceWhatsAppTemplateComposerProps {
  activeTemplate: MetaTemplate;
  templateVarIndexes: number[];
  templateVars: Record<number, string>;
  setTemplateVars: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  filledTemplateBody: string;
  isSending: boolean;
  isArabic: boolean;
  onCancelTemplate: () => void;
  onSendTemplate: () => void;
}

export const WorkspaceWhatsAppTemplateComposer: React.FC<WorkspaceWhatsAppTemplateComposerProps> = ({
  activeTemplate,
  templateVarIndexes,
  templateVars,
  setTemplateVars,
  filledTemplateBody,
  isSending,
  isArabic,
  onCancelTemplate,
  onSendTemplate,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <SparklesIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-xs font-bold text-foreground">
            {activeTemplate.name}
          </span>
          <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {isArabic ? "قالب معتمد" : "APPROVED"}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancelTemplate}
          aria-label={isArabic ? "إلغاء القالب" : "Cancel template"}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {templateVarIndexes.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {templateVarIndexes.map((n) => (
            <label key={n} className="flex items-center gap-1.5 text-xs">
              <span className="shrink-0 rounded-lg bg-muted px-2 py-1 font-mono font-bold text-muted-foreground tabular-nums">
                {`{{${n}}}`}
              </span>
              <input
                type="text"
                value={templateVars[n] || ""}
                onChange={(e) => setTemplateVars((p) => ({ ...p, [n]: e.target.value }))}
                placeholder={isArabic ? "قيمة المتغير…" : "Value…"}
                className="h-8 min-w-0 flex-1 rounded-xl border border-border/70 bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </label>
          ))}
        </div>
      )}

      <p className="max-h-20 overflow-y-auto rounded-xl bg-muted/30 p-2.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap text-pretty border border-border/40">
        {filledTemplateBody}
      </p>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onSendTemplate}
          disabled={isSending || templateVarIndexes.some((n) => !(templateVars[n] || "").trim())}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all active:scale-[0.98] hover:bg-emerald-700 disabled:opacity-40 shadow-xs"
        >
          {isSending ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <PaperAirplaneIcon className="h-4 w-4 rtl:rotate-180" />
          )}
          <span>{isArabic ? "إرسال القالب عبر Meta" : "Send via Meta"}</span>
        </button>
      </div>
    </div>
  );
};

export default WorkspaceWhatsAppTemplateComposer;
