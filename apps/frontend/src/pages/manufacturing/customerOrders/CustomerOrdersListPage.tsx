import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  RotateCw,
  FileText,
  Eye,
  Calendar,
  Layers,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Building2,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  CustomerOrder,
  CustomerOrderStatus,
} from '../manufacturingApi';
import { NewCustomerOrderModal } from './modals/NewCustomerOrderModal';
import { EditCustomerOrderModal } from './modals/EditCustomerOrderModal';

export const CustomerOrdersListPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [summaryTotals, setSummaryTotals] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CustomerOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<CustomerOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingOrder) return;
    try {
      setDeleteLoading(true);
      await manufacturingApi.deleteCustomerOrder(deletingOrder.id);
      setDeletingOrder(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete customer order', err);
      alert(err?.response?.data?.message || err?.message || 'تعذر حذف أمر العميل');
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.listCustomerOrders();
      setOrders(res.items || []);
      setSummaryTotals(res.totals || {});
    } catch (err: any) {
      console.error('Failed to load customer orders', err);
      setError('تعذر تحميل أوامر العملاء وعقود التصنيع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        ord.orderNumber.toLowerCase().includes(q) ||
        (ord.brandName || '').toLowerCase().includes(q) ||
        (ord.customerCountry || '').toLowerCase().includes(q) ||
        (ord.customer?.name || '').toLowerCase().includes(q) ||
        (ord.customer?.phone || '').includes(q);

      const matchStatus = statusFilter === 'ALL' || ord.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const getStatusBadge = (status: CustomerOrderStatus) => {
    const config: Record<CustomerOrderStatus, { label: string; class: string }> = {
      DRAFT: { label: 'مسودة عقد', class: 'bg-muted text-muted-foreground border-border' },
      CONFIRMED: { label: 'مؤكد ومعتمد', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      IN_PRODUCTION: { label: 'قيد الإنتاج', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
      READY: { label: 'جاهز للتسليم', class: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
      DELIVERED: { label: 'تم التسليم بالكامل', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
      CANCELLED: { label: 'ملغي', class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
    };
    const c = config[status] || { label: status, class: 'bg-muted text-muted-foreground border-border' };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${c.class}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <ManufacturingHeader
        title="أوامر العملاء وعقود التصنيع للغير (Customer Orders)"
        subtitle="إدارة عقود البراندات، أوامر التشغيل المجمعة، وجدولة التحصيل والدفعات"
        actions={
          <button
            onClick={() => setNewOrderModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>أمر عميل جديد (عقد)</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* KPI Summary Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
            <span className="text-[11px] text-muted-foreground block mb-1">عقود العملاء</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-lg text-foreground tabular-nums">
                {summaryTotals.totalCustomerOrders || orders.length}
              </span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
            <span className="text-[11px] text-muted-foreground block mb-1">إجمالي القطع المطلوبة</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-lg text-foreground tabular-nums">
                {(summaryTotals.totalPlannedQuantity || 0).toLocaleString()}
              </span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
            <span className="text-[11px] text-muted-foreground block mb-1">إجمالي قيمة العقود</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-lg text-foreground tabular-nums">
                {(summaryTotals.totalAmount || 0).toLocaleString()} <span className="text-xs font-sans">ج.م</span>
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs">
            <span className="text-[11px] text-muted-foreground block mb-1">المحصل فعلياً</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 tabular-nums">
                {(summaryTotals.totalPaidAmount || 0).toLocaleString()} <span className="text-xs font-sans">ج.م</span>
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-muted-foreground block mb-1">المتبقي للتحصيل</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-lg text-amber-600 dark:text-amber-400 tabular-nums">
                {(summaryTotals.totalRemainingAmount || 0).toLocaleString()} <span className="text-xs font-sans">ج.م</span>
              </span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم العقد، اسم البراند، أو العميل..."
                className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'DRAFT', label: 'مسودة' },
              { id: 'CONFIRMED', label: 'مؤكد' },
              { id: 'IN_PRODUCTION', label: 'قيد الإنتاج' },
              { id: 'READY', label: 'جاهز' },
              { id: 'DELIVERED', label: 'تم التسليم' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  statusFilter === st.id
                    ? 'bg-card text-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center rounded-xl bg-card border border-border/70">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">جاري تحميل أوامر وعقود العملاء...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p>{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-3 py-1 bg-background border border-border rounded text-xs hover:bg-muted"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-card border border-border/70 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">لا توجد أوامر عملاء مطابقة</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || statusFilter !== 'ALL'
                  ? 'لم يتم العثور على نتائج تطابق معايير البحث والفلترة المحددة'
                  : 'ابدأ بتسجيل أول عقد تصنيع للغير لجدولة أوامر التشغيل والدفعات التعاقدية'}
              </p>
            </div>
            {!search && statusFilter === 'ALL' && (
              <button
                onClick={() => setNewOrderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أول أمر عميل الآن</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-medium">
                    <th className="py-3 px-4">رقم العقد</th>
                    <th className="py-3 px-4">البراند / العميل</th>
                    <th className="py-3 px-3">الحالة</th>
                    <th className="py-3 px-3 text-center">أوامر التشغيل</th>
                    <th className="py-3 px-3 text-left">إجمالي الكمية</th>
                    <th className="py-3 px-3 text-left">قيمة العقد</th>
                    <th className="py-3 px-3 text-left">التحصيل (المدفوع / المتبقي)</th>
                    <th className="py-3 px-3">تاريخ التسليم</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.map((ord) => {
                    const totalVal = ord.totalAmount || 0;
                    const paidVal = ord.paidAmount || 0;
                    const remainingVal = ord.remainingAmount !== undefined ? ord.remainingAmount : Math.max(0, totalVal - paidVal);
                    const percentCollected = totalVal > 0 ? Math.min(100, Math.round((paidVal / totalVal) * 100)) : 0;

                    return (
                      <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          <Link
                            to={`/manufacturing/customer-orders/${ord.id}`}
                            className="text-primary hover:underline"
                          >
                            {ord.orderNumber}
                          </Link>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block">
                              {ord.brandName || 'براند غير محدد'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {ord.customer?.name && <span>{ord.customer.name}</span>}
                              {ord.customerCountry && (
                                <span className="px-1.5 py-0.2 rounded bg-muted text-[10px]">
                                  {ord.customerCountry}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {getStatusBadge(ord.status)}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-semibold text-foreground">
                          {ord.ordersCount || ord.orders?.length || 0}
                        </td>

                        <td className="py-3 px-3 text-left font-mono font-bold text-foreground tabular-nums">
                          {(ord.plannedQuantity || 0).toLocaleString()} قطعة
                        </td>

                        <td className="py-3 px-3 text-left font-mono font-bold text-foreground tabular-nums">
                          {totalVal.toLocaleString()} {ord.currency || 'EGP'}
                        </td>

                        <td className="py-3 px-3 text-left">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{paidVal.toLocaleString()}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-muted-foreground">{remainingVal.toLocaleString()}</span>
                            </div>
                            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${percentCollected}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-muted-foreground">
                          {ord.expectedDelivery ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(ord.expectedDelivery).toLocaleDateString('ar-EG')}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/manufacturing/customer-orders/${ord.id}`);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center gap-1 border border-border/70 active:scale-95 shadow-2xs"
                              title="عرض تفاصيل العقد"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOrder(ord);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                              title="تعديل العقد"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingOrder(ord);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
                              title="حذف العقد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      <EditCustomerOrderModal
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        order={editingOrder}
        onUpdated={loadData}
      />

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">حذف عقد العميل</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  هل أنت متأكد من حذف عقد العميل رقم{' '}
                  <span className="font-mono font-bold text-foreground">{deletingOrder.orderNumber}</span>؟
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
              سيتم فك ارتباط أي أوامر إنتاج تشغيلية وحذف جدول الدفعات المرتبط بهذا العقد بشكل نهائي.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                disabled={deleteLoading}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      <NewCustomerOrderModal
        isOpen={newOrderModalOpen}
        onClose={() => setNewOrderModalOpen(false)}
        onCreated={(newOrder) => {
          loadData();
          navigate(`/manufacturing/customer-orders/${newOrder.id}`);
        }}
      />
    </div>
  );
};

export default CustomerOrdersListPage;
