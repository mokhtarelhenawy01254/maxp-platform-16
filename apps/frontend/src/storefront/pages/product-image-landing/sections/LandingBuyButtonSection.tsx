import React from "react";
import type { Product } from "../../../hooks/useProducts";

export interface LandingBuyButtonSectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
  whatsappPhone?: string;
}

export const LandingBuyButtonSection: React.FC<LandingBuyButtonSectionProps> = ({
  section,
  idx,
  activeProduct,
  whatsappPhone,
}) => {
  const content = section.content || {};
  const text =
    content.text ||
    content.buyButtonText ||
    content.title ||
    "اطلب الآن واستلم خلال 48 ساعة — الدفع عند الاستلام 🚚";
  const sub =
    content.subtitle ||
    content.subtext ||
    "معاينة مجانية للشحنة قبل الدفع + ضمان 14 يوماً للاسترجاع";
  const btnBg =
    content.btnColor || content.buyButtonBg || "#16a34a";
  const btnColor =
    content.btnTextColor || content.buyButtonTextColor || "#ffffff";
  const isScroll =
    !content.targetAction || content.targetAction === "scroll_to_form";

  return (
    <section
      key={section.id || idx}
      className="pil-buy-button-section"
      style={{
        backgroundColor: content.bgColor || "transparent",
        padding: "20px 16px",
        maxWidth: 760,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <button
        type="button"
        className={`pil-standalone-buy-btn ${content.animation === "bounce" ? "pil-anim-bounce" : "pil-anim-pulse"}`}
        style={{
          width: "100%",
          maxWidth: 580,
          padding: "16px 24px",
          background: btnBg,
          color: btnColor,
          fontSize: "1.12rem",
          fontWeight: 800,
          borderRadius: 14,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(22, 163, 74, 0.35)",
          display: "inline-block",
        }}
        onClick={() => {
          if (isScroll) {
            const el = document.getElementById("order");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          } else if (
            content.targetAction === "open_whatsapp" &&
            whatsappPhone
          ) {
            const cleanPhone = whatsappPhone.replace(/\D/g, "");
            window.open(
              `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`مرحباً، أريد طلب: ${activeProduct.name}`)}`,
              "_blank",
            );
          } else if (content.targetUrl) {
            window.location.href = content.targetUrl;
          }
        }}
      >
        {text}
      </button>
      {sub && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.82rem",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          {sub}
        </p>
      )}
    </section>
  );
};

export default LandingBuyButtonSection;
