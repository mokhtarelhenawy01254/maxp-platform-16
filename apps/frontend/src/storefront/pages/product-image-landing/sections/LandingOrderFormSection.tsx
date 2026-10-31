import React from "react";
import type { Product } from "../../../hooks/useProducts";
import LiveCountdownClock from "../components/LiveCountdownClock";
import {
  cleanProductDescription,
  formatPrice,
} from "../productImageLandingHelpers";
import type {
  BundleItemSelection,
  BundleTier,
  LandingFormState,
} from "../productImageLandingTypes";
import LandingBundleItemCustomizer from "./order-form/LandingBundleItemCustomizer";
import LandingBundleSelector from "./order-form/LandingBundleSelector";
import LandingCustomerInputs from "./order-form/LandingCustomerInputs";
import LandingPriceBreakdown from "./order-form/LandingPriceBreakdown";
import LandingVariantChips from "./order-form/LandingVariantChips";

export interface LandingOrderFormSectionProps {
  section: any;
  idx: number;
  activeConfig: {
    orderKicker: string;
    orderTitle: string;
    orderCopy: string;
    buttonLabel: string;
  };
  activeProduct: Product;
  orderFinalTotal: number;
  currency: string;
  activeBundle: BundleTier;
  sizeOptions: string[];
  colorOptions: string[];
  customAttributeGroups: { key: string; label: string; options: string[] }[];
  activeSections: any[];
  bundleTiers: BundleTier[];
  selectedBundleQty: number;
  setSelectedBundleQty: (qty: number) => void;
  activePrice: number;
  bundleItems: BundleItemSelection[];
  selectedColor: string;
  selectedSize: string;
  selectedCustomAttributes: Record<string, string>;
  updateBundleItem: (index: number, field: "color" | "size", value: string) => void;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: string) => void;
  setSelectedCustomAttributes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  formState: LandingFormState;
  updateFormField: (
    field: keyof LandingFormState,
  ) => (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  formError?: string;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleFormFirstInteraction: () => void;
  isSubmitting: boolean;
  whatsappPhone?: string;
}

export const LandingOrderFormSection: React.FC<LandingOrderFormSectionProps> = ({
  section,
  idx,
  activeConfig,
  activeProduct,
  orderFinalTotal,
  currency,
  activeBundle,
  sizeOptions,
  colorOptions,
  customAttributeGroups,
  activeSections,
  bundleTiers,
  selectedBundleQty,
  setSelectedBundleQty,
  activePrice,
  bundleItems,
  selectedColor,
  selectedSize,
  selectedCustomAttributes,
  updateBundleItem,
  setSelectedColor,
  setSelectedSize,
  setSelectedCustomAttributes,
  formState,
  updateFormField,
  formError,
  handleSubmit,
  handleFormFirstInteraction,
  isSubmitting,
  whatsappPhone,
}) => {
  return (
    <section
      key={section.id || idx}
      id="order"
      className="pil-order"
      aria-labelledby="pil-order-title"
    >
      <div className="pil-section-heading">
        <span className="pil-order-kicker">
          {activeConfig.orderKicker}
        </span>
        <h2 id="pil-order-title">{activeConfig.orderTitle}</h2>
        <p className="pil-order-copy">{activeConfig.orderCopy}</p>
      </div>

      <div className="pil-summary" aria-label="ملخص المنتج">
        <div className="pil-summary-cell">
          <b>{formatPrice(orderFinalTotal, currency)}</b>
          <span>
            السعر ({activeBundle.qty} {activeBundle.qty > 1 ? "قطع" : "قطعة"})
          </span>
        </div>
        <div className="pil-summary-cell">
          <b>
            {sizeOptions.length
              ? `${sizeOptions[0]}-${sizeOptions[sizeOptions.length - 1]}`
              : "معاينة قبل الدفع"}
          </b>
          <span>{sizeOptions.length ? "المقاسات المتاحة" : "شحن مجاني اليوم"}</span>
        </div>
      </div>

      {/* Auto Urgency Countdown Card if no standalone COUNTDOWN section */}
      {!activeSections.some((s) => s?.type === "COUNTDOWN") && (
        <div className="pil-countdown-card" aria-label="العد التنازلي للعرض">
          <div className="pil-countdown-inner">
            <div className="pil-countdown-header">
              <span className="pil-countdown-badge">
                <span className="pil-live-dot" />
                متبقي 7 قطع فقط بهذا السعر
              </span>
              <p className="pil-countdown-title">
                عرض خاص لفترة محدودة — اطلب الآن واستفد من الشحن المجاني والمعاينة قبل الدفع
              </p>
            </div>
            <LiveCountdownClock />
          </div>
        </div>
      )}

      <p className="pil-sr-copy">
        {cleanProductDescription(activeProduct.description, 600) || activeProduct.name}
      </p>

      {/* Quantity Bundles Selector */}
      <LandingBundleSelector
        bundleTiers={bundleTiers}
        selectedBundleQty={selectedBundleQty}
        setSelectedBundleQty={setSelectedBundleQty}
        activePrice={activePrice}
        currency={currency}
      />

      <form
        className="pil-form"
        onSubmit={handleSubmit}
        onInputCapture={handleFormFirstInteraction}
      >
        {activeBundle.qty > 1 && (sizeOptions.length > 0 || colorOptions.length > 0) ? (
          <LandingBundleItemCustomizer
            activeBundle={activeBundle}
            bundleItems={bundleItems}
            colorOptions={colorOptions}
            sizeOptions={sizeOptions}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            updateBundleItem={updateBundleItem}
            setSelectedColor={setSelectedColor}
            setSelectedSize={setSelectedSize}
          />
        ) : sizeOptions.length > 0 || colorOptions.length > 0 || customAttributeGroups.length > 0 ? (
          <LandingVariantChips
            colorOptions={colorOptions}
            sizeOptions={sizeOptions}
            customAttributeGroups={customAttributeGroups}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            selectedCustomAttributes={selectedCustomAttributes}
            setSelectedColor={setSelectedColor}
            setSelectedSize={setSelectedSize}
            setSelectedCustomAttributes={setSelectedCustomAttributes}
            updateBundleItem={updateBundleItem}
          />
        ) : null}

        <LandingCustomerInputs
          formState={formState}
          updateFormField={updateFormField}
          formError={formError}
        />

        <LandingPriceBreakdown
          activeBundle={activeBundle}
          activePrice={activePrice}
          orderFinalTotal={orderFinalTotal}
          currency={currency}
          isSubmitting={isSubmitting}
          buttonLabel={activeConfig.buttonLabel}
          whatsappPhone={whatsappPhone}
          activeProduct={activeProduct}
          bundleItems={bundleItems}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          colorOptions={colorOptions}
          sizeOptions={sizeOptions}
          formState={formState}
        />
      </form>
    </section>
  );
};

export default LandingOrderFormSection;
