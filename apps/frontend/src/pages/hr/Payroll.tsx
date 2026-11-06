import React from 'react';
import PayrollSimulator from './components/PayrollSimulator';
import {
  usePayrollController,
  PayrollHeader,
  PayrollAutoStatusBar,
  PayrollKpiCards,
  PayrollFiltersBar,
  PayrollTable,
  PayrollGenerateModal,
  PayrollDetailsModal,
  PayrollEditModal,
  PayrollPaymentModal,
} from './payroll/index';

const Payroll: React.FC = () => {
  const {
    isMyPayroll,
    loading,
    payrolls,
    summary,
    pagination,
    setPagination,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    statusFilter,
    setStatusFilter,
    selectedIds,
    toggleSelectAll,
    toggleSelect,
    showGenerateDialog,
    setShowGenerateDialog,
    showDetailsDialog,
    setShowDetailsDialog,
    showEditDialog,
    setShowEditDialog,
    showPaymentDialog,
    setShowPaymentDialog,
    paymentMethod,
    setPaymentMethod,
    selectedPayroll,
    setSelectedPayroll,
    generating,
    saving,
    paying,
    forceRegenerate,
    setForceRegenerate,
    view,
    setView,
    autoStatus,
    autoCalculating,
    editFormData,
    setEditFormData,
    editingAllowances,
    setEditingAllowances,
    editingDeductions,
    setEditingDeductions,
    handleAutoCalculatePayroll,
    handleGeneratePayroll,
    handleApprove,
    handlePay,
    handleBulkPay,
    confirmPayment,
    handleBulkApprove,
    handleEdit,
    handleSaveEdit,
    handlePrint,
    handleExportBankFile,
  } = usePayrollController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <PayrollHeader
        isMyPayroll={isMyPayroll}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        view={view}
        setView={setView}
        autoCalculating={autoCalculating}
        onExportBankFile={handleExportBankFile}
        onOpenGenerateDialog={() => setShowGenerateDialog(true)}
        onAutoCalculate={handleAutoCalculatePayroll}
      />

      {/* Automation Telemetry & Status Bar */}
      {!isMyPayroll && autoStatus && (
        <PayrollAutoStatusBar autoStatus={autoStatus} />
      )}

      {/* Main Content Area */}
      {view === 'simulator' ? (
        <PayrollSimulator />
      ) : (
        <>
          {/* Summary Cards */}
          {!isMyPayroll && (
            <PayrollKpiCards summary={summary} />
          )}

          {/* Filters */}
          <PayrollFiltersBar
            isMyPayroll={isMyPayroll}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selectedCount={selectedIds.length}
            onBulkApprove={handleBulkApprove}
            onBulkPay={handleBulkPay}
          />

          {/* Payroll Table */}
          <PayrollTable
            isMyPayroll={isMyPayroll}
            loading={loading}
            payrolls={payrolls}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedIds={selectedIds}
            pagination={pagination}
            setPagination={setPagination}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelect={toggleSelect}
            onOpenGenerateDialog={() => setShowGenerateDialog(true)}
            onViewDetails={(payroll) => {
              setSelectedPayroll(payroll);
              setShowDetailsDialog(true);
            }}
            onApprove={handleApprove}
            onEdit={handleEdit}
            onPay={handlePay}
            onPrint={handlePrint}
          />

          {/* Generate Payroll Dialog */}
          {!isMyPayroll && (
            <PayrollGenerateModal
              open={showGenerateDialog}
              onOpenChange={(open) => {
                setShowGenerateDialog(open);
                if (!open) setForceRegenerate(false);
              }}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              summary={summary}
              forceRegenerate={forceRegenerate}
              setForceRegenerate={setForceRegenerate}
              generating={generating}
              onGenerate={handleGeneratePayroll}
            />
          )}

          {/* Payroll Details Dialog */}
          <PayrollDetailsModal
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            payroll={selectedPayroll}
            onPrint={handlePrint}
          />

          {/* Edit Payroll Dialog */}
          <PayrollEditModal
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            payroll={selectedPayroll}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            editingAllowances={editingAllowances}
            setEditingAllowances={setEditingAllowances}
            editingDeductions={editingDeductions}
            setEditingDeductions={setEditingDeductions}
            saving={saving}
            onSave={handleSaveEdit}
          />

          {/* Payment Details Dialog */}
          <PayrollPaymentModal
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            paying={paying}
            onConfirmPayment={confirmPayment}
          />
        </>
      )}
    </div>
  );
};

export default React.memo(Payroll);
