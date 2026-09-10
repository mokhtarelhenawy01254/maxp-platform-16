import React from "react";
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
import { OBJECTIVES, PLACEMENTS } from "../constants";

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
  return (
    <div className="space-y-6">
      {createdFullAd && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          data-testid="full-ad-created-panel"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                تم إنشاء الإعلان على Meta
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">
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
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
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
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase text-emerald-700">
                  {label}
                </div>
                <div className="mt-1 break-all text-sm font-bold text-slate-950">
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
                  className="rounded-xl border border-emerald-200 bg-emerald-100/60 px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase text-emerald-700">
                    {label}
                  </div>
                  <div className="mt-1 break-all text-sm font-bold text-slate-950">
                    {value || "غير متاح"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-sm font-semibold text-emerald-800">
            الحالة: {createdFullAd.status}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">ملخص الإعلان</h3>

        {/* Campaign Summary */}
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">اسم الحملة</span>
            <span className="font-medium">{formData.campaignName}</span>
          </div>
          {(formData.adSetName || formData.adName) && (
            <div className="flex justify-between gap-4 py-2 border-b">
              <span className="text-gray-600">هيكل الإعلان</span>
              <span className="text-left font-medium">
                {[formData.adSetName, formData.adName].filter(Boolean).join(" / ")}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الهدف</span>
            <span className="font-medium">
              {OBJECTIVES.find((o) => o.value === formData.objective)?.label}
            </span>
          </div>

          {/* Ad Set Level Info */}
          {compatibleAttributionWindows.length > 0 && (
            <>
              {(formData.objective === "OUTCOME_SALES" ||
                formData.objective === "OUTCOME_LEADS") && (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">هدف الأداء</span>
                    <span className="font-medium">
                      {
                        PERFORMANCE_GOALS.find(
                          (g) => g.value === formData.performanceGoal,
                        )?.label
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">حدث التحويل</span>
                    <span className="font-medium">
                      {
                        CONVERSION_EVENTS.find(
                          (e) => e.value === formData.conversionEvent,
                        )?.label
                      }
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">نافذة الإحالة</span>
                <span className="font-medium">{selectedAttributionWindowLabel}</span>
              </div>
            </>
          )}

          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الميزانية</span>
            <span className="font-medium">
              {formatSelectedAdAccountCurrency(formData.budgetAmount)} /{" "}
              {formData.budgetType === "DAILY" ? "يومياً" : "إجمالي"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">استراتيجية المزايدة</span>
            <span className="font-medium">
              {
                BID_STRATEGIES.find((b) => b.value === formData.bidStrategy)
                  ?.label
              }
            </span>
          </div>
          {formData.frequencyCap && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">حد التكرار</span>
              <span className="font-medium">
                {formData.frequencyCap} مرة /{" "}
                {formData.frequencyCapInterval === "DAY"
                  ? "يومياً"
                  : formData.frequencyCapInterval === "WEEK"
                    ? "أسبوعياً"
                    : "شهرياً"}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">المواقع</span>
            <span className="font-medium text-left">
              {selectedGeoSummary || "غير محدد"}
            </span>
          </div>
          {selectedTargetingSignalCount > 0 && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">إشارات الاستهداف النشطة</span>
              <span className="font-medium">
                {selectedTargetingSignalCount} اختيار
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الفئة العمرية</span>
            <span className="font-medium">
              {formData.ageMin} - {formData.ageMax}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">المواضع</span>
            <span className="font-medium">
              {formData.placementType === "AUTOMATIC"
                ? "تلقائي"
                : `${formData.placements.length} مواضع`}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">نوع المحتوى</span>
            <span className="font-medium">
              {formData.creativeType === "SINGLE_IMAGE"
                ? "صورة"
                : formData.creativeType === "SINGLE_VIDEO"
                  ? "فيديو"
                  : formData.creativeType === "CAROUSEL"
                    ? "دوّار"
                    : "مرن (Flexible)"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">صفحة الإعلان</span>
            <span className="font-medium">
              {selectedFacebookPage?.name || formData.pageId || "غير محددة"}
            </span>
          </div>
          {selectedFacebookPage?.isConnectedToCompany === false && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              الإعلان سيُنشر باسم صفحة متاحة من حساب Meta الحالي لكنها غير
              مربوطة بهذه الشركة داخل Max P.
            </div>
          )}
          {formData.creativeType === "FLEXIBLE" &&
            formData.flexibleAssets.length > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">عدد الملفات</span>
                <span className="font-medium text-green-600">
                  {formData.flexibleAssets.length} ملف
                </span>
              </div>
            )}
          <div className="flex justify-between py-2">
            <span className="text-gray-600">رابط الوجهة</span>
            <span className="font-medium text-blue-600 truncate max-w-xs">
              {formData.linkUrl}
            </span>
          </div>
          {formData.urlParameters && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">معاملات URL</span>
              <span className="font-medium text-xs text-gray-500 truncate max-w-xs">
                {formData.urlParameters}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          حالة الإعلان بعد النشر
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("status", "PAUSED")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === "PAUSED"
                ? "border-yellow-500 bg-yellow-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium">متوقف مؤقتاً</div>
            <div className="text-xs text-gray-500 mt-1">
              راجع الإعلان قبل تفعيله
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleChange("status", "ACTIVE")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === "ACTIVE"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium">نشط فوراً</div>
            <div className="text-xs text-gray-500 mt-1">
              ابدأ عرض الإعلان مباشرة
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
