import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Plus,
  Eye,
  ShoppingBag,
  Filter,
  Loader2,
  Calendar,
  DollarSign,
  User,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { tToast } from "../../utils/i18n-toast";

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  orderSource: string;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  commissions?: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
}

const AffiliateOrders: React.FC = () => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    orderSource: "",
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.orderSource) params.orderSource = filters.orderSource;

      const response = await apiClient.get("/affiliates/orders", { params });
      if (response?.data?.success && response.data.data) {
        setOrders(response.data.data);
      }
    } catch {
      tToast.error("AffiliateOrders.error_error_9817");
    } finally {
      setLoading(false);
    }
  }, [filters.orderSource, filters.status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; badgeClass: string }> = {
      PENDING: {
        label: "معلق",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
      CONFIRMED: {
        label: "مؤكد",
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      },
      DELIVERED: {
        label: "تم التسليم",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      CANCELLED: {
        label: "ملغي",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      },
    };
    const info = statusMap[status] || {
      label: status,
      badgeClass: "bg-muted text-muted-foreground border-border/60",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${info.badgeClass}`}
      >
        {info.label}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, { label: string; badgeClass: string }> = {
      AFFILIATE_REFERRAL: {
        label: "رابط إحالة",
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      },
      AFFILIATE_DIRECT: {
        label: "طلب مسوق مباشر",
        badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      },
      REGULAR: {
        label: "طلب عادي",
        badgeClass: "bg-muted text-muted-foreground border-border/60",
      },
    };
    const info = sourceMap[source] || {
      label: source,
      badgeClass: "bg-muted text-muted-foreground border-border/60",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${info.badgeClass}`}
      >
        {info.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs">جاري استرجاع سجل طلبات المسوقين...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              طلبات المسوقين والعمولات
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            سجل كامل بجميع الطلبات الواردة عبر روابط الإحالة وحساب العمولات التابعة
          </p>
        </div>

        <button
          onClick={() => navigate("/affiliates/orders/create")}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>إنشاء طلب جديد</span>
        </button>
      </header>

      {/* Filter Ribbon */}
      <div className="rounded-lg border border-border/70 bg-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-medium">تصفية النتائج:</span>
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">جميع الحالات</option>
          <option value="PENDING">معلق</option>
          <option value="CONFIRMED">مؤكد</option>
          <option value="DELIVERED">تم التسليم</option>
          <option value="CANCELLED">ملغي</option>
        </select>

        <select
          value={filters.orderSource}
          onChange={(e) => setFilters({ ...filters, orderSource: e.target.value })}
          className="rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">جميع المصادر</option>
          <option value="AFFILIATE_REFERRAL">رابط إحالة</option>
          <option value="AFFILIATE_DIRECT">طلب مسوق مباشر</option>
        </select>

        <div className="mr-auto text-xs font-mono tabular-nums text-muted-foreground">
          إجمالي النتائج: <span className="font-semibold text-foreground">{orders.length}</span>
        </div>
      </div>

      {/* Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60 text-right text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    رقم الطلب
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    العميل
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    إجمالي المبلغ
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    الحالة
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    المصدر
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    العمولة
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    الإجراء
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-foreground whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {order.customer
                          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                          : "عميل غير محدد"}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {order.customer?.phone || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-semibold text-foreground whitespace-nowrap">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSourceBadge(order.orderSource)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {order.commissions && order.commissions.length > 0
                        ? formatPrice(order.commissions[0].amount)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() =>
                          navigate(
                            `/affiliates/orders/${encodeURIComponent(String(order.id))}`,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted hover:text-primary transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>تفاصيل</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">لا توجد طلبات مسوقين</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                لم يتم تسجيل أي طلبات متوافقة مع شروط الفرز الحالية
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateOrders;
