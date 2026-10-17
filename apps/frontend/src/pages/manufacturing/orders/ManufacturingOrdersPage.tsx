import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  RotateCw,
  ClipboardList,
  Eye,
  Calendar,
  Layers,
  CheckCircle2,
  Play,
  Check,
  Ban,
  TrendingUp,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  ProductionOrder,
  ProductionOrderStatus,
} from '../manufacturingApi';
import { NewOrderWizardModal } from './NewOrderWizardModal';

export const ManufacturingOrdersPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.listOrders();
      setOrders(res);
    } catch (err: any) {
      console.error('Failed to load orders', err);
      setError('تعذر تحميل أوامر الإنتاج');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        ord.orderNumber.toLowerCase().includes(q) ||
        (ord.bom?.name || '').toLowerCase().includes(q) ||
        (ord.brandName || '').toLowerCase().includes(q) ||
        (ord.customer?.name || '').toLowerCase().includes(q) ||
        (ord.customerOrder?.orderNumber || '').toLowerCase().includes(q) ||
        (ord.notes || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || ord.status === statusFilter;
      const matchType = orderTypeFilter === 'ALL' || ord.orderType === orderTypeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [orders, search, statusFilter, orderTypeFilter]);

  const getStatusBadge = (status: ProductionOrderStatus) => {
    switch (status) {
      case 'PLANNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">مخطط</span>;
      case 'RELEASED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">معتمد</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">قيد التشغيل</span>;
      case 'QC_PENDING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">فحص الجودة</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">مكتمل</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">ملغي</span>;
    }
  };

  const getOrderTypeBadge = (type?: string) => {
    switch (type) {
      case 'FULL_PACKAGE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">حزمة كاملة</span>;
      case 'CMT':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">تشغيل CMT</span>;
      case 'CUSTOMER_MATERIALS':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">خامات عميل</span>;
      case 'OUTSOURCED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">تشغيل خارجي</span>;
      case 'SAMPLE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">عينة</span>;
      case 'REWORK':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">إعادة تشغيل</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">حزمة كاملة</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <ManufacturingHeader
        title="أوامر الإنتاج والتشغيل (Production Orders)"
        subtitle="جدولة أوامر التصنيع ومتابعة مراحل صالة الإنتاج والصرف والاستلام والتكاليف"
        actions={
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>أمر إنتاج جديد (معالج)</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Filters Strip */}
        <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الأمر، الموديل، العميل، أو البراند..."
                className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end overflow-x-auto no-scrollbar">
            {/* Order Type Filter */}
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="p-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none font-medium"
            >
              <option value="ALL">جميع الأنماط</option>
              <option value="FULL_PACKAGE">حزمة كاملة</option>
              <option value="CMT">تشغيل للغير (CMT)</option>
              <option value="CUSTOMER_MATERIALS">خامات عميل</option>
              <option value="OUTSOURCED">تشغيل خارجي</option>
              <option value="SAMPLE">عينة</option>
              <option value="REWORK">إعادة تشغيل</option>
            </select>

            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs">
              {['ALL', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                    statusFilter === st ? 'bg-card text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st === 'ALL'
                    ? `الكل (${orders.length})`
                    : st === 'PLANNED'
                    ? 'مخطط'
                    : st === 'RELEASED'
                    ? 'معتمد'
                    : st === 'IN_PROGRESS'
                    ? 'قيد التشغيل'
                    : 'مكتمل'}
                </button>
              ))}
            </div>

            <button
              onClick={loadOrders}
              title="تحديث البيانات"
              className="p-2 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadOrders}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-3.5 font-semibold">رقم أمر الإنتاج</th>
                  <th className="p-3.5 font-semibold">الموديل / الـ BOM</th>
                  <th className="p-3.5 font-semibold">العميل / التعاقد</th>
                  <th className="p-3.5 font-semibold text-center">النمط</th>
                  <th className="p-3.5 font-semibold text-center">الحالة</th>
                  <th className="p-3.5 font-semibold text-center">المخطط / المنجز</th>
                  <th className="p-3.5 font-semibold">نسبة الإنجاز</th>
                  <th className="p-3.5 font-semibold">سعر البيع / القيمة</th>
                  <th className="p-3.5 font-semibold">التكلفة الفعلية</th>
                  <th className="p-3.5 font-semibold">تكلفة القطعة</th>
                  <th className="p-3.5 font-semibold">تاريخ الإنشاء</th>
                  <th className="p-3.5 font-semibold text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-muted-foreground text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin text-primary" />
                        <span>جارٍ تحميل أوامر الإنتاج...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-muted-foreground text-xs">
                      لا توجد أوامر إنتاج مسجلة مطابقة للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const planned = Number(ord.plannedQuantity) || 0;
                    const produced = Number(ord.producedQuantity) || 0;
                    const scrapped = Number(ord.scrappedQuantity) || 0;
                    const percent = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;
                    const salePrice = ord.salePricePerUnit ? Number(ord.salePricePerUnit) : null;
                    const totalContractVal = salePrice ? planned * salePrice : null;

                    return (
                      <tr key={ord.id} className="hover:bg-muted/20 transition">
                        <td className="p-3 font-mono font-bold">
                          <Link
                            to={`/manufacturing/orders/${ord.id}`}
                            className="text-primary hover:underline"
                          >
                            {ord.orderNumber}
                          </Link>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{ord.bom?.name || '—'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{ord.bom?.code}</div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">
                              {ord.brandName || ord.customer?.name || 'إنتاج داخلي'}
                            </span>
                            {ord.customerOrder && (
                              <Link
                                to={`/manufacturing/customer-orders/${ord.customerOrderId}`}
                                className="text-[10px] text-primary hover:underline font-mono block"
                              >
                                {ord.customerOrder.orderNumber}
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {getOrderTypeBadge(ord.orderType)}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(ord.status)}
                        </td>
                        <td className="p-3 text-center font-mono tabular-nums text-foreground">
                          <span className="font-bold text-emerald-600">{produced}</span> / {planned}{' '}
                          {scrapped > 0 && <span className="text-amber-600 text-[10px]">({scrapped} هالك)</span>}
                        </td>
                        <td className="p-3 w-28">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted/60 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground w-8 text-left">
                              {percent}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-foreground">
                          {salePrice ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-primary block">
                                {totalContractVal?.toLocaleString()} ج.م
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                @ {salePrice} ج.م/ق
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold tabular-nums text-foreground">
                          {Number(ord.totalCost).toFixed(2)}{' '}
                          <span className="text-[10px] font-sans font-normal text-muted-foreground">ج.م</span>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-foreground">
                          {produced > 0 ? `${Number(ord.unitCost).toFixed(2)} ج.م` : '—'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(ord.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'short' })}
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            to={`/manufacturing/orders/${ord.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>فتح</span>
                          </Link>
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

      <NewOrderWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={(newOrder) => {
          loadOrders();
          navigate(`/manufacturing/orders/${newOrder.id}`);
        }}
      />
    </div>
  );
};

export default ManufacturingOrdersPage;
