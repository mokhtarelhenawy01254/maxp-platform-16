import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import courierService, { DeliveryRun, DeliveryRunItem } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';

const CourierMobileRunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;
  const { formatPrice } = useCurrency();

  const [run, setRun] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'returned'>('pending');

  // Action Modal State
  const [selectedShipment, setSelectedShipment] = useState<DeliveryRunItem | null>(null);
  const [actionType, setActionType] = useState<'DELIVERED' | 'DELAYED' | 'RETURNED' | null>(null);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [viewingWaybillShipment, setViewingWaybillShipment] = useState<DeliveryRunItem | null>(null);

  const fetchRun = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await courierService.getDeliveryRun(id, token);
      if (res.success && res.data) {
        setRun(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل مأمورية التوصيل');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const formatWhatsAppUrl = (phoneNumber: string, text?: string) => {
    let clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.startsWith('00')) clean = clean.substring(2);
    if (clean.startsWith('01') && clean.length === 11) {
      clean = `2${clean}`;
    }
    const query = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${query}`;
  };

  const handleOpenAction = (shipment: DeliveryRunItem, type: 'DELIVERED' | 'DELAYED' | 'RETURNED') => {
    setSelectedShipment(shipment);
    setActionType(type);
    setCollectedAmount(Number(shipment.order?.total || 0));
    setDeliveryNotes('');
  };

  const handleConfirmAction = async () => {
    if (!run || !selectedShipment || !actionType) return;

    if (actionType !== 'DELIVERED' && !deliveryNotes?.trim()) {
      toast.error('يرجى توضيح سبب التأجيل أو الرفض أولاً');
      return;
    }

    setSubmitting(true);
    try {
      await courierService.updateShipmentStatus(run.id, selectedShipment.id, {
        status: actionType,
        collectedAmount: actionType === 'DELIVERED' ? collectedAmount : 0,
        deliveryNotes: deliveryNotes?.trim() || undefined
      }, token);

      toast.success(
        actionType === 'DELIVERED'
          ? 'تم تسجيل التسليم والتحصيل بنجاح'
          : actionType === 'DELAYED'
          ? 'تم تسجيل التأجيل'
          : 'تم تسجيل المرتجع'
      );

      setSelectedShipment(null);
      setActionType(null);
      fetchRun();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحديث حالة الشحنة');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center text-sm text-slate-500">
        مأمورية التوصيل غير موجودة أو انتهت صلاحيتها.
      </div>
    );
  }

  const allShipments = run.shipments || [];
  const deliveredShipments = allShipments.filter((s) => s.status === 'DELIVERED');
  const returnedShipments = allShipments.filter((s) => ['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status));
  const pendingShipments = allShipments.filter(
    (s) => !['DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)
  );

  const displayedShipments =
    activeTab === 'pending'
      ? pendingShipments
      : activeTab === 'delivered'
      ? deliveredShipments
      : returnedShipments;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">مأمورية توصيل</div>
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">{run.runNumber}</div>
          </div>
          <div className="text-left">
            <div className="text-[11px] text-slate-400 font-medium">كابتن التوصيل</div>
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{run.courier?.name}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>نسبة إنجاز المأمورية</span>
            <span className="tabular-nums font-semibold">
              {deliveredShipments.length} من {allShipments.length} طرد
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${allShipments.length ? (deliveredShipments.length / allShipments.length) * 100 : 0}%` }}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${allShipments.length ? (returnedShipments.length / allShipments.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="grid grid-cols-3 gap-1 mt-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-1.5 rounded-md transition ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}
          >
            المتبقي ({pendingShipments.length})
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`py-1.5 rounded-md transition ${activeTab === 'delivered' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}
          >
            تم ({deliveredShipments.length})
          </button>
          <button
            onClick={() => setActiveTab('returned')}
            className={`py-1.5 rounded-md transition ${activeTab === 'returned' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}
          >
            مرتجع ({returnedShipments.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-3.5 space-y-3 max-w-lg mx-auto">
        {displayedShipments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">لا توجد طلبات في هذا التبويب</div>
        ) : (
          displayedShipments.map((s) => {
            const phone = s.order?.customerPhone || '';
            const address = s.order?.customerAddress || s.destinationAddress || '';
            const total = Number(s.order?.total || 0);

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3"
              >
                {/* Header: Order & COD */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                        {s.order?.orderNumber}
                      </span>
                      <button
                        onClick={() => setViewingWaybillShipment(s)}
                        title="عرض تفاصيل البوليصة"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition"
                      >
                        <DocumentTextIcon className="w-3 h-3" />
                        بوليصة
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                      {s.order?.customerName}
                    </h4>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400">المبلغ المطلوب (COD)</div>
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatPrice(s.collectedAmount !== null && s.collectedAmount !== undefined ? s.collectedAmount : total)}
                    </div>
                  </div>
                </div>

                {/* Address & Items */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <MapPinIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{address || 'العنوان غير مدون بدقة'}</span>
                  </div>
                  {s.order?.items && s.order.items.length > 0 && (
                    <div className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                      <CubeIcon className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{s.order.items.map((it) => `${it.quantity}x ${it.name}`).join('، ')}</span>
                    </div>
                  )}
                </div>

                {/* Direct Action Contacts */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center justify-center gap-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 active:scale-95"
                    >
                      <PhoneIcon className="w-3.5 h-3.5 text-emerald-600" />
                      اتصال
                    </a>
                  ) : (
                    <div />
                  )}
                  {phone ? (
                    <a
                      href={formatWhatsAppUrl(phone, `مرحباً ${s.order?.customerName || ''}، أنا كابتن ${run.courier?.name || ''} ومعي طلبك رقم ${s.order?.orderNumber || ''}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 active:scale-95"
                    >
                      <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                      واتساب
                    </a>
                  ) : (
                    <div />
                  )}
                  {address ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 active:scale-95"
                    >
                      <MapPinIcon className="w-3.5 h-3.5" />
                      الخريطة
                    </a>
                  ) : (
                    <div />
                  )}
                </div>

                {/* Status Update Buttons */}
                {activeTab === 'pending' && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenAction(s, 'DELIVERED')}
                      className="col-span-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs active:scale-95 transition"
                    >
                      تم التسليم
                    </button>
                    <button
                      onClick={() => handleOpenAction(s, 'DELAYED')}
                      className="col-span-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs active:scale-95 transition"
                    >
                      تأجيل
                    </button>
                    <button
                      onClick={() => handleOpenAction(s, 'RETURNED')}
                      className="col-span-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs active:scale-95 transition"
                    >
                      مرتجع
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Action Confirmation Modal */}
      {selectedShipment && actionType && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm sm:text-base">
                {actionType === 'DELIVERED'
                  ? 'تأكيد التسليم واستلام الكاش'
                  : actionType === 'DELAYED'
                  ? 'تسجيل تأجيل الطرد'
                  : 'تسجيل رفض أو مرتجع'}
              </h3>
              <button onClick={() => setSelectedShipment(null)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>الطلب: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedShipment.order?.orderNumber}</span></div>
              <div>العميل: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedShipment.order?.customerName}</span></div>
            </div>

            {actionType === 'DELIVERED' && (
              <div>
                <label className="block text-xs font-medium mb-1">المبلغ المحصل نقداً (ج.م) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={collectedAmount}
                  onChange={(e) => setCollectedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold tabular-nums focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  عدّل المبلغ في حالة وجود خصم خاص أو تسليم جزئي لبعض القطع.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">
                {actionType === 'DELIVERED' ? 'ملاحظات التسليم (اختياري)' : 'سبب التأجيل أو الرفض *'}
              </label>
              <textarea
                rows={2}
                required={actionType !== 'DELIVERED'}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder={actionType === 'DELIVERED' ? 'أي ملاحظة إضافية...' : 'اذكر السبب بدقة (مثال: العميل طلب التأجيل للغد، المقاس غير مناسب)'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                className="py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                رجوع
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmAction}
                className={`py-2.5 text-white font-bold rounded-xl text-xs active:scale-95 transition disabled:opacity-50 ${
                  actionType === 'DELIVERED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'DELAYED'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Parcel Waybill Modal */}
      {viewingWaybillShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">بوليصة شحن الكابتن</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {viewingWaybillShipment.order?.orderNumber}
                </h3>
              </div>
              <button onClick={() => setViewingWaybillShipment(null)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-slate-400 text-[11px]">المستلم</div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {viewingWaybillShipment.order?.customerName}
                </div>
                <div className="font-mono text-xs text-slate-500" dir="ltr">
                  {viewingWaybillShipment.order?.customerPhone}
                </div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">
                  {viewingWaybillShipment.order?.customerAddress || viewingWaybillShipment.destinationAddress || 'العنوان غير مدون'}
                </div>
              </div>

              {viewingWaybillShipment.order?.items && viewingWaybillShipment.order.items.length > 0 && (
                <div>
                  <div className="font-medium text-slate-400 text-[11px] mb-1">القطع المطلوب تسليمها:</div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                    {viewingWaybillShipment.order.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs">
                        <span>{it.quantity}x {it.name}</span>
                        <span className="font-mono font-medium">{formatPrice(it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex justify-between items-center">
                <div>
                  <div className="text-[10px] opacity-80">المبلغ المطلوب تحصيله (COD)</div>
                  <div className="text-xl font-bold tabular-nums">
                    {formatPrice(viewingWaybillShipment.order?.total || 0)}
                  </div>
                </div>
                <span className="text-[11px] font-bold border border-current px-2 py-0.5 rounded">
                  كاش عند الاستلام
                </span>
              </div>
            </div>

            <button
              onClick={() => setViewingWaybillShipment(null)}
              className="w-full py-2.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierMobileRunPage;
