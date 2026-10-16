import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertCircle } from 'lucide-react';
import {
  manufacturingApi,
  ProductionOrder,
  WarehouseOption,
} from '../../manufacturingApi';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  onSuccess: () => void;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<
    Array<{
      size: string;
      color: string;
      plannedQuantity: number;
      goodQuantity: number;
      scrapQuantity: number;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      manufacturingApi.getWarehouses().then((whs) => {
        setWarehouses(whs);
        setTargetWarehouseId(order.targetWarehouseId || (whs[0]?.id ?? ''));
      });

      // Prefill items from order variants with remaining unreceived quantities
      if (order.variants && order.variants.length > 0) {
        setItems(
          order.variants.map((v) => {
            const planned = Number(v.plannedQuantity) || 0;
            const alreadyReceived = Number(v.producedQuantity) || 0;
            const alreadyScrapped = Number(v.scrappedQuantity) || 0;
            const remaining = Math.max(0, planned - (alreadyReceived + alreadyScrapped));
            return {
              size: v.size,
              color: v.color,
              plannedQuantity: planned,
              goodQuantity: remaining,
              scrapQuantity: 0,
            };
          })
        );
      } else {
        setItems([
          { size: 'M', color: 'أسود', plannedQuantity: Number(order.plannedQuantity), goodQuantity: Number(order.plannedQuantity), scrapQuantity: 0 },
        ]);
      }
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleItemChange = (idx: number, field: 'goodQuantity' | 'scrapQuantity', val: number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: Math.max(0, val) };
    setItems(updated);
  };

  const totalGood = items.reduce((sum, it) => sum + (Number(it.goodQuantity) || 0), 0);
  const totalScrap = items.reduce((sum, it) => sum + (Number(it.scrapQuantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalGood === 0 && totalScrap === 0) {
      setError('يرجى إدخال كمية سليمة أو هالكة للاستلام');
      return;
    }
    if (!targetWarehouseId) {
      setError('يرجى اختيار مستودع استلام البضاعة التامة');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await manufacturingApi.receiveFinishedGoods(order.id, {
        targetWarehouseId,
        notes: notes.trim() || undefined,
        items: items
          .filter((it) => it.goodQuantity > 0 || it.scrapQuantity > 0)
          .map((it) => ({
            size: it.size,
            color: it.color,
            goodQuantity: Number(it.goodQuantity),
            scrapQuantity: Number(it.scrapQuantity),
          })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل استلام الإنتاج التام');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-2xl rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">إذن استلام إنتاج تام (FGR) لأمر {order.orderNumber}</h3>
              <p className="text-[11px] text-muted-foreground">تسجيل القطع المكتملة وإضافتها لمخزون المنتج النهائي التام</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مستودع الاستلام المستهدف *</label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                required
                className="w-full p-2 text-xs rounded border border-border bg-background"
              >
                <option value="">-- اختر مستودع التام --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات الاستلام والفحص</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="استلام دفعة أولى بعد الفحص والكي..."
                className="w-full p-2 text-xs rounded border border-border bg-background"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-foreground">الكميات المستلمة حسب المتغيرات (المقاس × اللون)</span>
              <div className="text-[11px] font-mono text-muted-foreground">
                سليم: <span className="font-bold text-emerald-600">{totalGood}</span> | هالك/معيب: <span className="font-bold text-amber-600">{totalScrap}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5">المقاس</th>
                    <th className="p-2.5">اللون</th>
                    <th className="p-2.5 text-center">المخطط</th>
                    <th className="p-2.5 text-center text-emerald-600 font-bold">الكمية السليمة</th>
                    <th className="p-2.5 text-center text-amber-600 font-bold">كمية الهالك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition">
                      <td className="p-2 font-mono font-bold text-foreground">{it.size}</td>
                      <td className="p-2 text-foreground">{it.color}</td>
                      <td className="p-2 text-center font-mono text-muted-foreground">{it.plannedQuantity}</td>
                      <td className="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={it.goodQuantity}
                          onChange={(e) => handleItemChange(idx, 'goodQuantity', parseInt(e.target.value, 10) || 0)}
                          className="w-20 p-1 text-center font-mono text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={it.scrapQuantity}
                          onChange={(e) => handleItemChange(idx, 'scrapQuantity', parseInt(e.target.value, 10) || 0)}
                          className="w-20 p-1 text-center font-mono text-xs rounded border border-border bg-background font-mono text-amber-600 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border text-muted-foreground hover:bg-muted/40 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {saving ? 'جارٍ الاستلام...' : 'تأكيد واستلام الإنتاج التام'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
