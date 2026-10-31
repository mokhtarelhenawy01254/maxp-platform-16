import React from "react";
import type { BundleItemSelection, BundleTier } from "../../productImageLandingTypes";

export interface LandingBundleItemCustomizerProps {
  activeBundle: BundleTier;
  bundleItems: BundleItemSelection[];
  colorOptions: string[];
  sizeOptions: string[];
  selectedColor: string;
  selectedSize: string;
  updateBundleItem: (index: number, field: "color" | "size", value: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: string) => void;
}

export const LandingBundleItemCustomizer: React.FC<LandingBundleItemCustomizerProps> = ({
  activeBundle,
  bundleItems,
  colorOptions,
  sizeOptions,
  selectedColor,
  selectedSize,
  updateBundleItem,
  setSelectedColor,
  setSelectedSize,
}) => {
  return (
    <div
      className="pil-bundle-items-customizer"
      aria-label="تحديد تفاصيل كل قطعة في الباقة"
    >
      <div className="pil-bundle-customizer-header">
        <span className="pil-bundle-customizer-title">
          تحديد المقاس واللون لكل قطعة في الباقة ({activeBundle.qty} قطع):
        </span>
        <span className="pil-bundle-customizer-hint">
          اختر المواصفات لكل قطعة على حدة
        </span>
      </div>
      <div className="pil-bundle-items-list">
        {bundleItems.slice(0, activeBundle.qty).map((item, bIdx) => {
          const curColor =
            item.color ||
            (bIdx === 0
              ? selectedColor
              : colorOptions[bIdx % colorOptions.length] ||
                colorOptions[0] ||
                "");
          const curSize =
            item.size || (bIdx === 0 ? selectedSize : sizeOptions[0] || "");

          return (
            <div key={bIdx} className="pil-bundle-item-card">
              <div className="pil-bundle-item-header">
                <span className="pil-bundle-item-tag">القطعة {bIdx + 1}</span>
                <span className="pil-bundle-item-summary">
                  {curColor ? `اللون: ${curColor}` : ""}
                  {curColor && curSize ? " | " : ""}
                  {curSize ? `المقاس: ${curSize}` : ""}
                </span>
              </div>

              {colorOptions.length > 0 ? (
                <div className="pil-bundle-item-field">
                  <label className="pil-bundle-item-field-label">اللون:</label>
                  <div
                    className="pil-chips-group pil-chips-group-compact"
                    role="radiogroup"
                    aria-label={`لون القطعة ${bIdx + 1}`}
                  >
                    {colorOptions.map((color) => {
                      const isSelected = curColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          className={`pil-chip pil-chip-radio pil-chip-compact ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            updateBundleItem(bIdx, "color", color);
                            if (bIdx === 0) setSelectedColor(color);
                          }}
                        >
                          <span
                            className="pil-radio-dot"
                            aria-hidden="true"
                          >
                            {isSelected ? "●" : "○"}
                          </span>
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {sizeOptions.length > 0 ? (
                <div className="pil-bundle-item-field">
                  <label className="pil-bundle-item-field-label">
                    المقاس:
                  </label>
                  <div
                    className="pil-chips-group pil-chips-group--sizes pil-chips-group-compact"
                    role="radiogroup"
                    aria-label={`مقاس القطعة ${bIdx + 1}`}
                  >
                    {sizeOptions.map((size) => {
                      const isSelected = curSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          className={`pil-chip pil-chip-size pil-chip-compact ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            updateBundleItem(bIdx, "size", size);
                            if (bIdx === 0) setSelectedSize(size);
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LandingBundleItemCustomizer;
