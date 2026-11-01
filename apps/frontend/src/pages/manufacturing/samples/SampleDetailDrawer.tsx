import React from 'react';
import { X } from 'lucide-react';
import { ConvertToOrderModal } from './ConvertToOrderModal';
import { SampleApproveModal, SampleRejectModal } from './SampleApproveRejectModals';
import { ShareSampleModal } from './ShareSampleModal';
import {
  SampleDetailDrawerProps,
  useSampleDetailDrawer,
  DrawerHeader,
  DrawerReceiptStatusBar,
  DrawerStatusBanners,
  DrawerTabsNav,
  SampleStagesTab,
  SampleInfoTab,
  SampleAttachmentsTab,
  SampleFinanceTab,
  SampleComponentsTab,
  SamplePaymentModal,
  SampleFactoryModal,
  DrawerFooterActions,
} from './sample-detail-drawer';

export const SampleDetailDrawer: React.FC<SampleDetailDrawerProps> = ({
  sample,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const {
    navigate,
    activeTab,
    setActiveTab,
    loading,
    actionError,
    setActionError,
    isConvertModalOpen,
    setIsConvertModalOpen,
    isRejectModalOpen,
    setIsRejectModalOpen,
    isApproveModalOpen,
    setIsApproveModalOpen,
    isShareModalOpen,
    setIsShareModalOpen,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentPaidAt,
    setPaymentPaidAt,
    paymentNotes,
    setPaymentNotes,
    paymentReference,
    setPaymentReference,
    paymentSubmitting,
    paymentError,
    isFactoryModalOpen,
    setIsFactoryModalOpen,
    factories,
    selectedFactoryId,
    setSelectedFactoryId,
    selectedExpectedDeliveryAt,
    setSelectedExpectedDeliveryAt,
    newStageName,
    setNewStageName,
    isAddingStage,
    setIsAddingStage,
    uploadingFile,
    isAddingExpense,
    setIsAddingExpense,
    expenseNameInput,
    setExpenseNameInput,
    expenseAmountInput,
    setExpenseAmountInput,
    expenseSubmitting,
    handleStageStatusChange,
    handleAddStage,
    handleAddExpense,
    handleDeleteExpense,
    handleApprove,
    handleReject,
    handleOpenPaymentModal,
    handleRecordPayment,
    handleDeletePayment,
    handleOpenFactoryModal,
    handleSaveFactoryCommercial,
    handleFileUpload,
    handleToggleReceipt,
    handleDeleteAttachment,
  } = useSampleDetailDrawer(sample, onRefresh);

  if (!isOpen || !sample) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-full max-w-xl z-50 bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        <DrawerHeader
          sample={sample}
          onShare={() => setIsShareModalOpen(true)}
          onClose={onClose}
        />

        <DrawerReceiptStatusBar
          sample={sample}
          loading={loading}
          onToggleReceipt={handleToggleReceipt}
        />

        {actionError && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <DrawerStatusBanners
          sample={sample}
          onNavigateOrder={(orderId) =>
            navigate(`/manufacturing/orders/${orderId}`)
          }
          onOpenConvertModal={() => setIsConvertModalOpen(true)}
        />

        <DrawerTabsNav
          sample={sample}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'stages' && (
            <SampleStagesTab
              sample={sample}
              loading={loading}
              isAddingStage={isAddingStage}
              setIsAddingStage={setIsAddingStage}
              newStageName={newStageName}
              setNewStageName={setNewStageName}
              onAddStage={handleAddStage}
              onStageStatusChange={handleStageStatusChange}
            />
          )}

          {activeTab === 'info' && (
            <SampleInfoTab
              sample={sample}
              isAddingExpense={isAddingExpense}
              setIsAddingExpense={setIsAddingExpense}
              expenseNameInput={expenseNameInput}
              setExpenseNameInput={setExpenseNameInput}
              expenseAmountInput={expenseAmountInput}
              setExpenseAmountInput={setExpenseAmountInput}
              expenseSubmitting={expenseSubmitting}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'attachments' && (
            <SampleAttachmentsTab
              sample={sample}
              uploadingFile={uploadingFile}
              onFileUpload={handleFileUpload}
              onDeleteAttachment={handleDeleteAttachment}
            />
          )}

          {activeTab === 'finance' && (
            <SampleFinanceTab
              sample={sample}
              loading={loading}
              onOpenFactoryModal={handleOpenFactoryModal}
              onOpenPaymentModal={handleOpenPaymentModal}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'components' && (
            <SampleComponentsTab
              sampleId={sample.id}
              readOnly={sample.status === 'CONVERTED'}
            />
          )}
        </div>

        <DrawerFooterActions
          sample={sample}
          loading={loading}
          onOpenApproveModal={() => setIsApproveModalOpen(true)}
          onOpenRejectModal={() => setIsRejectModalOpen(true)}
          onOpenConvertModal={() => setIsConvertModalOpen(true)}
        />
      </div>

      <ConvertToOrderModal
        isOpen={isConvertModalOpen}
        sample={sample}
        onClose={() => setIsConvertModalOpen(false)}
        onSuccess={(order) => {
          onRefresh();
          navigate(`/manufacturing/orders/${order.id}`);
        }}
      />

      <SampleApproveModal
        isOpen={isApproveModalOpen}
        loading={loading}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      <SampleRejectModal
        isOpen={isRejectModalOpen}
        loading={loading}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleReject}
      />

      <ShareSampleModal
        sample={sample}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onRefresh={onRefresh}
      />

      <SamplePaymentModal
        sample={sample}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentPaidAt={paymentPaidAt}
        setPaymentPaidAt={setPaymentPaidAt}
        paymentReference={paymentReference}
        setPaymentReference={setPaymentReference}
        paymentNotes={paymentNotes}
        setPaymentNotes={setPaymentNotes}
        paymentSubmitting={paymentSubmitting}
        paymentError={paymentError}
        onRecordPayment={handleRecordPayment}
      />

      <SampleFactoryModal
        isOpen={isFactoryModalOpen}
        onClose={() => setIsFactoryModalOpen(false)}
        loading={loading}
        factories={factories}
        selectedFactoryId={selectedFactoryId}
        setSelectedFactoryId={setSelectedFactoryId}
        selectedExpectedDeliveryAt={selectedExpectedDeliveryAt}
        setSelectedExpectedDeliveryAt={setSelectedExpectedDeliveryAt}
        onSaveFactoryCommercial={handleSaveFactoryCommercial}
      />
    </>
  );
};

export default SampleDetailDrawer;
