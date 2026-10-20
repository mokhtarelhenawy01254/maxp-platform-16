import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X as XMarkIcon } from "lucide-react";
import {
  type ClinicDoctorItem,
  createDoctor,
  updateDoctor,
  MODAL_INPUT_CLS,
} from "../../shared";
import type { DoctorForm } from "../types/doctorsTypes";
import { DoctorEditGeneralFields } from "./components/DoctorEditGeneralFields";
import { DoctorClinicTeamSection } from "./components/DoctorClinicTeamSection";

interface DoctorEditModalProps {
  modal: DoctorForm;
  onClose: () => void;
  onSaved: () => void;
}

export function DoctorEditModal({
  modal: initialModal,
  onClose,
  onSaved,
}: DoctorEditModalProps) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<DoctorForm>(initialModal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (fields: Partial<DoctorForm>) => {
    setModal((prev) => ({ ...prev, ...fields }));
  };

  const handleAddClinicDoctor = (newDoc: ClinicDoctorItem) => {
    setModal((prev) => ({
      ...prev,
      doctors: [...(prev.doctors || []), newDoc],
    }));
  };

  const handleRemoveClinicDoctor = (index: number) => {
    const list = [...(modal.doctors || [])];
    list.splice(index, 1);
    setModal((prev) => ({ ...prev, doctors: list }));
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) {
      setError(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        phone: modal.phone.trim() || undefined,
        clinicName: modal.clinicName.trim() || undefined,
        governorate: modal.governorate.trim() || undefined,
        portalPin: modal.portalPin.trim() || undefined,
        creditLimit: Number(modal.creditLimit) || 0,
        notes: modal.notes.trim() || undefined,
        doctors: modal.doctors && modal.doctors.length > 0 ? modal.doctors : [],
      };
      if (modal.id) {
        await updateDoctor(modal.id, { ...payload, isActive: modal.isActive });
        toast.success(t("dentalLab.doctors.updated"));
      } else {
        await createDoctor({ ...payload, isActive: true });
        toast.success(t("dentalLab.doctors.created"));
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">
            {modal.id
              ? t("dentalLab.doctors.editTitle")
              : t("dentalLab.doctors.createTitle")}
          </h3>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DoctorEditGeneralFields
            modal={modal}
            onChange={handleFieldChange}
            inputCls={inputCls}
            labelCls={labelCls}
          />

          <DoctorClinicTeamSection
            doctors={modal.doctors || []}
            onAddDoctor={handleAddClinicDoctor}
            onRemoveDoctor={handleRemoveClinicDoctor}
            inputCls={inputCls}
          />

          {modal.id && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={modal.isActive}
                onChange={(e) =>
                  setModal({ ...modal, isActive: e.target.checked })
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              {t("dentalLab.common.active")}
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving || !modal.name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DoctorEditModal;
