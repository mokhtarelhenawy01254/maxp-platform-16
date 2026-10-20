import React from "react";
import { ToggleField, SelectField, TextField } from "../controls/SettingFields";
import { JsonRecord } from "../../types/appSettingsTypes";

interface CommerceAdvancedSettingsTabProps {
  modulesSettings: JsonRecord;
  uiSettings: JsonRecord;
  copySettings: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
}

export const CommerceAdvancedSettingsTab: React.FC<CommerceAdvancedSettingsTabProps> = ({
  modulesSettings,
  uiSettings,
  copySettings,
  updateAtPath,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField
          label="Pre Order"
          description="إظهار حالة الطلب المسبق على صفحة المنتج."
          checked={Boolean(modulesSettings["preOrder"])}
          onChange={(value) => updateAtPath("modules.preOrder", value)}
        />
        <ToggleField
          label="External / Affiliate"
          description="إظهار زر شراء خارجي أو رابط Affiliate عند توفره."
          checked={Boolean(modulesSettings["externalAffiliate"])}
          onChange={(value) => updateAtPath("modules.externalAffiliate", value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Pre Order Style"
          value={String(uiSettings["preOrderStyle"] || "banner")}
          options={[
            { value: "banner", label: "Banner" },
            { value: "chip", label: "Chip" },
            { value: "card", label: "Card" },
          ]}
          onChange={(value) => updateAtPath("ui.preOrderStyle", value)}
        />
        <SelectField
          label="External Link Style"
          value={String(uiSettings["externalLinkStyle"] || "button")}
          options={[
            { value: "button", label: "Button" },
            { value: "inline", label: "Inline" },
            { value: "card", label: "Card" },
          ]}
          onChange={(value) => updateAtPath("ui.externalLinkStyle", value)}
        />
        <TextField
          label="نص الطلب المسبق"
          value={String(copySettings["preOrderLabel"] || "")}
          onChange={(value) => updateAtPath("copy.preOrderLabel", value)}
        />
        <TextField
          label="نص الزر الخارجي"
          value={String(copySettings["affiliateLabel"] || "")}
          onChange={(value) => updateAtPath("copy.affiliateLabel", value)}
        />
      </div>
    </div>
  );
};
