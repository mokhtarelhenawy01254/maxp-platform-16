import { AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import QuickOrderModal from "./QuickOrderModal";
import { useDoctorDetail } from "./doctor-detail/hooks/useDoctorDetail";
import { DoctorDetailHeader } from "./doctor-detail/components/DoctorDetailHeader";
import { DoctorDetailKpiCards } from "./doctor-detail/components/DoctorDetailKpiCards";
import { DoctorCasesTab } from "./doctor-detail/tabs/DoctorCasesTab";
import { DoctorInvoicesTab } from "./doctor-detail/tabs/DoctorInvoicesTab";
import { DoctorStatementTab } from "./doctor-detail/tabs/DoctorStatementTab";
import { DoctorPricingTab } from "./doctor-detail/tabs/DoctorPricingTab";
import { DoctorPortalTab } from "./doctor-detail/tabs/DoctorPortalTab";
import { EditDoctorModal } from "./doctor-detail/modals/EditDoctorModal";
import { PortalPinDialog } from "./doctor-detail/modals/PortalPinDialog";
import { BulkPaymentModal } from "./doctor-detail/modals/BulkPaymentModal";
import { SingleInvoicePaymentModal } from "./doctor-detail/modals/SingleInvoicePaymentModal";

export function DentalDoctorDetailPage() {
  const navigate = useNavigate();
  const {
    doctor,
    setDoctor,
    loading,
    error,
    activeTab,
    setActiveTab,
    showEditModal,
    setShowEditModal,
    showPinDialog,
    setShowPinDialog,
    showBulkPaymentModal,
    setShowBulkPaymentModal,
    showQuickOrderModal,
    setShowQuickOrderModal,
    selectedInvoiceToPay,
    setSelectedInvoiceToPay,
    cases,
    casesLoading,
    caseSearch,
    setCaseSearch,
    caseStatusFilter,
    setCaseStatusFilter,
    invoices,
    invoicesLoading,
    invoiceStatusFilter,
    setInvoiceStatusFilter,
    statementData,
    statementLoading,
    statementFrom,
    setStatementFrom,
    statementTo,
    setStatementTo,
    workTypes,
    pricingMap,
    setPricingMap,
    pricingLoading,
    pricingSaving,
    loadDoctor,
    loadCases,
    loadInvoices,
    loadStatement,
    handleSavePricing,
    handleToggleActive,
    handleDownloadInvoicePdf,
    handleCopyPaymentLink,
    whatsappUrl,
    refreshAll,
  } = useDoctorDetail();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500 font-medium">جاري تحميل بيانات الطبيب...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-1">
            {error || "لم يتم العثور على الطبيب المطلوب"}
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            قد يكون الطبيب محذوفاً أو تم فتح رابط غير صحيح.
          </p>
          <button
            onClick={() => navigate("/dental-lab/doctors")}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            الرجوع لقائمة الأطباء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6" dir="rtl">
      {/* Top Header & Doctor Summary Card */}
      <DoctorDetailHeader
        doctor={doctor}
        onRefresh={refreshAll}
        onOpenEditModal={() => setShowEditModal(true)}
        onToggleActive={handleToggleActive}
        onOpenBulkPayment={() => setShowBulkPaymentModal(true)}
        onOpenQuickOrder={() => setShowQuickOrderModal(true)}
        whatsappUrl={whatsappUrl}
      />

      {/* KPI & Financial Overview Cards + Tabs Row */}
      <DoctorDetailKpiCards
        doctor={doctor}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Active Tab Content */}
      {activeTab === "cases" && (
        <DoctorCasesTab
          cases={cases}
          loading={casesLoading}
          search={caseSearch}
          onSearchChange={setCaseSearch}
          statusFilter={caseStatusFilter}
          onStatusFilterChange={setCaseStatusFilter}
          onOpenQuickOrder={() => setShowQuickOrderModal(true)}
        />
      )}

      {activeTab === "invoices" && (
        <DoctorInvoicesTab
          invoices={invoices}
          loading={invoicesLoading}
          statusFilter={invoiceStatusFilter}
          onStatusFilterChange={setInvoiceStatusFilter}
          onPayInvoice={setSelectedInvoiceToPay}
          onDownloadPdf={handleDownloadInvoicePdf}
          onCopyPaymentLink={handleCopyPaymentLink}
        />
      )}

      {activeTab === "statement" && (
        <DoctorStatementTab
          doctor={doctor}
          statementData={statementData}
          invoices={invoices}
          loading={statementLoading}
          from={statementFrom}
          to={statementTo}
          onFromChange={setStatementFrom}
          onToChange={setStatementTo}
          onRefresh={loadStatement}
        />
      )}

      {activeTab === "pricing" && (
        <DoctorPricingTab
          workTypes={workTypes}
          pricingMap={pricingMap}
          onPricingChange={(wid, val) =>
            setPricingMap((prev) => ({ ...prev, [wid]: val }))
          }
          loading={pricingLoading}
          saving={pricingSaving}
          onSave={handleSavePricing}
        />
      )}

      {activeTab === "portal" && (
        <DoctorPortalTab
          doctor={doctor}
          onOpenPinDialog={() => setShowPinDialog(true)}
          onOpenEditModal={() => setShowEditModal(true)}
        />
      )}

      {/* Modals & Dialogs */}
      {showEditModal && (
        <EditDoctorModal
          doctor={doctor}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setDoctor(updated)}
        />
      )}

      {showPinDialog && (
        <PortalPinDialog
          doctor={doctor}
          onClose={() => setShowPinDialog(false)}
          onSaved={(updated) => setDoctor(updated)}
        />
      )}

      {showBulkPaymentModal && (
        <BulkPaymentModal
          doctor={doctor}
          onClose={() => setShowBulkPaymentModal(false)}
          onSaved={() => {
            loadDoctor();
            if (activeTab === "invoices") loadInvoices();
            if (activeTab === "statement") loadStatement();
          }}
        />
      )}

      {selectedInvoiceToPay && (
        <SingleInvoicePaymentModal
          invoice={selectedInvoiceToPay}
          onClose={() => setSelectedInvoiceToPay(null)}
          onSaved={() => {
            loadDoctor();
            loadInvoices();
            if (activeTab === "statement") loadStatement();
          }}
        />
      )}

      {showQuickOrderModal && (
        <QuickOrderModal
          onClose={() => setShowQuickOrderModal(false)}
          preselectedDoctor={doctor}
          onSaved={() => {
            setShowQuickOrderModal(false);
            loadDoctor();
            loadCases();
            toast.success("تم إنشاء الحالة بنجاح لهذا الطبيب");
          }}
        />
      )}
    </div>
  );
}

export default DentalDoctorDetailPage;
