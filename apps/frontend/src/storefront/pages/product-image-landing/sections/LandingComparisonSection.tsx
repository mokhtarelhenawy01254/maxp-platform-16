import React from "react";

export interface LandingComparisonSectionProps {
  section: any;
  idx: number;
  productName: string;
}

export const LandingComparisonSection: React.FC<LandingComparisonSectionProps> = ({
  section,
  idx,
  productName,
}) => {
  const content = section.content || {};
  const title =
    content.comparisonTitle ||
    `لماذا تختار ${productName} الأصلي بدلاً من البدائل؟`;
  const usLabel =
    content.comparisonUsLabel || `${productName} الأصلي`;
  const themLabel =
    content.comparisonThemLabel || "المنتجات المقلدة في السوق";
  const items = content.comparisonItems || [
    {
      feature: "جودة الخامات",
      us: "خامات نخب أول مقاومة للاهتراء والتقشير",
      them: "خامات بلاستيكية تتشقق سريعاً",
    },
    {
      feature: "راحة المشي والاستخدام",
      us: "نعل طبي يوزع ثقل الجسم بدون إجهاد",
      them: "نعل ناشف يسبب آلام القدم والظهر",
    },
    {
      feature: "حق الفحص والمعاينة",
      us: "افتح الشحنة وقيس المنتج قبل دفع قرش",
      them: "ممنوع فتح الشحنة إلا بعد الدفع",
    },
    {
      feature: "الضمان والاسترجاع",
      us: "ضمان 14 يوم استبدال واسترجاع سهل",
      them: "لا يوجد أي ضمان أو استرجاع بعد البيع",
    },
  ];
  const isDualCards = section.variant === "DUAL_CARDS";

  return (
    <section
      key={section.id || idx}
      className={`pil-comparison-section ${isDualCards ? "is-dual-cards-mode" : ""}`}
      aria-label="مقارنة التميز"
    >
      <div className="pil-section-heading">
        <span>{isDualCards ? "المقارنة الثنائية المباشرة" : "مقارنة التميز"}</span>
        <h2>{title}</h2>
      </div>

      {isDualCards ? (
        <div className="pil-dual-cards-grid">
          <div className="pil-dual-card pil-dual-us">
            <div className="pil-dual-badge">منتجنا الأصلي ✓</div>
            <h3>{usLabel}</h3>
            <ul className="pil-dual-list">
              {items.map((row: any, rIdx: number) => (
                <li key={rIdx}>
                  <span className="pil-dual-icon pil-icon-check">✓</span>
                  <div>
                    <strong>{row.feature}:</strong>
                    <span>{row.us}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="pil-dual-card pil-dual-them">
            <div className="pil-dual-badge pil-dual-warning">احذر من التقليد ✕</div>
            <h3>{themLabel}</h3>
            <ul className="pil-dual-list">
              {items.map((row: any, rIdx: number) => (
                <li key={rIdx}>
                  <span className="pil-dual-icon pil-icon-cross">✕</span>
                  <div>
                    <strong>{row.feature}:</strong>
                    <span>{row.them}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="pil-comparison-card">
          <div className="pil-comparison-header">
            <div className="pil-comp-col pil-comp-feat">وجه المقارنة</div>
            <div className="pil-comp-col pil-comp-us">
              <span className="pil-comp-badge">الأصلي</span>
              <strong>{usLabel}</strong>
            </div>
            <div className="pil-comp-col pil-comp-them">
              <strong>{themLabel}</strong>
            </div>
          </div>
          <div className="pil-comparison-body">
            {items.map((row: any, rIdx: number) => (
              <div key={rIdx} className="pil-comparison-row">
                <div className="pil-comp-col pil-comp-feat">
                  <strong>{row.feature}</strong>
                </div>
                <div className="pil-comp-col pil-comp-us">
                  <span className="pil-comp-check">✓</span>
                  <span>{row.us}</span>
                </div>
                <div className="pil-comp-col pil-comp-them">
                  <span className="pil-comp-cross">✕</span>
                  <span>{row.them}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default LandingComparisonSection;
