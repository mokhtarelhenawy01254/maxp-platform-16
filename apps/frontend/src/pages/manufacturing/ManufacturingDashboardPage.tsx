import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Factory,
  Layers,
  CheckCircle2,
  Coins,
  Plus,
  ArrowRight,
  RotateCw,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Settings,
  FileSpreadsheet,
} from 'lucide-react';
import { ManufacturingHeader } from './ManufacturingHeader';
import {
  manufacturingApi,
  BillOfMaterials,
  ProductionOrder,
} from './manufacturingApi';
import { NewOrderWizardModal } from './orders/NewOrderWizardModal';
import { BomModal } from './boms/BomModal';

export const ManufacturingDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);

  // Modals state
  const [isOrderWizardOpen, setIsOrderWizardOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, bomsRes] = await Promise.all([
        manufacturingApi.listOrders().catch(() => []),
        manufacturingApi.listBoms().catch(() => []),
      ]);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setBoms(Array.isArray(bomsRes) ? bomsRes : []);
    } catch (err: any) {
      console.error('Manufacturing dashboard load error', err);
      setError('تعذر تحميل بيانات لوحة التصنيع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'RELEASED');
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    const totalProduced = completedOrders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);
    const totalSpend = completedOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const avgUnitCost = totalProduced > 0 ? totalSpend / totalProduced : 0;

    return {
      activeOrdersCount: activeOrders.length,
      completedOrdersCount: completedOrders.length,
      totalProduced,
      avgUnitCost,
      activeBomsCount: boms.filter((b) => b.isActive).length,
    };
  }, [orders, boms]);

  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 5);
  }, [orders]);

  const recentBoms = useMemo(() => {
    return [...boms].slice(0, 4);
  }, [boms]);

  const formatEGP = (num: number) =>
    (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16" dir="rtl">
      <ManufacturingHeader
        activeTab="dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBomModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground flex items-center gap-1.5 shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>نمط تشغيل BOM جديد</span>
            </button>
            <button
              onClick={() => setIsOrderWizardOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>أمر إنتاج جديد</span>
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

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>أوامر الإنتاج النشطة</span>
              <Factory className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {metrics.activeOrdersCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              أوامر قيد التشغيل أو بانتظار الصرف
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>الإنتاج التام المستلم</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {metrics.totalProduced.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">قطعة</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              من {metrics.completedOrdersCount} أمر إنتاج مكتمل
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>متوسط تكلفة القطعة الفعلية</span>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">
              {formatEGP(metrics.avgUnitCost)}{' '}
              <span className="text-xs font-normal text-muted-foreground">ج.م</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              تشمل الخامات + الأجور + أعباء MOH
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between mb-1">
              <span>أنماط التشغيل القياسية (BOM)</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {metrics.activeBomsCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              أنماط تصنيع نشطة ومعتمدة
            </div>
          </div>
        </div>

        {/* Central Grid: Recent Orders & Quick Launch */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders List (2 Cols) */}
          <div className="lg:col-span-2 rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground">أحدث أوامر الإنتاج والتشغيل</h3>
                <p className="text-[11px] text-muted-foreground">متابعة سير العمل على خطوط الإنتاج بالمصنع</p>
              </div>
              <Link
                to="/manufacturing/orders"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>عرض جميع الأوامر</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                    <th className="py-2.5 px-4">رقم الأمر</th>
                    <th className="py-2.5 px-4">نمط BOM / المنتج</th>
                    <th className="py-2.5 px-4">الحالة</th>
                    <th className="py-2.5 px-4">المنجز / المخطط</th>
                    <th className="py-2.5 px-4">تكلفة القطعة</th>
                    <th className="py-2.5 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <RotateCw className="w-4 h-4 animate-spin mx-auto mb-1 text-primary" />
                        <span>جارٍ تحميل الأوامر...</span>
                      </td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        لا توجد أوامر إنتاج حتى الآن. ابدأ بإنشاء أول أمر إنتاج!
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">{o.orderNumber}</td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {o.bom?.name || o.bom?.code || 'أمر تشغيل'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                              o.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : o.status === 'IN_PROGRESS'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                : o.status === 'CANCELLED'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          <span className="font-semibold text-emerald-600">{o.producedQuantity}</span> /{' '}
                          <span>{o.plannedQuantity}</span> قطعة
                        </td>
                        <td className="py-3 px-4 tabular-nums font-semibold text-foreground">
                          {formatEGP(o.unitCost)} ج.م
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            to={`/manufacturing/orders/${o.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <span>لوحة الأمر</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions & Recent BOMs (1 Col) */}
          <div className="space-y-4">
            {/* Quick Links Card */}
            <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>الوصول السريع للنظام</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setIsOrderWizardOpen(true)}
                  className="p-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-right space-y-1 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <div className="font-semibold text-foreground">أمر تشغيل جديد</div>
                  <div className="text-[10px] text-muted-foreground">بناء مصفوفة مقاس/لون</div>
                </button>

                <button
                  onClick={() => setIsBomModalOpen(true)}
                  className="p-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-right space-y-1 transition-all"
                >
                  <Layers className="w-4 h-4 text-primary" />
                  <div className="font-semibold text-foreground">نمط BOM جديد</div>
                  <div className="text-[10px] text-muted-foreground">تعريف الخامات ومراحلها</div>
                </button>

                <Link
                  to="/manufacturing/reports"
                  className="p-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-right space-y-1 transition-all block"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <div className="font-semibold text-foreground">تقارير التكاليف</div>
                  <div className="text-[10px] text-muted-foreground">تحليل 3-way والانحرافات</div>
                </Link>

                <Link
                  to="/manufacturing/settings"
                  className="p-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-right space-y-1 transition-all block"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <div className="font-semibold text-foreground">إعدادات المصنع</div>
                  <div className="text-[10px] text-muted-foreground">المستودعات وربط الحسابات</div>
                </Link>
              </div>
            </div>

            {/* Active BOMs */}
            <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">أنماط التصنيع المعتمدة (BOM)</h4>
                <Link to="/manufacturing/boms" className="text-[10px] font-semibold text-primary hover:underline">
                  إدارة الكل
                </Link>
              </div>

              <div className="space-y-2">
                {recentBoms.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-lg border border-border/50 bg-background flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{b.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {b.code} · v{b.version}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      نشط
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Order Wizard Modal */}
      <NewOrderWizardModal
        isOpen={isOrderWizardOpen}
        onClose={() => setIsOrderWizardOpen(false)}
        onCreated={(newOrder) => {
          setIsOrderWizardOpen(false);
          loadData();
          navigate(`/manufacturing/orders/${newOrder.id}`);
        }}
      />

      {/* BOM Modal */}
      <BomModal
        isOpen={isBomModalOpen}
        bom={null}
        onClose={() => setIsBomModalOpen(false)}
        onSaved={() => {
          setIsBomModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};

export default ManufacturingDashboardPage;
