import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildApiUrl } from "../../utils/urlHelper";
import { tokenManager } from "../../utils/tokenManager";
import { socketService } from "../../services/socketService";
import { canUserAccessOrders } from "../layout/sidebar/useSidebarBadges";
import {
  BellIcon,
  ShoppingBagIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { BellIcon as BellSolidIcon } from "@heroicons/react/24/solid";

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

  const canAccessOrders = useMemo(() => {
    return canUserAccessOrders(user, activeApps);
  }, [user, activeApps]);

  const getToken = () => tokenManager.getAccessToken();

  const fetchNewOrdersCount = useCallback(async () => {
    if (!user || !isAuthenticated || !canAccessOrders) return;
    const token = getToken();
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
          setNewOrdersCount(data.data.count || 0);
        }
      }
    } catch (error) {
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

      const response = await fetch(buildApiUrl("orders-v2/simple/new-list?limit=10"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setNewOrders(data.data);
        }
      }
    } catch (error) {
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      // silent fail
    }
  }, []);

  const markAllAsViewed = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(buildApiUrl("orders-v2/simple/mark-all-viewed"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setNewOrdersCount(0);
        setNewOrders([]);
        setIsOpen(false);
      }
    } catch (error) {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!isAuthenticated || !user || !canAccessOrders) return;

    fetchNewOrdersCount();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNewOrdersCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNewOrdersCount();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNewOrdersCount, isAuthenticated, user, canAccessOrders]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user || !canAccessOrders) return;

    socketService.getSocket();

    const handleNewOrder = () => {
      fetchNewOrdersCount();
      if (isOpen) fetchNewOrdersList();
    };

    const handleOrderUpdated = () => {
      fetchNewOrdersCount();
      if (isOpen) fetchNewOrdersList();
    };

    socketService.on("order:created", handleNewOrder);
    socketService.on("order:updated", handleOrderUpdated);

    return () => {
      socketService.off("order:created", handleNewOrder);
      socketService.off("order:updated", handleOrderUpdated);
    };
  }, [isAuthenticated, user, isOpen, fetchNewOrdersCount, fetchNewOrdersList, canAccessOrders]);

  // Fetch list when dropdown opens, refresh periodically while open
  useEffect(() => {
    if (!isOpen || !canAccessOrders) return;
    fetchNewOrdersList();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNewOrdersList();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, fetchNewOrdersList, canAccessOrders]);

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString("ar-EG");
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!user || !canAccessOrders) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors duration-200"
        title="الطلبات الجديدة"
        aria-label="الطلبات الجديدة"
      >
        {newOrdersCount > 0 ? (
          <BellSolidIcon className="h-5 w-5 text-orange-500" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}

        {newOrdersCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-gray-800">
            {newOrdersCount > 99 ? "99+" : newOrdersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute ltr:right-0 rtl:left-0 z-50 mt-2 max-h-96 w-96 max-w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  الطلبات الجديدة
                </h3>
                {newOrdersCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {newOrdersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {newOrdersCount > 0 && (
                  <button
                    onClick={markAllAsViewed}
                    className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    تعليم الكل مقروء
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs">جاري التحميل...</p>
              </div>
            ) : newOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <CheckIcon className="w-10 h-10 mx-auto mb-2 text-green-400" />
                <p className="text-sm font-medium">لا توجد طلبات جديدة</p>
                <p className="text-xs mt-1">جميع الطلبات تمت مراجعتها</p>
              </div>
            ) : (
              newOrders.map((order) => (
                <button
                  key={`${order.type}-${order.id}`}
                  onClick={() => handleOrderClick(order)}
                  className="w-full text-right px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <ShoppingBagIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatTimestamp(order.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">
                        {order.displayName || `#${order.orderNumber}`}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {formatAmount(order.displayTotal)} ج.م
                        </span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          فتح الطلب
                          <ArrowRightIcon className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/orders?isViewed=false");
              }}
              className="w-full text-center text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-medium"
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
