import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import courierService, {
  type DeliveryRun,
} from '../../../../services/courierService';
import { useCurrency } from '../../../../hooks/useCurrency';
import { useDateFormat } from '../../../../hooks/useDateFormat';

export type CourierRunStatusFilter = 'UNSETTLED' | 'SETTLED' | 'ALL';

export interface TreasuryAccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export const useCourierSettlementController = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [fleetSettings, setFleetSettings] = useState<any>(null);
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runStatusFilter, setRunStatusFilter] = useState<CourierRunStatusFilter>('UNSETTLED');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);

  const loadEligibleRuns = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, accountsRes, settings] = await Promise.all([
        courierService.getDeliveryRuns({ status: runStatusFilter, page, limit: 20 }),
        courierService.getTreasuryAccounts(),
        courierService.getFleetSettings(),
      ]);

      if (settings) {
        setFleetSettings(settings);
      }

      if (runsRes?.success) {
        const list = runsRes.data || [];
        setRuns(list);
        setPagination(runsRes.pagination || null);
        if (list.length > 0 && !selectedRunId) {
          const firstUnsettled = list.find((r) => r.status !== 'SETTLED');
          setSelectedRunId(firstUnsettled ? firstUnsettled.id : list[0].id);
        }
      }

      if (accountsRes?.success && accountsRes.data) {
        setTreasuryAccounts(accountsRes.data);
        if (accountsRes.data.length > 0) {
          const defaultAccId = settings?.remittance?.defaultTreasuryAccountId;
          const matched = defaultAccId
            ? accountsRes.data.find((a: any) => a.id === defaultAccId)
            : null;
          setSelectedAccountId(matched ? matched.id : accountsRes.data[0].id);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || 'تعذر تحميل بيانات التسوية');
    } finally {
      setLoading(false);
    }
  }, [page, runStatusFilter, selectedRunId]);

  useEffect(() => {
    setPage(1);
  }, [runStatusFilter]);

  useEffect(() => {
    loadEligibleRuns();
  }, [loadEligibleRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    const loadRunDetails = async () => {
      setLoadingRun(true);
      try {
        const res = await courierService.getDeliveryRun(selectedRunId);
        if (res?.success && res.data) {
          setSelectedRun(res.data);
          const delivered = res.data.shipments?.filter((s) => s.status === 'DELIVERED') || [];
          const expectedCash = delivered.reduce(
            (sum, s) =>
              sum +
              (s.collectedAmount !== null && s.collectedAmount !== undefined
                ? Number(s.collectedAmount)
                : Number(s.order?.total || 0)),
            0
          );
          setActualCash(res.data.status === 'SETTLED' ? Number(res.data.totalCODCollected) : expectedCash);
        }
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error?.message || 'تعذر تحميل تفاصيل المأمورية');
      } finally {
        setLoadingRun(false);
      }
    };

    loadRunDetails();
  }, [selectedRunId]);

  const deliveredShipments = useMemo(
    () => selectedRun?.shipments?.filter((s) => s.status === 'DELIVERED') || [],
    [selectedRun]
  );
  const returnedShipments = useMemo(
    () =>
      selectedRun?.shipments?.filter((s) =>
        ['RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)
      ) || [],
    [selectedRun]
  );
  const pendingShipments = useMemo(
    () =>
      selectedRun?.shipments?.filter(
        (s) => !['DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].includes(s.status)
      ) || [],
    [selectedRun]
  );

  const expectedDeliveredTotal = useMemo(
    () =>
      deliveredShipments.reduce(
        (sum, s) =>
          sum +
          (s.collectedAmount !== null && s.collectedAmount !== undefined
            ? Number(s.collectedAmount)
            : Number(s.order?.total || 0)),
        0
      ),
    [deliveredShipments]
  );

  const cashDiscrepancy = actualCash - expectedDeliveredTotal;

  const handleSettle = async () => {
    if (!selectedRun) return;
    if (actualCash < 0) {
      toast.error('المبلغ المورد لا يمكن أن يكون سالباً');
      return;
    }

    if (pendingShipments.length > 0) {
      const confirmProceed = window.confirm(
        `يوجد ${pendingShipments.length} طرد ما زال قيد التوصيل في الميدان. هل تريد تسوية وتوريد الطرود المسلمة فقط وإغلاق الوردية؟`
      );
      if (!confirmProceed) return;
    }

    const requireNote = fleetSettings?.remittance?.requireTreasuryNoteOnVariance ?? true;
    if (cashDiscrepancy !== 0 && requireNote && !notes?.trim()) {
      toast.error('يجب كتابة ملاحظة توضح سبب الفارق المالي وفق إعدادات الأسطول');
      return;
    }

    const shortagePolicy = fleetSettings?.remittance?.shortagePolicy || 'DEDUCT_FROM_COURIER';
    if (cashDiscrepancy < 0 && shortagePolicy === 'HOLD_SETTLEMENT') {
      toast.error('سياسة الأسطول تحظر إغلاق الوردية عند وجود عجز مالي حتى توريد المبلغ كاملاً');
      return;
    }

    const allowPartial = fleetSettings?.remittance?.allowPartialRemittance ?? true;
    if (cashDiscrepancy < 0 && !allowPartial) {
      toast.error('التوريد الجزئي غير مسموح به وفق إعدادات الأسطول. يرجى توريد المبلغ كاملاً');
      return;
    }

    setSubmitting(true);
    try {
      const res = await courierService.settleDeliveryRun(selectedRun.id, {
        treasuryAccountId: selectedAccountId || undefined,
        actualCashReceived: actualCash,
        notes: notes || undefined,
      });

      if (res?.success) {
        toast.success(res.message || 'تمت تسوية الوردية وتوريد النقدية إلى الخزينة بنجاح');
        await loadEligibleRuns();
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || 'فشلت عملية التسوية والتوريد');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    runs,
    selectedRunId,
    setSelectedRunId,
    selectedRun,
    treasuryAccounts,
    selectedAccountId,
    setSelectedAccountId,
    actualCash,
    setActualCash,
    notes,
    setNotes,
    loading,
    loadingRun,
    submitting,
    runStatusFilter,
    setRunStatusFilter,
    page,
    setPage,
    pagination,
    deliveredShipments,
    returnedShipments,
    pendingShipments,
    expectedDeliveredTotal,
    cashDiscrepancy,
    loadEligibleRuns,
    handleSettle,
    formatPrice,
    formatDate,
  };
};
