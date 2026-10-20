import React from "react";
import { ConversionGeneralSection } from "../conversion/ConversionGeneralSection";
import { ConversionToolsSection } from "../conversion/ConversionToolsSection";
import { ConversionCopySection } from "../conversion/ConversionCopySection";
import { JsonRecord } from "../../types/appSettingsTypes";

interface ConversionSuiteSettingsTabProps {
  generalSettings: JsonRecord;
  modulesSettings: JsonRecord;
  uiSettings: JsonRecord;
  thresholdsSettings: JsonRecord;
  countdownSettings: JsonRecord;
  copySettings: JsonRecord;
  updateAtPath: (path: string, value: unknown) => void;
  applyPreset: (preset: string) => void;
}

export const ConversionSuiteSettingsTab: React.FC<ConversionSuiteSettingsTabProps> = ({
  generalSettings,
  modulesSettings,
  uiSettings,
  thresholdsSettings,
  countdownSettings,
  copySettings,
  updateAtPath,
  applyPreset,
}) => {
  return (
    <div className="space-y-8">
      <ConversionGeneralSection
        generalSettings={generalSettings}
        updateAtPath={updateAtPath}
        applyPreset={applyPreset}
      />

      <ConversionToolsSection
        modulesSettings={modulesSettings}
        uiSettings={uiSettings}
        updateAtPath={updateAtPath}
      />

      <ConversionCopySection
        thresholdsSettings={thresholdsSettings}
        countdownSettings={countdownSettings}
        copySettings={copySettings}
        updateAtPath={updateAtPath}
      />
    </div>
  );
};
