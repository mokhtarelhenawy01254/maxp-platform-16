import React from 'react';
import { toast } from 'sonner';
import {
  PhoneIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import courierService, { Courier } from '../../../../services/courierService';
import { useCurrency } from '../../../../hooks/useCurrency';

export const VEHICLE_LABELS: Record<string, string> = {
  MOTORCYCLE: 'دراجة نارية / موتوسيكل',
  CAR: 'سيارة ملاكي',
  VAN: 'فان / سيارة نقل بضائع',
  BICYCLE: 'دراجة هوائية',
  ON_FOOT: 'توصيل راجل',
};

interface CourierTableProps {
  couriers: Courier[];
  onOpenEdit: (c: Courier) => void;
  onDelete: (id: string, name: string) => Promise<void>;
}

export const CourierTable: React.FC<CourierTableProps> = ({
  couriers,
  onOpenEdit,
  onDelete,
}) => {
  const { formatPrice } = useCurrency();

  const handleSetPin = async (c: Courier) => {
    const pin = window.prompt(
      `تعيين رمز PIN ميداني للمندوب ${c.name} (من 4 إلى 6 أرقام).\nاتركه فاضي وألغِ لإلغاء الرمز الحالي.`
    );
    if (pin === null) return;
    if (pin.trim() !== '' && !/^\d{4,6}$/.test(pin.trim())) {
      toast.error('رمز PIN يجب أن يكون من 4 إلى 6 أرقام');
      return;
    }
    try {
      const res = await courierService.setCourierPin(c.id, pin.trim() || null);
      if (res.success) toast.success(res.message || 'تم التحديث');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تعيين رمز PIN');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-3 px-4 font-medium">المندوب</th>
              <th className="py-3 px-4 font-medium">وسيلة الانتقال</th>
              <th className="py-3 px-4 font-medium">الحالة</th>
              <th className="py-3 px-4 font-medium">شحنات جارية</th>
              <th className="py-3 px-4 font-medium">كاش معلق بالعهدة</th>
              <th className="py-3 px-4 font-medium">نسبة النجاح</th>
              <th className="py-3 px-4 font-medium text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {couriers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  لا يوجد مناديب مسجلين حالياً تطابق معايير البحث
                </td>
              </tr>
            ) : (
              couriers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                    <div
                      className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"
                      dir="ltr"
                    >
                      <PhoneIcon className="w-3.5 h-3.5" />
                      <span className="font-mono tabular-nums">{c.phone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-xs">{VEHICLE_LABELS[c.vehicleType] || c.vehicleType}</div>
                    {c.plateNumber && (
                      <div className="text-[11px] text-slate-400 tabular-nums font-mono">
                        لوحة: {c.plateNumber}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {c.status === 'ON_DUTY' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        في الميدان
                      </span>
                    ) : c.status === 'AVAILABLE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        متاح بالمقر
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        خارج الدوام
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums font-mono">
                    {c.activeShipmentsCount > 0 ? (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {c.activeShipmentsCount} طرد
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums font-mono font-medium">
                    {c.pendingSettlementCash > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {formatPrice(c.pendingSettlementCash)}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums font-mono">
                    <span
                      className={`font-semibold ${
                        c.successRate >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {c.successRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleSetPin(c)}
                        title="تعيين/إلغاء رمز PIN الميداني"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenEdit(c)}
                        title="تعديل بيانات المندوب"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(c.id, c.name)}
                        title="حذف المندوب"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
