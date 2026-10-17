import React from "react";
import { useTranslation } from "react-i18next";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { OrderDetailsType } from "../types";
import { CustomerInfoCardCustomFieldConfig } from "./customerCardTypes";

interface CustomerNotesSectionProps {
  order: OrderDetailsType;
  isEditing: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  isCustomFieldEnabled?: boolean;
  customFieldConfig: CustomerInfoCardCustomFieldConfig;
  customFields: Array<{ label: string; value: string }>;
  displayNotes?: string;
}

export const CustomerNotesSection: React.FC<CustomerNotesSectionProps> = ({
  order,
  isEditing,
  editForm,
  setEditForm,
  isCustomFieldEnabled,
  customFieldConfig,
  customFields,
  displayNotes,
}) => {
  const { t } = useTranslation();

  if (!((order.notes && order.notes.trim()) || (isEditing && editForm))) {
    return null;
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
        {isCustomFieldEnabled && customFields.length > 0
          ? customFieldConfig.label
            ? `${customFieldConfig.label} / ${t("orderDetails.orderNotes", "ملاحظات الطلب")}`
            : t("orderDetails.customFieldsAndNotes", "المواصفات وملاحظات الطلب")
          : t("orderDetails.orderNotes", "ملاحظات الطلب")}
      </label>
      {isEditing ? (
        <textarea
          value={editForm.notes || ""}
          onChange={(e) =>
            setEditForm({ ...editForm, notes: e.target.value })
          }
          className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100"
          rows={3}
          placeholder={
            isCustomFieldEnabled
              ? customFieldConfig.placeholder ||
                t(
                  "orderDetails.customFieldEditPlaceholder",
                  "أدخل تفاصيل ومواصفات الطلب...",
                )
              : t(
                  "orderDetails.notesPlaceholder",
                  "أدخل ملاحظات الطلب...",
                )
          }
        />
      ) : isCustomFieldEnabled && customFields.length > 0 ? (
        <div className="space-y-2">
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-amber-200/70 dark:border-amber-900/40">
              <DocumentTextIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                {customFieldConfig.label ||
                  t(
                    "orderDetails.customFieldsHeader",
                    "المواصفات والحقول المخصصة",
                  )}
              </span>
            </div>
            <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
              {customFields.map((cf, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                >
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {cf.label}:
                  </span>
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100 text-end">
                    {cf.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {displayNotes ? (
            <div className="rounded-xl border border-gray-200/90 bg-gray-50/80 p-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200 shadow-xs">
              <span className="text-xs font-semibold block mb-1 text-gray-500 dark:text-gray-400">
                {t("orderDetails.additionalNotes", "ملاحظات إضافية:")}
              </span>
              <p className="whitespace-pre-wrap font-medium leading-relaxed">
                {displayNotes}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200/90 bg-gray-50/80 p-3.5 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-100 shadow-xs">
          <div className="flex items-start gap-2.5">
            <DocumentTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full min-w-0">
              <p className="whitespace-pre-wrap font-medium leading-relaxed">
                {order.notes}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
