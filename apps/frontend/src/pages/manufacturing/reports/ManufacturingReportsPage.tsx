import React, { useEffect, useState, useMemo } from 'react';
import {
  RotateCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import { manufacturingApi, ProductionOrder } from '../manufacturingApi';
import { ReportOrdersTab } from './tabs/ReportOrdersTab';
import { ReportUnitCostTab } from './tabs/ReportUnitCostTab';
import { ReportVariancesTab } from './tabs/ReportVariancesTab';

type ReportTab = 'orders' | 'unit_cost' | 'variances';

export const ManufacturingReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('orders');
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await manufacturingApi.listOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load manufacturing reports data', err);
      setError('تعذر تحميل بيانات تقارير التصنيع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (dateFilter === 'all') return true;

      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;

      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
      if (dateFilter === 'today') return diffDays <= 1;
      if (dateFilter === 'week') return diffDays <= 7;
      if (dateFilter === 'month') return diffDays <= 30;
      if (dateFilter === 'quarter') return diffDays <= 90;
      return true;
    });
  }, [orders, dateFilter, statusFilter]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'COMPLETED');
    const inProgressOrders = filteredOrders.filter((o) => o.status === 'IN_PROGRESS');

    const totalPlanned = filteredOrders.reduce((sum, o) => sum + (o.plannedQuantity || 0), 0);
    const totalProduced = filteredOrders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);
    const totalScrapped = filteredOrders.reduce((sum, o) => sum + (o.scrappedQuantity || 0), 0);

    const scrapRate =
      totalProduced + totalScrapped > 0
        ? (totalScrapped / (totalProduced + totalScrapped)) * 100
        : 0;

    const totalMaterialCost = filteredOrders.reduce((sum, o) => sum + (o.actualMaterialCost || 0), 0);
    const totalLaborCost = filteredOrders.reduce((sum, o) => sum + (o.actualLaborCost || 0), 0);
    const totalOverheadCost = filteredOrders.reduce((sum, o) => sum + (o.actualOverheadCost || 0), 0);
    const totalSpend = totalMaterialCost + totalLaborCost + totalOverheadCost;

    const completedUnits = completedOrders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);
    const completedSpend = completedOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const avgUnitCost = completedUnits > 0 ? completedSpend / completedUnits : 0;

    return {
      totalOrders,
      completedOrdersCount: completedOrders.length,
      inProgressOrdersCount: inProgressOrders.length,
      totalPlanned,
      totalProduced,
      totalScrapped,
      scrapRate,
      totalSpend,
      totalMaterialCost,
      totalLaborCost,
      totalOverheadCost,
      avgUnitCost,
    };
  }, [filteredOrders]);

  const formatEGP = (num: number) =>
    (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleExportCSV = () => {
    const headers = [
      'رقم الأمر',
      'المنتج / BOM',
      'الحالة',
      'المخطط',
      'المنجز',
      'الهالك',
      'مواد',
      'أجور',
      'أعباء',
      'الإجمالي',
      'تكلفة القطعة',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.bom?.name || o.bom?.code || 'N/A',
      o.status,
      o.plannedQuantity,
      o.producedQuantity,
      o.scrappedQuantity,
      o.actualMaterialCost,
      o.actualLaborCost,
      o.actualOverheadCost,
      o.totalCost,
      o.unitCost,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `manufacturing_report_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16" dir="rtl">
      <ManufacturingHeader
        activeTab="reports"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadData} className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground text-[11px]">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>أوامر الإنتاج في الفترة</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">{metrics.totalOrders}</div>
            <div className="text-[11px] text-muted-foreground mt-1 flex gap-2">
              <span className="text-emerald-600 font-semibold">{metrics.completedOrdersCount} منجز</span>
              <span>·</span>
              <span className="text-amber-600 font-semibold">{metrics.inProgressOrdersCount} قيد التشغيل</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>الكميات التامة المنتجة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {metrics.totalProduced.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">قطعة</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              من أصل {metrics.totalPlanned.toLocaleString()} قطعة مخططة
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>نسبة الهدر والتلف</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              %{metrics.scrapRate.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              إجمالي {metrics.totalScrapped} قطعة هالك مسجلة
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>متوسط تكلفة القطعة التامة</span>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-600 tabular-nums">
              {formatEGP(metrics.avgUnitCost)}{' '}
              <span className="text-xs font-normal text-muted-foreground">ج.م</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              إجمالي المنفق: {formatEGP(metrics.totalSpend)} ج.م
            </div>
          </div>
        </div>

        {/* Filters and Sub-Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-card border border-border/70 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              أوامر الإنتاج والتكلفة
            </button>
            <button
              onClick={() => setActiveTab('unit_cost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'unit_cost'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              تكلفة القطعة عبر الأوامر
            </button>
            <button
              onClick={() => setActiveTab('variances')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'variances'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              انحرافات التكاليف (3-Way)
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>الفترة:</span>
            </div>
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-border/70 bg-background text-foreground font-medium text-xs focus:outline-none"
            >
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوماً</option>
              <option value="quarter">هذا الربع</option>
              <option value="all">جميع الفترات</option>
            </select>

            <div className="flex items-center gap-1 text-muted-foreground mr-2">
              <Filter className="w-3.5 h-3.5" />
              <span>الحالة:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-border/70 bg-background text-foreground font-medium text-xs focus:outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="IN_PROGRESS">قيد التشغيل</option>
              <option value="RELEASED">تم الإصدار</option>
              <option value="PLANNED">مخطط</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          </div>
        </div>

        {/* Dynamic Tab Rendering */}
        {activeTab === 'orders' && <ReportOrdersTab orders={filteredOrders} formatEGP={formatEGP} />}
        {activeTab === 'unit_cost' && <ReportUnitCostTab orders={filteredOrders} formatEGP={formatEGP} />}
        {activeTab === 'variances' && <ReportVariancesTab metrics={metrics} formatEGP={formatEGP} />}
      </div>
    </div>
  );
};

export default ManufacturingReportsPage;
