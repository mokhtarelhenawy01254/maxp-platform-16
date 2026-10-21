import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import courierService, {
  type CourierCommissionSummaryRow,
  type CourierCommissionEntry,
} from '../../../../services/courierService';
import { useCurrency } from '../../../../hooks/useCurrency';

export type CourierDuesStatusFilter = 'ALL' | 'DUE' | 'PAID';

export interface TreasuryAccountOption {
  id: string;
  name: string;
  balance: number;
}

export const useCourierDuesData = () => {
  const { formatPrice } = useCurrency();

  const [summary, setSummary] = useState<CourierCommissionSummaryRow[]>([]);
  const [entries, setEntries] = useState<CourierCommissionEntry[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CourierDuesStatusFilter>('DUE');
  const [page, setPage] = useState(1);
  const [payingCourierId, setPayingCourierId] = useState<string | null>(null);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccountOption[]>([]);
  const [payAccountId, setPayAccountId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courierService.getCommissions({ status: statusFilter, page, limit: 20 });
      if (res?.success) {
        setSummary(res.summary || []);
        setEntries(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || 'تعذر تحميل مستحقات المناديب');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const openPay = async (courierId: string) => {
    setPayingCourierId(courierId);
    try {
      const res = await courierService.getTreasuryAccounts();
      const accounts = (res?.data || []) as TreasuryAccountOption[];
      setTreasuryAccounts(accounts);
      setPayAccountId(accounts[0]?.id || '');
    } catch {
      setTreasuryAccounts([]);
    }
  };

  const closePay = () => {
    setPayingCourierId(null);
  };

  const confirmPay = async () => {
    if (!payingCourierId) return;
    try {
      const res = await courierService.payCommissions(payingCourierId, {
        treasuryAccountId: payAccountId || undefined,
      });
      if (res?.success) {
        toast.success(res.message || 'تم صرف المستحقات بنجاح');
        setPayingCourierId(null);
        await load();
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || 'تعذر صرف المستحقات');
    }
  };

  const totalDue = useMemo(
    () => summary.reduce((s, r) => s + (r.dueAmount || 0), 0),
    [summary]
  );

  const payingRow = useMemo(
    () => summary.find((r) => r.courierId === payingCourierId),
    [summary, payingCourierId]
  );

  return {
    formatPrice,
    summary,
    entries,
    pagination,
    loading,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    payingCourierId,
    treasuryAccounts,
    payAccountId,
    setPayAccountId,
    load,
    openPay,
    closePay,
    confirmPay,
    totalDue,
    payingRow,
  };
};
