import { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  cost?: number;
  unit?: string;
  sku?: string;
}

interface CreateWasteModalProps {
  products: ProductItem[];
  warehouses: Array<{ id: string; name: string }>;
  reasons: Record<string, { label: string; badge: string }>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unit: string;
    reason: string;
    notes?: string;
  }) => void;
}

export default function CreateWasteModal({
  products,
  warehouses,
  reasons,
  submitting,
  onClose,
  onSubmit
}: CreateWasteModalProps) {
  const [formProductId, setFormProductId] = useState(products[0]?.id || '');
  const [formWarehouseId, setFormWarehouseId] = useState(warehouses[0]?.id || '');
  const [formQuantity, setFormQuantity] = useState('0.05');
  const [formUnit, setFormUnit] = useState(products[0]?.unit || 'KG');
  const [formReason, setFormReason] = useState('CALIBRATION_DIAL_IN');
  const [formNotes, setFormNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId || Number(formQuantity) <= 0) return;
    onSubmit({
      productId: formProductId,
      warehouseId: formWarehouseId,
      quantity: Number(formQuantity),
      unit: formUnit,
      reason: formReason,
      notes: formNotes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-card text-card-foreground border border-border rounded-xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-border/60 pb-3">
          <h3 className="font-bold text-foreground text-sm sm:text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            تسجيل هدر تشغيلي جديد
          </h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">المادة الخام *</label>
            <select
              value={formProductId}
              onChange={(e) => {
                setFormProductId(e.target.value);
                const prod = products.find((p) => p.id === e.target.value);
                if (prod?.unit) setFormUnit(prod.unit);
              }}
              required
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit || 'وحدة'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-foreground mb-1">الكمية المهدرة *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground tabular-nums outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block font-medium text-foreground mb-1">المستودع / البار *</label>
              <select
                value={formWarehouseId}
                onChange={(e) => setFormWarehouseId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">سبب الهدر *</label>
            <select
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              {Object.entries(reasons).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">ملاحظات توضيحية (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: ضبط درجة الطحن على مطحنة الماهلكونيج"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 font-medium rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground active:scale-95 disabled:opacity-50 transition-transform shadow-xs"
            >
              {submitting ? 'جاري الحفظ...' : 'تأكيد وخصم المخزون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
