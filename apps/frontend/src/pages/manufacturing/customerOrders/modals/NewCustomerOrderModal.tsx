import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Search, Building2, Globe, Calendar, DollarSign } from 'lucide-react';
import { manufacturingApi, CustomerOrder } from '../../manufacturingApi';

interface NewCustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: CustomerOrder) => void;
}

export const NewCustomerOrderModal: React.FC<NewCustomerOrderModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customers search
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Form Fields
  const [brandName, setBrandName] = useState('');
  const [customerCountry, setCustomerCountry] = useState('مصر');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('EGP');

  useEffect(() => {
    if (isOpen) {
      loadCustomers('');
      const defaultDelivery = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      setExpectedDelivery(defaultDelivery);
    }
  }, [isOpen]);

  const loadCustomers = async (query: string) => {
    try {
      const list = await manufacturingApi.getCustomersList(query);
      setCustomers(list);
    } catch {
      setCustomers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() && !selectedCustomerId) {
      setError('يرجى تحديد العميل أو اسم البراند التجاري على الأقل');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const created = await manufacturingApi.createCustomerOrder({
        customerId: selectedCustomerId || null,
        brandName: brandName.trim() || null,
        customerCountry: customerCountry.trim() || null,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
        notes: notes.trim() || null,
        currency,
        status: 'DRAFT',
      });

      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل إنشاء أمر العميل');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-lg flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">إنشاء أمر عميل جديد (عقد تصنيع للغير)</h2>
              <p className="text-[11px] text-muted-foreground">تسجيل التعاقد التجاري والبراند وتاريخ التسليم وجدولة الدفعات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              اختيار العميل من قاعدة البيانات
            </label>
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    loadCustomers(e.target.value);
                  }}
                  placeholder="ابحث باسم العميل أو رقم الهاتف..."
                  className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find((c) => c.id === e.target.value);
                  if (cust && !brandName) {
                    setBrandName(cust.name);
                  }
                }}
                className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- عميل حر أو إدخال يدوي أدناه --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand Name & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                اسم البراند / العلامة التجارية *
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="مثال: Brand X, Zara, إلخ"
                  className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                دولة العميل / التصدير
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={customerCountry}
                  onChange={(e) => setCustomerCountry(e.target.value)}
                  placeholder="مصر، السعودية، ألمانيا..."
                  className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Expected Delivery & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                تاريخ التسليم المستهدف للطلب
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full pl-2.5 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono font-medium"
              >
                <option value="EGP">EGP — جنيه مصري</option>
                <option value="USD">USD — دولار أمريكي</option>
                <option value="EUR">EUR — يورو</option>
                <option value="SAR">SAR — ريال سعودي</option>
                <option value="AED">AED — درهم إماراتي</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              شروط التعاقد وملاحظات التجهيز
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط الجودة، التغليف، مواصفات التسليم، أو أي بنود متفق عليها..."
              className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-muted/50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loading ? 'جاري الإنشاء...' : 'إنشاء أمر العميل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
