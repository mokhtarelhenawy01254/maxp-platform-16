import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getDirection } from "../../i18n";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import IncompleteCancelModal from "./components/IncompleteCancelModal";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";
import type {
  IncompleteConvertResponse,
  IncompleteOrder,
} from "./incompleteUtils";
import { getCustomerContact, getCustomerName } from "./incompleteUtils";

import IncompleteOrdersHeader from "./incomplete/IncompleteOrdersHeader";
import IncompleteOrdersStatsBar from "./incomplete/IncompleteOrdersStatsBar";
import IncompleteOrdersFilterBar from "./incomplete/IncompleteOrdersFilterBar";
import IncompleteOrdersTable from "./incomplete/IncompleteOrdersTable";
import IncompleteOrdersPagination from "./incomplete/IncompleteOrdersPagination";
import IncompleteOrdersContactModal from "./incomplete/IncompleteOrdersContactModal";
import { exportIncompleteOrdersCsv } from "./incomplete/exportIncompleteOrdersCsv";
import { useIncompleteOrdersData } from "./incomplete/useIncompleteOrdersData";

const IncompleteOrders: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { company } = useCompany();

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

  const {
    orders,
    setOrders,
    stats,
    statsAreServer,
    loading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    totalOrders,
    totalPages,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    phoneFilter,
    setPhoneFilter,
    sortValue,
    setSortValue,
    buildParams,
    handleRetry,
  } = useIncompleteOrdersData();

  const [confirmConvertCartId, setConfirmConvertCartId] = useState<string | null>(null);
  const [convertingCartId, setConvertingCartId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [contactCartId, setContactCartId] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState("call");
  const [contactResult, setContactResult] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<IncompleteOrder | null>(null);

  const handleCopyCartId = async (cartId: string) => {
    if (!cartId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cartId);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = cartId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      toast.success(t("orders.incompleteCopied"));
    } catch {
      toast.error(t("orders.incompleteCopyFailed"));
    }
  };

  const handleConvert = async (cartId: string) => {
    if (!cartId) return;
    setConvertingCartId(cartId);
    try {
      const response = await apiClient.post<IncompleteConvertResponse>(
        `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`
      );
      const data = response.data;
      if (data?.success) {
        toast.success(t("orders.incompleteConvertSuccess"));
        if (data?.conversionLogFailed) {
          toast.warning(t("orders.incompleteConvertLogFailed"), { duration: 8000 });
        }
        setConfirmConvertCartId(null);
        handleRetry();
      } else {
        toast.error(data?.message || t("orders.incompleteConvertFailed"));
      }
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.code === "EXISTING_CUSTOMER_ORDER") {
        const proceed = window.confirm(
          `${respData.message}\n\nهل تريد بالتأكيد إنشاء طلب إضافي لهذا العميل؟`
        );
        if (proceed) {
          try {
            const forceRes = await apiClient.post<IncompleteConvertResponse>(
              `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`,
              { force: true }
            );
            if (forceRes.data?.success) {
              toast.success(t("orders.incompleteConvertSuccess"));
              if (forceRes.data?.conversionLogFailed) {
                toast.warning(t("orders.incompleteConvertLogFailed"), {
                  duration: 8000,
                });
              }
              setConfirmConvertCartId(null);
              handleRetry();
              return;
            }
          } catch (forceErr: any) {
            toast.error(
              forceErr?.response?.data?.message ||
                forceErr?.message ||
                t("orders.incompleteConvertFailed")
            );
            return;
          }
        } else {
          return;
        }
      }
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteConvertFailed")
      );
    } finally {
      setConvertingCartId(null);
    }
  };

  const openContactModal = (cartId: string) => {
    setContactCartId(cartId);
    setContactMethod("call");
    setContactResult("");
    setContactNote("");
  };

  const handleSaveContact = async () => {
    if (!contactCartId) return;
    setSavingContact(true);
    try {
      const isCancelled = contactResult === "cancelled";
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
      }>(
        `/orders-new/incomplete/${encodeURIComponent(contactCartId)}/contact`,
        {
          method: contactMethod,
          result: contactResult,
          note: contactNote,
          dismissCart: isCancelled,
        }
      );
      if (response.data?.success) {
        toast.success(
          isCancelled
            ? t("orders.incompleteCancelSuccess")
            : t("orders.incompleteContactLogged")
        );
        const savedCartId = contactCartId;
        setContactCartId(null);
        if (isCancelled) {
          setOrders((prev) => prev.filter((o) => o.cartId !== savedCartId));
          handleRetry();
        }
      } else {
        toast.error(
          response.data?.message || t("orders.incompleteContactFailed")
        );
      }
    } catch (err: any) {
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteContactFailed")
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportIncompleteOrdersCsv(buildParams, t);
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmConvert = (cartId: string) => {
    const targetOrder = orders.find((o) => o.cartId === cartId);
    const phone = targetOrder
      ? getCustomerContact(targetOrder.checkoutData)?.phone
      : null;
    if (phone) {
      setConfirmConvertCartId(cartId);
    } else {
      toast.error(t("orders.incompleteConvertNoPhone"));
    }
  };

  return (
    <div className="space-y-4" dir={getDirection()}>
      {/* Top Header */}
      <IncompleteOrdersHeader
        exporting={exporting}
        loading={loading}
        onExport={handleExport}
      />

      {/* Telemetry Strip - Linear Single Chassis */}
      <IncompleteOrdersStatsBar
        stats={stats}
        statsAreServer={statsAreServer}
      />

      {/* Filters and Search Bar - Cohesive Single Surface */}
      <IncompleteOrdersFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={(status) => {
          setStatusFilter(status);
          setPage(1);
        }}
        phoneFilter={phoneFilter}
        onPhoneFilterChange={(filter) => {
          setPhoneFilter(filter);
          setPage(1);
        }}
        sortValue={sortValue}
        onSortValueChange={(sort) => {
          setSortValue(sort);
          setPage(1);
        }}
        limit={limit}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onRefresh={handleRetry}
        activeCount={stats.active}
        lostCount={stats.lost}
        loading={loading}
      />

      {/* Orders Table - Single Surface Chassis */}
      <IncompleteOrdersTable
        orders={orders}
        loading={loading}
        error={error}
        canShowAttribution={canShowAttribution}
        convertingCartId={convertingCartId}
        onRetry={handleRetry}
        onCopyCartId={handleCopyCartId}
        onConfirmConvert={handleConfirmConvert}
        onOpenContactModal={openContactModal}
        onOpenCancelModal={(order) => {
          setSelectedCancelOrder(order);
          setCancelModalOpen(true);
        }}
      />

      {/* Pagination */}
      {!loading && (
        <IncompleteOrdersPagination
          page={page}
          limit={limit}
          totalOrders={totalOrders}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Modals & Dialogs */}
      <ConfirmDialog
        open={!!confirmConvertCartId}
        title={t("orders.incompleteConfirmTitle")}
        content={t("orders.incompleteConfirmContent")}
        confirmLabel={t("orders.incompleteQuickConvert")}
        cancelLabel={t("orders.incompleteCancel")}
        confirmColor="success"
        onConfirm={() =>
          confirmConvertCartId && handleConvert(confirmConvertCartId)
        }
        onCancel={() => setConfirmConvertCartId(null)}
      />

      <IncompleteOrdersContactModal
        open={!!contactCartId}
        onClose={() => setContactCartId(null)}
        contactMethod={contactMethod}
        onMethodChange={setContactMethod}
        contactResult={contactResult}
        onResultChange={setContactResult}
        contactNote={contactNote}
        onNoteChange={setContactNote}
        savingContact={savingContact}
        onSave={handleSaveContact}
      />

      <IncompleteCancelModal
        open={cancelModalOpen}
        cartId={selectedCancelOrder?.cartId || null}
        customerName={
          selectedCancelOrder
            ? getCustomerName(selectedCancelOrder.checkoutData)
            : null
        }
        customerPhone={
          selectedCancelOrder
            ? getCustomerContact(selectedCancelOrder.checkoutData)?.phone
            : null
        }
        cartTotal={selectedCancelOrder?.total}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedCancelOrder(null);
        }}
        onSuccess={() => {
          if (selectedCancelOrder) {
            setOrders((prev) =>
              prev.filter((o) => o.cartId !== selectedCancelOrder.cartId)
            );
          }
          handleRetry();
        }}
      />
    </div>
  );
};

export default IncompleteOrders;
