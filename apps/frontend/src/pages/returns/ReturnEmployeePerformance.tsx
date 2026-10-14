import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Calendar,
  BarChart3,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { toast } from 'sonner';
import i18n from '../../i18n';

interface EmployeeStats {
  id: string;
  name: string;
  totalAssigned: number;
  totalReviewed: number;
  totalActions: number;
  actions: Record<string, number>;
}

const ReturnEmployeePerformance: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const qs = params.toString();
      const res = await apiClient.get(`/returns/employee-performance${qs ? `?${qs}` : ''}`);
      setStats(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load employee performance:', err);
      toast.error('فشل تحميل أداء الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedStats = useMemo(
    () => [...stats].sort((a, b) => b.totalActions - a.totalActions),
    [stats]
  );

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({
          assigned: acc.assigned + (s.totalAssigned || 0),
          reviewed: acc.reviewed + (s.totalReviewed || 0),
          actions: acc.actions + (s.totalActions || 0),
        }),
        { assigned: 0, reviewed: 0, actions: 0 }
      ),
    [stats]
  );

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link
              to="/returns"
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title="العودة لإدارة المرتجعات"
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">أداء موظفي فحص ومعالجة المرتجعات</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  REVERSE LOGISTICS KPI
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                متابعة إنتاجية الفحص، المرتجعات المعينة، وسرعة اتخاذ القرارات من قِبل الفريق
              </p>
            </div>
          </div>

          {/* Date Filter & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-card border border-border/70 rounded-lg px-2 py-1 gap-2 text-xs">
              <Calendar size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none font-mono text-xs"
              />
              <span className="text-muted-foreground text-[11px]">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none font-mono text-xs"
              />
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-primary" />
              <span>فريق الفحص النشط</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {stats.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">موظف مسجل بالمنظومة</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-500" />
              <span>إجمالي المعين</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {totals.assigned}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">شحنات مرتجعة محولة للموظفين</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>تمت مراجعته</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {totals.reviewed}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">طلبات تم فحصها نهائياً</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-sky-500" />
              <span>إجمالي الإجراءات</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {totals.actions}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">قرارات فحص وقبول/رفض</div>
          </div>
        </div>

        {/* Performance Matrix */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              <span className="text-xs font-bold text-foreground">جدول أداء الموظفين وإجراءات الفحص</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              مرتب حسب الأعلى نشاطاً
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">الموظف</th>
                  <th className="py-2.5 px-4 text-center">المرتجعات المعينة</th>
                  <th className="py-2.5 px-4 text-center">المرتجعات المراجعة</th>
                  <th className="py-2.5 px-4 text-center">إجمالي الإجراءات</th>
                  <th className="py-2.5 px-4 text-center">معدل الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground font-mono">
                      جاري تحميل بيانات أداء الموظفين...
                    </td>
                  </tr>
                ) : sortedStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground font-mono">
                      لا توجد بيانات أداء مسجلة لهذا النطاق
                    </td>
                  </tr>
                ) : (
                  sortedStats.map((emp) => {
                    const completionRate = emp.totalAssigned > 0
                      ? Math.min(100, Math.round((emp.totalReviewed / emp.totalAssigned) * 100))
                      : 0;
                    return (
                      <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {emp.name ? emp.name.slice(0, 1) : <User size={13} />}
                            </div>
                            <span className="font-semibold text-xs text-foreground">
                              {emp.name || 'غير محدد'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                          {emp.totalAssigned}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {emp.totalReviewed}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-sky-600 dark:text-sky-400">
                          {emp.totalActions}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block font-mono tabular-nums font-bold text-xs px-2 py-0.5 rounded-full border ${
                            completionRate >= 80
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : completionRate >= 50
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-muted/40 text-muted-foreground border-border/60'
                          }`}>
                            {completionRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReturnEmployeePerformance;
