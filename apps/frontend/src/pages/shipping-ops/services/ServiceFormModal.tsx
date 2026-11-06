import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ShippingServiceItem,
  ServicePricingMode,
  ServiceAppliesTo,
} from './shippingServicesTypes';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ShippingServiceItem | null;
  authHeaders: Record<string, string>;
  onSuccess: () => void;
  isEn?: boolean;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  service,
  authHeaders,
  onSuccess,
  isEn,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingMode, setPricingMode] = useState<ServicePricingMode>('FIXED');
  const [amount, setAmount] = useState<number | string>(0);
  const [appliesTo, setAppliesTo] = useState<ServiceAppliesTo>('SHIPMENT');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (service) {
      setCode(service.code);
      setName(service.name);
      setDescription(service.description || '');
      setPricingMode(service.pricingMode);
      setAmount(service.amount);
      setAppliesTo(service.appliesTo);
      setIsActive(service.isActive);
    } else {
      setCode('');
      setName('');
      setDescription('');
      setPricingMode('FIXED');
      setAmount(0);
      setAppliesTo('SHIPMENT');
      setIsActive(true);
    }
  }, [service, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(isEn ? 'Service name is required' : 'اسم الخدمة مطلوب');
      return;
    }
    if (!service && !code.trim()) {
      toast.error(isEn ? 'Service code is required' : 'كود الخدمة مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        pricingMode,
        amount: Number(amount) || 0,
        appliesTo,
        isActive,
      };

      const url = service
        ? `/api/v1/shipping-portal/services/${service.id}`
        : '/api/v1/shipping-portal/services';
      const method = service ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          service
            ? isEn ? 'Service updated successfully' : 'تم تحديث الخدمة بنجاح'
            : isEn ? 'Service created successfully' : 'تم إنشاء الخدمة بنجاح'
        );
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || (isEn ? 'Operation failed' : 'فشلت العملية'));
      }
    } catch {
      toast.error(isEn ? 'Network error' : 'خطأ في الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {service
              ? isEn ? 'Edit Extra Service' : 'تعديل الخدمة الإضافية'
              : isEn ? 'Add Extra Service' : 'إضافة خدمة إضافية جديدة'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Service Code *' : 'كود الخدمة *'}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={Boolean(service)}
              placeholder="OPEN_PKG, FRAGILE, PACKING..."
              className="w-full text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Service Name *' : 'اسم الخدمة *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? 'e.g. Open Package Inspection' : 'مثال: فحص ومعاينة الشحنة'}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Pricing Mode' : 'نمط التسعير'}
              </label>
              <select
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value as ServicePricingMode)}
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="FIXED">{isEn ? 'Fixed (EGP)' : 'مبلغ ثابت (ج.م)'}</option>
                <option value="PERCENT">{isEn ? 'Percentage (%)' : 'نسبة مئوية (%)'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Amount / Fee' : 'قيمة الرسوم'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs font-semibold tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Applies To' : 'نطاق التطبيق'}
            </label>
            <select
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as ServiceAppliesTo)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="SHIPMENT">{isEn ? 'Per Shipment (طرود)' : 'على مستوى الشحنة'}</option>
              <option value="ORDER">{isEn ? 'Per Order (أوردر)' : 'على مستوى الأوردر'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Description (Optional)' : 'وصف الخدمة (اختياري)'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEn ? 'Conditions and fee application details...' : 'شروط تطبيق الرسوم وملاحظات إضافية...'}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            <label htmlFor="isActiveToggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              {isEn ? 'Active & available for billing' : 'الخدمة مفعلة ومتاحة لاحتساب الرسوم'}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
            >
              {submitting ? (isEn ? 'Saving...' : 'جارٍ الحفظ...') : (isEn ? 'Save Service' : 'حفظ الخدمة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
