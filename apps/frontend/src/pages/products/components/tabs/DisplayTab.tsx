import React from "react";
import {
  ProductAttribute,
  ProductVariant,
  ProductVariantSettings,
} from "../../types";
import {
  EyeIcon,
  SwatchIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { normalizeImagePath } from "../../../../utils/imageUrl";
import {
  getVariantDisplaySupport,
  getVariantSettingColors,
  getVariantSettingImages,
  getVariantSettingKey,
  getVariantSettingStyle,
} from "../../utils/variantSettings";

type PickerSwatch = {
  label: string;
  value: string;
};

type VariantDisplayStyle = ProductVariantSettings["styles"][string];
type UploadResponseFile = {
  fullUrl?: string;
  url?: string;
};
type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

const isVariantDisplayStyle = (value: string): value is VariantDisplayStyle =>
  value === "buttons" ||
  value === "circles" ||
  value === "dropdown" ||
  value === "thumbnails" ||
  value === "radio";

const COLOR_PICKER_ROWS: PickerSwatch[][] = [
  [
    { label: "أسود", value: "#000000" },
    { label: "فحمي", value: "#262626" },
    { label: "رمادي داكن", value: "#525252" },
    { label: "رمادي", value: "#737373" },
    { label: "رمادي فاتح", value: "#a3a3a3" },
    { label: "فضي", value: "#d4d4d4" },
    { label: "أوف وايت", value: "#f5f5f4" },
    { label: "أبيض", value: "#ffffff" },
  ],
  [
    { label: "أحمر", value: "#ef4444" },
    { label: "برجاندي", value: "#7f1d1d" },
    { label: "برتقالي", value: "#f97316" },
    { label: "أصفر", value: "#facc15" },
    { label: "ليموني", value: "#84cc16" },
    { label: "أخضر", value: "#22c55e" },
    { label: "سماوي", value: "#38bdf8" },
    { label: "أزرق", value: "#2563eb" },
    { label: "بنفسجي", value: "#7c3aed" },
    { label: "فوشيا", value: "#d946ef" },
  ],
  [
    { label: "وردي فاتح", value: "#fecdd3" },
    { label: "روز", value: "#fb7185" },
    { label: "خوخي", value: "#fdba74" },
    { label: "بيج", value: "#d6b089" },
    { label: "كريمي", value: "#efe2d2" },
    { label: "سيج", value: "#95a895" },
    { label: "نعناعي", value: "#98d8c8" },
    { label: "بيبي بلو", value: "#93c5fd" },
    { label: "لافندر", value: "#b39ddb" },
    { label: "موف", value: "#a855f7" },
  ],
  [
    { label: "بني", value: "#8b4513" },
    { label: "جملي", value: "#c19a6b" },
    { label: "كاشمير", value: "#c8a27d" },
    { label: "ذهبي", value: "#d4af37" },
    { label: "زيتي", value: "#6b8e23" },
    { label: "جنزاري", value: "#0f766e" },
    { label: "بترولي", value: "#155e75" },
    { label: "كحلي", value: "#0f172a" },
    { label: "نبيتي", value: "#702632" },
    { label: "عنابي", value: "#6f1d3a" },
  ],
];

const STANDARD_COLOR_SWATCHES: PickerSwatch[] = [
  { label: "أسود", value: "#000000" },
  { label: "أبيض", value: "#ffffff" },
  { label: "أزرق", value: "#3b82f6" },
  { label: "أحمر", value: "#ef4444" },
  { label: "أصفر", value: "#f59e0b" },
  { label: "أخضر", value: "#22c55e" },
  { label: "برتقالي", value: "#f97316" },
  { label: "تركواز", value: "#45b8c4" },
];

interface DisplayTabProps {
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  variantSettings: ProductVariantSettings;
  setVariantSettings: React.Dispatch<React.SetStateAction<ProductVariantSettings>>;
  setActiveTab: (tab: string) => void;
  uploadFiles: (files: File[]) => Promise<{
    success: boolean;
    data: UploadResponseFile[];
  }>;
  t: TranslationFn;
}

export const DisplayTab: React.FC<DisplayTabProps> = ({
  attributes,
  variants,
  variantSettings,
  setVariantSettings,
  setActiveTab,
  uploadFiles,
  t,
}) => {
  const [activeColorPicker, setActiveColorPicker] = React.useState<{
    attributeKey: string;
    value: string;
  } | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-3.5 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <EyeIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("products.display.title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("products.display.description")}
            </p>
          </div>
        </div>

        {attributes.filter((a) => a.forVariations).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
            <SwatchIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">
              {t("products.display.noVariationAttributes")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("products.display.noVariationAttributesDesc")}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("attributes")}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              {t("products.display.goToAttributes")}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {attributes
              .filter((a) => a.forVariations)
              .map((attr) => {
                const currentStyle = getVariantSettingStyle(variantSettings, attr);

                return (
                  <div
                    key={attr.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-gray-200 flex items-center gap-2">
                        <span className="bg-white dark:bg-gray-600 px-2 py-1 rounded border border-gray-200 dark:border-gray-500 text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {attr.name}
                        </span>
                      </h4>
                      <select
                        value={currentStyle || ""}
                        onChange={(e) => {
                          const rawStyle = e.target.value;
                          const val = isVariantDisplayStyle(rawStyle) ? rawStyle : "";
                          setVariantSettings((prev: ProductVariantSettings) => {
                            const styleKey =
                              getVariantSettingKey(prev?.styles, attr) || attr.name;
                            const attributeImagesKey =
                              getVariantSettingKey(prev?.attributeImages, attr) || null;
                            const attributeColorsKey =
                              getVariantSettingKey(prev?.attributeColors, attr) || null;

                            const nextAttributeImages = { ...(prev?.attributeImages || {}) };
                            const nextAttributeColors = { ...(prev?.attributeColors || {}) };

                            const nextStyles = { ...(prev?.styles || {}) };
                            if (val) {
                              nextStyles[styleKey] = val;
                            } else {
                              delete nextStyles[styleKey];
                            }

                            return {
                              ...prev,
                              styles: nextStyles,
                              attributeImages: nextAttributeImages,
                              attributeColors: nextAttributeColors,
                            };
                          });
                        }}
                        className="block w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">{t("products.display.default")}</option>
                        <option value="buttons">{t("products.display.buttons")}</option>
                        <option value="circles">{t("products.display.circles")}</option>
                        <option value="dropdown">{t("products.display.dropdown")}</option>
                        <option value="thumbnails">
                          {t("products.display.thumbnails")}
                        </option>
                        <option value="radio">{t("products.display.radio")}</option>
                      </select>
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-800">
                      {currentStyle === "circles" &&
                        getVariantDisplaySupport(attr, variantSettings, variants)
                          .isColorAttribute && (
                          <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                            {(() => {
                              const attributeColorsKey =
                                getVariantSettingKey(
                                  variantSettings?.attributeColors,
                                  attr,
                                ) || attr.name;
                              const currentAttributeColors = getVariantSettingColors(
                                variantSettings,
                                attr,
                              );
                              const activeValue =
                                activeColorPicker?.attributeKey === attributeColorsKey
                                  ? activeColorPicker.value
                                  : attr.values[0] || "";
                              const activeColor =
                                currentAttributeColors[activeValue] || "#000000";

                              const setAttributeColor = (
                                value: string,
                                color: string | null,
                              ) => {
                                setVariantSettings(
                                  (prev: ProductVariantSettings) => {
                                    const nextColors = {
                                      ...(getVariantSettingColors(prev, attr) || {}),
                                    };

                                    if (color) {
                                      nextColors[value] = color;
                                    } else {
                                      delete nextColors[value];
                                    }

                                    return {
                                      ...prev,
                                      styles: {
                                        ...(prev?.styles || {}),
                                      },
                                      attributeColors: {
                                        ...(prev?.attributeColors || {}),
                                        [attributeColorsKey]: nextColors,
                                      },
                                    };
                                  },
                                );
                              };

                              const paletteButtonClass =
                                "h-7 w-7 rounded-full border border-white/80 shadow-sm ring-1 ring-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:ring-gray-600";

                              return (
                                <div className="space-y-4">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        اختاري لون الدائرة لكل قيمة
                                      </p>
                                      <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
                                        الألوان المختارة هنا هي التي ستظهر في المتجر عند
                                        اختيار نمط دوائر الألوان.
                                      </p>
                                    </div>
                                    {activeValue ? (
                                      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                                        <span
                                          className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600"
                                          style={{ background: activeColor }}
                                          aria-hidden="true"
                                        />
                                        {activeValue}
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {attr.values.map((value) => {
                                      const savedColor =
                                        currentAttributeColors[value] || "";
                                      const isActive =
                                        activeColorPicker?.attributeKey ===
                                          attributeColorsKey
                                          ? activeColorPicker.value === value
                                          : value === activeValue;

                                      return (
                                        <button
                                          key={value}
                                          type="button"
                                          onClick={() =>
                                            setActiveColorPicker({
                                              attributeKey: attributeColorsKey,
                                              value,
                                            })
                                          }
                                          className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm transition-colors dark:bg-gray-800 ${
                                            isActive
                                              ? "border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-500/20"
                                              : "border-gray-200 hover:border-indigo-300 dark:border-gray-600 dark:hover:border-indigo-500"
                                          }`}
                                        >
                                          <span className="truncate font-medium text-gray-800 dark:text-gray-100">
                                            {value}
                                          </span>
                                          <span className="flex items-center gap-2">
                                            <span
                                              className="h-7 w-7 rounded-full border border-gray-200 shadow-inner dark:border-gray-600"
                                              style={{
                                                background: savedColor || "#f3f4f6",
                                              }}
                                              aria-hidden="true"
                                            />
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                              {savedColor || "تلقائي"}
                                            </span>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {activeValue ? (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Standard
                                          </p>
                                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                            {activeValue}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setAttributeColor(activeValue, null)
                                          }
                                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-red-200 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                                        >
                                          Reset
                                        </button>
                                      </div>

                                      <div className="space-y-2">
                                        {COLOR_PICKER_ROWS.map((row, rowIndex) => (
                                          <div
                                            key={rowIndex}
                                            className="flex flex-wrap gap-1.5"
                                          >
                                            {row.map((swatch) => (
                                              <button
                                                key={`${activeValue}-${swatch.value}-${swatch.label}`}
                                                type="button"
                                                onClick={() =>
                                                  setAttributeColor(
                                                    activeValue,
                                                    swatch.value,
                                                  )
                                                }
                                                className={paletteButtonClass}
                                                style={{ background: swatch.value }}
                                                title={swatch.label}
                                                aria-label={`اختيار ${swatch.label} لـ ${activeValue}`}
                                              />
                                            ))}
                                          </div>
                                        ))}
                                      </div>

                                      <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-600">
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                          Standard
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {STANDARD_COLOR_SWATCHES.map((swatch) => (
                                            <button
                                              key={`${activeValue}-standard-${swatch.value}`}
                                              type="button"
                                              onClick={() =>
                                                setAttributeColor(
                                                  activeValue,
                                                  swatch.value,
                                                )
                                              }
                                              className={paletteButtonClass}
                                              style={{ background: swatch.value }}
                                              title={swatch.label}
                                              aria-label={`اختيار ${swatch.label} لـ ${activeValue}`}
                                            />
                                          ))}
                                        </div>
                                      </div>

                                      <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-600">
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                          Custom
                                        </p>
                                        <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                                          <span
                                            className="h-7 w-7 rounded-full border border-gray-200 dark:border-gray-600"
                                            style={{ background: activeColor }}
                                            aria-hidden="true"
                                          />
                                          <span>اختيار لون مخصص</span>
                                          <input
                                            type="color"
                                            value={activeColor}
                                            onChange={(event) =>
                                              setAttributeColor(
                                                activeValue,
                                                event.target.value,
                                              )
                                            }
                                            className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                                            aria-label={`لون مخصص لـ ${activeValue}`}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                      {currentStyle === "thumbnails" && (
                        <>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            {t("products.display.customizeImageLabel")}
                          </p>

                          {(() => {
                            const support = getVariantDisplaySupport(
                              attr,
                              variantSettings,
                              variants,
                            );

                            if (support.coveredValueCount === 0) {
                              const fallbackLabel = support.isColorAttribute
                                ? "دوائر الألوان"
                                : "الأزرار";

                              return (
                                <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold">
                                      النمط المصغر يحتاج صورًا فعلية
                                    </p>
                                    <p className="text-xs leading-5 text-amber-800 dark:text-amber-100/80">
                                      لا توجد صور مرتبطة بقيم &quot;{attr.name}&quot; الآن، لذلك
                                      سيعود المتجر تلقائيًا إلى {fallbackLabel} عند الحفظ
                                      حتى لا يظهر العرض بشكل مكسور.
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            if (support.coveredValueCount < support.totalValues) {
                              return (
                                <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                                  <p className="text-sm font-semibold">
                                    التغطية الحالية غير مكتملة
                                  </p>
                                  <p className="text-xs leading-5 text-sky-800 dark:text-sky-100/80">
                                    يوجد صور لـ {support.coveredValueCount} من أصل{" "}
                                    {support.totalValues} قيمة. القيم غير المرتبطة بصورة
                                    ستظهر ببديل نصي داخل النمط المصغر.
                                  </p>
                                </div>
                              );
                            }

                            return null;
                          })()}

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {attr.values.map((value) => {
                              const attributeImagesKey =
                                getVariantSettingKey(
                                  variantSettings?.attributeImages,
                                  attr,
                                ) || attr.name;
                              const currentAttributeImages = getVariantSettingImages(
                                variantSettings,
                                attr,
                              );
                              const currentImage = currentAttributeImages[value];

                              return (
                                <div
                                  key={value}
                                  className="relative group border border-gray-200 dark:border-gray-600 rounded-lg p-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                >
                                  <p
                                    className="text-xs font-medium text-center mb-2 text-gray-700 dark:text-gray-300 truncate"
                                    title={value}
                                  >
                                    {value}
                                  </p>

                                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-md overflow-hidden relative">
                                    {currentImage ? (
                                      <>
                                        <img
                                          src={currentImage}
                                          alt={value}
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newImages = { ...currentAttributeImages };
                                            delete newImages[value];
                                            setVariantSettings(
                                              (prev: ProductVariantSettings) => ({
                                                ...prev,
                                                styles: {
                                                  ...(prev?.styles || {}),
                                                },
                                                attributeImages: {
                                                  ...(prev?.attributeImages || {}),
                                                  [attributeImagesKey]: newImages,
                                                },
                                              }),
                                            );
                                          }}
                                          className="absolute top-1 right-1 bg-red-500 dark:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600 dark:hover:bg-red-700"
                                        >
                                          ×
                                        </button>
                                      </>
                                    ) : (
                                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                        <PhotoIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                          رفع صورة
                                        </span>
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                              const file = e.target.files[0];
                                              try {
                                                const data = await uploadFiles([file]);
                                                if (data.success && data.data[0]) {
                                                  const rawUrl =
                                                    data.data[0].fullUrl || data.data[0].url;
                                                  const url =
                                                    normalizeImagePath(rawUrl) || rawUrl;
                                                  setVariantSettings(
                                                    (prev: ProductVariantSettings) => ({
                                                      ...prev,
                                                      styles: {
                                                        ...(prev?.styles || {}),
                                                      },
                                                      attributeImages: {
                                                        ...(prev?.attributeImages || {}),
                                                        [attributeImagesKey]: {
                                                          ...(getVariantSettingImages(
                                                            prev,
                                                            attr,
                                                          ) || {}),
                                                          [value]: url,
                                                        },
                                                      },
                                                    }),
                                                  );
                                                }
                                              } catch (err) {
                                                console.error(
                                                  "Error uploading attribute image",
                                                  err,
                                                );
                                              }
                                            }
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
