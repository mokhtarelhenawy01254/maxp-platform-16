import React from "react";
import {
  Sparkles,
  Globe,
  Coins,
  Users,
  Sliders,
} from "lucide-react";
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
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-primary block">
            اسم المجموعة الإعلانية
          </span>
          <h3 className="text-sm font-bold text-foreground mt-0.5">
            {name || "مجموعة إعلانات بدون اسم"}
          </h3>
        </div>
        {isDynamicCreative && (
          <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dynamic Creative</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
        {/* Conversion & Pixel */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground border-b border-border/40 pb-2">
            <Globe className="w-4 h-4 text-primary" />
            <span>التحويل والبيكسل</span>
          </div>
          <div className="space-y-1.5 text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">وجهة التحويل:</span>
              <span className="font-semibold text-foreground">
                {conversionLocation === "WEBSITE" ? "الموقع الإلكتروني" : conversionLocation}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">البيكسل:</span>
              <span className="font-semibold text-foreground font-mono">
                {pixelName || (pixelId ? `ID: ${pixelId}` : "غير محدد")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">حدث التحويل:</span>
              <span className="font-bold text-primary font-mono">
                {conversionEvent}
              </span>
            </div>
          </div>
        </div>

        {/* Budget & Schedule */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground border-b border-border/40 pb-2">
            <Coins className="w-4 h-4 text-primary" />
            <span>الميزانية والجدولة</span>
          </div>
          <div className="space-y-1.5 text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">نظام الميزانية:</span>
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {isCboCampaign
                  ? "ميزانية الحملة Advantage+ (CBO)"
                  : `${budgetAmount?.toLocaleString() || 0} ج.م (${budgetType === "DAILY" ? "يومية" : "إجمالية"})`}
              </span>
            </div>
            {isCboCampaign && (dailyMinSpendTarget || dailySpendCap) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">حدود إنفاق المجموعة:</span>
                <span className="font-semibold text-primary text-xs font-mono tabular-nums">
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
              <span className="text-muted-foreground">التحكم بالتكلفة:</span>
              <span className="font-semibold text-foreground">
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
              <span className="text-muted-foreground">توقيت البدء:</span>
              <span className="font-semibold text-foreground dir-ltr text-right font-mono">
                {startTime ? new Date(startTime).toLocaleString("ar-EG") : "فورياً"}
              </span>
            </div>
            {hasEndDate && endTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">توقيت الانتهاء:</span>
                <span className="font-semibold text-foreground dir-ltr text-right font-mono">
                  {new Date(endTime).toLocaleString("ar-EG")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Audience & Targeting */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground border-b border-border/40 pb-2">
            <Users className="w-4 h-4 text-primary" />
            <span>الجمهور والاستهداف</span>
          </div>
          <div className="space-y-1.5 text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">نوع الجمهور:</span>
              <span className="font-bold text-primary">
                {advantageAudience ? "جمهور Advantage+ الذكي" : "خيارات الجمهور الأصلية"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">السن والجنس:</span>
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {ageMin} - {ageMax}+ سنة | {genderText}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">المواقع:</span>
              <span className="font-semibold text-foreground text-left truncate">
                {geoText}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاهتمامات:</span>
              <span className="font-semibold text-foreground">
                {interestsCount > 0
                  ? `${interestsCount} اهتمام (${interestsNames.slice(0, 2).join("، ")}${interestsNames.length > 2 ? "..." : ""})`
                  : "موسع (بدون تقييد)"}
              </span>
            </div>
            {customAudiencesCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الجماهير المخصصة:</span>
                <span className="font-semibold text-foreground font-mono tabular-nums">
                  {customAudiencesCount} جمهور
                </span>
              </div>
            )}
            {excludedAudiencesCount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>الجماهير المستبعدة:</span>
                <span className="font-bold font-mono tabular-nums">{excludedAudiencesCount} جمهور</span>
              </div>
            )}
          </div>
        </div>

        {/* Placements */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground border-b border-border/40 pb-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span>مواضع العرض</span>
          </div>
          <div className="space-y-1.5 text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">نوع المواضع:</span>
              <span className="font-bold text-primary">
                {placementType === "AUTOMATIC" ? "مواضع Advantage+ التلقائية" : "مواضع يدوية مخصصة"}
              </span>
            </div>
            {placementType === "MANUAL" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">المواضع المحددة:</span>
                <span className="font-semibold text-foreground font-mono tabular-nums">
                  {placementsCount} موضع عرض
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
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
