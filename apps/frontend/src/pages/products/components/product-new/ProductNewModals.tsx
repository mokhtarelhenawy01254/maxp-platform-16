import React from "react";
import { ConvertToPresentationModal } from "../ConvertToPresentationModal";
import { CategoryFormModal } from "../../../../components/category/CategoryFormModal";
import { ProductCategory } from "./types";

interface ProductNewModalsProps {
  showConvertModal: boolean;
  effectiveProductId?: string;
  displayCurrency: string;
  setShowConvertModal: (show: boolean) => void;
  convertToPresentation: any;
  handleConverted: any;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (open: boolean) => void;
  setCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  setError: (err: string | null) => void;
}

export const ProductNewModals: React.FC<ProductNewModalsProps> = ({
  showConvertModal,
  effectiveProductId,
  displayCurrency,
  setShowConvertModal,
  convertToPresentation,
  handleConverted,
  isCategoryModalOpen,
  setIsCategoryModalOpen,
  setCategories,
  setFormData,
  setError,
}) => {
  return (
    <>
      {showConvertModal && effectiveProductId && (
        <ConvertToPresentationModal
          open={showConvertModal}
          currentProductId={effectiveProductId}
          displayCurrency={displayCurrency}
          onClose={() => setShowConvertModal(false)}
          onConvert={convertToPresentation}
          onSuccess={handleConverted}
        />
      )}

      <CategoryFormModal
        open={isCategoryModalOpen}
        editingCategory={null}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={(category) => {
          setCategories((prev) => {
            if (prev.some((c) => c.id === category.id)) {
              return prev;
            }
            return [...prev, category as ProductCategory];
          });
          setFormData((prev: any) => ({
            ...prev,
            category: category.id,
          }));
          setError(null);
        }}
      />
    </>
  );
};

export default ProductNewModals;
