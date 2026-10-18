import React from "react";
import { ArrowPathIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { WorkspaceOrder } from "./types";

export interface WorkspaceWhatsAppFreeComposerProps {
  order: WorkspaceOrder;
  messageText: string;
  setMessageText: React.Dispatch<React.SetStateAction<string>>;
  isSending: boolean;
  isArabic: boolean;
  onSendMessage: () => void;
}

export const WorkspaceWhatsAppFreeComposer: React.FC<WorkspaceWhatsAppFreeComposerProps> = ({
  order,
  messageText,
  setMessageText,
  isSending,
  isArabic,
  onSendMessage,
}) => {
  return (
    <>
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-muted-foreground font-semibold shrink-0">
          {isArabic ? "إدراج سريع:" : "Insert:"}
        </span>
        <button
          type="button"
          onClick={() => setMessageText((p) => `${p} ${order.customerName || ""}`)}
          className="rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-foreground hover:bg-muted shrink-0 transition-colors"
        >
          + {isArabic ? "اسم العميل" : "Name"}
        </button>
        <button
          type="button"
          onClick={() => setMessageText((p) => `${p} #${order.orderNumber}`)}
          className="rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-foreground hover:bg-muted shrink-0 transition-colors"
        >
          + {isArabic ? "رقم الطلب" : "#Order"}
        </button>
        <button
          type="button"
          onClick={() => setMessageText((p) => `${p} ${order.total} ج.م`)}
          className="rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-foreground hover:bg-muted shrink-0 transition-colors"
        >
          + {isArabic ? "الإجمالي" : "Total"}
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={
            isArabic
              ? "اكتب رسالة للعميل أو اختر قالباً…"
              : "Type a message or pick a template…"
          }
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSendMessage();
            }
          }}
        />

        <button
          type="button"
          onClick={onSendMessage}
          disabled={isSending || !messageText.trim()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs transition-transform active:scale-[0.98] hover:bg-emerald-700 disabled:opacity-40"
        >
          {isSending ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <PaperAirplaneIcon className="h-4 w-4 rtl:rotate-180" />
          )}
          <span>{isArabic ? "إرسال" : "Send"}</span>
        </button>
      </div>
    </>
  );
};

export default WorkspaceWhatsAppFreeComposer;
