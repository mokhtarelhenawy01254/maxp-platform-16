import React from 'react';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import { DeliveryRunItem, DeliveryRun, Courier } from '../../../../services/courierService';

interface DeliveryRunReassignModalProps {
  reassigningShipment: DeliveryRunItem;
  selectedRun: DeliveryRun | null;
  activeCouriers: Courier[];
  reassignCourierId: string;
  setReassignCourierId: (v: string) => void;
  reassigning: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeliveryRunReassignModal: React.FC<DeliveryRunReassignModalProps> = ({
  reassigningShipment,
  selectedRun,
  activeCouriers,
  reassignCourierId,
  setReassignCourierId,
  reassigning,
  onClose,
  onConfirm
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <ArrowRightCircleIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-sm">إعادة إسناد الطرد لمندوب آخر</h3>
        </div>
        <div className="text-xs text-slate-500 space-y-1">
          <div>
            الطلب: <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{reassigningShipment.order?.orderNumber}</span>
          </div>
          <div>
            العميل: <span className="font-semibold text-slate-800 dark:text-slate-200">{reassigningShipment.order?.customerName}</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400">
            سيتم نقل الطرد من المانيفست الحالي إلى عهدة المندوب الجديد، مع بقاء كود الاستلام صالحاً.
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">المندوب الجديد *</label>
          <select
            value={reassignCourierId}
            onChange={(e) => setReassignCourierId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
          >
            <option value="">اختر المندوب…</option>
            {activeCouriers
              .filter((c) => c.id !== selectedRun?.courierId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.status === 'AVAILABLE' ? 'متاح' : 'في مأمورية'}
                </option>
              ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            className="py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold active:scale-[0.98] transition"
          >
            رجوع
          </button>
          <button
            onClick={onConfirm}
            disabled={!reassignCourierId || reassigning}
            className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold active:scale-[0.98] transition disabled:opacity-50"
          >
            {reassigning ? 'جارٍ النقل…' : 'تأكيد النقل'}
          </button>
        </div>
      </div>
    </div>
  );
};
