import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { buildApiUrl } from "../../../utils/urlHelper";
import { tokenManager } from "../../../utils/tokenManager";
import { socketService } from "../../../services/socketService";

const REFRESH_INTERVAL_MS = 30000;

export interface SidebarBadges {
  newOrders?: string;
  unreadTickets?: string;
}

export function useSidebarBadges(): SidebarBadges {
  const { user, isAuthenticated } = useAuth();
  const [newOrders, setNewOrders] = useState<string | undefined>(undefined);
  const [unreadTickets, setUnreadTickets] = useState<string | undefined>(undefined);

  const fetchNewOrders = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    const token = tokenManager.getAccessToken();
    if (!token) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl("orders-v2/simple/new-count"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const count = data.data.count || 0;
          setNewOrders(
            count > 0 ? (count > 99 ? "99+" : String(count)) : undefined,
          );
        }
      }
    } catch (error) {
      // silent fail
    }
  }, [isAuthenticated, user]);

  const fetchUnreadTickets = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    const activeApps = (user as any)?.company?.activeApps;
    if (Array.isArray(activeApps) && activeApps.length > 0 && !activeApps.some((a: string) => ['order-shipping-turbo', 'order-shipping-hub', 'order-shipping'].includes(a))) {
      return;
    }
    const token = tokenManager.getAccessToken();
    if (!token) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl("turbo/tickets/unread-count"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const counts = data.data?.counts || data.counts || {};
          const count = Number(counts.tickets || 0);
          setUnreadTickets(
            count > 0 ? (count > 99 ? "99+" : String(count)) : undefined,
          );
        }
      }
    } catch {
      // silent fail if turbo not configured or company has no shipping app
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchNewOrders();
    fetchUnreadTickets();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNewOrders();
        fetchUnreadTickets();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNewOrders();
        fetchUnreadTickets();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNewOrders, fetchUnreadTickets]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    socketService.getSocket();

    const handleOrderCreated = () => fetchNewOrders();
    const handleOrderUpdated = () => fetchNewOrders();

    socketService.on("order:created", handleOrderCreated);
    socketService.on("order:updated", handleOrderUpdated);

    return () => {
      socketService.off("order:created", handleOrderCreated);
      socketService.off("order:updated", handleOrderUpdated);
    };
  }, [isAuthenticated, user, fetchNewOrders]);

  return useMemo(() => ({ newOrders, unreadTickets }), [newOrders, unreadTickets]);
}