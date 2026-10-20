import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Factory } from 'lucide-react';
import { manufacturingApi, SampleOrder, BillOfMaterials } from '../manufacturingApi';

interface ConvertToOrderModalProps {
  isOpen: boolean;
  sample: SampleOrder | null;
  onClose: () => void;
  onSuccess: (order: any) => void;
}

export const ConvertToOrderModal: React.FC<ConvertToOrderModalProps> = ({
  isOpen,
  sample,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [plannedQuantity, setPlannedQuantity] = useState<number>(300);
  const [orderType, setOrderType] = useState<string>('FULL_PACKAGE');
  const [bomId, setBomId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [boms, setBoms] = useState<BillOfMaterials[]>([]);

  useEffect(() => {
    if (isOpen && sample) {
      // Default quantity for full production
      setPlannedQuantity(300);
      setOrderType(sample.materialSource === 'CUSTOMER' ? 'CUSTOMER_MATERIALS' : 'FULL_PACKAGE');
      setBomId(sample.bomId || '');
      setNotes(`أمر إنتاج تشغيلي مبني على العينة المعتمدة ${sample.sampleNumber}`);

      manufacturingApi
        .listBoms()
        .then((res: any) => {
          const items = Array.isArray(res) ? res : (res?.items || []);
          setBoms(items);
          // If sample didn't have bomId, auto-select first matching or available
          if (!sample.bomId && items.length > 0) {
            setBomId(items[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, sample]);

  if (!isOpen || !sample) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomId) {
      setError('قائمة المكونات (BOM) مطلوبة لإنشاء أمر التصنيع');
      return;
    }
    if (plannedQuantity <= 0) {
      setError('الكمية المخططة لأمر التصنيع يجب أن تكون أكبر من الصفر');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await manufacturingApi.convertSampleToOrder(sample.id, {
        plannedQuantity: Number(plannedQuantity),
        orderType,
        bomId,
        notes: notes.trim() || undefined,
      });

      onSuccess(res.order);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحويل العينة لأمر تصنيع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                تحويل العينة إلى أمر تصنيع وتشغيل كامل
              </h2>
              <p className="text-xs text-muted-foreground">
                رقم العينة: <span className="font-semibold text-primary">{sample.sampleNumber}</span> ({sample.productName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Banner */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">العميل / البراند:</span>
              <span className="font-medium">{sample.customerName || sample.brandName || 'عميل غير مسجل'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المقاس واللون المعتمد:</span>
              <span className="font-medium">
                {sample.size || 'STANDARD'} / {sample.color || 'STANDARD'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">مصدر الخامة:</span>
              <span className="font-medium">
                {sample.materialSource === 'CUSTOMER' ? 'خامة من العميل (CMT)' : 'خامة من المصنع'}
              </span>
            </div>
          </div>

          {/* Planned Quantity */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              الكمية المخططة لأمر التصنيع <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={plannedQuantity}
              onChange={(e) => setPlannedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums font-semibold"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              سيتم إنشاء مصفوفة إنتاج افتراضية بمقاس {sample.size || 'L'} ولون {sample.color || 'أسود'} بإجمالي {plannedQuantity} قطعة.
            </p>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">نوع أمر التصنيع</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="FULL_PACKAGE">تصنيع كامل بخامات المصنع (FULL_PACKAGE)</option>
              <option value="CUSTOMER_MATERIALS">تشغيل بخامات العميل (CUSTOMER_MATERIALS)</option>
              <option value="CMT">قص وتشغيل وتجهيز (CMT)</option>
              <option value="OUTSOURCED">تشغيل خارجي بمصنع شريك (OUTSOURCED)</option>
            </select>
          </div>

          {/* BOM Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              قائمة المكونات (BOM) <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={bomId}
              onChange={(e) => setBomId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">اختر قائمة المكونات لحساب الاحتياجات...</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">ملاحظات إضافية لأمر التشغيل</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Factory className="w-4 h-4" />
              {loading ? 'جاري التحويل وإنشاء الأمر...' : 'تأكيد وإنشاء أمر التصنيع'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
