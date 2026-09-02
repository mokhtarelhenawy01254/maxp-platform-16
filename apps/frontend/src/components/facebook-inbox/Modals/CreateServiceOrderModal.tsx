import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../../services/apiClient';

interface CreateServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  onOrderCreated?: (order: any) => void;
}

export default function CreateServiceOrderModal({
  isOpen,
  onClose,
  customerName = '',
  customerPhone = '',
  onOrderCreated
}: CreateServiceOrderModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(customerName);
      setPhone(customerPhone);
      setDescription('');
      fetchServices();
    }
  }, [isOpen, customerName, customerPhone]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res: any = await apiClient.get('/services');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setServices(res.data.data);
        if (res.data.data.length > 0 && !selectedServiceId) {
          setSelectedServiceId(res.data.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load services:', err);
      toast.error('تعذر جلب قائمة الخدمات');
    } finally {
      setLoadingServices(false);
    }
  };

  if (!isOpen) return null;

  const selectedService = services.find(s => s.id === selectedServiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) {
      return toast.error('يرجى اختيار الخدمة المطلوبة');
    }
    if (!name.trim() || !phone.trim()) {
      return toast.error('الاسم ورقم الهاتف مطلوبان');
    }

    setSubmitting(true);
    try {
      const res: any = await apiClient.post('/service-orders', {
        serviceId: selectedServiceId,
        customerName: name.trim(),
        phone: phone.trim(),
        description: description.trim()
      });

      if (res.data?.success) {
        toast.success('تم إنشاء طلب الخدمة بنجاح وإرسال إشعار تأكيد للعميل على الواتساب');
        if (onOrderCreated) {
          onOrderCreated(res.data.data);
        }
        onClose();
      } else {
        toast.error(res.data?.error || 'فشل إنشاء الطلب');
      }
    } catch (err: any) {
      console.error('Error creating service order:', err);
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء إنشاء طلب الخدمة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6 backdrop-blur-sm rtl"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              إنشاء طلب خدمة للعميل
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Service Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              الخدمة المطلوبة *
            </label>
            {loadingServices ? (
              <div className="py-3 text-center text-xs text-gray-400">جاري تحميل الخدمات...</div>
            ) : services.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs">
                لا توجد خدمات نشطة معرفة بالمتجر حالياً. يمكنك إضافتها من قسم الخدمات (/admin/services).
              </div>
            ) : (
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:text-white min-h-[44px]"
                required
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.icon || '📋'} {s.name} {s.price ? `(${s.price} ج.م)` : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedService?.price && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                سعر الخدمة الافتراضي: {selectedService.price} ج.م
              </p>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              اسم العميل *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-white min-h-[40px]"
              placeholder="اسم العميل"
              required
            />
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              رقم الهاتف (الواتساب) *
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-white min-h-[40px] text-left"
              placeholder="01xxxxxxxxx"
              dir="ltr"
              required
            />
          </div>

          {/* Description & Requirements */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              تفاصيل ومتطلبات الطلب
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:text-white"
              placeholder="اكتب ما تم الاتفاق عليه في المحادثة مع العميل..."
            />
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <span>💬</span>
            <span>سيتم إرسال رسالة تأكيد رسمية بالطلب تلقائياً على رقم واتساب العميل فور الحفظ</span>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting || loadingServices || services.length === 0}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {submitting ? 'جاري إنشاء الطلب...' : 'تأكيد وحفظ الطلب'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
