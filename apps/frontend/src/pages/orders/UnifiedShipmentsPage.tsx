import React from "react";
import { TruckIcon } from "@heroicons/react/24/outline";
import { CarrierTabsBar } from "./shipments/CarrierTabsBar";
import { CarrierStagesBar } from "./shipments/CarrierStagesBar";
import { ShipmentStatementTable } from "./shipments/ShipmentStatementTable";
import { ShipmentStatementCards } from "./shipments/ShipmentStatementCards";
import { ShipmentStatsBar } from "./shipments/ShipmentStatsBar";
import { TurboShipmentChatModal } from "./shipments/TurboShipmentChatModal";
import { CreateShipmentModal } from "./shipments/CreateShipmentModal";
import { CreateTicketModal } from "./shipments/CreateTicketModal";
import { useUnifiedShipmentsData } from "./shipments/useUnifiedShipmentsData";
import { ShipmentsHeader } from "./shipments/ShipmentsHeader";
import { ShipmentFilterBar } from "./shipments/ShipmentFilterBar";
import { ShipmentsBulkBar } from "./shipments/ShipmentsBulkBar";
import { ShipmentsPagination } from "./shipments/ShipmentsPagination";
import { exportShipmentsCsv, formatSafeShipmentDate } from "./shipments/exportShipmentsCsv";
import { getShipmentStatusBadge } from "./shipments/shipmentStatusBadge";

const UnifiedShipmentsPage: React.FC = () => {
  const {
    page,
    localSearch,
    setLocalSearch,
    localDateFrom,
    setLocalDateFrom,
    localDateTo,
    setLocalDateTo,
    shipments,
    companies,
    loading,
    syncingId,
    bulkSyncing,
    carrierSyncing,
    selectedIds,
    setSelectedIds,
    chatShipment,
    setChatShipment,
    ticketShipment,
    setTicketShipment,
    showCreateModal,
    setShowCreateModal,
    summary,
    totalPages,
    totalItems,
    selectedCompanyId,
    selectedStatus,
    activeCarrierType,
    updateParams,
    fetchShipments,
    handleSearchSubmit,
    copyTracking,
    handlePrintWaybill,
    handleSyncShipment,
    handleBulkSync,
    handleCarrierLiveSync,
    handleResendShipment,
    handleCancelShipment,
    isAllSelected,
    toggleSelectAll,
    toggleSelectOne,
  } = useUnifiedShipmentsData();

  return (
    <div className="w-full p-2.5 sm:p-5 space-y-4">
      {/* Header Bar */}
      <ShipmentsHeader
        onExportCsv={() => exportShipmentsCsv(shipments)}
        onRefresh={() => fetchShipments()}
        loading={loading}
      />

      {/* Seamless Cockpit Chassis Container */}
      <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden p-3.5 sm:p-4 space-y-3.5">
        {/* 1. Carrier Selector Tabs */}
        <CarrierTabsBar
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelectCompany={(companyId) => updateParams({ company: companyId, status: "ALL", page: 1 })}
          totalShipmentsCount={summary.totalShipments}
        />

        {/* 2. Operational Stages Board */}
        <div className="pt-0.5 pb-1 border-b border-border/50">
          <CarrierStagesBar
            carrierType={activeCarrierType}
            selectedStage={selectedStatus}
            onSelectStage={(stageKey) => updateParams({ status: stageKey, page: 1 })}
            stageCounts={summary.carrierStatusCounts || {}}
            onOpenCreateShipment={() => setShowCreateModal(true)}
            onLiveSync={handleCarrierLiveSync}
            isLiveSyncing={carrierSyncing}
          />
        </div>

        {/* 3. KPI Stats Strip */}
        <ShipmentStatsBar
          totalShipments={summary.totalShipments}
          inTransit={summary.inTransit}
          delivered={summary.delivered}
          returned={summary.returned}
          pendingRemittanceAmount={summary.pendingRemittanceAmount}
        />

        {/* 4. Search & Date Filter Bar */}
        <ShipmentFilterBar
          localSearch={localSearch}
          setLocalSearch={setLocalSearch}
          localDateFrom={localDateFrom}
          setLocalDateFrom={setLocalDateFrom}
          localDateTo={localDateTo}
          setLocalDateTo={setLocalDateTo}
          onSubmit={handleSearchSubmit}
          onClearSearch={() => {
            setLocalSearch("");
            updateParams({ search: undefined, page: 1 });
          }}
        />

        {/* 5. Bulk Actions Bar */}
        <ShipmentsBulkBar
          selectedCount={selectedIds.length}
          bulkSyncing={bulkSyncing}
          onBulkSync={handleBulkSync}
          onClearSelection={() => setSelectedIds([])}
        />

        {/* 6. Statement Table & Mobile Cards */}
        <div className="border border-border/70 rounded-xl overflow-hidden mt-2 bg-card">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-3 text-xs text-muted-foreground">جاري تحميل بيان تفاصيل الأوردرات...</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center">
              <TruckIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-foreground">
                لا توجد أوردرات مسجلة في هذا البيان
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                لم يتم العثور على أي شحنات وفق الشركة أو الحالة المحددة
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <ShipmentStatementTable
                  shipments={shipments}
                  selectedIds={selectedIds}
                  onToggleSelectOne={toggleSelectOne}
                  onToggleSelectAll={toggleSelectAll}
                  isAllSelected={isAllSelected}
                  syncingId={syncingId}
                  onSyncShipment={handleSyncShipment}
                  onPrintWaybill={handlePrintWaybill}
                  onOpenChat={(s) => setChatShipment(s)}
                  onOpenTicket={(s) => setTicketShipment(s)}
                  onResendShipment={handleResendShipment}
                  onCancelShipment={handleCancelShipment}
                  onCopyTracking={copyTracking}
                  getStatusBadge={getShipmentStatusBadge}
                  formatDate={formatSafeShipmentDate}
                />
              </div>

              {/* Mobile Responsive Cards */}
              <div className="sm:hidden">
                <ShipmentStatementCards
                  shipments={shipments}
                  selectedIds={selectedIds}
                  onToggleSelectOne={toggleSelectOne}
                  syncingId={syncingId}
                  onSyncShipment={handleSyncShipment}
                  onPrintWaybill={handlePrintWaybill}
                  onOpenChat={(s) => setChatShipment(s)}
                  onOpenTicket={(s) => setTicketShipment(s)}
                  onResendShipment={handleResendShipment}
                  onCancelShipment={handleCancelShipment}
                  onCopyTracking={copyTracking}
                  getStatusBadge={getShipmentStatusBadge}
                  formatDate={formatSafeShipmentDate}
                />
              </div>
            </>
          )}

          {/* Pagination */}
          <ShipmentsPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={(newPage) => updateParams({ page: newPage })}
          />
        </div>
      </div>

      {/* Turbo Chat Modal */}
      {chatShipment && (
        <TurboShipmentChatModal
          shipmentId={chatShipment.id}
          trackingCode={chatShipment.trackingNumber || chatShipment.externalShipmentId || ""}
          orderNumber={chatShipment.order?.orderNumber}
          onClose={() => setChatShipment(null)}
        />
      )}

      {/* Turbo Ticket Modal */}
      {ticketShipment && (
        <CreateTicketModal
          shipment={ticketShipment}
          onClose={() => setTicketShipment(null)}
          onSuccess={() => {
            fetchShipments();
          }}
        />
      )}

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <CreateShipmentModal
          companies={companies}
          defaultCompanyId={selectedCompanyId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchShipments()}
        />
      )}
    </div>
  );
};

export default UnifiedShipmentsPage;
