import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { manufacturingApi, ProductionOrder, ProductionOrderStatus, ProductionOrderType } from '../../manufacturingApi';
import { DateInput } from '../../../../components/ui/DateInput';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onUpdated: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderType, setOrderType] = useState<ProductionOrderType>('FULL_PACKAGE');
  const [brandName, setBrandName] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState<string>('');
  const [salePricePerUnit, setSalePricePerUnit] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [status, setStatus] = useState<ProductionOrderStatus>('PLANNED');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (order && isOpen) {
      setOrderType(order.orderType || 'FULL_PACKAGE');
      setBrandName(order.brandName || '');
      setCustomerCountry(order.customerCountry || '');
      setPlannedQuantity(order.plannedQuantity ? String(order.plannedQuantity) : '');
      setSalePricePerUnit(order.salePricePerUnit !== null && order.salePricePerUnit !== undefined ? String(order.salePricePerUnit) : '');
      setDueDate(order.dueDate ? new Date(order.dueDate).toISOString().slice(0, 10) : '');
      setStartDate(order.startDate ? new Date(order.startDate).toISOString().slice(0, 10) : '');
      setDeliveryAddress(order.deliveryAddress || '');
      setDeliveryMethod(order.deliveryMethod || '');
      setStatus(order.status || 'PLANNED');
      setNotes(order.notes || '');
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        orderType,
        brandName: brandName.trim() || null,
        customerCountry: customerCountry.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        deliveryMethod: deliveryMethod.trim() || null,
        notes: notes.trim() || null,
        status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
      };

      if (plannedQuantity !== '') {
        const qty = Number(plannedQuantity);
        if (qty > 0) payload.plannedQuantity = qty;
      }

      if (salePricePerUnit !== '') {
        payload.salePricePerUnit = Number(salePricePerUnit);
      } else {
        payload.salePricePerUnit = null;
      }

      await manufacturingApi.updateOrder(order.id, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update order', err);
      setError(err?.response?.data?.message || err?.message || 'تعذر تعديل أمر الإنتاج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              تعديل أمر الإنتاج: <span className="font-mono text-primary">{order.orderNumber}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تعديل بيانات وكمية وحالة أمر تشغيل المصنع
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">نمط الإنتاج</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as ProductionOrderType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="FULL_PACKAGE">حزمة كاملة (Full Package)</option>
                <option value="CMT">تشغيل خارجي (CMT)</option>
                <option value="INTERNAL">إنتاج داخلي (Internal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">حالة الأمر</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductionOrderStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="PLANNED">مخطط (Planned)</option>
                <option value="RELEASED">معتمد (Released)</option>
                <option value="IN_PROGRESS">قيد التشغيل (In Progress)</option>
                <option value="COMPLETED">مكتمل (Completed)</option>
                <option value="CANCELLED">ملغي (Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">البراند / العميل</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="اسم البراند أو العميل..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">الدولة / السوق</label>
              <input
                type="text"
                value={customerCountry}
                onChange={(e) => setCustomerCountry(e.target.value)}
                placeholder="مصر، السعودية..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">إجمالي الكمية المخططة</label>
              <input
                type="number"
                min="1"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(e.target.value)}
                placeholder="مثال: 100"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">سعر بيع القطعة (ج.م)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePricePerUnit}
                onChange={(e) => setSalePricePerUnit(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">تاريخ بدء التشغيل</label>
              <DateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">تاريخ الاستحقاق / التسليم</label>
              <DateInput
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">طريقة التسليم</label>
              <input
                type="text"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                placeholder="استلام من المصنع، شحن، ..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">عنوان التسليم</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="العنوان أو المستودع المستلم..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">ملاحظات وتعليمات التشغيل</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات خاصة بالتنفيذ أو الجودة..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrderModal;
