import React from "react";

export interface LandingBreakdownSectionProps {
  section: any;
  idx: number;
  productName: string;
}

export const LandingBreakdownSection: React.FC<LandingBreakdownSectionProps> = ({
  section,
  idx,
  productName,
}) => {
  const content = section.content || {};
  const items = content.breakdownItems || [
    {
      title: "نعل طبي ماص للصدمات",
      desc: "مرونة كاملة لراحة الكعب والركبة طوال اليوم",
      icon: "👟",
      tag: "طبي 100%",
    },
    {
      title: "فرش هوائي مانع للتعرق",
      desc: "مسامات تهوية نشطة لمنع الروائح والحفاظ على انتعاش القدمين",
      icon: "💨",
      tag: "انتعاش",
    },
    {
      title: "خياطة يدوية مدعمة",
      desc: "غرز متينة ومقاومة للتمزق والفك للمشاوير الشاقة",
      icon: "🧵",
      tag: "متانة",
    },
    {
      title: "خفة وزن استثنائية",
      desc: "وزن فائق الخفة يمنحك سرعة وراحة في الحركة",
      icon: "🪶",
      tag: "خفيف جداً",
    },
  ];
  const title =
    content.breakdownTitle || `تشريح ومواصفات تصنيع ${productName}`;
  const isChecklist = section.variant === "CHECKLIST";

  return (
    <section
      key={section.id || idx}
      className={`pil-breakdown-section ${isChecklist ? "is-checklist-mode" : ""}`}
      aria-label="مواصفات التصنيع"
    >
      <div className="pil-section-heading">
        <span>{isChecklist ? "معايير الجودة والمطابقة" : "الهندسة وجودة التصنيع"}</span>
        <h2>{title}</h2>
      </div>
      {isChecklist ? (
        <div className="pil-checklist-container">
          {items.map((item: any, bIdx: number) => (
            <div key={bIdx} className="pil-checklist-item">
              <div className="pil-checklist-check">✓</div>
              <div className="pil-checklist-content">
                <div className="pil-checklist-top">
                  <strong>{item.title}</strong>
                  {item.tag && <span className="pil-checklist-tag">{item.tag}</span>}
                </div>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pil-breakdown-grid">
          {items.map((item: any, bIdx: number) => (
            <div key={bIdx} className="pil-breakdown-card">
              <div className="pil-breakdown-top">
                <span className="pil-breakdown-icon">
                  {item.icon || "✨"}
                </span>
                {item.tag && (
                  <span className="pil-breakdown-tag">{item.tag}</span>
                )}
              </div>
              <h3 className="pil-breakdown-card-title">{item.title}</h3>
              <p className="pil-breakdown-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default LandingBreakdownSection;
