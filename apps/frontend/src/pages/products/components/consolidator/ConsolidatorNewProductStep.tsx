import React from "react";

interface ConsolidatorNewProductStepProps {
  newName: string;
  onNewNameChange: (name: string) => void;
  newSlug: string;
  onNewSlugChange: (slug: string) => void;
  newDescription: string;
  onNewDescriptionChange: (desc: string) => void;
}

export const ConsolidatorNewProductStep: React.FC<ConsolidatorNewProductStepProps> = ({
  newName,
  onNewNameChange,
  newSlug,
  onNewSlugChange,
  newDescription,
  onNewDescriptionChange,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        3. بيانات المنتج الجديد
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            اسم المنتج الجديد *
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              onNewNameChange(e.target.value);
              if (!newSlug) {
                onNewSlugChange(e.target.value.trim().toLowerCase().replace(/\s+/g, "-"));
              }
            }}
            placeholder="مثال: حذاء سوان الرياضي"
            className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            الرابط (اختياري)
          </label>
          <input
            type="text"
            value={newSlug}
            onChange={(e) => onNewSlugChange(e.target.value.trim())}
            placeholder="/product/..."
            className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
          />
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          الوصف
        </label>
        <textarea
          value={newDescription}
          onChange={(e) => onNewDescriptionChange(e.target.value)}
          rows={3}
          placeholder="وصف المنتج الجديد (يُورث من أول منتج إن تُرك فارغاً)"
          className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
        />
      </div>
    </div>
  );
};
