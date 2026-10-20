import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import courierService, { DeliveryRun, DeliveryRunItem, Courier } from '../../../../services/courierService';
import api from '../../../../services/api';

export function useDeliveryRunsData() {
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);
  const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Waybill and Share Link States
  const [viewingWaybill, setViewingWaybill] = useState<{ run: DeliveryRun; shipment?: DeliveryRunItem } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCouriers, setActiveCouriers] = useState<Courier[]>([]);

  // Reassignment state (manifest modal → move a parcel to another courier)
  const [reassigningShipment, setReassigningShipment] = useState<DeliveryRunItem | null>(null);
  const [reassignCourierId, setReassignCourierId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [orderNumbersInput, setOrderNumbersInput] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Ready-to-ship quick select orders
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [loadingReadyOrders, setLoadingReadyOrders] = useState(false);
  const [selectedReadyOrderNumbers, setSelectedReadyOrderNumbers] = useState<string[]>([]);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courierService.getDeliveryRuns({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: 20
      });
      if (res.success) {
        setRuns(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل مأموريات التوصيل');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const loadCouriersForDispatch = async () => {
    try {
      const res = await courierService.getCouriers({ isActive: true });
      if (res.success && res.data) {
        setActiveCouriers(res.data);
        if (res.data.length > 0 && !selectedCourierId) {
          const available = res.data.find((c) => c.status === 'AVAILABLE');
          setSelectedCourierId(available ? available.id : res.data[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل قائمة المناديب');
    }
  };

  const handleOpenDetail = async (runId: string) => {
    setLoadingDetail(true);
    try {
      const res = await courierService.getDeliveryRun(runId);
      if (res.success) {
        setSelectedRun(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل تفاصيل المأمورية');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openReassign = async (shipment: DeliveryRunItem) => {
    setReassigningShipment(shipment);
    setReassignCourierId('');
    if (activeCouriers.length === 0) {
      await loadCouriersForDispatch();
    }
  };

  const confirmReassign = async () => {
    if (!reassigningShipment || !reassignCourierId) return;
    setReassigning(true);
    try {
      const res = await courierService.reassignShipments([reassigningShipment.id], reassignCourierId);
      if (res.success) {
        toast.success(res.message || 'تم إعادة الإسناد');
        setReassigningShipment(null);
        if (selectedRun) await handleOpenDetail(selectedRun.id);
        fetchRuns();
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إعادة الإسناد');
    } finally {
      setReassigning(false);
    }
  };

  const handleCopyMobileLink = async (run: DeliveryRun) => {
    try {
      let token = run.mobileToken;
      if (!token) {
        const linkRes = await courierService.getRunShareLink(run.id);
        token = linkRes?.data?.mobileToken;
      }
      const origin = window.location.origin;
      const url = `${origin}/courier/run/${run.id}${token ? `?token=${token}` : ''}`;
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط مأمورية المندوب الذكي بنجاح');
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleShareWhatsApp = async (run: DeliveryRun) => {
    try {
      let token = run.mobileToken;
      if (!token) {
        const linkRes = await courierService.getRunShareLink(run.id);
        token = linkRes?.data?.mobileToken;
      }
      const origin = window.location.origin;
      const url = `${origin}/courier/run/${run.id}${token ? `?token=${token}` : ''}`;
      let phone = run.courier?.phone ? run.courier.phone.replace(/[^0-9]/g, '') : '';
      if (phone.startsWith('00')) phone = phone.substring(2);
      if (phone.startsWith('01') && phone.length === 11) phone = `2${phone}`;
      const text = encodeURIComponent(
        `مرحباً يا كابتن ${run.courier?.name || ''}، تفضل رابط مأمورية التوصيل الخاصة بك:\n${url}`
      );
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } catch {
      toast.error('تعذر فتح واتساب');
    }
  };

  const loadReadyOrders = async () => {
    setLoadingReadyOrders(true);
    try {
      const res = await api.get('/orders', {
        params: { status: 'READY_TO_SHIP', limit: 25 }
      });
      const list = Array.isArray(res?.data?.orders)
        ? res.data.orders
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setReadyOrders(list);
    } catch {
      // ignore silently
    } finally {
      setLoadingReadyOrders(false);
    }
  };

  const handleOpenCreateRun = () => {
    loadCouriersForDispatch();
    loadReadyOrders();
    setOrderNumbersInput('');
    setSelectedReadyOrderNumbers([]);
    setDispatchNotes('');
    setIsCreateModalOpen(true);
  };

  const toggleReadyOrder = (orderNum: string) => {
    setSelectedReadyOrderNumbers((prev) => {
      const next = prev.includes(orderNum)
        ? prev.filter((n) => n !== orderNum)
        : [...prev, orderNum];
      return next;
    });
  };

  const handleConfirmCreateRun = async () => {
    if (!selectedCourierId) {
      toast.error('يرجى اختيار مندوب التوصيل');
      return;
    }

    const typedNumbers = orderNumbersInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const allOrderRefs = Array.from(new Set([...selectedReadyOrderNumbers, ...typedNumbers]));

    if (allOrderRefs.length === 0) {
      toast.error('يرجى اختيار أو إدخال أرقام الطلبات المراد إسنادها');
      return;
    }

    setSubmittingDispatch(true);
    try {
      const res = await courierService.createDeliveryRun({
        courierId: selectedCourierId,
        orderIds: allOrderRefs,
        notes: dispatchNotes || undefined
      });

      if (res.success && res.data) {
        toast.success(`تم إنشاء مأمورية التوزيع رقم ${res.data.runNumber} بنجاح`);
        setIsCreateModalOpen(false);
        fetchRuns();
        handleOpenDetail(res.data.id);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إنشاء مأمورية التوصيل');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return {
    runs,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pagination,
    fetchRuns,
    selectedRun,
    setSelectedRun,
    loadingDetail,
    handleOpenDetail,
    viewingWaybill,
    setViewingWaybill,
    isCreateModalOpen,
    setIsCreateModalOpen,
    activeCouriers,
    selectedCourierId,
    setSelectedCourierId,
    orderNumbersInput,
    setOrderNumbersInput,
    dispatchNotes,
    setDispatchNotes,
    submittingDispatch,
    readyOrders,
    loadingReadyOrders,
    selectedReadyOrderNumbers,
    reassigningShipment,
    setReassigningShipment,
    reassignCourierId,
    setReassignCourierId,
    reassigning,
    openReassign,
    confirmReassign,
    handleCopyMobileLink,
    handleShareWhatsApp,
    handleOpenCreateRun,
    toggleReadyOrder,
    handleConfirmCreateRun,
    handlePrint
  };
}
