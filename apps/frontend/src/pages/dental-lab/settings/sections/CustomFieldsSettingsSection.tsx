import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import {
  type DentalCustomFieldDef,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  fetchCustomFields,
  tKey,
  MODAL_INPUT_CLS,
} from "../../shared";
import {
  sectionCardCls,
  labelCls,
  FIELD_TYPES,
} from "../types/settingsTypes";

interface CustomFieldsSettingsSectionProps {
  customFields: DentalCustomFieldDef[];
  setCustomFields: React.Dispatch<
    React.SetStateAction<DentalCustomFieldDef[]>
  >;
  setError: (err: string | null) => void;
}

export function CustomFieldsSettingsSection({
  customFields,
  setCustomFields,
  setError,
}: CustomFieldsSettingsSectionProps) {
  const { t } = useTranslation();
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [fieldBusyId, setFieldBusyId] = useState<string | null>(null);

  const addField = async () => {
    if (!newFieldName.trim()) return;
    try {
      await createCustomField({
        name: newFieldName.trim(),
        fieldType: newFieldType,
        isActive: true,
      });
      setNewFieldName("");
      setNewFieldType("TEXT");
      const fields = await fetchCustomFields().catch(
        () => [] as DentalCustomFieldDef[]
      );
      setCustomFields(fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const removeField = async (field: DentalCustomFieldDef) => {
    if (fieldBusyId) return;
    if (
      !window.confirm(
        `${t("dentalLab.common.confirmDelete")} (${field.name})`
      )
    ) {
      return;
    }
    setFieldBusyId(field.id);
    try {
      await deleteCustomField(field.id);
      setCustomFields((prev) => prev.filter((f) => f.id !== field.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setFieldBusyId(null);
    }
  };

  const toggleField = async (field: DentalCustomFieldDef) => {
    if (fieldBusyId) return;
    setFieldBusyId(field.id);
    try {
      const updated = await updateCustomField(field.id, {
        isActive: !field.isActive,
      });
      setCustomFields((prev) =>
        prev.map((f) => (f.id === field.id ? updated : f))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setFieldBusyId(null);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div>
        <h3 className="font-semibold">{t("dentalLab.settings.customFields")}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dentalLab.settings.customFieldsHint")}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className={labelCls}>{t("dentalLab.settings.fieldName")}</label>
          <input
            className={inputCls}
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>{t("dentalLab.settings.fieldType")}</label>
          <select
            className={inputCls}
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {tKey(t, `dentalLab.settings.fieldTypes.${ft}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={addField}
          disabled={!newFieldName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("dentalLab.settings.addField")}
        </button>
      </div>
      {customFields.length > 0 && (
        <div className="border dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
          {customFields.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="font-medium">{f.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {f.fieldType
                    ? tKey(t, `dentalLab.settings.fieldTypes.${f.fieldType}`)
                    : "—"}
                </span>
                <button
                  onClick={() => toggleField(f)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    f.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {f.isActive
                    ? t("dentalLab.common.active")
                    : t("dentalLab.common.inactive")}
                </button>
                <button
                  onClick={() => removeField(f)}
                  disabled={fieldBusyId !== null}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg disabled:opacity-40"
                  title={t("dentalLab.common.delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomFieldsSettingsSection;
