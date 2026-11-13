import React from 'react';
import {
  MessageSquare,
  Clock,
  GitFork,
  Zap,
  CheckCircle2,
  XCircle,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import type { CanvasNodeData } from './types';

interface EducationFlowNodeCardProps {
  node: CanvasNodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const EducationFlowNodeCard: React.FC<EducationFlowNodeCardProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const isSelectedCls = isSelected
    ? 'ring-2 ring-primary border-primary shadow-lg'
    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm';

  // 1. TRIGGER NODE (مثل بداية المسار في Customer.io)
  if (node.type === 'trigger') {
    return (
      <div
        id={node.id}
        onClick={() => onSelect(node.id)}
        className={`w-full max-w-md mx-auto cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border p-4 transition-all text-right relative ${isSelectedCls}`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 block">
                مشغل المسار (Start Trigger)
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                {node.title}
              </h3>
            </div>
          </div>
          {node.badges && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
              {node.badges[1] || node.badges[0]}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground pr-10 leading-relaxed">
          {node.subtitle}
        </p>

        {/* Bottom Connection Port Handle */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  // 2. TIME DELAY NODE (مطابق لكروت Time Window في Customer.io)
  if (node.type === 'delay') {
    return (
      <div
        id={node.id}
        onClick={() => onSelect(node.id)}
        className={`w-full max-w-md mx-auto cursor-pointer rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border-2 border-amber-500/30 p-4 transition-all text-right relative ${isSelectedCls}`}
      >
        {/* Top Connection Port Handle */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </div>

        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 tracking-wide uppercase">
            تأخير زمني وجدولة (Time Delay)
          </span>
        </div>

        <div className="pr-9.5 space-y-0.5">
          <div className="text-sm font-bold text-foreground">
            {node.delayText}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {node.delayDetail || node.title}
          </p>
        </div>

        {/* Bottom Connection Port Handle */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </div>
      </div>
    );
  }

  // 3. CONDITION / BRANCHING NODE (مطابق لـ Condition Card في ManyChat & Customer.io)
  if (node.type === 'condition') {
    return (
      <div
        id={node.id}
        onClick={() => onSelect(node.id)}
        className={`w-full max-w-lg mx-auto cursor-pointer rounded-2xl bg-cyan-500/5 dark:bg-cyan-950/20 border-2 border-cyan-500/40 p-4 transition-all text-right relative ${isSelectedCls}`}
      >
        {/* Top Connection Port Handle */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-cyan-500 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 tracking-wide uppercase block">
              شرط وتفرع ذكي (Condition / Split)
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              {node.title}
            </h3>
          </div>
        </div>

        <p className="text-xs text-muted-foreground pr-9.5 mb-3 leading-relaxed">
          {node.conditionQuestion}
        </p>

        {/* Visual Branch Exit Ports */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-500/20">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{node.branches?.yes.label}</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>{node.branches?.no.label}</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
        </div>

        {/* Bottom Connection Port Handles for branches */}
        <div className="absolute -bottom-2 right-1/4 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
        <div className="absolute -bottom-2 left-1/4 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </div>
      </div>
    );
  }

  // 4. MESSAGE CARD (مطابق تماماً لكارت ManyChat في الصورة 1)
  return (
    <div
      id={node.id}
      onClick={() => onSelect(node.id)}
      className={`w-full max-w-md mx-auto cursor-pointer rounded-2xl bg-white dark:bg-slate-900 border p-4 transition-all text-right relative ${isSelectedCls}`}
    >
      {/* Top Connection Port Handle */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>

      {/* Header: WhatsApp / Channel Logo & Step Title */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase block">
              رسالة واتساب (WhatsApp Message)
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              {node.title}
            </h4>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-muted-foreground font-mono font-medium">
          Send Message
        </span>
      </div>

      {/* Message Speech Bubble Body */}
      <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-foreground whitespace-pre-line leading-relaxed">
        {node.messageText}
      </div>

      {/* Buttons / Quick Replies (Chips مثل ماني شات) */}
      {node.buttons && node.buttons.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          <span className="text-[10px] text-muted-foreground block pr-1">
            الأزرار التفاعلية التي تظهر لولي الأمر:
          </span>
          <div className="flex flex-col gap-1.5">
            {node.buttons.map((btn) => (
              <div
                key={btn.id}
                className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-all text-xs font-semibold flex items-center justify-between"
              >
                <span>{btn.label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 rotate-180" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Status Note */}
      {node.footerNote && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground/70 shrink-0" />
          <span className="line-clamp-1">{node.footerNote}</span>
        </div>
      )}

      {/* Bottom Connection Port Handle */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </div>
    </div>
  );
};
