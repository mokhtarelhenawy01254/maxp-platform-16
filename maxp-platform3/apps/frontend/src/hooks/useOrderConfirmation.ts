import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { storefrontApi, getCompanyId } from "../utils/storefrontApi";

export const useOrderConfirmation = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const companyId =
    searchParams.get("companyId") ||
    localStorage.getItem("currentCompanyId") ||
    getCompanyId();
  const phone = searchParams.get("phone")?.trim() || "";

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(orderNumber && phone));
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      setOrderData(null);
      setFetchError("رقم الطلب غير متوفر");
      return;
    }

    if (!phone) {
      setLoading(false);
      setOrderData(null);
      setFetchError(null);
      return;
    }

    fetchOrderData(orderNumber, phone);
  }, [orderNumber, phone]);

  const fetchOrderData = async (orderId: string, phoneNumber: string) => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await storefrontApi.trackOrder(orderId, phoneNumber);
      if (response.success && response.data) {
        setOrderData(response.data);
        return;
      }
      setOrderData(null);
      setFetchError(response?.error || "تعذر جلب تفاصيل الطلب");
    } catch (error) {
      console.error("Error fetching order data:", error);
      setOrderData(null);
      setFetchError("حدث خطأ أثناء جلب تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  };

  return {
    orderNumber,
    phone,
    companyId,
    orderData,
    loading,
    fetchError,
  };
};
