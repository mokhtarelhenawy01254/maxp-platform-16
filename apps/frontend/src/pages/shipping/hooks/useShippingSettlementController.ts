import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCurrency } from '../../../hooks/useCurrency';
import { useDateFormat } from '../../../hooks/useDateFormat';
import shippingSettlementService, {
  type SettlementCompanySummary,
  type SettlementOrder,
} from '../../../services/shippingSettlementService';

export const useShippingSettlementController = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [summary, setSummary] = useState<SettlementCompanySummary[]>([]);
  const [orders, setOrders] = useState<SettlementOrder[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await shippingSettlementService.getSummary();
      setSummary(Array.isArray(res?.data) ? res.data : []);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err?.message || 'تعذر تحميل ملخص التسويات');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const params: Record<string, unknown> = { page };
      if (selectedCompanyId) params.shippingCompanyId = selectedCompanyId;
      if (statusFilter) params.settlementStatus = statusFilter;
      if (search) params.search = search;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      const res = await shippingSettlementService.getOrders(params);
      setOrders(Array.isArray(res?.data) ? res.data : []);
      setTotalPages(res?.pagination?.pages || 1);
      setTotalOrders(res?.pagination?.total || 0);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err?.message || 'تعذر تحميل الشحنات');
    } finally {
      setLoadingOrders(false);
    }
  }, [dateFrom, dateTo, page, search, selectedCompanyId, statusFilter]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [selectedCompanyId, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        loadOrders();
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, dateFrom, dateTo, loadOrders, page]);

  const totalPending = useMemo(
    () => (summary || []).reduce((sum, item) => sum + (item.pendingAmount || 0), 0),
    [summary]
  );
  const totalDelivered = useMemo(
    () => (summary || []).reduce((sum, item) => sum + (item.deliveredShipments || 0), 0),
    [summary]
  );
  const totalSettled = useMemo(
    () => (summary || []).reduce((sum, item) => sum + (item.settledAmount || 0), 0),
    [summary]
  );

  const allSelected = orders.length > 0 && selectedIds.length === orders.length;

  const sourceTypeOf = useMemo(() => {
    const map = new Map<string, string>();
    (orders || []).forEach((o) => map.set(o.id, o.sourceType));
    return map;
  }, [orders]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === orders.length ? [] : (orders || []).map((o) => o.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkSettle = async (shippingCompanyId?: string) => {
    if (shippingCompanyId) {
      try {
        setProcessing(true);
        const res = await shippingSettlementService.settle({ shippingCompanyId });
        toast.success(`تمت تسوية ${res.data?.updated || 0} شحنة`);
        setSelectedIds([]);
        await Promise.all([loadSummary(), loadOrders()]);
      } catch (error: unknown) {
        const err = error as Error;
        toast.error(err?.message || 'تعذر تنفيذ التسوية');
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('حدد شحنات للتسوية أولاً');
      return;
    }
    const shipmentIds = selectedIds.filter((id) => sourceTypeOf.get(id) !== 'TURBO');
    const turboOrderIds = selectedIds.filter((id) => sourceTypeOf.get(id) === 'TURBO');
    try {
      setProcessing(true);
      const res = await shippingSettlementService.settle({ shipmentIds, turboOrderIds });
      toast.success(`تمت تسوية ${res.data?.updated || 0} شحنة`);
      setSelectedIds([]);
      await Promise.all([loadSummary(), loadOrders()]);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err?.message || 'تعذر تنفيذ التسوية');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsettle = async (id: string) => {
    try {
      setProcessing(true);
      const isTurbo = sourceTypeOf.get(id) === 'TURBO';
      const res = isTurbo
        ? await shippingSettlementService.unsettle([], [id])
        : await shippingSettlementService.unsettle([id]);
      toast.success(`تم التراجع عن تسوية ${res.data?.updated || 0} شحنة`);
      await Promise.all([loadSummary(), loadOrders()]);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err?.message || 'تعذر التراجع عن التسوية');
    } finally {
      setProcessing(false);
    }
  };

  const getCompanyName = useCallback((item: SettlementCompanySummary) =>
    item.company.id === 'TURBO' ? t('shippingSettlement.turbo', 'Turbo Express') : item.company.name,
    [t]
  );

  return {
    t,
    formatPrice,
    formatDate,
    summary,
    orders,
    loadingSummary,
    loadingOrders,
    selectedCompanyId,
    setSelectedCompanyId,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    totalPages,
    totalOrders,
    selectedIds,
    setSelectedIds,
    processing,
    totalPending,
    totalDelivered,
    totalSettled,
    allSelected,
    toggleSelect,
    toggleSelectAll,
    handleBulkSettle,
    handleUnsettle,
    getCompanyName,
  };
};
