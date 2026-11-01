import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Clock,
  Search,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Package,
  Layers,
  Building2,
  Check,
  X,
  Ban,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

// Types definition matching /wholesale/manage/queue
interface DistributorInfo {
  id: string | null;
  customerId?: string;
  name: string;
  phone: string;
  currentBalance?: number;
  creditLimit?: number;
  isOverLimit?: boolean;
  excessAmount?: number;
  isActive?: boolean;
}

interface OrderItem {
  id: string;
  productName?: string;
  quantity: number;
  price: number;
  total: number;
}

interface PendingWholesaleOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
  itemCount: number;
  items: OrderItem[];
  distributor: DistributorInfo;
}

interface OverLimitDistributor {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  currentBalance: number;
  creditLimit: number;
  excessAmount: number;
  utilizationPercent: number;
  isActive: boolean;
  notes?: string;
  updatedAt?: string;
}

interface SuspendedDistributor {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  currentBalance: number;
  creditLimit: number;
  notes: string;
  isActive: boolean;
  updatedAt?: string;
}

interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  confirmedAt?: string;
  itemCount: number;
  distributor: {
    id: string | null;
    customerId?: string;
    name: string;
    phone: string;
  };
}

interface QueueCounts {
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
  overLimitDistributorsCount: number;
  totalOverLimitAmount: number;
  suspendedDistributorsCount: number;
  processingOrdersCount: number;
  processingOrdersAmount: number;
}

interface QueueData {
  counts: QueueCounts;
  groups: {
    pendingOrders: PendingWholesaleOrder[];
    overLimitDistributors: OverLimitDistributor[];
    suspendedDistributors: SuspendedDistributor[];
    processingOrders: FulfillmentOrder[];
  };
  filters?: {
    companyId: string;
    period: string;
  };
}

export default function WholesaleManageQueue() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters state
  const [period, setPeriod] = useState<string>("today");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "overlimit" | "suspended" | "fulfillment">("all");

  // Action modals state
  const [confirmModalOrder, setConfirmModalOrder] = useState<PendingWholesaleOrder | null>(null);
  const [confirmNotes, setConfirmNotes] = useState<string>("");
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  const [suspendDistributor, setSuspendDistributor] = useState<OverLimitDistributor | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>("تجاوز الحد الائتماني وتأخر في السداد");
  const [suspendLoading, setSuspendLoading] = useState<boolean>(false);

  const [resumeDistributor, setResumeDistributor] = useState<SuspendedDistributor | null>(null);
  const [resumeReason, setResumeReason] = useState<string>("تمت تسوية الحساب وتحديث الضمانات");
  const [resumeLoading, setResumeLoading] = useState<boolean>(false);

  // Load Queue Data
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/wholesale/manage/queue", {
        params: {
          period,
          limit: 100,
        },
      });

      if (res.data?.success) {
        setData(res.data);
      } else {
        setError(res.data?.error || "تعذر تحميل بيانات شاشة العمل اليومية");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "حدث خطأ أثناء تحميل طابور عمل الموزعين");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  // Handle Order Confirmation
  const handleConfirmOrder = async () => {
    if (!confirmModalOrder) return;
    try {
      setConfirmLoading(true);
      const res = await apiClient.post(`/wholesale/manage/orders/${confirmModalOrder.id}/confirm`, {
        notes: confirmNotes || "تأكيد فوري من شاشة عمل الموزعين",
      });

      if (res.data?.success) {
        setSuccessBanner(
          `تم تأكيد الطلب #${confirmModalOrder.orderNumber} بنجاح وتسجيل الفاتورة في كشف حساب الموزع!`
        );
        setConfirmModalOrder(null);
        setConfirmNotes("");
        await loadQueue();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل تأكيد الطلب، يرجى المحاولة ثانية");
    } finally {
      setConfirmLoading(false);
    }
  };

  // Handle Suspend Distributor
  const handleSuspend = async () => {
    if (!suspendDistributor) return;
    if (!suspendReason.trim()) {
      alert("يرجى إدخال سبب الإيقاف");
      return;
    }
    try {
      setSuspendLoading(true);
      const res = await apiClient.post(`/wholesale/manage/distributors/${suspendDistributor.id}/suspend`, {
        reason: suspendReason.trim(),
      });

      if (res.data?.success) {
        setSuccessBanner(`تم إيقاف حساب الموزع (${suspendDistributor.name}) بنجاح`);
        setSuspendDistributor(null);
        setSuspendReason("تجاوز الحد الائتماني وتأخر في السداد");
        await loadQueue();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إيقاف الموزع");
    } finally {
      setSuspendLoading(false);
    }
  };

  // Handle Resume Distributor
  const handleResume = async () => {
    if (!resumeDistributor) return;
    try {
      setResumeLoading(true);
      const res = await apiClient.post(`/wholesale/manage/distributors/${resumeDistributor.id}/resume`, {
        reason: resumeReason.trim() || undefined,
      });

      if (res.data?.success) {
        setSuccessBanner(`تمت إعادة تفعيل حساب الموزع (${resumeDistributor.name}) بنجاح`);
        setResumeDistributor(null);
        setResumeReason("تمت تسوية الحساب وتحديث الضمانات");
        await loadQueue();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "فشل إعادة تفعيل الموزع");
    } finally {
      setResumeLoading(false);
    }
  };

  // Filtered views with safe null checks
  const filteredPending = useMemo(() => {
    if (!data?.groups?.pendingOrders) return [];
    if (!searchTerm.trim()) return data.groups.pendingOrders;
    const term = searchTerm.toLowerCase();
    return data.groups.pendingOrders.filter(
      (o) =>
        (o.orderNumber || "").toLowerCase().includes(term) ||
        (o.distributor.name || "").toLowerCase().includes(term) ||
        (o.distributor.phone || "").includes(term)
    );
  }, [data?.groups?.pendingOrders, searchTerm]);

  const filteredOverLimit = useMemo(() => {
    if (!data?.groups?.overLimitDistributors) return [];
    if (!searchTerm.trim()) return data.groups.overLimitDistributors;
    const term = searchTerm.toLowerCase();
    return data.groups.overLimitDistributors.filter(
      (c) => (c.name || "").toLowerCase().includes(term) || (c.phone || "").includes(term)
    );
  }, [data?.groups?.overLimitDistributors, searchTerm]);

  const filteredSuspended = useMemo(() => {
    if (!data?.groups?.suspendedDistributors) return [];
    if (!searchTerm.trim()) return data.groups.suspendedDistributors;
    const term = searchTerm.toLowerCase();
    return data.groups.suspendedDistributors.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(term) ||
        (c.phone || "").includes(term) ||
        (c.notes && c.notes.toLowerCase().includes(term))
    );
  }, [data?.groups?.suspendedDistributors, searchTerm]);

  const filteredFulfillment = useMemo(() => {
    if (!data?.groups?.processingOrders) return [];
    if (!searchTerm.trim()) return data.groups.processingOrders;
    const term = searchTerm.toLowerCase();
    return data.groups.processingOrders.filter(
      (o) =>
        (o.orderNumber || "").toLowerCase().includes(term) ||
        (o.distributor.name || "").toLowerCase().includes(term) ||
        (o.distributor.phone || "").includes(term)
    );
  }, [data?.groups?.processingOrders, searchTerm]);

  const counts = data?.counts || {
    pendingOrdersCount: 0,
    pendingOrdersAmount: 0,
    overLimitDistributorsCount: 0,
    totalOverLimitAmount: 0,
    suspendedDistributorsCount: 0,
    processingOrdersCount: 0,
    processingOrdersAmount: 0,
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-5" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Layers className="size-4.5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              شاشة العمل اليومية لإدارة الموزعين
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary bg-primary/5">
              Live Queue
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            المنصة المركزية لإدارة طلبات الجملة بانتظار الاعتماد، مراجعة وتجميد الحسابات المتجاوزة للائتمان، ومتابعة أوامر التنفيذ
          </p>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/wholesale/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground text-xs font-mono transition-colors"
          >
            <Building2 className="size-3.5 text-primary" />
            <span>لوحة القيادة</span>
          </Link>
          <Link
            to="/wholesale/customers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground text-xs font-mono transition-colors"
          >
            <Users className="size-3.5 text-primary" />
            <span>دليل التجار</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadQueue()}
            disabled={loading}
            className="h-8.5 px-3 text-xs font-mono border-border/70"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث البيانات</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadQueue()} className="h-6 text-[10px]">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* 4 Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Pending Orders */}
        <div
          onClick={() => setActiveTab(activeTab === "pending" ? "all" : "pending")}
          className={`cursor-pointer bg-card border rounded-lg p-3.5 shadow-xs transition-all hover:border-primary/50 ${
            activeTab === "pending" ? "ring-2 ring-primary/40 border-primary" : "border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">طلبات بانتظار التأكيد</span>
            <span className="size-7 rounded-md flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Clock className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {counts.pendingOrdersCount}
            </span>
            <span className="text-xs text-rose-500 font-semibold">طلب معلق</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            إجمالي: {counts.pendingOrdersAmount.toLocaleString("en-US")} ج.م
          </p>
        </div>

        {/* Card 2: Over Limit Distributors */}
        <div
          onClick={() => setActiveTab(activeTab === "overlimit" ? "all" : "overlimit")}
          className={`cursor-pointer bg-card border rounded-lg p-3.5 shadow-xs transition-all hover:border-primary/50 ${
            activeTab === "overlimit" ? "ring-2 ring-primary/40 border-primary" : "border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">تجاوزات الحد الائتماني</span>
            <span className="size-7 rounded-md flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {counts.overLimitDistributorsCount}
            </span>
            <span className="text-xs text-amber-500 font-semibold">موزع متجاوز</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            مبالغ تجاوز: {counts.totalOverLimitAmount.toLocaleString("en-US")} ج.م
          </p>
        </div>

        {/* Card 3: Suspended Distributors */}
        <div
          onClick={() => setActiveTab(activeTab === "suspended" ? "all" : "suspended")}
          className={`cursor-pointer bg-card border rounded-lg p-3.5 shadow-xs transition-all hover:border-primary/50 ${
            activeTab === "suspended" ? "ring-2 ring-primary/40 border-primary" : "border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">موزعون موقوفون</span>
            <span className="size-7 rounded-md flex items-center justify-center bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
              <Ban className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {counts.suspendedDistributorsCount}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">حساب موقوف</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">ممنوعون من سحب بضاعة</p>
        </div>

        {/* Card 4: Processing / Fulfillment Orders */}
        <div
          onClick={() => setActiveTab(activeTab === "fulfillment" ? "all" : "fulfillment")}
          className={`cursor-pointer bg-card border rounded-lg p-3.5 shadow-xs transition-all hover:border-primary/50 ${
            activeTab === "fulfillment" ? "ring-2 ring-primary/40 border-primary" : "border-border/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">طلبات قيد التنفيذ اليومية</span>
            <span className="size-7 rounded-md flex items-center justify-center bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <ShoppingBag className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {counts.processingOrdersCount}
            </span>
            <span className="text-xs text-sky-500 font-semibold">طلب جاري</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            إجمالي: {counts.processingOrdersAmount.toLocaleString("en-US")} ج.م
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border/70 p-3 rounded-lg">
        {/* Period Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
          <span className="text-muted-foreground text-[11px] ml-1">النطاق الزمني:</span>
          {[
            { id: "today", label: "اليوم" },
            { id: "week", label: "هذا الأسبوع" },
            { id: "month", label: "هذا الشهر" },
            { id: "all", label: "كل الفترات" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                period === p.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tab Filter & Search */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="بحث بالطلب أو اسم/هاتف الموزع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pr-8 pl-3 text-xs bg-muted/20 border-border/70"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activeTab === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              عرض الكل
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BLOCK 1: Pending Orders Awaiting Confirmation */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "pending") && (
        <div className="bg-card border border-border/70 rounded-lg p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
                <Clock className="size-3.5" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                ١. طلبات الجملة بانتظار الاعتماد والتأكيد
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono text-rose-500 border-rose-500/30 bg-rose-500/5">
                {filteredPending.length} طلب
              </Badge>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              التأكيد المباشر يولّد فاتورة ويحدث رصيد الموزع آلياً
            </span>
          </div>

          {filteredPending.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="size-8 text-emerald-500/80" />
              <p className="text-xs font-mono">لا توجد طلبات جملة معلقة بانتظار التأكيد حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-[11px] bg-muted/20">
                    <th className="p-2.5 font-semibold">رقم الطلب</th>
                    <th className="p-2.5 font-semibold">الموزع / الهاتف</th>
                    <th className="p-2.5 font-semibold">الأصناف</th>
                    <th className="p-2.5 font-semibold">قيمة الطلب</th>
                    <th className="p-2.5 font-semibold">رصيد الموزع والحد الائتماني</th>
                    <th className="p-2.5 font-semibold">وقت الطلب</th>
                    <th className="p-2.5 font-semibold text-center">أفعال سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredPending.map((order) => {
                    const isOverLimit = order.distributor.isOverLimit;
                    const isSuspended = order.distributor.isActive === false;

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-bold">
                          <Link
                            to={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <span>#{order.orderNumber}</span>
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </Link>
                        </td>
                        <td className="p-2.5">
                          <div>
                            {order.distributor.id ? (
                              <Link
                                to={`/wholesale/customers/${order.distributor.id}`}
                                className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                              >
                                <span>{order.distributor.name}</span>
                                <ArrowUpRight className="size-2.5 rtl:rotate-90 text-primary" />
                              </Link>
                            ) : (
                              <span className="font-semibold text-foreground">{order.distributor.name}</span>
                            )}
                            <div className="text-[10px] text-muted-foreground">{order.distributor.phone}</div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="max-w-[200px] truncate text-[11px]" title={order.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}>
                            {order.items.length > 0
                              ? order.items.map((i) => `${i.productName || "صنف"} × ${i.quantity}`).join("، ")
                              : `${order.itemCount} أصناف`}
                          </div>
                        </td>
                        <td className="p-2.5 font-bold text-foreground">
                          {order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-2.5">
                          <div className="space-y-1">
                            <div className="text-[11px] text-muted-foreground">
                              رصيد: {(order.distributor.currentBalance || 0).toLocaleString("en-US")} / حد: {(order.distributor.creditLimit || 0).toLocaleString("en-US")}
                            </div>
                            {isSuspended && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                ⛔ موزع موقوف
                              </Badge>
                            )}
                            {isOverLimit && !isSuspended && (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px] px-1 py-0 h-4">
                                ⚠️ يتجاوز الحد (+{(order.distributor.excessAmount || 0).toLocaleString("en-US")})
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-muted-foreground text-[10px]">
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              disabled={isSuspended}
                              title={isSuspended ? "لا يمكن تأكيد الطلب لموزع موقوف حالياً" : "تأكيد واعتماد الطلب"}
                              onClick={() => {
                                setConfirmModalOrder(order);
                                setConfirmNotes("");
                              }}
                              className={`h-7 px-2.5 text-xs font-mono shadow-xs active:scale-95 ${
                                isSuspended
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              <Check className="size-3 mr-1" />
                              <span>{isSuspended ? "موقوف" : "تأكيد واعتماد"}</span>
                            </Button>
                            <Link
                              to={`/orders/${order.id}`}
                              className="inline-flex items-center justify-center size-7 rounded-md border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="عرض تفاصيل الطلب"
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCK 2: Over-Limit & At-Risk Distributors */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "overlimit") && (
        <div className="bg-card border border-border/70 rounded-lg p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                <ShieldAlert className="size-3.5" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                ٢. تنبيهات تجاوز الحد الائتماني (مخاطر التحصيل)
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/30 bg-amber-500/5">
                {filteredOverLimit.length} حساب متجاوز
              </Badge>
            </div>
            <Link
              to="/wholesale/debts"
              className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>تقرير أعمار الديون الكامل</span>
              <ArrowUpRight className="size-3 rtl:rotate-90" />
            </Link>
          </div>

          {filteredOverLimit.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
              <CheckCircle2 className="size-7 text-emerald-500/80" />
              <p className="text-xs font-mono">ممتاز! لا يوجد أي تاجر أو موزع متجاوز للحد الائتماني المتفق عليه</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-[11px] bg-muted/20">
                    <th className="p-2.5 font-semibold">الموزع</th>
                    <th className="p-2.5 font-semibold">الهاتف</th>
                    <th className="p-2.5 font-semibold">الرصيد الحالي</th>
                    <th className="p-2.5 font-semibold">الحد الائتماني</th>
                    <th className="p-2.5 font-semibold">قيمة التجاوز</th>
                    <th className="p-2.5 font-semibold">نسبة الاستهلاك</th>
                    <th className="p-2.5 font-semibold text-center">إجراء فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredOverLimit.map((dist) => (
                    <tr key={dist.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5">
                        <Link
                          to={`/wholesale/customers/${dist.id}`}
                          className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                        >
                          <span>{dist.name}</span>
                          <ArrowUpRight className="size-2.5 rtl:rotate-90 text-primary" />
                        </Link>
                      </td>
                      <td className="p-2.5 text-muted-foreground">{dist.phone}</td>
                      <td className="p-2.5 font-bold text-rose-500">
                        {dist.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {dist.creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2.5 font-bold text-rose-600 dark:text-rose-400">
                        +{dist.excessAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.min(dist.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-rose-500">{dist.utilizationPercent}%</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {dist.isActive ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSuspendDistributor(dist);
                                setSuspendReason("تجاوز الحد الائتماني وتأخر في السداد");
                              }}
                              className="h-7 px-2.5 text-xs font-mono shadow-xs active:scale-95"
                            >
                              <Ban className="size-3 mr-1" />
                              <span>إيقاف الموزع</span>
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-zinc-500/40 text-zinc-400 bg-zinc-500/10">
                              موقوف بالفعل
                            </Badge>
                          )}
                          <Link
                            to={`/wholesale/customers/${dist.id}?tab=statement`}
                            className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] transition-colors"
                          >
                            <span>كشف حساب</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCK 3: Suspended Distributors */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "suspended") && (
        <div className="bg-card border border-border/70 rounded-lg p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center justify-center">
                <Ban className="size-3.5" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                ٣. الموزعون الموقوفون والمعلقون
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 border-zinc-500/30 bg-zinc-500/5">
                {filteredSuspended.length} موقوف
              </Badge>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              الحسابات الموقوفة تمنع إصدار أي طلبيات جديدة أو تأكيدها
            </span>
          </div>

          {filteredSuspended.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
              <ShieldCheck className="size-7 text-primary/70" />
              <p className="text-xs font-mono">لا يوجد موزعون موقوفون حالياً، شبكة التوزيع نشطة بالكامل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-[11px] bg-muted/20">
                    <th className="p-2.5 font-semibold">الموزع</th>
                    <th className="p-2.5 font-semibold">الهاتف</th>
                    <th className="p-2.5 font-semibold">الرصيد القائم</th>
                    <th className="p-2.5 font-semibold">الحد الائتماني</th>
                    <th className="p-2.5 font-semibold">سبب الإيقاف وملاحظات</th>
                    <th className="p-2.5 font-semibold text-center">أفعال سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSuspended.map((dist) => (
                    <tr key={dist.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5">
                        <Link
                          to={`/wholesale/customers/${dist.id}`}
                          className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                        >
                          <span>{dist.name}</span>
                          <ArrowUpRight className="size-2.5 rtl:rotate-90 text-primary" />
                        </Link>
                      </td>
                      <td className="p-2.5 text-muted-foreground">{dist.phone}</td>
                      <td className="p-2.5 font-bold text-foreground">
                        {dist.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {dist.creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2.5 text-rose-500 font-sans text-[11px] max-w-[280px] truncate" title={dist.notes}>
                        {dist.notes}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResumeDistributor(dist);
                              setResumeReason("تمت تسوية الحساب وتحديث الضمانات");
                            }}
                            className="h-7 px-2.5 text-xs font-mono text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 shadow-xs active:scale-95"
                          >
                            <UserCheck className="size-3 mr-1 text-emerald-500" />
                            <span>إعادة التفعيل</span>
                          </Button>
                          <Link
                            to={`/wholesale/customers/${dist.id}`}
                            className="inline-flex items-center justify-center size-7 rounded-md border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="عرض الملف"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BLOCK 4: Active Fulfillment / Processing Orders */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "fulfillment") && (
        <div className="bg-card border border-border/70 rounded-lg p-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
                <Package className="size-3.5" />
              </span>
              <h2 className="text-base font-bold text-foreground">
                ٤. طلبات التوريد الجارية وقيد التنفيذ
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono text-sky-500 border-sky-500/30 bg-sky-500/5">
                {filteredFulfillment.length} طلب نشط
              </Badge>
            </div>
            <Link
              to="/orders"
              className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>مركز الطلبات الرئيسي</span>
              <ArrowUpRight className="size-3 rtl:rotate-90" />
            </Link>
          </div>

          {filteredFulfillment.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
              <ShoppingBag className="size-7 text-muted-foreground/60" />
              <p className="text-xs font-mono">لا توجد طلبات توريد نشطة خلال الفترة المختارة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-right">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-[11px] bg-muted/20">
                    <th className="p-2.5 font-semibold">رقم الطلب</th>
                    <th className="p-2.5 font-semibold">الموزع</th>
                    <th className="p-2.5 font-semibold">حالة الطلب</th>
                    <th className="p-2.5 font-semibold">إجمالي القيمة</th>
                    <th className="p-2.5 font-semibold">عدد الأصناف</th>
                    <th className="p-2.5 font-semibold">تاريخ الاعتماد / الإنشاء</th>
                    <th className="p-2.5 font-semibold text-center">أفعال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredFulfillment.map((order) => {
                    const statusBadgeColors: Record<string, string> = {
                      CONFIRMED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                      PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/30",
                      SHIPPED: "bg-purple-500/10 text-purple-500 border-purple-500/30",
                    };
                    const statusLabels: Record<string, string> = {
                      CONFIRMED: "مؤكد",
                      PROCESSING: "قيد التجهيز",
                      SHIPPED: "تم الشحن",
                    };

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-bold">
                          <Link
                            to={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <span>#{order.orderNumber}</span>
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </Link>
                        </td>
                        <td className="p-2.5">
                          {order.distributor.id ? (
                            <Link
                              to={`/wholesale/customers/${order.distributor.id}`}
                              className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                            >
                              <span>{order.distributor.name}</span>
                              <ArrowUpRight className="size-2.5 rtl:rotate-90 text-primary" />
                            </Link>
                          ) : (
                            <span className="font-semibold text-foreground">{order.distributor.name}</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono px-2 py-0.5 ${
                              statusBadgeColors[order.status] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-bold text-foreground">
                          {order.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-2.5 text-muted-foreground">{order.itemCount} أصناف</td>
                        <td className="p-2.5 text-muted-foreground text-[10px]">
                          {new Date(order.confirmedAt || order.createdAt).toLocaleDateString("ar-EG", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-2.5 text-center">
                          <Link
                            to={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono"
                          >
                            <span>عرض الطلب</span>
                            <ArrowUpRight className="size-3 rtl:rotate-90" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Confirm Order Dialog */}
      {/* ========================================================================= */}
      {confirmModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                  <Check className="size-4" />
                </span>
                <h3 className="text-base font-bold text-foreground">اعتماد وتأكيد طلب الجملة</h3>
              </div>
              <button
                onClick={() => setConfirmModalOrder(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">رقم الطلب:</span>
                <span className="font-bold text-foreground">#{confirmModalOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">الموزع:</span>
                <span className="font-bold text-foreground">{confirmModalOrder.distributor.name}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">قيمة الفاتورة:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {confirmModalOrder.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>

              {confirmModalOrder.distributor.isOverLimit && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="size-3.5" />
                    <span>تنبيه: سيؤدي التأكيد لتجاوز الحد الائتماني</span>
                  </div>
                  <p className="text-[10px]">
                    الرصيد الحالي: {(confirmModalOrder.distributor.currentBalance || 0).toLocaleString("en-US")} ج.م | الحد: {(confirmModalOrder.distributor.creditLimit || 0).toLocaleString("en-US")} ج.م
                  </p>
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="text-[11px] text-muted-foreground font-semibold">ملاحظات التأكيد (اختياري):</label>
                <Input
                  type="text"
                  placeholder="مثال: اعتماد بناءً على دفعة نقدية / موافقة إدارة الائتمان"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="h-8.5 text-xs bg-muted/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalOrder(null)}
                disabled={confirmLoading}
                className="h-8 text-xs font-mono"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => void handleConfirmOrder()}
                disabled={confirmLoading}
                className="h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {confirmLoading ? (
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="size-3.5 mr-1.5" />
                )}
                <span>تأكيد الطلب وتوليد الفاتورة</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Suspend Distributor Dialog */}
      {/* ========================================================================= */}
      {suspendDistributor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
                  <Ban className="size-4" />
                </span>
                <h3 className="text-base font-bold text-foreground">إيقاف وتجميد حساب الموزع</h3>
              </div>
              <button
                onClick={() => setSuspendDistributor(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">اسم الموزع:</span>
                  <span className="font-bold text-foreground">{suspendDistributor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرصيد القائم:</span>
                  <span className="font-bold text-rose-500">
                    {suspendDistributor.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحد الائتماني:</span>
                  <span className="text-muted-foreground">
                    {suspendDistributor.creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              </div>

              {/* Preset Reason Pills */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-semibold">اختر سبب الإيقاف:</label>
                <div className="flex flex-wrap gap-1.5 font-sans text-[11px]">
                  {[
                    "تجاوز الحد الائتماني",
                    "تأخر غير مبرر في السداد",
                    "شيكات بنكية مرتجعة",
                    "مراجعة دورية للضمانات",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSuspendReason(preset)}
                      className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                        suspendReason === preset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/70"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-semibold">تفاصيل السبب (يتم توثيقها في ملف الموزع):</label>
                <Input
                  type="text"
                  placeholder="سبب إيقاف الحساب..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="h-8.5 text-xs bg-muted/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspendDistributor(null)}
                disabled={suspendLoading}
                className="h-8 text-xs font-mono"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleSuspend()}
                disabled={suspendLoading || !suspendReason.trim()}
                className="h-8 text-xs font-mono shadow-xs"
              >
                {suspendLoading ? (
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <Ban className="size-3.5 mr-1.5" />
                )}
                <span>تأكيد إيقاف الحساب</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Resume Distributor Dialog */}
      {/* ========================================================================= */}
      {resumeDistributor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                  <UserCheck className="size-4" />
                </span>
                <h3 className="text-base font-bold text-foreground">إعادة تفعيل حساب الموزع</h3>
              </div>
              <button
                onClick={() => setResumeDistributor(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">اسم الموزع:</span>
                  <span className="font-bold text-foreground">{resumeDistributor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرصيد القائم:</span>
                  <span className="font-bold text-foreground">
                    {resumeDistributor.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">سبب الإيقاف السابق:</span>
                  <span className="text-rose-500 max-w-[200px] truncate">{resumeDistributor.notes}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-semibold">ملاحظات إعادة التفعيل:</label>
                <Input
                  type="text"
                  placeholder="مثال: تم سداد المستحقات المتأخرة / تجديد الضمانات"
                  value={resumeReason}
                  onChange={(e) => setResumeReason(e.target.value)}
                  className="h-8.5 text-xs bg-muted/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResumeDistributor(null)}
                disabled={resumeLoading}
                className="h-8 text-xs font-mono"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => void handleResume()}
                disabled={resumeLoading}
                className="h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {resumeLoading ? (
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <UserCheck className="size-3.5 mr-1.5" />
                )}
                <span>تأكيد إعادة التفعيل</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
