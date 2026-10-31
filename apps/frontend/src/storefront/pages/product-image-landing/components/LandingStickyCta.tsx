import React from "react";
import { formatPrice } from "../productImageLandingHelpers";

export interface LandingStickyCtaProps {
  isStickyReady: boolean;
  isFormInView: boolean;
  orderFinalTotal: number;
  currency: string;
  whatsappPhone?: string;
  productName: string;
}

export const LandingStickyCta: React.FC<LandingStickyCtaProps> = ({
  isStickyReady,
  isFormInView,
  orderFinalTotal,
  currency,
  whatsappPhone,
  productName,
}) => {
  return (
    <>
      {/* Sticky Bottom CTA Bar */}
      <div
        className={`pil-sticky-cta ${isStickyReady && !isFormInView ? "is-ready" : ""}`}
        role="region"
        aria-label="شريط الشراء السريع"
      >
        <div className="pil-sticky-cta-inner">
          <div className="pil-sticky-price-block">
            <span className="pil-sticky-price-label">السعر:</span>
            <strong className="pil-sticky-price-val">
              {formatPrice(orderFinalTotal, currency)}
            </strong>
            <span className="pil-sticky-shipping-badge">شحن سريع · معاينة قبل الدفع</span>
          </div>
          <button
            type="button"
            className="pil-sticky-btn"
            onClick={() => {
              const el = document.getElementById("order");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            اطلب الآن — دفع عند الاستلام 🚚
          </button>
        </div>
      </div>

      {/* Floating Instant WhatsApp Help Button */}
      {whatsappPhone && !isFormInView && (
        <a
          href={`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            `السلام عليكم، بستفسر عن تفاصيل ومقاسات ${productName} المتاح في العرض`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pil-floating-whatsapp"
          aria-label="تواصل عبر واتساب للمساعدة السريعة"
        >
          <span className="pil-wa-fab-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.029-.482-1.636-.684-2.697-2.348-2.778-2.457-.081-.109-.658-.876-.658-1.671 0-.796.417-1.189.566-1.35.149-.161.326-.201.435-.201.109 0 .217.001.312.006.101.005.236-.038.37.284.14.335.478 1.168.52 1.254.042.086.07.186.012.3-.058.114-.087.186-.174.288-.087.102-.183.228-.261.306-.089.089-.182.186-.078.365.104.179.462.763.992 1.236.683.61 1.26.799 1.44.888.179.089.284.075.39-.047.105-.122.454-.529.576-.71.121-.182.242-.152.406-.091.164.06 1.039.49 1.218.579.179.089.298.134.341.209.043.075.043.435-.101.84zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.438 5.176L2 22l4.974-1.398A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
          </span>
          <span className="pil-wa-fab-text">مساعدة سريعة؟</span>
        </a>
      )}
    </>
  );
};

export default LandingStickyCta;
