import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Store,
  Coins,
  ShoppingBag,
  RotateCcw,
  Clock,
  ArrowRight,
  Layers,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  CompanyProviderTabs,
  OrderItem,
  CommissionItem,
  PayoutItem,
} from "./CompanyProviderTabs";

type TabType = "orders" | "commissions" | "payouts";

const formatPrice = (value: number) => `${(value || 0).toLocaleString("ar-EG")} ج.م`;
const formatDate = (dateStr: string) => (dateStr ? new Date(dateStr).toLocaleDateString("ar-EG") : "—");

const getStatusColor = (status: string) => {
  switch (status) {
    case "CONFIRMED":
    case "PROCESSED":
      return "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20";
    case "PENDING":
      return "text-amber-600 bg-amber-500/10 border border-amber-500/20";
    case "PAID":
      return "text-blue-600 bg-blue-500/10 border border-blue-500/20";
    case "CANCELLED":
      return "text-destructive bg-destructive/10 border border-destructive/20";
    default:
      return "text-muted-foreground bg-muted/40 border border-border/70";
  }
};

const getStatusText = (s: string) => {
  switch (s) {
    case "CONFIRMED":
      return "مؤكدة";
    case "PENDING":
      return "قيد الانتظار";
    case "PROCESSED":
    case "PAID":
      return "تم الدفع";
    case "CANCELLED":
      return "ملغية";
    case "PROCESSING":
      return "قيد المعالجة";
    default:
      return s;
  }
};

const CompanyProviderDetail: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>();

  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [summary, setSummary] = useState({
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0,
    totalOrders: 0,
  });

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPages, setOrdersPages] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [commissionsPage, setCommissionsPage] = useState(1);
  const [commissionsPages, setCommissionsPages] = useState(0);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutsPages, setPayoutsPages] = useState(0);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!connectionId) return;
    try {
      const { apiClient } = await import("../../services/apiClient");
      const res = await apiClient.get(`/company-affiliates/connections/${connectionId}/summary`);
      if (res.data?.success) {
        setSummary(res.data.data || { totalCommissions: 0, paidCommissions: 0, pendingCommissions: 0, totalOrders: 0 });
      }
    } catch (e) {
      console.error(e);
    }
  }, [connectionId]);

  const fetchOrders = useCallback(async (p: number) => {
    if (!connectionId) return;
    setLoadingOrders(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const res = await apiClient.get(`/company-affiliates/connections/${connectionId}/orders`, { params: { page: p } });
      if (res.data?.success) {
        setOrders(res.data.data || []);
        setOrdersPages(res.data.pagination?.pages || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  }, [connectionId]);

  const fetchCommissions = useCallback(async (p: number) => {
    if (!connectionId) return;
    setLoadingCommissions(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const res = await apiClient.get(`/company-affiliates/connections/${connectionId}/commissions`, { params: { page: p } });
      if (res.data?.success) {
        setCommissions(res.data.data || []);
        setCommissionsPages(res.data.pagination?.pages || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCommissions(false);
    }
  }, [connectionId]);

  const fetchPayouts = useCallback(async (p: number) => {
    if (!connectionId) return;
    setLoadingPayouts(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const res = await apiClient.get(`/company-affiliates/connections/${connectionId}/payouts`, { params: { page: p } });
      if (res.data?.success) {
        setPayouts(res.data.data || []);
        setPayoutsPages(res.data.pagination?.pages || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayouts(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === "orders") fetchOrders(ordersPage);
    if (activeTab === "commissions") fetchCommissions(commissionsPage);
    if (activeTab === "payouts") fetchPayouts(payoutsPage);
  }, [activeTab, ordersPage, commissionsPage, payoutsPage, fetchOrders, fetchCommissions, fetchPayouts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSummary(),
      activeTab === "orders" ? fetchOrders(ordersPage) : null,
      activeTab === "commissions" ? fetchCommissions(commissionsPage) : null,
      activeTab === "payouts" ? fetchPayouts(payoutsPage) : null,
    ]);
    setRefreshing(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Link
            to="/company-affiliates"
            className="p-2 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.96] transition-all"
            title="العودة لشركات التسويق"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Store className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                تفاصيل ربط المورد والشريك
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة مبيعات الشريك والعمولات المستحقة وسجل التحويلات البنكية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.94] transition-all disabled:opacity-50"
          title="تحديث"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">إجمالي العمولات</span>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
            {formatPrice(summary.totalCommissions)}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">عمولات تم سدادها</span>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatPrice(summary.paidCommissions)}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">عمولات معلقة</span>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatPrice(summary.pendingCommissions)}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground">إجمالي الطلبات</span>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
            {summary.totalOrders}
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/70 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "orders"
              ? "bg-card text-foreground shadow-2xs border border-border/70"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>الطلبات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("commissions")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "commissions"
              ? "bg-card text-foreground shadow-2xs border border-border/70"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>العمولات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payouts")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "payouts"
              ? "bg-card text-foreground shadow-2xs border border-border/70"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>الدفعات والتحويلات</span>
        </button>
      </div>

      {/* Tabs Content Subcomponent */}
      <CompanyProviderTabs
        activeTab={activeTab}
        orders={orders}
        loadingOrders={loadingOrders}
        ordersPage={ordersPage}
        ordersPages={ordersPages}
        setOrdersPage={setOrdersPage}
        commissions={commissions}
        loadingCommissions={loadingCommissions}
        commissionsPage={commissionsPage}
        commissionsPages={commissionsPages}
        setCommissionsPage={setCommissionsPage}
        payouts={payouts}
        loadingPayouts={loadingPayouts}
        payoutsPage={payoutsPage}
        payoutsPages={payoutsPages}
        setPayoutsPage={setPayoutsPage}
        formatPrice={formatPrice}
        formatDate={formatDate}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
      />
    </div>
  );
};

export default CompanyProviderDetail;
