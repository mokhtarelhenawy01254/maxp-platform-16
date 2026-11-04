import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDirection } from "../../i18n";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { socketService } from "../../services/socketService";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";
import IncompleteOrdersHeader from "./incomplete/IncompleteOrdersHeader";
import IncompleteOrdersStatsBar from "./incomplete/IncompleteOrdersStatsBar";
import IncompleteOrdersFilterBar from "./incomplete/IncompleteOrdersFilterBar";
import IncompleteOrdersTable from "./incomplete/IncompleteOrdersTable";
import IncompleteOrdersPagination from "./incomplete/IncompleteOrdersPagination";
import { IncompleteOrdersModals } from "./incomplete/IncompleteOrdersModals";
import { useIncompleteOrdersData } from "./incomplete/useIncompleteOrdersData";
import { useIncompleteOrdersActions } from "./incomplete/useIncompleteOrdersActions";
import {
  ConvertIncompleteOrdersModal,
  ConvertSummary,
} from "../settings/components/ConvertIncompleteOrdersModal";
import { apiClient } from "../../services/apiClient";

export const IncompleteOrders: React.FC = () => {
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

  const handleRetryRef = useRef(handleRetry);
  useEffect(() => {
    handleRetryRef.current = handleRetry;
  }, [handleRetry]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleIncompleteOrder = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        handleRetryRef.current();
        debounceTimer = null;
      }, 1500);
    };

    socketService.on("order:incomplete:new", handleIncompleteOrder);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      socketService.off("order:incomplete:new", handleIncompleteOrder);
    };
  }, []);

  const {
    confirmConvertCartId,
    setConfirmConvertCartId,
    convertingCartId,
    exporting,
    contactCartId,
    setContactCartId,
    contactMethod,
    setContactMethod,
    contactResult,
    setContactResult,
    contactNote,
    setContactNote,
    savingContact,
    cancelModalOpen,
    setCancelModalOpen,
    selectedCancelOrder,
    setSelectedCancelOrder,
    handleCopyCartId,
    handleConvert,
    openContactModal,
    handleSaveContact,
    handleExport,
    handleConfirmConvert,
  } = useIncompleteOrdersActions({
    orders,
    setOrders,
    buildParams,
    handleRetry,
  });

  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const [convertSummary, setConvertSummary] = useState<ConvertSummary | null>(null);

  const handleOpenBulkConvert = async () => {
    setShowBulkConvertModal(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: ConvertSummary }>(
        "/orders-new/incomplete/convert-summary"
      );
      if (res.data?.success && res.data?.data) {
        setConvertSummary(res.data.data);
      }
    } catch (_err) {
      // fallback to stats
    }
  };

  return (
    <div className="space-y-4" dir={getDirection()}>
      {/* Top Header */}
      <IncompleteOrdersHeader
        exporting={exporting}
        loading={loading}
        onExport={handleExport}
        onOpenBulkConvert={handleOpenBulkConvert}
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
      <IncompleteOrdersModals
        confirmConvertCartId={confirmConvertCartId}
        onConfirmConvert={() =>
          confirmConvertCartId && handleConvert(confirmConvertCartId)
        }
        onCancelConvert={() => setConfirmConvertCartId(null)}
        contactCartId={contactCartId}
        contactMethod={contactMethod}
        contactResult={contactResult}
        contactNote={contactNote}
        savingContact={savingContact}
        onCloseContact={() => setContactCartId(null)}
        onMethodChange={setContactMethod}
        onResultChange={setContactResult}
        onNoteChange={setContactNote}
        onSaveContact={handleSaveContact}
        cancelModalOpen={cancelModalOpen}
        selectedCancelOrder={selectedCancelOrder}
        onCloseCancelModal={() => {
          setCancelModalOpen(false);
          setSelectedCancelOrder(null);
        }}
        onCancelSuccess={() => {
          if (selectedCancelOrder) {
            setOrders((prev) =>
              prev.filter((o) => o.cartId !== selectedCancelOrder.cartId)
            );
          }
          handleRetry();
        }}
      />

      <ConvertIncompleteOrdersModal
        isOpen={showBulkConvertModal}
        onClose={() => setShowBulkConvertModal(false)}
        summary={
          convertSummary || {
            total: stats.total,
            readyToConvert: stats.active + stats.lost,
            activeReady: stats.active,
            lostReady: stats.lost,
            noPhoneCount: 0,
            lostAfterHours: 24,
          }
        }
        onConversionSuccess={() => {
          handleRetry();
        }}
      />
    </div>
  );
};

export default IncompleteOrders;
