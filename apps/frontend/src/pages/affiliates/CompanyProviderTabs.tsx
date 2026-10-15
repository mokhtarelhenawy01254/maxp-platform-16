import React from 'react';
import { ShoppingBag, Coins, CreditCard, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export interface OrderItem {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  sourceType: string;
}

export interface CommissionItem {
  id: string;
  amount: number;
  status: string;
  type: string;
  rate: number | null;
  orderTotal: number;
  createdAt: string;
  orderNumber: string;
  orderStatus: string;
}

export interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  notes: string;
  transactionId: string;
  proofFileUrl: string;
  processedAt: string;
  createdAt: string;
}

interface CompanyProviderTabsProps {
  activeTab: "orders" | "commissions" | "payouts";
  orders: OrderItem[];
  loadingOrders: boolean;
  ordersPage: number;
  ordersPages: number;
  setOrdersPage: (fn: (prev: number) => number) => void;
  commissions: CommissionItem[];
  loadingCommissions: boolean;
  commissionsPage: number;
  commissionsPages: number;
  setCommissionsPage: (fn: (prev: number) => number) => void;
  payouts: PayoutItem[];
  loadingPayouts: boolean;
  payoutsPage: number;
  payoutsPages: number;
  setPayoutsPage: (fn: (prev: number) => number) => void;
  formatPrice: (val: number) => string;
  formatDate: (dateStr: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (s: string) => string;
}

export const CompanyProviderTabs: React.FC<CompanyProviderTabsProps> = ({
  activeTab,
  orders,
  loadingOrders,
  ordersPage,
  ordersPages,
  setOrdersPage,
  commissions,
  loadingCommissions,
  commissionsPage,
  commissionsPages,
  setCommissionsPage,
  payouts,
  loadingPayouts,
  payoutsPage,
  payoutsPages,
  setPayoutsPage,
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusText,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
          {loadingOrders ? (
            <div className="py-16 text-center text-muted-foreground">جاري تحميل الطلبات…</div>
          ) : (orders || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا توجد طلبات مسجلة بعد</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">رقم الطلب</th>
                  <th className="px-4 py-3 text-right font-semibold">القيمة الإجمالية</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-foreground">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Commissions Tab */}
      {activeTab === "commissions" && (
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
          {loadingCommissions ? (
            <div className="py-16 text-center text-muted-foreground">جاري تحميل العمولات…</div>
          ) : (commissions || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا توجد عمولات مسجلة بعد</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">رقم الطلب</th>
                  <th className="px-4 py-3 text-right font-semibold">قيمة الطلب</th>
                  <th className="px-4 py-3 text-right font-semibold">العمولة المستحقة</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{c.orderNumber}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{formatPrice(c.orderTotal)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(c.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(c.status)}`}>
                        {getStatusText(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === "payouts" && (
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
          {loadingPayouts ? (
            <div className="py-16 text-center text-muted-foreground">جاري تحميل الدفعات…</div>
          ) : (payouts || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا توجد دفعات محولة بعد</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
                  <th className="px-4 py-3 text-right font-semibold">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right font-semibold">رقم المعاملة</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">تاريخ التحويل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-foreground">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.paymentMethod || 'تحويل بنكي'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground" dir="ltr">{p.transactionId || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(p.status)}`}>
                        {getStatusText(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{formatDate(p.processedAt || p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
