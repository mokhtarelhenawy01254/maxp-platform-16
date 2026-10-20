import React from "react";
import { ToggleField, SelectField } from "../controls/SettingFields";
import { JsonRecord } from "../../types/appSettingsTypes";

interface ConversionGeneralSectionProps {
  generalSettings: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
  applyPreset: (preset: string) => void;
}

export const ConversionGeneralSection: React.FC<ConversionGeneralSectionProps> = ({
  generalSettings,
  updateAtPath,
  applyPreset,
}) => {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">الإعدادات العامة</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField
          label="تفعيل على المتجر"
          description="يشغّل أدوات التحويل داخل الـ storefront والثيم."
          checked={Boolean(generalSettings["enabled"])}
          onChange={(value) => updateAtPath("general.enabled", value)}
        />
        <ToggleField
          label="إدخال داخل القوالب"
          description="يسمح بإدراج Conversion Stack داخل القوالب الجديدة والجارية."
          checked={Boolean(generalSettings["renderInTemplates"])}
          onChange={(value) => updateAtPath("general.renderInTemplates", value)}
        />
        <ToggleField
          label="الربط مع Shell"
          description="يشغّل الـ global bars والـ overlays على مستوى المتجر بالكامل."
          checked={Boolean(generalSettings["attachToThemeShell"])}
          onChange={(value) => updateAtPath("general.attachToThemeShell", value)}
        />
        <SelectField
          label="Preset"
          value={String(generalSettings["preset"] || "balanced")}
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "balanced", label: "Balanced" },
            { value: "aggressive", label: "Aggressive" },
          ]}
          onChange={applyPreset}
        />
      </div>
      <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
        Selecting a preset now applies the recommended activation mix and visual styles
        automatically. You can still fine-tune any module below before saving.
      </p>
    </section>
  );
};
