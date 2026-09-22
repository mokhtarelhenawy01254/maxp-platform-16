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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            تسجيل هدر تشغيلي جديد
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">المادة الخام</label>
            <select
              value={formProductId}
              onChange={(e) => {
                setFormProductId(e.target.value);
                const prod = products.find((p) => p.id === e.target.value);
                if (prod?.unit) setFormUnit(prod.unit);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-white/10 text-white outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit || 'وحدة'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">الكمية المهدرة</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-white/10 text-white tabular-nums outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">المستودع / البار</label>
              <select
                value={formWarehouseId}
                onChange={(e) => setFormWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-white/10 text-white outline-none"
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
            <label className="block text-xs font-medium text-neutral-300 mb-1">سبب الهدر</label>
            <select
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-white/10 text-white outline-none"
            >
              {Object.entries(reasons).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">ملاحظات توضيحية (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: ضبط درجة الطحن على مطحنة الماهلكونيج"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-white/10 text-white outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium rounded-lg border border-white/10 text-neutral-300 hover:bg-neutral-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'جاري الحفظ...' : 'تأكيد وخصم المخزون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
