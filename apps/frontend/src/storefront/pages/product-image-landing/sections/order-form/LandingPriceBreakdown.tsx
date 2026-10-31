import React from "react";
import type { Product } from "../../../../hooks/useProducts";
import { formatPrice } from "../../productImageLandingHelpers";
import type {
  BundleItemSelection,
  BundleTier,
  LandingFormState,
} from "../../productImageLandingTypes";

export interface LandingPriceBreakdownProps {
  activeBundle: BundleTier;
  activePrice: number;
  orderFinalTotal: number;
  currency: string;
  isSubmitting: boolean;
  buttonLabel: string;
  whatsappPhone?: string;
  activeProduct: Product;
  bundleItems: BundleItemSelection[];
  selectedColor: string;
  selectedSize: string;
  colorOptions: string[];
  sizeOptions: string[];
  formState: LandingFormState;
}

export const LandingPriceBreakdown: React.FC<LandingPriceBreakdownProps> = ({
  activeBundle,
  activePrice,
  orderFinalTotal,
  currency,
  isSubmitting,
  buttonLabel,
  whatsappPhone,
  activeProduct,
  bundleItems,
  selectedColor,
  selectedSize,
  colorOptions,
  sizeOptions,
  formState,
}) => {
  return (
    <>
      {/* Live Price Breakdown */}
      <div className="pil-price-breakdown" aria-label="تفاصيل الحساب النهائي">
        <div className="pil-breakdown-row">
          <span>
            سعر المنتجات ({activeBundle.qty}{" "}
            {activeBundle.qty > 1 ? "قطع" : "قطعة"}):
          </span>
          <span>{formatPrice(activePrice * activeBundle.qty, currency)}</span>
        </div>
        {activeBundle.discountPercent > 0 && (
          <div className="pil-breakdown-row pil-breakdown-discount">
            <span>خصم الباقة التوفيرية ({activeBundle.discountPercent}%):</span>
            <span>
              -{" "}
              {formatPrice(
                activePrice * activeBundle.qty - orderFinalTotal,
                currency,
              )}
            </span>
          </div>
        )}
        <div className="pil-breakdown-row">
          <span>الشحن والتوصيل:</span>
          <span className="pil-breakdown-free">
            مجاناً اليوم (معاينة قبل الدفع)
          </span>
        </div>
        {activeBundle.freeGift && (
          <div className="pil-breakdown-row pil-breakdown-gift">
            <span>هدية العرض الخاصة:</span>
            <span>🎁 {activeBundle.freeGift}</span>
          </div>
        )}
        <div className="pil-breakdown-row pil-breakdown-total">
          <strong>الإجمالي الصافي عند الاستلام:</strong>
          <strong>{formatPrice(orderFinalTotal, currency)}</strong>
        </div>
      </div>

      <button className="pil-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "جاري إرسال الطلب..."
          : `${buttonLabel} — ${formatPrice(orderFinalTotal, currency)}`}
      </button>

      {whatsappPhone ? (
        <div className="pil-direct-wa-wrap">
          <a
            href={(() => {
              const cleanPhone = whatsappPhone.replace(/\D/g, "");
              const targetPhone = cleanPhone.startsWith("0")
                ? `2${cleanPhone}`
                : cleanPhone.startsWith("2")
                  ? cleanPhone
                  : `20${cleanPhone}`;
              const msgLines = [
                `مرحباً، أريد طلب: ${activeProduct.name}`,
                `الباقة: ${activeBundle.label} (${activeBundle.qty} قطع)`,
                `الإجمالي: ${formatPrice(orderFinalTotal, currency)} (شحن مجاني + معاينة قبل الدفع)`,
              ];
              if (activeBundle.qty > 1) {
                bundleItems.slice(0, activeBundle.qty).forEach((p, idx) => {
                  const c =
                    p.color ||
                    (idx === 0 ? selectedColor : "") ||
                    colorOptions[0] ||
                    "";
                  const s =
                    p.size ||
                    (idx === 0 ? selectedSize : "") ||
                    sizeOptions[0] ||
                    "";
                  msgLines.push(
                    `- قطعة ${idx + 1}: ${c ? `لون ${c}` : ""}${s ? ` / مقاس ${s}` : ""}`,
                  );
                });
              } else {
                if (selectedColor) msgLines.push(`اللون: ${selectedColor}`);
                if (selectedSize) msgLines.push(`المقاس: ${selectedSize}`);
              }
              if (formState.customerName)
                msgLines.push(`الاسم: ${formState.customerName}`);
              if (formState.phone) msgLines.push(`الموبايل: ${formState.phone}`);
              if (formState.governorate)
                msgLines.push(`المحافظة: ${formState.governorate}`);
              if (formState.area) msgLines.push(`المنطقة: ${formState.area}`);
              return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msgLines.join("\n"))}`;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="pil-direct-wa-btn"
            aria-label="الطلب السريع عبر واتساب"
          >
            <span className="pil-wa-icon" aria-hidden="true">
              💬
            </span>
            <span>أو اطلب فوراً عبر واتساب بنقرة واحدة</span>
          </a>
        </div>
      ) : null}

      {/* Trust Badges Strip */}
      <div className="pil-trust-badges-strip" aria-label="ضمانات الشراء">
        <div className="pil-trust-item">
          <div className="pil-trust-icon-box" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="pil-trust-text">
            <strong>معاينة قبل الدفع</strong>
            <small>افتح الشحنة وتأكد منها براحتك</small>
          </div>
        </div>
        <div className="pil-trust-item">
          <div className="pil-trust-icon-box" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="pil-trust-text">
            <strong>الدفع نقدياً عند الاستلام</strong>
            <small>لا تدفع أي مبلغ إلا بعد فحص شحنتك</small>
          </div>
        </div>
        <div className="pil-trust-item">
          <div className="pil-trust-icon-box" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
          <div className="pil-trust-text">
            <strong>استبدال واسترجاع سهل</strong>
            <small>خلال 14 يوم بكل مرونة</small>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPriceBreakdown;
