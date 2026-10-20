import React from "react";
import { ToggleField, SelectField } from "../controls/SettingFields";
import { JsonRecord } from "../../types/appSettingsTypes";

interface UgcReviewsSettingsTabProps {
  generalSettings: JsonRecord;
  modulesSettings: JsonRecord;
  uiSettings: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
}

export const UgcReviewsSettingsTab: React.FC<UgcReviewsSettingsTabProps> = ({
  generalSettings,
  modulesSettings,
  uiSettings,
  updateAtPath,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField
          label="تفعيل على المتجر"
          description="تشغيل مراجعات الصور والفيديو داخل واجهة المتجر."
          checked={Boolean(generalSettings["enabled"])}
          onChange={(value) => updateAtPath("general.enabled", value)}
        />
        <ToggleField
          label="Photo Reviews"
          description="السماح بالمراجعات المصورة."
          checked={Boolean(modulesSettings["photoReviews"])}
          onChange={(value) => updateAtPath("modules.photoReviews", value)}
        />
        <ToggleField
          label="Video Reviews"
          description="السماح بمراجعات الفيديو."
          checked={Boolean(modulesSettings["videoReviews"])}
          onChange={(value) => updateAtPath("modules.videoReviews", value)}
        />
        <ToggleField
          label="Verified Badge"
          description="إبراز المشتري الموثق داخل البطاقات."
          checked={Boolean(modulesSettings["verifiedBadge"])}
          onChange={(value) => updateAtPath("modules.verifiedBadge", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Gallery Style"
          value={String(uiSettings["galleryStyle"] || "mosaic")}
          options={[
            { value: "mosaic", label: "Mosaic" },
            { value: "carousel", label: "Carousel" },
            { value: "stack", label: "Stack" },
          ]}
          onChange={(value) => updateAtPath("ui.galleryStyle", value)}
        />
        <SelectField
          label="Card Style"
          value={String(uiSettings["cardStyle"] || "elevated")}
          options={[
            { value: "elevated", label: "Elevated" },
            { value: "minimal", label: "Minimal" },
            { value: "editorial", label: "Editorial" },
          ]}
          onChange={(value) => updateAtPath("ui.cardStyle", value)}
        />
      </div>
    </div>
  );
};
