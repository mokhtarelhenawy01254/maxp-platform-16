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
import { NoSymbolIcon } from '@heroicons/react/24/outline';

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
    handlePrint,
    revokingRun,
    setRevokingRun,
    isRevoking,
    handleRevokeLink,
    confirmRevokeLink
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
        onRevokeLink={handleRevokeLink}
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
          onRevokeLink={handleRevokeLink}
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
      {/* Link Revocation Confirmation Modal */}
      {revokingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4" dir="rtl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
                <NoSymbolIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  إلغاء صلاحية رابط المندوب
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  المأمورية {revokingRun.runNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من إلغاء صلاحية هذا الرابط؟ لن يتمكن المندوب من فتحه بهذا الرابط القديم.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRevokingRun(null)}
                disabled={isRevoking}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmRevokeLink}
                disabled={isRevoking}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isRevoking ? 'جاري الإلغاء...' : 'تأكيد إلغاء الرابط'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryRunsPage;
