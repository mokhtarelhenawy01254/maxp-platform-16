// @vitest-environment jsdom
/**
 * Shipping Client — Shipment Details & Timeline (SHIP-W2C)
 * Displays full parcel specs, address, COD, and chronological events timeline
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shippingClientApi } from './useShippingClientApi';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'قيد المراجعة', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'تم القبول', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  OUT_FOR_DELIVERY: { label: 'خرج للتوصيل', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DELIVERED: { label: 'تم التسليم', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RETURNED: { label: 'مرتجع', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  CANCELLED: { label: 'ملغي', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function ClientShipmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    shippingClientApi
      .getShipmentById(id)
      .then((res) => {
        setShipment(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'فشل في تحميل تفاصيل الشحنة');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-sm text-gray-500 font-medium">جاري تحميل بيانات الشحنة...</div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="max-w-xl mx-auto space-y-4 pt-8">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded text-rose-700 text-sm">
          {error || 'الشحنة غير موجودة أو غير مصرح بالوصول إليها'}
        </div>
        <button
          onClick={() => navigate('/client-portal/shipping/shipments')}
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          &rarr; العودة لسجل الشحنات
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[shipment.status] || {
    label: shipment.status,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/client-portal/shipping/shipments')}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-gray-600 transition-colors"
            title="رجوع"
          >
            &rarr;
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 font-mono">
                {shipment.trackingNumber}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              تاريخ الإنشاء: {new Date(shipment.createdAt).toLocaleString('ar-EG')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Details (2 Cols) */}
        <div className="md:col-span-2 space-y-5">
          {/* Recipient & Destination Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100">
              بيانات المستلم والتوصيل
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">اسم المستلم:</span>
                <span className="text-gray-900 font-semibold">{shipment.recipientName}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">رقم الهاتف:</span>
                <span className="text-gray-900 font-mono">{shipment.recipientPhone}</span>
              </div>
              {shipment.recipientPhone2 && (
                <div>
                  <span className="text-gray-400 block mb-0.5">هاتف بديل:</span>
                  <span className="text-gray-900 font-mono">{shipment.recipientPhone2}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400 block mb-0.5">المحافظة والمدينة:</span>
                <span className="text-gray-900">
                  {shipment.destinationGovernorate} {shipment.destinationCity ? `— ${shipment.destinationCity}` : ''}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-400 block mb-0.5">العنوان التفصيلي:</span>
              <span className="text-gray-900">{shipment.destinationAddress}</span>
            </div>
          </div>

          {/* Shipment Specs Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100">
              مواصفات الطرد
            </h2>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">الوزن:</span>
                <span className="text-gray-900 font-medium tabular-nums">{shipment.weight} كجم</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">عدد القطع:</span>
                <span className="text-gray-900 font-medium tabular-nums">{shipment.pieces}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">تكلفة الشحن:</span>
                <span className="text-gray-900 font-medium tabular-nums">{shipment.cost} {shipment.currency}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">المحتوى:</span>
                <span className="text-gray-900">{shipment.contentDescription || 'غير محدد'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">فتح المعاينة:</span>
                <span className="text-gray-900">{shipment.allowOpenPackage ? 'مسموح' : 'غير مسموح'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">قابل للكسر:</span>
                <span className="text-gray-900">{shipment.isFragile ? 'نعم' : 'لا'}</span>
              </div>
            </div>
          </div>

          {/* Timeline Events */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100">
              سجل التتبع والمحطات (Timeline)
            </h2>
            {(!shipment.events || shipment.events.length === 0) ? (
              <div className="text-xs text-gray-400 py-4 text-center">لا توجد محطات مسجلة بعد</div>
            ) : (
              <div className="relative border-r-2 border-gray-100 mr-2 space-y-4 py-2">
                {shipment.events.map((ev: any, idx: number) => (
                  <div key={ev.id || idx} className="relative pr-4">
                    <div className="absolute -right-[7px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="text-xs font-semibold text-gray-900">
                      {STATUS_LABELS[ev.toStatus]?.label || ev.toStatus || 'تحديث'}
                    </div>
                    {ev.notes && <div className="text-xs text-gray-600 mt-0.5">{ev.notes}</div>}
                    <div className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                      {new Date(ev.createdAt).toLocaleString('ar-EG')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COD & Summary Side Card (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100">
              التحصيل المالي (COD)
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500">المبلغ المطلوب تحصيله:</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">
                  {shipment.codAmount ? `${shipment.codAmount.toLocaleString('en-US')} ج.م` : 'بدون تحصيل'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500">المبلغ المحصّل فعلياً:</span>
                <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                  {shipment.collectedAmount ? `${shipment.collectedAmount.toLocaleString('en-US')} ج.م` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
