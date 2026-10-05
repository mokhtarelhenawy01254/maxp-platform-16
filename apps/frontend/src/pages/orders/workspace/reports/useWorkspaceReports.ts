import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../../services/apiClient';
import { WorkspaceReportsData } from '../types';
import { toast } from 'sonner';

export type ReportRange = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

export function useWorkspaceReports(isManager: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialRange = (searchParams.get('range') as ReportRange) || 'today';
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const initialAgentId = searchParams.get('agentId') || 'all';

  const [range, setRange] = useState<ReportRange>(
    ['today', 'yesterday', '7d', '30d', 'custom'].includes(initialRange) ? initialRange : 'today'
  );
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId);

  const [data, setData] = useState<WorkspaceReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync state with URL params
  const updateUrlParams = useCallback(
    (newRange: ReportRange, newStart: string, newEnd: string, newAgentId: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'reports');

      if (newRange === 'today') {
        nextParams.delete('range');
      } else {
        nextParams.set('range', newRange);
      }

      if (newRange === 'custom') {
        if (newStart) nextParams.set('startDate', newStart);
        if (newEnd) nextParams.set('endDate', newEnd);
      } else {
        nextParams.delete('startDate');
        nextParams.delete('endDate');
      }

      if (newAgentId && newAgentId !== 'all') {
        nextParams.set('agentId', newAgentId);
      } else {
        nextParams.delete('agentId');
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const fetchReports = useCallback(
    async (isSilent = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (isSilent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params: Record<string, string> = {
          range,
        };

        if (range === 'custom') {
          if (startDate) params['startDate'] = startDate;
          if (endDate) params['endDate'] = endDate;
        }

        if (isManager && selectedAgentId && selectedAgentId !== 'all') {
          params['agentId'] = selectedAgentId;
        }

        const res = await apiClient.get('/agent-workspace/reports', {
          params,
          signal: abortControllerRef.current.signal,
        });

        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
        } else {
          setError(res.data?.error || 'فشل تحميل بيانات التقارير');
        }
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching workspace reports:', err);
        const errMsg = err?.response?.data?.error || err.message || 'خطأ في جلب بيانات التقارير';
        setError(errMsg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range, startDate, endDate, selectedAgentId, isManager]
  );

  useEffect(() => {
    void fetchReports(false);
  }, [fetchReports]);

  const handleRangeChange = (nextRange: ReportRange) => {
    setRange(nextRange);
    updateUrlParams(nextRange, startDate, endDate, selectedAgentId);
  };

  const handleCustomDatesChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    updateUrlParams('custom', start, end, selectedAgentId);
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    updateUrlParams(range, startDate, endDate, agentId);
  };

  const exportCsv = () => {
    if (!data || !data.agentBreakdown || data.agentBreakdown.length === 0) {
      toast.error('لا توجد بيانات متاحة للتصدير');
      return;
    }

    try {
      const headers = [
        'الوكيل',
        'الدور الوظيفي',
        'طلبات تم التواصل بها',
        'طلبات مؤكدة',
        'نسبة التأكيد (%)',
        'طلبات متابعة',
        'طلبات ملغية',
        'طلبات مفتوحة الآن',
        'إجمالي المكالمات',
        'إجمالي المدة (ثانية)',
        'متوسط المحاولات/طلب',
        'متوسط زمن المعالجة (دقيقة)',
      ];

      const rows = data.agentBreakdown.map((row) => [
        `"${String(row.agentName || '').replace(/"/g, '""')}"`,
        `"${String(row.role || 'AGENT').replace(/"/g, '""')}"`,
        row.contactedOrders,
        row.confirmedOrders,
        `"${row.confirmationRate}%"`,
        row.followUpOrders,
        row.cancelledOrders,
        row.openOrders,
        row.totalCalls,
        row.totalDurationSeconds,
        row.avgAttemptsPerOrder,
        row.avgHandlingTimeMinutes,
      ]);

      // Calculate totals row
      const totals = data.agentBreakdown.reduce(
        (acc, r) => ({
          contacted: acc.contacted + r.contactedOrders,
          confirmed: acc.confirmed + r.confirmedOrders,
          followUp: acc.followUp + r.followUpOrders,
          cancelled: acc.cancelled + r.cancelledOrders,
          open: acc.open + r.openOrders,
          calls: acc.calls + r.totalCalls,
          duration: acc.duration + r.totalDurationSeconds,
        }),
        { contacted: 0, confirmed: 0, followUp: 0, cancelled: 0, open: 0, calls: 0, duration: 0 }
      );

      const totalConfirmationRate =
        totals.contacted > 0 ? ((totals.confirmed / totals.contacted) * 100).toFixed(1) : '0';
      const avgAttempts =
        totals.contacted > 0 ? (totals.calls / totals.contacted).toFixed(1) : '0';

      const totalsRow = [
        '"إجمالي الفريق"',
        '""',
        totals.contacted,
        totals.confirmed,
        `"${totalConfirmationRate}%"`,
        totals.followUp,
        totals.cancelled,
        totals.open,
        totals.calls,
        totals.duration,
        avgAttempts,
        data.kpis.avgHandlingTimeMinutes.value,
      ];

      const csvContent =
        '\uFEFF' +
        [headers.join(','), ...rows.map((r) => r.join(',')), totalsRow.join(',')].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `workspace-reports-${range}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('تم تصدير ملف CSV بنجاح');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  };

  return {
    range,
    startDate,
    endDate,
    selectedAgentId,
    data,
    loading,
    refreshing,
    error,
    handleRangeChange,
    handleCustomDatesChange,
    handleAgentChange,
    refresh: () => void fetchReports(true),
    exportCsv,
  };
}
