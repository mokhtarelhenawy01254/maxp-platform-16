import { MODAL_CONTENT_CLS } from "../../shared";
import type { TechnicianEditModalProps } from "./edit-modal/types";
import { TechnicianModalHeader } from "./edit-modal/components/TechnicianModalHeader";
import { TechnicianBasicFields } from "./edit-modal/components/TechnicianBasicFields";
import { TechnicianWorkingDaysSection } from "./edit-modal/components/TechnicianWorkingDaysSection";
import { TechnicianVacationsSection } from "./edit-modal/components/TechnicianVacationsSection";
import { TechnicianAccountSection } from "./edit-modal/components/TechnicianAccountSection";
import { TechnicianModalFooter } from "./edit-modal/components/TechnicianModalFooter";

export type { TechnicianEditModalProps };

export function TechnicianEditModal({
  modal,
  setModal,
  rows,
  saving,
  error,
  onSave,
  onClose,
}: TechnicianEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full max-h-[92vh] overflow-y-auto`}>
        <TechnicianModalHeader
          isEditing={Boolean(modal.id)}
          error={error}
          onClose={onClose}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TechnicianBasicFields
            modal={modal}
            setModal={setModal}
            rows={rows}
          />

          <TechnicianWorkingDaysSection
            modal={modal}
            setModal={setModal}
          />

          <TechnicianVacationsSection
            modal={modal}
            setModal={setModal}
          />

          <TechnicianAccountSection
            modal={modal}
            setModal={setModal}
          />
        </div>

        <TechnicianModalFooter
          saving={saving}
          nameTrimmed={Boolean(modal.name.trim())}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default TechnicianEditModal;
