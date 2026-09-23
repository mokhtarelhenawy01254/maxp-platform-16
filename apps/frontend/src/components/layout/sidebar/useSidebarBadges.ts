import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { socketService } from "../../../services/socketService";

const REFRESH_INTERVAL_MS = 30000;

export const ORDER_CORE_APPS = [
  "order-core",
  "store",
  "store-basic",
  "store-pro",
  "ecommerce-basic",
  "ecommerce-pro",
  "pos-pro",
  "cafe-restaurant-pro",
];

export const canUserAccessOrders = (user: any, activeApps: string[]): boolean => {
  if (!user) return false;
  if (user.role === "AFFILIATE") return false;

  // If company activeApps is populated and non-empty, require at least one order/store app
  if (Array.isArray(activeApps) && activeApps.length > 0) {
    const hasOrderApp = activeApps.some((a: any) => {
      const slug = typeof a === "string" ? a : a?.slug || a?.app?.slug;
      return typeof slug === "string" && ORDER_CORE_APPS.includes(slug.trim().toLowerCase());
    });
    if (!hasOrderApp) return false;
  }

  const role = user.role || "";
  if (["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER"].includes(role)) {
    return true;
  }

  const permissions = user.permissions || [];
  if (permissions.length > 0) {
    return permissions.includes("orders.view");
  }

  return true;
};

export interface SidebarBadges {
  newOrders?: string;
  unreadTickets?: string;
}

export function useSidebarBadges(): SidebarBadges {
  const { user, isAuthenticated } = useAuth();
  const [newOrders, setNewOrders] = useState<string | undefined>(undefined);
  const [unreadTickets, setUnreadTickets] = useState<string | undefined>(undefined);

  const activeApps = useMemo(() => {
    return (
      (user as any)?.company?.activeApps ||
      (user as any)?.companies?.find((c: any) => c.id === (user as any)?.companyId)?.activeApps ||
      []
    );
  }, [user]);

  const fetchNewOrders = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    if (!canUserAccessOrders(user, activeApps)) {
      setNewOrders(undefined);
      return;
    }

    try {
      const response = await companyAwareApi.get<any>("orders-v2/simple/new-count", {
        timeout: 5000,
      });

      if (response.data?.success && response.data?.data) {
        const count = response.data.data.count || 0;
        setNewOrders(
          count > 0 ? (count > 99 ? "99+" : String(count)) : undefined,
        );
      }
    } catch (error) {
      // silent fail
    }
  }, [isAuthenticated, user, activeApps]);

  const fetchUnreadTickets = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    if (
      Array.isArray(activeApps) &&
      activeApps.length > 0 &&
      !activeApps.some((a: string) =>
        ["order-shipping-turbo", "order-shipping-hub", "order-shipping"].includes(a),
      )
    ) {
      return;
    }

    try {
      const response = await companyAwareApi.get<any>("turbo/tickets/unread-count", {
        timeout: 5000,
      });

      if (response.data?.success) {
        const counts = response.data.data?.counts || response.data.counts || {};
        const count = Number(counts.tickets || 0);
        setUnreadTickets(
          count > 0 ? (count > 99 ? "99+" : String(count)) : undefined,
        );
      }
    } catch {
      // silent fail if turbo not configured or company has no shipping app
    }
  }, [isAuthenticated, user, activeApps]);

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
    if (!isAuthenticated || !user || !canUserAccessOrders(user, activeApps)) return;

    socketService.getSocket();

    const handleOrderCreated = () => fetchNewOrders();
    const handleOrderUpdated = () => fetchNewOrders();

    socketService.on("order:created", handleOrderCreated);
    socketService.on("order:updated", handleOrderUpdated);

    return () => {
      socketService.off("order:created", handleOrderCreated);
      socketService.off("order:updated", handleOrderUpdated);
    };
  }, [isAuthenticated, user, activeApps, fetchNewOrders]);

  return useMemo(() => ({ newOrders, unreadTickets }), [newOrders, unreadTickets]);
}