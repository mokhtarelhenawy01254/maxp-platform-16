import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, CreditCard, Users, Loader2, Wrench, MessageSquare } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { MediaUploadZone, ServiceMediaFile } from '../../services/MediaUploadZone';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 sm:p-6 backdrop-blur-xs overscroll-contain animate-in fade-in duration-150"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border/80 overflow-hidden max-h-[92vh] flex flex-col my-auto text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4 sm:px-6 shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                إنشاء طلب خدمة للعميل من الشات
              </h2>
              <p className="text-xs text-muted-foreground">ربط متطلبات الخدمة والملفات بمحادثة الواتساب</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Service Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              الخدمة المطلوبة <span className="text-rose-500">*</span>
            </label>
            {loadingServices ? (
              <div className="py-3 text-center text-xs text-muted-foreground font-mono">جاري تحميل الخدمات...</div>
            ) : services.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs">
                لا توجد خدمات نشطة معرفة بالمتجر حالياً. يمكنك إضافتها من قسم الخدمات (/admin/services).
              </div>
            ) : (
              <select
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-card px-3 py-2.5 text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden text-foreground min-h-[44px]"
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.price ? `(${s.price} ج.م)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                اسم العميل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden text-foreground min-h-[40px]"
                placeholder="اسم العميل"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                رقم الهاتف (الواتساب) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden text-foreground min-h-[40px] text-left font-mono tabular-nums"
                placeholder="01xxxxxxxxx"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Financials & Payment */}
          <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <CreditCard className="w-4 h-4 text-primary" />
              <span>الماليات والاتفاق مع العميل:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  السعر المتفق عليه (ج.م):
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="السعر الإجمالي"
                  className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs text-foreground font-mono tabular-nums focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  المدفوع / العربون (ج.م):
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="مثال: 500"
                  className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs text-foreground font-mono tabular-nums focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  طريقة التحصيل:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
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
            <label className="block text-xs font-semibold text-foreground mb-1">
              تفاصيل ومتطلبات الخدمة
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden text-foreground"
              placeholder="اكتب ما تم الاتفاق عليه في شات الواتساب مع العميل..."
            />
          </div>

          {/* Media Upload with Audio/Video Preview */}
          <div className="pt-2 border-t border-border/60">
            <MediaUploadZone
              files={mediaFiles}
              onChange={setMediaFiles}
              label="المرفقات من الشات (موسيقى، فيديو، صور، ملفات)"
              helperText="يمكنك إرفاق المراجع الصوتية أو الفيديوهات أو الصور التي أرسلها العميل في المحادثة."
            />
          </div>

          {/* Team Member Assignment */}
          <div className="pt-2 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>تكليف موظف مسؤول عن الطلب:</span>
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="">-- التكليف التلقائي حسب إعدادات المرحلة --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>سيتم إرسال رسالة تأكيد رسمية بالطلب وحسابه المالي تلقائياً على رقم واتساب العميل فور الحفظ</span>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/60 shrink-0">
            <button
              type="submit"
              disabled={submitting || loadingServices || services.length === 0}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-97 disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
              className="py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border/70 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-97 min-h-[44px] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
