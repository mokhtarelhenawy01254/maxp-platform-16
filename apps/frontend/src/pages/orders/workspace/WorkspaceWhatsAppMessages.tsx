import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  content: string;
  timestamp?: number | string;
  createdAt?: string;
  status?: string;
  messageType?: string;
}

interface WorkspaceWhatsAppMessagesProps {
  messages: ChatMessage[];
  loadingMessages: boolean;
  onSwitchToTemplates: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const WorkspaceWhatsAppMessages: React.FC<WorkspaceWhatsAppMessagesProps> = ({
  messages,
  loadingMessages,
  onSwitchToTemplates,
  messagesEndRef,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  if (loadingMessages) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3 border border-emerald-500/20">
          <MessageSquare size={22} />
        </div>
        <p className="text-xs font-bold text-foreground">
          {isArabic ? 'لا توجد محادثة سابقة مع هذا العميل' : 'No prior messages found'}
        </p>
        <p className="mt-1 text-[11px] max-w-xs text-muted-foreground">
          {isArabic
            ? 'يمكنك إرسال قالب تأكيد فوري أو كتابة رسالة مباشرة للعميل أدناه.'
            : 'You can send a confirmation template or type a message below.'}
        </p>
        <button
          type="button"
          onClick={onSwitchToTemplates}
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
        >
          <FileText size={14} />
          <span>{isArabic ? 'تصفح القوالب الجاهزة' : 'Browse Templates'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => {
        const isMine = msg.fromMe;
        const dateStr = msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                isMine
                  ? 'rounded-ee-xs bg-emerald-600 text-white dark:bg-emerald-700'
                  : 'rounded-es-xs bg-card border border-border/70 text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap select-text">{msg.content}</p>
              <div
                className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] font-mono tabular-nums ${
                  isMine ? 'text-emerald-100/85' : 'text-muted-foreground'
                }`}
              >
                <span dir="ltr">{dateStr}</span>
                {isMine && <CheckCircle2 size={11} className="inline text-emerald-200" />}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default WorkspaceWhatsAppMessages;
