import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/hooks/useDateFormat";
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  StarIcon,
  DocumentTextIcon,
  TagIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { CustomerDetailsData } from "./types";

interface CustomerInfoTabProps {
  customer: CustomerDetailsData["customer"];
  customerTags: string[];
  newTag: string;
  onNewTagChange: (val: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  editingBirthday: boolean;
  onEditingBirthdayChange: (val: boolean) => void;
  tempBirthday: string;
  onTempBirthdayChange: (val: string) => void;
  onSaveBirthday: () => void;
}

export const CustomerInfoTab: React.FC<CustomerInfoTabProps> = ({
  customer,
  customerTags,
  newTag,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  editingBirthday,
  onEditingBirthdayChange,
  tempBirthday,
  onTempBirthdayChange,
  onSaveBirthday,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
          {t("customers.contactInfo")}
        </h3>
        <div className="space-y-3">
          {customer.phone && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <PhoneIcon className="h-4 w-4 text-zinc-400" />
              <span className="font-mono tabular-nums">{customer.phone}</span>
            </div>
          )}

          {customer.email && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <EnvelopeIcon className="h-4 w-4 text-zinc-400" />
              <span>{customer.email}</span>
            </div>
          )}

          {(customer.address || customer.city || customer.country) && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <MapPinIcon className="h-4 w-4 text-zinc-400" />
              <span>
                {[customer.address, customer.city, customer.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Birthday Inline Editor */}
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
            <CalendarIcon className="h-4 w-4 text-zinc-400" />
            {editingBirthday ? (
              <div className="flex gap-2 w-full max-w-xs items-center">
                <input
                  type="date"
                  value={tempBirthday}
                  onChange={(e) => onTempBirthdayChange(e.target.value)}
                  className="flex-1 px-3 py-1 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={onSaveBirthday}
                  className="px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-medium"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => onEditingBirthdayChange(false)}
                  className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span>
                  {customer.birthday
                    ? new Date(customer.birthday).toLocaleDateString("ar-EG")
                    : "تاريخ الميلاد غير مسجل"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onTempBirthdayChange(customer.birthday || "");
                    onEditingBirthdayChange(true);
                  }}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="إضافة / تعديل تاريخ الميلاد"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {customer.customerRating && customer.customerRating !== "UNKNOWN" && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <StarIcon className="h-4 w-4 text-amber-500" />
              <span>التقييم: {customer.customerRating}</span>
            </div>
          )}

          {customer.createdAt && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm font-mono tabular-nums">
              <CalendarIcon className="h-4 w-4 text-zinc-400" />
              <span>عميل منذ {formatDate(customer.createdAt)}</span>
            </div>
          )}

          {customer.updatedAt && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-sm font-mono tabular-nums">
              <CalendarIcon className="h-4 w-4 text-zinc-400" />
              <span>آخر تحديث {formatDate(customer.updatedAt)}</span>
            </div>
          )}

          {customer.notes ? (
            <div className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300 text-sm">
              <DocumentTextIcon className="h-4 w-4 text-zinc-400 mt-0.5" />
              <span>{customer.notes}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tags Management */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
          {t("customers.tagsLabel")}
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {customerTags.length > 0 ? (
            customerTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 group"
              >
                <TagIcon className="h-3 w-3 text-zinc-400" />
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="ml-1 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("customers.noTags")}
            </p>
          )}
        </div>

        {/* Add new tag */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => onNewTagChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddTag()}
            placeholder={t("customers.addTagPlaceholder")}
            className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={onAddTag}
            disabled={!newTag.trim()}
            className="inline-flex items-center px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-xs sm:text-sm font-medium transition-all"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
