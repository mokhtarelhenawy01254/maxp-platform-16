import React from 'react';
import { Sparkles } from 'lucide-react';
import { CategoryModal } from './components/CategoryModal';
import { ReasonModal } from './components/ReasonModal';
import { CancellationCategoriesCard } from './components/CancellationCategoriesCard';
import { CancellationReasonsTable } from './components/CancellationReasonsTable';
import { useCancellationSettingsController } from './hooks/useCancellationSettingsController';

export interface CancellationSettingsPageProps {
  isEmbedded?: boolean;
}

const CancellationSettingsPage: React.FC<CancellationSettingsPageProps> = ({ isEmbedded = false }) => {
  const {
    t,
    categories,
    reasons,
    loading,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    isReasonModalOpen,
    setIsReasonModalOpen,
    editingCategory,
    editingReason,
    categoryName,
    setCategoryName,
    reasonText,
    setReasonText,
    reasonDesc,
    setReasonDesc,
    selectedCategoryId,
    setSelectedCategoryId,
    addDefaults,
    openNewCategoryModal,
    openEditCategoryModal,
    handleSaveCategory,
    openNewReasonModal,
    openEditReasonModal,
    handleSaveReason,
    deleteReason,
  } = useCancellationSettingsController();

  return (
    <div
      className={isEmbedded ? '' : 'p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white'}
      dir="rtl"
    >
      {!isEmbedded && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {t('cancellations.k_43')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('cancellations.k_44')}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addDefaults}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors text-sm font-medium active:scale-[0.98]"
          >
            <Sparkles size={18} /> {t('cancellations.k_45')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CancellationCategoriesCard
          loading={loading}
          categories={categories}
          onAddCategory={openNewCategoryModal}
          onEditCategory={openEditCategoryModal}
          t={t}
        />

        <CancellationReasonsTable
          loading={loading}
          reasons={reasons}
          onAddReason={openNewReasonModal}
          onEditReason={openEditReasonModal}
          onDeleteReason={deleteReason}
          t={t}
        />
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        isEditing={Boolean(editingCategory)}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
      />

      <ReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        onSave={handleSaveReason}
        isEditing={Boolean(editingReason)}
        reasonText={reasonText}
        setReasonText={setReasonText}
        reasonDesc={reasonDesc}
        setReasonDesc={setReasonDesc}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        categories={categories}
      />
    </div>
  );
};

export default CancellationSettingsPage;
