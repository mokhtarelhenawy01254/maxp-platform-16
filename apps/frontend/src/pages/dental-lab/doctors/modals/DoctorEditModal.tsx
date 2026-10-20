import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2, Users, X as XMarkIcon } from "lucide-react";
import {
  type ClinicDoctorItem,
  createDoctor,
  updateDoctor,
  MODAL_INPUT_CLS,
} from "../../shared";
import type { DoctorForm } from "../types/doctorsTypes";

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

  // حقول إضافة دكتور فرعي داخل العيادة
  const [docNameInput, setDocNameInput] = useState("");
  const [docPhoneInput, setDocPhoneInput] = useState("");
  const [docSpecInput, setDocSpecInput] = useState("");

  const handleAddClinicDoctor = () => {
    if (!docNameInput.trim()) return;
    const newDoc: ClinicDoctorItem = {
      id: "doc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: docNameInput.trim(),
      phone: docPhoneInput.trim() || undefined,
      specialty: docSpecInput.trim() || undefined,
    };
    setModal((prev) => ({
      ...prev,
      doctors: [...(prev.doctors || []), newDoc],
    }));
    setDocNameInput("");
    setDocPhoneInput("");
    setDocSpecInput("");
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
          <div>
            <label className={labelCls}>{t("dentalLab.common.name")} *</label>
            <input
              className={inputCls}
              value={modal.name}
              onChange={(e) => setModal({ ...modal, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>{t("dentalLab.common.phone")}</label>
            <input
              className={`${inputCls} font-mono`}
              value={modal.phone}
              onChange={(e) => setModal({ ...modal, phone: e.target.value })}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>{t("dentalLab.doctors.clinicName")}</label>
            <input
              className={inputCls}
              value={modal.clinicName}
              onChange={(e) => setModal({ ...modal, clinicName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>
              {t("dentalLab.doctors.governorate")}
            </label>
            <input
              className={inputCls}
              value={modal.governorate}
              onChange={(e) =>
                setModal({ ...modal, governorate: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelCls}>{t("dentalLab.doctors.portalPin")}</label>
            <input
              className={`${inputCls} font-mono`}
              value={modal.portalPin}
              onChange={(e) => setModal({ ...modal, portalPin: e.target.value })}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>
              {t("dentalLab.doctors.creditLimit")}
            </label>
            <input
              className={`${inputCls} font-mono tabular-nums`}
              type="number"
              value={modal.creditLimit}
              onChange={(e) =>
                setModal({ ...modal, creditLimit: Number(e.target.value) })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{t("dentalLab.common.notes")}</label>
            <textarea
              className={`${inputCls} min-h-[70px] resize-y`}
              value={modal.notes}
              onChange={(e) => setModal({ ...modal, notes: e.target.value })}
            />
          </div>

          {/* قائمة أطباء العيادة (للمراكز والعيادات التي تضم أكثر من طبيب) */}
          <div className="sm:col-span-2 border-t dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>أطباء العيادة / الفريق الطبي التابع للعيادة</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  إذا كانت العيادة أو المركز يضم أكثر من دكتور، يمكنك تسجيل
                  أسمائهم هنا لربط أوردراتهم بنفس حساب العيادة الموحد دون تشتيت
                  الحسابات.
                </p>
              </div>
            </div>

            {/* فورم إضافة دكتور للعيادة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg border dark:border-gray-700 mb-3">
              <input
                className={`${inputCls} text-xs`}
                placeholder="اسم الدكتور (مثال: د. سارة أحمد)"
                value={docNameInput}
                onChange={(e) => setDocNameInput(e.target.value)}
              />
              <input
                className={`${inputCls} text-xs`}
                placeholder="التخصص (مثال: تركيبات / زراعة)"
                value={docSpecInput}
                onChange={(e) => setDocSpecInput(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className={`${inputCls} text-xs flex-1 font-mono`}
                  placeholder="الهاتف (اختياري)"
                  value={docPhoneInput}
                  onChange={(e) => setDocPhoneInput(e.target.value)}
                  dir="ltr"
                />
                <button
                  type="button"
                  disabled={!docNameInput.trim()}
                  onClick={handleAddClinicDoctor}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-40 shrink-0"
                >
                  إضافة
                </button>
              </div>
            </div>

            {/* قائمة الأطباء المضافين */}
            {modal.doctors && modal.doctors.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {modal.doctors.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {doc.name}
                      </span>
                      {doc.specialty && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px]">
                          {doc.specialty}
                        </span>
                      )}
                      {doc.phone && (
                        <span className="text-gray-400 text-[10px] font-mono" dir="ltr">
                          {doc.phone}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveClinicDoctor(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="حذف الطبيب من العيادة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                لم يتم إضافة أطباء إضافيين للعيادة بعد (الحساب يسجل باسم الطبيب
                الرئيسي أعلاه).
              </p>
            )}
          </div>

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
