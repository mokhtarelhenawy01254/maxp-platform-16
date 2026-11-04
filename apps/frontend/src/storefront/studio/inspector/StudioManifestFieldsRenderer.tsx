import React from "react";
import { PhotoIcon, LinkIcon } from "@heroicons/react/24/outline";
import { STOREFRONT_SECTION_MANIFEST, type StorefrontSectionFieldDefinition } from "../../sections/manifest";
import { StudioDynamicTokenPicker } from "./StudioDynamicTokenPicker";

export interface StudioManifestFieldsRendererProps {
  sectionType: string;
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: (targetField?: string) => void;
  excludeKeys?: readonly string[];
  childrenUnderTitle?: React.ReactNode;
}

const isImageField = (key: string, label?: string, type?: string): boolean => {
  if (type === "textarea") return false;
  const s = `${key} ${label || ""}`.toLowerCase();
  return /image|photo|poster|banner|thumbnail|logo|صورة|خلفية/.test(s);
};

const getFieldPriority = (k: string): number => {
  const kl = k.toLowerCase();
  if (kl === "title" || kl === "heading") return 0;
  if (kl === "subtitle" || kl === "description") return 1;
  if (kl === "eyebrow" || kl === "badge" || kl === "tagline") return 2;
  return 10;
};

export const StudioManifestFieldsRenderer: React.FC<StudioManifestFieldsRendererProps> = ({
  sectionType,
  settings,
  onUpdateField,
  onOpenImagePicker,
  excludeKeys = [],
  childrenUnderTitle,
}) => {
  const entry =
    STOREFRONT_SECTION_MANIFEST[sectionType] ||
    STOREFRONT_SECTION_MANIFEST[sectionType?.toLowerCase?.()] ||
    Object.values(STOREFRONT_SECTION_MANIFEST).find(
      (e) => e.component?.toLowerCase() === sectionType?.toLowerCase?.()
    );

  const fields = entry?.fields || [];
  const visible = fields.filter((f) => {
    const key = (f as any).name || f.key;
    if (excludeKeys.includes(key)) return false;
    if ((f as any).type === "array") return false;
    const val = settings[key];
    if (Array.isArray(val)) return false;
    return true;
  });
  if (visible.length === 0) return null;

  const sorted = [...visible].sort((a, b) => {
    return getFieldPriority((a as any).name || a.key) - getFieldPriority((b as any).name || b.key);
  });

  const handleTextChange = (key: string, val: string) => {
    onUpdateField(key, val);
    if (key === "title") onUpdateField("heading", val);
    if (key === "subtitle") onUpdateField("description", val);
    if (key === "eyebrow") onUpdateField("badge", val);
  };

  const renderField = (field: StorefrontSectionFieldDefinition) => {
    const name = (field as any).name || field.key;
    const val = settings[name];
    const isImage = isImageField(name, field.label, field.type);
    const isColor = field.type === ("color" as any) || name.toLowerCase().includes("color");

    if (isImage) {
      return (
        <div key={name} className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
            {field.helperText && <span className="text-[9.5px] text-[#8a8f96]">{field.helperText}</span>}
          </div>
          <div className="flex items-center gap-2">
            {val ? (
              <img src={val} alt={field.label} className="h-10 w-14 shrink-0 rounded-md border border-[#ececee] object-cover" />
            ) : (
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-[#ececee] bg-[#f6f7f8] text-[#8a8f96]">
                <PhotoIcon className="h-4 w-4" />
              </div>
            )}
            <button
              type="button"
              data-testid={`image-picker-btn-${name}`}
              onClick={() => onOpenImagePicker?.(name)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ececee] bg-[#f6f7f8] py-2 text-[11px] font-semibold text-[#17181c] hover:bg-[#ececee]"
            >
              <PhotoIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
              <span>اختيار من مكتبة الصور</span>
            </button>
          </div>
          <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
            <input
              type="text"
              dir="ltr"
              data-testid={`input-${name}`}
              value={val ?? ""}
              onChange={(e) => onUpdateField(name, e.target.value)}
              placeholder={field.placeholder || "https://..."}
              className="w-full bg-transparent py-1.5 text-[11px] text-[#17181c] outline-none font-mono"
            />
          </div>
        </div>
      );
    }

    if (isColor) {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              data-testid={`color-picker-${name}`}
              value={val || "#000000"}
              onChange={(e) => onUpdateField(name, e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-[#ececee] bg-transparent p-0.5"
            />
            <input
              type="text"
              dir="ltr"
              data-testid={`input-${name}`}
              value={val ?? ""}
              onChange={(e) => onUpdateField(name, e.target.value)}
              placeholder="#000000"
              className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 py-1.5 text-[11px] font-mono text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
            />
          </div>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={name} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
            <StudioDynamicTokenPicker currentValue={val ?? ""} onSelectToken={(t) => handleTextChange(name, t)} />
          </div>
          <textarea
            rows={2}
            data-testid={`input-${name}`}
            value={val ?? ""}
            onChange={(e) => handleTextChange(name, e.target.value)}
            placeholder={field.placeholder || `أدخل ${field.label}…`}
            className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
          />
          {field.helperText && <p className="text-[10px] text-[#8a8f96]">{field.helperText}</p>}
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
          <select
            data-testid={`select-${name}`}
            value={val ?? ""}
            onChange={(e) => onUpdateField(name, e.target.value)}
            className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
          >
            <option value="">اختر...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {field.helperText && <p className="text-[10px] text-[#8a8f96]">{field.helperText}</p>}
        </div>
      );
    }

    if (field.type === "number") {
      return (
        <div key={name} className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
          <input
            type="number"
            data-testid={`input-${name}`}
            value={val ?? ""}
            onChange={(e) => onUpdateField(name, e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={field.placeholder || "0"}
            className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white font-mono"
          />
          {field.helperText && <p className="text-[10px] text-[#8a8f96]">{field.helperText}</p>}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label key={name} className="flex items-center gap-2 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            data-testid={`checkbox-${name}`}
            checked={Boolean(val)}
            onChange={(e) => onUpdateField(name, e.target.checked)}
            className="h-4 w-4 rounded border-[#ececee] text-[#2b6cf6] focus:ring-[#2b6cf6]"
          />
          <div className="text-[11.5px] font-semibold text-[#17181c]">{field.label}</div>
        </label>
      );
    }

    if (field.type === "url") {
      return (
        <div key={name} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
            <StudioDynamicTokenPicker currentValue={val ?? ""} onSelectToken={(t) => onUpdateField(name, t)} />
          </div>
          <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
            <input
              type="text"
              dir="ltr"
              list={`url-suggestions-${name}`}
              data-testid={`input-${name}`}
              value={val ?? ""}
              onChange={(e) => onUpdateField(name, e.target.value)}
              placeholder={field.placeholder || "/shop"}
              className="w-full bg-transparent py-1.5 text-[11.5px] text-[#17181c] outline-none font-mono"
            />
            <datalist id={`url-suggestions-${name}`}>
              <option value="/shop">المتجر (/shop)</option>
              <option value="/collections">التصنيفات (/collections)</option>
              <option value="/sale">العروض والخصومات (/sale)</option>
              <option value="/about">من نحن (/about)</option>
              <option value="/contact">اتصل بنا (/contact)</option>
              <option value="/cart">السلة (/cart)</option>
            </datalist>
          </div>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {["/shop", "/collections", "/sale"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onUpdateField(name, chip)}
                className="rounded bg-[#ececee] px-1.5 py-0.5 text-[9.5px] font-mono text-[#6f747b] hover:bg-[#2b6cf6] hover:text-white"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Default: text
    return (
      <div key={name} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold text-[#6f747b]">{field.label}</label>
          <StudioDynamicTokenPicker currentValue={val ?? ""} onSelectToken={(t) => handleTextChange(name, t)} />
        </div>
        <input
          type="text"
          data-testid={`input-${name}`}
          value={val ?? ""}
          onChange={(e) => handleTextChange(name, e.target.value)}
          placeholder={field.placeholder || `أدخل ${field.label}…`}
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
        {name === "title" && childrenUnderTitle}
        {name === "title" && !childrenUnderTitle && Boolean(settings.panelTitle && String(settings.panelTitle).trim()) && (
          <p className="text-[10px] text-amber-600 font-medium pt-0.5" data-testid="panel-title-hint">
            قالبك بيستخدم عنوان البطاقة — عدّله من مجموعة بطاقة الهيرو أدناه
          </p>
        )}
        {field.helperText && <p className="text-[10px] text-[#8a8f96]">{field.helperText}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-3" data-testid="manifest-fields-renderer">
      {sorted.map((f) => renderField(f))}
    </div>
  );
};
