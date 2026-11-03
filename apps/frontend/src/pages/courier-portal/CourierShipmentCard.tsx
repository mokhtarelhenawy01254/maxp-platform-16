import React from 'react';
import {
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface CourierShipmentCardProps {
  shipment: any;
  onOpenSheet: (shipment: any) => void;
  formatWhatsAppUrl: (phone: string, text?: string) => string;
  getMapUrl: (address: string, city?: string) => string;
}

export const CourierShipmentCard: React.FC<CourierShipmentCardProps> = ({
  shipment,
  onOpenSheet,
  formatWhatsAppUrl,
  getMapUrl,
}) => {
  const customerName = shipment.order?.customerName || 'عميل';
  const customerPhone = shipment.order?.customerPhone || '';
  const orderNum = shipment.order?.orderNumber || shipment.trackingNumber || shipment.id;
  const address = shipment.destinationAddress || shipment.order?.customerAddress || 'عنوان غير محدد';
  const city = shipment.destinationCity || shipment.destinationGovernorate || shipment.order?.governorate || '';
  const totalCod = Number(shipment.order?.total ?? shipment.codAmount ?? 0);
  const isDelivered = shipment.status === 'DELIVERED';
  const isReturned = ['RETURNED', 'FAILED', 'CANCELLED'].includes(shipment.status);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-3">
      {/* Top Row: Order # and Status */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
              {orderNum}
            </span>
            {isDelivered && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                <CheckCircleIcon className="w-3 h-3" />
                تم التسليم
              </span>
            )}
            {isReturned && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
                <XCircleIcon className="w-3 h-3" />
                تعذر / مرتجع
              </span>
            )}
            {!isDelivered && !isReturned && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                <ClockIcon className="w-3 h-3" />
                قيد التوصيل
              </span>
            )}
          </div>
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1">
            {customerName}
          </h3>
        </div>

        {/* COD Tag */}
        <div className="text-left">
          <span className="text-[10px] text-slate-400 block">المبلغ المطلوب</span>
          <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 tabular-nums">
            {totalCod.toLocaleString()} ج.م
          </span>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
        <MapPinIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <span className="line-clamp-2">
          {address} {city ? `(${city})` : ''}
        </span>
      </div>

      {/* Items preview if available */}
      {shipment.order?.items && shipment.order.items.length > 0 && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">محتويات الطرد: </span>
          {shipment.order.items.map((it: any) => `${it.name} (×${it.quantity})`).join(', ')}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          {/* Call Button */}
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
              title="اتصال هاتفي بالعميل"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          )}

          {/* WhatsApp Button */}
          {customerPhone && (
            <a
              href={formatWhatsAppUrl(
                customerPhone,
                `مرحباً ${customerName}، معك كابتن التوصيل بخصوص شحنتك رقم ${orderNum}. هل أنت متواجد للاستلام الآن؟`
              )}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
              title="محادثة واتساب"
            >
              <span className="text-xs font-bold font-mono">WA</span>
            </a>
          )}

          {/* Maps Button */}
          <a
            href={getMapUrl(address, city)}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
            title="فتح على خرائط جوجل"
          >
            <MapPinIcon className="w-4 h-4" />
          </a>
        </div>

        {/* Primary Status Action Button */}
        <button
          onClick={() => onOpenSheet(shipment)}
          className="flex-1 max-w-[140px] py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 active:scale-[0.98]"
        >
          <span>تحديث الحالة</span>
        </button>
      </div>
    </div>
  );
};

export default CourierShipmentCard;
