import React, { useState } from 'react';
import { X, Calculator, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  SettlementMerchant,
  PreviewData,
  formatEgp,
} from './SettlementTypes';

interface SettlementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchants: SettlementMerchant[];
  onSettlementCreated: () => void;
  authHeaders: Record<string, string>;
}

export const SettlementPreviewModal: React.FC<SettlementPreviewModalProps> = ({
  isOpen,
  onClose,
  merchants,
  onSettlementCreated,
  authHeaders,
}) => {
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [issuing, setIssuing] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePreview = async () => {
    if (!selectedMerchantId) {
      toast.error('يرجى اختيار عميل الشحن');
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/v1/shipping-portal/settlements/preview', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          merchantId: selectedMerchantId,
          from: from || undefined,
          to: to || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
        setSelectedShipmentIds((data.data.lines || []).map((l: any) => l.shipmentId));
        if ((data.data.lines || []).length === 0) {
          toast.info('لا توجد شحنات مؤهلة للتسوية في هذه الفترة');
        }
      } else {
        toast.error(data.message || 'فشل في احتساب المعاينة');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleIssueSettlement = async () => {
    if (!preview || selectedShipmentIds.length === 0) {
      toast.error('يرجى تحديد شحنة واحدة على الأقل لإصدار الكشف');
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch('/api/v1/shipping-portal/settlements', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          merchantId: selectedMerchantId,
          from: from || undefined,
          to: to || undefined,
          shipmentIds: selectedShipmentIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تم إنشاء الكشف ${data.data.settlementNumber} بنجاح`);
        onSettlementCreated();
        onClose();
      } else {
        toast.error(data.message || 'فشل في إنشاء الكشف');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setIssuing(false);
    }
  };

  const toggleSelectAll = () => {
    if (!preview) return;
    if (selectedShipmentIds.length === preview.lines.length) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(preview.lines.map((l) => l.shipmentId));
    }
  };

  const toggleShipment = (id: string) => {
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const hasExtraFees = Boolean(
    preview?.lines?.some((l) => (l.extraFees || 0) > 0 || (l.shipment?.extraFees || 0) > 0) ||
    (preview?.summary?.extraFeesTotal != null && preview.summary.extraFeesTotal > 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-[1200px] max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              معاينة وتوليد كشف COD جديد
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              عميل الشحن *
            </label>
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">-- اختر العميل --</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleGeneratePreview}
            disabled={loadingPreview || !selectedMerchantId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {loadingPreview ? 'جارٍ الاحتساب...' : 'احتساب المعاينة'}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {preview ? (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">إجمالي المحصّل</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                    {formatEgp(preview.summary.grossCOD)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">رسوم الشحن</span>
                  <span className="font-bold text-rose-600 text-sm tabular-nums">
                    -{formatEgp(preview.summary.shippingFeesTotal)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">رسوم COD</span>
                  <span className="font-bold text-rose-600 text-sm tabular-nums">
                    -{formatEgp(preview.summary.codFeesTotal)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">رسوم المرتجع</span>
                  <span className="font-bold text-rose-600 text-sm tabular-nums">
                    -{formatEgp(preview.summary.returnFeesTotal)}
                  </span>
                </div>
                {(preview.summary.extraFeesTotal != null && preview.summary.extraFeesTotal > 0) && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 block">رسوم إضافية</span>
                    <span className="font-bold text-rose-600 text-sm tabular-nums">
                      -{formatEgp(preview.summary.extraFeesTotal)}
                    </span>
                  </div>
                )}
                <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                    صافي التوريد
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base tabular-nums">
                    {formatEgp(preview.summary.netPayout)}
                  </span>
                </div>
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={
                        selectedShipmentIds.length === preview.lines.length && preview.lines.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600"
                    />
                    تحديد الكل ({selectedShipmentIds.length} من {preview.lines.length})
                  </label>
                  <span>
                    مسلّمة: {preview.summary.deliveredCount} · مرتجعة: {preview.summary.returnedCount}
                  </span>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2 w-8"></th>
                        <th className="p-2">الباركود / التتبع</th>
                        <th className="p-2">المستلم / المحافظة</th>
                        <th className="p-2">الحالة</th>
                        <th className="p-2 text-left">المحصّل</th>
                        <th className="p-2 text-left">رسوم الشحن</th>
                        <th className="p-2 text-left">رسوم COD</th>
                        <th className="p-2 text-left">رسوم المرتجع</th>
                        {hasExtraFees && <th className="p-2 text-left">رسوم إضافية</th>}
                        <th className="p-2 text-left font-bold">الصافي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {preview.lines.map((l) => {
                        const lineExtra = l.extraFees ?? l.shipment?.extraFees ?? 0;
                        return (
                          <tr
                            key={l.shipmentId}
                            onClick={() => toggleShipment(l.shipmentId)}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer ${
                              selectedShipmentIds.includes(l.shipmentId) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedShipmentIds.includes(l.shipmentId)}
                                onChange={() => toggleShipment(l.shipmentId)}
                                className="rounded text-blue-600"
                              />
                            </td>
                            <td className="p-2 font-mono text-[11px]">{l.shipmentBarcode}</td>
                            <td className="p-2">
                              <div>{l.recipientName}</div>
                              <div className="text-[10px] text-slate-400">{l.destinationGovernorate}</div>
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  l.status === 'DELIVERED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {l.status === 'DELIVERED' ? 'مسلمة' : 'مرتجع'}
                              </span>
                            </td>
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
          ) : (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="text-sm">اختر عميل الشحن والفترة الزمنية ثم اضغط "احتساب المعاينة"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            إغلاق
          </button>
          <button
            onClick={handleIssueSettlement}
            disabled={issuing || !preview || selectedShipmentIds.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            {issuing ? 'جارٍ إصدار الكشف...' : `إصدار الكشف (${selectedShipmentIds.length} شحنة)`}
          </button>
        </div>
      </div>
    </div>
  );
};
