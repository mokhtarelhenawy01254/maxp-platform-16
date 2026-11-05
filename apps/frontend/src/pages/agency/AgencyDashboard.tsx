import React from "react";
import { AgencyPerformanceModal } from "./AgencyPerformanceModal";
import { AgencyProposalsTab } from "./proposals/AgencyProposalsTab";
import {
  AgencyApprovalDialog,
  AgencyApprovalsTab,
  AgencyClientDialog,
  AgencyClientsTab,
  AgencyDashboardHeader,
  AgencyExtraServiceDialog,
  AgencyInvoiceDialog,
  AgencyInvoicesTab,
  AgencyOverviewTab,
  AgencySuiteTab,
  useAgencyDashboardController,
} from "./dashboard/index";

export type { PricingModel, HybridType } from "./dashboard/types";

export default function AgencyDashboard() {
  const c = useAgencyDashboardController();

  return (
    <div
      className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto"
      dir="rtl"
    >
      <AgencyDashboardHeader
        appInactiveNotice={c.appInactiveNotice}
        loading={c.loading}
        activeTab={c.activeTab}
        clientsCount={c.clients.length}
        approvalsCount={c.approvals.length}
        unpaidInvoicesCount={c.overview.unpaidInvoicesCount}
        onRefresh={c.fetchData}
        onOpenNewClient={c.handleOpenNewClient}
        onTabChange={c.handleTabChange}
        onNavigateToMarketplace={() =>
          c.navigate("/marketplace?search=marketing-agency-pro")
        }
      />

      {c.activeTab === "overview" && (
        <AgencyOverviewTab
          overview={c.overview}
          clients={c.clients}
          currency={c.currency}
          onNavigateToClients={() => c.handleTabChange("clients")}
          onOpenNewClient={c.handleOpenNewClient}
        />
      )}

      {c.activeTab === "proposals" && <AgencyProposalsTab />}

      {c.activeTab === "clients" && (
        <AgencyClientsTab
          searchTerm={c.searchTerm}
          onSearchChange={c.setSearchTerm}
          onOpenNewClient={c.handleOpenNewClient}
          filteredClients={c.filteredClients}
          paginatedClients={c.paginatedClients}
          clientPage={c.clientPage}
          totalClientPages={c.totalClientPages}
          onPageChange={c.setClientPage}
          currency={c.currency}
          selectedMonth={c.selectedMonth}
          onOpenPerfModal={c.handleOpenPerfModal}
          onOpenExtraModal={c.handleOpenExtraModal}
          onOpenFormalInvoiceFromClient={c.handleOpenFormalInvoiceFromClient}
          onOpenEditClient={c.handleOpenEditClient}
          onDeleteClient={c.handleDeleteClient}
          onMetaSynced={c.fetchData}
          onNavigateToMetaAds={(adAccountId) =>
            c.navigate(
              `/advertising/facebook-ads?adAccountId=${encodeURIComponent(adAccountId)}`,
            )
          }
        />
      )}

      {c.activeTab === "invoices" && (
        <AgencyInvoicesTab
          selectedMonth={c.selectedMonth}
          onMonthChange={c.setSelectedMonth}
          invoicesLoading={c.invoicesLoading}
          onRefreshInvoices={c.fetchInvoices}
          invoicesData={c.invoicesData}
          clients={c.clients}
          currency={c.currency}
          getArabicMonthName={c.getArabicMonthName}
          onToggleInvoicePaid={c.handleToggleInvoicePaid}
          onOpenFormalInvoice={c.handleOpenFormalInvoice}
          onShareInvoiceWhatsApp={c.handleShareInvoiceWhatsApp}
          onOpenPerfModal={c.handleOpenPerfModal}
          onOpenExtraModal={c.handleOpenExtraModal}
          onDeleteExtraService={c.handleDeleteExtraService}
          onNavigateToClients={() => c.handleTabChange("clients")}
        />
      )}

      {c.activeTab === "approvals" && (
        <AgencyApprovalsTab
          approvals={c.approvals}
          clients={c.clients}
          onOpenNewApproval={c.handleOpenNewApproval}
          onCopyApprovalLink={c.copyApprovalLink}
          onShareApprovalWhatsApp={c.shareApprovalWhatsApp}
          onDeleteApproval={c.handleDeleteApproval}
        />
      )}

      {c.activeTab === "suite" && (
        <AgencySuiteTab onNavigate={c.navigate} />
      )}

      {/* MODALS */}
      <AgencyClientDialog
        open={c.clientModalOpen}
        onOpenChange={c.setClientModalOpen}
        editingClient={c.editingClient}
        clientForm={c.clientForm}
        onFormChange={c.setClientForm}
        onSave={c.handleSaveClient}
        currency={c.currency}
      />

      <AgencyPerformanceModal
        open={c.perfModalOpen}
        onOpenChange={c.setPerfModalOpen}
        client={c.selectedClientForPerf}
        selectedMonth={c.selectedMonth}
        currency={c.currency}
        onSuccess={() => {
          c.fetchData();
          c.fetchInvoices(c.selectedMonth);
        }}
      />

      <AgencyExtraServiceDialog
        open={c.extraModalOpen}
        onOpenChange={c.setExtraModalOpen}
        selectedClient={c.selectedClientForExtra}
        extraForm={c.extraForm}
        onFormChange={c.setExtraForm}
        onSelectPresetCategory={c.handleSelectPresetCategory}
        onSave={c.handleSaveExtraService}
        currency={c.currency}
      />

      <AgencyApprovalDialog
        open={c.approvalModalOpen}
        onOpenChange={c.setApprovalModalOpen}
        clients={c.clients}
        approvalForm={c.approvalForm}
        onFormChange={c.setApprovalForm}
        fileInputRef={c.fileInputRef}
        isUploadingMedia={c.isUploadingMedia}
        onUploadMediaFile={c.handleUploadMediaFile}
        onSave={c.handleSaveApproval}
      />

      <AgencyInvoiceDialog
        open={c.invoiceModalOpen}
        onOpenChange={c.setInvoiceModalOpen}
        selectedInvoice={c.selectedInvoice}
        invoicesData={c.invoicesData}
        currency={c.currency}
        onShareWhatsApp={c.handleShareInvoiceWhatsApp}
      />
    </div>
  );
}
