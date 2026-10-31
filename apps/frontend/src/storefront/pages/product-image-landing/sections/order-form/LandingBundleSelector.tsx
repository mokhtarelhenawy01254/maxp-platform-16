import React from "react";
import { formatPrice } from "../../productImageLandingHelpers";
import type { BundleTier } from "../../productImageLandingTypes";

export interface LandingBundleSelectorProps {
  bundleTiers: BundleTier[];
  selectedBundleQty: number;
  setSelectedBundleQty: (qty: number) => void;
  activePrice: number;
  currency: string;
}

export const LandingBundleSelector: React.FC<LandingBundleSelectorProps> = ({
  bundleTiers,
  selectedBundleQty,
  setSelectedBundleQty,
  activePrice,
  currency,
}) => {
  return (
    <div className="pil-bundles-wrapper">
      <label className="pil-bundles-label">اختر الكمية والعرض التوفيري:</label>
      <div className="pil-bundles-grid">
        {bundleTiers.map((tier) => {
          const tierUnitPrice =
            tier.discountPercent > 0
              ? Math.round(activePrice * (1 - tier.discountPercent / 100))
              : activePrice;
          const tierTotal = tierUnitPrice * tier.qty;
          const isSelected = selectedBundleQty === tier.qty;

          return (
            <button
              key={tier.qty}
              type="button"
              className={`pil-bundle-card ${isSelected ? "is-selected" : ""}`}
              onClick={() => setSelectedBundleQty(tier.qty)}
            >
              {tier.badge ? (
                <span className="pil-bundle-badge">{tier.badge}</span>
              ) : null}
              <div className="pil-bundle-main-info">
                <div
                  className={`pil-bundle-radio ${isSelected ? "is-checked" : ""}`}
                  aria-hidden="true"
                >
                  {isSelected ? "✓" : ""}
                </div>
                <div className="pil-bundle-qty-label">{tier.label}</div>
              </div>
              <div className="pil-bundle-pricing">
                <strong className="pil-bundle-total">
                  {formatPrice(tierTotal, currency)}
                </strong>
                {tier.qty > 1 && (
                  <small className="pil-bundle-unit">
                    ({formatPrice(tierUnitPrice, currency)} للقطعة)
                  </small>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LandingBundleSelector;
