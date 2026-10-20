import { MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "../../shared";
import type { WorkTypeForm } from "../types/workTypeTypes";
import { WorkTypeLivePreview } from "../components/WorkTypeLivePreview";
import { useWorkTypeEditForm } from "./edit-modal/hooks/useWorkTypeEditForm";
import { WorkTypeModalHeader } from "./edit-modal/components/WorkTypeModalHeader";
import { WorkTypeBasicPricingFields } from "./edit-modal/components/WorkTypeBasicPricingFields";
import { WorkTypeMaterialWarrantyFields } from "./edit-modal/components/WorkTypeMaterialWarrantyFields";
import { WorkTypeModalFooter } from "./edit-modal/components/WorkTypeModalFooter";

export interface WorkTypeEditModalProps {
  modal: WorkTypeForm;
  onClose: () => void;
  onSaved: () => void;
}

export function WorkTypeEditModal({
  modal: initialModal,
  onClose,
  onSaved,
}: WorkTypeEditModalProps) {
  const {
    modal,
    setModal,
    saving,
    error,
    save,
    liveProfit,
    liveMarginPct,
  } = useWorkTypeEditForm({
    initialModal,
    onSaved,
  });

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3"
      onClick={() => !saving && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <WorkTypeModalHeader
          isEdit={Boolean(modal.id)}
          saving={saving}
          onClose={onClose}
        />

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Modal Body with 2-column layout: Form & Live Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-2 space-y-4">
            <WorkTypeBasicPricingFields
              modal={modal}
              setModal={setModal}
              inputCls={inputCls}
              labelCls={labelCls}
            />

            <WorkTypeMaterialWarrantyFields
              modal={modal}
              setModal={setModal}
              inputCls={inputCls}
              labelCls={labelCls}
            />
          </div>

          {/* Right Column: Live Interactive Card Preview & Margin Analyzer */}
          <WorkTypeLivePreview
            modal={modal}
            liveProfit={liveProfit}
            liveMarginPct={liveMarginPct}
          />
        </div>

        {/* Modal Footer */}
        <WorkTypeModalFooter
          saving={saving}
          canSave={Boolean(modal.name.trim())}
          onClose={onClose}
          onSave={save}
        />
      </div>
    </div>
  );
}

export default WorkTypeEditModal;
