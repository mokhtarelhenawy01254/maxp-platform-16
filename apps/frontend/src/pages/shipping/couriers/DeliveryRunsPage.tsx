import React from 'react';
import { useCurrency } from '../../../hooks/useCurrency';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useDeliveryRunsData } from './hooks/useDeliveryRunsData';
import { DeliveryRunsHeader } from './components/DeliveryRunsHeader';
import { DeliveryRunsTable } from './components/DeliveryRunsTable';
import { DeliveryRunDetailModal } from './components/DeliveryRunDetailModal';
import { DeliveryRunReassignModal } from './components/DeliveryRunReassignModal';
import { DeliveryRunWaybillModal } from './components/DeliveryRunWaybillModal';
import { CreateDeliveryRunModal } from './components/CreateDeliveryRunModal';

const DeliveryRunsPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const {
    runs,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pagination,
    fetchRuns,
    selectedRun,
    setSelectedRun,
    viewingWaybill,
    setViewingWaybill,
    isCreateModalOpen,
    setIsCreateModalOpen,
    activeCouriers,
    selectedCourierId,
    setSelectedCourierId,
    orderNumbersInput,
    setOrderNumbersInput,
    dispatchNotes,
    setDispatchNotes,
    submittingDispatch,
    readyOrders,
    loadingReadyOrders,
    selectedReadyOrderNumbers,
    reassigningShipment,
    setReassigningShipment,
    reassignCourierId,
    setReassignCourierId,
    reassigning,
    openReassign,
    confirmReassign,
    handleCopyMobileLink,
    handleShareWhatsApp,
    handleOpenDetail,
    handleOpenCreateRun,
    toggleReadyOrder,
    handleConfirmCreateRun,
    handlePrint
  } = useDeliveryRunsData();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      <DeliveryRunsHeader onOpenCreateRun={handleOpenCreateRun} />

      <DeliveryRunsTable
        runs={runs}
        loading={loading}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        page={page}
        setPage={setPage}
        pagination={pagination}
        fetchRuns={fetchRuns}
        handleCopyMobileLink={handleCopyMobileLink}
        handleShareWhatsApp={handleShareWhatsApp}
        handleOpenDetail={handleOpenDetail}
        formatDate={formatDate}
        formatPrice={formatPrice}
      />

      {selectedRun && (
        <DeliveryRunDetailModal
          selectedRun={selectedRun}
          onClose={() => setSelectedRun(null)}
          onCopyMobileLink={handleCopyMobileLink}
          onShareWhatsApp={handleShareWhatsApp}
          onViewWaybill={setViewingWaybill}
          onPrint={handlePrint}
          onOpenReassign={openReassign}
          formatDate={formatDate}
          formatPrice={formatPrice}
        />
      )}

      {reassigningShipment && (
        <DeliveryRunReassignModal
          reassigningShipment={reassigningShipment}
          selectedRun={selectedRun}
          activeCouriers={activeCouriers}
          reassignCourierId={reassignCourierId}
          setReassignCourierId={setReassignCourierId}
          reassigning={reassigning}
          onClose={() => setReassigningShipment(null)}
          onConfirm={confirmReassign}
        />
      )}

      {viewingWaybill && (
        <DeliveryRunWaybillModal
          viewingWaybill={viewingWaybill}
          onClose={() => setViewingWaybill(null)}
          onPrint={handlePrint}
          formatDate={formatDate}
          formatPrice={formatPrice}
        />
      )}

      <CreateDeliveryRunModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        activeCouriers={activeCouriers}
        selectedCourierId={selectedCourierId}
        setSelectedCourierId={setSelectedCourierId}
        readyOrders={readyOrders}
        loadingReadyOrders={loadingReadyOrders}
        selectedReadyOrderNumbers={selectedReadyOrderNumbers}
        toggleReadyOrder={toggleReadyOrder}
        orderNumbersInput={orderNumbersInput}
        setOrderNumbersInput={setOrderNumbersInput}
        dispatchNotes={dispatchNotes}
        setDispatchNotes={setDispatchNotes}
        submittingDispatch={submittingDispatch}
        onConfirm={handleConfirmCreateRun}
        formatPrice={formatPrice}
      />
    </div>
  );
};

export default DeliveryRunsPage;
