import React from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { LandingSection, ProductLandingProduct } from "./types";
import { formatMoney, getProductImage } from "./types";

interface PhoneMockupPreviewProps {
  title: string;
  product: ProductLandingProduct | null;
  sections: LandingSection[];
  formConfig: {
    orderKicker: string;
    orderTitle: string;
    orderCopy: string;
    buttonLabel: string;
  };
}

export const PhoneMockupPreview: React.FC<PhoneMockupPreviewProps> = ({
  title,
  product,
  sections,
  formConfig,
}) => {
  const prodImg = getProductImage(product);

  return (
    <div className="eo-phone-preview-wrapper" dir="rtl">
      <div className="eo-phone-preview-header">
        <div className="eo-phone-preview-title">
          <Eye size={16} />
          <strong>معاينة الموبايل المباشرة</strong>
        </div>
        <span className="eo-phone-tag">تحديث فوري</span>
      </div>

      <div className="eo-phone-frame">
        <div className="eo-phone-notch">
          <div className="eo-phone-speaker" />
          <div className="eo-phone-camera" />
        </div>

        <div className="eo-phone-screen">
          {/* Top Store Micro-Bar */}
          <div className="eo-preview-store-bar">
            <span className="eo-preview-brand">{product?.name || "متجرنا"}</span>
            <span className="eo-preview-trust-mini">
              <ShieldCheck size={13} /> تسوق آمن
            </span>
          </div>

          {/* Render Sections dynamically in order */}
          {sections.length === 0 ? (
            <div className="eo-phone-empty">
              <ShoppingBag size={32} />
              <p>الصفحة فارغة. أضف عناصر من القائمة الجانبية لرؤية المعاينة هنا.</p>
            </div>
          ) : (
            sections.map((section) => {
              const { type, content, id } = section;

              if (type === "BANNERS") {
                return (
                  <div
                    key={id}
                    className="eo-preview-banner"
                    style={{ backgroundColor: content.bannerBg || "#EC4899" }}
                  >
                    <span>{content.bannerText || "🔥 عرض خاص لفترة محدودة"}</span>
                  </div>
                );
              }

              if (type === "MEDIA") {
                const images =
                  content.images && content.images.length > 0
                    ? content.images
                    : prodImg
                      ? [prodImg]
                      : [];
                return (
                  <div key={id} className="eo-preview-media">
                    {images.length > 0 ? (
                      <img src={images[0]} alt="" className="eo-preview-hero-img" />
                    ) : (
                      <div className="eo-preview-media-placeholder">
                        <ShoppingBag size={36} />
                        <span>لا توجد صور للمنتج</span>
                      </div>
                    )}
                    {images.length > 1 && (
                      <div className="eo-preview-media-thumbs">
                        {images.slice(1, 4).map((img, i) => (
                          <img key={i} src={img} alt="" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (type === "TEXT") {
                return (
                  <div key={id} className="eo-preview-text-block">
                    <h4>{content.heading || title || product?.name}</h4>
                    {content.subheading && (
                      <p className="eo-preview-sub">{content.subheading}</p>
                    )}
                    <div className="eo-preview-price-tag">
                      <strong>{formatMoney(product?.price)}</strong>
                      <span className="eo-preview-badge">الدفع عند الاستلام</span>
                    </div>
                    {content.bodyText && (
                      <p className="eo-preview-body">{content.bodyText}</p>
                    )}
                  </div>
                );
              }

              if (type === "COUNTDOWN") {
                return (
                  <div key={id} className="eo-preview-countdown">
                    <div className="eo-preview-countdown-top">
                      <div className="eo-preview-timer">
                        <Clock size={14} />
                        <span>ينتهي العرض خلال: <strong>44:59</strong></span>
                      </div>
                      <div className="eo-preview-stock-badge">
                        <Flame size={14} />
                        <span>باقي {content.lowStockCount || 12} قطعة فقط</span>
                      </div>
                    </div>
                    <div className="eo-preview-stock-track">
                      <div className="eo-preview-stock-fill" style={{ width: "25%" }} />
                    </div>
                  </div>
                );
              }

              if (type === "FEATURES") {
                const features = content.features || [];
                return (
                  <div key={id} className="eo-preview-features-grid">
                    {features.map((f, i) => (
                      <div key={i} className="eo-preview-feature-card">
                        <span className="eo-preview-feat-icon">{f.icon || "✨"}</span>
                        <div>
                          <strong>{f.title}</strong>
                          <small>{f.desc}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (type === "REVIEWS") {
                const reviews = content.reviews || [];
                return (
                  <div key={id} className="eo-preview-reviews">
                    <h5 className="eo-preview-sec-title">⭐ آراء العملاء وتجاربهم:</h5>
                    <div className="eo-preview-reviews-stack">
                      {reviews.map((rev, i) => (
                        <div key={i} className="eo-preview-rev-bubble">
                          <div className="eo-preview-rev-top">
                            <strong>{rev.name}</strong>
                            <span className="eo-preview-stars">
                              {"⭐".repeat(rev.rating || 5)}
                            </span>
                          </div>
                          <p>{rev.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (type === "FAQ") {
                const faqs = content.faqs || [];
                return (
                  <div key={id} className="eo-preview-faqs">
                    <h5 className="eo-preview-sec-title">❓ الأسئلة الشائعة:</h5>
                    {faqs.map((faq, i) => (
                      <div key={i} className="eo-preview-faq-item">
                        <strong>س: {faq.question}</strong>
                        <p>ج: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                );
              }

              if (type === "FORM") {
                return (
                  <div key={id} className="eo-preview-form-box">
                    <div className="eo-preview-form-head">
                      <span>{content.orderKicker || formConfig.orderKicker || "طلب سريع"}</span>
                      <h6>{content.orderTitle || formConfig.orderTitle || `اطلب ${product?.name || "المنتج"}`}</h6>
                      <p>{content.orderCopy || formConfig.orderCopy}</p>
                    </div>

                    <div className="eo-preview-fake-inputs">
                      <div className="eo-fake-input">الاسم ثلاثي...</div>
                      <div className="eo-fake-input">رقم الموبايل...</div>
                      <div className="eo-fake-input">المحافظة والعنوان...</div>
                      <div className="eo-fake-submit-btn">
                        {content.buttonLabel || formConfig.buttonLabel || "تأكيد الطلب الآن 🚚"}
                      </div>
                    </div>
                  </div>
                );
              }

              if (type === "HTML") {
                return (
                  <div key={id} className="eo-preview-html-note">
                    <span>[عنصر كود مخصص HTML]</span>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>
      </div>
    </div>
  );
};
