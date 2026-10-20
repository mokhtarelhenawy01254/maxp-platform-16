import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Tag, Truck } from 'lucide-react';
import { useReturnSettingsData } from './hooks/useReturnSettingsData';
import { ReturnDisplaySettingsTab } from './components/ReturnDisplaySettingsTab';
import { ReturnReasonsTab } from './components/ReturnReasonsTab';
import { ReturnShippingTypesTab } from './components/ReturnShippingTypesTab';

const ReturnSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    displayConfig,
    setDisplayConfig,
    settingsLoading,
    saving,
    handleSaveDisplayConfig,
    toggleDisplayField,
    isOrderStatusVisible,
    toggleOrderStatusField,
    ORDER_STATUS_FIELDS,
    DISPLAY_FIELDS,
    categories,
    reasons,
    loading,
    addDefaults,
    deleteCategory,
    deleteReason,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    editingCategory,
    setEditingCategory,
    categoryName,
    setCategoryName,
    defaultRole,
    setDefaultRole,
    handleSaveCategory,
    isReasonModalOpen,
    setIsReasonModalOpen,
    editingReason,
    setEditingReason,
    reasonText,
    setReasonText,
    reasonDesc,
    setReasonDesc,
    selectedCategoryId,
    setSelectedCategoryId,
    handleSaveReason,
    shippingCompanies,
    typesLoading,
    isTypeModalOpen,
    setIsTypeModalOpen,
    editingType,
    typeName,
    setTypeName,
    typeShippingCompanyId,
    setTypeShippingCompanyId,
    typeCode,
    setTypeCode,
    typeCostModel,
    setTypeCostModel,
    typeFixedAmount,
    setTypeFixedAmount,
    savingType,
    openTypeModal,
    handleSaveType,
    deleteType,
  } = useReturnSettingsData();

  return (
    <div
      className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white"
      dir="rtl"
    >
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            {t('returns.k_160')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {t('returns.k_161')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 w-full sm:w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('display')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'display'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Eye size={16} /> {t('returns.k_162')}
        </button>
        <button
          onClick={() => setActiveTab('reasons')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'reasons'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Tag size={16} /> {t('returns.k_163')}
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'types'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Truck size={16} /> {t('returns.k_230')}
        </button>
      </div>

      {activeTab === 'display' && (
        <ReturnDisplaySettingsTab
          settingsLoading={settingsLoading}
          displayConfig={displayConfig}
          setDisplayConfig={setDisplayConfig}
          toggleDisplayField={toggleDisplayField}
          DISPLAY_FIELDS={DISPLAY_FIELDS}
          ORDER_STATUS_FIELDS={ORDER_STATUS_FIELDS}
          isOrderStatusVisible={isOrderStatusVisible}
          toggleOrderStatusField={toggleOrderStatusField}
          handleSaveDisplayConfig={handleSaveDisplayConfig}
          saving={saving}
        />
      )}

      {activeTab === 'reasons' && (
        <ReturnReasonsTab
          categories={categories}
          reasons={reasons}
          loading={loading}
          addDefaults={addDefaults}
          deleteCategory={deleteCategory}
          deleteReason={deleteReason}
          isCategoryModalOpen={isCategoryModalOpen}
          setIsCategoryModalOpen={setIsCategoryModalOpen}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
          defaultRole={defaultRole}
          setDefaultRole={setDefaultRole}
          handleSaveCategory={handleSaveCategory}
          isReasonModalOpen={isReasonModalOpen}
          setIsReasonModalOpen={setIsReasonModalOpen}
          editingReason={editingReason}
          setEditingReason={setEditingReason}
          reasonText={reasonText}
          setReasonText={setReasonText}
          reasonDesc={reasonDesc}
          setReasonDesc={setReasonDesc}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          handleSaveReason={handleSaveReason}
        />
      )}

      {activeTab === 'types' && (
        <ReturnShippingTypesTab
          typesLoading={typesLoading}
          shippingCompanies={shippingCompanies}
          openTypeModal={openTypeModal}
          deleteType={deleteType}
          isTypeModalOpen={isTypeModalOpen}
          setIsTypeModalOpen={setIsTypeModalOpen}
          editingType={editingType}
          typeName={typeName}
          setTypeName={setTypeName}
          typeShippingCompanyId={typeShippingCompanyId}
          setTypeShippingCompanyId={setTypeShippingCompanyId}
          typeCode={typeCode}
          setTypeCode={setTypeCode}
          typeCostModel={typeCostModel}
          setTypeCostModel={setTypeCostModel}
          typeFixedAmount={typeFixedAmount}
          setTypeFixedAmount={setTypeFixedAmount}
          savingType={savingType}
          handleSaveType={handleSaveType}
        />
      )}
    </div>
  );
};

export default ReturnSettingsPage;
