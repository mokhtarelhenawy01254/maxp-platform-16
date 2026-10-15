import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Phone, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  Truck, 
  Package,
  Layers
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  shipping: number;
  status: string;
  turboShipmentId: string;
  turboTrackingNumber: string;
  turboShipmentStatus: string;
  turboDelayReason: string | null;
  turboReturnReason: string | null;
  turboExpectedBranch: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
}

interface CaptainInfo {
  name: string;
  phone: string | null;
  branch: string | null;
  branchPhone: string | null;
}

interface Stats {
  total: number;
  delivered: number;
  returned: number;
  active: number;
  delayed: number;
  remitted: number;
  totalRevenue: number;
  totalShipping: number;
  deliveryRate: number;
  delayReasons: Record<string, number>;
  returnReasons: Record<string, number>;
}

const statusBadgeClass = (status: string) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'delivered' || s === 'remitted') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  if (s.startsWith('returned')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
  if (s === 'delayed') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
  return 'bg-primary/10 text-primary border border-primary/20';
};

const statusArabic = (status: string) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'delivered') return 'تم التسليم';
  if (s === 'remitted') return 'تم التوريد';
  if (s.startsWith('returned')) return 'مرتجع';
  if (s === 'delayed') return 'مؤجلة';
  if (s === 'processing') return 'قيد التنفيذ';
  if (s === 'turbo_sent') return 'قيد الانتظار';
  if (s === 'turbo_saved') return 'محفوظة';
  if (s === 'out_for_delivery') return 'مسلمة للمندوب';
  if (s === 'created') return 'منشأة';
  return s;
};

const TurboCaptainDetails: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [captain, setCaptain] = useState<CaptainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const captainName = decodeURIComponent(name || '');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/turbo/captains/${encodeURIComponent(captainName)}/orders`, {
        params: { page, limit: 50, status: statusFilter || undefined }
      });
      if (res.data.success) {
        setOrders(res.data.data || []);
        setStats(res.data.stats || null);
        setCaptain(res.data.captain || null);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'تعذر تحميل تفاصيل شحنات المندوب');
    } finally {
      setLoading(false);
    }
  }, [captainName, page, statusFilter]);

  useEffect(() => { 
    fetchOrders(); 
  }, [fetchOrders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل سجل شحنات المندوب...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link 
              to="/orders/turbo-captains" 
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">
                {captain?.name || captainName}
              </h1>
              {captain && (
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {captain.phone && (
                    <span className="inline-flex items-center gap-1 font-mono" dir="ltr">
                      <Phone className="w-3 h-3 text-primary" />
                      <span>{captain.phone}</span>
                    </span>
                  )}
                  {captain.branch && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{captain.branch}{captain.branchPhone ? ` (${captain.branchPhone})` : ''}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/orders/turbo-captains"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
        >
          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
          <span>كل المناديب</span>
        </Link>
      </div>

      {/* Telemetry Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">إجمالي الشحنات</span>
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.total}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">تم التسليم والتحصيل</span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{stats.delivered + stats.remitted}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">المرتجعات</span>
            <span className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{stats.returned}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">شحنات نشطة</span>
            <span className="text-xl font-bold font-mono tabular-nums text-primary">{stats.active}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">نسبة التسليم</span>
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.deliveryRate}%</span>
          </div>
        </div>
      )}

      {/* Reasons Summary */}
      {stats && (Object.keys(stats.delayReasons).length > 0 || Object.keys(stats.returnReasons).length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(stats.delayReasons).length > 0 && (
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>أسباب التأخير المسجلة</span>
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(stats.delayReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground truncate">{reason}</span>
                    <span className="font-bold font-mono tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(stats.returnReasons).length > 0 && (
            <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-2">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>أسباب الارتجاع المسجلة</span>
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(stats.returnReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground truncate">{reason}</span>
                    <span className="font-bold font-mono tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Surface */}
      <div className="bg-card border border-border/70 rounded-xl shadow-sm overflow-hidden space-y-0">
        <div className="p-3 border-b border-border/70 bg-muted/20 flex gap-1.5 flex-wrap">
          {[
            { key: '', label: 'كافة الشحنات' },
            { key: 'delivered', label: 'تم التسليم' },
            { key: 'returned', label: 'مرتجع' },
            { key: 'active', label: 'قيد التوصيل' },
            { key: 'delayed', label: 'مؤجلة' }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === f.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">رقم الطلب</th>
                <th className="px-4 py-3">العميل</th>
                <th className="px-4 py-3 text-center">الإجمالي</th>
                <th className="px-4 py-3 text-center">حالة النظام</th>
                <th className="px-4 py-3 text-center">حالة Turbo</th>
                <th className="px-4 py-3">سبب التأخير</th>
                <th className="px-4 py-3">سبب الارتجاع</th>
                <th className="px-4 py-3 text-center">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    لا توجد شحنات مطابقة للفلتر المحدد
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link 
                        to={`/orders/${encodeURIComponent(o.orderNumber)}`} 
                        className="text-primary hover:underline font-mono font-bold"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-foreground">{o.customerName || '—'}</div>
                      {o.customerPhone && (
                        <span className="text-[11px] text-muted-foreground font-mono block" dir="ltr">
                          {o.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold tabular-nums text-foreground">
                      {parseFloat(o.total.toString()).toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">ج.م</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(o.turboShipmentStatus)}`}>
                        {statusArabic(o.turboShipmentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-amber-600 dark:text-amber-400 max-w-[180px] truncate" title={o.turboDelayReason || ''}>
                      {o.turboDelayReason || '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-rose-600 dark:text-rose-400 max-w-[180px] truncate" title={o.turboReturnReason || ''}>
                      {o.turboReturnReason || '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-3.5 border-t border-border/70 bg-muted/10">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border/70 bg-card hover:bg-muted/30 disabled:opacity-50"
            >
              السابق
            </button>
            <span className="text-xs text-muted-foreground font-mono">صفحة {page} من {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border/70 bg-card hover:bg-muted/30 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurboCaptainDetails;
