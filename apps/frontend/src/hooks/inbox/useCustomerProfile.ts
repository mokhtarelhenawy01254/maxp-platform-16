import { useState, useCallback } from "react";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
  productName?: string;
  productColor?: string | null;
  productSize?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  conversationId?: string | null;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  metadata?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phone2?: string | null;
  avatar: string | null;
  city: string | null;
  country: string | null;
  tags?: string | string[];
  metadata?: any;
}

export const useCustomerProfile = () => {
  const { companyId } = useCompany();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prependOrder = useCallback((newOrder: Order) => {
    setOrders((prev) => {
      if (
        prev.some(
          (o) =>
            o.id === newOrder.id ||
            (newOrder.orderNumber && o.orderNumber === newOrder.orderNumber)
        )
      ) {
        return prev;
      }
      return [newOrder, ...prev];
    });
  }, []);

  const loadCustomerData = useCallback(
    async (
      customerId: string,
      options?: { conversationId?: string; phone?: string }
    ) => {
      if (!companyId) return;
      if (!customerId && !options?.conversationId && !options?.phone) return;

      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("companyId", companyId);
        if (options?.conversationId) {
          queryParams.set("conversationId", options.conversationId);
        }
        if (options?.phone) {
          queryParams.set("phone", options.phone);
        }

        const effectiveCustomerId = customerId || "lookup";
        const ordersUrl = `/customers/${encodeURIComponent(effectiveCustomerId)}/orders?${queryParams.toString()}`;

        const promises: Promise<any>[] = [apiClient.get(ordersUrl)];

        const hasRealCustomerId =
          customerId &&
          customerId !== "lookup" &&
          customerId !== "guest" &&
          customerId !== "undefined";

        if (hasRealCustomerId) {
          promises.push(
            apiClient.get(
              `/customers/${customerId}/activity?companyId=${companyId}`
            ),
            apiClient.get(`/customers/${customerId}?companyId=${companyId}`)
          );
        }

        const results = await Promise.allSettled(promises);
        const ordersRes = results[0].status === "fulfilled" ? results[0].value : null;
        const activityRes = results[1]?.status === "fulfilled" ? results[1].value : null;
        const customerRes = results[2]?.status === "fulfilled" ? results[2].value : null;

        if (ordersRes?.data?.data) {
          setOrders(ordersRes.data.data);
        }

        if (customerRes?.data?.success && customerRes.data.data?.customer) {
          setCustomer(customerRes.data.data.customer);
        }

        if (activityRes?.data?.data) {
          const rawActivities = activityRes.data.data || [];
          const mappedActivities = rawActivities.map((act: any) => ({
            id: act.id,
            action: act.type,
            description:
              act.type === "order"
                ? `طلب جديد #${act.orderNumber} (${act.total} ج.م)`
                : `محادثة عبر ${act.platform === "WHATSAPP" ? "واتساب" : act.platform === "MESSENGER" ? "ماسنجر" : act.platform || "المنصة"}`,
            createdAt: act.timestamp || new Date().toISOString(),
            metadata: JSON.stringify(act.data),
          }));
          setActivities(mappedActivities);
        }
      } catch (err: any) {
        console.error("Error fetching customer profile:", err);
        setError("فشل جلب بيانات العميل");
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  const updateCustomerPhone = useCallback(
    async (phone: string) => {
      if (!customer?.id || !companyId) {
        return { success: false, message: "معرف العميل غير متاح" };
      }

      try {
        const res = await apiClient.put(
          `/customers/${customer.id}`,
          { phone },
          { params: { companyId } },
        );

        if (res.data.success) {
          setCustomer((prev) => (prev ? { ...prev, phone } : prev));
          return { success: true, message: res.data.message || "تم تحديث رقم الهاتف بنجاح" };
        }
        return { success: false, message: res.data?.message || "فشل تحديث رقم الهاتف" };
      } catch (err: any) {
        console.error("Error updating customer phone:", err);
        return {
          success: false,
          message: err?.response?.data?.message || "حدث خطأ أثناء تحديث رقم الهاتف",
        };
      }
    },
    [customer?.id, companyId],
  );

  const updateCustomerPhone2 = useCallback(
    async (phone2: string) => {
      if (!customer?.id || !companyId) {
        return { success: false, message: "معرف العميل غير متاح" };
      }
      try {
        const res = await apiClient.put(
          `/customers/${customer.id}`,
          { phone2 },
          { params: { companyId } },
        );
        if (res.data.success) {
          setCustomer((prev) =>
            prev ? { ...prev, phone2, metadata: res.data.data?.metadata || prev.metadata } : prev,
          );
          return { success: true, message: res.data.message || "تم إضافة رقم الهاتف الثاني بنجاح" };
        }
        return { success: false, message: res.data?.message || "فشل إضافة رقم الهاتف الثاني" };
      } catch (err: any) {
        console.error("Error updating second phone:", err);
        return {
          success: false,
          message: err?.response?.data?.message || "حدث خطأ أثناء إضافة رقم الهاتف الثاني",
        };
      }
    },
    [customer?.id, companyId],
  );

  const calculateLTV = useCallback(() => {    return orders
      .filter(
        (o) =>
          o.status === "completed" ||
          o.status === "delivered" ||
          o.status === "paid",
      )
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  /**
   * Calculate a 1-5 star customer rating based on:
   * - Number of orders (breadth)
   * - Lifetime value (depth)
   * Returns { stars, label }
   */
  const calculateRating = useCallback((): { stars: number; label: string } => {
    const totalOrders = orders.length;
    const ltv = orders
      .filter(
        (o) =>
          o.status === "completed" ||
          o.status === "delivered" ||
          o.status === "paid",
      )
      .reduce((sum, order) => sum + order.total, 0);

    if (totalOrders === 0) {
      return { stars: 1, label: "عميل جديد" };
    }
    if (totalOrders === 1 && ltv < 200) {
      return { stars: 2, label: "عميل محتمل" };
    }
    if (totalOrders <= 3 || ltv < 500) {
      return { stars: 3, label: "عميل متكرر" };
    }
    if (totalOrders <= 9 || ltv < 2000) {
      return { stars: 4, label: "عميل مميز" };
    }
    return { stars: 5, label: "عميل VIP" };
  }, [orders]);

  const resetCustomer = useCallback(() => {
    setCustomer(null);
    setOrders([]);
    setActivities([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    customer,
    orders,
    activities,
    loading,
    error,
    loadCustomerData,
    prependOrder,
    resetCustomer,
    updateCustomerPhone,
    updateCustomerPhone2,
    calculateLTV,
    calculateRating,
  };
};
