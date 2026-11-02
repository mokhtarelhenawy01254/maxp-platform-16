import React from "react";
import { AssetFormData, AssetFormSupplierOption } from "./types";
import { DateInput } from '../../../../components/ui/DateInput';

interface AssetFormFinancialAndWarrantySectionProps {
  formData: AssetFormData;
  onFormDataChange: (data: AssetFormData) => void;
  suppliers: AssetFormSupplierOption[];
}

export const AssetFormFinancialAndWarrantySection: React.FC<
  AssetFormFinancialAndWarrantySectionProps
> = ({ formData, onFormDataChange, suppliers }) => {
  return (
    <>
      {/* Section 3: Financial & Warranty */}
      <div className="bg-white dark:bg-gray-800 rounded-lg">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center">
          <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-lg inline-flex items-center justify-center mr-2 ml-2 font-mono tabular-nums">
            3
          </span>
          البيانات المالية والضمان
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اسم المورد
            </label>
            <select
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
              value={formData.supplierName}
              onChange={(e) => {
                const selected = suppliers.find(
                  (s) => s.name === e.target.value,
                );
                onFormDataChange({
                  ...formData,
                  supplierName: e.target.value,
                  supplierMobile: selected?.mobile || "",
                  supplierAddress: selected?.address || "",
                });
              }}
            >
              <option value="">اختر المورد...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.mobile ? ` | ${s.mobile}` : ""}
                </option>
              ))}
            </select>
            {formData.supplierName && (
              <div className="mt-2 flex space-x-4 space-x-reverse text-xs text-gray-500 dark:text-gray-400 font-medium">
                {formData.supplierMobile && (
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono tabular-nums">
                    {formData.supplierMobile}
                  </span>
                )}
                {formData.supplierAddress && (
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {formData.supplierAddress}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تاريخ الشراء
              </label>
              <DateInput
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition font-mono tabular-nums"
                value={formData.purchaseDate}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    purchaseDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                قيمة الشراء
              </label>
              <input
                type="number"
                step="0.01"
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition font-mono tabular-nums"
                value={formData.purchaseValue}
                onChange={(e) =>
                  onFormDataChange({
                    ...formData,
                    purchaseValue: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              تاريخ انتهاء الضمان
            </label>
            <DateInput
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition font-mono tabular-nums"
              value={formData.warrantyEndDate}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  warrantyEndDate: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              مدة الضمان (بالأشهر)
            </label>
            <input
              type="number"
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition font-mono tabular-nums"
              value={formData.warrantyMonths}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  warrantyMonths: e.target.value,
                })
              }
              placeholder="مثال: 12"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          ملاحظات إضافية
        </label>
        <textarea
          className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-3 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition resize-none"
          rows={3}
          value={formData.notes}
          onChange={(e) =>
            onFormDataChange({ ...formData, notes: e.target.value })
          }
          placeholder="أضف أي تفاصيل أو ملاحظات أخرى هنا..."
        />
      </div>
    </>
  );
};
