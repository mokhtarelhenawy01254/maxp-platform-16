import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ReturnRequest } from '../../services/returnService';
import { useReturnDetailsModal } from './hooks/useReturnDetailsModal';
import { ReturnDetailsTab } from './components/ReturnDetailsTab';
import { ReturnContactHistoryTab } from './components/ReturnContactHistoryTab';
import { ReturnActivityTimelineTab } from './components/ReturnActivityTimelineTab';

export interface ReturnDetailsModalProps {
  request: ReturnRequest;
  onClose: () => void;
  onUpdate: () => void;
}

const ReturnDetailsModal: React.FC<ReturnDetailsModalProps> = ({
  request,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    contactHistory,
    activityLog,
    loadingLogs,
    contactMethod,
    setContactMethod,
    contactResult,
    setContactResult,
    contactNotes,
    setContactNotes,
    reasonId,
    setReasonId,
    customerNotes,
    setCustomerNotes,
    responsibleParty,
    setResponsibleParty,
    adminNotes,
    setAdminNotes,
    shippingReturnCost,
    setShippingReturnCost,
    settlementAmount,
    setSettlementAmount,
    submittingReview,
    shippingCompanies,
    returnTypes,
    shippingCompanyId,
    returnTypeId,
    categories,
    reasons,
    responsiblePartyOptions,
    activityFilter,
    setActivityFilter,
    handleShippingCompanyChange,
    handleReturnTypeChange,
    getSuggestedCost,
    handleSaveReview,
    handleAddContact,
  } = useReturnDetailsModal(request, onUpdate);

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col shadow-xl mx-2 md:mx-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {t('returns.k_189')}{request.order?.orderNumber}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
              {new Date(request.createdAt).toLocaleString('ar-EG')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('returns.k_190')}
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'contact'
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('returns.k_191')}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'activity'
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('returns.k_192')}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
          {activeTab === 'details' && (
            <ReturnDetailsTab
              request={request}
              responsibleParty={responsibleParty}
              setResponsibleParty={setResponsibleParty}
              responsiblePartyOptions={responsiblePartyOptions}
              reasonId={reasonId}
              setReasonId={setReasonId}
              reasons={reasons}
              categories={categories}
              customerNotes={customerNotes}
              setCustomerNotes={setCustomerNotes}
              adminNotes={adminNotes}
              setAdminNotes={setAdminNotes}
              shippingCompanyId={shippingCompanyId}
              handleShippingCompanyChange={handleShippingCompanyChange}
              shippingCompanies={shippingCompanies}
              returnTypeId={returnTypeId}
              handleReturnTypeChange={handleReturnTypeChange}
              returnTypes={returnTypes}
              getSuggestedCost={getSuggestedCost}
              shippingReturnCost={shippingReturnCost}
              setShippingReturnCost={setShippingReturnCost}
              settlementAmount={settlementAmount}
              setSettlementAmount={setSettlementAmount}
            />
          )}

          {activeTab === 'contact' && (
            <ReturnContactHistoryTab
              handleAddContact={handleAddContact}
              contactMethod={contactMethod}
              setContactMethod={setContactMethod}
              contactResult={contactResult}
              setContactResult={setContactResult}
              contactNotes={contactNotes}
              setContactNotes={setContactNotes}
              loadingLogs={loadingLogs}
              contactHistory={contactHistory}
            />
          )}

          {activeTab === 'activity' && (
            <ReturnActivityTimelineTab
              request={request}
              loadingLogs={loadingLogs}
              activityLog={activityLog}
              activityFilter={activityFilter}
              setActivityFilter={setActivityFilter}
              reasons={reasons}
              shippingCompanies={shippingCompanies}
              returnTypes={returnTypes}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('returns.k_220')}
          </button>
          {activeTab === 'details' && (
            <button
              onClick={handleSaveReview}
              disabled={submittingReview}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md text-sm font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {submittingReview ? t('returns.k_105') : t('returns.k_134')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnDetailsModal;
