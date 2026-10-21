import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useDateFormat } from '../../../hooks/useDateFormat';
import stockMovementsService, {
  type StockMovementRecord,
} from '../../../services/stockMovementsService';

export const useStockMovementsController = () => {
  const { formatDate } = useDateFormat();
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      const res = await stockMovementsService.getMovements(params);
      setMovements(Array.isArray(res?.data) ? res.data : []);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err?.message || 'تعذر تحميل حركات المخزون');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search, typeFilter]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements, typeFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadMovements();
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, dateFrom, dateTo, loadMovements]);

  const inCount = useMemo(
    () => movements.filter((m) => m.type === 'IN').length,
    [movements]
  );
  const outCount = useMemo(
    () => movements.filter((m) => m.type === 'OUT').length,
    [movements]
  );
  const adjustCount = useMemo(
    () => movements.filter((m) => m.type === 'ADJUSTMENT').length,
    [movements]
  );
  const transferCount = useMemo(
    () => movements.filter((m) => m.type === 'TRANSFER' || m.type === 'RETURN').length,
    [movements]
  );

  return {
    movements,
    loading,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    loadMovements,
    inCount,
    outCount,
    adjustCount,
    transferCount,
    formatDate,
  };
};
