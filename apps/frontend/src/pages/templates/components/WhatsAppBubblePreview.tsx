import React from "react";
import type { TemplateButton } from "../types";
import { resolveVariablesCustom, resolveVariablesForPreview } from "../utils";

export interface WhatsAppBubblePreviewProps {
  content: string;
  buttons: TemplateButton[];
  hasButtons: boolean;
  sampleVariables?: Record<string, string>;
}

function formatWhatsAppText(text: string): string {
  return text.trim();
}

export const WhatsAppBubblePreview: React.FC<WhatsAppBubblePreviewProps> = ({
  content,
  buttons,
  hasButtons,
  sampleVariables,
}) => {
  const resolved = sampleVariables
    ? resolveVariablesCustom(content, sampleVariables)
    : resolveVariablesForPreview(content);

  const now = new Date();
  const time = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const visibleButtons = hasButtons ? buttons.filter((b) => b.text && b.text.trim()) : [];

  return (
    <div
      data-testid="whatsapp-preview"
      className="relative ms-auto w-[88%] max-w-[340px] rounded-xl rounded-ee-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
      dir="auto"
    >
      <div className="absolute bottom-1.5 end-1.5 flex items-center gap-0.5 text-[#34b7f1] dark:text-sky-300">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M11.071.653a.5.5 0 0 1 .076.704l-6 7.5a.5.5 0 0 1-.762.026L2.146 6.16a.5.5 0 1 1 .708-.706l1.864 1.864 5.65-7.06a.5.5 0 0 1 .703-.075z" fill="currentColor"/>
          <path d="M15.071.653a.5.5 0 0 1 .076.704l-6 7.5a.5.5 0 0 1-.762.026l-.5-.5.707-.707.13.13 5.65-7.06a.5.5 0 0 1 .7-.075z" fill="currentColor"/>
        </svg>
      </div>

      <p className="whitespace-pre-wrap break-words ps-5 font-[system-ui]">
        {formatWhatsAppText(resolved) || (
          <span className="text-slate-400 dark:text-slate-500">معاينة الرسالة ستظهر هنا...</span>
        )}
      </p>

      <p className="mt-1 pe-5 text-end text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{time}</p>

      {visibleButtons.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-black/5 pt-1.5 dark:border-white/10">
          {visibleButtons.map((b, i) => (
            <div
              key={b.id || i}
              className="rounded-md bg-white/70 py-1.5 text-center text-[12px] font-medium text-[#34b7f1] dark:bg-white/10 dark:text-sky-300"
            >
              {b.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhatsAppBubblePreview;
