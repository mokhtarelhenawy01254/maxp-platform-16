import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import courierService, {
  DeliveryRun,
  DeliveryRunItem,
} from '../../../../services/courierService';

export const useCourierMobileRunData = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;

  const [run, setRun] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'returned'>('pending');

  // Action Modal State
  const [selectedShipment, setSelectedShipment] = useState<DeliveryRunItem | null>(null);
  const [actionType, setActionType] = useState<'DELIVERED' | 'DELAYED' | 'RETURNED' | null>(null);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [fieldPin, setFieldPin] = useState<string>('');
  const [deliveryOtp, setDeliveryOtp] = useState<string>('');
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
    setDeliveryOtp('');
  };

  const handleConfirmAction = async () => {
    if (!run || !selectedShipment || !actionType) return;

    if (actionType !== 'DELIVERED' && !deliveryNotes?.trim()) {
      toast.error('يرجى توضيح سبب التأجيل أو الرفض أولاً');
      return;
    }

    if (run.pinRequired && !/^\d{4,6}$/.test(fieldPin.trim())) {
      toast.error('أدخل رمز PIN الخاص بك (4 إلى 6 أرقام) لتأكيد العملية');
      return;
    }

    if (actionType === 'DELIVERED' && run.otpRequired && !/^\d{4}$/.test(deliveryOtp.trim())) {
      toast.error('أدخل كود الاستلام المكوّن من 4 أرقام الذي استلمه العميل');
      return;
    }

    setSubmitting(true);
    try {
      await courierService.updateShipmentStatus(
        run.id,
        selectedShipment.id,
        {
          status: actionType,
          collectedAmount: actionType === 'DELIVERED' ? collectedAmount : 0,
          deliveryNotes: deliveryNotes?.trim() || undefined,
          pin: run.pinRequired ? fieldPin.trim() : undefined,
          otp: actionType === 'DELIVERED' && run.otpRequired ? deliveryOtp.trim() : undefined,
        },
        token
      );

      toast.success(
        actionType === 'DELIVERED'
          ? 'تم تسجيل التسليم والتحصيل بنجاح'
          : actionType === 'DELAYED'
          ? 'تم تسجيل التأجيل'
          : 'تم تسجيل المرتجع'
      );

      setSelectedShipment(null);
      setActionType(null);
      setDeliveryOtp('');
      fetchRun();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحديث حالة الشحنة');
    } finally {
      setSubmitting(false);
    }
  };

  const allShipments = run?.shipments || [];
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

  return {
    run,
    loading,
    activeTab,
    setActiveTab,
    selectedShipment,
    setSelectedShipment,
    actionType,
    setActionType,
    collectedAmount,
    setCollectedAmount,
    deliveryNotes,
    setDeliveryNotes,
    fieldPin,
    setFieldPin,
    deliveryOtp,
    setDeliveryOtp,
    submitting,
    viewingWaybillShipment,
    setViewingWaybillShipment,
    fetchRun,
    formatWhatsAppUrl,
    handleOpenAction,
    handleConfirmAction,
    allShipments,
    deliveredShipments,
    returnedShipments,
    pendingShipments,
    displayedShipments,
  };
};
