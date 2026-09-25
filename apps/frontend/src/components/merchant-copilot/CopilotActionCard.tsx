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
      default:
        return 'إجراء تشغيلي جاهز للتنفيذ';
    }
  };

  return (
    <div className="my-3 rounded-xl border border-white/[0.12] bg-[#121215] p-3.5 text-xs shadow-lg shadow-black/40 transition-all duration-200">
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 font-medium text-zinc-100">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-xs">{card.title || getActionTypeLabel(card.actionType)}</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium tracking-tight ${
            card.status === 'pending'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
              : card.status === 'approved'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-zinc-800 text-zinc-400 border border-white/5'
          }`}
        >
          {card.status === 'pending'
            ? 'بانتظار الاعتماد'
            : card.status === 'approved'
            ? 'معتمد ومطبق'
            : 'ملغي'}
        </span>
      </div>

      <p className="mt-2.5 text-zinc-300 leading-relaxed text-pretty text-[11px]">
        {card.summary}
      </p>

      {card.parameters && Object.keys(card.parameters).length > 0 && (
        <div className="mt-2.5 rounded-lg border border-white/[0.06] bg-black/40 p-2.5 font-mono text-[11px] tabular-nums space-y-1.5">
          {Object.entries(card.parameters).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center text-zinc-400">
              <span className="font-sans text-zinc-400">{key}:</span>
              <span className="font-semibold text-zinc-200">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {card.status === 'pending' ? (
        <div className="mt-3 flex items-center justify-end gap-2 pt-2.5 border-t border-white/[0.06]">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(false)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 text-xs active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            <span>رفض الإجراء</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform active:scale-[0.97] disabled:opacity-50 text-xs"
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
        <div className="mt-2.5 flex items-center gap-1.5 text-emerald-400 text-[11px] pt-1.5 border-t border-white/[0.04]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>تم اعتماد وتطبيق الإجراء بنجاح في المنظومة.</span>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-zinc-500 text-[11px] pt-1.5 border-t border-white/[0.04]">
          <XCircle className="h-3.5 w-3.5" />
          <span>تم إلغاء الإجراء بطلبك.</span>
        </div>
      )}
    </div>
  );
};
