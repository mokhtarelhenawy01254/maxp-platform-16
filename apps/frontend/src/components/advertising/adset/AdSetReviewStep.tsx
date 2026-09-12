import React from "react";
import {
  SparklesIcon,
  GlobeAltIcon,
  BanknotesIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { MetaGeoLocation } from "../../../services/facebookAdsService";

interface AdSetReviewStepProps {
  name: string;
  conversionLocation: string;
  pixelName?: string;
  pixelId?: string;
  conversionEvent: string;
  performanceGoal: string;
  isCboCampaign: boolean;
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  dailyMinSpendTarget?: number;
  dailySpendCap?: number;
  startTime: string;
  hasEndDate: boolean;
  endTime: string;
  bidStrategy: string;
  bidValue?: number;
  advantageAudience: boolean;
  ageMin: number;
  ageMax: number;
  genders: string[];
  selectedLocations: string[];
  selectedRegions: MetaGeoLocation[];
  selectedCities: MetaGeoLocation[];
  interestsCount: number;
  interestsNames: string[];
  customAudiencesCount: number;
  excludedAudiencesCount: number;
  placementType: "AUTOMATIC" | "MANUAL";
  placementsCount: number;
  isDynamicCreative: boolean;
}

export const AdSetReviewStep: React.FC<AdSetReviewStepProps> = ({
  name,
  conversionLocation,
  pixelName,
  pixelId,
  conversionEvent,
  isCboCampaign,
  budgetType,
  budgetAmount,
  dailyMinSpendTarget,
  dailySpendCap,
  startTime,
  hasEndDate,
  endTime,
  bidStrategy,
  bidValue,
  advantageAudience,
  ageMin,
  ageMax,
  genders,
  selectedLocations,
  selectedRegions,
  selectedCities,
  interestsCount,
  interestsNames,
  customAudiencesCount,
  excludedAudiencesCount,
  placementType,
  placementsCount,
  isDynamicCreative,
}) => {
  const geoText =
    selectedRegions.length > 0 || selectedCities.length > 0
      ? [
          ...selectedRegions.map((r) => `محافظة ${r.name}`),
          ...selectedCities.map((c) => `مدينة ${c.name}`),
        ].join("، ")
      : selectedLocations.join("، ") || "مصر";

  const genderText =
    genders.length === 0
      ? "الكل (رجال ونساء)"
      : genders.map((g) => (g === "male" ? "رجال" : "نساء")).join(" و ");

  return (
    <div className="space-y-4">
      <div className="p-4 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/60 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block">
            اسم المجموعة الإعلانية
          </span>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {name || "مجموعة إعلانات بدون اسم"}
          </h3>
        </div>
        {isDynamicCreative && (
          <span className="px-2.5 py-1 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Dynamic Creative</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
        {/* Conversion & Pixel */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <GlobeAltIcon className="w-4 h-4 text-cyan-600" />
            <span>التحويل والبيكسل</span>
          </div>
          <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">وجهة التحويل:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {conversionLocation === "WEBSITE" ? "الموقع الإلكتروني" : conversionLocation}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">البيكسل:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {pixelName || (pixelId ? `ID: ${pixelId}` : "غير محدد")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">حدث التحويل:</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-400">
                {conversionEvent}
              </span>
            </div>
          </div>
        </div>

        {/* Budget & Schedule */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <BanknotesIcon className="w-4 h-4 text-cyan-600" />
            <span>الميزانية والجدولة</span>
          </div>
          <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">نظام الميزانية:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {isCboCampaign
                  ? "ميزانية الحملة Advantage+ (CBO)"
                  : `${budgetAmount?.toLocaleString() || 0} ج.م (${budgetType === "DAILY" ? "يومية" : "إجمالية"})`}
              </span>
            </div>
            {isCboCampaign && (dailyMinSpendTarget || dailySpendCap) && (
              <div className="flex justify-between">
                <span className="text-gray-400">حدود إنفاق المجموعة:</span>
                <span className="font-semibold text-cyan-700 dark:text-cyan-400 text-xs">
                  {[
                    dailyMinSpendTarget ? `أدنى: ${dailyMinSpendTarget} ج.م` : null,
                    dailySpendCap ? `أقصى: ${dailySpendCap} ج.م` : null,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">التحكم بالتكلفة:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {bidStrategy === "COST_CAP" && bidValue
                  ? `Cost Cap: ${bidValue} ج.م`
                  : bidStrategy === "BID_CAP" && bidValue
                    ? `Bid Cap: ${bidValue} ج.م`
                    : bidStrategy === "LOWEST_COST_WITH_MIN_ROAS" && bidValue
                      ? `Target ROAS: ${bidValue}x`
                      : "أعلى حجم (تلقائي)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">توقيت البدء:</span>
              <span className="font-semibold text-gray-900 dark:text-white dir-ltr text-right">
                {startTime ? new Date(startTime).toLocaleString("ar-EG") : "فورياً"}
              </span>
            </div>
            {hasEndDate && endTime && (
              <div className="flex justify-between">
                <span className="text-gray-400">توقيت الانتهاء:</span>
                <span className="font-semibold text-gray-900 dark:text-white dir-ltr text-right">
                  {new Date(endTime).toLocaleString("ar-EG")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Audience & Targeting */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <UserGroupIcon className="w-4 h-4 text-cyan-600" />
            <span>الجمهور والاستهداف</span>
          </div>
          <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">نوع الجمهور:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {advantageAudience ? "جمهور Advantage+ الذكي" : "خيارات الجمهور الأصلية"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">السن والجنس:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {ageMin} - {ageMax}+ سنة | {genderText}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-400 shrink-0">المواقع:</span>
              <span className="font-semibold text-gray-900 dark:text-white text-left truncate">
                {geoText}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">الاهتمامات:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {interestsCount > 0
                  ? `${interestsCount} اهتمام (${interestsNames.slice(0, 2).join("، ")}${interestsNames.length > 2 ? "..." : ""})`
                  : "موسع (بدون تقييد)"}
              </span>
            </div>
            {customAudiencesCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">الجماهير المخصصة:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {customAudiencesCount} جمهور
                </span>
              </div>
            )}
            {excludedAudiencesCount > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>الجماهير المستبعدة:</span>
                <span className="font-bold">{excludedAudiencesCount} جمهور</span>
              </div>
            )}
          </div>
        </div>

        {/* Placements */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-cyan-600" />
            <span>مواضع العرض</span>
          </div>
          <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">نوع المواضع:</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-400">
                {placementType === "AUTOMATIC" ? "مواضع Advantage+ التلقائية" : "مواضع يدوية مخصصة"}
              </span>
            </div>
            {placementType === "MANUAL" && (
              <div className="flex justify-between">
                <span className="text-gray-400">المواضع المحددة:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {placementsCount} موضع عرض
                </span>
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-2">
              {placementType === "AUTOMATIC"
                ? "سيتم توزيع الميزانية بمرونة على فيسبوك، إنستجرام، ريلز، وستوري وفق أفضل أداء وسعر."
                : "سيتم حصر الإعلان في المواضع اليدوية المحددة فقط."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
