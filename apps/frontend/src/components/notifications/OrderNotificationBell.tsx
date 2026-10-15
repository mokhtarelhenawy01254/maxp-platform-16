import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildApiUrl } from "../../utils/urlHelper";
import { tokenManager } from "../../utils/tokenManager";
import { socketService } from "../../services/socketService";
import { canUserAccessOrders } from "../layout/sidebar/useSidebarBadges";
import {
  Bell,
  ShoppingBag,
  X,
  CheckCircle2,
  CheckCheck,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface NewOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  status: string;
  createdAt: string;
  isViewed: boolean;
  type: "ORDER" | "GUEST_ORDER";
  displayName: string;
  displayTotal: number;
}

const OrderNotificationBell: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrders, setNewOrders] = useState<NewOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeApps = useMemo(() => {
    return (
      (user as any)?.company?.activeApps ||
      (user as any)?.companies?.find((c: any) => c.id === (user as any)?.companyId)?.activeApps ||
      []
    );
  }, [user]);

  const canAccessOrders = useMemo(() => canUserAccessOrders(user, activeApps), [user, activeApps]);
  const getToken = () => tokenManager.getAccessToken();

  const fetchNewOrdersCount = useCallback(async () => {
    if (!user || !isAuthenticated || !canAccessOrders) return;
    const token = getToken();
    if (!token) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(buildApiUrl("orders-v2/simple/new-count"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) setNewOrdersCount(data.data.count || 0);
      }
    } catch {
      // silent fail
    }
  }, [isAuthenticated, user, canAccessOrders]);

  const fetchNewOrdersList = useCallback(async () => {
    if (!user || !isAuthenticated || !canAccessOrders) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(buildApiUrl("orders-v2/simple/new-list?limit=10"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setNewOrders(data.data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, canAccessOrders]);

  const markOrderAsViewed = useCallback(async (orderId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(buildApiUrl(`orders-v2/simple/${orderId}/viewed`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch {
      // silent fail
    }
  }, []);

  const markAllAsViewed = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl("orders-v2/simple/mark-all-viewed"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        setNewOrdersCount(0);
        setNewOrders([]);
        setIsOpen(false);
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleOrderClick = useCallback(
    async (order: NewOrderItem) => {
      await markOrderAsViewed(order.id);
      setNewOrdersCount((prev) => Math.max(0, prev - 1));
      setNewOrders((prev) => prev.filter((o) => o.id !== order.id));
      setIsOpen(false);
      navigate(`/orders?search=${order.orderNumber}`);
    },
    [markOrderAsViewed, navigate],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || !canAccessOrders) return;
    fetchNewOrdersCount();
    const handleVisibility = () => { if (!document.hidden) fetchNewOrdersCount(); };
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(() => { if (!document.hidden) fetchNewOrdersCount(); }, 30000);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNewOrdersCount, isAuthenticated, user, canAccessOrders]);

  useEffect(() => {
    if (!isAuthenticated || !user || !canAccessOrders) return;
    socketService.getSocket();
    const handleOrderEvent = () => {
      fetchNewOrdersCount();
      if (isOpen) fetchNewOrdersList();
    };
    socketService.on("order:created", handleOrderEvent);
    socketService.on("order:updated", handleOrderEvent);
    return () => {
      socketService.off("order:created", handleOrderEvent);
      socketService.off("order:updated", handleOrderEvent);
    };
  }, [isAuthenticated, user, isOpen, fetchNewOrdersCount, fetchNewOrdersList, canAccessOrders]);

  useEffect(() => {
    if (!isOpen || !canAccessOrders) return;
    fetchNewOrdersList();
    const interval = setInterval(() => { if (!document.hidden) fetchNewOrdersList(); }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, fetchNewOrdersList, canAccessOrders]);

  const formatTimestamp = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days < 7) return `منذ ${days} ي`;
    return new Date(timestamp).toLocaleDateString("ar-EG");
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  };

  if (!user || !canAccessOrders) return null;
  const hasNew = newOrdersCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="الطلبات الجديدة"
        aria-label="الطلبات الجديدة"
      >
        <Bell className={`h-4.5 w-4.5 transition-colors ${hasNew ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground"}`} />
        {hasNew && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono tabular-nums font-bold text-white bg-rose-500 rounded-full border-2 border-background shadow-xs">
            {newOrdersCount > 99 ? "99+" : newOrdersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute ltr:right-0 rtl:left-0 z-50 mt-2 max-h-[420px] w-96 max-w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">الطلبات الجديدة</h3>
              {hasNew && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-bold text-white bg-rose-500 rounded-full">
                  {newOrdersCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasNew && (
                <button
                  type="button"
                  onClick={markAllAsViewed}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors px-2 py-0.5 rounded-md hover:bg-primary/10"
                >
                  <CheckCheck className="size-3" />
                  تعليم الكل مقروء
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                aria-label="إغلاق"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Loader2 className="animate-spin size-5 mx-auto mb-2 text-primary" />
                <p className="text-xs">جاري فحص الطلبات...</p>
              </div>
            ) : newOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500/80" />
                <p className="text-xs font-semibold text-foreground">لا توجد طلبات جديدة</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">جميع الطلبات تمت مراجعتها</p>
              </div>
            ) : (
              newOrders.map((order) => (
                <button
                  key={`${order.type}-${order.id}`}
                  type="button"
                  onClick={() => handleOrderClick(order)}
                  className="w-full text-right px-3.5 py-2.5 hover:bg-muted/50 transition-colors duration-150 group flex items-start gap-3"
                >
                  <div className="shrink-0 mt-0.5 size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono tabular-nums font-semibold text-primary">#{order.orderNumber}</span>
                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{formatTimestamp(order.createdAt)}</span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate mt-0.5">{order.displayName || `#${order.orderNumber}`}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-mono tabular-nums font-semibold text-foreground">{formatAmount(order.displayTotal)} ج.م</span>
                      <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        فتح الطلب
                        <ArrowLeft className="size-3 rtl:rotate-0 ltr:rotate-180" />
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-border/60 bg-muted/20">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/orders?isViewed=false");
              }}
              className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors font-medium py-1 rounded-md hover:bg-primary/5"
            >
              عرض جميع الطلبات
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderNotificationBell;
