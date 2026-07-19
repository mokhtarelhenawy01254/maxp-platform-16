import React, { useEffect, useMemo, useState } from "react";
import { AffiliateProductVisibility, ProductFormData } from "../../types";
import { apiClient } from "../../../../services/apiClient";
import {
  CurrencyDollarIcon,
  Cog6ToothIcon,
  EyeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

type AffiliateOption = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  status?: string;
};

interface CommissionTabProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  displayCurrency: string;
}

export const CommissionTab: React.FC<CommissionTabProps> = ({
  formData,
  setFormData,
  handleInputChange,
  displayCurrency,
}) => {
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAffiliates = async () => {
      try {
        setLoadingAffiliates(true);
        const response = await apiClient.get("/affiliates/list");
        if (isMounted && response.data?.success && Array.isArray(response.data.data)) {
          setAffiliates(response.data.data);
        }
      } catch (error) {
        if (isMounted) {
          setAffiliates([]);
        }
      } finally {
        if (isMounted) {
          setLoadingAffiliates(false);
        }
      }
    };

    fetchAffiliates();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeAffiliates = useMemo(
    () =>
      affiliates.filter((affiliate) => !affiliate.status || affiliate.status === "ACTIVE"),
    [affiliates],
  );

  const selectedAffiliateIds = formData.affiliateVisibleAffiliateIds || [];

  const handleVisibilityChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextVisibility = e.target.value as AffiliateProductVisibility;
    setFormData((prev) => ({
      ...prev,
      affiliateVisibility: nextVisibility,
      affiliateVisibleAffiliateIds:
        nextVisibility === "SELECTED" ? prev.affiliateVisibleAffiliateIds : [],
    }));
  };

  const toggleAffiliate = (affiliateId: string) => {
    setFormData((prev) => {
      const currentIds = prev.affiliateVisibleAffiliateIds || [];
      const isSelected = currentIds.includes(affiliateId);

      return {
        ...prev,
        affiliateVisibleAffiliateIds: isSelected
          ? currentIds.filter((id) => id !== affiliateId)
          : [...currentIds, affiliateId],
      };
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
          <CurrencyDollarIcon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            إعدادات عمولة المسوقين
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            قم بتخصيص العمولة التي يحصل عليها المسوق عند بيع هذا المنتج.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نوع العمولة
          </label>
          <select
            name="commissionType"
            value={formData.commissionType}
            onChange={handleInputChange}
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="PERCENTAGE">نسبة مئوية (%)</option>
            <option value="FIXED">مبلغ ثابت (Fixed)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {formData.commissionType === "PERCENTAGE"
              ? "نسبة العمولة (%)"
              : "قيمة العمولة"}
          </label>
          <input
            type="number"
            name="affiliateCommission"
            value={formData.affiliateCommission}
            onChange={handleInputChange}
            min="0"
            step="0.1"
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0.0"
          />
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">السماح بإضافة هامش ربح (Markup)</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">إذا تم التفعيل، سيتمكن المسوق من زيادة سعر المنتج لنفسه والحصول على الفرق كربح إضافي.</p>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="allowAffiliateMarkup"
              checked={formData.allowAffiliateMarkup}
              onChange={handleInputChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
            <EyeIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              ظهور المنتج للمسوقين
            </h4>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
              تحكم هل المنتج يظهر لكل المسوقين، يختفي عنهم، أو يظهر لمجموعة محددة فقط.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="md:col-span-1">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              حالة الظهور
            </span>
            <select
              name="affiliateVisibility"
              value={formData.affiliateVisibility}
              onChange={handleVisibilityChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="ALL">يظهر لكل المسوقين</option>
              <option value="HIDDEN">مخفي عن كل المسوقين</option>
              <option value="SELECTED">مسوقين محددين فقط</option>
            </select>
          </label>

          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 md:col-span-2">
            {formData.affiliateVisibility === "ALL" && (
              <span>المنتج سيظهر في تجهيز الطلب للمسوقين النشطين.</span>
            )}
            {formData.affiliateVisibility === "HIDDEN" && (
              <span>المنتج لن يظهر لأي مسوق، وسيتم رفضه لو حاول مسوق إنشاء طلب به.</span>
            )}
            {formData.affiliateVisibility === "SELECTED" && (
              <span>
                المنتج سيظهر فقط للمسوقين المختارين هنا، مع منع الطلبات من غيرهم.
              </span>
            )}
          </div>
        </div>

        {formData.affiliateVisibility === "SELECTED" && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-900/10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                <UserGroupIcon className="h-5 w-5" />
                <span>المسوقين المسموح لهم</span>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-blue-700 dark:bg-gray-800 dark:text-blue-300">
                {selectedAffiliateIds.length} محدد
              </span>
            </div>

            {loadingAffiliates ? (
              <div className="py-6 text-center text-sm text-blue-700 dark:text-blue-300">
                جاري تحميل المسوقين...
              </div>
            ) : activeAffiliates.length === 0 ? (
              <div className="py-6 text-center text-sm text-blue-700 dark:text-blue-300">
                لا يوجد مسوقين نشطين للاختيار.
              </div>
            ) : (
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {activeAffiliates.map((affiliate) => {
                  const name =
                    `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() ||
                    affiliate.user?.email ||
                    "مسوق بدون اسم";
                  const isSelected = selectedAffiliateIds.includes(affiliate.id);

                  return (
                    <label
                      key={affiliate.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-blue-300 bg-white shadow-sm dark:border-blue-700 dark:bg-gray-800"
                          : "border-transparent bg-white/70 hover:border-blue-200 dark:bg-gray-800/60 dark:hover:border-blue-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAffiliate(affiliate.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                          {name}
                        </span>
                        {affiliate.user?.email && (
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                            {affiliate.user.email}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Cog6ToothIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">توضيح حول الربح:</p>
            <p>
              سعر التاجر (التكلفة):{" "}
              <span className="font-mono text-indigo-500">
                {formData.cost || 0}
              </span>{" "}
              {displayCurrency}
            </p>
            <p>
              سعر البيع:{" "}
              <span className="font-mono text-green-500">
                {formData.price || 0}
              </span>{" "}
              {displayCurrency}
            </p>
            <p>
              العمولة:{" "}
              <span className="font-mono text-amber-500">
                {formData.commissionType === "PERCENTAGE"
                  ? `${(((formData.price || 0) * (formData.affiliateCommission || 0)) / 100).toFixed(2)} (${formData.affiliateCommission}%)`
                  : `${formData.affiliateCommission || 0} مبلغ ثابت`}
              </span>{" "}
              {displayCurrency}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
