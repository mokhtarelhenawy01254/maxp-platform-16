import React, { useState, useEffect, useCallback } from 'react';
import { X, Globe2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  shippingOpsService,
  InternationalAcknowledgmentItem,
} from '../../services/shippingOpsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAckUpdated?: () => void;
}

export const InternationalAcksModal: React.FC<Props> = ({ isOpen, onClose, onAckUpdated }) => {
  const [items, setItems] = useState<InternationalAcknowledgmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await shippingOpsService.getPendingInternational();
      setItems(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل الإقرارات الجمركية المعلقة';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadPending();
    }
  }, [isOpen, loadPending]);

  if (!isOpen) return null;

  const handleReview = async (ackId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoadingId(ackId);
      const note = notes[ackId] || undefined;
      await shippingOpsService.reviewInternationalAck(ackId, { status, notes: note });
      toast.success(status === 'APPROVED' ? 'تمت الموافقة على الإقرار الجمركي بنجاح' : 'تم رفض الإقرار الجمركي');
      setItems((prev) => prev.filter((i) => i.id !== ackId));
      if (onAckUpdated) onAckUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحديث حالة الإقرار';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                إقرارات الشحنات الدولية المعلقة
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مراجعة الإقرارات الجمركية قبل إسناد الشحنات لرحلات التوصيل
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPending}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading && items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <span>جاري تحميل الإقرارات الجمركية...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                لا توجد إقرارات جمركية معلقة بانتظار المراجعة
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                جميع الشحنات الدولية معتمدة ومؤهلة للخروج إلى رحلات التوصيل
              </p>
            </div>
          ) : (
            items.map((ack) => {
              const isActing = actionLoadingId === ack.id;
              return (
                <div
                  key={ack.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {ack.shipment?.trackingNumber || ack.shipmentId}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        ({ack.customerName})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        {ack.shipment?.destinationCountry || 'دولي'}
                      </span>
                      <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        قيمة جمركية: {ack.customsValue} USD
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span className="text-slate-400 whitespace-nowrap">وصف المحتويات:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{ack.contentDescription}</span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="ملاحظات المراجعة (اختياري)..."
                      value={notes[ack.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [ack.id]: e.target.value })}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex-1"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReview(ack.id, 'APPROVED')}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>موافقة واعتِماد</span>
                      </button>
                      <button
                        onClick={() => handleReview(ack.id, 'REJECTED')}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض الإقرار</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>الشحنات المرفوضة أو المعلقة لا يمكن إسنادها لرحلة تسليم.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
