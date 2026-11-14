import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, BellRing, CheckCheck, ExternalLink, Settings } from "lucide-react";
import { apiClient } from "../../../services/api";
import useSocket from "../../../hooks/useSocket";

export interface OrderStatusAlertItem {
  id: string;
  title: string;
  message: string;
  isRead?: boolean;
  createdAt?: string;
  orderNumber?: string;
  oldStatusLabel?: string;
  newStatusLabel?: string;
  changedByName?: string;
  customerName?: string | null;
  formattedTime?: string;
  url?: string;
}

function normalizeNotificationItem(raw: any): OrderStatusAlertItem | null {
  if (!raw || typeof raw !== "object") return null;
  const meta =
    raw.data && typeof raw.data === "object"
      ? raw.data
      : raw.metadata && typeof raw.metadata === "object"
        ? raw.metadata
        : raw;

  const orderNumber = meta.orderNumber ? String(meta.orderNumber) : undefined;
  const targetUrl =
    typeof meta.url === "string" && meta.url.startsWith("/")
      ? meta.url
      : orderNumber
        ? `/orders/${encodeURIComponent(orderNumber)}`
        : "/orders";

  return {
    id: String(raw.id || meta.id || `alert-${Date.now()}`),
    title: String(raw.title || `تنبيه تغيير حالة الطلب #${orderNumber || ""}`),
    message: String(raw.message || ""),
    isRead: Boolean(raw.isRead),
    createdAt: raw.createdAt || meta.timestamp,
    orderNumber,
    oldStatusLabel: meta.oldStatusLabel,
    newStatusLabel: meta.newStatusLabel,
    changedByName: meta.changedByName,
    customerName: meta.customerName || null,
    formattedTime: meta.formattedTime,
    url: targetUrl,
  };
}

export const OrderStatusAlertBell: React.FC = () => {
  const navigate = useNavigate();
  const { on, off } = useSocket();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<OrderStatusAlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadRecentAlerts = useCallback(async () => {
    try {
      const res = await apiClient.get(
        "/notifications/recent?type=order_status_alert&limit=15",
      );
      if (res.data?.success && Array.isArray(res.data?.notifications)) {
        const mapped = res.data.notifications
          .map(normalizeNotificationItem)
          .filter(Boolean) as OrderStatusAlertItem[];
        setAlerts(mapped);
        setUnreadCount(
          typeof res.data.unreadCount === "number"
            ? res.data.unreadCount
            : mapped.filter((item) => !item.isRead).length,
        );
      }
    } catch (error) {
      console.warn("Failed to load recent order status alerts:", error);
    }
  }, []);

  useEffect(() => {
    void loadRecentAlerts();
  }, [loadRecentAlerts]);

  const handleOpenAlert = useCallback(
    async (item: OrderStatusAlertItem) => {
      setOpen(false);
      if (!item.isRead && item.id && !item.id.startsWith("alert-") && !item.id.startsWith("test-alert-")) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, isRead: true } : a)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        try {
          await apiClient.post(`/notifications/${encodeURIComponent(item.id)}/read`);
        } catch (_) {}
      }
      navigate(item.url || "/orders");
    },
    [navigate],
  );

  useEffect(() => {
    const handleRealtimeAlert = (rawPayload: any) => {
      const item = normalizeNotificationItem(rawPayload);
      if (!item) return;

      setAlerts((prev) => {
        const exists = prev.some((existing) => existing.id === item.id);
        if (exists) return prev;
        return [{ ...item, isRead: false }, ...prev].slice(0, 20);
      });
      setUnreadCount((c) => c + 1);

      const summaryParts = [
        item.orderNumber ? `#${item.orderNumber}` : null,
        item.oldStatusLabel && item.newStatusLabel
          ? `${item.oldStatusLabel} → ${item.newStatusLabel}`
          : item.newStatusLabel || null,
        item.changedByName ? `بواسطة ${item.changedByName}` : null,
        item.customerName ? `العميل: ${item.customerName}` : null,
      ].filter(Boolean);

      toast(item.title, {
        description: summaryParts.join(" · ") || item.message,
        duration: 7000,
        action: {
          label: item.url?.startsWith("/settings") ? "فتح الإعدادات" : "فتح الطلب",
          onClick: () => {
            void handleOpenAlert(item);
          },
        },
      });
    };

    on("order:status_alert", handleRealtimeAlert);
    return () => {
      off("order:status_alert", handleRealtimeAlert);
    };
  }, [on, off, handleOpenAlert]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.isRead).map((a) => a.id);
    if (unreadIds.length === 0) return;

    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    setUnreadCount(0);

    await Promise.allSettled(
      unreadIds
        .filter((id) => !id.startsWith("alert-") && !id.startsWith("test-alert-"))
        .map((id) => apiClient.post(`/notifications/${encodeURIComponent(id)}/read`)),
    );
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="تنبيهات حالات الطلبات"
        aria-expanded={open}
        data-testid="order-status-alert-bell-btn"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/60 text-xs font-medium text-foreground shadow-2xs transition-colors cursor-pointer"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-3.5 h-3.5 text-primary animate-pulse" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span>تنبيهات الحالات</span>
        {unreadCount > 0 && (
          <span
            data-testid="order-status-alert-unread-badge"
            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="order-status-alert-dropdown"
          className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 rounded-xl border border-border bg-card text-foreground shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/70 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <BellRing className="w-3.5 h-3.5 text-primary" />
              <span>أحدث تنبيهات تغيير الحالة</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>تحديد الكل كمقروء</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/settings/orders/status-alerts");
                }}
                aria-label="إعدادات تنبيهات الحالات"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                لا توجد تنبيهات لتغيير الحالات حتى الآن
              </div>
            ) : (
              alerts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleOpenAlert(item)}
                  className={`w-full text-right px-3.5 py-2.5 hover:bg-muted/50 transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                    item.isRead ? "opacity-75" : "bg-primary/5"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {item.message}
                    </p>
                    {item.formattedTime && (
                      <div className="text-[10px] text-muted-foreground/80">
                        {item.formattedTime}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusAlertBell;
