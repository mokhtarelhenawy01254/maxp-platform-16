import React from 'react';
import { Truck } from 'lucide-react';
import { useCourierSettlementController } from './hooks/useCourierSettlementController';
import { CourierSettlementHeader } from './components/CourierSettlementHeader';
import { CourierSettlementRunSelector } from './components/CourierSettlementRunSelector';
import { CourierSettlementForm } from './CourierSettlementForm';

const CourierSettlementPage: React.FC = () => {
  const {
    runs,
    selectedRunId,
    setSelectedRunId,
    selectedRun,
    treasuryAccounts,
    selectedAccountId,
    setSelectedAccountId,
    actualCash,
    setActualCash,
    notes,
    setNotes,
    loading,
    submitting,
    runStatusFilter,
    setRunStatusFilter,
    page,
    setPage,
    pagination,
    deliveredShipments,
    returnedShipments,
    expectedDeliveredTotal,
    cashDiscrepancy,
    loadEligibleRuns,
    handleSettle,
    formatPrice,
    formatDate,
  } = useCourierSettlementController();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-foreground">
      {/* Header */}
      <CourierSettlementHeader />

      {/* Main Layout: Run Selector & Settlement Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Runs List */}
        <div className="lg:col-span-4">
          <CourierSettlementRunSelector
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRunId={setSelectedRunId}
            runStatusFilter={runStatusFilter}
            onRunStatusFilterChange={setRunStatusFilter}
            loading={loading}
            onRefresh={loadEligibleRuns}
            pagination={pagination}
            page={page}
            onPageChange={setPage}
            formatPrice={formatPrice}
          />
        </div>

        {/* Right Column: Active Settlement Form & Breakdown */}
        <div className="lg:col-span-8">
          {selectedRun ? (
            <CourierSettlementForm
              selectedRun={selectedRun}
              deliveredShipments={deliveredShipments}
              returnedShipments={returnedShipments}
              expectedDeliveredTotal={expectedDeliveredTotal}
              actualCash={actualCash}
              setActualCash={setActualCash}
              notes={notes}
              setNotes={setNotes}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              treasuryAccounts={treasuryAccounts}
              cashDiscrepancy={cashDiscrepancy}
              submitting={submitting}
              onSettle={handleSettle}
              formatPrice={formatPrice}
              formatDate={formatDate}
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-card border border-border/70 rounded-xl text-muted-foreground text-xs p-6 text-center">
              <Truck className="w-8 h-8 mb-2 opacity-40" />
              <span>حدد مأمورية من القائمة الجانبية لبدء التسوية والتوريد</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierSettlementPage;
