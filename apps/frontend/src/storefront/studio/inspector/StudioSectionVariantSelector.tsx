import React from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { STOREFRONT_SECTION_MANIFEST } from "../../sections/manifest";

export interface StudioSectionVariantSelectorProps {
  sectionType: string;
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
  onSave?: () => void;
}

export const getSectionManifestVariants = (type: string) => {
  if (!type) return undefined;
  const manifest = (STOREFRONT_SECTION_MANIFEST as Record<string, any>)[type];
  if (manifest?.variants && Array.isArray(manifest.variants) && manifest.variants.length > 0) {
    return manifest.variants;
  }
  const lower = (STOREFRONT_SECTION_MANIFEST as Record<string, any>)[type.toLowerCase()];
  if (lower?.variants && Array.isArray(lower.variants) && lower.variants.length > 0) {
    return lower.variants;
  }
  const kebab = type.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const kebabManifest = (STOREFRONT_SECTION_MANIFEST as Record<string, any>)[kebab];
  if (kebabManifest?.variants && Array.isArray(kebabManifest.variants) && kebabManifest.variants.length > 0) {
    return kebabManifest.variants;
  }
  return undefined;
};

export const StudioSectionVariantSelector: React.FC<StudioSectionVariantSelectorProps> = ({
  sectionType,
  settings,
  onUpdateField,
  onBatchUpdateFields,
  onSave,
}) => {
  const variants = getSectionManifestVariants(sectionType);

  if (!variants || variants.length === 0) {
    return null;
  }

  const currentVariant =
    settings?.variant || (variants.length > 0 ? variants[0].value : "");

  return (
    <div
      data-testid="section-variant-row"
      data-studio-variant-row="true"
      className="rounded-lg border border-[#ececee] bg-[#fafbfc] p-3 space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <label
          htmlFor="studio-section-variant-select"
          className="flex items-center gap-1.5 font-bold text-[#3f434a] text-[11px]"
        >
          <Squares2X2Icon className="h-3.5 w-3.5 text-[#2b6cf6]" />
          <span>شكل القسم</span>
        </label>
        <span className="text-[10px] text-[#8a8f96] font-mono">
          {variants.length} أشكال
        </span>
      </div>

      <select
        id="studio-section-variant-select"
        data-testid="section-variant-select"
        data-field="variant"
        name="variant"
        value={currentVariant}
        onChange={(e) => {
          const val = e.target.value;
          if (onBatchUpdateFields) {
            onBatchUpdateFields({ variant: val });
          }
          onUpdateField("variant", val);
          onSave?.();
        }}
        className="w-full rounded-md border border-[#ececee] bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-[#17181c] outline-none focus:border-[#2b6cf6] cursor-pointer shadow-xs transition-colors"
      >
        {variants.map((v: { value: string; label: string }) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    </div>
  );
};
