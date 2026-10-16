import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, PackageMinus, AlertTriangle } from 'lucide-react';
import {
  manufacturingApi,
  ProductionOrder,
  WarehouseOption,
} from '../../manufacturingApi';

interface IssueMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  onSuccess: (warnings?: any[]) => void;
}

export const IssueMaterialsModal: React.FC<IssueMaterialsModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<
    Array<{
      rawMaterialId: string;
      rawMaterialName: string;
      quantity: number;
      unit: string;
      unitCost: number;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      manufacturingApi.getWarehouses().then((whs) => {
        setWarehouses(whs);
        setSourceWarehouseId(order.sourceWarehouseId || (whs[0]?.id ?? ''));
      });

      // Prefill items from order BOM components if available
      if (order.bom?.components && order.bom.components.length > 0) {
        setItems(
          order.bom.components.map((c) => ({
            rawMaterialId: c.rawMaterialId,
            rawMaterialName: c.rawMaterialName || c.rawMaterialId,
            quantity: Math.round(Number(c.consumptionPerUnit) * Number(order.plannedQuantity)),
            unit: c.unit || 'PIECE',
            unitCost: 0,
          }))
        );
      } else {
        setItems([
          { rawMaterialId: 'raw_01', rawMaterialName: 'قماش ميلتون', quantity: 100, unit: 'METER', unitCost: 0 },
        ]);
      }
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { rawMaterialId: `raw_${Date.now()}`, rawMaterialName: '', quantity: 10, unit: 'PIECE', unitCost: 0 },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('يرجى إضافة خامة واحدة على الأقل للصرف');
      return;
    }
    if (!sourceWarehouseId) {
      setError('يرجى تحديد مستودع سحب الخامات');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await manufacturingApi.issueMaterials(order.id, {
        sourceWarehouseId,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          rawMaterialId: it.rawMaterialId,
          rawMaterialName: it.rawMaterialName,
          quantity: Number(it.quantity),
          unit: it.unit,
          unitCost: Number(it.unitCost) || 0,
        })),
      });

      onSuccess(res.costWarnings);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل صرف الخامات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-2xl rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <PackageMinus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">إذن صرف خامات يدوي لأمر {order.orderNumber}</h3>
              <p className="text-[11px] text-muted-foreground">صرف كميات محددة وخصمها من رصيد المستودع وتحميلها على تكلفة الأمر</p>
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
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مستودع سحب الخامات *</label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                required
                className="w-full p-2 text-xs rounded border border-border bg-background"
              >
                <option value="">-- اختر المستودع --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات الإذن</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="صرف إضافي لخياطة المقاسات الكبيرة..."
                className="w-full p-2 text-xs rounded border border-border bg-background"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-foreground">بنود الخامات المصروفة</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة بند</span>
              </button>
            </div>

            <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2">اسم الخامة</th>
                    <th className="p-2 w-24">الكمية</th>
                    <th className="p-2 w-24">الوحدة</th>
                    <th className="p-2 w-28">سعر الوحدة (0 للتقييم التلقائي)</th>
                    <th className="p-2 w-10 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-1.5">
                        <input
                          type="text"
                          required
                          value={it.rawMaterialName}
                          onChange={(e) => handleItemChange(idx, 'rawMaterialName', e.target.value)}
                          className="w-full p-1.5 text-xs rounded border border-border/60 bg-background"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full p-1.5 text-xs rounded border border-border/60 bg-background font-mono"
                        />
                      </td>
                      <td className="p-1.5">
                        <select
                          value={it.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full p-1.5 text-xs rounded border border-border/60 bg-background"
                        >
                          <option value="METER">متر</option>
                          <option value="KG">كجم</option>
                          <option value="PIECE">قطعة</option>
                          <option value="SPOOL">بكرة</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={it.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 text-xs rounded border border-border/60 bg-background font-mono"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
              className="px-4 py-1.5 rounded bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {saving ? 'جارٍ الصرف...' : 'تأكيد وصرف الخامات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
