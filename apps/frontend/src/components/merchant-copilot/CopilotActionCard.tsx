import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
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
        return 'تعديل سعر منتج';
      case 'order_confirm':
        return 'تأكيد شحن طلب';
      case 'order_cancel':
        return 'إلغاء طلب';
      case 'discount_create':
        return 'إنشاء كوبون خصم';
      case 'inventory_adjust':
        return 'تعديل كمية مخزون';
      case 'shipping_update':
        return 'تحديث تسعير الشحن';
      default:
        return 'إجراء تشغيلي جاهز للاعتماد';
    }
  };

  return (
    <div className="my-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-1.5 font-medium text-amber-400">
          <ShieldCheck className="h-4 w-4" />
          <span>{card.title || getActionTypeLabel(card.actionType)}</span>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
          {card.status === 'pending'
            ? 'بانتظار موافقتك'
            : card.status === 'approved'
            ? 'معتمد ومطبق'
            : 'ملغي'}
        </span>
      </div>

      <p className="mt-2 text-slate-300 leading-relaxed text-[12px]">{card.summary}</p>

      {card.parameters && Object.keys(card.parameters).length > 0 && (
        <div className="mt-2.5 rounded-lg border border-white/5 bg-black/20 p-2 font-mono text-[11px] space-y-1">
          {Object.entries(card.parameters).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center text-slate-400">
              <span className="font-sans text-slate-400">{key}:</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {card.status === 'pending' ? (
        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(false)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>إلغاء</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleAction(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-white font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>اعتماد وتطبيق</span>
          </button>
        </div>
      ) : card.status === 'approved' ? (
        <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-[11px] pt-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>تم اعتماد وتطبيق الإجراء بنجاح في النظام.</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 text-slate-500 text-[11px] pt-1.5">
          <XCircle className="h-3.5 w-3.5" />
          <span>تم إلغاء الإجراء بطلبك.</span>
        </div>
      )}
    </div>
  );
};
