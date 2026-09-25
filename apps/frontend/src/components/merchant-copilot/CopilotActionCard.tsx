import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Check, X } from 'lucide-react';
import type { ActionCardData } from './types';

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
    <div className="my-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 text-xs shadow-md shadow-slate-200/50 dark:shadow-black/40 transition-all duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
          <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-bold text-xs">{card.title || getActionTypeLabel(card.actionType)}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight ${
            card.status === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : card.status === 'approved'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {card.status === 'pending'
            ? 'بانتظار الاعتماد'
            : card.status === 'approved'
            ? 'معتمد ومطبق'
            : 'ملغي'}
        </span>
      </div>

      <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed text-pretty text-xs">
        {card.summary}
      </p>

      {card.parameters && Object.keys(card.parameters).length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 font-mono text-[11px] tabular-nums space-y-1.5">
          {Object.entries(card.parameters).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span className="font-sans text-slate-600 dark:text-slate-400">{key}:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {card.status === 'pending' ? (
        <div className="mt-3.5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(false)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50 text-xs active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            <span>رفض الإجراء</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-white font-bold shadow-xs transition-transform active:scale-[0.97] disabled:opacity-50 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>اعتماد وتطبيق</span>
          </button>
        </div>
      ) : card.status === 'approved' ? (
        <div className="mt-3 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          <span>تم اعتماد وتطبيق الإجراء بنجاح في المنظومة.</span>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <XCircle className="h-4 w-4" />
          <span>تم إلغاء الإجراء بطلبك.</span>
        </div>
      )}
    </div>
  );
};
