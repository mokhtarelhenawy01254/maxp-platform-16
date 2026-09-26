import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../../services/apiClient';
import { MediaUploadZone, ServiceMediaFile } from '../../services/MediaUploadZone';
import { CreditCard, Users, Loader2 } from 'lucide-react';

interface CreateServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  sessionId?: string;
  onOrderCreated?: (order: any) => void;
}

export default function CreateServiceOrderModal({
  isOpen,
  onClose,
  customerName = '',
  customerPhone = '',
  sessionId = '',
  onOrderCreated
}: CreateServiceOrderModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Financial fields
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('VODAFONE_CASH');

  // Media files
  const [mediaFiles, setMediaFiles] = useState<ServiceMediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(customerName);
      setPhone(customerPhone);
      setDescription('');
      setNotes('');
      setAssignedTo('');
      setTotalAmount('');
      setPaidAmount('');
      setMediaFiles([]);
      fetchServices();
      fetchTeamMembers();
    }
  }, [isOpen, customerName, customerPhone]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res: any = await apiClient.get('/services');
      const payload = res.data?.data ?? res.data;
      const rawList = Array.isArray(payload) ? payload : (payload?.services || payload?.items || payload?.data || []);
      const active = (Array.isArray(rawList) ? rawList : []).filter((s: any) => s.isActive);
      setServices(active);
      if (active.length > 0 && !selectedServiceId) {
        setSelectedServiceId(active[0].id);
        if (active[0].price) {
          setTotalAmount(String(active[0].price));
        }
      }
    } catch (err: any) {
      console.error('Failed to load services:', err);
      toast.error('تعذر جلب قائمة الخدمات');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res: any = await apiClient.get('/service-orders/team-members');
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : (payload?.members || payload?.items || payload?.data || []);
      if (Array.isArray(list)) {
        setTeamMembers(list);
      }
    } catch (e) {}
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service?.price) {
      setTotalAmount(String(service.price));
    }
  };

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === selectedServiceId);

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
      const totalVal = totalAmount ? Number(totalAmount) : (selectedService?.price || 0);
      const paidVal = paidAmount ? Number(paidAmount) : 0;

      const payload = {
        serviceId: selectedServiceId,
        customerName: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
        notes: notes.trim() || undefined,
        assignedTo: assignedTo || undefined,
        referenceFiles: mediaFiles,
        payment: {
          totalAmount: totalVal,
          paidAmount: paidVal,
          paymentMethod
        },
        whatsAppSessionId: sessionId || undefined
      };

      const res: any = await apiClient.post('/service-orders', payload);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm rtl overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-[92vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 p-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              إنشاء طلب خدمة للعميل من الشات
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Service Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              الخدمة المطلوبة <span className="text-rose-500">*</span>
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
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-hidden dark:text-white min-h-[44px]"
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon || '📋'} {s.name} {s.price ? `(${s.price} ج.م)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                اسم العميل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-xs sm:text-sm focus:border-primary-500 focus:outline-hidden dark:text-white min-h-[40px]"
                placeholder="اسم العميل"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رقم الهاتف (الواتساب) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-xs sm:text-sm focus:border-primary-500 focus:outline-hidden dark:text-white min-h-[40px] text-left"
                placeholder="01xxxxxxxxx"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Financials & Payment */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>الماليات والاتفاق مع العميل:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  السعر المتفق عليه (ج.م):
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="السعر الإجمالي"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  المدفوع / العربون (ج.م):
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="مثال: 500"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  طريقة التحصيل:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200"
                >
                  <option value="VODAFONE_CASH">فودافون كاش / محافظ</option>
                  <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                  <option value="CASH">نقداً (كاش)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              تفاصيل ومتطلبات الخدمة
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-xs sm:text-sm focus:border-primary-500 focus:outline-hidden dark:text-white"
              placeholder="اكتب ما تم الاتفاق عليه في شات الواتساب مع العميل..."
            />
          </div>

          {/* Media Upload with Audio/Video Preview */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <MediaUploadZone
              files={mediaFiles}
              onChange={setMediaFiles}
              label="المرفقات من الشات (موسيقى، فيديو، صور، ملفات)"
              helperText="يمكنك إرفاق المراجع الصوتية أو الفيديوهات أو الصور التي أرسلها العميل في المحادثة."
            />
          </div>

          {/* Team Member Assignment */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary-600" />
              <span>تكليف موظف مسؤول عن الطلب:</span>
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-xs sm:text-sm text-gray-800 dark:text-gray-200"
            >
              <option value="">-- التكليف التلقائي حسب إعدادات المرحلة --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <span>💬</span>
            <span>سيتم إرسال رسالة تأكيد رسمية بالطلب وحسابه المالي تلقائياً على رقم واتساب العميل فور الحفظ</span>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <button
              type="submit"
              disabled={submitting || loadingServices || services.length === 0}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء الطلب...</span>
                </>
              ) : (
                <span>تأكيد وحفظ الطلب</span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors min-h-[44px]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
