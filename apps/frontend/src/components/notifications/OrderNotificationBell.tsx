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
      await fetch(buildApiUrl(`orders-v2/simple/mark-viewed/${orderId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setNewOrders((prev) => prev.filter((o) => o.id !== orderId));
      setNewOrdersCount((c) => Math.max(0, c - 1));
    } catch {
      // silent fail
    }
  }, []);

  const markAllAsViewed = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(buildApiUrl("orders-v2/simple/mark-all-viewed"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setNewOrders([]);
      setNewOrdersCount(0);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    if (!canAccessOrders) return;
    fetchNewOrdersCount();

    const intervalId = setInterval(fetchNewOrdersCount, 30000);
    return () => clearInterval(intervalId);
  }, [canAccessOrders, fetchNewOrdersCount]);

  useEffect(() => {
    if (!canAccessOrders) return;

    const handleNewOrder = () => {
      fetchNewOrdersCount();
      if (isOpen) fetchNewOrdersList();
    };

    socketService.on("order:new", handleNewOrder);
    socketService.on("new_order", handleNewOrder);
    socketService.on("order:created", handleNewOrder);

    return () => {
      socketService.off("order:new", handleNewOrder);
      socketService.off("new_order", handleNewOrder);
      socketService.off("order:created", handleNewOrder);
    };
  }, [canAccessOrders, fetchNewOrdersCount, fetchNewOrdersList, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNewOrdersList();
    }
  }, [isOpen, fetchNewOrdersList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleOrderClick = (order: NewOrderItem) => {
    markOrderAsViewed(order.id);
    setIsOpen(false);
    navigate(`/orders?orderNumber=${encodeURIComponent(order.orderNumber)}`);
  };

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return "الآن";
      if (diffMins < 60) return `منذ ${diffMins} د`;
      if (diffHours < 24) return `منذ ${diffHours} س`;
      return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const formatAmount = (amount: number) => {
    try {
      return Number(amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch {
      return String(amount || 0);
    }
  };

  if (!user || !canAccessOrders) return null;
  const hasNew = newOrdersCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-95 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
        title="الطلبات الجديدة"
        aria-label="الطلبات الجديدة"
      >
        <Bell className={`size-4.5 transition-colors ${hasNew ? "fill-amber-500/20 text-amber-500" : "text-muted-foreground"}`} />
        {hasNew && (
          <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-rose-500 px-1 font-mono text-[10px] font-bold text-white tabular-nums shadow-xs">
            {newOrdersCount > 99 ? "99+" : newOrdersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 flex max-h-[420px] w-96 max-w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-100 ltr:right-0 rtl:left-0" dir="rtl">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <ShoppingBag className="size-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">الطلبات الجديدة</h3>
              {hasNew && (
                <span className="inline-flex items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums">
                  {newOrdersCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {hasNew && (
                <button
                  type="button"
                  onClick={markAllAsViewed}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary/10 active:scale-97 cursor-pointer"
                >
                  <CheckCheck className="size-3" />
                  <span>تعليم الكل مقروء</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[300px] divide-y divide-border/40 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
                <p className="text-xs font-mono">جاري فحص الطلبات...</p>
              </div>
            ) : newOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 size-7 text-emerald-500/80" />
                <p className="text-xs font-semibold text-foreground">لا توجد طلبات جديدة</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">جميع الطلبات تمت مراجعتها</p>
              </div>
            ) : (
              newOrders.map((order) => (
                <button
                  key={`${order.type}-${order.id}`}
                  type="button"
                  onClick={() => handleOrderClick(order)}
                  className="group flex w-full items-start gap-3 px-4 py-3 text-right transition-all duration-150 hover:bg-muted/30 active:scale-[0.99] cursor-pointer"
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                    <ShoppingBag className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-primary tabular-nums">#{order.orderNumber}</span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{formatTimestamp(order.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-foreground">{order.displayName || `#${order.orderNumber}`}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground tabular-nums">{formatAmount(order.displayTotal)} ج.م</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100 font-medium">
                        فتح الطلب
                        <ArrowLeft className="size-3 rtl:rotate-0 ltr:rotate-180" />
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/orders?isViewed=false");
              }}
              className="w-full rounded-xl py-1.5 text-center text-xs font-semibold text-primary transition-all hover:bg-primary/10 active:scale-97 cursor-pointer"
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
