import React from "react";

export interface LandingFaqSectionProps {
  section: any;
  idx: number;
  faqSection?: any;
}

export const LandingFaqSection: React.FC<LandingFaqSectionProps> = ({
  section,
  idx,
  faqSection,
}) => {
  const content = section.content || {};
  const faqs = content.faqs || faqSection?.content?.faqs || [];
  if (!faqs.length) return null;

  return (
    <section
      key={section.id || idx}
      className="pil-faq"
      aria-label="الأسئلة الشائعة"
    >
      <div className="pil-section-heading">
        <span>إجابات واضحة</span>
        <h2>
          {content.title || faqSection?.content?.title || "الأسئلة الشائعة"}
        </h2>
      </div>
      <div className="pil-faq-list">
        {faqs.map((faq: any, fIdx: number) => (
          <details key={fIdx} className="pil-faq-item">
            <summary className="pil-faq-summary">
              <span>{faq.q || faq.question}</span>
              <span className="pil-faq-chevron" aria-hidden="true">
                ▾
              </span>
            </summary>
            <p className="pil-faq-answer">{faq.a || faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default LandingFaqSection;
