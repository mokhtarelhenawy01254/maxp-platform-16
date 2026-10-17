import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  UserCheck,
  RotateCcw,
  Clock,
  Phone,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

interface CaptainStats {
  captainName: string;
  captainPhone: string | null;
  branchName: string | null;
  branchPhone: string | null;
  total: number;
  delivered: number;
  returned: number;
  active: number;
  delayed: number;
  remitted: number;
  deliveryRate: number;
  returnRate: number;
  activeRate: number;
  delayRate: number;
  totalRevenue: number;
  totalShipping: number;
  delayReasonSummary: { reason: string; count: number }[];
  returnReasonSummary: { reason: string; count: number }[];
  recentOrders: string[];
}

interface TotalStats {
  totalCaptains: number;
  totalShipments: number;
  totalDelivered: number;
  totalReturned: number;
  totalActive: number;
  totalRevenue: number;
  avgDeliveryRate: number;
}

const TurboCaptains: React.FC = () => {
  const { t } = useTranslation();
  const [captains, setCaptains] = useState<CaptainStats[]>([]);
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('delivery_rate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/turbo/captains/stats`, {
        params: { sortBy, sortOrder, search: search || undefined }
      });
      if (res.data.success) {
        setCaptains(res.data.data || []);
        setTotalStats(res.data.totalStats || null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'تعذر تحميل إحصائيات مناديب الشحن');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, search]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/60 inline mr-1" />;
    return sortOrder === 'desc' 
      ? <ArrowDown className="w-3 h-3 text-primary inline mr-1" />
      : <ArrowUp className="w-3 h-3 text-primary inline mr-1" />;
  };

  if (loading && captains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل تقارير وأداء مناديب الشحن...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">
                تقارير مناديب الشحن (Turbo Captains)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                متابعة أداء المناديب اليومي، نسب التسليم والتحصيل، وأسباب المرتجعات
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      {totalStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">إجمالي المناديب</span>
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">{totalStats.totalCaptains}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">إجمالي الشحنات</span>
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">{totalStats.totalShipments}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">تم التسليم</span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{totalStats.totalDelivered}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">المرتجعات</span>
            <span className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{totalStats.totalReturned}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">متوسط نسبة التسليم</span>
            <span className="text-xl font-bold font-mono tabular-nums text-primary">{totalStats.avgDeliveryRate}%</span>
          </div>
        </div>
      )}

      {/* Table & Filter Surface */}
      <div className="bg-card border border-border/70 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border/70 bg-muted/20 flex flex-wrap gap-2 items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchData()}
              placeholder="ابحث باسم المندوب..."
              className="w-full pl-8 pr-3 py-1.5 border border-border/70 rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            تصفية
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
              <tr>
                <th onClick={() => handleSort('captain_name')} className="px-4 py-3 cursor-pointer hover:text-foreground">
                  <SortIcon field="captain_name" /> المندوب
                </th>
                <th className="px-4 py-3">الفرع التابع</th>
                <th onClick={() => handleSort('total')} className="px-4 py-3 text-center cursor-pointer hover:text-foreground">
                  <SortIcon field="total" /> إجمالي
                </th>
                <th onClick={() => handleSort('delivered')} className="px-4 py-3 text-center cursor-pointer hover:text-foreground">
                  <SortIcon field="delivered" /> تم التسليم
                </th>
                <th onClick={() => handleSort('returned')} className="px-4 py-3 text-center cursor-pointer hover:text-foreground">
                  <SortIcon field="returned" /> المرتجع
                </th>
                <th onClick={() => handleSort('active')} className="px-4 py-3 text-center cursor-pointer hover:text-foreground">
                  <SortIcon field="active" /> قيد التوصيل
                </th>
                <th onClick={() => handleSort('delivery_rate')} className="px-4 py-3 text-center cursor-pointer hover:text-foreground">
                  <SortIcon field="delivery_rate" /> نسبة التسليم
                </th>
                <th onClick={() => handleSort('return_rate')} className="px-4 py-3 text-center cursor-pointer hover:text-foreground">
                  <SortIcon field="return_rate" /> نسبة المرتجع
                </th>
                <th className="px-4 py-3">أبرز أسباب التأخير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {captains.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    لا توجد بيانات مناديب مسجلة حالياً. يتم تسجيل المناديب تلقائياً عبر تحديثات Turbo Webhook.
                  </td>
                </tr>
              ) : (
                captains.map((cap, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link 
                        to={`/orders/turbo-captains/${encodeURIComponent(cap.captainName)}`} 
                        className="font-bold text-primary hover:underline block"
                      >
                        {cap.captainName}
                      </Link>
                      {cap.captainPhone && (
                        <span className="text-[11px] text-muted-foreground font-mono block" dir="ltr">
                          {cap.captainPhone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground block">{cap.branchName || '—'}</span>
                      {cap.branchPhone && (
                        <span className="text-[11px] text-muted-foreground font-mono block" dir="ltr">
                          {cap.branchPhone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-foreground">
                      {cap.total}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {cap.delivered + cap.remitted}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      {cap.returned}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-foreground">
                      {cap.active}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tabular-nums ${
                        cap.deliveryRate >= 80 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : cap.deliveryRate >= 60 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {cap.deliveryRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-[11px] text-muted-foreground">
                      {cap.returnRate}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {cap.delayReasonSummary.length > 0 ? (
                          cap.delayReasonSummary.filter((d) => d != null).map((d, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/40 text-muted-foreground border border-border/40 truncate max-w-[150px]" 
                              title={d.reason}
                            >
                              {d.reason} ({d.count})
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TurboCaptains;
