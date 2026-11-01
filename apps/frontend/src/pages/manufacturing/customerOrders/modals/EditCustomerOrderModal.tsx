import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { manufacturingApi, CustomerOrder, CustomerOrderStatus } from '../../manufacturingApi';

interface EditCustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomerOrder | null;
  onUpdated: () => void;
}

export const EditCustomerOrderModal: React.FC<EditCustomerOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [status, setStatus] = useState<CustomerOrderStatus>('DRAFT');
  const [currency, setCurrency] = useState('EGP');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (order && isOpen) {
      setBrandName(order.brandName || '');
      setCustomerCountry(order.customerCountry || '');
      setDeliveryAddress(order.deliveryAddress || '');
      setDeliveryMethod(order.deliveryMethod || '');
      setExpectedDelivery(order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().slice(0, 10) : '');
      setStatus(order.status || 'DRAFT');
      setCurrency(order.currency || 'EGP');
      setNotes(order.notes || '');
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError('اسم البراند أو العقد إلزامي');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        brandName: brandName.trim(),
        customerCountry: customerCountry.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        deliveryMethod: deliveryMethod.trim() || null,
        notes: notes.trim() || null,
        status,
        currency: currency.trim() || 'EGP',
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
      };

      await manufacturingApi.updateCustomerOrder(order.id, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update customer order', err);
      setError(err?.response?.data?.message || err?.message || 'تعذر تعديل عقد العميل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              تعديل عقد العميل: <span className="font-mono text-primary">{order.orderNumber}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              تعديل تفاصيل العقد والبراند ومواعيد التسليم
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
              <label className="block text-xs font-medium text-foreground mb-1.5">البراند / اسم العقد *</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="اسم البراند أو العقد..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">حالة العقد</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerOrderStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DRAFT">مسودة عقد (Draft)</option>
                <option value="CONFIRMED">مؤكد (Confirmed)</option>
                <option value="IN_PRODUCTION">قيد الإنتاج (In Production)</option>
                <option value="READY">جاهز للتسليم (Ready)</option>
                <option value="DELIVERED">تم التسليم بالكامل (Delivered)</option>
                <option value="CANCELLED">ملغي (Cancelled)</option>
              </select>
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
              <label className="block text-xs font-medium text-foreground mb-1.5">العملة</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="EGP, USD, SAR..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">تاريخ التسليم المتوقع</label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
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
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">عنوان أو مستودع التسليم</label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="العنوان أو المستودع المستلم..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">ملاحظات العقد</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي شروط أو بنود خاصة بالعقد..."
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

export default EditCustomerOrderModal;
