import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  ExternalLink,
  Target,
  DollarSign,
  Users,
  Layout,
  Image,
} from "lucide-react";
import type { FormData, CreatedFullAdSummary, TargetingOption } from "../types";
import type {
  FacebookCustomAudience,
  FacebookLookalikeAudience,
  FacebookPage,
  FacebookPixel,
} from "../../../../services/facebookAdsService";
import {
  OBJECTIVES,
  PLACEMENTS,
  PERFORMANCE_GOALS,
  CONVERSION_EVENTS,
  BID_STRATEGIES,
  ATTRIBUTION_WINDOWS,
  COUNTRIES,
} from "../constants";
import {
  getCompatibleAttributionWindows,
  normalizeAttributionWindowForObjective,
} from "../../CreateAdWizard.helpers";

interface Step6ReviewProps {
  createdFullAd: CreatedFullAdSummary | null;
  formData: FormData;
  handleChange: (field: keyof FormData, value: any) => void;
  selectedBusinessName: string;
  selectedAdAccountName: string;
  selectedAdAccountId: string;
  selectedFacebookPage: FacebookPage | undefined;
  selectedFacebookPixel: FacebookPixel | undefined;
  selectedAdAccountCurrency: string;
  selectedInterests: TargetingOption[];
  selectedCustomAudiences: string[];
  customAudiences: FacebookCustomAudience[];
  selectedLookalikeAudiences: string[];
  lookalikeAudiences: FacebookLookalikeAudience[];
}

export const Step6Review: React.FC<Step6ReviewProps> = ({
  createdFullAd,
  formData,
  handleChange,
  selectedBusinessName,
  selectedAdAccountName,
  selectedAdAccountId,
  selectedFacebookPage,
  selectedFacebookPixel,
  selectedAdAccountCurrency,
  selectedInterests,
  selectedCustomAudiences,
  customAudiences,
  selectedLookalikeAudiences,
  lookalikeAudiences,
}) => {
  const navigate = useNavigate();

  const compatibleAttributionWindows = getCompatibleAttributionWindows(
    formData.objective,
    ATTRIBUTION_WINDOWS,
  );
  const selectedAttributionWindowLabel =
    compatibleAttributionWindows.find(
      (window) => window.value === formData.attributionWindow,
    )?.label ||
    ATTRIBUTION_WINDOWS.find((window) => window.value === formData.attributionWindow)
      ?.label ||
    normalizeAttributionWindowForObjective(
      formData.objective,
      formData.attributionWindow,
    );
  const formatSelectedAdAccountCurrency = (value?: number) =>
    new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: selectedAdAccountCurrency || "EGP",
      maximumFractionDigits: 2,
    }).format(value || 0);
  const selectedGeoSummary =
    (formData.regions && formData.regions.length > 0) ||
    (formData.cities && formData.cities.length > 0)
      ? [
          ...(formData.regions || []).map((region) => `محافظة ${region.name}`),
          ...(formData.cities || []).map((city) => `مدينة ${city.name}`),
        ].join(", ")
      : (formData.locations || [])
          .map((location) => COUNTRIES.find((country) => country.code === location)?.name)
          .filter(Boolean)
          .join(", ");
  const selectedTargetingSignalCount =
    selectedInterests.length +
    selectedCustomAudiences.length +
    selectedLookalikeAudiences.length +
    (formData.excludedCustomAudiences?.length || 0) +
    (formData.languages?.length || 0) +
    (formData.devicePlatforms?.length || 0);
  return (
    <div className="space-y-6">
      {createdFullAd && (
        <div
          className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-5"
          data-testid="full-ad-created-panel"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                تم إنشاء الإعلان على Meta
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                الإعلان محفوظ ومربوط بمعرفات الإنتاج
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {createdFullAd.localAdId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/advertising/facebook-ads/ads/${createdFullAd.localAdId}`,
                    )
                  }
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  فتح تفاصيل الإعلان
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/advertising/facebook-ads?adAccountId=${createdFullAd.adAccountId}`,
                  )
                }
                className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              >
                رجوع للوحة الإعلانات
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Campaign", createdFullAd.facebookCampaignId],
              ["Ad Set", createdFullAd.facebookAdSetId],
              ["Ad", createdFullAd.facebookAdId],
              ["Creative", createdFullAd.creativeId],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-gray-800 px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                  {label}
                </div>
                <div className="mt-1 break-all text-sm font-bold text-slate-950 dark:text-white">
                  {value || "غير متاح"}
                </div>
              </div>
            ))}
          </div>

          {(createdFullAd.localCampaignId ||
            createdFullAd.localAdSetId ||
            createdFullAd.localAdId) && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ["Local Campaign", createdFullAd.localCampaignId],
                ["Local Ad Set", createdFullAd.localAdSetId],
                ["Local Ad", createdFullAd.localAdId],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-100/60 dark:bg-emerald-900/40 px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                    {label}
                  </div>
                  <div className="mt-1 break-all text-sm font-bold text-slate-950 dark:text-white">
                    {value || "غير متاح"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            الحالة: {createdFullAd.status}
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">ملخص الإعلان</h3>

        {/* Campaign Summary */}
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">اسم الحملة</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.campaignName}</span>
          </div>
          {(formData.adSetName || formData.adName) && (
            <div className="flex justify-between gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">هيكل الإعلان</span>
              <span className="text-left font-medium text-gray-900 dark:text-white">
                {[formData.adSetName, formData.adName].filter(Boolean).join(" / ")}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">الهدف</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {OBJECTIVES.find((o) => o.value === formData.objective)?.label}
            </span>
          </div>

          {/* Ad Set Level Info */}
          {compatibleAttributionWindows.length > 0 && (
            <>
              {(formData.objective === "OUTCOME_SALES" ||
                formData.objective === "OUTCOME_LEADS") && (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">هدف الأداء</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {
                        PERFORMANCE_GOALS.find(
                          (g) => g.value === formData.performanceGoal,
                        )?.label
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">حدث التحويل</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {
                        CONVERSION_EVENTS.find(
                          (e) => e.value === formData.conversionEvent,
                        )?.label
                      }
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">نافذة الإحالة</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedAttributionWindowLabel}</span>
              </div>
            </>
          )}

          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">الميزانية</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatSelectedAdAccountCurrency(formData.budgetAmount)} /{" "}
              {formData.budgetType === "DAILY" ? "يومياً" : "إجمالي"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">استراتيجية المزايدة</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {
                BID_STRATEGIES.find((b) => b.value === formData.bidStrategy)
                  ?.label
              }
            </span>
          </div>
          {formData.frequencyCap && (
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">حد التكرار</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formData.frequencyCap} مرة /{" "}
                {formData.frequencyCapInterval === "DAY"
                  ? "يومياً"
                  : formData.frequencyCapInterval === "WEEK"
                    ? "أسبوعياً"
                    : "شهرياً"}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">المواقع</span>
            <span className="font-medium text-gray-900 dark:text-white text-left">
              {selectedGeoSummary || "غير محدد"}
            </span>
          </div>
          {selectedTargetingSignalCount > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">إشارات الاستهداف النشطة</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedTargetingSignalCount} اختيار
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">الفئة العمرية</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formData.ageMin} - {formData.ageMax}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">المواضع</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formData.placementType === "AUTOMATIC"
                ? "تلقائي"
                : `${formData.publisherPlatforms?.length || 0} مواضع`}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">نوع المحتوى</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formData.creativeType === "SINGLE_IMAGE"
                ? "صورة"
                : formData.creativeType === "SINGLE_VIDEO"
                  ? "فيديو"
                  : formData.creativeType === "CAROUSEL"
                    ? "دوّار"
                    : "مرن (Flexible)"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">صفحة الإعلان</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {selectedFacebookPage?.name || formData.pageId || "غير محددة"}
            </span>
          </div>
          {selectedFacebookPage?.isConnectedToCompany === false && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              الإعلان سيُنشر باسم صفحة متاحة من حساب Meta الحالي لكنها غير
              مربوطة بهذه الشركة داخل Max P.
            </div>
          )}
          {formData.creativeType === "FLEXIBLE" &&
            formData.flexibleAssets.length > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">عدد الملفات</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formData.flexibleAssets.length} ملف
                </span>
              </div>
            )}
          <div className="flex justify-between py-2">
            <span className="text-gray-600 dark:text-gray-400">رابط الوجهة</span>
            <span className="font-medium text-blue-600 dark:text-blue-400 truncate max-w-xs">
              {formData.linkUrl}
            </span>
          </div>
          {formData.urlParameters && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">معاملات URL</span>
              <span className="font-medium text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                {formData.urlParameters}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          حالة الإعلان بعد النشر
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("status", "PAUSED")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === "PAUSED"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            }`}
          >
            <div className="font-medium">متوقف مؤقتاً</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              راجع الإعلان قبل تفعيله
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleChange("status", "ACTIVE")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === "ACTIVE"
                ? "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            }`}
          >
            <div className="font-medium">نشط فوراً</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ابدأ عرض الإعلان مباشرة
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
