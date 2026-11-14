import React from 'react';
import {
  ArrowRight,
  Bot,
  CheckSquare,
  Clock,
  Info,
  ShoppingCart,
  Wrench,
  XCircle,
} from 'lucide-react';
import { formatQueueLabel } from '../queuePresentation';
import type { ConversationDetail } from './types';

interface WhatsAppChatHeaderProps {
  conversation: ConversationDetail;
  language: string;
  onBack: () => void;
  onOpenOrderModal: () => void;
  onOpenServiceOrderModal: () => void;
  onOpenTaskModal: () => void;
  onToggleDetails: () => void;
  showDetailsPanel: boolean;
  backLabel: string;
  chatLabel: string;
}

export const WhatsAppChatHeader: React.FC<WhatsAppChatHeaderProps> = ({
  conversation,
  language,
  onBack,
  onOpenOrderModal,
  onOpenServiceOrderModal,
  onOpenTaskModal,
  onToggleDetails,
  showDetailsPanel,
  backLabel,
  chatLabel,
}) => {
  return (
    <header className="border-b border-border/50 bg-card/60 px-4 py-3 md:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/70 active:scale-95"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 rotate-180" />
            <span>{backLabel}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">{chatLabel}</span>
              {conversation.queueKey && (
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {formatQueueLabel(conversation.queueKey, conversation.status, language)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-base md:text-lg font-bold text-foreground">
                {conversation.customer.name}
              </h1>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {conversation.customer.phone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          {Boolean((conversation as any).aiStatusHierarchy ? (conversation as any).aiStatusHierarchy.isEffectiveActive : conversation.aiEnabled) ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400"
              title="الرد الذكي مفعّل"
            >
              <Bot className="size-3.5" />
              <span>AI</span>
            </span>
          ) : (conversation as any).aiStatusHierarchy?.reason === 'MASTER_AI_DISABLED' ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400"
              title="الذكاء الاصطناعي معطل رئيسياً من إعدادات الإيجنت — مطلوب رد يدوي"
            >
              <Bot className="size-3.5" />
              <span>AI متوقف (يدوي)</span>
            </span>
          ) : null}

          {conversation.window?.isOpen ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              <Clock className="size-3.5" />
              <span>{conversation.window.remainingLabel}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] font-mono tabular-nums text-rose-600 dark:text-rose-400">
              <XCircle className="size-3.5" />
              <span>{conversation.window?.remainingLabel || 'نافذة منتهية'}</span>
            </span>
          )}

          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={onOpenOrderModal}
            className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted/60 active:scale-95"
            title="إنشاء طلب سريع"
          >
            <ShoppingCart className="size-3.5 text-primary" />
            <span className="hidden sm:inline">طلب جديد</span>
          </button>

          <button
            type="button"
            onClick={onOpenServiceOrderModal}
            className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted/60 active:scale-95"
            title="طلب خدمة صيانة / تركيب"
          >
            <Wrench className="size-3.5 text-amber-500" />
            <span className="hidden sm:inline">طلب خدمة</span>
          </button>

          <button
            type="button"
            onClick={onOpenTaskModal}
            className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted/60 active:scale-95"
            title="إنشاء مهمة سريعة"
          >
            <CheckSquare className="size-3.5 text-emerald-500" />
            <span className="hidden sm:inline">مهمة</span>
          </button>

          <button
            type="button"
            onClick={onToggleDetails}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition active:scale-95 xl:hidden ${
              showDetailsPanel
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/50 bg-card text-foreground hover:bg-muted/60'
            }`}
          >
            <Info className="size-3.5" />
            <span>التفاصيل</span>
          </button>
        </div>
      </div>
    </header>
  );
};
