import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "../../../hooks/useCurrency";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCompany } from "../../../contexts/CompanyContext";
import { apiClient } from "../../../services/apiClient";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../../utils/companyApps";
import {
  IncompleteConvertResponse,
  IncompleteDetailsResponse,
  IncompleteOrderDetailsData,
  getCustomerContact,
  getCustomerName,
  getExpiryStatus,
} from "../incompleteUtils";
import { CHECKOUT_HIDDEN_KEYS } from "./IncompleteReasonCard";

export function useIncompleteOrderDetailsData(decodedCartId: string) {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompany();

  const [order, setOrder] = useState<IncompleteOrderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const lang = i18n.language;

  const isMerchant = user?.role === "MERCHANT";
  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean)
      ),
    [company, user]
  );
  const hasCampaignAttributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS
  );
  const canShowAttribution = !isMerchant && hasCampaignAttributionApp;

  useEffect(() => {
    const fetchDetails = async () => {
      if (!decodedCartId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<IncompleteDetailsResponse>(
          `/orders-new/incomplete/${decodedCartId}`
        );
        const data = response.data;
        if (data?.success && data?.data) {
          setOrder(data.data);
        } else {
          setOrder(null);
          setError(t("orders.incompleteNoDetails") || "No details found");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            t("orders.incompleteNoDetails") ||
            "Failed to load"
        );
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [decodedCartId, t, retryKey]);

  const customerInfo = useMemo(() => {
    const contact = getCustomerContact(order?.checkoutData);
    return {
      name:
        getCustomerName(order?.checkoutData) ||
        t("orders.notSpecified") ||
        "غير محدد",
      phone: contact.phone,
      email: contact.email,
    };
  }, [order?.checkoutData, t]);

  const checkoutMetadata = useMemo(() => {
    if (!order?.checkoutData) return [] as Array<[string, unknown]>;
    return Object.entries(order.checkoutData).filter(
      ([key]) => !CHECKOUT_HIDDEN_KEYS.has(key)
    );
  }, [order?.checkoutData]);

  const lastActivity =
    order?.checkoutUpdatedAt ||
    order?.updatedAt ||
    order?.checkoutStartedAt ||
    "";

  const expiry = order ? getExpiryStatus(order, t) : null;

  const buildWhatsAppUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const msg = t("orders.incompleteWhatsAppMessage", {
      name: customerInfo.name,
      total: formatPrice(order?.total || 0),
    });
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const whatsappUrl = customerInfo.phone
    ? buildWhatsAppUrl(customerInfo.phone)
    : null;

  const handleConvertToOrder = async () => {
    if (!decodedCartId) return;
    setConverting(true);
    try {
      const response = await apiClient.post<IncompleteConvertResponse>(
        `/orders-new/incomplete/${encodeURIComponent(decodedCartId)}/convert`
      );
      const data = response.data;
      if (data?.success) {
        toast.success(
          t("orders.incompleteConvertSuccess") || "Converted successfully"
        );
        const orderNumber = data.data?.orderNumber || data.data?.id;
        if (orderNumber) {
          navigate(`/orders/${encodeURIComponent(String(orderNumber))}`);
        } else {
          navigate("/orders/incomplete");
        }
      } else {
        toast.error(
          data?.message ||
            t("orders.incompleteConvertFailed") ||
            "Conversion failed"
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("orders.incompleteConvertFailed") ||
          "Conversion failed"
      );
    } finally {
      setConverting(false);
      setShowConfirm(false);
    }
  };

  const retry = () => setRetryKey((prev) => prev + 1);

  return {
    order,
    loading,
    error,
    converting,
    showConfirm,
    setShowConfirm,
    cancelModalOpen,
    setCancelModalOpen,
    canShowAttribution,
    customerInfo,
    checkoutMetadata,
    lastActivity,
    expiry,
    whatsappUrl,
    handleConvertToOrder,
    retry,
    lang,
  };
}

export default useIncompleteOrderDetailsData;
