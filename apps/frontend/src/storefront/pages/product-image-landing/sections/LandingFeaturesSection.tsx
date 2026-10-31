import React from "react";

export interface LandingFeaturesSectionProps {
  section: any;
  idx: number;
  landingBenefitCards: Array<{ title: string; text: string }>;
}

export const LandingFeaturesSection: React.FC<LandingFeaturesSectionProps> = ({
  section,
  idx,
  landingBenefitCards,
}) => {
  const content = section.content || {};
  const isOfficialSeal = section.variant === "OFFICIAL_SEAL";

  if (isOfficialSeal) {
    return (
      <section
        key={section.id || idx}
        className="pil-official-seal-section"
        aria-label="وثيقة الضمان والمعاينة"
      >
        <div className="pil-seal-card">
          <div className="pil-seal-stamp">
            <div className="pil-seal-stamp-inner">
              <span>ضمان</span>
              <strong>100%</strong>
              <span>معتمد</span>
            </div>
          </div>
          <div className="pil-seal-details">
            <span className="pil-seal-kicker">وثيقة الضمان الذهبية المعتمدة</span>
            <h3>حق الفحص الكامل واسترجاع الأموال</h3>
            <p>
              نلتزم بمنحك حق فتح الشحنة ومعاينة المنتج وتجربته قبل سداد أي مبلغ للمندوب، مع ضمان استبدال فوري أو استرجاع كامل خلال 14 يوماً من الاستلام.
            </p>
            <div className="pil-seal-pills">
              <span>✓ شحن مؤمّن وسريع</span>
              <span>✓ فحص ومعاينة قبل الدفع</span>
              <span>✓ استبدال فوري بدون مصاريف</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const customFeatures =
    Array.isArray(content.features) && content.features.length > 0
      ? content.features
      : null;

  if (customFeatures) {
    return (
      <section
        key={section.id || idx}
        className="pil-features-bento-section"
        aria-label={section.title || "مميزات المنتج"}
      >
        {section.title || content.kicker ? (
          <div className="pil-section-heading">
            {content.kicker ? <span>{content.kicker}</span> : null}
            <h2>{section.title || "مميزات هندسية صُنعت لتدوم"}</h2>
          </div>
        ) : null}
        <div className="pil-features-bento-grid">
          {customFeatures.map((feat: any, fIdx: number) => (
            <div className="pil-bento-feature-card" key={fIdx}>
              <div className="pil-bento-card-num">
                0{fIdx + 1}
              </div>
              <div className="pil-bento-card-text">
                <strong>{feat.title}</strong>
                <p>{feat.desc || feat.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      key={section.id || idx}
      className="pil-trust-grid"
      aria-label="أسباب الشراء والضمانات"
    >
      {landingBenefitCards.map((card, cIdx) => {
        const icons = ["🚚", "🔍", "💵", "🛡️"];
        return (
          <div className="pil-trust-card" key={card.title}>
            <span className="pil-trust-card-icon">
              {icons[cIdx % icons.length]}
            </span>
            <div className="pil-trust-card-content">
              <strong>{card.title}</strong>
              <span>{card.text}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default LandingFeaturesSection;
