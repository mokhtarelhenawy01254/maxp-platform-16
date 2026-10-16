import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Check, X } from 'lucide-react';
import type { ActionCardData } from './types';
import { cn } from '@/lib/utils';

interface CopilotActionCardProps {
  card: ActionCardData;
  onDecision: (cardId: string, approved: boolean) => Promise<void>;
}

export const CopilotActionCard: React.FC<CopilotActionCardProps> = ({ card, onDecision }) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (approved: boolean) => {
    if (loading || card.status !== 'pending') return;
    setLoading(true);
    try {
      await onDecision(card.id, approved);
    } finally {
      setLoading(false);
    }
  };

  const getActionTypeLabel = (type: ActionCardData['actionType']) => {
    switch (type) {
      case 'price_update':
        return 'تعديل تسعير منتج';
      case 'order_confirm':
        return 'تأكيد شحن طلب';
      case 'order_cancel':
        return 'إلغاء طلب معلق';
      case 'discount_create':
        return 'إنشاء كوبون خصم';
      case 'inventory_adjust':
        return 'تعديل كمية المخزون';
      case 'shipping_update':
        return 'تحديث تسعير الشحن';
      case 'learned_rule':
        return 'تثبيت قاعدة تشغيلية في الذاكرة';
      case 'agent_skill':
        return 'إنشاء مهارة مخصصة للمتجر';
      case 'agent_spawn':
        return 'تجهيز وتعيين وكيل جديد';
      default:
        return 'إجراء تشغيلي جاهز للتنفيذ';
    }
  };

  return (
    <div className="my-2.5 rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 text-xs shadow-2xs text-foreground transition-all duration-150 select-none">
      <div className="flex items-center justify-between pb-2.5 border-b border-border/60 gap-2">
        <div className="flex items-center gap-2 font-medium min-w-0">
          <div className="size-6.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-3.5" />
          </div>
          <span className="font-semibold text-xs text-foreground truncate">
            {card.title || getActionTypeLabel(card.actionType)}
          </span>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold font-mono tabular-nums shrink-0 border",
            card.status === 'pending'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              : card.status === 'approved'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-muted text-muted-foreground border-border/60',
          )}
        >
          {card.status === 'pending'
            ? 'بانتظار الاعتماد'
            : card.status === 'approved'
            ? 'معتمد ومطبق'
            : 'ملغي'}
        </span>
      </div>

      <p className="mt-2.5 text-muted-foreground leading-relaxed text-xs">
        {card.summary}
      </p>

      {card.parameters && Object.keys(card.parameters).length > 0 && (
        <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5 font-mono text-[11px] tabular-nums space-y-1.5">
          {Object.entries(card.parameters).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center text-muted-foreground">
              <span className="font-sans text-muted-foreground">{key}:</span>
              <span className="font-semibold text-foreground">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {card.status === 'pending' ? (
        <div className="mt-3 flex items-center justify-end gap-2 pt-2.5 border-t border-border/60">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 text-xs active:scale-95 cursor-pointer"
          >
            <X className="size-3.5" />
            <span>رفض الإجراء</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-primary-foreground font-semibold shadow-2xs transition-transform active:scale-[0.98] disabled:opacity-50 text-xs cursor-pointer"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            <span>اعتماد وتطبيق</span>
          </button>
        </div>
      ) : card.status === 'approved' ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs pt-2 border-t border-border/60 font-medium">
          <CheckCircle2 className="size-3.5" />
          <span>تم اعتماد وتطبيق الإجراء بنجاح في المنظومة.</span>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-muted-foreground text-xs pt-2 border-t border-border/60">
          <XCircle className="size-3.5" />
          <span>تم إلغاء الإجراء بطلبك.</span>
        </div>
      )}
    </div>
  );
};

export default CopilotActionCard;
