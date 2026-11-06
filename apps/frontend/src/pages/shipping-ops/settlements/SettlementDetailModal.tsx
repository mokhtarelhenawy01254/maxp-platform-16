import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle, DollarSign, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettlementItem,
  SETTLEMENT_STATUS_MAP,
  formatEgp,
} from './SettlementTypes';

interface SettlementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlementId: string | null;
  authHeaders: Record<string, string>;
  onRefresh: () => void;
  onOpenPayModal: (settlement: SettlementItem) => void;
}

export const SettlementDetailModal: React.FC<SettlementDetailModalProps> = ({
  isOpen,
  onClose,
  settlementId,
  authHeaders,
  onRefresh,
  onOpenPayModal,
}) => {
  const [settlement, setSettlement] = useState<SettlementItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !settlementId) return;
    setLoading(true);
    fetch(`/api/v1/shipping-portal/settlements/${settlementId}`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettlement(data.data);
        } else {
          toast.error(data.message || 'فشل في تحميل تفاصيل الكشف');
        }
      })
      .catch(() => toast.error('خطأ في الاتصال بالخادم'))
      .finally(() => setLoading(false));
  }, [isOpen, settlementId]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!settlement) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/shipping-portal/settlements/${settlement.id}/approve`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم اعتماد كشف التسوية بنجاح');
        setSettlement(data.data);
        onRefresh();
      } else {
        toast.error(data.message || 'فشل في اعتماد الكشف');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!settlement) return;
    const reason = window.prompt('سبب الرفض:');
    if (reason === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/shipping-portal/settlements/${settlement.id}/reject`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم رفض كشف التسوية');
        setSettlement(data.data);
        onRefresh();
      } else {
        toast.error(data.message || 'فشل في رفض الكشف');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!settlement) return;
    window.open(`/api/v1/shipping-portal/settlements/${settlement.id}/export`, '_blank');
  };

  const statusConfig = settlement
    ? SETTLEMENT_STATUS_MAP[settlement.status] || SETTLEMENT_STATUS_MAP.DRAFT
    : SETTLEMENT_STATUS_MAP.DRAFT;

  const hasExtraFees = Boolean(
    settlement?.lines?.some((l) => (l.extraFees || 0) > 0 || (l.shipment?.extraFees || 0) > 0) ||
    (settlement?.extraFeesTotal != null && settlement.extraFeesTotal > 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-[1200px] max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {settlement?.settlementNumber || 'تفاصيل كشف التسوية'}
                </h3>
                {settlement && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusConfig.badgeClass}`}>
                    {statusConfig.labelAr}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                العميل: {settlement?.merchant?.name || 'غير محدد'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={!settlement}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">جارٍ تحميل البيانات...</div>
          ) : settlement ? (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">إجمالي المحصّل</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                    {formatEgp(settlement.grossCOD)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">رسوم الشحن</span>
                  <span className="font-bold text-rose-600 text-sm tabular-nums">
                    -{formatEgp(settlement.shippingFeesTotal)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">رسوم COD</span>
                  <span className="font-bold text-rose-600 text-sm tabular-nums">
                    -{formatEgp(settlement.codFeesTotal)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">رسوم المرتجع</span>
                  <span className="font-bold text-rose-600 text-sm tabular-nums">
                    -{formatEgp(settlement.returnFeesTotal)}
                  </span>
                </div>
                {(settlement.extraFeesTotal != null && settlement.extraFeesTotal > 0) && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">رسوم إضافية</span>
                    <span className="font-bold text-rose-600 text-sm tabular-nums">
                      -{formatEgp(settlement.extraFeesTotal)}
                    </span>
                  </div>
                )}
                <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                    صافي التوريد
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base tabular-nums">
                    {formatEgp(settlement.netPayout)}
                  </span>
                </div>
              </div>

              {/* Payment Details if Paid */}
              {settlement.status === 'PAID' && (
                <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3 text-xs flex flex-wrap gap-4 text-teal-900 dark:text-teal-300">
                  <div>
                    <span className="font-medium text-teal-700 dark:text-teal-400">طريقة التوريد: </span>
                    {settlement.paymentMethod || 'نقدي'}
                  </div>
                  <div>
                    <span className="font-medium text-teal-700 dark:text-teal-400">المرجع: </span>
                    <span className="font-mono">{settlement.paymentReference || '—'}</span>
                  </div>
                  {settlement.paidAt && (
                    <div>
                      <span className="font-medium text-teal-700 dark:text-teal-400">تاريخ الصرف: </span>
                      {new Date(settlement.paidAt).toLocaleDateString('ar-EG')}
                    </div>
                  )}
                </div>
              )}

              {/* Lines Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  أسطر الشحنات المدرجة ({settlement.lines?.length || 0} شحنة)
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2">الباركود / التتبع</th>
                        <th className="p-2">المستلم / المحافظة</th>
                        <th className="p-2">الحالة</th>
                        <th className="p-2 text-left">قيمة COD</th>
                        <th className="p-2 text-left">المحصّل</th>
                        <th className="p-2 text-left">رسوم الشحن</th>
                        <th className="p-2 text-left">رسوم COD</th>
                        <th className="p-2 text-left">رسوم المرتجع</th>
                        {hasExtraFees && <th className="p-2 text-left">رسوم إضافية</th>}
                        <th className="p-2 text-left font-bold">الصافي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(settlement.lines || []).map((l) => {
                        const lineExtra = l.extraFees ?? l.shipment?.extraFees ?? 0;
                        return (
                          <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="p-2 font-mono text-[11px]">
                              {l.shipment?.barcode || l.shipment?.trackingNumber || l.shipmentId}
                            </td>
                            <td className="p-2">
                              <div>{l.shipment?.recipientName || '—'}</div>
                              <div className="text-[10px] text-slate-400">
                                {l.shipment?.destinationGovernorate || '—'}
                              </div>
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  l.shipment?.status === 'DELIVERED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {l.shipment?.status === 'DELIVERED' ? 'مسلمة' : 'مرتجع'}
                              </span>
                            </td>
                            <td className="p-2 text-left tabular-nums">{formatEgp(l.codAmount)}</td>
                            <td className="p-2 text-left tabular-nums">{formatEgp(l.collectedAmount)}</td>
                            <td className="p-2 text-left tabular-nums text-rose-600">
                              {l.shippingFee > 0 ? `-${formatEgp(l.shippingFee)}` : '0.00'}
                            </td>
                            <td className="p-2 text-left tabular-nums text-rose-600">
                              {l.codFee > 0 ? `-${formatEgp(l.codFee)}` : '0.00'}
                            </td>
                            <td className="p-2 text-left tabular-nums text-rose-600">
                              {l.returnFee > 0 ? `-${formatEgp(l.returnFee)}` : '0.00'}
                            </td>
                            {hasExtraFees && (
                              <td className="p-2 text-left tabular-nums text-rose-600">
                                {lineExtra > 0 ? `-${formatEgp(lineExtra)}` : '0.00'}
                              </td>
                            )}
                            <td className="p-2 text-left tabular-nums font-bold text-slate-900 dark:text-white">
                              {formatEgp(l.net)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex gap-2">
            {(settlement?.status === 'ISSUED' || settlement?.status === 'DRAFT') && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                اعتماد الكشف
              </button>
            )}
            {settlement?.status === 'APPROVED' && (
              <button
                onClick={() => onOpenPayModal(settlement)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                تسجيل التوريد والصرف
              </button>
            )}
            {settlement && settlement.status !== 'PAID' && settlement.status !== 'REJECTED' && (
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-3.5 py-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                رفض
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
