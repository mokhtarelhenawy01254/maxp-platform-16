import React from "react";

export interface LandingVariantChipsProps {
  colorOptions: string[];
  sizeOptions: string[];
  customAttributeGroups: { key: string; label: string; options: string[] }[];
  selectedColor: string;
  selectedSize: string;
  selectedCustomAttributes: Record<string, string>;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: string) => void;
  setSelectedCustomAttributes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  updateBundleItem: (index: number, field: "color" | "size", value: string) => void;
}

export const LandingVariantChips: React.FC<LandingVariantChipsProps> = ({
  colorOptions,
  sizeOptions,
  customAttributeGroups,
  selectedColor,
  selectedSize,
  selectedCustomAttributes,
  setSelectedColor,
  setSelectedSize,
  setSelectedCustomAttributes,
  updateBundleItem,
}) => {
  if (
    colorOptions.length === 0 &&
    sizeOptions.length === 0 &&
    customAttributeGroups.length === 0
  ) {
    return null;
  }

  return (
    <div className="pil-variants-block">
      {colorOptions.length > 0 ? (
        <div className="pil-field">
          <label htmlFor="pil-color">اللون</label>
          <div
            className="pil-chips-group"
            role="radiogroup"
            aria-label="اختيار اللون"
          >
            {colorOptions.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  className={`pil-chip pil-chip-radio ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedColor(color);
                    updateBundleItem(0, "color", color);
                  }}
                >
                  <span className="pil-radio-dot" aria-hidden="true">
                    {isSelected ? "●" : "○"}
                  </span>
                  {color}
                </button>
              );
            })}
          </div>
          <select
            id="pil-color"
            name="color"
            value={selectedColor}
            onChange={(event) => {
              setSelectedColor(event.target.value);
              updateBundleItem(0, "color", event.target.value);
            }}
            required
            className="pil-native-select"
          >
            <option value="">اختار</option>
            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {sizeOptions.length > 0 ? (
        <div className="pil-field">
          <label htmlFor="pil-size">المقاس</label>
          <div
            className="pil-chips-group pil-chips-group--sizes"
            role="radiogroup"
            aria-label="اختيار المقاس"
          >
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                className={`pil-chip pil-chip-size ${selectedSize === size ? "is-selected" : ""}`}
                onClick={() => {
                  setSelectedSize(size);
                  updateBundleItem(0, "size", size);
                }}
              >
                {size}
              </button>
            ))}
          </div>
          <select
            id="pil-size"
            name="size"
            value={selectedSize}
            onChange={(event) => {
              setSelectedSize(event.target.value);
              updateBundleItem(0, "size", event.target.value);
            }}
            required
            className="pil-native-select"
          >
            <option value="">اختار</option>
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {customAttributeGroups.map((group) => (
        <div key={group.key} className="pil-field">
          <label>{group.label}</label>
          <div
            className="pil-chips-group"
            role="radiogroup"
            aria-label={`اختيار ${group.label}`}
          >
            {group.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`pil-chip ${selectedCustomAttributes[group.key] === opt ? "is-selected" : ""}`}
                onClick={() =>
                  setSelectedCustomAttributes((prev) => ({
                    ...prev,
                    [group.key]: opt,
                  }))
                }
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LandingVariantChips;
