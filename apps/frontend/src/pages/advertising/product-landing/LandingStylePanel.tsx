import React from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_LANDING_STYLE_PRESET,
  LANDING_STYLE_FONTS,
  LANDING_STYLE_PRESETS,
  type LandingStyle,
  type LandingStyleFontKey,
} from "../../../storefront/utils/landingStyles";

interface LandingStylePanelProps {
  style: LandingStyle;
  onChange: (style: LandingStyle) => void;
}

const DEFAULT_PRESET_ID = "classic";
const DEFAULT_RADIUS = 8;

/**
 * Page-level style controls for a product landing: preset palette,
 * brand color override, CTA corner radius, and heading font. Changes are
 * applied live through the --pil-* CSS variables on the storefront page.
 */
export const LandingStylePanel: React.FC<LandingStylePanelProps> = ({
  style,
  onChange,
}) => {
  const activePreset =
    LANDING_STYLE_PRESETS.find(
      (p) => p.id === (style.preset || DEFAULT_PRESET_ID),
    ) || DEFAULT_LANDING_STYLE_PRESET;
  const brandColor = style.brandColor || activePreset.vars["--pil-teal"];
  const buttonRadius =
    typeof style.buttonRadius === "number" ? style.buttonRadius : DEFAULT_RADIUS;
  const headingFont = style.headingFont || "almarai";

  const patch = (partial: Partial<LandingStyle>) => onChange({ ...style, ...partial });

  return (
    <section className="eo-style-card" aria-label="استايل صفحة الهبوط">
      <header className="eo-style-card-head">
        <h3>الاستايل</h3>
        <span className="eo-style-hint">يظهر في المعاينة الحية</span>
      </header>

      <div className="eo-style-presets" role="group" aria-label="قوالب الألوان">
        {LANDING_STYLE_PRESETS.map((preset) => {
          const isActive = preset.id === activePreset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`eo-style-chip ${isActive ? "is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => patch({ preset: preset.id })}
            >
              <span className="eo-style-swatch" aria-hidden="true">
                {preset.swatch.map((color) => (
                  <span
                    key={color}
                    className="eo-style-swatch-dot"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="eo-style-chip-label">{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="eo-style-controls">
        <label className="eo-style-field">
          <span>لون البراند</span>
          <span className="eo-style-field-inputs">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => patch({ brandColor: e.target.value })}
              aria-label="لون البراند"
            />
            <button
              type="button"
              className="eo-style-reset"
              onClick={() => patch({ brandColor: null })}
              aria-label="إرجاع لون البراند لافتراضي القالب"
            >
              <RotateCcw size={13} />
            </button>
          </span>
        </label>

        <label className="eo-style-field">
          <span>
            استدارة الزرار <span className="eo-style-num">{buttonRadius}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={28}
            step={1}
            value={buttonRadius}
            onChange={(e) => patch({ buttonRadius: Number(e.target.value) })}
            aria-label="استدارة الزرار"
          />
        </label>

        <label className="eo-style-field">
          <span>خط العناوين</span>
          <select
            value={headingFont}
            onChange={(e) =>
              patch({ headingFont: e.target.value as LandingStyleFontKey })
            }
            aria-label="خط العناوين"
          >
            {LANDING_STYLE_FONTS.map((font) => (
              <option key={font.key} value={font.key}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
};
