import { toast } from "sonner";
import { fetchInvoicePaymentLink, fetchInvoicePdf } from "./shared";
import { useDentalInvoices } from "./invoices/hooks/useDentalInvoices";
import { DentalInvoicesFilterBar } from "./invoices/components/DentalInvoicesFilterBar";
import { DentalInvoicesTable } from "./invoices/components/DentalInvoicesTable";
import { DentalInvoiceCreateModal } from "./invoices/modals/DentalInvoiceCreateModal";
import { DentalInvoicePaymentModal } from "./invoices/modals/DentalInvoicePaymentModal";
import { DentalInvoiceDetailModal } from "./invoices/modals/DentalInvoiceDetailModal";
import { DentalInvoiceBatchModal } from "./invoices/modals/DentalInvoiceBatchModal";
import { DentalInvoiceDoctorStatementModal } from "./invoices/modals/DentalInvoiceDoctorStatementModal";
import { DentalInvoiceBulkPaymentModal } from "./invoices/modals/DentalInvoiceBulkPaymentModal";
import { DentalInvoiceMonthlySettlementModal } from "./invoices/modals/DentalInvoiceMonthlySettlementModal";

export default function DentalInvoicesTab() {
  const {
    rows,
    fetchedCount,
    cases,
    doctors,
    loading,
    error,
    setError,
    selectedDoctorId,
    setSelectedDoctorId,
    statusFilter,
    setStatusFilter,
    datePreset,
    setDatePreset,
    searchQuery,
    setSearchQuery,
    createOpen,
    setCreateOpen,
    batchOpen,
    setBatchOpen,
    uninvoicedSummary,
    paymentInvoice,
    setPaymentInvoice,
    detailInvoice,
    setDetailInvoice,
    statementDoctor,
    setStatementDoctor,
    bulkPaymentDoctor,
    setBulkPaymentDoctor,
    settlementOpen,
    setSettlementOpen,
    settlementDoctorId,
    setSettlementDoctorId,
    activeDoctor,
    activeDoctorStats,
    refresh,
    handleExportInvoicesExcel,
    handleVoidInvoice,
  } = useDentalInvoices();

  return (
    <div className="space-y-4">
      {/* Filter and Command Controls */}
      <DentalInvoicesFilterBar
        selectedDoctorId={selectedDoctorId}
        onSelectDoctorId={setSelectedDoctorId}
        doctors={doctors}
        activeDoctor={activeDoctor}
        activeDoctorStats={activeDoctorStats}
        uninvoicedSummary={uninvoicedSummary}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        fetchedCount={fetchedCount}
        onCreateInvoice={() => setCreateOpen(true)}
        onExportExcel={handleExportInvoicesExcel}
        onBatchInvoice={() => setBatchOpen(true)}
        onOpenSettlement={(docId) => {
          setSettlementDoctorId(docId || selectedDoctorId || "");
          setSettlementOpen(true);
        }}
        onRefresh={() => refresh()}
        onOpenStatement={(doc) => setStatementDoctor(doc)}
        onBulkPayment={(doc) => setBulkPaymentDoctor(doc)}
      />

      {/* Main Invoices Table */}
      <DentalInvoicesTable
        loading={loading}
        error={error}
        onClearError={() => setError(null)}
        rows={rows}
        onRowClick={(inv) => setDetailInvoice(inv)}
        onPaymentClick={(inv) => setPaymentInvoice(inv)}
        onVoidClick={(inv) => handleVoidInvoice(inv)}
      />

      {/* Modals */}
      {createOpen && (
        <DentalInvoiceCreateModal
          cases={cases}
          doctors={doctors}
          preselectedDoctorId={selectedDoctorId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            refresh({ silent: true });
          }}
        />
      )}

      {paymentInvoice && (
        <DentalInvoicePaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSaved={() => {
            setPaymentInvoice(null);
            refresh({ silent: true });
          }}
        />
      )}

      {detailInvoice && (
        <DentalInvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onAddPayment={() => {
            const inv = detailInvoice;
            setDetailInvoice(null);
            setPaymentInvoice(inv);
          }}
          onPdf={async () => {
            try {
              const blob = await fetchInvoicePdf(detailInvoice.id);
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
            } catch {
              toast.error("فشل جلب ملف الفاتورة");
            }
          }}
          onPaymentLink={async () => {
            try {
              const r = await fetchInvoicePaymentLink(detailInvoice.id);
              if (r.configured && r.checkoutUrl) {
                window.open(r.checkoutUrl, "_blank");
              } else {
                toast.info(r.message || "الدفع الإلكتروني غير مهيأ");
              }
            } catch {
              toast.error("فشل جلب رابط الدفع");
            }
          }}
        />
      )}

      {batchOpen && uninvoicedSummary && (
        <DentalInvoiceBatchModal
          summary={uninvoicedSummary}
          onClose={() => setBatchOpen(false)}
          onSaved={() => {
            setBatchOpen(false);
            refresh({ silent: true });
          }}
        />
      )}

      {statementDoctor && (
        <DentalInvoiceDoctorStatementModal
          doctor={statementDoctor}
          onClose={() => setStatementDoctor(null)}
          onBulkPayment={() => {
            const doc = statementDoctor;
            setStatementDoctor(null);
            setBulkPaymentDoctor(doc);
          }}
        />
      )}

      {bulkPaymentDoctor && (
        <DentalInvoiceBulkPaymentModal
          doctor={bulkPaymentDoctor}
          onClose={() => setBulkPaymentDoctor(null)}
          onSaved={() => {
            setBulkPaymentDoctor(null);
            refresh({ silent: true });
          }}
        />
      )}

      {settlementOpen && (
        <DentalInvoiceMonthlySettlementModal
          initialDoctorId={settlementDoctorId}
          doctors={doctors}
          onClose={() => {
            setSettlementOpen(false);
            setSettlementDoctorId("");
          }}
          onUpdated={() => {
            refresh({ silent: true });
          }}
        />
      )}
    </div>
  );
}
