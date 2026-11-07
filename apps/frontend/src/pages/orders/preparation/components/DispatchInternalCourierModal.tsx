import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  TruckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import OrderModal from '../../../../components/common/OrderModal';
import courierService, { Courier } from '../../../../services/courierService';

interface DispatchInternalCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderIds: string[];
  onSuccess: (runId: string, runNumber: string) => void;
}

export const DispatchInternalCourierModal: React.FC<DispatchInternalCourierModalProps> = ({
  isOpen,
  onClose,
  orderIds,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      courierService
        .getCouriers({ isActive: true })
        .then((res) => {
          if (res.success && res.data) {
            setCouriers(res.data);
            if (res.data.length > 0) {
              const available = res.data.find((c) => c.status === 'AVAILABLE');
              setSelectedCourierId(available ? available.id : res.data[0].id);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedCourierId) return;

    setSubmitting(true);
    try {
      const res = await courierService.createDeliveryRun({
        courierId: selectedCourierId,
        orderIds,
        notes: notes || undefined
      });

      if (res.success && res.data) {
        onSuccess(res.data.id, res.data.runNumber);
      }
    } catch (err: any) {
      alert(err?.message || 'تعذر إنشاء مأمورية التوصيل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrderModal
      isOpen={isOpen}
      onClose={onClose}
      title="إسناد لمندوب توصيل داخلي"
      subtitle={`تجهيز وخروج ${orderIds.length} طلب في مأمورية توزيع تابعة للشركة`}
      size="md"
    >
      <div className="space-y-4 py-2 text-xs sm:text-sm">
        {loading ? (
          <div className="py-8 flex justify-center">
            <ArrowPathIcon className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : couriers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/40">
            <ExclamationCircleIcon className="mx-auto h-8 w-8 text-amber-500 mb-2" />
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              لا يوجد مناديب مسجلين في الأسطول الداخلي
            </p>
            <p className="text-amber-700 dark:text-amber-400 mt-1 mb-3">
              أضف مناديب شركتك أولاً لتتمكن من إنشاء مأموريات التوزيع الميداني.
            </p>
            <Link
              to="/shipping/couriers"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition shadow-xs"
            >
              الانتقال لإدارة المناديب
            </Link>
          </div>
        ) : (
          <>
            <div>
              <label className="block font-medium mb-1.5">اختر المندوب المستلم للمأمورية *</label>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {couriers.map((c) => {
                  const isSelected = c.id === selectedCourierId;
                  return (
                    <label
                      key={c.id}
                      onClick={() => setSelectedCourierId(c.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/70 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="courier"
                          checked={isSelected}
                          onChange={() => setSelectedCourierId(c.id)}
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.documentsStatus === 'VERIFIED' ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                                موثق
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200">
                                غير موثق
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1" dir="ltr">
                            <PhoneIcon className="w-3 h-3" />
                            {c.phone}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {c.status === 'AVAILABLE' ? 'متاح بالمقر' : 'في الميدان'}
                        </span>
                        {c.activeShipmentsCount > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">معاه {c.activeShipmentsCount} طرد</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">ملاحظات للمأمورية / خط السير (اختياري)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تسليمات مسائية - خط سير مدينة نصر والتجمع"
                className="w-full px-3 py-2 bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border/70 bg-background text-foreground rounded-lg hover:bg-muted transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!selectedCourierId || submitting}
                onClick={handleConfirm}
                className="px-5 py-2 text-primary-foreground bg-primary font-semibold rounded-lg hover:bg-primary/90 transition active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'جاري إنشاء المانيفست...' : 'تأكيد الإسناد وإصدار المانيفست'}
              </button>
            </div>
          </>
        )}
      </div>
    </OrderModal>
  );
};

export default DispatchInternalCourierModal;
