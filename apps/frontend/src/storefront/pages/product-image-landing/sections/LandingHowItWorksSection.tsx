import React from "react";

export interface LandingHowItWorksSectionProps {
  section: any;
  idx: number;
}

export const LandingHowItWorksSection: React.FC<LandingHowItWorksSectionProps> = ({
  section,
  idx,
}) => {
  const content = section.content || {};
  const steps = content.steps || [];
  if (!steps.length) return null;
  const title =
    content.title || content.heading || "طريقة الاستخدام وخطوات العمل";
  const subtitle =
    content.subtitle ||
    content.subheading ||
    "خطوات بسيطة تضمن لك أقصى استفادة وسهولة من أول يوم";

  return (
    <section
      key={section.id || idx}
      className="pil-how-it-works-section"
      style={{
        backgroundColor: content.bgColor || "#ffffff",
        backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
        padding: "32px 16px",
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      <div className="pil-section-heading">
        <span>خطوات سهلة وواضحة</span>
        <h2>{title}</h2>
        {subtitle && (
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 4 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div
        className="pil-steps-list"
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {steps.map((st: any, sIdx: number) => (
          <div
            key={sIdx}
            className="pil-step-card"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              padding: "16px",
              background: "#f8fafc",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              className="pil-step-number"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#0f172a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1rem",
                flexShrink: 0,
              }}
            >
              {st.stepNumber || st.number || sIdx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {st.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "#475569",
                  lineHeight: 1.5,
                }}
              >
                {st.desc}
              </p>
              {st.image && (
                <img
                  src={st.image}
                  alt={st.title}
                  style={{
                    marginTop: 10,
                    maxHeight: 180,
                    borderRadius: 8,
                    maxWidth: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingHowItWorksSection;
